import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/data/store";

export const Route = createFileRoute("/recrutement")({
  head: () => ({
    meta: [
      { title: "Recrutement & onboarding — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Suivi des candidatures DEMO et checklists d'onboarding : documents à collecter et étapes administratives.",
      },
      { property: "og:title", content: "Recrutement & onboarding — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Checklists de recrutement et d'intégration des nouveaux collaborateurs.",
      },
    ],
  }),
  component: RecruitmentPage,
});

const stageLabels = {
  candidature: "Candidature",
  entretien: "Entretien",
  offre: "Offre",
  onboarding: "Onboarding",
} as const;

function RecruitmentPage() {
  const { candidates } = useStore();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Recrutement & onboarding"
        description="Checklists DEMO par candidat. Les étapes ne sont jamais cochées automatiquement à la place d'un collègue."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {candidates.map((candidate) => {
          const done = candidate.checklist.filter((item) => item.done).length;
          const pct = Math.round((done / candidate.checklist.length) * 100);
          return (
            <div key={candidate.id} className="panel space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{candidate.fullName}</p>
                  <p className="text-xs text-muted-foreground">{candidate.position}</p>
                </div>
                <Badge variant="outline">{stageLabels[candidate.stage]}</Badge>
              </div>
              <div>
                <Progress value={pct} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {done}/{candidate.checklist.length} étapes complétées
                </p>
              </div>
              <ul className="space-y-1 text-sm">
                {candidate.checklist.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${item.done ? "bg-success" : "bg-warning"}`}
                      aria-hidden
                    />
                    <span className={item.done ? "text-muted-foreground line-through" : ""}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
