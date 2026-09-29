import { describe, expect, it } from "vitest";

import {
  computeReport,
  filterEmployees,
  formatMetricValue,
  scopeDataset,
  type EmployeeRow,
  type ReportDataset,
} from "./kpi";
import { resolvePeriod } from "./periods";

const WEEK = resolvePeriod("semaine_courante", "2026-09-23");

function employee(partial: Partial<EmployeeRow> & Pick<EmployeeRow, "id">): EmployeeRow {
  return {
    status: "actif",
    hired_on: null,
    contract_end_on: null,
    contract_type: "CDI",
    archived_at: null,
    department: "Production",
    site: "Antananarivo",
    manager_id: null,
    full_name: `Salarié ${partial.id}`,
    matricule: `MAT-${partial.id}`,
    is_demo: false,
    ...partial,
  };
}

const emptyDataset: ReportDataset = {
  employees: [],
  leaves: [],
  documents: [],
  tasks: [],
  proposals: [],
};

describe("computeReport — base vide et périmètre vide", () => {
  it("déclare le rapport vide sans inventer de valeur", () => {
    const report = computeReport(emptyDataset, WEEK.current, WEEK.previous);
    expect(report.isEmpty).toBe(true);
    expect(report.isDemo).toBe(false);
    for (const metric of report.metrics) {
      expect(metric.source).toBeTruthy();
      expect(metric.formula).toBeTruthy();
    }
    expect(report.metrics.find((m) => m.key === "effectif_actif")?.value).toBe(0);
  });

  it("ne produit jamais de pourcentage quand le dénominateur est nul", () => {
    const report = computeReport(emptyDataset, WEEK.current, WEEK.previous);
    const turnover = report.metrics.find((m) => m.key === "turnover");
    expect(turnover?.value).toBeNull();
    expect(turnover?.denominator).toBe(0);

    const absenteisme = report.metrics.find((m) => m.key === "absenteisme");
    expect(absenteisme?.value).toBeNull();
    expect(absenteisme?.denominator).toBe(0);

    const completude = report.metrics.find((m) => m.key === "completude_documentaire");
    expect(completude?.value).toBeNull();
    expect(completude?.denominator).toBe(0);
  });

  it("affiche « Non calculable (dénominateur nul) » plutôt qu'un faux 0 %", () => {
    const report = computeReport(emptyDataset, WEEK.current, WEEK.previous);
    const turnover = report.metrics.find((m) => m.key === "turnover");
    expect(formatMetricValue(turnover!)).toBe("Non calculable (dénominateur nul)");
  });

  it("gère les données insuffisantes pour la comparaison", () => {
    const report = computeReport(emptyDataset, WEEK.current, WEEK.previous);
    const delai = report.metrics.find((m) => m.key === "delai_validation");
    expect(delai?.value).toBeNull();
    expect(delai?.comparisonNote).toContain("non calculable");
  });

  it("comparaison à zéro : écart absolu sans pourcentage trompeur", () => {
    const dataset: ReportDataset = {
      ...emptyDataset,
      employees: [employee({ id: "1", hired_on: "2026-09-22" })],
    };
    const report = computeReport(dataset, WEEK.current, WEEK.previous);
    const recrues = report.metrics.find((m) => m.key === "nouvelles_recrues");
    expect(recrues?.value).toBe(1);
    expect(recrues?.previousValue).toBe(0);
    expect(recrues?.deltaPercent).toBeNull();
    expect(recrues?.comparisonNote).toContain("valeur de référence égale à zéro");
  });

  it("comparaison normale : écart chiffré, aucune causalité déduite", () => {
    const dataset: ReportDataset = {
      ...emptyDataset,
      tasks: [
        {
          id: "t1",
          title: "Vérification dossier",
          done: true,
          due_on: "2026-09-16",
          updated_at: "2026-09-16T10:00:00Z",
          created_at: "2026-09-15T10:00:00Z",
        },
      ],
    };
    const previous = resolvePeriod("semaine_precedente", "2026-09-23");
    const report = computeReport(dataset, previous.current, previous.previous);
    const taches = report.metrics.find((m) => m.key === "taches_realisees");
    expect(taches?.value).toBe(1);
    expect(taches?.previousValue).toBe(0);
    expect(taches?.delta).toBe(1);
  });
});

describe("computeReport — calculs réels sur un jeu de démonstration", () => {
  const dataset: ReportDataset = {
    employees: [
      employee({ id: "1", hired_on: "2026-09-21" }),
      employee({ id: "2", status: "en_onboarding" }),
      employee({ id: "3", archived_at: "2026-09-22T08:00:00Z" }),
      employee({ id: "4", contract_end_on: "2026-09-25" }),
    ],
    leaves: [
      {
        id: "l1",
        employee_id: "1",
        type: "conge_annuel",
        start_on: "2026-09-22",
        end_on: "2026-09-24",
        status: "valide",
        created_at: "2026-09-20T10:00:00Z",
      },
      {
        id: "l2",
        employee_id: "2",
        type: "maladie",
        start_on: "2026-09-23",
        end_on: "2026-09-23",
        status: "valide",
        created_at: "2026-09-21T10:00:00Z",
      },
      {
        id: "l3",
        employee_id: "3",
        type: "absence_non_autorisee",
        start_on: "2026-09-22",
        end_on: "2026-09-22",
        status: "en_attente",
        created_at: "2026-09-21T10:00:00Z",
      },
    ],
    documents: [
      { id: "d1", employee_id: "1", kind: "contrat", label: "Contrat signé", is_missing: false, expires_on: null },
      { id: "d2", employee_id: "2", kind: "avis", label: "Certificat médical", is_missing: true, expires_on: "2026-09-20" },
    ],
    tasks: [
      {
        id: "t1",
        title: "Entretien d'accueil",
        done: true,
        due_on: "2026-09-22",
        updated_at: "2026-09-22T10:00:00Z",
        created_at: "2026-09-20T10:00:00Z",
      },
      {
        id: "t2",
        title: "Renouveler contrat",
        done: false,
        due_on: "2026-09-21",
        updated_at: "2026-09-20T10:00:00Z",
        created_at: "2026-09-18T10:00:00Z",
      },
    ],
    proposals: [
      {
        id: "p1",
        title: "Validation congé",
        status: "confirme",
        created_at: "2026-09-20T10:00:00Z",
        decided_at: "2026-09-21T10:00:00Z",
      },
    ],
  };

  it("calcule les valeurs attendues", () => {
    const report = computeReport(dataset, WEEK.current, WEEK.previous);
    const get = (key: string) => report.metrics.find((m) => m.key === key);
    expect(get("effectif_actif")?.value).toBe(2);
    expect(get("nouvelles_recrues")?.value).toBe(1);
    expect(get("departs")?.value).toBe(1);
    expect(get("onboarding_en_cours")?.value).toBe(1);
    expect(get("contrats_a_echeance")?.value).toBe(1);
    expect(get("conges_jours")?.value).toBe(3);
    expect(get("absences_jours")?.value).toBe(1);
    expect(get("documents_manquants")?.value).toBe(1);
    expect(get("taches_realisees")?.value).toBe(1);
    expect(get("taches_en_retard")?.value).toBe(1);
    expect(get("validations_en_attente")?.value).toBe(0);
  });

  it("turnover : 1 départ / 2 actifs = 50 %", () => {
    const report = computeReport(dataset, WEEK.current, WEEK.previous);
    expect(report.metrics.find((m) => m.key === "turnover")?.value).toBe(50);
  });

  it("délai moyen de validation : 24 h", () => {
    const report = computeReport(dataset, WEEK.current, WEEK.previous);
    expect(report.metrics.find((m) => m.key === "delai_validation")?.value).toBe(24);
  });

  it("génère des alertes uniquement sur des faits présents", () => {
    const report = computeReport(dataset, WEEK.current, WEEK.previous);
    const labels = report.alerts.map((a) => a.label);
    expect(labels.some((l) => l.includes("1 document(s) manquant(s)"))).toBe(true);
    expect(labels.some((l) => l.includes("1 document(s) expiré(s)"))).toBe(true);
    expect(labels.some((l) => l.includes("1 contrat(s) à échéance"))).toBe(true);
    expect(labels.some((l) => l.includes("1 tâche(s) en retard"))).toBe(true);
    expect(labels.some((l) => l.includes("1 demande(s) de congé en attente"))).toBe(true);
  });

  it("le marqueur démo suit les données marquées comme telles", () => {
    const demo: ReportDataset = {
      ...dataset,
      employees: dataset.employees.map((e, index) => (index === 0 ? { ...e, is_demo: true } : e)),
    };
    expect(computeReport(demo, WEEK.current, WEEK.previous).isDemo).toBe(true);
    expect(computeReport(dataset, WEEK.current, WEEK.previous).isDemo).toBe(false);
  });
});

describe("filtres de périmètre", () => {
  const dataset: ReportDataset = {
    employees: [
      employee({ id: "1", department: "Production", site: "Antananarivo", contract_type: "CDD" }),
      employee({ id: "2", department: "Logistique", site: "Toamasina", contract_type: "CDI" }),
    ],
    leaves: [],
    documents: [],
    tasks: [],
    proposals: [],
  };

  it("filtre par département", () => {
    expect(filterEmployees(dataset.employees, { department: "Logistique" })).toHaveLength(1);
  });
  it("les tâches restent au périmètre de l'organisation (signalé comme tel)", () => {
    const scoped = scopeDataset(dataset, { department: "Logistique" });
    expect(scoped.employees).toHaveLength(1);
    expect(scoped.tasks).toHaveLength(0);
  });
});
