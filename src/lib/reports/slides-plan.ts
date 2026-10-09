/**
 * Plan local d'une présentation de rapport — fonction pure, aucun appel réseau.
 * Utilise uniquement les indicateurs enregistrés ; aucun détail nominatif.
 * La création réelle dans Google Slides reste désactivée sans autorisation vérifiée.
 */
export type SlidesTemplate = "rh" | "manager" | "direction";

export interface PlanMetric {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  previous_value: number | null;
}

export interface ChartPlan {
  title: string;
  kind: "barres_comparaison";
  series: { label: string; current: number; previous: number }[];
}

export interface SlidePlan {
  title: string;
  bullets: string[];
  chart: ChartPlan | null;
  /** Indicateurs écartés faute de données. */
  insufficient: string[];
}

export interface SlidesPlan {
  template: SlidesTemplate;
  title: string;
  subtitle: string;
  slides: SlidePlan[];
  exportEnabled: boolean;
  exportBlockedReason: string | null;
}

const TEMPLATE_KEYS: Record<SlidesTemplate, string[][]> = {
  direction: [["effectif_actif", "nouvelles_recrues", "departs", "turnover"], ["absenteisme", "completude_documentaire"]],
  manager: [["effectif_actif", "absences_jours", "conges_en_attente"], ["taches_realisees", "taches_en_retard"]],
  rh: [
    ["effectif_actif", "nouvelles_recrues", "departs", "turnover"],
    ["conges_jours", "absences_jours", "absenteisme", "conges_en_attente"],
    ["documents_manquants", "completude_documentaire", "documents_expires", "contrats_a_echeance"],
    ["taches_realisees", "taches_en_retard", "validations_en_attente", "delai_validation"],
  ],
};

const TITLES: Record<SlidesTemplate, string> = {
  rh: "Rapport RH (détaillé)",
  manager: "Rapport Manager (équipe)",
  direction: "Rapport Direction (synthétique)",
};

function fmt(m: PlanMetric): string {
  if (m.value === null) return `${m.label} : Donnée insuffisante`;
  const unit = m.unit === "pourcentage" ? " %" : m.unit === "jours" ? " j" : m.unit === "heures" ? " h" : "";
  return `${m.label} : ${m.value}${unit}`;
}

export function buildSlidesPlan(input: {
  template: SlidesTemplate;
  periodLabel: string;
  author: string;
  metrics: PlanMetric[];
  alerts?: string[];
  slidesAuthorized: boolean;
}): SlidesPlan {
  const byKey = new Map(input.metrics.map((m) => [m.key, m]));
  const slides: SlidePlan[] = TEMPLATE_KEYS[input.template].map((keys, i) => {
    const found = keys.flatMap((k) => (byKey.get(k) ? [byKey.get(k)!] : []));
    const chartable = found.filter((m) => m.value !== null && m.previous_value !== null);
    const insufficient = found.filter((m) => m.value === null || m.previous_value === null).map((m) => m.label);
    return {
      title: `Indicateurs ${i + 1}`,
      bullets: found.map(fmt),
      chart:
        chartable.length > 0
          ? {
              title: "Période courante vs précédente",
              kind: "barres_comparaison",
              series: chartable.map((m) => ({
                label: m.label,
                current: m.value as number,
                previous: m.previous_value as number,
              })),
            }
          : null,
      insufficient,
    };
  });
  if (input.alerts && input.alerts.length > 0) {
    slides.push({ title: "Alertes", bullets: input.alerts.slice(0, 6), chart: null, insufficient: [] });
  }
  return {
    template: input.template,
    title: `${TITLES[input.template]} — ${input.periodLabel}`,
    subtitle: `Auteur : ${input.author}`,
    slides,
    exportEnabled: input.slidesAuthorized,
    exportBlockedReason: input.slidesAuthorized ? null : "Autorisation requise",
  };
}
