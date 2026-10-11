import type { ChatSource } from "./chat-core";

export type StreamEvent =
  | { type: "start"; threadId: string; sources: ChatSource[] }
  | { type: "delta"; text: string }
  | { type: "done"; threadId: string }
  | { type: "error"; error: { code: string; message: string; retryable: boolean } };

/** Découpe un flux NDJSON en événements ; renvoie le reste incomplet. */
export function parseNdjson(buffer: string): { events: StreamEvent[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as StreamEvent);
    } catch {
      // ligne corrompue ignorée
    }
  }
  return { events, rest };
}

export interface SendOptions {
  token: string | null;
  threadId: string | null;
  message: string;
  signal: AbortSignal;
  onEvent: (e: StreamEvent) => void;
  fetchImpl?: typeof fetch;
}

/** Envoie un message à /api/chat et relaie les événements. Les erreurs HTTP deviennent un événement « error ». */
export async function sendChatMessage(opts: SendOptions): Promise<void> {
  const f = opts.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f("/api/chat", {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: JSON.stringify({ threadId: opts.threadId, message: opts.message }),
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    opts.onEvent({ type: "error", error: { code: "reseau", message: "Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.", retryable: true } });
    return;
  }
  if (!res.ok || !res.body) {
    let error = { code: "service", message: `Erreur du serveur (${res.status}).`, retryable: res.status >= 500 };
    try {
      const body = (await res.json()) as { error?: typeof error };
      if (body.error) error = body.error;
    } catch {
      // corps non JSON
    }
    opts.onEvent({ type: "error", error });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseNdjson(buffer);
    buffer = parsed.rest;
    parsed.events.forEach(opts.onEvent);
  }
  if (buffer.trim()) parseNdjson(`${buffer}\n`).events.forEach(opts.onEvent);
}
