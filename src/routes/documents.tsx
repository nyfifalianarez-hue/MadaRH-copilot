import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LegalDisclaimer } from "@/components/legal-notice";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ProposalCard } from "@/components/proposal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { documentKindLabels, formatDateTime } from "@/data/labels";
import { employeeName, useStore } from "@/data/store";
import type { DocumentKind } from "@/data/types";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Contrats & documents — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Génération de brouillons RH : contrat, avenant, attestation, certificat de travail, réponse à démission. Brouillon uniquement, jamais d'envoi automatique.",
      },
      { property: "og:title", content: "Contrats & documents — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Documents RH générés en brouillon, prévisualisés puis confirmés par un humain.",
      },
    ],
  }),
  component: DocumentsPage,
});

const generatableKinds: DocumentKind[] = [
  "contrat",
  "avenant",
  "attestation",
  "certificat_travail",
  "reponse_demission",
];

function DocumentsPage() {
  const {
    employees,
    documents,
    generatedDocuments,
    proposals,
    propose,
    ruleFor,
    organization,
  } = useStore();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [kind, setKind] = useState<DocumentKind>("attestation");
  const [context, setContext] = useState("");

  const pending = proposals.filter(
    (p) => p.kind === "document_brouillon" && p.status === "en_attente",
  );
  const missing = documents.filter((d) => d.status !== "present");

  const draftBody = () => {
    const employee = employees.find((e) => e.id === employeeId);
    const rule = kind === "contrat" || kind === "avenant" ? ruleFor("contrat") : ruleFor("general");
    return [
      `[BROUILLON — DONNÉES DE DÉMONSTRATION]`,
      `${documentKindLabels[kind]}`,
      `Organisation : ${organization.name} (${organization.country})`,
      `Collaborateur : ${employee?.fullName ?? "—"} — ${employee?.position ?? "—"}`,
      `Type de contrat : ${employee?.contractType ?? "—"}`,
      "",
      "Objet :",
      context.trim() ||
        "À compléter par le service RH. Aucun contenu n'est inventé par l'assistant.",
      "",
      rule
        ? `Référence documentaire citée : ${rule.title} — ${rule.statement} (statut : ${rule.status}).`
        : "Aucune règle juridique enregistrée pour ce document : à vérifier sur la source officielle avant signature.",
      "",
      "Champs à compléter manuellement : rémunération, durée, lieu de travail, date et signatures.",
    ].join("\n");
  };

  const generate = () => {
    if (!employeeId) {
      toast.error("Sélectionnez un collaborateur.");
      return;
    }
    const employee = employees.find((e) => e.id === employeeId);
    const body = draftBody();
    const rule = kind === "contrat" || kind === "avenant" ? ruleFor("contrat") : ruleFor("general");
    propose({
      kind: "document_brouillon",
      title: `${documentKindLabels[kind]} — ${employee?.fullName ?? "collaborateur"}`,
      analysis:
        "Le document est produit en brouillon uniquement : aucun envoi, aucune signature et aucune donnée collaborateur ne sont modifiés. Les champs non fournis restent à compléter.",
      preview: body,
      target: `document/${kind}/${employeeId}`,
      legalRuleIds: rule ? [rule.id] : [],
      effect: {
        type: "generate_document",
        document: {
          id: `gen-${Date.now().toString(36)}`,
          employeeId,
          kind,
          title: `${documentKindLabels[kind]} — ${employee?.fullName ?? "collaborateur"}`,
          status: "brouillon",
          createdAt: new Date().toISOString(),
          body,
        },
      },
    });
    toast.info("Proposition créée. Le brouillon sera enregistré après confirmation.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contrats & documents"
        description="Génération en brouillon uniquement. Rien n'est envoyé, signé ou classé sans confirmation explicite."
      />
      <LegalDisclaimer compact />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="panel space-y-3 p-4">
          <h2 className="text-sm font-semibold">Nouveau brouillon</h2>
          <div className="space-y-2">
            <Label>Collaborateur</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName} — {e.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type de document</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as DocumentKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generatableKinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {documentKindLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctx">Éléments fournis par le service RH</Label>
            <Textarea
              id="ctx"
              rows={4}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Motif, dates, précisions… L'assistant n'invente aucune donnée manquante."
            />
          </div>
          <Button onClick={generate} className="gap-1">
            <FileText className="size-4" /> Proposer le brouillon
          </Button>
        </div>

        <div className="panel space-y-2 p-4">
          <h2 className="text-sm font-semibold">Aperçu avant proposition</h2>
          <div className="preview-block max-h-80 overflow-y-auto">{draftBody()}</div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Brouillons en attente de confirmation</h2>
          <Badge variant="outline">{pending.length}</Badge>
        </div>
        {pending.length === 0 ? (
          <EmptyState
            title="Aucune proposition en attente"
            description="Créez un brouillon pour le voir apparaître ici."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Brouillons enregistrés</h2>
        {generatedDocuments.length === 0 ? (
          <EmptyState
            title="Aucun document généré"
            description="Les brouillons confirmés apparaîtront ici avec leur contenu complet."
          />
        ) : (
          <div className="space-y-3">
            {generatedDocuments.map((doc) => (
              <div key={doc.id} className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {employeeName(employees, doc.employeeId)} · créé le{" "}
                      {formatDateTime(doc.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {doc.status === "brouillon" ? "Brouillon" : "Validé"}
                  </Badge>
                </div>
                <div className="preview-block mt-2 max-h-60 overflow-y-auto">{doc.body}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Documents manquants ou expirés</h2>
        {missing.length === 0 ? (
          <EmptyState
            title="Aucun document manquant"
            description="Tous les documents DEMO suivis sont présents."
          />
        ) : (
          <ul className="panel divide-y divide-border">
            {missing.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {employeeName(employees, d.employeeId)} · {documentKindLabels[d.kind]}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    d.status === "expire" ? "text-warning-foreground" : "text-destructive"
                  }
                >
                  {d.status === "expire" ? "Expiré" : "Manquant"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
