# MadaRH Copilot

Construis l'application "MadaRH Compliance" selon le cahier des charges fourni par l'utilisateur. Crée un MVP complet et réellement navigable, en français, pour un administrateur RH à Madagascar.

PRINCIPES ABSOLUS :
1. L'application est un copilote RH, pas un exécuteur aveugle.
2. Toute action externe ou modification de données passe par : analyse -> proposition -> prévisualisation -> confirmation -> exécution -> audit.
3. Ne jamais altérer silencieusement les données d'un collègue.
4. Ne jamais exposer inutilement une donnée personnelle/confidentielle.
5. GitHub = code/migrations/documentation/versioning, jamais base de données RH de production.
6. Supabase = données de production, Auth, PostgreSQL, Storage, RLS, Edge Functions.
7. Les règles juridiques sont versionnées et sourcées ; ne jamais inventer une durée, un droit ou une obligation. Afficher source, article, date de vérification, date d'effet, statut et niveau de confiance.
8. Pour le droit malgache, afficher une bannière indiquant que l'information est documentaire et doit être vérifiée sur la source officielle applicable.

MODULES MVP :
- Dashboard : tâches, validations, alertes, documents manquants, congés/absences, changements juridiques.
- Assistant RH conversationnel avec suggestions : congé, maladie, accident du travail, maternité/paternité, formule Google Sheets, contrat, relance, vérification juridique.
- Collaborateurs : fiche, documents, statut administratif, historique.
- Recrutement/onboarding : checklist et documents.
- Contrats/Documents : contrat, avenant, attestation, certificat de travail, réponse à démission, génération en brouillon.
- Congés & absences : annuel, maternité, paternité, maladie, accident du travail, absence autorisée/non autorisée ; règles venant uniquement de la bibliothèque juridique.
- Veille juridique : sources, textes, articles, versions, dates, statut, confiance, historique et révision avant publication.
- Google Sheets Assistant : expliquer/corriger/générer des formules, prévisualiser avant modification.
- Intégrations : Slack/Gmail/Google Sheets, OAuth/scopes minimaux, prévisualisation avant envoi/écriture.
- Audit & sécurité : rôles, permissions, journal d'audit, intégrations, événements sensibles.
- Paramètres.

SÉCURITÉ :
Supabase Auth, RBAC, RLS, moindre privilège, audit_logs immuables autant que possible, séparation des données médicales/salariales/disciplinaires, masquage, rétention configurable, MFA-ready. Données DEMO uniquement et explicitement marquées.

TABLES SUPABASE :
organizations, profiles, employees, employee_documents, leave_absences, legal_rules, legal_rule_versions, legal_sources, tasks, action_proposals, audit_logs, integrations, integration_scopes, generated_documents, settings. Ajouter FK, contraintes, index, RLS et seed DEMO.

ARCHITECTURE :
React + TypeScript + Tailwind + shadcn. Edge Functions pour opérations serveur sensibles. Variables secrètes uniquement côté serveur. API placeholders sécurisés pour IA et intégrations.

UX :
Sidebar, recherche globale, raccourcis clavier, assistant central, cartes de synthèse, filtres, loading/error/empty states, responsive. Style professionnel RH, sobre et moderne.

Ajouter un README expliquant architecture, sécurité, variables d'environnement, GitHub, Supabase, OAuth, sauvegardes et déploiement. Ajouter tests de base pour les flux sensibles.

Le cahier des charges fourni doit guider les fonctionnalités, mais ses affirmations juridiques ne doivent pas être traitées comme automatiquement vérifiées. Construis l'application maintenant, puis vérifie les erreurs évidentes et améliore la cohérence UX avant de terminer.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aa1d570b-61c2-4854-ae99-4f6b4adb5970).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
