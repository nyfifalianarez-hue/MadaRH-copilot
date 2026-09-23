/**
 * Périodes de rapport — fonctions pures, testables, sans dépendance réseau.
 * Toutes les dates sont manipulées en UTC au format ISO court (AAAA-MM-JJ).
 */

export type PeriodPresetId =
  | "semaine_courante"
  | "semaine_precedente"
  | "mois_courant"
  | "mois_precedent"
  | "personnalisee";

export interface Period {
  /** Borne de début incluse (AAAA-MM-JJ). */
  start: string;
  /** Borne de fin incluse (AAAA-MM-JJ). */
  end: string;
  label: string;
}

export interface PeriodPair {
  current: Period;
  /** Période de comparaison de même longueur, immédiatement précédente. */
  previous: Period;
}

export const periodPresetLabels: Record<PeriodPresetId, string> = {
  semaine_courante: "Semaine courante",
  semaine_precedente: "Semaine précédente",
  mois_courant: "Mois courant",
  mois_precedent: "Mois précédent",
  personnalisee: "Période personnalisée",
};

const DAY = 86_400_000;

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIso(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(parseIso(iso).getTime() + days * DAY));
}

/** Nombre de jours calendaires entre deux bornes incluses. */
export function daysInclusive(start: string, end: string): number {
  const diff = Math.round((parseIso(end).getTime() - parseIso(start).getTime()) / DAY);
  return diff < 0 ? 0 : diff + 1;
}

/** Jours ouvrés (lundi à vendredi) entre deux bornes incluses. Les jours fériés ne sont pas connus en base : ils ne sont donc pas déduits. */
export function businessDays(start: string, end: string): number {
  let count = 0;
  const last = parseIso(end).getTime();
  for (let t = parseIso(start).getTime(); t <= last; t += DAY) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** Lundi de la semaine ISO contenant la date fournie. */
export function isoWeekStart(iso: string): string {
  const date = parseIso(iso);
  const day = date.getUTCDay();
  const shift = day === 0 ? -6 : 1 - day;
  return addDays(iso, shift);
}

export function isoWeekNumber(iso: string): number {
  const monday = parseIso(isoWeekStart(iso));
  const thursday = new Date(monday.getTime() + 3 * DAY);
  const firstJan = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const firstThursdayOffset = (4 - (firstJan.getUTCDay() || 7) + 7) % 7;
  const firstThursday = new Date(firstJan.getTime() + firstThursdayOffset * DAY);
  return Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY)) + 1;
}

function monthBounds(iso: string, monthOffset: number): Period {
  const date = parseIso(iso);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return {
    start: toIso(start),
    end: toIso(end),
    label: `${String(start.getUTCMonth() + 1).padStart(2, "0")}/${start.getUTCFullYear()}`,
  };
}

function weekPeriod(iso: string): Period {
  const start = isoWeekStart(iso);
  const end = addDays(start, 6);
  return { start, end, label: `Semaine ${isoWeekNumber(start)} · ${start.slice(0, 4)}` };
}

/** Période immédiatement précédente, de même longueur (comparaison honnête). */
export function previousPeriodOf(period: Period): Period {
  const length = daysInclusive(period.start, period.end);
  const end = addDays(period.start, -1);
  const start = addDays(end, -(length - 1));
  return { start, end, label: `${start} → ${end}` };
}

export function resolvePeriod(
  preset: PeriodPresetId,
  today: string,
  custom?: { start: string; end: string },
): PeriodPair {
  let current: Period;
  switch (preset) {
    case "semaine_courante":
      current = weekPeriod(today);
      break;
    case "semaine_precedente":
      current = weekPeriod(addDays(isoWeekStart(today), -7));
      break;
    case "mois_courant":
      current = monthBounds(today, 0);
      break;
    case "mois_precedent":
      current = monthBounds(today, -1);
      break;
    case "personnalisee": {
      if (!custom?.start || !custom?.end) {
        throw new Error("Période personnalisée incomplète : une date de début et de fin est requise.");
      }
      if (parseIso(custom.end).getTime() < parseIso(custom.start).getTime()) {
        throw new Error("Période personnalisée invalide : la date de fin précède la date de début.");
      }
      current = { start: custom.start, end: custom.end, label: `${custom.start} → ${custom.end}` };
      break;
    }
  }

  const previousRaw = previousPeriodOf(current);
  const previous: Period =
    preset === "semaine_courante" || preset === "semaine_precedente"
      ? { ...previousRaw, label: `Semaine ${isoWeekNumber(previousRaw.start)} · ${previousRaw.start.slice(0, 4)}` }
      : preset === "mois_courant"
        ? monthBounds(current.start, -1)
        : preset === "mois_precedent"
          ? monthBounds(current.start, -1)
          : previousRaw;

  return { current, previous };
}

/** Une plage [aStart,aEnd] recouvre-t-elle [bStart,bEnd] ? Bornes incluses. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return parseIso(aStart).getTime() <= parseIso(bEnd).getTime() &&
    parseIso(aEnd).getTime() >= parseIso(bStart).getTime();
}

/** Nombre de jours d'une plage effectivement inclus dans la période. */
export function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  if (!overlaps(aStart, aEnd, bStart, bEnd)) return 0;
  const start = parseIso(aStart).getTime() > parseIso(bStart).getTime() ? aStart : bStart;
  const end = parseIso(aEnd).getTime() < parseIso(bEnd).getTime() ? aEnd : bEnd;
  return daysInclusive(start, end);
}

/** La date se situe-t-elle dans la période (bornes incluses) ? */
export function withinPeriod(iso: string | null | undefined, period: Period): boolean {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= period.start && day <= period.end;
}
