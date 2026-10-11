import { describe, expect, it } from "vitest";

import {
  MAX_HISTORY, buildMessages, buildSystemPrompt, mapGatewayError, parseSseChunk, toSources, type LegalRuleContext,
} from "./chat-core";
import { parseNdjson, sendChatMessage, type StreamEvent } from "./stream-client";

const rule = (status: LegalRuleContext["status"], id = "r1"): LegalRuleContext => ({
  id, title: "Règle", statement: "Énoncé", article: "Art. X", status, last_checked_on: null,
  effective_on: null, source_label: "Source", source_url: null, source_reference: null,
});

describe("contexte juridique", () => {
  it("bibliothèque vide : le prompt l'annonce et interdit l'invention", () => {
    const p = buildSystemPrompt([]);
    expect(p).toContain("BIBLIOTHÈQUE JURIDIQUE : VIDE");
    expect(p).toContain("n'inventes JAMAIS");
  });
  it("bibliothèque vide : aucune source renvoyée", () => {
    expect(toSources([])).toEqual([]);
  });
  it("distingue règle vérifiée et à vérifier, exclut les obsolètes", () => {
    const s = toSources([rule("verifie", "a"), rule("a_verifier", "b"), rule("obsolete", "c")]);
    expect(s.map((x) => [x.id, x.status])).toEqual([["a", "verifie"], ["b", "a_verifier"]]);
  });
});

describe("suivi du contexte", () => {
  it("transmet l'historique puis le nouveau message", () => {
    const m = buildMessages("SYS", [{ role: "user", content: "q1" }, { role: "assistant", content: "r1" }], "q2");
    expect(m.map((x) => x.content)).toEqual(["SYS", "q1", "r1", "q2"]);
  });
  it("limite l'historique transmis", () => {
    const h = Array.from({ length: 50 }, (_, i) => ({ role: "user" as const, content: String(i) }));
    expect(buildMessages("S", h, "x")).toHaveLength(MAX_HISTORY + 2);
  });
});

describe("erreurs du service IA", () => {
  it("402 → crédits épuisés, non réessayable", () => {
    const e = mapGatewayError(402, "{}");
    expect([e.code, e.retryable]).toEqual(["credits", false]);
  });
  it("429 → quota, réessayable", () => {
    expect(mapGatewayError(429, "").code).toBe("quota");
  });
  it("403 conserve le statut", () => {
    expect(mapGatewayError(403, '{"message":"refusé"}').status).toBe(403);
  });
  it("5xx → service, réessayable", () => {
    expect(mapGatewayError(503, "").retryable).toBe(true);
  });
});

describe("flux", () => {
  it("SSE : extrait les morceaux et garde le reste partiel", () => {
    const r = parseSseChunk('data: {"choices":[{"delta":{"content":"Bon"}}]}\ndata: {"choices":[{"delta":{"content":"jour"}}]}\ndata: {"cho');
    expect(r.deltas.join("")).toBe("Bonjour");
    expect(r.rest).toBe('data: {"cho');
  });
  it("NDJSON : découpe les événements", () => {
    expect(parseNdjson('{"type":"delta","text":"a"}\n{"type":').events).toHaveLength(1);
  });
  it("401 serveur : l'erreur s'affiche telle quelle, sans réponse inventée", async () => {
    const events: StreamEvent[] = [];
    const fetchImpl = (async () =>
      Response.json({ error: { code: "non_authentifie", message: "Connexion requise", retryable: false } }, { status: 401 })) as unknown as typeof fetch;
    await sendChatMessage({ token: null, threadId: null, message: "x", signal: new AbortController().signal, onEvent: (e) => events.push(e), fetchImpl });
    expect(events).toEqual([{ type: "error", error: { code: "non_authentifie", message: "Connexion requise", retryable: false } }]);
  });
  it("erreur réseau : message explicite réessayable", async () => {
    const events: StreamEvent[] = [];
    const fetchImpl = (async () => { throw new TypeError("fail"); }) as unknown as typeof fetch;
    await sendChatMessage({ token: "t", threadId: null, message: "x", signal: new AbortController().signal, onEvent: (e) => events.push(e), fetchImpl });
    expect(events[0]).toMatchObject({ type: "error", error: { code: "reseau", retryable: true } });
  });
});
