import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Info } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/data/labels";
import { fetchWorkspaceSettings } from "@/lib/views.functions";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Organisation, rôles et paramètres de sécurité : rétention des données, masquage par défaut des informations sensibles, mode démo.",
      },
      { property: "og:title", content: "Paramètres — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Aperçu réel de l'espace et des réglages de sécurité en lecture seule.",
      },
    ],
  }),
  component: ParametresPage,
});

interface WorkspaceSettings {
  profile: { id: string; org_id: string | null; full_name: string; email: string | null } | null;
  profileError: string | null;
  roles: string[];
  rolesError: string | null;
  settings: {
    retention_days: number;
    mask_sensitive_by_default: boolean;
    locale: string;
  } | null;
  organization: { name: string; country: string; } | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ParametresPage() {
  const fetchSettings = useServerFn(fetchWorkspaceSettings);
  const query = useQuery<WorkspaceSettings>({
    queryKey: ["workspace-settings"],
    queryFn: fetchSettings,
  });

  if (query.isError) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Paramètres"
          description="Espace de travail, rôles et réglages de sécurité."
        />
        <div className="panel p-4 text-sm">
          <p className="font-medium">Connexion requise</p>
          <p className="text-muted-foreground">
            Ces paramètres lisent les données réelles du compte : une session authentifiée est
            nécessaire.
          </p>
        </div>
      </div>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paramètres"
        description="Espace de travail, rôles et réglages de sécurité. Les modifications sensibles passeront toujours par le circuit analyse → proposition → prévisualisation → confirmation → exécution → audit."
      />

      {query.isLoading && (
        <div className="panel p-6 text-sm text-muted-foreground">Chargement…</div>
      )}

      {data && !data.profile && (
        <EmptyState
          title="Aucun profil rattaché"
          description="Le compte n'est pas encore rattaché à un espace de travail. Celui-ci sera créé à la première action authentifiée du compte."
        />
      )}

      {data?.profile && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-2 p-4">
            <p className="font-medium">Espace de travail</p>
            {data.organization ? (
              <>
                <Row label="Organisation" value={data.organization.name} />
                <Row label="Pays" value={data.organization.country} />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucune organisation rattachée à ce compte pour le moment.
              </p>
            )}
            <Row label="Nom affiché" value={data.profile.full_name || "—"} />
            <Row label="E-mail" value={data.profile.email ?? "—"} />
          </div>

          <div className="panel space-y-2 p-4">
            <p className="font-medium">Rôles attribués</p>
            {data.roles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun rôle lisible pour ce compte.
                {data.rolesError ? ` (${data.rolesError})` : ""}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {roleLabels[role as keyof typeof roleLabels] ?? role}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Les rôles sont vérifiés côté serveur sur chaque action sensible ; ils ne sont
              jamais déduits de l'interface.
            </p>
          </div>

          {data.settings && (
            <div className="panel space-y-2 p-4">
              <p className="font-medium">Sécurité & rétention</p>
              <Row label="Rétention des données" value={`${data.settings.retention_days} jours`} />
              <Row
                label="Masquage par défaut des données sensibles"
                value={data.settings.mask_sensitive_by_default ? "Activé" : "Désactivé"}
              />
              <Row label="Langue" value={data.settings.locale} />
            </div>
          )}

          <div className="panel flex items-start gap-2 p-4 text-sm">
            <Info className="mt-0.5 size-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Règles de protection appliquées</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                <li>
                  Données médicales, disciplinaires et salariales isolées et masquées par défaut ;
                  chaque révélation est journalisée.
                </li>
                <li>
                  Le journal d'audit n'accepte ni modification ni suppression depuis
                  l'application.
                </li>
                <li>
                  Les secrets (OAuth, clés de service) sont réservés au serveur ; rien n'est
                  exposé au navigateur.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
