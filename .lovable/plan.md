# Plan de reprise — MadaRH Copilot (mode Build)

Contexte vérifié le 24/09/2026 : solde Lovable de 5,00 crédits (quotidiens rechargés chaque jour), build précédent OK, mais trois routes déclarées dans la navigation n'existent pas encore, ce qui casse la compilation des liens.

## Objectif
Remettre l'application en état navigable et compilable, puis poursuivre les modules restants par ordre de priorité et selon le budget de crédits disponible.

## Étape 1 — Déblocage de la compilation (priorité absolue)
- Créer `src/routes/integrations.tsx` : état réel des intégrations Slack / Gmail / Google Sheets / GitHub, scopes minimaux, statuts honnêtes (« Non connecté », « Autorisation requise », « Connecté et vérifié » uniquement après test de lecture réel), rappel que GitHub ne stocke jamais de données RH.
- Créer `src/routes/audit.tsx` : journal d'audit (utilisateur, action, ressource, horodatage, succès/échec), accès aux données sensibles journalisés, historique non modifiable.
- Créer `src/routes/parametres.tsx` : organisation, rôles, rétention, secrets côté serveur documentés.
- Corriger les deux accès d'index non sécurisés dans `src/routes/sheets.tsx` (lignes 51-52).
- Vérifier la compilation et la navigation complète.

## Étape 2 — Module « Rapports RH » (si budget suffisant)
- Route « Rapports RH » : sélection semaine courante/précédente/période personnalisée, filtres organisation/service/équipe/manager.
- Brancher le moteur KPI existant (`src/lib/reports/periods.ts`, `src/lib/reports/kpi.ts`) sur les données réelles Lovable Cloud : effectif, recrutements, départs, contrats/documents, congés/absences, tâches, validations.
- Chaque KPI : valeur, définition, numérateur/dénominateur, formule, source, période, comparaison à la période précédente ; « Voir le calcul » ; aucun pourcentage si dénominateur zéro ; « Données insuffisantes » le cas échéant.
- Trois modèles : RH détaillé, Manager, Direction ; aperçu avant export ; marque « DONNÉES DE DÉMONSTRATION » si données démo.
- Historique via `weekly_reports` / `weekly_report_metrics` (migration déjà appliquée) ; RLS par organisation, écriture admin_rh/rh/manager.
- Boutons « Générer le brouillon » puis « Créer dans Google Slides » : réel uniquement après OAuth Google vérifié + confirmation explicite, sinon « Autorisation requise ». Jamais de lien simulé.

## Étape 3 — Flux OAuth et tests (selon budget restant)
- Callbacks OAuth Google/Slack/GitHub côté serveur, secrets dans Réglages → Secrets, tests de santé réels, journal d'audit.
- Tests : proposition → confirmation → audit, KPI (zéro, données vides), permissions, Google non autorisé, masquage des données sensibles.

## Détails techniques
- Stack : TanStack Start, React 19, Tailwind v4, shadcn ; fonctions serveur `createServerFn` ; Lovable Cloud (Supabase) pour Auth/PostgreSQL/RLS.
- Conventions inchangées : propose() → prévisualisation → confirmProposal() → audit ; données sensibles masquées et révélations journalisées ; règles juridiques marquées « à vérifier » ; aucune donnée inventée.
- Vérification finale : compilation sans erreur, navigation de toutes les routes, requêtes base de données, permissions RLS.
