import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, FileWarning, Gavel, ListChecks } from "lucide-react";

import { LegalDisclaimer } from "@/components/legal-notice";
import { EmptyState, PageHeader, StatCard } from "@/components/page-header";
import { ProposalCard } from "@/components/proposal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, leaveTypeLabels } from "@/data/labels";
import { employeeName, useStore } from "@/data/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Tâches RH, validations en attente, documents manquants, congés en cours et changements juridiques à vérifier.",
      },
      { property: "og:title", content: "Tableau de bord — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Vue d'ensemble RH : tâches, validations, alertes et veille juridique.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { tasks, proposals, leaves, employees, documents, legalRules, toggleTask } = useStore();

  const openTasks = tasks.filter((t) => !t.done);
  const pendingProposals = proposals.filter((p) => p.status === "en_attente");
  const missingDocs = documents.filter((d) => d.status !== "present");
  const pendingLeaves = leaves.filter((l) => l.status === "en_attente");
  const rulesToCheck = legalRules.filter((r) => r.status === "a_verifier");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre charge RH. L'application propose, vous décidez : aucune action n'est exécutée sans votre confirmation."
        actions={
          <Button asChild className="gap-1">
            <Link to="/assistant">
              Ouvrir l'assistant RH <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <LegalDisclaimer />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Tâches ouvertes"
          value={openTasks.length}
          hint="À traiter cette semaine"
          tone={openTasks.length > 3 ? "warning" : "neutral"}
        />
        <StatCard
          label="Validations en attente"
          value={pendingProposals.length}
          hint="Propositions à confirmer"
          tone={pendingProposals.length ? "warning" : "success"}
        />
        <StatCard
          label="Documents manquants"
          value={missingDocs.length}
          hint="Dossiers incomplets"
          tone={missingDocs.length ? "danger" : "success"}
        />
        <StatCard
          label="Congés à décider"
          value={pendingLeaves.length}
          hint="Demandes en attente"
          tone={pendingLeaves.length ? "warning" : "success"}
        />
        <StatCard
          label="Règles à vérifier"
          value={rulesToCheck.length}
          hint="Statut « à vérifier »"
          tone="warning"
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ListChecks className="size-4 text-primary" /> Propositions en attente de confirmation
          </h2>
          {pendingProposals.length === 0 ? (
            <EmptyState
              title="Aucune proposition en attente"
              description="Les propositions apparaissent ici dès que l'assistant détecte une action utile : analyse, aperçu, puis votre confirmation."
            />
          ) : (
            <div className="space-y-3">
              {pendingProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          )}

          <h2 className="flex items-center gap-2 pt-2 text-lg font-semibold">
            <CalendarDays className="size-4 text-primary" /> Congés & absences en cours
          </h2>
          {pendingLeaves.length === 0 ? (
            <EmptyState
              title="Aucune demande en attente"
              description="Les demandes de congé et d'absence à décider s'affichent ici."
            />
          ) : (
            <div className="panel divide-y divide-border">
              {pendingLeaves.map((leave) => (
                <div key={leave.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="font-medium">{employeeName(employees, leave.employeeId)}</span>
                  <Badge variant="outline">{leaveTypeLabels[leave.type]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(leave.startDate)} → {formatDate(leave.endDate)} · {leave.days} j
                  </span>
                  <Button asChild size="sm" variant="ghost" className="ml-auto text-xs">
                    <Link to="/conges">Décider</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Mes tâches</h2>
          <div className="panel divide-y divide-border">
            {tasks.map((task) => (
              <label key={task.id} className="flex cursor-pointer items-start gap-2 p-3 text-sm">
                <Checkbox
                  checked={task.done}
                  onCheckedChange={() => toggleTask(task.id)}
                  aria-label={`Marquer « ${task.title} »`}
                />
                <span className="min-w-0">
                  <span className={task.done ? "line-through text-muted-foreground" : ""}>
                    {task.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Échéance {formatDate(task.dueDate)} · priorité {task.priority}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <h2 className="flex items-center gap-2 pt-2 text-lg font-semibold">
            <FileWarning className="size-4 text-destructive" /> Documents manquants
          </h2>
          {missingDocs.length === 0 ? (
            <EmptyState title="Dossiers complets" description="Aucun document manquant détecté." />
          ) : (
            <div className="panel divide-y divide-border">
              {missingDocs.map((doc) => (
                <div key={doc.id} className="p-3 text-sm">
                  <p className="font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {employeeName(employees, doc.employeeId)} ·{" "}
                    {doc.status === "manquant" ? "manquant" : "expiré"}
                  </p>
                </div>
              ))}
            </div>
          )}

          <h2 className="flex items-center gap-2 pt-2 text-lg font-semibold">
            <Gavel className="size-4 text-warning" /> Changements juridiques
          </h2>
          <div className="panel divide-y divide-border">
            {rulesToCheck.slice(0, 4).map((rule) => (
              <div key={rule.id} className="p-3 text-sm">
                <p className="font-medium">{rule.title}</p>
                <p className="text-xs text-muted-foreground">
                  {rule.topic} · v{rule.version} · vérifiée le {formatDate(rule.lastCheckedAt)}
                </p>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/veille-juridique">Ouvrir la veille juridique</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
