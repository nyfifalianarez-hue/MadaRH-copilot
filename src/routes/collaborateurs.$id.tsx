import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/page-header";
import { SensitiveField } from "@/components/sensitive-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentKindLabels, employeeStatusLabels, formatDate, leaveTypeLabels } from "@/data/labels";
import { useStore } from "@/data/store";

export const Route = createFileRoute("/collaborateurs/$id")({
  head: () => ({
    meta: [
      { title: "Fiche collaborateur — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Fiche collaborateur DEMO : statut, documents, congés, données confidentielles masquées et historique d'audit.",
      },
      { property: "og:title", content: "Fiche collaborateur — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Dossier individuel avec masquage des données sensibles.",
      },
    ],
  }),
  component: EmployeeDetail,
});

function EmployeeDetail() {
  const { id } = Route.useParams();
  const { employees, documents, leaves, auditLogs, propose } = useStore();
  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <EmptyState
        title="Collaborateur introuvable"
        description="Ce dossier n'existe pas dans le jeu de données DEMO."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/collaborateurs">Retour à la liste</Link>
          </Button>
        }
      />
    );
  }

  const empDocs = documents.filter((d) => d.employeeId === employee.id);
  const empLeaves = leaves.filter((l) => l.employeeId === employee.id);
  const history = auditLogs.filter((log) => log.target.includes(employee.id));

  return (
    <div className="space-y-5">
      <PageHeader
        title={employee.fullName}
        description={`${employee.position} · ${employee.department} · ${employee.contractType} depuis le ${formatDate(employee.hiredAt)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/collaborateurs">Retour</Link>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                propose({
                  kind: "document_brouillon",
                  title: `Attestation d'emploi — ${employee.fullName}`,
                  analysis:
                    "Génération d'un brouillon d'attestation à partir des données du dossier. Aucun document n'est validé ni envoyé automatiquement.",
                  preview: `ATTESTATION D'EMPLOI (BROUILLON)\nNous attestons que ${employee.fullName} occupe le poste de ${employee.position} depuis le ${formatDate(employee.hiredAt)}.\nFait à Antananarivo, le [date].`,
                  target: `Collaborateur ${employee.id}`,
                  effect: {
                    type: "generate_document",
                    document: {
                      id: `gen-${employee.id}-${Date.now()}`,
                      employeeId: employee.id,
                      kind: "attestation",
                      title: `Attestation d'emploi — ${employee.fullName}`,
                      status: "brouillon",
                      createdAt: new Date().toISOString(),
                      body: `ATTESTATION D'EMPLOI (BROUILLON)\n${employee.fullName} · ${employee.position}`,
                    },
                  },
                });
                toast.info("Proposition créée : à prévisualiser puis confirmer.");
              }}
            >
              Proposer une attestation
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel space-y-2 p-4 text-sm">
          <h2 className="text-base font-semibold">Statut administratif</h2>
          <p>
            Statut : <Badge variant="outline">{employeeStatusLabels[employee.status]}</Badge>
          </p>
          <p className="text-muted-foreground">Courriel : {employee.email}</p>
          <p className="text-muted-foreground">Téléphone : {employee.phone}</p>
          <p className="text-muted-foreground">CNaPS : {employee.cnaps}</p>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <h2 className="text-base font-semibold">Données confidentielles</h2>
          <p className="text-xs text-muted-foreground">
            Séparées par nature (salariale, médicale, disciplinaire) et masquées par défaut.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <SensitiveField
              label="Rémunération"
              value={employee.confidential.grossSalary}
              auditTarget={`${employee.id} · rémunération`}
            />
            <SensitiveField
              label="Notes médicales"
              value={employee.confidential.medicalNotes}
              auditTarget={`${employee.id} · notes médicales`}
            />
            <SensitiveField
              label="Disciplinaire"
              value={employee.confidential.disciplinary}
              auditTarget={`${employee.id} · disciplinaire`}
            />
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Documents</h2>
          {empDocs.length === 0 ? (
            <EmptyState title="Aucun document" description="Ce dossier DEMO ne contient encore aucune pièce." />
          ) : (
            <div className="panel divide-y divide-border">
              {empDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <p>{doc.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {documentKindLabels[doc.kind]} · maj {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                  <Badge
                    variant={doc.status === "present" ? "outline" : "destructive"}
                    className="text-[11px]"
                  >
                    {doc.status === "present" ? "Présent" : doc.status === "expire" ? "Expiré" : "Manquant"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-semibold">Congés & absences</h2>
          {empLeaves.length === 0 ? (
            <EmptyState title="Aucune absence" description="Aucun congé ni absence enregistré." />
          ) : (
            <div className="panel divide-y divide-border">
              {empLeaves.map((leave) => (
                <div key={leave.id} className="p-3 text-sm">
                  <p>{leaveTypeLabels[leave.type]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(leave.startDate)} → {formatDate(leave.endDate)} · {leave.days} j ·{" "}
                    {leave.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Historique</h2>
        {history.length === 0 ? (
          <EmptyState
            title="Aucun évènement"
            description="Les consultations de données sensibles et les actions confirmées apparaîtront ici."
          />
        ) : (
          <div className="panel divide-y divide-border">
            {history.map((log) => (
              <div key={log.id} className="p-3 text-xs">
                <p className="font-medium">{log.action}</p>
                <p className="text-muted-foreground">
                  {log.target} · {log.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
