/**
 * Couche de données DEMO + moteur de propositions.
 *
 * Principe : toute action externe ou modification de donnée passe par
 * analyse -> proposition -> prévisualisation -> confirmation -> exécution -> audit.
 * `propose()` ne modifie jamais les données ; seul `confirmProposal()` exécute,
 * et il journalise systématiquement.
 *
 * Aucune règle juridique n'est codée en dur ici : les durées et droits sont
 * lus dans la bibliothèque juridique (`legalRules`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  demoAudit,
  demoCandidates,
  demoDocuments,
  demoEmployees,
  demoGeneratedDocuments,
  demoIntegrations,
  demoLeaves,
  demoOrganization,
  demoProfile,
  demoProposals,
  demoRuleVersions,
  demoRules,
  demoSettings,
  demoSources,
  demoTasks,
} from "./demo";
import type {
  ActionProposal,
  AuditLog,
  Candidate,
  Employee,
  EmployeeDocument,
  GeneratedDocument,
  Integration,
  LeaveAbsence,
  LeaveType,
  LegalRule,
  LegalRuleVersion,
  LegalSource,
  ProposalKind,
  Settings,
  Task,
} from "./types";

export interface NewProposal {
  kind: ProposalKind;
  title: string;
  analysis: string;
  preview: string;
  target: string;
  legalRuleIds?: string[];
  requiresExternalCall?: boolean;
  /** Effet appliqué seulement après confirmation. */
  effect?: ProposalEffect;
}

export type ProposalEffect =
  | { type: "leave_status"; leaveId: string; status: LeaveAbsence["status"] }
  | { type: "generate_document"; document: GeneratedDocument }
  | { type: "complete_task"; taskId: string }
  | { type: "publish_rule"; ruleId: string; statement: string; comment: string };

interface StoreValue {
  organization: typeof demoOrganization;
  profile: typeof demoProfile;
  employees: Employee[];
  documents: EmployeeDocument[];
  leaves: LeaveAbsence[];
  legalRules: LegalRule[];
  legalRuleVersions: LegalRuleVersion[];
  legalSources: LegalSource[];
  tasks: Task[];
  proposals: ActionProposal[];
  auditLogs: AuditLog[];
  integrations: Integration[];
  generatedDocuments: GeneratedDocument[];
  candidates: Candidate[];
  settings: Settings;
  propose: (input: NewProposal) => ActionProposal;
  confirmProposal: (id: string) => void;
  rejectProposal: (id: string, reason?: string) => void;
  toggleTask: (id: string) => void;
  logSensitiveAccess: (target: string, detail: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  ruleFor: (type: LeaveType | "contrat" | "general") => LegalRule | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [employees] = useState<Employee[]>(demoEmployees);
  const [documents] = useState<EmployeeDocument[]>(demoDocuments);
  const [leaves, setLeaves] = useState<LeaveAbsence[]>(demoLeaves);
  const [legalRules, setLegalRules] = useState<LegalRule[]>(demoRules);
  const [legalRuleVersions, setLegalRuleVersions] =
    useState<LegalRuleVersion[]>(demoRuleVersions);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [proposals, setProposals] = useState<ActionProposal[]>(demoProposals);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(demoAudit);
  const [generatedDocuments, setGeneratedDocuments] =
    useState<GeneratedDocument[]>(demoGeneratedDocuments);
  const [candidates] = useState<Candidate[]>(demoCandidates);
  const [settings, setSettings] = useState<Settings>(demoSettings);
  const [effects, setEffects] = useState<Record<string, ProposalEffect | undefined>>({});

  const appendAudit = useCallback((entry: Omit<AuditLog, "id" | "at" | "actor">) => {
    setAuditLogs((prev) => [
      {
        id: nextId("aud"),
        at: new Date().toISOString(),
        actor: demoProfile.fullName,
        ...entry,
      },
      ...prev,
    ]);
  }, []);

  const propose = useCallback(
    (input: NewProposal) => {
      const proposal: ActionProposal = {
        id: nextId("prop"),
        kind: input.kind,
        title: input.title,
        analysis: input.analysis,
        preview: input.preview,
        target: input.target,
        legalRuleIds: input.legalRuleIds ?? [],
        status: "en_attente",
        createdAt: new Date().toISOString(),
        decidedAt: null,
        decidedBy: null,
        requiresExternalCall: input.requiresExternalCall ?? false,
      };
      setProposals((prev) => [proposal, ...prev]);
      setEffects((prev) => ({ ...prev, [proposal.id]: input.effect }));
      appendAudit({
        action: "Proposition créée",
        target: `${proposal.id} · ${proposal.title}`,
        sensitive: false,
        detail: "Aucune donnée modifiée à ce stade.",
      });
      return proposal;
    },
    [appendAudit],
  );

  const applyEffect = useCallback((effect: ProposalEffect) => {
    switch (effect.type) {
      case "leave_status":
        setLeaves((prev) =>
          prev.map((l) => (l.id === effect.leaveId ? { ...l, status: effect.status } : l)),
        );
        break;
      case "generate_document":
        setGeneratedDocuments((prev) => [effect.document, ...prev]);
        break;
      case "complete_task":
        setTasks((prev) => prev.map((t) => (t.id === effect.taskId ? { ...t, done: true } : t)));
        break;
      case "publish_rule": {
        setLegalRules((prev) =>
          prev.map((r) =>
            r.id === effect.ruleId
              ? {
                  ...r,
                  statement: effect.statement,
                  version: r.version + 1,
                  lastCheckedAt: new Date().toISOString().slice(0, 10),
                }
              : r,
          ),
        );
        setLegalRuleVersions((prev) => {
          const rule = demoRules.find((r) => r.id === effect.ruleId);
          return [
            {
              id: nextId("ver"),
              ruleId: effect.ruleId,
              version: (rule?.version ?? 1) + 1,
              statement: effect.statement,
              status: "a_verifier",
              changedAt: new Date().toISOString(),
              changedBy: demoProfile.fullName,
              comment: effect.comment,
            },
            ...prev,
          ];
        });
        break;
      }
    }
  }, []);

  const confirmProposal = useCallback(
    (id: string) => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal || proposal.status !== "en_attente") return;
      const effect = effects[id];
      if (effect) applyEffect(effect);
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "confirme",
                decidedAt: new Date().toISOString(),
                decidedBy: demoProfile.fullName,
              }
            : p,
        ),
      );
      appendAudit({
        action: proposal.requiresExternalCall
          ? "Action externe confirmée (simulation DEMO)"
          : "Proposition confirmée et exécutée",
        target: `${proposal.id} · ${proposal.title}`,
        sensitive: proposal.kind === "modification_donnee",
        detail: proposal.requiresExternalCall
          ? "Intégration non connectée : aucun appel réel n'a été effectué."
          : `Effet appliqué : ${effect?.type ?? "aucun"}.`,
      });
    },
    [appendAudit, applyEffect, effects, proposals],
  );

  const rejectProposal = useCallback(
    (id: string, reason?: string) => {
      const proposal = proposals.find((p) => p.id === id);
      if (!proposal || proposal.status !== "en_attente") return;
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "rejete",
                decidedAt: new Date().toISOString(),
                decidedBy: demoProfile.fullName,
              }
            : p,
        ),
      );
      appendAudit({
        action: "Proposition rejetée",
        target: `${proposal.id} · ${proposal.title}`,
        sensitive: false,
        detail: reason ?? "Aucune donnée modifiée.",
      });
    },
    [appendAudit, proposals],
  );

  const toggleTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
      appendAudit({
        action: "Tâche mise à jour",
        target: id,
        sensitive: false,
        detail: "Changement d'état interne de la tâche.",
      });
    },
    [appendAudit],
  );

  const logSensitiveAccess = useCallback(
    (target: string, detail: string) => {
      appendAudit({
        action: "Consultation de donnée confidentielle",
        target,
        sensitive: true,
        detail,
      });
    },
    [appendAudit],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      appendAudit({
        action: "Paramètres modifiés",
        target: Object.keys(patch).join(", "),
        sensitive: false,
        detail: "Modification de la configuration de l'espace RH.",
      });
    },
    [appendAudit],
  );

  const ruleFor = useCallback(
    (type: LeaveType | "contrat" | "general") => legalRules.find((r) => r.appliesTo === type),
    [legalRules],
  );

  const value = useMemo<StoreValue>(
    () => ({
      organization: demoOrganization,
      profile: demoProfile,
      employees,
      documents,
      leaves,
      legalRules,
      legalRuleVersions,
      legalSources: demoSources,
      tasks,
      proposals,
      auditLogs,
      integrations: demoIntegrations,
      generatedDocuments,
      candidates,
      settings,
      propose,
      confirmProposal,
      rejectProposal,
      toggleTask,
      logSensitiveAccess,
      updateSettings,
      ruleFor,
    }),
    [
      auditLogs,
      candidates,
      confirmProposal,
      documents,
      employees,
      generatedDocuments,
      leaves,
      legalRuleVersions,
      legalRules,
      logSensitiveAccess,
      propose,
      proposals,
      rejectProposal,
      ruleFor,
      settings,
      tasks,
      toggleTask,
      updateSettings,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>.");
  return ctx;
}

export function employeeName(employees: Employee[], id: string | null): string {
  if (!id) return "—";
  return employees.find((e) => e.id === id)?.fullName ?? "Collaborateur inconnu";
}
