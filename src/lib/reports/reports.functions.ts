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
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/audit.server";

import { computeReport, type ReportDataset } from "./kpi";
import { periodPresetLabels, type PeriodPresetId } from "./periods";

const EDITOR_ROLES = new Set(["admin_rh", "rh", "manager"]);

interface DatasetPayload {
  dataset: ReportDataset;
  orgName: string | null;
  roles: string[];
  canEdit: boolean;
}

export const fetchReportDataset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DatasetPayload> => {
    const db = context.supabase;

    const [employees, leaves, documents, tasks, proposals, profileRes, rolesRes, orgRes] =
      await Promise.all([
        db
          .from("employees")
          .select(
            "id, status, hired_on, contract_end_on, contract_type, archived_at, department, site, manager_id, full_name, matricule, is_demo",
          ),
        db
          .from("leave_absences")
          .select("id, employee_id, type, start_on, end_on, status, created_at"),
        db
          .from("employee_documents")
          .select("id, employee_id, kind, label, is_missing, expires_on"),
        db.from("tasks").select("id, title, done, due_on, updated_at, created_at"),
        db
          .from("action_proposals")
          .select("id, title, status, created_at, decided_at"),
        db.from("profiles").select("org_id").eq("id", context.userId).maybeSingle(),
        db.from("user_roles").select("role").eq("user_id", context.userId),
        db.from("organizations").select("name, is_demo").eq(
          "id",
          // current_org_id() est la source RLS : on interroge l'organisation du profil.
          "",
        ),
      ]);

    const orgId = profileRes.data?.org_id ?? null;
    const orgQuery = orgId
      ? await db.from("organizations").select("name, is_demo").eq("id", orgId).maybeSingle()
      : null;

    void orgRes; // requête factice retirée — l'organisation est lue au-dessus.

    if (employees.error) throw new Error(employees.error.message);
    if (leaves.error) throw new Error(leaves.error.message);
    if (documents.error) throw new Error(documents.error.message);
    if (tasks.error) throw new Error(tasks.error.message);
    if (proposals.error) throw new Error(proposals.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);

    const roles = (rolesRes.data ?? []).map((r) => r.role as string);

    return {
      dataset: {
        employees: (employees.data ?? []) as ReportDataset["employees"],
        leaves: (leaves.data ?? []) as ReportDataset["leaves"],
        documents: (documents.data ?? []) as ReportDataset["documents"],
        tasks: (tasks.data ?? []) as ReportDataset["tasks"],
        proposals: (proposals.data ?? []) as ReportDataset["proposals"],
      },
      orgName: orgQuery?.data?.name ?? null,
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
    .object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
    .optional(),
  filters: z
    .object({
      department: z.string().nullable().optional(),
      site: z.string().nullable().optional(),
      managerId: z.string().nullable().optional(),
      contractType: z.string().nullable().optional(),
    })
    .optional(),
});

export const saveWeeklyReportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => saveInputSchema.parse(data))
  .handler(async ({ context, data }) => {
    const db = context.supabase;

    // Autorité serveur : recalcul complet du rapport depuis la base.
    const computed = await computeFromDatabase(db, context.userId, data.template, data.preset, data.custom, data.filters ?? {});

    const { data: existing, error: existingError } = await db
      .from("weekly_reports")
      .select("id")
      .match({
        org_id: computed.orgId,
        template: data.template,
        period_start: computed.period.start,
        period_end: computed.period.end,
      });
    if (existingError) throw new Error(existingError.message);

    const version = (existing?.length ?? 0) + 1;
    const templateLabels: Record<typeof data.template, string> = {
      rh: "RH (détaillé)",
      manager: "Manager (équipe)",
      direction: "Direction (synthétique)",
    };
    const title = `${computed.orgName ?? "Organisation"} — Rapport ${templateLabels[data.template]}`;

    const { data: report, error: reportError } = await db
      .from("weekly_reports")
      .insert({
        org_id: computed.orgId,
        template: data.template,
        title,
        period_label: computed.period.label,
        period_start: computed.period.start,
        period_end: computed.period.end,
        previous_start: computed.previous.start,
        previous_end: computed.previous.end,
        filters: data.filters ?? {},
        sources: computed.sources,
        status: "brouillon",
        version,
        is_demo: computed.isDemo,
        author_id: context.userId,
      })
      .select("id")
      .single();
    if (reportError) throw new Error(reportError.message);

    const rows = computed.metrics.map((m) => ({
      report_id: report.id,
      org_id: computed.orgId,
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
      detail: { items: m.detail },
    }));
    if (rows.length > 0) {
      const { error: metricsError } = await db.from("weekly_report_metrics").insert(rows);
      if (metricsError) throw new Error(metricsError.message);
    }

    await writeAudit({
      orgId: computed.orgId,
      actorId: context.userId,
      action: "Rapport hebdomadaire enregistré (brouillon)",
      resource: `weekly_reports/${report.id}`,
      detail: `Modèle ${templateLabels[data.template]}, période ${computed.period.label}, version ${version}, marqueur démo : ${computed.isDemo ? "oui" : "non"}.`,
      newValues: { template: data.template, period: computed.period, version },
    });

    return { id: report.id, version, periodLabel: computed.period.label, isDemo: computed.isDemo };
  });

export const listWeeklyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("weekly_reports")
      .select(
        "id, template, title, period_label, period_start, period_end, status, version, is_demo, created_at, author_id, filters, sources",
      )
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return { reports: data ?? [] };
  });

// --- helper serveur : lecture + calcul, partagé par la sauvegarde -----------

async function computeFromDatabase(
  db: Awaited<ReturnType<typeof createAuthDb>>,
  userId: string,
  template: "rh" | "manager" | "direction",
  preset: PeriodPresetId,
  custom: { start: string; end: string } | undefined,
  filters: NonNullable<saveInputSchema["_output"]["filters"]>,
) {
  const { resolvePeriod } = await import("./periods");
  const { computeReport } = await import("./kpi");

  const { data: profile } = await db
    .from("profiles")
    .select("org_id")
    .eq("id", userId)
    .maybeSingle();
  const orgId = profile?.org_id;
  if (!orgId) throw new Error("Aucune organisation rattachée à ce compte : rapport impossible.");

  const [{ data: org }, employeesRes, leavesRes, documentsRes, tasksRes, proposalsRes] =
    await Promise.all([
      db.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      db
        .from("employees")
        .select(
          "id, status, hired_on, contract_end_on, contract_type, archived_at, department, site, manager_id, full_name, matricule, is_demo",
        ),
      db
        .from("leave_absences")
        .select("id, employee_id, type, start_on, end_on, status, created_at"),
      db
        .from("employee_documents")
        .select("id, employee_id, kind, label, is_missing, expires_on"),
      db.from("tasks").select("id, title, done, due_on, updated_at, created_at"),
      db.from("action_proposals").select("id, title, status, created_at, decided_at"),
    ]);

  if (employeesRes.error) throw new Error(employeesRes.error.message);
  if (leavesRes.error) throw new Error(leavesRes.error.message);
  if (documentsRes.error) throw new Error(documentsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (proposalsRes.error) throw new Error(proposalsRes.error.message);

  const dataset: ReportDataset = {
    employees: (employeesRes.data ?? []) as ReportDataset["employees"],
    leaves: (leavesRes.data ?? []) as ReportDataset["leaves"],
    documents: (documentsRes.data ?? []) as ReportDataset["documents"],
    tasks: (tasksRes.data ?? []) as ReportDataset["tasks"],
    proposals: (proposalsRes.data ?? []) as ReportDataset["proposals"],
  };

  const periodPair = resolvePeriod(preset, new Date().toISOString().slice(0, 10), custom);
  const computed = computeReport(dataset, periodPair.current, periodPair.previous, filters ?? {});

  return {
    orgId,
    orgName: org?.name ?? null,
    period: periodPair.current,
    previous: periodPair.previous,
    metrics: computed.metrics,
    sources: computed.sources,
    isDemo: computed.isDemo,
    template,
  };
}

type createAuthDb = ReturnType<typeof requireSupabaseAuth> extends never ? never : never;
