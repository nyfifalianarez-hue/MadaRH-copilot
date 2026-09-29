/**
 * Fonctions serveur des écrans de consultation (audit, intégrations, paramètres).
 * Toutes les lectures passent par le client authentifié de l'utilisateur (RLS).
 * Aucune donnée n'est inventée : le cas échéant, l'écran affiche un état vide honnête.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const fetchAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select(
        "id, actor_label, action, resource, sensitive, success, detail, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) return { logs: [], error: error.message };
    return { logs: data ?? [], error: null };
  });

export const fetchIntegrationState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [integrations, scopes, healthChecks] = await Promise.all([
      db.from("integrations").select("id, provider, status, account_label, last_check_at, last_check_ok, last_check_detail, authorized_at"),
      db.from("integration_scopes").select("id, provider, scope, purpose, is_write"),
      db
        .from("integration_health_checks")
        .select("id, provider, ok, http_status, detail, checked_at")
        .order("checked_at", { ascending: false })
        .limit(50),
    ]);
    return {
      integrations: integrations.data ?? [],
      integrationError: integrations.error?.message ?? null,
      scopes: scopes.data ?? [],
      healthChecks: healthChecks.data ?? [],
    };
  });

export const fetchWorkspaceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [profileRes, rolesRes, settingsRes] = await Promise.all([
      db.from("profiles").select("id, org_id, full_name, email").eq("id", context.userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", context.userId),
      db.from("settings").select("retention_days, mask_sensitive_by_default, demo_mode, locale").limit(1).maybeSingle(),
    ]);

    const orgId = profileRes.data?.org_id ?? null;
    const orgRes = orgId
      ? await db.from("organizations").select("name, country, is_demo").eq("id", orgId).maybeSingle()
      : null;

    return {
      profile: profileRes.data ?? null,
      profileError: profileRes.error?.message ?? null,
      roles: (rolesRes.data ?? []).map((r) => r.role as string),
      rolesError: rolesRes.error?.message ?? null,
      settings: settingsRes.data ?? null,
      organization: orgRes?.data ?? null,
    };
  });
