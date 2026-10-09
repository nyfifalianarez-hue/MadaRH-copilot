import { describe, expect, it } from "vitest";

import { computeReport, type ReportDataset } from "./kpi";
import { buildSlidesPlan } from "./slides-plan";

const period = { start: "2026-10-05", end: "2026-10-11", label: "S41" };
const previous = { start: "2026-09-28", end: "2026-10-04", label: "S40" };

const emp = (id: string, department: string | null) => ({
  id, status: "actif", hired_on: "2026-01-01", contract_end_on: null, contract_type: "cdi",
  archived_at: null, department, site: null, manager_id: null, full_name: id, matricule: id, is_demo: false,
});

describe("périmètre des congés et documents", () => {
  const ds: ReportDataset = {
    employees: [emp("a", "rh"), emp("b", "it")],
    leaves: [
      { id: "l1", employee_id: "a", type: "maladie", start_on: "2026-10-06", end_on: "2026-10-06", status: "valide", created_at: "2026-10-01" },
      { id: "l2", employee_id: "hors", type: "maladie", start_on: "2026-10-06", end_on: "2026-10-07", status: "valide", created_at: "2026-10-01" },
    ],
    documents: [
      { id: "d1", employee_id: "b", kind: "contrat", label: "x", is_missing: true, expires_on: null },
      { id: "d2", employee_id: "hors", kind: "contrat", label: "y", is_missing: true, expires_on: null },
    ],
    tasks: [], proposals: [],
  };
  const val = (r: ReturnType<typeof computeReport>, k: string) => r.metrics.find((m) => m.key === k)?.value;

  it("exclut les absences d'un salarié hors périmètre, même sans filtre", () => {
    expect(val(computeReport(ds, period, previous), "absences_jours")).toBe(1);
  });
  it("exclut les documents d'un salarié hors périmètre", () => {
    expect(val(computeReport(ds, period, previous), "documents_manquants")).toBe(1);
  });
  it("applique le filtre service aux documents", () => {
    expect(val(computeReport(ds, period, previous, { department: "rh" }), "documents_manquants")).toBe(0);
  });
  it("le taux de rotation est marqué partiel", () => {
    expect(computeReport(ds, period, previous).metrics.find((m) => m.key === "turnover")?.reliability).toBe("partielle");
  });
});

describe("plan local des diapositives", () => {
  const metrics = [
    { key: "effectif_actif", label: "Effectif actif", unit: "nombre", value: 10, previous_value: 8 },
    { key: "turnover", label: "Taux de rotation", unit: "pourcentage", value: null, previous_value: null },
    { key: "departs", label: "Départs", unit: "nombre", value: 1, previous_value: null },
  ];

  it("export désactivé sans autorisation Google", () => {
    const p = buildSlidesPlan({ template: "direction", periodLabel: "S41", author: "RH", metrics, slidesAuthorized: false });
    expect(p.exportEnabled).toBe(false);
    expect(p.exportBlockedReason).toBe("Autorisation requise");
  });
  it("le graphique n'inclut que les indicateurs comparables", () => {
    const p = buildSlidesPlan({ template: "direction", periodLabel: "S41", author: "RH", metrics, slidesAuthorized: false });
    expect(p.slides[0]?.chart?.series.map((s) => s.label)).toEqual(["Effectif actif"]);
    expect(p.slides[0]?.insufficient).toEqual(["Départs", "Taux de rotation"]);
  });
  it("aucun graphique sans données", () => {
    const p = buildSlidesPlan({ template: "manager", periodLabel: "S41", author: "RH", metrics: [], slidesAuthorized: false });
    expect(p.slides.every((s) => s.chart === null)).toBe(true);
  });
  it("le modèle RH compte 4 diapositives d'indicateurs", () => {
    expect(buildSlidesPlan({ template: "rh", periodLabel: "S41", author: "RH", metrics, slidesAuthorized: false }).slides).toHaveLength(4);
  });
});
