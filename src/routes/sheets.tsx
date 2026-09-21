import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/page-header";
import { ProposalCard } from "@/components/proposal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/data/store";

export const Route = createFileRoute("/sheets")({
  head: () => ({
    meta: [
      { title: "Assistant Google Sheets — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Expliquer, corriger ou générer une formule Google Sheets, avec aperçu obligatoire avant toute écriture dans une feuille.",
      },
      { property: "og:title", content: "Assistant Google Sheets — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Aide aux formules RH et écriture de feuille soumise à confirmation.",
      },
    ],
  }),
  component: SheetsPage,
});

function explain(formula: string): string {
  if (!formula.trim()) return "Collez une formule pour obtenir une explication.";
  const fns = Array.from(formula.toUpperCase().matchAll(/([A-Z.]{2,})\(/g)).map((m) => m[1]);
  const unique = Array.from(new Set(fns));
  const known: Record<string, string> = {
    SOMME: "additionne une plage de valeurs",
    SUM: "additionne une plage de valeurs",
    "RECHERCHEV": "recherche une valeur dans la première colonne d'une plage",
    VLOOKUP: "recherche une valeur dans la première colonne d'une plage",
    SI: "renvoie une valeur selon une condition",
    IF: "renvoie une valeur selon une condition",
    "NB.SI": "compte les cellules répondant à un critère",
    COUNTIF: "compte les cellules répondant à un critère",
    "SOMME.SI": "additionne les cellules répondant à un critère",
    SUMIF: "additionne les cellules répondant à un critère",
    IFERROR: "remplace une erreur par une valeur de repli",
    SIERREUR: "remplace une erreur par une valeur de repli",
  };
  const lines = unique.map((fn) =>
    known[fn]
      ? `• ${fn} : ${known[fn]}.`
      : `• ${fn} : fonction non décrite dans cette aide — à vérifier dans la documentation Google Sheets.`,
  );
  const balance =
    (formula.match(/\(/g) ?? []).length - (formula.match(/\)/g) ?? []).length;
  if (balance !== 0)
    lines.push(
      `⚠ Parenthèses déséquilibrées : ${Math.abs(balance)} ${balance > 0 ? "fermante(s) manquante(s)" : "ouvrante(s) manquante(s)"}.`,
    );
  if (!formula.trim().startsWith("="))
    lines.push("⚠ La formule ne commence pas par « = » : elle sera interprétée comme du texte.");
  return lines.length ? lines.join("\n") : "Aucune fonction reconnue dans cette formule.";
}

function SheetsPage() {
  const { proposals, propose, integrations } = useStore();
  const [formula, setFormula] = useState("=SOMME(B2:B13)");
  const [sheetUrl, setSheetUrl] = useState("");
  const [range, setRange] = useState("A1");

  const sheetsIntegration = integrations.find((i) => i.id === "google_sheets");
  const connected = sheetsIntegration?.status === "connecte";
  const pending = proposals.filter(
    (p) => p.kind === "ecriture_sheets" && p.status === "en_attente",
  );

  const proposeWrite = () => {
    if (!sheetUrl.trim()) {
      toast.error("Indiquez l'adresse de la feuille cible.");
      return;
    }
    propose({
      kind: "ecriture_sheets",
      title: `Écriture de formule dans une feuille (${range || "A1"})`,
      analysis: connected
        ? "La feuille est accessible. L'écriture ne portera que sur la cellule indiquée."
        : "Google Sheets n'est pas connecté : la confirmation sera enregistrée et auditée, mais aucune écriture réelle ne sera effectuée.",
      preview: [
        `Feuille : ${sheetUrl.trim()}`,
        `Cellule : ${range || "A1"}`,
        `Contenu écrit : ${formula}`,
        "",
        "Explication de la formule :",
        explain(formula),
      ].join("\n"),
      target: `sheets/${range || "A1"}`,
      requiresExternalCall: true,
    });
    toast.info("Proposition créée. Aucune écriture avant confirmation.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assistant Google Sheets"
        description="Expliquer, corriger ou générer une formule. Toute écriture dans une feuille passe par un aperçu puis une confirmation."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-3 p-4">
          <h2 className="text-sm font-semibold">Formule</h2>
          <Textarea rows={4} value={formula} onChange={(e) => setFormula(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sheet">Feuille cible</Label>
              <Input
                id="sheet"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/…"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="range">Cellule</Label>
              <Input id="range" value={range} onChange={(e) => setRange(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast.success("Explication mise à jour.")}>
              Expliquer / vérifier
            </Button>
            <Button onClick={proposeWrite}>Proposer l'écriture</Button>
          </div>
          {!connected && (
            <p className="rounded-md border border-info/40 bg-info/10 p-2 text-xs">
              Google Sheets n'est pas connecté. L'interface et le circuit d'autorisation existent,
              mais aucun identifiant n'est simulé : la connexion réelle nécessite les secrets OAuth
              côté serveur.
            </p>
          )}
        </div>

        <div className="panel space-y-2 p-4">
          <h2 className="text-sm font-semibold">Explication</h2>
          <div className="preview-block max-h-80 overflow-y-auto">{explain(formula)}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Écritures en attente de confirmation</h2>
        {pending.length === 0 ? (
          <EmptyState
            title="Aucune écriture proposée"
            description="Les propositions d'écriture apparaîtront ici avec leur aperçu exact."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
