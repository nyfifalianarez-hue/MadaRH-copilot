import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import {
  CHAT_MODEL,
  MAX_HISTORY,
  buildMessages,
  buildSystemPrompt,
  mapGatewayError,
  missingKeyError,
  parseSseChunk,
  threadTitle,
  toSources,
  unauthenticatedError,
  type ChatError,
  type LegalRuleContext,
} from "@/lib/chat/chat-core";

const bodySchema = z.object({
  threadId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1).max(8000),
});

function jsonError(err: ChatError) {
  return Response.json({ error: err }, { status: err.status });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!url || !key) return jsonError({ ...missingKeyError, message: "Configuration serveur incomplète." });
        if (!token || token.split(".").length !== 3) return jsonError(unauthenticatedError);

        const db = createClient<Database>(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await db.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return jsonError(unauthenticatedError);

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return jsonError({ status: 400, code: "requete", message: "Message vide ou trop long.", retryable: false });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonError(missingKeyError);

        const { data: profile } = await db.from("profiles").select("org_id").eq("id", userId).maybeSingle();
        const orgId = profile?.org_id;
        if (!orgId)
          return jsonError({ status: 403, code: "refus", message: "Aucun espace RH rattaché à ce compte. Reconnectez-vous depuis la page Compte.", retryable: false });

        // Conversation : existante (vérifiée par RLS) ou nouvelle.
        let threadId = parsed.threadId ?? null;
        if (threadId) {
          const { data: t } = await db.from("chat_threads").select("id").eq("id", threadId).maybeSingle();
          if (!t) return jsonError({ status: 404, code: "requete", message: "Conversation introuvable.", retryable: false });
        } else {
          const { data: t, error } = await db
            .from("chat_threads")
            .insert({ org_id: orgId, owner_id: userId, title: threadTitle(parsed.message) })
            .select("id")
            .single();
          if (error) return jsonError({ status: 500, code: "service", message: "Impossible de créer la conversation.", retryable: true });
          threadId = t.id;
        }

        const [{ data: history }, { data: rules }] = await Promise.all([
          db
            .from("chat_messages")
            .select("role, content")
            .eq("thread_id", threadId)
            .order("created_at", { ascending: false })
            .limit(MAX_HISTORY),
          db
            .from("legal_rules")
            .select("id, title, statement, article, status, last_checked_on, effective_on, legal_sources(label, url, reference)")
            .neq("status", "obsolete")
            .limit(60),
        ]);

        const legal: LegalRuleContext[] = (rules ?? []).map((r) => {
          const src = (r as { legal_sources?: { label: string; url: string | null; reference: string | null } | null }).legal_sources;
          return {
            id: r.id,
            title: r.title,
            statement: r.statement,
            article: r.article,
            status: r.status,
            last_checked_on: r.last_checked_on,
            effective_on: r.effective_on,
            source_label: src?.label ?? null,
            source_url: src?.url ?? null,
            source_reference: src?.reference ?? null,
          };
        });
        const sources = toSources(legal);

        const { error: userInsertError } = await db.from("chat_messages").insert({
          thread_id: threadId,
          org_id: orgId,
          owner_id: userId,
          role: "user",
          content: parsed.message,
        });
        if (userInsertError)
          return jsonError({ status: 500, code: "service", message: "Impossible d'enregistrer le message.", retryable: true });

        const messages = buildMessages(
          buildSystemPrompt(legal),
          ((history ?? []).reverse() as { role: "user" | "assistant"; content: string }[]),
          parsed.message,
        );

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            signal: request.signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({ model: CHAT_MODEL, messages, stream: true, reasoning_effort: "low" }),
          });
        } catch {
          return jsonError({ status: 502, code: "reseau", message: "Service IA injoignable (erreur réseau). Réessayez.", retryable: true });
        }
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          console.error(`[chat] passerelle IA ${upstream.status}: ${text.slice(0, 500)}`);
          return jsonError(mapGatewayError(upstream.status, text));
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";
        const reader = upstream.body.getReader();
        const finalThread = threadId;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
            send({ type: "start", threadId: finalThread, sources });
            try {
              for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parsedChunk = parseSseChunk(buffer);
                buffer = parsedChunk.rest;
                for (const d of parsedChunk.deltas) {
                  answer += d;
                  send({ type: "delta", text: d });
                }
              }
              if (!answer.trim()) {
                send({ type: "error", error: { code: "service", message: "Le modèle n'a renvoyé aucune réponse.", retryable: true } });
              } else {
                await db.from("chat_messages").insert({
                  thread_id: finalThread,
                  org_id: orgId,
                  owner_id: userId,
                  role: "assistant",
                  content: answer,
                  sources: sources as never,
                  model: CHAT_MODEL,
                });
                await db.from("chat_threads").update({ title: undefined }).eq("id", finalThread);
                send({ type: "done", threadId: finalThread });
              }
            } catch {
              if (answer.trim()) {
                await db.from("chat_messages").insert({
                  thread_id: finalThread, org_id: orgId, owner_id: userId, role: "assistant",
                  content: `${answer}\n\n_(Réponse interrompue.)_`, sources: sources as never, model: CHAT_MODEL,
                });
              }
              send({ type: "error", error: { code: "reseau", message: "Réponse interrompue.", retryable: true } });
            } finally {
              controller.close();
            }
          },
          cancel() {
            void reader.cancel();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
