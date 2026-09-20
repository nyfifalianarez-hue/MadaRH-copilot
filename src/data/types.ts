// Types du domaine RH. Ils reflètent le schéma Supabase cible
// (organizations, profiles, employees, ...) afin que le passage aux vraies
// tables ne modifie pas les écrans.

export type Role = "admin_rh" | "gestionnaire" | "manager" | "lecteur";

export type Sensitivity = "normal" | "medical" | "salarial" | "disciplinaire";

export interface Organization {
  id: string;
  name: string;
  country: string;
  demo: true;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
}

export type EmployeeStatus = "actif" | "en_onboarding" | "suspendu" | "sorti";

export interface Employee {
  id: string;
  fullName: string;
  position: string;
  department: string;
  status: EmployeeStatus;
  hiredAt: string;
  contractType: "CDI" | "CDD" | "Stage" | "Prestation";
  email: string;
  phone: string;
  cnaps: string;
  /** Champs confidentiels : masqués par défaut dans l'interface. */
  confidential: {
    grossSalary: string;
    medicalNotes: string;
    disciplinary: string;
  };
  missingDocuments: string[];
}

export type DocumentKind =
  | "contrat"
  | "avenant"
  | "attestation"
  | "certificat_travail"
  | "reponse_demission"
  | "piece_identite"
  | "cnaps"
  | "certificat_medical";

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  kind: DocumentKind;
  label: string;
  status: "present" | "manquant" | "expire";
  sensitivity: Sensitivity;
  updatedAt: string;
}

export type LeaveType =
  | "conge_annuel"
  | "maternite"
  | "paternite"
  | "maladie"
  | "accident_travail"
  | "absence_autorisee"
  | "absence_non_autorisee";

export interface LeaveAbsence {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: "brouillon" | "en_attente" | "valide" | "refuse";
  legalRuleId: string | null;
  note: string;
}

export interface LegalSource {
  id: string;
  name: string;
  publisher: string;
  url: string;
  lastCheckedAt: string;
}

export type RuleStatus = "a_verifier" | "verifie" | "obsolete";

export interface LegalRule {
  id: string;
  topic: string;
  title: string;
  /** Valeur documentaire (ex. « 2,5 jours ouvrables par mois »). */
  statement: string;
  sourceId: string;
  article: string;
  effectiveFrom: string;
  lastCheckedAt: string;
  status: RuleStatus;
  /** 0 à 1. Jamais présenté comme une certitude. */
  confidence: number;
  version: number;
  appliesTo: LeaveType | "contrat" | "general";
}

export interface LegalRuleVersion {
  id: string;
  ruleId: string;
  version: number;
  statement: string;
  status: RuleStatus;
  changedAt: string;
  changedBy: string;
  comment: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "haute" | "moyenne" | "basse";
  employeeId: string | null;
  done: boolean;
  category: "document" | "conge" | "onboarding" | "juridique" | "autre";
}

export type ProposalKind =
  | "document_brouillon"
  | "conge_decision"
  | "envoi_externe"
  | "ecriture_sheets"
  | "publication_regle"
  | "modification_donnee";

export type ProposalStatus = "en_attente" | "confirme" | "rejete";

export interface ActionProposal {
  id: string;
  kind: ProposalKind;
  title: string;
  /** Analyse : pourquoi l'assistant propose cette action. */
  analysis: string;
  /** Prévisualisation exacte de ce qui sera exécuté. */
  preview: string;
  target: string;
  legalRuleIds: string[];
  status: ProposalStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  requiresExternalCall: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  sensitive: boolean;
  detail: string;
}

export interface IntegrationScope {
  name: string;
  purpose: string;
  granted: boolean;
}

export interface Integration {
  id: "slack" | "gmail" | "google_sheets";
  name: string;
  status: "non_connecte" | "connecte" | "erreur";
  description: string;
  scopes: IntegrationScope[];
  secretPlaceholders: string[];
}

export interface GeneratedDocument {
  id: string;
  employeeId: string;
  kind: DocumentKind;
  title: string;
  status: "brouillon" | "valide";
  createdAt: string;
  body: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  position: string;
  stage: "candidature" | "entretien" | "offre" | "onboarding";
  checklist: { label: string; done: boolean }[];
}

export interface Settings {
  organizationName: string;
  retentionMonths: number;
  maskConfidential: boolean;
  requireConfirmation: boolean;
  demoMode: boolean;
  mfaReady: boolean;
}
