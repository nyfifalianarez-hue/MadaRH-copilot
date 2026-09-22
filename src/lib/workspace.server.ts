// Résolution de l'organisation de l'utilisateur connecté — serveur uniquement.
import { writeAudit } from "./audit.server";

export interface Workspace {
  orgId: string;
  orgName: string;
  roles: string[];
}

export async function ensureWorkspace(userId: string, email: string | null): Promise<Workspace> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, org_id, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  if (!profile) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .insert({ id: userId, full_name: email ?? "", email });
    if (error) throw new Error(error.message);
  }

  let orgId = profile?.org_id ?? null;
  if (!orgId) {
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({ name: "Mon organisation", country: "MG" })
      .select("id")
      .single();
    if (orgError) throw new Error(orgError.message);
    orgId = org.id;

    await supabaseAdmin.from("profiles").update({ org_id: orgId }).eq("id", userId);
    await supabaseAdmin.from("settings").insert({ org_id: orgId });
    // Premier utilisateur d'une organisation : administrateur RH de cet espace.
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin_rh" });
    await writeAudit({
      orgId,
      actorId: userId,
      action: "Création de l'espace RH",
      resource: `organizations/${orgId}`,
      detail: "Espace créé à la première connexion. Rôle administrateur RH attribué au créateur.",
    });
  }

  const { data: orgRow } = await supabaseAdmin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  return {
    orgId,
    orgName: orgRow?.name ?? "Mon organisation",
    roles: (roleRows ?? []).map((r) => r.role as string),
  };
}

export async function requireAdminRh(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin_rh")
    .maybeSingle();
  if (!data) throw new Error("Action réservée à l'administrateur RH.");
}
