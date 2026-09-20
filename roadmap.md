# MadaRH Compliance — feuille de route

## En cours
- [x] Design system RH sobre (tokens oklch)
- [x] Couche de données DEMO + moteur de propositions/audit
- [x] Coquille applicative : sidebar, recherche globale (Ctrl+K), bannière juridique, bandeau DEMO
- [x] 11 modules navigables
- [x] README (architecture, sécurité, env, GitHub/Supabase, OAuth, sauvegardes, déploiement)
- [x] Tests de base des flux sensibles (proposition → confirmation → audit, masquage, règles juridiques)
- [x] Vérification des écrans et des erreurs évidentes

## Ouvert (bloqué)
- Backend Supabase (tables, RLS, seed DEMO) : nécessite l'activation du backend Lovable Cloud — à proposer à l'utilisateur.
- Intégrations Slack / Gmail / Google Sheets : interface + service placeholder documentés ; branchement réel bloqué par l'absence de secrets OAuth.
