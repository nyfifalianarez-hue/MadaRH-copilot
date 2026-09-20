import { CheckCircle2, Eye, ShieldAlert, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RuleCitation } from "@/components/legal-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, proposalKindLabels, proposalStatusLabels } from "@/data/labels";
import { useStore } from "@/data/store";
import type { ActionProposal } from "@/data/types";

function StatusBadge({ status }: { status: ActionProposal["status"] }) {
  const cls =
    status === "confirme"
      ? "bg-success/15 text-success"
      : status === "rejete"
        ? "bg-destructive/12 text-destructive"
        : "bg-warning/20 text-warning-foreground";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {proposalStatusLabels[status]}
    </span>
  );
}

/** Carte de proposition : analyse, aperçu, puis confirmation explicite. */
export function ProposalCard({ proposal }: { proposal: ActionProposal }) {
  const { confirmProposal, rejectProposal, legalRules, legalSources } = useStore();
  const [open, setOpen] = useState(false);

  const rules = proposal.legalRuleIds
    .map((id) => legalRules.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {proposalKindLabels[proposal.kind]}
            </Badge>
            <StatusBadge status={proposal.status} />
            {proposal.requiresExternalCall && (
              <span className="flex items-center gap-1 rounded bg-info/12 px-1.5 py-0.5 text-[11px] text-info">
                <ShieldAlert className="size-3" /> action externe
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium">{proposal.title}</p>
          <p className="text-xs text-muted-foreground">
            {proposal.target} · créée le {formatDateTime(proposal.createdAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1">
          <Eye className="size-4" /> Prévisualiser
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{proposal.analysis}</p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{proposal.title}</DialogTitle>
            <DialogDescription>
              Rien n'est exécuté avant votre confirmation. La décision est journalisée dans l'audit.
            </DialogDescription>
          </DialogHeader>

          <section className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                1. Analyse
              </h3>
              <p className="mt-1 text-sm">{proposal.analysis}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                2. Prévisualisation
              </h3>
              <div className="preview-block mt-1">{proposal.preview}</div>
            </div>

            {rules.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  3. Règles citées
                </h3>
                <div className="mt-1 space-y-2">
                  {rules.map((rule) => (
                    <RuleCitation
                      key={rule.id}
                      rule={rule}
                      source={legalSources.find((s) => s.id === rule.sourceId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {proposal.requiresExternalCall && (
              <p className="rounded-md border border-info/40 bg-info/10 p-2 text-xs">
                L'intégration concernée n'est pas connectée : la confirmation est enregistrée et
                auditée, mais aucun appel externe réel n'est effectué.
              </p>
            )}
          </section>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="gap-1"
              disabled={proposal.status !== "en_attente"}
              onClick={() => {
                rejectProposal(proposal.id, "Rejetée depuis la prévisualisation.");
                setOpen(false);
                toast.info("Proposition rejetée. Aucune donnée modifiée.");
              }}
            >
              <XCircle className="size-4" /> Rejeter
            </Button>
            <Button
              className="gap-1"
              disabled={proposal.status !== "en_attente"}
              onClick={() => {
                confirmProposal(proposal.id);
                setOpen(false);
                toast.success("Action confirmée, exécutée et journalisée.");
              }}
            >
              <CheckCircle2 className="size-4" /> Confirmer l'exécution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
