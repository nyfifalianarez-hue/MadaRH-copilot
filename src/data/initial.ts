// État initial vide de l'espace de travail local.
// Aucune donnée fictive : collaborateurs, tâches, congés, règles et indicateurs
// proviennent uniquement de la base de données. Si elle est vide, les écrans
// affichent un état vide explicite.

import type {
  ActionProposal,
  AuditLog,
  Candidate,
  Employee,
  EmployeeDocument,
  GeneratedDocument,
  Integration,
  LeaveAbsence,
  LegalRule,
  LegalRuleVersion,
  LegalSource,
  Organization,
  Profile,
  Settings,
  Task,
} from "./types";

export const initialOrganization: Organization = {
  id: "",
  name: "Organisation non configurée",
  country: "Madagascar",
};

export const initialProfile: Profile = {
  id: "",
  fullName: "Utilisateur",
  email: "",
  role: "collaborateur",
  mfaEnabled: false,
};

export const initialEmployees: Employee[] = [];
export const initialDocuments: EmployeeDocument[] = [];
export const initialSources: LegalSource[] = [];
export const initialRules: LegalRule[] = [];
export const initialRuleVersions: LegalRuleVersion[] = [];
export const initialLeaves: LeaveAbsence[] = [];
export const initialTasks: Task[] = [];
export const initialProposals: ActionProposal[] = [];
export const initialAudit: AuditLog[] = [];
export const initialIntegrations: Integration[] = [];
export const initialGeneratedDocuments: GeneratedDocument[] = [];
export const initialCandidates: Candidate[] = [];

export const initialSettings: Settings = {
  organizationName: initialOrganization.name,
  retentionMonths: 60,
  maskConfidential: true,
  requireConfirmation: true,
  mfaReady: true,
};
