import { describe, expect, it } from "vitest";

import { providerList, providers, statusLabels } from "./integrations.config";

describe("configuration des intégrations", () => {
  it("chaque fournisseur déclare ses secrets requis (jamais de valeur en dur)", () => {
    for (const provider of providerList) {
      expect(provider.requiredSecrets.length).toBeGreaterThan(0);
      for (const secret of provider.requiredSecrets) {
        expect(secret).toMatch(/^[A-Z0-9_]+$/);
      }
    }
  });

  it("chaque fournisseur déclare au moins un test de santé de lecture", () => {
    for (const provider of providerList) {
      expect(provider.healthCheckLabel.length).toBeGreaterThan(0);
    }
  });

  it("GitHub est déclaré interdit comme stockage de données RH", () => {
    expect(providers.github.dataPolicy).toContain("Interdit");
  });

  it("les écritures sont explicitement identifiées", () => {
    for (const provider of providerList) {
      expect(provider.scopes.some((s) => s.isWrite === false)).toBe(true);
    }
  });

  it("les états affichés sont honnêtes et complets", () => {
    expect(statusLabels.non_connecte).toBe("Non connecté");
    expect(statusLabels.autorisation_requise).toBe("Autorisation requise");
    expect(statusLabels.connecte_verifie).toBe("Connecté et vérifié");
    expect(statusLabels).not.toHaveProperty("connecte");
  });
});

describe("Google Slides (rapport hebdomadaire)", () => {
  it("demande des habilitations minimales, sans accès Drive complet", () => {
    const scopes = providers.google_slides.scopes.map((s) => s.scope);
    expect(scopes).toContain("https://www.googleapis.com/auth/presentations");
    expect(scopes).toContain("https://www.googleapis.com/auth/drive.file");
    expect(scopes).not.toContain("https://www.googleapis.com/auth/drive");
  });

  it("n'envoie que des indicateurs agrégés et n'affiche aucun lien simulé", () => {
    expect(providers.google_slides.dataPolicy).toContain("agrégés");
    expect(providers.google_slides.dataPolicy).toContain("Aucun lien");
  });
});
