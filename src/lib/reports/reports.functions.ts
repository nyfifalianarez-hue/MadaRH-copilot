/**
 * Fonctions serveur du module « Rapport hebdomadaire RH ».
 *
 * Les lectures et écritures passent par le client authentifié de l'utilisateur
 * (RLS par organisation). Les valeurs de chaque rapport sont recalculées côté
 * serveur à partir des données réellement présentes en base — le client ne
 * peut pas injecter des chiffres. Aucune donnée n'est inventée : un indicateur
 * sans source reste « indisponible ».
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/audit.server";

import { computeReport, toStoredDetail, type ReportDataset } from "./kpi";
import { periodPresetLabels, resolvePeriod, type Period, type PeriodPresetId } from "./periods";

type AuthedDb = SupabaseClient<Database>;

const EDITOR_ROLES = new Set(["admin_rh", "rh", "manager"]);

async function loadDataset(db: AuthedDb, userId: string): Promise<ReportDataset> {
  const [employees, leaves, documents, tasks, proposals] = await Promise.all([
    db
      .from("employees")
      .select(
        "id, status, hired_on, contract_end_on, contract_type, archived_at, department, site, manager_id, full_name, matricule, is_demo",
      )
      // Données réelles uniquement : toute ligne marquée de démonstration est exclue.
      .eq("is_demo", false),
    db
      .from("leave_absences")
      .select("id, employee_id, type, start_on, end_on, status, created_at"),
    db
      .from("employee_documents")
      .select("id, employee_id, kind, label, is_missing, expires_on"),
    db.from("tasks").select("id, title, done, due_on, updated_at, created_at"),
    db.from("action_proposals").select("id, title, status, created_at, decided_at"),
  ]);

  if (employees.error) throw new Error(employees.error.message);
  if (leaves.error) throw new Error(leaves.error.message);
  if (documents.error) throw new Error(documents.error.message);
  if (tasks.error) throw new Error(tasks.error.message);
  if (proposals.error) throw new Error(proposals.error.message);

  return {
    employees: (employees.data ?? []) as ReportDataset["employees"],
    leaves: (leaves.data ?? []) as ReportDataset["leaves"],
    documents: (documents.data ?? []) as ReportDataset["documents"],
    tasks: (tasks.data ?? []) as ReportDataset["tasks"],
    proposals: (proposals.data ?? []) as ReportDataset["proposals"],
  };
}

const filtersSchema = z.object({
  department: z.string().nullable().optional(),
  site: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  contractType: z.string().nullable().optional(),
});

export type ReportFiltersInput = z.infer<typeof filtersSchema>;

export const fetchReportDataset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;

    const [dataset, profileRes, rolesRes] = await Promise.all([
      loadDataset(db, context.userId),
      db.from("profiles").select("org_id").eq("id", context.userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", context.userId),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);

    const orgId = profileRes.data?.org_id ?? null;
    const orgRes = orgId
      ? await db.from("organizations").select("name").eq("id", orgId).maybeSingle()
      : null;

    const roles = (rolesRes.data ?? []).map((r) => r.role as string);

    return {
      dataset,
      orgName: orgRes?.data?.name ?? null,
      roles,
      canEdit: roles.some((role) => EDITOR_ROLES.has(role)),
    };
  });

const saveInputSchema = z.object({
  template: z.enum(["rh", "manager", "direction"]),
  preset: z.enum([
    "semaine_courante",
    "semaine_precedente",
    "mois_courant",
    "mois_precedent",
    "personnalisee",
  ]),
  custom: z
    .object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
  filters: filtersSchema.optional(),
});

export const saveWeeklyReportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => saveInputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const db = context.supabase;

    const { data: profile } = await db
      .from("profiles")
      .select("org_id")
      .eq("id", context.userId)
      .maybeSingle();
    const orgId = profile?.org_id;
    if (!orgId) {
      throw new Error("Aucune organisation rattachée à ce compte : rapport impossible.");
    }

    const dataset = await loadDataset(db, context.userId);
    const periodPair = resolvePeriod(data.preset, new Date().toISOString().slice(0, 10), data.custom);
    const filters = {
      department: data.filters?.department ?? null,
      site: data.filters?.site ?? null,
      managerId: data.filters?.managerId ?? null,
      contractType: data.filters?.contractType ?? null,
    };
    const computed = computeReport(dataset, periodPair.current, periodPair.previous, filters);

    const templateLabels: Record<typeof data.template, string> = {
      rh: "RH (détaillé)",
      manager: "Manager (équipe)",
      direction: "Direction (synthétique)",
    };

    const { data: existing, error: existingError } = await db
      .from("weekly_reports")
      .select("id")
      .match({
        org_id: orgId,
        template: data.template,
        period_start: periodPair.current.start,
        period_end: periodPair.current.end,
      });
    if (existingError) throw new Error(existingError.message);
    const version = (existing?.length ?? 0) + 1;

    const title = `Rapport ${templateLabels[data.template]} — ${periodPair.current.label}`;

    const { data: report, error: reportError } = await db
      .from("weekly_reports")
      .insert({
        org_id: orgId,
        template: data.template,
        title,
        period_label: periodPair.current.label,
        period_start: periodPair.current.start,
        period_end: periodPair.current.end,
        previous_start: periodPair.previous.start,
        previous_end: periodPair.previous.end,
        filters: data.filters ?? {},
        sources: computed.sources,
        status: "brouillon",
        version,
        is_demo: false,
        author_id: context.userId,
      })
      .select("id")
      .single();
    if (reportError) throw new Error(reportError.message);

    const rows = computed.metrics.map((m) => ({
      report_id: report.id,
      org_id: orgId,
      key: m.key,
      label: m.label,
      definition: m.definition,
      unit: m.unit,
      value: m.value,
      numerator: m.numerator,
      denominator: m.denominator,
      formula: m.formula,
      source: m.source,
      reliability: m.reliability,
      previous_value: m.previousValue,
      comparison_note: m.comparisonNote,
      detail: toStoredDetail(m.detail),
    }));
    if (rows.length > 0) {
      const { error: metricsError } = await db.from("weekly_report_metrics").insert(rows);
      if (metricsError) throw new Error(metricsError.message);
    }

    await writeAudit({
      orgId,
      actorId: context.userId,
      action: "Rapport hebdomadaire enregistré (brouillon)",
      resource: `weekly_reports/${report.id}`,
      detail: `Modèle ${templateLabels[data.template]}, période ${periodPair.current.label}, version ${version}.`,
      newValues: { template: data.template, period: periodPair.current, version },
    });

    return {
      id: report.id,
      version,
      periodLabel: periodPair.current.label,
      title,
    };
  });

export const listWeeklyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weekly_reports")
      .select(
        "id, template, title, period_label, period_start, period_end, status, version, created_at, author_id, filters, sources",
      )
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return { reports: data ?? [] };
  });

export const getWeeklyReportMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ reportId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("weekly_report_metrics")
      .select(
        "id, key, label, unit, value, numerator, denominator, formula, source, reliability, previous_value, comparison_note",
      )
      .eq("report_id", data.reportId)
      .order("label");
    if (error) throw new Error(error.message);
    return { metrics: rows ?? [] };
  });

export { periodPresetLabels };
export type { Period, PeriodPresetId };
