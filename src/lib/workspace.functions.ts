// Initialise l'espace (profil, organisation, rôle) de l'utilisateur connecté.
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ensureWorkspace } = await import("./workspace.server");
    const email = (context.claims as { email?: string }).email ?? null;
    const ws = await ensureWorkspace(context.userId, email);
    return { orgName: ws.orgName, roles: ws.roles };
  });
