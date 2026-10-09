import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import type { ComputedReport } from "@/lib/reports/kpi";
import { buildSlidesPlan, type SlidesTemplate } from "@/lib/reports/slides-plan";

export function SlidesPreview({ report, template }: { report: ComputedReport; template: SlidesTemplate }) {
  const plan = buildSlidesPlan({
    template,
    periodLabel: report.period.label,
    author: "Utilisateur connecté",
    metrics: report.metrics.map((m) => ({
      key: m.key,
      label: m.label,
      unit: m.unit,
      value: m.value,
      previous_value: m.previousValue,
    })),
    alerts: report.alerts.map((a) => a.label),
    // Aucune connexion Google Slides vérifiée n'existe : l'export reste bloqué.
    slidesAuthorized: false,
  });
  return (
    <div className="panel space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">Aperçu local de la présentation</p>
          <p className="text-xs text-muted-foreground">{plan.title}</p>
        </div>
        <Button disabled>Créer dans Google Slides — {plan.exportBlockedReason}</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Aperçu calculé localement, sans aucun envoi. Seuls des indicateurs agrégés seraient
        transmis ; aucun nom, matricule ni donnée médicale, disciplinaire ou salariale. Aucun lien
        n'est produit tant qu'une autorisation Google réelle n'a pas réussi.
      </p>
      <ol className="grid gap-3 md:grid-cols-2">
        {plan.slides.map((s, i) => (
          <li key={i} className="rounded-md border border-border p-3">
            <p className="text-xs font-semibold">
              Diapositive {i + 1} · {s.title}
            </p>
            <ul className="mt-1 list-disc pl-4 text-xs">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {s.chart ? (
              <div className="mt-2 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.chart.series}>
                    <XAxis dataKey="label" hide />
                    <YAxis width={30} />
                    <Tooltip />
                    <Bar dataKey="previous" name="Précédente" fill="var(--muted-foreground)" />
                    <Bar dataKey="current" name="Courante" fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Aucun graphique : données insuffisantes pour la comparaison.
              </p>
            )}
            {s.chart && s.insufficient.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Hors graphique (données insuffisantes) : {s.insufficient.join(", ")}.
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
