import { describe, expect, it } from "vitest";

import {
  addDays,
  businessDays,
  daysInclusive,
  isoWeekStart,
  isoWeekNumber,
  overlaps,
  overlapDays,
  previousPeriodOf,
  resolvePeriod,
  withinPeriod,
} from "./periods";

describe("resolvePeriod — semaines ISO", () => {
  it("semaine courante : lundi → dimanche, avec semaine précédente de même longueur", () => {
    const pair = resolvePeriod("semaine_courante", "2026-09-23"); // mercredi
    expect(pair.current.start).toBe("2026-09-21"); // lundi
    expect(pair.current.end).toBe("2026-09-27");
    expect(pair.previous.start).toBe("2026-09-14");
    expect(pair.previous.end).toBe("2026-09-20");
    expect(pair.previous.label).toContain("Semaine");
  });

  it("semaine précédente : la semaine complète d'avant", () => {
    const pair = resolvePeriod("semaine_precedente", "2026-09-23");
    expect(pair.current.start).toBe("2026-09-14");
    expect(pair.current.end).toBe("2026-09-20");
    expect(pair.previous.start).toBe("2026-09-07");
    expect(pair.previous.end).toBe("2026-09-13");
  });

  it("numéro de semaine ISO correct (lundi 2026-09-21 = semaine 39)", () => {
    expect(isoWeekNumber(isoWeekStart("2026-09-23"))).toBe(39);
  });
});

describe("resolvePeriod — mois", () => {
  it("mois courant : bornes du mois et mois précédent comme comparaison", () => {
    const pair = resolvePeriod("mois_courant", "2026-09-23");
    expect(pair.current.start).toBe("2026-09-01");
    expect(pair.current.end).toBe("2026-09-30");
    expect(pair.previous.start).toBe("2026-08-01");
    expect(pair.previous.end).toBe("2026-08-31");
  });

  it("mois précédent : comparaison sur le mois d'avant encore", () => {
    const pair = resolvePeriod("mois_precedent", "2026-09-23");
    expect(pair.current.start).toBe("2026-08-01");
    expect(pair.previous.start).toBe("2026-07-01");
    expect(pair.previous.end).toBe("2026-07-31");
  });
});

describe("resolvePeriod — période personnalisée", () => {
  it("valide une période cohérente", () => {
    const pair = resolvePeriod("personnalisee", "2026-09-23", {
      start: "2026-09-01",
      end: "2026-09-10",
    });
    expect(pair.current.start).toBe("2026-09-01");
    expect(pair.previous.end).toBe("2026-08-31");
  });

  it("refuse une période incomplète", () => {
    expect(() => resolvePeriod("personnalisee", "2026-09-23")).toThrow(/incomplète/);
  });

  it("refuse une période inversée", () => {
    expect(() =>
      resolvePeriod("personnalisee", "2026-09-23", { start: "2026-09-10", end: "2026-09-01" }),
    ).toThrow(/précède/);
  });
});

describe("bornes de temps", () => {
  it("daysInclusive compte les deux bornes", () => {
    expect(daysInclusive("2026-09-21", "2026-09-27")).toBe(7);
    expect(daysInclusive("2026-09-21", "2026-09-21")).toBe(1);
    expect(daysInclusive("2026-09-27", "2026-09-21")).toBe(0);
  });

  it("businessDays ne compte que lundi à vendredi — les jours fériés ne sont pas déduits", () => {
    expect(businessDays("2026-09-21", "2026-09-27")).toBe(5);
  });

  it("previousPeriodOf produit une période de même longueur", () => {
    const current = { start: "2026-09-01", end: "2026-09-10", label: "x" };
    const previous = previousPeriodOf(current);
    expect(daysInclusive(previous.start, previous.end)).toBe(daysInclusive(current.start, current.end));
    expect(previous.end).toBe("2026-08-31");
  });

  it("chevauchement partiel", () => {
    expect(overlaps("2026-09-20", "2026-09-25", "2026-09-23", "2026-09-28")).toBe(true);
    expect(overlapDays("2026-09-20", "2026-09-25", "2026-09-23", "2026-09-28")).toBe(3);
    expect(overlapDays("2026-09-01", "2026-09-05", "2026-09-10", "2026-09-12")).toBe(0);
  });

  it("withinPeriod est inclusive sur les deux bornes", () => {
    const period = { start: "2026-09-01", end: "2026-09-10", label: "x" };
    expect(withinPeriod("2026-09-01", period)).toBe(true);
    expect(withinPeriod("2026-09-10", period)).toBe(true);
    expect(withinPeriod("2026-09-11", period)).toBe(false);
    expect(withinPeriod(null, period)).toBe(false);
  });

  it("addDays traverse les limites de mois", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
  });
});
