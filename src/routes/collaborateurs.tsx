import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employeeStatusLabels, formatDate } from "@/data/labels";
import { useStore } from "@/data/store";

export const Route = createFileRoute("/collaborateurs")({
  head: () => ({
    meta: [
      { title: "Collaborateurs — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Fiches collaborateurs DEMO : statut administratif, documents, données confidentielles masquées et historique.",
      },
      { property: "og:title", content: "Collaborateurs — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Dossiers du personnel avec masquage des données sensibles et traçabilité.",
      },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { employees, documents } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("tous");

  const filtered = employees.filter((employee) => {
    const matchesQuery = `${employee.fullName} ${employee.position} ${employee.department}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesStatus = status === "tous" || employee.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Collaborateurs"
        description="Dossiers DEMO du personnel. Les données salariales, médicales et disciplinaires sont masquées par défaut et toute révélation est journalisée."
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un collaborateur, un poste, un service…"
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1">
          {["tous", "actif", "en_onboarding", "suspendu", "sorti"].map((value) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? "default" : "outline"}
              onClick={() => setStatus(value)}
              className="text-xs"
            >
              {value === "tous"
                ? "Tous"
                : employeeStatusLabels[value as keyof typeof employeeStatusLabels]}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun collaborateur ne correspond"
          description="Modifiez la recherche ou le filtre de statut."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((employee) => {
            const missing = documents.filter(
              (d) => d.employeeId === employee.id && d.status !== "present",
            ).length;
            return (
              <div key={employee.id} className="panel flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {employee.position} · {employee.department}
                    </p>
                  </div>
                  <Badge variant="outline">{employeeStatusLabels[employee.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {employee.contractType} · embauche {formatDate(employee.hiredAt)}
                </p>
                {missing > 0 && (
                  <p className="text-xs text-destructive">
                    {missing} document(s) manquant(s) ou expiré(s)
                  </p>
                )}
                <Button asChild variant="outline" size="sm" className="mt-auto">
                  <Link to="/collaborateurs/$id" params={{ id: employee.id }}>
                    Ouvrir la fiche
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
