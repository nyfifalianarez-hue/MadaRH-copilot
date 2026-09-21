import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LegalDisclaimer, RuleCitation } from "@/components/legal-notice";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { ProposalCard } from "@/components/proposal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, leaveTypeLabels } from "@/data/labels";
import { employeeName, useStore } from "@/data/store";
import type { LeaveAbsence, LeaveType } from "@/data/types";

export const Route = createFileRoute("/conges")({
  head: () => ({
    meta: [
      { title: "Congés & absences — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Suivi DEMO des congés et absences : annuel, maternité, paternité, maladie, accident du travail. Durées issues de la bibliothèque juridique.",
      },
      { property: "og:title", content: "Congés & absences — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Décisions de congé proposées, prévisualisées puis confirmées, jamais appliquées seules.",
      },
    ],
  }),
  component: LeavesPage,
});

const statusTone: Record<LeaveAbsence["status"], string> = {
  brouillon: "bg-muted text-muted-foreground",
  en_attente: "bg-warning/20 text-warning-foreground",
  valide: "bg-success/15 text-success",
  refuse: "bg-destructive/12 text-destructive",
};

const statusLabels: Record<LeaveAbsence["status"], string> = {
  brouillon: "Brouillon",
  en_attente: "En attente",
  valide: "Validé",
  refuse: "Refusé",
};

function LeavesPage() {
  const { leaves, employees, legalRules, legalSources, proposals, propose, ruleFor } = useStore();
  const [type, setType] = useState<LeaveType | "tous">("tous");
  const [status, setStatus] = useState<LeaveAbsence["status"] | "tous">("tous");

  const filtered = useMemo(
    () =>
      leaves.filter(
        (l) => (type === "tous" || l.type === type) && (status === "tous" || l.status === status),
      ),
    [leaves, status, type],
  );

  const pendingProposals = proposals.filter(
    (p) => p.kind === "conge_decision" && p.status === "en_attente",
  );

  const decide = (leave: LeaveAbsence, decision: "valide" | "refuse") => {
    const rule = leave.legalRuleId
      ? legalRules.find((r) => r.id === leave.legalRuleId)
      : ruleFor(leave.type);
    propose({
      kind: "conge_decision",
      title: `${decision === "valide" ? "Validation" : "Refus"} — ${leaveTypeLabels[leave.type]} · ${employeeName(employees, leave.employeeId)}`,
      analysis: rule
        ? `Règle applicable trouvée (${rule.title}, statut « ${rule.status} »). La durée demandée est de ${leave.days} jour(s), du ${formatDate(leave.startDate)} au ${formatDate(leave.endDate)}.`
        : `Aucune règle enregistrée pour ${leaveTypeLabels[leave.type]}. Aucune durée n'est calculée automatiquement : vérification manuelle requise sur la source officielle.`,
      preview: [
        `Demande : ${leaveTypeLabels[leave.type]}`,
        `Collaborateur : ${employeeName(employees, leave.employeeId)}`,
        `Période : ${formatDate(leave.startDate)} → ${formatDate(leave.endDate)} (${leave.days} j)`,
        `Statut actuel : ${statusLabels[leave.status]}`,
        `Statut après exécution : ${statusLabels[decision]}`,
        rule ? `Règle citée : ${rule.title} — ${rule.statement}` : "Règle citée : aucune (à vérifier)",
      ].join("\n"),
      target: `conge/${leave.id}`,
      legalRuleIds: rule ? [rule.id] : [],
      effect: { type: "leave_status", leaveId: leave.id, status: decision },
    });
    toast.info("Proposition créée. Rien n'est modifié avant votre confirmation.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Congés & absences"
        description="Aucune durée n'est codée en dur : chaque décision cite la règle juridique correspondante, ou signale son absence."
      />
      <LegalDisclaimer compact />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Demandes DEMO" value={leaves.length} hint="Toutes périodes" />
        <StatCard
          label="En attente"
          value={leaves.filter((l) => l.status === "en_attente").length}
          hint="À décider"
          tone="warning"
        />
        <StatCard
          label="Validées"
          value={leaves.filter((l) => l.status === "valide").length}
          hint="Accordées"
          tone="success"
        />
        <StatCard
          label="Sans règle rattachée"
          value={leaves.filter((l) => !l.legalRuleId).length}
          hint="Vérification manuelle"
          tone="danger"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les types</SelectItem>
            {(Object.keys(leaveTypeLabels) as LeaveType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {leaveTypeLabels[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {(Object.keys(statusLabels) as LeaveAbsence["status"][]).map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune donnée disponible pour ces filtres"
          description="Modifiez le type ou le statut pour afficher des demandes."
        />
      ) : (
        <div className="panel overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collaborateur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Jours</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Décision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell className="font-medium">
                    {employeeName(employees, leave.employeeId)}
                  </TableCell>
                  <TableCell>{leaveTypeLabels[leave.type]}</TableCell>
                  <TableCell className="text-xs">
                    {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                  </TableCell>
                  <TableCell>{leave.days}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${statusTone[leave.status]}`}
                    >
                      {statusLabels[leave.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={leave.status === "valide"}
                        onClick={() => decide(leave, "valide")}
                      >
                        Proposer validation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={leave.status === "refuse"}
                        onClick={() => decide(leave, "refuse")}
                      >
                        Proposer refus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Règles juridiques utilisées par ce module</h2>
        <div className="grid gap-2 lg:grid-cols-2">
          {legalRules
            .filter((r) => r.appliesTo !== "contrat" && r.appliesTo !== "general")
            .map((rule) => (
              <RuleCitation
                key={rule.id}
                rule={rule}
                source={legalSources.find((s) => s.id === rule.sourceId)}
              />
            ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Décisions en attente de confirmation</h2>
          <Badge variant="outline">{pendingProposals.length}</Badge>
        </div>
        {pendingProposals.length === 0 ? (
          <EmptyState
            title="Aucune proposition en attente"
            description="Utilisez « Proposer validation » ou « Proposer refus » sur une demande."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pendingProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
