import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";

import { LegalDisclaimer, RuleCitation } from "@/components/legal-notice";
import { PageHeader } from "@/components/page-header";
import { ProposalCard } from "@/components/proposal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/data/store";
import type { LeaveType } from "@/data/types";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant RH — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Assistant RH conversationnel : congés, maladie, accident du travail, maternité, contrats, formules Sheets et vérification juridique sourcée.",
      },
      { property: "og:title", content: "Assistant RH — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Un copilote RH qui propose, cite ses sources et attend votre confirmation.",
      },
    ],
  }),
  component: AssistantPage,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  ruleId?: string;
}

const suggestions: { label: string; topic: LeaveType | "contrat" | "general"; prompt: string }[] = [
  { label: "Congé annuel", topic: "conge_annuel", prompt: "Quel est le droit à congé annuel ?" },
  { label: "Maladie", topic: "maladie", prompt: "Comment traiter une absence maladie ?" },
  {
    label: "Accident du travail",
    topic: "accident_travail",
    prompt: "Quelle est la procédure en cas d'accident du travail ?",
  },
  { label: "Maternité", topic: "maternite", prompt: "Quelle est la durée du congé de maternité ?" },
  { label: "Paternité", topic: "paternite", prompt: "Quelle est la durée du congé de paternité ?" },
  { label: "Contrat", topic: "contrat", prompt: "Que prévoir dans un contrat de travail ?" },
  {
    label: "Formule Google Sheets",
    topic: "general",
    prompt: "Peux-tu m'aider sur une formule Google Sheets ?",
  },
  { label: "Relance", topic: "general", prompt: "Prépare une relance de documents manquants." },
  {
    label: "Vérification juridique",
    topic: "general",
    prompt: "Quelles règles doivent être vérifiées ?",
  },
];

export function buildAnswer(
  topic: LeaveType | "contrat" | "general",
  rule: { statement: string; status: string } | undefined,
): string {
  if (topic === "general") {
    return "Je peux préparer un brouillon, une relance ou une formule. Toute action externe ou modification passera par une proposition que vous confirmerez.";
  }
  if (!rule) {
    return "Je n'ai aucune règle enregistrée et sourcée pour ce cas. Je ne propose donc aucune durée : il faut vérifier la source officielle applicable.";
  }
  return `Voici l'information documentaire enregistrée. Elle est marquée « ${rule.status === "a_verifier" ? "à vérifier" : rule.status}" » : ${rule.statement}`;
}

function AssistantPage() {
  const { legalRules, legalSources, proposals, propose, ruleFor } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Bonjour. Je suis votre copilote RH. Je n'exécute rien sans votre confirmation et je cite toujours la règle utilisée, ou je dis que je ne sais pas.",
    },
  ]);
  const [draft, setDraft] = useState("");

  const ask = (prompt: string, topic: LeaveType | "contrat" | "general") => {
    const rule = ruleFor(topic);
    setMessages((prev) => [
      ...prev,
      { id: `u-${prev.length}`, role: "user", text: prompt },
      {
        id: `a-${prev.length}`,
        role: "assistant",
        text: buildAnswer(topic, rule),
        ...(rule ? { ruleId: rule.id } : {}),
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant RH"
        description="Posez une question ou choisissez une suggestion. L'assistant analyse, cite ses sources et crée une proposition lorsqu'une action est nécessaire."
      />
      <LegalDisclaimer />

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Button
            key={s.label}
            variant="outline"
            size="sm"
            onClick={() => ask(s.prompt, s.topic)}
            className="text-xs"
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="panel space-y-3 p-4">
        {messages.map((message) => {
          const rule = message.ruleId ? legalRules.find((r) => r.id === message.ruleId) : undefined;
          return (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[90%] space-y-2 rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              <p>{message.text}</p>
              {message.role === "assistant" && message.ruleId && (
                <RuleCitation
                  rule={rule}
                  source={legalSources.find((s) => s.id === rule?.sourceId)}
                />
              )}
            </div>
          );
        })}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          ask(draft.trim(), "general");
          setDraft("");
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Décrivez votre situation RH…"
          rows={2}
          className="flex-1"
        />
        <Button type="submit" className="gap-1 sm:self-end">
          <Send className="size-4" /> Envoyer
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Propositions issues de l'assistant</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            propose({
              kind: "envoi_externe",
              title: "Relance des documents manquants",
              analysis:
                "Des dossiers DEMO sont incomplets. Un message de relance est préparé ; il ne sera envoyé qu'après votre confirmation.",
              preview:
                "Objet : Documents manquants\nBonjour, merci de transmettre les pièces manquantes de votre dossier.",
              target: "Gmail (intégration non connectée)",
              requiresExternalCall: true,
            })
          }
        >
          Préparer une relance (proposition)
        </Button>
        <div className="space-y-3">
          {proposals.slice(0, 4).map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      </section>
    </div>
  );
}
