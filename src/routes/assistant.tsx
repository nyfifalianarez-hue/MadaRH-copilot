import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowUp, BookMarked, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { deleteThread, getThreadMessages, listThreads } from "@/lib/chat/chat.functions";
import type { ChatSource } from "@/lib/chat/chat-core";
import { sendChatMessage } from "@/lib/chat/stream-client";

export const Route = createFileRoute("/assistant")({
  validateSearch: z.object({ t: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Assistant RH — MadaRH Compliance" },
      { name: "description", content: "Assistant RH conversationnel pour Madagascar : réponses sourcées, incertitudes signalées, brouillons sans action automatique." },
      { property: "og:title", content: "Assistant RH — MadaRH Compliance" },
      { property: "og:description", content: "Un copilote RH qui cite ses sources ou dit qu'il ne sait pas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  error?: { message: string; retryable: boolean };
  pending?: boolean;
  stopped?: boolean;
}

const suggestions = [
  "Quelles pièces demander pour constituer le dossier d'un nouveau salarié ?",
  "Rédige un courriel de relance pour des documents manquants.",
  "Quelle est la durée du congé de maternité à Madagascar ?",
  "Écris une formule Google Sheets pour compter les absences par service.",
  "Quelles démarches CNaPS et OSTIE prévoir lors d'une embauche ?",
  "Aide-moi à structurer une procédure d'accueil d'un nouveau salarié.",
];

function useSession() {
  const [state, setState] = useState<{ ready: boolean; signedIn: boolean }>({ ready: false, signedIn: false });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ ready: true, signedIn: !!data.session }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setState({ ready: true, signedIn: !!s }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

function AssistantPage() {
  const session = useSession();
  if (!session.ready) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!session.signedIn)
    return (
      <div className="ledger-card mx-auto max-w-lg space-y-3 p-8 text-center">
        <h1 className="font-display text-2xl">Assistant RH</h1>
        <p className="text-sm text-muted-foreground">
          L'assistant traite des informations de votre organisation : une session authentifiée est nécessaire.
        </p>
        <Button asChild>
          <Link to="/auth">Se connecter</Link>
        </Button>
      </div>
    );
  return <Chat />;
}

function Chat() {
  const { t: threadId } = Route.useSearch();
  const navigate = useNavigate({ from: "/assistant" });
  const qc = useQueryClient();
  const listFn = useServerFn(listThreads);
  const messagesFn = useServerFn(getThreadMessages);
  const deleteFn = useServerFn(deleteThread);

  const threads = useQuery({ queryKey: ["chat-threads"], queryFn: () => listFn() });
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const currentThread = useRef<string | null>(threadId ?? null);

  const history = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: () => messagesFn({ data: { threadId: threadId! } }),
    enabled: !!threadId,
  });

  useEffect(() => {
    if (busy) return;
    currentThread.current = threadId ?? null;
    if (!threadId) setMessages([]);
    else if (history.data)
      setMessages(
        history.data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: (m.sources as unknown as ChatSource[]) ?? [],
        })),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, history.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setBusy(true);
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev.filter((m) => !m.error),
      { id: `u-${Date.now()}`, role: "user", content: message },
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;
    const update = (fn: (m: UiMessage) => UiMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    const { data } = await supabase.auth.getSession();
    try {
      await sendChatMessage({
        token: data.session?.access_token ?? null,
        threadId: currentThread.current,
        message,
        signal: controller.signal,
        onEvent: (e) => {
          if (e.type === "start") {
            currentThread.current = e.threadId;
            update((m) => ({ ...m, sources: e.sources }));
          } else if (e.type === "delta") update((m) => ({ ...m, content: m.content + e.text }));
          else if (e.type === "error")
            update((m) => ({ ...m, pending: false, error: { message: e.error.message, retryable: e.error.retryable } }));
          else if (e.type === "done") update((m) => ({ ...m, pending: false }));
        },
      });
    } catch {
      update((m) => ({ ...m, pending: false, stopped: true }));
    } finally {
      update((m) => ({ ...m, pending: false }));
      setBusy(false);
      abortRef.current = null;
      void qc.invalidateQueries({ queryKey: ["chat-threads"] });
      if (currentThread.current && currentThread.current !== threadId) {
        void navigate({ search: { t: currentThread.current }, replace: true });
      }
    }
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.slice(0, -2));
    void send(lastUser.content);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <aside className="ledger-card hidden h-[calc(100vh-9rem)] flex-col p-3 lg:flex">
        <Button variant="outline" className="mb-3 justify-start gap-2" onClick={() => navigate({ search: {} })}>
          <Plus className="size-4" /> Nouvelle conversation
        </Button>
        <p className="ledger-kicker mb-2 px-1">Historique</p>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {threads.isLoading && <p className="px-1 text-xs text-muted-foreground">Chargement…</p>}
          {threads.isError && <p className="px-1 text-xs text-destructive">Historique indisponible.</p>}
          {threads.data?.threads.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">Aucune conversation enregistrée.</p>
          )}
          {threads.data?.threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm ${t.id === threadId ? "bg-secondary font-medium" : "hover:bg-muted"}`}
            >
              <Link to="/assistant" search={{ t: t.id }} className="min-w-0 flex-1 truncate">
                {t.title}
              </Link>
              <button
                aria-label="Supprimer la conversation"
                className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                onClick={async () => {
                  await deleteFn({ data: { threadId: t.id } });
                  await qc.invalidateQueries({ queryKey: ["chat-threads"] });
                  if (t.id === threadId) void navigate({ search: {} });
                }}
              >
                <Trash2 className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="ledger-card flex h-[calc(100vh-9rem)] min-h-[28rem] flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6">
          <div>
            <p className="ledger-kicker">Copilote RH · Madagascar</p>
            <h1 className="font-display text-xl">Assistant RH</h1>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 lg:hidden" onClick={() => navigate({ search: {} })}>
            <Plus className="size-4" /> Nouvelle
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {threadId && history.isLoading && <p className="text-sm text-muted-foreground">Chargement de la conversation…</p>}
          {threadId && history.isError && (
            <p className="text-sm text-destructive">Conversation introuvable ou inaccessible.</p>
          )}
          {messages.length === 0 && !history.isLoading && (
            <div className="mx-auto max-w-xl space-y-5 py-8 text-center">
              <h2 className="font-display text-2xl">Comment puis-je vous aider ?</h2>
              <p className="text-sm text-muted-foreground">
                Je réponds à partir de la bibliothèque juridique de l'application, je signale ce qui reste à
                vérifier et je n'exécute aucune action sans votre confirmation.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m) => (
              <MessageView key={m.id} m={m} onRetry={retry} />
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <form
          className="border-t border-border p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40">
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder="Posez votre question RH… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
              aria-label="Votre message"
              rows={1}
              className="max-h-40 min-h-10 flex-1 resize-none border-0 shadow-none focus-visible:ring-0"
            />
            {busy ? (
              <Button type="button" size="icon" variant="outline" aria-label="Arrêter" onClick={() => abortRef.current?.abort()}>
                <Square className="size-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Envoyer" disabled={!draft.trim()}>
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
            Informations documentaires générées par IA : vérifiez toujours la source officielle avant décision.
          </p>
        </form>
      </section>
    </div>
  );
}

function MessageView({ m, onRetry }: { m: UiMessage; onRetry: () => void }) {
  if (m.role === "user")
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {m.content}
        </div>
      </div>
    );
  const verified = m.sources?.filter((s) => s.status === "verifie") ?? [];
  const toCheck = m.sources?.filter((s) => s.status === "a_verifier") ?? [];
  return (
    <div className="space-y-3">
      {m.pending && !m.content && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="ledger-dots" aria-hidden /> L'assistant rédige sa réponse…
        </p>
      )}
      {m.content && (
        <div className="prose-ledger text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
            {m.content}
          </ReactMarkdown>
        </div>
      )}
      {m.stopped && <p className="text-xs text-muted-foreground">Réponse arrêtée.</p>}
      {m.error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm">
          <AlertTriangle className="size-4 text-warning" />
          <span className="flex-1">{m.error.message}</span>
          {m.error.retryable && (
            <Button size="sm" variant="outline" className="gap-1" onClick={onRetry}>
              <RotateCcw className="size-3.5" /> Réessayer
            </Button>
          )}
        </div>
      )}
      {!m.pending && !m.error && m.sources && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
          <p className="mb-1 flex items-center gap-1 font-medium">
            <BookMarked className="size-3.5" /> Sources de la bibliothèque juridique
          </p>
          {m.sources.length === 0 ? (
            <p className="text-muted-foreground">
              Aucune règle sourcée n'est encore enregistrée : aucune affirmation juridique de cette réponse n'est
              vérifiée.{" "}
              <Link to="/veille-juridique" className="underline">
                Ajouter des sources
              </Link>
            </p>
          ) : (
            <ul className="space-y-1">
              {[...verified, ...toCheck].map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${s.status === "verifie" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                    {s.status === "verifie" ? "Vérifiée" : "À vérifier"}
                  </span>
                  <span>
                    {s.title}
                    {s.article ? ` — ${s.article}` : ""}
                    {s.sourceLabel ? ` · ${s.sourceLabel}` : ""}
                    {s.lastCheckedOn ? ` · vérifiée le ${s.lastCheckedOn}` : ""}
                  </span>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                      Ouvrir
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
