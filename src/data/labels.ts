import type {
  DocumentKind,
  EmployeeStatus,
  LeaveType,
  ProposalKind,
  ProposalStatus,
  Role,
  RuleStatus,
} from "./types";

export const leaveTypeLabels: Record<LeaveType, string> = {
  conge_annuel: "Congé annuel",
  maternite: "Congé de maternité",
  paternite: "Congé de paternité",
  maladie: "Congé maladie",
  accident_travail: "Accident du travail",
  absence_autorisee: "Absence autorisée",
  absence_non_autorisee: "Absence non autorisée",
};

export const documentKindLabels: Record<DocumentKind, string> = {
  contrat: "Contrat de travail",
  avenant: "Avenant",
  attestation: "Attestation d'emploi",
  certificat_travail: "Certificat de travail",
  reponse_demission: "Réponse à démission",
  piece_identite: "Pièce d'identité",
  cnaps: "Affiliation CNaPS",
  certificat_medical: "Certificat médical",
};

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  actif: "Actif",
  en_onboarding: "En onboarding",
  suspendu: "Suspendu",
  sorti: "Sorti",
};

export const roleLabels: Record<Role, string> = {
  admin_rh: "Administrateur RH",
  gestionnaire: "Gestionnaire RH",
  manager: "Manager",
  lecteur: "Lecteur",
};

export const ruleStatusLabels: Record<RuleStatus, string> = {
  a_verifier: "À vérifier",
  verifie: "Vérifié",
  obsolete: "Obsolète",
};

export const proposalKindLabels: Record<ProposalKind, string> = {
  document_brouillon: "Génération de brouillon",
  conge_decision: "Décision congé / absence",
  envoi_externe: "Envoi externe",
  ecriture_sheets: "Écriture Google Sheets",
  publication_regle: "Publication de règle juridique",
  modification_donnee: "Modification de donnée",
};

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  en_attente: "En attente de confirmation",
  confirme: "Confirmée",
  rejete: "Rejetée",
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${formatDate(date.toISOString())} ${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes(),
  ).padStart(2, "0")}`;
}
