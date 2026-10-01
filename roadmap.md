# MadaRH Compliance — feuille de route

## En cours
- [x] Design system RH sobre (tokens oklch)
- [x] Couche de données DEMO + moteur de propositions/audit
- [x] Coquille applicative : sidebar, recherche globale (Ctrl+K), bannière juridique, bandeau DEMO
- [x] 11 modules navigables
- [x] Backend Supabase réel : authentification, tables, RLS par organisation et par rôle
- [x] Attachement du jeton de session aux fonctions serveur (src/start.ts)
- [x] Module Rapport hebdomadaire RH : moteur KPI pur, fonctions serveur, écran /rapports
- [x] Écrans Audit & sécurité, Intégrations, Paramètres (données réelles, états honnêtes)
- [x] Tests vitest : périodes, KPI (zéro, vides, démo), intégrations (statuts honnêtes)
- [x] Vérification finale : typecheck OK, 32 tests vitest OK, build OK, 4 écrans vérifiés dans le navigateur (états « Connexion requise » honnêtes sans session)

## Ouvert
- [x] Module Rapports : historique détaillé (filtres, sources, métriques enregistrées).
- Google Slides réel : flux OAuth Google à brancher quand les secrets sont définis ; l'état reste
  « Autorisation requise » et aucun lien n'est simulé tant qu'aucun test de lecture n'a réussi.
- Intégrations Slack / Gmail / Google Sheets : flux OAuth prêts côté serveur ; clés à ajouter dans
  les réglages du projet.
