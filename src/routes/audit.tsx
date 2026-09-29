import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAuditLogs } from "@/lib/views.functions";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit & sécurité — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Journal d'audit des actions sensibles : acteur, ressource, horodatage, succès. Consultation seule : le journal n'est pas modifiable.",
      },
      { property: "og:title", content: "Audit & sécurité — MadaRH Compliance" },
      {
        property: "og:description",
        content: "Chaque confirmation de proposition et chaque accès sensible est journalisé.",
      },
    ],
  }),
  component: AuditPage,
});

interface AuditRow {
  id: string;
  actor_label: string | null;
  action: string;
  resource: string;
  sensitive: boolean;
  success: boolean;
  detail: string | null;
  created_at: string;
}

function AuditPage() {
  const fetchLogs = useServerFn(fetchAuditLogs);
  const query = useQuery<AuditLogPayload>({ queryKey: ["audit-logs"], queryFn: fetchLogs });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const logs = query.data?.logs ?? [];
    if (!search.trim()) return logs;
    const needle = search.trim().toLowerCase();
    return logs.filter((log) =>
      `${log.action} ${log.resource} ${log.actor_label ?? ""} ${log.detail ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query.data, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit & sécurité"
        description="Journal des actions exécutées (confirmations de propositions, accès sensibles). Le journal est en lecture seule : aucune modification ni suppression n'est possible depuis l'application."
      />

      {query.isError && (
        <div className="panel p-4 text-sm">
          <p className="font-medium">Connexion requise</p>
          <p className="text-muted-foreground">
            Le journal d'audit lit les données réelles de l'organisation : une session
            authentifiée est nécessaire.
          </p>
        </div>
      )}

      {query.data && (
        <>
          <Input
            placeholder="Rechercher une action, une ressource, un acteur…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-md"
            aria-label="Filtrer le journal d'audit"
          />

          {filtered.length === 0 ? (
            <EmptyState
              title={
                query.data.logs.length === 0
                  ? "Aucune entrée d'audit pour le moment"
                  : "Aucune entrée ne correspond à la recherche"
              }
              description="Les actions exécutées après confirmation d'une proposition y sont journalisées automatiquement. Les accès aux données sensibles y apparaissent également."
            />
          ) : (
            <div className="panel overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horodatage</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Ressource</TableHead>
                    <TableHead>Sensible</TableHead>
                    <TableHead>Succès</TableHead>
                    <TableHead>Détail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums">
                        {new Date(log.created_at).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-xs">{log.actor_label ?? "—"}</TableCell>
                      <TableCell className="text-sm">{log.action}</TableCell>
                      <TableCell className="font-mono text-xs">{log.resource}</TableCell>
                      <TableCell>
                        {log.sensitive ? (
                          <Badge variant="outline" className="border-destructive/40 text-destructive">
                            Sensible
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            log.success
                              ? "border-success/40 text-success"
                              : "border-destructive/40 text-destructive"
                          }
                        >
                          {log.success ? "Oui" : "Échec"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {log.detail ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Sécurité : règles d'accès par organisation et par rôle appliquées côté base de
            données (RLS) ; les rôles sont stockés dans une table dédiée et vérifiés côté
            serveur ; le journal d'audit n'accepte ni modification ni suppression.
          </p>
        </>
      )}
    </div>
  );
}

interface AuditLogPayload {
  logs: AuditRow[];
  error: string | null;
}
