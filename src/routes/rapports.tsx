import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Calculator, Database, FileDown, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchReportDataset,
  listWeeklyReports,
  saveWeeklyReportDraft,
} from "@/lib/reports/reports.functions";
import { computeReport, formatMetricValue, type ComputedReport, type Metric } from "@/lib/reports/kpi";
import {
  periodPresetLabels,
  resolvePeriod,
  type PeriodPresetId,
} from "@/lib/reports/periods";

export const Route = createFileRoute("/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports RH — MadaRH Compliance" },
      {
        name: "description",
        content:
          "Rapport hebdomadaire RH calculé depuis les données réelles : KPI détaillés, formules, comparaisons et brouillons versionnés.",
      },
      { property: "og:title", content: "Rapports RH — MadaRH Compliance" },
      {
        property: "og:description",
        content:
          "KPI réels avec numérateur, dénominateur, formule et source. Aucune donnée n'est inventée.",
      },
    ],
  }),
  component: RapportsPage,
});

const templateOptions = [
  { value: "rh", label: "RH (détaillé)" },
  { value: "manager", label: "Manager (équipe)" },
  { value: "direction", label: "Direction (synthétique)" },
] as const;

type TemplateId = (typeof templateOptions)[number]["value"];

const templateSections: Record<TemplateId, { title: string; keys: string[] }> = {
  rh: {
    title: "Indicateurs RH — détail complet",
    keys: [
      "effectif_actif",
      "nouvelles_recrues",
      "departs",
      "turnover",
      "onboarding_en_cours",
      "contrats_a_echeance",
      "conges_jours",
      "absences_jours",
      "absenteisme",
      "conges_en_attente",
      "documents_manquants",
      "completude_documentaire",
      "documents_expires",
      "taches_realisees",
      "taches_en_retard",
      "validations_en_attente",
      "delai_validation",
    ],
  },
  manager: {
    title: "Vue manager — équipe",
    keys: [
      "effectif_actif",
      "nouvelles_recrues",
      "departs",
      "onboarding_en_cours",
      "contrats_a_echeance",
      "conges_jours",
      "absences_jours",
      "conges_en_attente",
      "taches_realisees",
      "taches_en_retard",
      "validations_en_attente",
    ],
  },
  direction: {
    title: "Vue direction — synthèse",
    keys: [
      "effectif_actif",
      "nouvelles_recrues",
      "departs",
      "turnover",
      "absenteisme",
      "completude_documentaire",
      "documents_manquants",
      "documents_expires",
    ],
  },
};

const unitLabels: Record<Metric["unit"], string> = {
  nombre: "nombre",
  pourcentage: "%",
  jours: "jours",
  heures: "heures",
};

function MetricCard({ metric }: { metric: Metric }) {
  const tone =
    metric.value === null
      ? "text-muted-foreground"
      : metric.key === "documents_manquants" || metric.key === "documents_expires"
        ? metric.value > 0
          ? "text-destructive"
          : "text-foreground"
        : "text-foreground";

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
        <Badge
          variant="outline"
          className={
            metric.reliability === "calculee"
              ? "border-success/40 text-success"
              : metric.reliability === "partielle"
                ? "border-warning/40 text-warning-foreground"
                : "border-border text-muted-foreground"
          }
        >
          {metric.reliability === "calculee"
            ? "Calculée"
            : metric.reliability === "partielle"
              ? "Partielle"
              : "Indisponible"}
        </Badge>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>
        {formatMetricValue(metric)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Période précédente :{" "}
        {metric.previousValue === null ? "données insuffisantes" : formatMetricValue({
          ...metric,
          value: metric.previousValue,
        })}
      </p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="mt-2 h-7 gap-1.5 px-2 text-xs">
            <Calculator className="size-3.5" />
            Voir le calcul
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{metric.label}</DialogTitle>
            <DialogDescription>{metric.definition}</DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Formule</dt>
              <dd className="font-mono text-xs">{metric.formula}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Numérateur</dt>
              <dd className="tabular-nums">{metric.numerator ?? "non calculé"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Dénominateur</dt>
              <dd className="tabular-nums">
                {metric.denominator === null || metric.denominator === undefined
                  ? "sans objet"
                  : metric.denominator}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Valeur</dt>
              <dd>{formatMetricValue(metric)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Source</dt>
              <dd>{metric.source}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fiabilité</dt>
              <dd className="capitalize">{metric.reliability}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Comparaison période précédente</dt>
              <dd>{metric.comparisonNote}</dd>
            </div>
            {metric.detail.length > 0 && (
              <div>
                <dt className="text-xs text-muted-foreground">Détail (source réelle)</dt>
                <dd>
                  <ul className="list-disc pl-4 text-xs">
                    {metric.detail.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RapportsPage() {
  const datasetFn = useServerFn(fetchReportDataset);
  const historyFn = useServerFn(listWeeklyReports);
  const saveFn = useServerFn(saveWeeklyReportDraft);
  const queryClient = useQueryClient();

  const dataQuery = useQuery({
    queryKey: ["rapports-dataset"],
    queryFn: datasetFn,
  });
  const historyQuery = useQuery({
    queryKey: ["rapports-historique"],
    queryFn: historyFn,
  });

  const [template, setTemplate] = useState<TemplateId>("rh");
  const [preset, setPreset] = useState<PeriodPresetId>("semaine_courante");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [department, setDepartment] = useState<string>("tous");
  const [site, setSite] = useState<string>("tous");
  const [managerId, setManagerId] = useState<string>("tous");
  const [contractType, setContractType] = useState<string>("tous");
  const [saving, setSaving] = useState(false);

  const data = dataQuery.data;

  const periodPair = useMemo(() => {
    try {
      return resolvePeriod(
        preset,
        new Date().toISOString().slice(0, 10),
        preset === "personnalisee" && customStart && customEnd
          ? { start: customStart, end: customEnd }
          : undefined,
      );
    } catch {
      return null;
    }
  }, [preset, customStart, customEnd]);

  const options = useMemo(() => {
    if (!data) return null;
    const departments = [...new Set(data.dataset.employees.map((e) => e.department).filter(Boolean))] as string[];
    const sites = [...new Set(data.dataset.employees.map((e) => e.site).filter(Boolean))] as string[];
    const contractTypes = [...new Set(data.dataset.employees.map((e) => e.contract_type).filter(Boolean))] as string[];
    const managedIds = [
      ...new Set(data.dataset.employees.map((e) => e.manager_id).filter(Boolean)),
    ] as string[];
    const byId = new Map(data.dataset.employees.map((e) => [e.id, e.full_name]));
    const managers = managedIds.map((id) => ({ id, name: byId.get(id) ?? `Salarié ${id.slice(0, 8)}` }));
    return { departments, sites, contractTypes, managers };
  }, [data]);

  const report: ComputedReport | null = useMemo(() => {
    if (!data || !periodPair) return null;
    return computeReport(data.dataset, periodPair.current, periodPair.previous, {
      department: department === "tous" ? null : department,
      site: site === "tous" ? null : site,
      managerId: managerId === "tous" ? null : managerId,
      contractType: contractType === "tous" ? null : contractType,
    });
  }, [data, periodPair, department, site, managerId, contractType]);

  const chartData = useMemo(() => {
    if (!report) return [];
    return report.metrics
      .filter((m) => m.unit === "nombre" && m.value !== null)
      .slice(0, 8)
      .map((m) => ({ name: m.label, valeur: m.value }));
  }, [report]);

  const compareData = useMemo(() => {
    if (!report) return [];
    return report.metrics
      .filter((m) => m.unit === "nombre" && m.value !== null && m.previousValue !== null)
      .slice(0, 8)
      .map((m) => ({ name: m.label, période: m.value, précédente: m.previousValue }));
  }, [report]);

  if (dataQuery.isError) {
    const message = dataQuery.error instanceof Error ? dataQuery.error.message : "";
    return (
      <div className="space-y-4">
        <PageHeader
          title="Rapports RH"
          description="Rapport hebdomadaire calculé depuis les données réelles de la base."
        />
        <div className="panel space-y-2 p-6 text-sm">
          <p className="font-medium">Connexion requise</p>
          <p className="text-muted-foreground">
            {message.includes("Unauthorized")
              ? "Cette section lit les données réelles de l'organisation : une session authentifiée est nécessaire. Connectez-vous pour l'activer."
              : `Lecture impossible : ${message}`}
          </p>
        </div>
      </div>
    );
  }

  const errorIfCustom = preset === "personnalisee" && (!customStart || !customEnd);

  const saveDraft = async () => {
    if (!periodPair || errorIfCustom) return;
    setSaving(true);
    try {
      const result = await saveFn({
        template,
        preset,
        ...(preset === "personnalisee"
          ? { custom: { start: customStart, end: customEnd } }
          : {}),
        filters: {
          department: department === "tous" ? null : department,
          site: site === "tous" ? null : site,
          managerId: managerId === "tous" ? null : managerId,
          contractType: contractType === "tous" ? null : contractType,
        },
      });
      toast.success(
        `Brouillon enregistré : ${result.title}, version ${result.version}${result.isDemo ? " (DONNÉES DE DÉMONSTRATION)" : ""}.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["rapports-historique"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Échec de l'enregistrement du brouillon.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rapports RH"
        description="Chaque indicateur affiche sa formule, son numérateur, son dénominateur et sa source réelle. Aucune donnée n'est inventée."
      />

      {dataQuery.isLoading && (
        <div className="panel p-6 text-sm text-muted-foreground">Chargement des données…</div>
      )}

      {data && (
        <>
          <div className="panel space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Modèle</Label>
                <Select value={template} onValueChange={(value) => setTemplate(value as TemplateId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Période</Label>
                <Select value={preset} onValueChange={(value) => setPreset(value as PeriodPresetId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(periodPresetLabels) as PeriodPresetId[]).map((id) => (
                      <SelectItem key={id} value={id}>
                        {periodPresetLabels[id]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Département</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    {(options?.departments ?? []).map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Site</Label>
                <Select value={site} onValueChange={setSite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    {(options?.sites ?? []).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Manager</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    {(options?.managers ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type de contrat</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous</SelectItem>
                    {(options?.contractTypes ?? []).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {preset === "personnalisee" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rapports-debut">Début</Label>
                  <Input
                    id="rapports-debut"
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rapports-fin">Fin</Label>
                  <Input
                    id="rapports-fin"
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                </div>
                {errorIfCustom && (
                  <p className="pb-2 text-xs text-warning-foreground">
                    Renseignez une date de début et une date de fin.
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {periodPair
                ? `Période : ${periodPair.current.start} → ${periodPair.current.end} (${periodPair.current.label}) · comparée à ${periodPair.previous.start} → ${periodPair.previous.end}`
                : "Période personnalisée incomplète."}
            </p>
          </div>

          {report && (
            <>
              {report.isDemo && (
                <div className="panel border-warning/40 bg-warning/10 p-4 text-sm">
                  <p className="font-medium text-warning-foreground">
                    DONNÉES DE DÉMONSTRATION
                  </p>
                  <p className="text-warning-foreground/80">
                    Au moins une ligne du périmètre est marquée comme donnée de démonstration.
                    Ces chiffres ne doivent jamais être mélangés aux données réelles.
                  </p>
                </div>
              )}

              {report.isEmpty ? (
                <EmptyState
                  title="Aucune donnée disponible pour cette période"
                  description="Aucune ligne ne correspond au périmètre sélectionné dans la base. Aucune valeur n'est estimée ou inventée."
                />
              ) : (
                <>
                  <div className="panel space-y-4 p-4">
                    <p className="text-sm font-medium">{templateSections[template].title}</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {templateSections[template].keys.map((key) => {
                        const metric = report.metrics.find((m) => m.key === key);
                        return metric ? <MetricCard key={key} metric={metric} /> : null;
                      })}
                    </div>
                    {template === "rh" && (
                      <div className="space-y-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Indicateurs non calculables (donnée source absente)</p>
                        <ul className="list-disc pl-4">
                          <li>Recrutements en cours et conversion : aucune table de recrutement n'existe en base.</li>
                          <li>Complétion de l'onboarding par étape : aucune table de check-list n'existe en base.</li>
                          <li>Taux de présence pointé : aucune table de pointage n'existe en base.</li>
                          <li>Conformité réglementaire : la bibliothèque juridique ne contient que des règles « à vérifier ».</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="panel space-y-4 p-4">
                    <p className="text-sm font-medium">Comparaison explicite</p>
                    {report.metrics.some((m) => m.comparisonNote) && (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {report.metrics
                          .filter((m) => m.delta !== null)
                          .slice(0, 6)
                          .map((m) => (
                            <li key={m.key}>
                              <span className="font-medium text-foreground">{m.label}</span> — {m.comparisonNote}
                            </li>
                          ))}
                      </ul>
                    )}
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} height={60} />
                          <YAxis fontSize={11} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="valeur" name="Période courante" fill="var(--color-primary)" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {compareData.length > 0 && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={compareData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} height={60} />
                            <YAxis fontSize={11} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="période" name="Période courante" fill="var(--color-primary)" radius={4} />
                            <Bar dataKey="précédente" name="Période précédente" fill="var(--color-muted-foreground)" radius={4} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Les jours fériés ne sont pas déduits des jours ouvrés (information absente de la
                      base) : le taux d'absentéisme est marqué « partiel ».
                    </p>
                  </div>

                  {report.alerts.length > 0 && (
                    <div className="panel space-y-2 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="size-4 text-warning-foreground" />
                        Alertes et points d'attention
                      </p>
                      <ul className="space-y-1 text-sm">
                        {report.alerts.map((alert, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">
                              {alert.level}
                            </Badge>
                            <span>
                              {alert.label} — {alert.detail}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="panel space-y-3 p-4">
                    <p className="text-sm font-medium">Sources de la période</p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.sources.map((source) => (
                        <Badge key={source} variant="outline" className="gap-1 text-xs">
                          <Database className="size-3" />
                          {source}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {report.calendarDays} jours calendaires, {report.openDays} jours ouvrés (lundi
                      à vendredi). Aucune causalité n'est déduite des écarts.
                    </p>
                  </div>

                  <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-start gap-2 text-sm">
                      <Info className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Enregistrement du brouillon</p>
                        <p className="text-xs text-muted-foreground">
                          {data.canEdit
                            ? "Le brouillon est enregistré dans l'historique, versionné, avec journal d'audit."
                            : "Enregistrement réservé aux rôles RH (administrateur RH, RH ou manager)."}
                        </p>
                      </div>
                    </div>
                    <Button onClick={saveDraft} disabled={!data.canEdit || !periodPair || errorIfCustom || saving}>
                      <FileDown className="size-4" />
                      {saving ? "Enregistrement…" : "Générer le brouillon"}
                    </Button>
                  </div>

                  <div className="panel space-y-2 p-4 text-sm">
                    <p className="font-medium">Génération Google Slides — Autorisation requise</p>
                    <p className="text-xs text-muted-foreground">
                      Google Slides n'est pas connecté : aucune présentation n'est générée et aucun
                      lien n'est produit tant qu'une autorisation Google réelle n'a pas réussi et
                      que l'envoi n'a pas été confirmé explicitement. Aucun lien n'est jamais simulé.
                    </p>
                  </div>
                </>
              )}

              <div className="panel space-y-3 p-4">
                <p className="text-sm font-medium">Historique des rapports</p>
                {historyQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">Chargement de l'historique…</p>
                )}
                {historyQuery.data && historyQuery.data.reports.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun rapport enregistré pour le moment. Les brouillons générés apparaîtront
                    ici avec leur version, leur période, leurs filtres et leurs sources.
                  </p>
                )}
                {historyQuery.data && historyQuery.data.reports.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Créé le</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyQuery.data.reports.map((reportRow) => (
                        <TableRow key={reportRow.id}>
                          <TableCell className="text-sm">
                            {reportRow.title}
                            {reportRow.is_demo && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                DONNÉES DE DÉMONSTRATION
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{reportRow.period_label}</TableCell>
                          <TableCell className="text-xs capitalize">{reportRow.status}</TableCell>
                          <TableCell className="text-xs tabular-nums">v{reportRow.version}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(reportRow.created_at).toLocaleDateString("fr-FR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
