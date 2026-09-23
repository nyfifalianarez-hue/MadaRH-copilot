/**
 * Moteur de calcul des indicateurs RH — fonctions pures.
 *
 * Règles absolues :
 * - aucune valeur n'est inventée : chaque indicateur est calculé depuis les
 *   lignes réellement présentes en base (passées en entrée) ;
 * - un indicateur dont la donnée source n'existe pas est déclaré
 *   « indisponible » et n'affiche jamais de valeur ;
 * - aucun pourcentage n'est produit lorsque le dénominateur est nul ;
 * - aucune causalité n'est déduite : seuls des écarts chiffrés sont exposés.
 */
import {
  businessDays,
  daysInclusive,
  overlapDays,
  overlaps,
  withinPeriod,
  type Period,
} from "./periods";

export type MetricUnit = "nombre" | "pourcentage" | "jours" | "heures";
export type MetricReliability = "calculee" | "partielle" | "indisponible";

export interface Metric {
  key: string;
  label: string;
  definition: string;
  unit: MetricUnit;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  formula: string;
  source: string;
  reliability: MetricReliability;
  previousValue: number | null;
  /** Texte de comparaison, toujours explicite en cas de données insuffisantes. */
  comparisonNote: string;
  /** Écart absolu par rapport à la période précédente, si calculable. */
  delta: number | null;
  /** Variation relative en %, seulement si la référence est non nulle. */
  deltaPercent: number | null;
  detail: string[];
}

export interface EmployeeRow {
  id: string;
  status: string;
  hired_on: string | null;
  contract_end_on: string | null;
  contract_type: string | null;
  archived_at: string | null;
  department: string | null;
  site: string | null;
  manager_id: string | null;
  full_name: string;
  matricule: string;
  is_demo: boolean;
}

export interface LeaveRow {
  id: string;
  employee_id: string;
  type: string;
  start_on: string;
  end_on: string;
  status: string;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  employee_id: string | null;
  kind: string;
  label: string;
  is_missing: boolean;
  expires_on: string | null;
}

export interface TaskRow {
  id: string;
  title: string;
  done: boolean;
  due_on: string | null;
  updated_at: string;
  created_at: string;
}

export interface ProposalRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  decided_at: string | null;
}

export interface ReportDataset {
  employees: EmployeeRow[];
  leaves: LeaveRow[];
  documents: DocumentRow[];
  tasks: TaskRow[];
  proposals: ProposalRow[];
}

export interface ReportFilters {
  department?: string | null;
  site?: string | null;
  managerId?: string | null;
  contractType?: string | null;
}

const ABSENCE_TYPES = ["maladie", "accident_travail", "absence_autorisee", "absence_non_autorisee"];

export function filterEmployees(employees: EmployeeRow[], filters: ReportFilters): EmployeeRow[] {
  return employees.filter((e) => {
    if (filters.department && e.department !== filters.department) return false;
    if (filters.site && e.site !== filters.site) return false;
    if (filters.managerId && e.manager_id !== filters.managerId) return false;
    if (filters.contractType && e.contract_type !== filters.contractType) return false;
    return true;
  });
}

/** Restreint le jeu de données au périmètre des salariés retenus par les filtres. */
export function scopeDataset(dataset: ReportDataset, filters: ReportFilters): ReportDataset {
  const employees = filterEmployees(dataset.employees, filters);
  const ids = new Set(employees.map((e) => e.id));
  const scoped = Object.values(filters).some((v) => v);
  return {
    employees,
    leaves: scoped ? dataset.leaves.filter((l) => ids.has(l.employee_id)) : dataset.leaves,
    documents: scoped
      ? dataset.documents.filter((d) => d.employee_id && ids.has(d.employee_id))
      : dataset.documents,
    // Les tâches et validations ne portent pas de rattachement salarié en base :
    // elles restent au périmètre de l'organisation et sont signalées comme telles.
    tasks: dataset.tasks,
    proposals: dataset.proposals,
  };
}

interface RawMetric {
  key: string;
  label: string;
  definition: string;
  unit: MetricUnit;
  formula: string;
  source: string;
  numerator: number | null;
  denominator: number | null;
  value: number | null;
  reliability?: MetricReliability;
  detail?: string[];
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return round((numerator / denominator) * 100);
}

function computeRaw(dataset: ReportDataset, period: Period): RawMetric[] {
  const { employees, leaves, documents, tasks, proposals } = dataset;

  const active = employees.filter((e) => e.status === "actif" && !e.archived_at);
  const hires = employees.filter((e) => withinPeriod(e.hired_on, period));
  const exits = employees.filter((e) => withinPeriod(e.archived_at?.slice(0, 10) ?? null, period));
  const onboarding = employees.filter((e) => e.status === "en_onboarding" && !e.archived_at);

  const contractsEnding = employees.filter(
    (e) => !e.archived_at && e.contract_end_on && e.contract_end_on >= period.start && e.contract_end_on <= period.end,
  );

  const leavesInPeriod = leaves.filter((l) => overlaps(l.start_on, l.end_on, period.start, period.end));
  const approvedLeaveDays = leavesInPeriod
    .filter((l) => l.status === "valide" && l.type === "conge_annuel")
    .reduce((sum, l) => sum + overlapDays(l.start_on, l.end_on, period.start, period.end), 0);
  const absenceDays = leavesInPeriod
    .filter((l) => l.status === "valide" && ABSENCE_TYPES.includes(l.type))
    .reduce((sum, l) => sum + overlapDays(l.start_on, l.end_on, period.start, period.end), 0);
  const pendingLeaves = leavesInPeriod.filter((l) => l.status === "en_attente");

  const openDays = businessDays(period.start, period.end);
  const theoreticalDays = active.length * openDays;

  const missingDocuments = documents.filter((d) => d.is_missing);
  const expiredDocuments = documents.filter((d) => d.expires_on && d.expires_on <= period.end);
  const presentDocuments = documents.length - missingDocuments.length;

  const tasksDone = tasks.filter((t) => t.done && withinPeriod(t.updated_at.slice(0, 10), period));
  const tasksOverdue = tasks.filter((t) => !t.done && t.due_on && t.due_on < period.end);
  const pendingValidations = proposals.filter((p) => p.status === "en_attente");
  const decided = proposals.filter((p) => p.decided_at && withinPeriod(p.decided_at.slice(0, 10), period));
  const decisionHours = decided.reduce(
    (sum, p) => sum + (new Date(p.decided_at as string).getTime() - new Date(p.created_at).getTime()) / 3_600_000,
    0,
  );

  return [
    {
      key: "effectif_actif",
      label: "Effectif actif",
      definition: "Salariés au statut « actif » et non archivés à la date de calcul.",
      unit: "nombre",
      formula: "Nombre de salariés (statut = actif ET non archivé)",
      source: "Table employees",
      numerator: active.length,
      denominator: null,
      value: active.length,
      detail: active.slice(0, 10).map((e) => `${e.matricule} · ${e.full_name}`),
    },
    {
      key: "nouvelles_recrues",
      label: "Nouvelles recrues",
      definition: "Salariés dont la date d'embauche est comprise dans la période.",
      unit: "nombre",
      formula: "Nombre de salariés (date d'embauche dans la période)",
      source: "Table employees, champ hired_on",
      numerator: hires.length,
      denominator: null,
      value: hires.length,
      detail: hires.map((e) => `${e.matricule} · ${e.full_name} — ${e.hired_on}`),
    },
    {
      key: "departs",
      label: "Départs",
      definition: "Salariés archivés (sortie enregistrée) pendant la période.",
      unit: "nombre",
      formula: "Nombre de salariés (date d'archivage dans la période)",
      source: "Table employees, champ archived_at",
      numerator: exits.length,
      denominator: null,
      value: exits.length,
      detail: exits.map((e) => `${e.matricule} · ${e.full_name}`),
    },
    {
      key: "turnover",
      label: "Taux de rotation",
      definition: "Départs de la période rapportés à l'effectif actif.",
      unit: "pourcentage",
      formula: "Départs ÷ effectif actif × 100",
      source: "Table employees",
      numerator: exits.length,
      denominator: active.length,
      value: ratio(exits.length, active.length),
    },
    {
      key: "onboarding_en_cours",
      label: "Onboarding en cours",
      definition: "Salariés au statut « en onboarding » non archivés.",
      unit: "nombre",
      formula: "Nombre de salariés (statut = en_onboarding)",
      source: "Table employees, champ status",
      numerator: onboarding.length,
      denominator: null,
      value: onboarding.length,
      detail: onboarding.map((e) => `${e.matricule} · ${e.full_name}`),
    },
    {
      key: "contrats_a_echeance",
      label: "Contrats à échéance",
      definition: "Contrats dont la date de fin tombe dans la période.",
      unit: "nombre",
      formula: "Nombre de salariés (date de fin de contrat dans la période)",
      source: "Table employees, champ contract_end_on",
      numerator: contractsEnding.length,
      denominator: null,
      value: contractsEnding.length,
      detail: contractsEnding.map((e) => `${e.matricule} · ${e.full_name} — fin ${e.contract_end_on}`),
    },
    {
      key: "conges_jours",
      label: "Jours de congé annuel validés",
      definition: "Jours calendaires de congé annuel validé tombant dans la période.",
      unit: "jours",
      formula: "Somme des jours de chevauchement (congé annuel validé × période)",
      source: "Table leave_absences",
      numerator: approvedLeaveDays,
      denominator: null,
      value: approvedLeaveDays,
    },
    {
      key: "absences_jours",
      label: "Jours d'absence validés",
      definition:
        "Jours d'absence validée (maladie, accident du travail, absence autorisée ou non autorisée) dans la période.",
      unit: "jours",
      formula: "Somme des jours de chevauchement (absence validée × période)",
      source: "Table leave_absences",
      numerator: absenceDays,
      denominator: null,
      value: absenceDays,
    },
    {
      key: "absenteisme",
      label: "Taux d'absentéisme",
      definition:
        "Jours d'absence validés rapportés aux jours ouvrés théoriques de l'effectif actif. Les jours fériés ne sont pas connus en base et ne sont donc pas déduits.",
      unit: "pourcentage",
      formula: `Jours d'absence ÷ (effectif actif × ${openDays} jours ouvrés) × 100`,
      source: "Tables leave_absences et employees",
      numerator: absenceDays,
      denominator: theoreticalDays,
      value: ratio(absenceDays, theoreticalDays),
      reliability: "partielle",
    },
    {
      key: "conges_en_attente",
      label: "Congés et absences en attente",
      definition: "Demandes recouvrant la période et encore en attente de décision.",
      unit: "nombre",
      formula: "Nombre de demandes (statut = en_attente ET chevauchant la période)",
      source: "Table leave_absences",
      numerator: pendingLeaves.length,
      denominator: null,
      value: pendingLeaves.length,
    },
    {
      key: "documents_manquants",
      label: "Documents manquants",
      definition: "Documents attendus et signalés comme manquants dans les dossiers du périmètre.",
      unit: "nombre",
      formula: "Nombre de documents (is_missing = vrai)",
      source: "Table employee_documents",
      numerator: missingDocuments.length,
      denominator: null,
      value: missingDocuments.length,
      detail: missingDocuments.slice(0, 15).map((d) => d.label),
    },
    {
      key: "completude_documentaire",
      label: "Complétude documentaire",
      definition: "Part des documents attendus effectivement présents dans les dossiers.",
      unit: "pourcentage",
      formula: "Documents présents ÷ documents attendus × 100",
      source: "Table employee_documents",
      numerator: presentDocuments,
      denominator: documents.length,
      value: ratio(presentDocuments, documents.length),
    },
    {
      key: "documents_expires",
      label: "Documents expirés",
      definition: "Documents dont la date d'expiration est atteinte à la fin de la période.",
      unit: "nombre",
      formula: "Nombre de documents (date d'expiration ≤ fin de période)",
      source: "Table employee_documents, champ expires_on",
      numerator: expiredDocuments.length,
      denominator: null,
      value: expiredDocuments.length,
      detail: expiredDocuments.slice(0, 15).map((d) => `${d.label} — ${d.expires_on}`),
    },
    {
      key: "taches_realisees",
      label: "Tâches réalisées",
      definition: "Tâches RH marquées comme faites dont la dernière mise à jour tombe dans la période.",
      unit: "nombre",
      formula: "Nombre de tâches (done = vrai ET mise à jour dans la période)",
      source: "Table tasks",
      numerator: tasksDone.length,
      denominator: null,
      value: tasksDone.length,
      detail: tasksDone.slice(0, 15).map((t) => t.title),
    },
    {
      key: "taches_en_retard",
      label: "Tâches en retard",
      definition: "Tâches non faites dont l'échéance est dépassée à la fin de la période.",
      unit: "nombre",
      formula: "Nombre de tâches (done = faux ET échéance < fin de période)",
      source: "Table tasks",
      numerator: tasksOverdue.length,
      denominator: null,
      value: tasksOverdue.length,
      detail: tasksOverdue.slice(0, 15).map((t) => `${t.title} — échéance ${t.due_on}`),
    },
    {
      key: "validations_en_attente",
      label: "Validations en attente",
      definition: "Propositions d'action encore en attente de confirmation explicite.",
      unit: "nombre",
      formula: "Nombre de propositions (statut = en_attente)",
      source: "Table action_proposals",
      numerator: pendingValidations.length,
      denominator: null,
      value: pendingValidations.length,
      detail: pendingValidations.slice(0, 15).map((p) => p.title),
    },
    {
      key: "delai_validation",
      label: "Délai moyen de validation",
      definition: "Durée moyenne entre la création d'une proposition et sa décision, sur les décisions de la période.",
      unit: "heures",
      formula: "Somme des durées de décision ÷ nombre de décisions",
      source: "Table action_proposals",
      numerator: round(decisionHours),
      denominator: decided.length,
      value: decided.length > 0 ? round(decisionHours / decided.length) : null,
    },
  ];
}

/** Indicateurs demandés mais dont la donnée source n'existe pas encore en base. */
export const unavailableMetrics: { label: string; reason: string }[] = [
  {
    label: "Recrutements en cours et taux de conversion",
    reason: "Aucune table de demandes de recrutement ni de candidatures n'existe en base : l'indicateur n'est pas calculable.",
  },
  {
    label: "Complétion de l'onboarding (par étape)",
    reason: "Aucune table de check-list d'onboarding n'existe en base : seul le nombre de salariés en onboarding est calculable.",
  },
  {
    label: "Taux de présence pointée",
    reason: "Aucune table de pointage (présences) n'existe en base.",
  },
  {
    label: "Conformité RH réglementaire",
    reason:
      "La bibliothèque juridique ne contient que des règles au statut « à vérifier » : aucun score de conformité n'est produit.",
  },
];

function compare(current: RawMetric, previous: RawMetric | undefined): Pick<
  Metric,
  "previousValue" | "comparisonNote" | "delta" | "deltaPercent"
> {
  const previousValue = previous?.value ?? null;

  if (current.value === null) {
    return {
      previousValue,
      comparisonNote: "Valeur non calculable sur cette période : comparaison impossible.",
      delta: null,
      deltaPercent: null,
    };
  }
  if (previousValue === null) {
    return {
      previousValue: null,
      comparisonNote: "Données insuffisantes pour la comparaison.",
      delta: null,
      deltaPercent: null,
    };
  }

  const delta = round(current.value - previousValue);
  if (previousValue === 0) {
    return {
      previousValue,
      comparisonNote:
        "Comparaison en pourcentage non calculable : valeur de référence égale à zéro. Écart absolu : " +
        `${delta > 0 ? "+" : ""}${delta}.`,
      delta,
      deltaPercent: null,
    };
  }

  const deltaPercent = round((delta / Math.abs(previousValue)) * 100);
  return {
    previousValue,
    comparisonNote: `Écart de ${delta > 0 ? "+" : ""}${delta} par rapport à la période précédente (${
      deltaPercent > 0 ? "+" : ""
    }${deltaPercent} %). Aucune cause n'est déduite de cet écart.`,
    delta,
    deltaPercent,
  };
}

export interface ComputedReport {
  metrics: Metric[];
  period: Period;
  previousPeriod: Period;
  openDays: number;
  calendarDays: number;
  /** Vrai si au moins une ligne du périmètre est marquée comme donnée de démonstration. */
  isDemo: boolean;
  /** Vrai si aucune donnée n'existe dans le périmètre : l'interface doit le dire explicitement. */
  isEmpty: boolean;
  sources: string[];
  alerts: { level: "critique" | "attention"; label: string; detail: string }[];
  filters: ReportFilters;
}

export function computeReport(
  dataset: ReportDataset,
  period: Period,
  previousPeriod: Period,
  filters: ReportFilters = {},
): ComputedReport {
  const scoped = scopeDataset(dataset, filters);
  const currentRaw = computeRaw(scoped, period);
  const previousRaw = computeRaw(scoped, previousPeriod);
  const previousByKey = new Map(previousRaw.map((m) => [m.key, m]));

  const metrics: Metric[] = currentRaw.map((raw) => ({
    key: raw.key,
    label: raw.label,
    definition: raw.definition,
    unit: raw.unit,
    value: raw.value,
    numerator: raw.numerator,
    denominator: raw.denominator,
    formula: raw.formula,
    source: raw.source,
    reliability: raw.value === null ? "indisponible" : (raw.reliability ?? "calculee"),
    detail: raw.detail ?? [],
    ...compare(raw, previousByKey.get(raw.key)),
  }));

  const get = (key: string) => metrics.find((m) => m.key === key)?.value ?? 0;

  const alerts: ComputedReport["alerts"] = [];
  if (get("documents_manquants") > 0)
    alerts.push({
      level: "critique",
      label: `${get("documents_manquants")} document(s) manquant(s)`,
      detail: "Dossiers incomplets dans le périmètre sélectionné.",
    });
  if (get("documents_expires") > 0)
    alerts.push({
      level: "critique",
      label: `${get("documents_expires")} document(s) expiré(s)`,
      detail: "Date d'expiration atteinte à la fin de la période.",
    });
  if (get("contrats_a_echeance") > 0)
    alerts.push({
      level: "attention",
      label: `${get("contrats_a_echeance")} contrat(s) à échéance`,
      detail: "Fin de contrat dans la période analysée.",
    });
  if (get("conges_en_attente") > 0)
    alerts.push({
      level: "attention",
      label: `${get("conges_en_attente")} demande(s) de congé en attente`,
      detail: "Décision non prise sur la période.",
    });
  if (get("taches_en_retard") > 0)
    alerts.push({
      level: "attention",
      label: `${get("taches_en_retard")} tâche(s) en retard`,
      detail: "Échéance dépassée à la fin de la période.",
    });
  if (get("validations_en_attente") > 0)
    alerts.push({
      level: "attention",
      label: `${get("validations_en_attente")} validation(s) en attente`,
      detail: "Propositions non confirmées.",
    });

  const isEmpty =
    scoped.employees.length === 0 &&
    scoped.leaves.length === 0 &&
    scoped.documents.length === 0 &&
    scoped.tasks.length === 0;

  return {
    metrics,
    period,
    previousPeriod,
    openDays: businessDays(period.start, period.end),
    calendarDays: daysInclusive(period.start, period.end),
    isDemo: scoped.employees.some((e) => e.is_demo),
    isEmpty,
    sources: [
      "employees",
      "employee_documents",
      "leave_absences",
      "tasks",
      "action_proposals",
    ],
    alerts,
    filters,
  };
}

export function formatMetricValue(metric: Metric): string {
  if (metric.value === null) {
    return metric.denominator === 0
      ? "Non calculable (dénominateur nul)"
      : "Donnée insuffisante";
  }
  switch (metric.unit) {
    case "pourcentage":
      return `${metric.value} %`;
    case "jours":
      return `${metric.value} j`;
    case "heures":
      return `${metric.value} h`;
    default:
      return String(metric.value);
  }
}
