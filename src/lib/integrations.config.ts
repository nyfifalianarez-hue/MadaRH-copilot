/**
 * Configuration des intégrations externes (sans secret) — importable côté navigateur.
 * Aucune donnée n'est simulée : chaque appel réel dépend d'une autorisation OAuth effective.
 */
export type ProviderId = "slack" | "gmail" | "google_sheets" | "github";

export interface ProviderScope {
  scope: string;
  purpose: string;
  isWrite: boolean;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  description: string;
  /** Noms des secrets serveur requis pour lancer le flux OAuth. */
  requiredSecrets: string[];
  scopes: ProviderScope[];
  /** Ce que vérifie le test de santé (lecture réelle, sans écriture). */
  healthCheckLabel: string;
  /** GitHub : code, migrations, documentation. Jamais de données RH de production. */
  dataPolicy: string;
}

export const providers: Record<ProviderId, ProviderConfig> = {
  slack: {
    id: "slack",
    label: "Slack",
    description: "Notifications RH vers un canal, après prévisualisation et confirmation explicite.",
    requiredSecrets: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    scopes: [
      { scope: "chat:write", purpose: "Publier un message validé dans un canal", isWrite: true },
      { scope: "channels:read", purpose: "Lister les canaux publics pour choisir la destination", isWrite: false },
    ],
    healthCheckLabel: "Lecture de l'identité de l'espace de travail (auth.test)",
    dataPolicy: "Aucune donnée sensible (salaire, médical, disciplinaire) n'est envoyée.",
  },
  gmail: {
    id: "gmail",
    label: "Gmail",
    description: "Envoi d'un courriel RH, uniquement après prévisualisation et confirmation.",
    requiredSecrets: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    scopes: [
      { scope: "https://www.googleapis.com/auth/gmail.send", purpose: "Envoyer un courriel confirmé", isWrite: true },
      { scope: "https://www.googleapis.com/auth/userinfo.email", purpose: "Identifier le compte autorisé", isWrite: false },
    ],
    healthCheckLabel: "Lecture du profil Gmail du compte autorisé",
    dataPolicy: "Le contenu envoyé est celui affiché en prévisualisation, rien de plus.",
  },
  google_sheets: {
    id: "google_sheets",
    label: "Google Sheets",
    description: "Lecture et écriture de cellules, l'écriture exigeant une confirmation explicite.",
    requiredSecrets: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    scopes: [
      { scope: "https://www.googleapis.com/auth/spreadsheets", purpose: "Lire et écrire les plages confirmées", isWrite: true },
      { scope: "https://www.googleapis.com/auth/userinfo.email", purpose: "Identifier le compte autorisé", isWrite: false },
    ],
    healthCheckLabel: "Lecture du compte Google autorisé (userinfo)",
    dataPolicy: "Aucune écriture sans aperçu exact de la plage et des valeurs.",
  },
  github: {
    id: "github",
    label: "GitHub",
    description: "Code, migrations, documentation et versioning. Jamais de stockage de données RH.",
    requiredSecrets: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    scopes: [
      { scope: "read:user", purpose: "Identifier le compte autorisé", isWrite: false },
      { scope: "repo", purpose: "Lire le dépôt de code et sa documentation", isWrite: false },
    ],
    healthCheckLabel: "Lecture du compte GitHub autorisé (/user)",
    dataPolicy:
      "Interdit comme base de données RH : aucun dossier salarié, document confidentiel ou export RH n'est poussé vers GitHub.",
  },
};

export const providerList = Object.values(providers);

export const statusLabels = {
  non_connecte: "Non connecté",
  autorisation_requise: "Autorisation requise",
  en_attente_autorisation: "En attente d'autorisation",
  connecte_verifie: "Connecté et vérifié",
  erreur: "Erreur de connexion",
} as const;

export type IntegrationStatus = keyof typeof statusLabels;
