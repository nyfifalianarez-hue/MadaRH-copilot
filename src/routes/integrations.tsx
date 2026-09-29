import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CircleSlash, Plug } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { providerList, statusLabels, type IntegrationStatus } from "@/lib/integrations.config";
import { fetchIntegrationState } from "@/lib/views.functions";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Intégrations — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Slack, Gmail, Google Sheets et GitHub : état réel de la connexion, autorisations minimales et politique d'écriture après confirmation.",
      },
      { property: "og:title", content: "Intégrations — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Aucune intégration n'est affichée comme connectée sans test réel de lecture.",
      },
    ],
  }),
  component: IntegrationsPage,
});

interface IntegrationRow {
  id: string;
  provider: string;
  status: string;
  account_label: string | null;
  last_check_at: string | null;
  last_check_ok: boolean | null;
  last_check_detail: string | null;
}

interface HealthCheckRow {
  id: string;
  provider: string;
  ok: boolean;
  http_status: number | null;
  detail: string | null;
  checked_at: string;
}

interface IntegrationState {
  integrations: IntegrationRow[];
  integrationError: string | null;
  scopes: { id: string; provider: string; scope: string; purpose: string; is_write: boolean }[];
  healthChecks: HealthCheckRow[];
}

function statusTone(status: IntegrationStatus): string {
  switch (status) {
    case "connecte_verifie":
      return "border-success/40 text-success";
    case "autorisation_requise":
    case "en_attente_autorisation":
      return "border-warning/40 text-warning-foreground";
    case "erreur":
      return "border-destructive/40 text-destructive";
    default:
      return "border-border text-muted-foreground";
  }
}

function IntegrationsPage() {
  const fetchState = useServerFn(fetchIntegrationState);
  const query = useQuery<IntegrationState>({
    queryKey: ["integrations-state"],
    queryFn: fetchState,
  });

  const rows = query.data?.integrations ?? [];
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  const checksByProvider = new Map<string, HealthCheckRow[]>();
  for (const check of query.data?.healthChecks ?? []) {
    const list = checksByProvider.get(check.provider) ?? [];
    list.push(check);
    checksByProvider.set(check.provider, list);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Intégrations"
        description="Connexions externes réelles. Toute écriture (message Slack, courriel Gmail, cellule Sheets) reste soumise à prévisualisation puis confirmation explicite."
      />

      <div className="panel flex items-start gap-2 p-4 text-sm">
        <CircleSlash className="mt-0.5 size-4 text-muted-foreground" />
        <div>
          <p className="font-medium">Règle d'affichage</p>
          <p className="text-xs text-muted-foreground">
            Une intégration n'est jamais affichée « Connecté » tant qu'un test réel de lecture
            n'a pas réussi. En l'absence de clés OAuth configurées côté serveur, l'état reste «
            Non connecté » ou « Autorisation requise ».
          </p>
        </div>
      </div>

      {query.isError && (
        <div className="panel p-4 text-sm">
          <p className="font-medium">Connexion requise</p>
          <p className="text-muted-foreground">
            L'état des intégrations lit la base : une session authentifiée est nécessaire.
          </p>
        </div>
      )}

      {query.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {providerList.map((provider) => {
            const row = byProvider.get(provider.id);
            const status: IntegrationStatus = (row?.status as IntegrationStatus) ?? "non_connecte";
            const scopes = query.data.scopes.filter((s) => s.provider === provider.id);
            const checks = checksByProvider.get(provider.id) ?? [];
            return (
              <div key={provider.id} className="panel space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Plug className="size-4 text-muted-foreground" />
                    <p className="font-medium">{provider.label}</p>
                  </div>
                  <Badge variant="outline" className={statusTone(status)}>
                    {statusLabels[status] ?? status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{provider.description}</p>
                <div>
                  <p className="text-xs font-medium">Autorisations minimales demandées</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {(scopes.length > 0
                      ? scopes
                      : provider.scopes.map((s, i) => ({
                          id: `config-${i}`,
                          provider: provider.id,
                          scope: s.scope,
                          purpose: s.purpose,
                          is_write: s.isWrite,
                        }))
                    ).map((scope) => (
                      <li key={scope.id} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[10px]">
                          {scope.is_write ? "écriture" : "lecture"}
                        </Badge>
                        <span>
                          <span className="font-mono">{scope.scope}</span> — {scope.purpose}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium">Secrets requis côté serveur</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {provider.requiredSecrets.join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    À définir dans les réglages du projet (jamais dans le code ni le navigateur).
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium">Test de santé</p>
                  <p className="mt-1 text-xs text-muted-foreground">{provider.healthCheckLabel}</p>
                  {row?.last_check_at && (
                    <p className="mt-1 text-xs">
                      Dernier test :{" "}
                      {new Date(row.last_check_at).toLocaleString("fr-FR")} —{" "}
                      {row.last_check_ok ? "réussi" : `échec (${row.last_check_detail ?? "sans détail"})`}
                    </p>
                  )}
                  {checks.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {checks.slice(0, 3).map((check) => (
                        <li key={check.id}>
                          {new Date(check.checked_at).toLocaleString("fr-FR")} —{" "}
                          {check.ok ? "réussi" : `échec${check.http_status ? ` (HTTP ${check.http_status})` : ""}`}
                          {check.detail ? ` — ${check.detail}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                  {provider.dataPolicy}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {query.data && query.data.integrationError && (
        <p className="text-xs text-destructive">
          Lecture de l'état impossible : {query.data.integrationError}
        </p>
      )}

      {query.data && query.data.integrations.length === 0 && !query.data.integrationError && (
        <EmptyState
          title="Aucune intégration connectée"
          description="Aucune connexion n'a été établie : aucun OAuth n'a réussi et aucune donnée externe n'est affichée. Le flux d'autorisation se lancera depuis l'écran de chaque module (Sheets, export) avec prévisualisation et confirmation."
        />
      )}
    </div>
  );
}
