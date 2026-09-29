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
