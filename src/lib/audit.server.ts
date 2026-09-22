// Journal d'audit — écriture serveur uniquement (table non modifiable côté client).
export interface AuditEntry {
  orgId: string | null;
  actorId: string | null;
  actorLabel?: string | null;
  action: string;
  resource: string;
  sensitive?: boolean;
  success?: boolean;
  detail?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    org_id: entry.orgId,
    actor_id: entry.actorId,
    actor_label: entry.actorLabel ?? null,
    action: entry.action,
    resource: entry.resource,
    sensitive: entry.sensitive ?? false,
    success: entry.success ?? true,
    detail: entry.detail ?? null,
    old_values: (entry.oldValues ?? null) as never,
    new_values: (entry.newValues ?? null) as never,
  });
  if (error) console.error("[audit] écriture impossible", error.message);
}
