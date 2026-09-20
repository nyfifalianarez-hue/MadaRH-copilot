import { AlertTriangle, ScrollText } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, ruleStatusLabels } from "@/data/labels";
import type { LegalRule, LegalSource } from "@/data/types";

/** Bannière obligatoire : l'information juridique est documentaire. */
export function LegalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <Alert className="border-warning/40 bg-warning/10">
      <AlertTriangle className="size-4 text-warning" />
      <AlertTitle className="text-sm">Information juridique documentaire</AlertTitle>
      <AlertDescription className="text-xs">
        Les règles affichées sont fournies à titre documentaire et doivent être vérifiées sur la
        source officielle applicable avant toute décision.
        {!compact &&
          " Aucune durée, aucun droit et aucune obligation n'est appliqué automatiquement sans règle sourcée et confirmée."}
      </AlertDescription>
    </Alert>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone = pct >= 80 ? "bg-success/15 text-success" : pct >= 50 ? "bg-warning/20 text-warning-foreground" : "bg-destructive/12 text-destructive";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
      Confiance {pct} %
    </span>
  );
}

export function RuleStatusBadge({ status }: { status: LegalRule["status"] }) {
  const variant =
    status === "verifie"
      ? "bg-success/15 text-success"
      : status === "obsolete"
        ? "bg-muted text-muted-foreground"
        : "bg-warning/20 text-warning-foreground";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${variant}`}>
      {ruleStatusLabels[status]}
    </span>
  );
}

/**
 * Citation d'une règle : source, article, date de vérification, date d'effet,
 * statut et niveau de confiance — jamais une valeur nue.
 */
export function RuleCitation({
  rule,
  source,
}: {
  rule: LegalRule | undefined;
  source?: LegalSource | undefined;
}) {
  if (!rule) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Aucune règle enregistrée pour ce cas. L'assistant ne propose pas de durée : une vérification
        manuelle sur la source officielle est nécessaire.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <ScrollText className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{rule.title}</span>
        <Badge variant="outline" className="text-[11px]">
          v{rule.version}
        </Badge>
        <RuleStatusBadge status={rule.status} />
        <ConfidenceBadge confidence={rule.confidence} />
      </div>
      <p className="mt-2 text-foreground">{rule.statement}</p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-2">
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
      {source?.url && source.url.startsWith("http") && (
        <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">
          <a href={source.url} target="_blank" rel="noreferrer noopener">
            Ouvrir la source officielle
          </a>
        </Button>
      )}
    </div>
  );
}
