/**
 * Logique pure de l'assistant RH (sans réseau) : prompt système, contexte
 * juridique, historique et traduction des erreurs du service IA.
 */
export const CHAT_MODEL = "openai/gpt-6-astra";
export const MAX_HISTORY = 30;

export interface LegalRuleContext {
  id: string;
  title: string;
  statement: string;
  article: string | null;
  status: "a_verifier" | "verifie" | "obsolete";
  last_checked_on: string | null;
  effective_on: string | null;
  source_label: string | null;
  source_url: string | null;
  source_reference: string | null;
}

export interface ChatSource {
  id: string;
  title: string;
  article: string | null;
  status: "verifie" | "a_verifier";
  sourceLabel: string | null;
  url: string | null;
  lastCheckedOn: string | null;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/** Seules les règles non obsolètes sont exposées ; elles sont classées vérifiées / à vérifier. */
export function toSources(rules: LegalRuleContext[]): ChatSource[] {
  return rules
    .filter((r) => r.status !== "obsolete")
    .map((r) => ({
      id: r.id,
      title: r.title,
      article: r.article,
      status: r.status === "verifie" ? "verifie" : "a_verifier",
      sourceLabel: r.source_label,
      url: r.source_url,
      lastCheckedOn: r.last_checked_on,
    }));
}

function describeRule(r: LegalRuleContext): string {
  return [
    `- [${r.status === "verifie" ? "VÉRIFIÉE" : "À VÉRIFIER"}] ${r.title}`,
    `  Énoncé : ${r.statement}`,
    `  Article : ${r.article ?? "non renseigné"} · Source : ${r.source_label ?? "non renseignée"}${r.source_reference ? ` (${r.source_reference})` : ""}`,
    `  Lien : ${r.source_url ?? "aucun"} · Vérifiée le : ${r.last_checked_on ?? "jamais"} · Effet : ${r.effective_on ?? "inconnu"}`,
  ].join("\n");
}

export function buildSystemPrompt(rules: LegalRuleContext[]): string {
  const usable = rules.filter((r) => r.status !== "obsolete");
  const library =
    usable.length === 0
      ? "BIBLIOTHÈQUE JURIDIQUE : VIDE. Aucune règle sourcée n'est enregistrée."
      : `BIBLIOTHÈQUE JURIDIQUE (seules sources autorisées) :\n${usable.map(describeRule).join("\n")}`;

  return `Tu es l'assistant RH de MadaRH Copilot, au service d'un administrateur RH à Madagascar. Tu réponds en français, de façon précise, professionnelle et concise, en Markdown simple.

RÈGLES ABSOLUES :
1. Tu n'inventes JAMAIS de loi, d'article, de décret, de durée, de taux, de montant, de délai légal ou de citation. Tu ne cites que la bibliothèque juridique ci-dessous.
2. Pour toute question juridique, structure la réponse en trois parties titrées :
   « Droit vérifié » (uniquement les règles VÉRIFIÉES, avec article et source),
   « Source à vérifier » (règles À VÉRIFIER, à signaler comme non confirmées),
   « Conseil pratique » (bonnes pratiques sans valeur juridique).
   Si une partie est vide, écris explicitement « Aucune règle sourcée disponible pour ce point ».
3. Si la bibliothèque ne couvre pas la question, dis-le clairement et propose une méthode de vérification : consulter le texte officiel (Code du travail malgache, décrets d'application, Journal officiel, CNaPS, OSTIE, inspection du travail), noter la référence, l'article et la date, puis l'ajouter à la bibliothèque juridique de l'application.
4. S'il manque une information (type de contrat, ancienneté, dates, établissement), pose la question avant de conclure.
5. Tu ne exécutes aucune action : tu peux préparer un brouillon (courriel, note, formule Google Sheets, plan), mais toute action réelle exige une proposition, un aperçu et une confirmation dans l'application.
6. Tu ne demandes ni ne reproduis de données médicales, disciplinaires ou salariales individuelles. Ne fais aucune déduction de cause à partir de chiffres.
7. Pour les tâches non juridiques (rédaction, structuration, calculs simples, formules), aide normalement.

${library}`;
}

export function buildMessages(
  systemPrompt: string,
  history: HistoryMessage[],
  userMessage: string,
): { role: "system" | "user" | "assistant"; content: string }[] {
  return [
    { role: "system", content: systemPrompt },
    ...history.slice(-MAX_HISTORY),
    { role: "user", content: userMessage },
  ];
}

export interface ChatError {
  status: number;
  code: "non_authentifie" | "configuration" | "quota" | "credits" | "refus" | "requete" | "service" | "reseau";
  message: string;
  retryable: boolean;
}

export function mapGatewayError(status: number, body: string): ChatError {
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } };
    detail = parsed.message ?? parsed.error?.message ?? "";
  } catch {
    detail = "";
  }
  const suffix = detail ? ` (${detail.slice(0, 200)})` : "";
  if (status === 401)
    return { status: 503, code: "configuration", message: "Assistant indisponible : la clé du service IA est invalide côté serveur.", retryable: false };
  if (status === 402)
    return { status: 402, code: "credits", message: `Crédits IA de l'espace de travail épuisés : l'assistant est suspendu jusqu'à leur rechargement.${suffix}`, retryable: false };
  if (status === 403)
    return { status: 403, code: "refus", message: `Accès au modèle IA refusé.${suffix}`, retryable: false };
  if (status === 429)
    return { status: 429, code: "quota", message: "Trop de demandes envoyées au service IA. Patientez quelques instants puis réessayez.", retryable: true };
  if (status >= 500)
    return { status: 502, code: "service", message: "Le service IA est temporairement indisponible. Réessayez dans un instant.", retryable: true };
  return { status: 400, code: "requete", message: `Requête refusée par le service IA.${suffix}`, retryable: false };
}

export const missingKeyError: ChatError = {
  status: 503,
  code: "configuration",
  message: "Assistant indisponible : la clé du service IA (LOVABLE_API_KEY) n'est pas configurée côté serveur.",
  retryable: false,
};

export const unauthenticatedError: ChatError = {
  status: 401,
  code: "non_authentifie",
  message: "Connexion requise : connectez-vous pour utiliser l'assistant.",
  retryable: false,
};

/** Extrait le texte d'un bloc SSE Chat Completions ; tolère les blocs partiels. */
export function parseSseChunk(buffer: string): { deltas: string[]; rest: string; done: boolean } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const deltas: string[] = [];
  let done = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") {
      done = true;
      continue;
    }
    try {
      const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
      const text = json.choices?.[0]?.delta?.content;
      if (text) deltas.push(text);
    } catch {
      // ligne incomplète ignorée
    }
  }
  return { deltas, rest, done };
}

export function threadTitle(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean || "Nouvelle conversation";
}
