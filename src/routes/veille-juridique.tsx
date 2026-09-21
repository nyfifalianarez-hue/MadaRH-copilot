import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ConfidenceBadge, LegalDisclaimer, RuleStatusBadge } from "@/components/legal-notice";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { ProposalCard } from "@/components/proposal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime, ruleStatusLabels } from "@/data/labels";
import { useStore } from "@/data/store";

export const Route = createFileRoute("/veille-juridique")({
  head: () => ({
    meta: [
      { title: "Veille juridique — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Bibliothèque juridique versionnée : source, article, date d'effet, date de vérification, statut et niveau de confiance pour chaque règle RH.",
      },
      { property: "og:title", content: "Veille juridique — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Règles RH sourcées et versionnées, révisées avant publication.",
      },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  const { legalRules, legalRuleVersions, legalSources, proposals, propose } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [comment, setComment] = useState("");

  const pending = proposals.filter(
    (p) => p.kind === "publication_regle" && p.status === "en_attente",
  );

  const filtered = legalRules.filter((r) =>
    `${r.title} ${r.topic} ${r.statement} ${r.article}`.toLowerCase().includes(query.toLowerCase()),
  );

  const submitRevision = (ruleId: string) => {
    if (statement.trim().length < 10) {
      toast.error("Rédigez l'énoncé de la règle (10 caractères minimum).");
      return;
    }
    const rule = legalRules.find((r) => r.id === ruleId);
    if (!rule) return;
    propose({
      kind: "publication_regle",
      title: `Révision — ${rule.title}`,
      analysis:
        "Une nouvelle version de la règle est proposée. Elle sera enregistrée avec le statut « à vérifier » : aucune règle n'est publiée comme vérifiée sans contrôle humain sur la source officielle.",
      preview: [
        `Règle : ${rule.title}`,
        `Source : ${legalSources.find((s) => s.id === rule.sourceId)?.name ?? rule.sourceId}`,
        `Article : ${rule.article}`,
        `Version actuelle : v${rule.version} — ${rule.statement}`,
        `Version proposée : v${rule.version + 1} — ${statement.trim()}`,
        `Statut après exécution : À vérifier`,
        `Commentaire de révision : ${comment.trim() || "—"}`,
      ].join("\n"),
      target: `regle/${rule.id}`,
      legalRuleIds: [rule.id],
      effect: {
        type: "publish_rule",
        ruleId: rule.id,
        statement: statement.trim(),
        comment: comment.trim() || "Révision sans commentaire.",
      },
    });
    setEditing(null);
    setStatement("");
    setComment("");
    toast.info("Proposition de révision créée. La règle reste inchangée jusqu'à confirmation.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Veille juridique"
        description="Chaque règle porte sa source, son article, ses dates, son statut et son niveau de confiance. Rien n'est publié comme vérifié sans contrôle humain."
      />
      <LegalDisclaimer />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Règles suivies" value={legalRules.length} hint="Bibliothèque DEMO" />
        <StatCard
          label="À vérifier"
          value={legalRules.filter((r) => r.status === "a_verifier").length}
          hint="Contrôle source requis"
          tone="warning"
        />
        <StatCard
          label="Vérifiées"
          value={legalRules.filter((r) => r.status === "verifie").length}
          hint="Contrôlées sur la source"
          tone="success"
        />
        <StatCard label="Sources référencées" value={legalSources.length} hint="Textes officiels" />
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une règle, un thème, un article…"
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune règle correspondante"
          description="Aucune règle enregistrée ne correspond à cette recherche. L'assistant n'inventera pas de règle manquante."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((rule) => {
            const source = legalSources.find((s) => s.id === rule.sourceId);
            const versions = legalRuleVersions
              .filter((v) => v.ruleId === rule.id)
              .sort((a, b) => b.version - a.version);
            return (
              <div key={rule.id} className="panel space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{rule.title}</p>
                  <Badge variant="outline">{rule.topic}</Badge>
                  <Badge variant="outline">v{rule.version}</Badge>
                  <RuleStatusBadge status={rule.status} />
                  <ConfidenceBadge confidence={rule.confidence} />
                </div>
                <p className="text-sm">{rule.statement}</p>
                <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="inline font-medium">Source : </dt>
                    <dd className="inline">{source?.name ?? rule.sourceId}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Article : </dt>
                    <dd className="inline">{rule.article}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Date d'effet : </dt>
                    <dd className="inline">{formatDate(rule.effectiveFrom)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Vérifiée le : </dt>
                    <dd className="inline">{formatDate(rule.lastCheckedAt)}</dd>
                  </div>
                </dl>

                {versions.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Historique des versions ({versions.length})
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {versions.map((v) => (
                        <li key={v.id} className="rounded-md border border-border p-2">
                          <p className="font-medium">
                            v{v.version} · {ruleStatusLabels[v.status]} ·{" "}
                            {formatDateTime(v.changedAt)}
                          </p>
                          <p className="mt-1">{v.statement}</p>
                          <p className="mt-1 text-muted-foreground">
                            {v.changedBy} — {v.comment}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {editing === rule.id ? (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <div className="space-y-1">
                      <Label htmlFor={`st-${rule.id}`}>Nouvel énoncé</Label>
                      <Textarea
                        id={`st-${rule.id}`}
                        rows={3}
                        value={statement}
                        onChange={(e) => setStatement(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`cm-${rule.id}`}>Commentaire de révision</Label>
                      <Input
                        id={`cm-${rule.id}`}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Motif, contrôle effectué, référence consultée…"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitRevision(rule.id)}>
                        Proposer la révision
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(rule.id);
                      setStatement(rule.statement);
                      setComment("");
                    }}
                  >
                    Réviser
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Sources officielles référencées</h2>
        <ul className="panel divide-y divide-border">
          {legalSources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.publisher} · vérifiée le {formatDate(s.lastCheckedAt)}
                </p>
              </div>
              {s.url.startsWith("http") ? (
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <a href={s.url} target="_blank" rel="noreferrer noopener">
                    Ouvrir la source
                  </a>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Référence hors ligne</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Révisions en attente de confirmation</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
