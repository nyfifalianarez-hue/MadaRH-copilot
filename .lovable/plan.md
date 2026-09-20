# MadaRH Compliance — plan de construction

## Ce que vous obtiendrez

Une application RH complète en français pour un administrateur RH à Madagascar, avec une barre latérale, une recherche globale, un assistant RH central et onze espaces de travail. L'application se comporte comme un copilote : elle analyse, propose, montre un aperçu, puis attend votre confirmation avant toute action ou modification.

## Étape 1 — Base visuelle et navigation (immédiat)

- Identité sobre et professionnelle : palette bleu ardoise / vert validation / ambre alerte, typographie lisible, densité « outil de travail ».
- Barre latérale avec les onze espaces, en-tête avec recherche globale (Ctrl+K), raccourcis clavier, bandeau « Données DEMO ».
- Bannière juridique permanente : l'information est documentaire et doit être vérifiée sur la source officielle applicable.
- États de chargement, d'erreur et vides partout ; responsive mobile et bureau.

## Étape 2 — Les modules

1. **Tableau de bord** — cartes de synthèse : tâches, validations en attente, alertes, documents manquants, congés en cours, changements juridiques récents.
2. **Assistant RH** — conversation avec suggestions rapides (congé, maladie, accident du travail, maternité/paternité, formule Google Sheets, contrat, relance, vérification juridique). Chaque réponse cite la règle utilisée ou dit clairement qu'elle ne sait pas.
3. **Collaborateurs** — liste filtrable, fiche détaillée, documents, statut administratif, historique. Données sensibles (médical, salaire, disciplinaire) masquées par défaut avec révélation tracée.
4. **Recrutement & onboarding** — checklists par candidat et documents à collecter.
5. **Contrats & documents** — génération en **brouillon uniquement** : contrat, avenant, attestation, certificat de travail, réponse à démission.
6. **Congés & absences** — annuel, maternité, paternité, maladie, accident du travail, absence autorisée / non autorisée. Les droits et durées proviennent exclusivement de la bibliothèque juridique, jamais d'une valeur codée en dur.
7. **Veille juridique** — sources, textes, articles, versions, date de vérification, date d'effet, statut, niveau de confiance, historique, révision avant publication.
8. **Assistant Google Sheets** — expliquer, corriger, générer une formule, avec aperçu avant toute écriture.
9. **Intégrations** — Slack, Gmail, Google Sheets : état de connexion, portées minimales affichées, aperçu obligatoire avant envoi ou écriture.
10. **Audit & sécurité** — rôles, permissions, journal d'audit chronologique, événements sensibles, rétention.
11. **Paramètres** — organisation, rétention, masquage, préférences.

Un fil conducteur traverse tout : les **propositions d'action**. Toute action externe ou écriture crée une proposition visible (analyse → proposition → aperçu → confirmation → exécution → audit), consultable et confirmable depuis le tableau de bord.

## Étape 3 — Données et backend

Cette première version fonctionne sur un jeu de **données DEMO** explicitement marqué, ce qui permet de valider tout le parcours immédiatement.

Le backend Lovable Cloud (base de données, comptes utilisateurs, fonctions serveur) sera activé dans une seconde passe, avec le schéma complet demandé : organizations, profiles, employees, employee_documents, leave_absences, legal_rules, legal_rule_versions, legal_sources, tasks, action_proposals, audit_logs, integrations, integration_scopes, generated_documents, settings — clés étrangères, contraintes, index, sécurité par ligne et jeu de démonstration. Je vous le proposerai dès que l'interface sera validée, pour éviter de figer un schéma avant d'avoir vu les écrans.

## Détails techniques

- React + TypeScript + Tailwind + shadcn sur TanStack Start ; une route par module.
- Couche de données isolée (`src/data/`) pour que le passage aux vraies tables ne touche pas les écrans.
- Aucune clé secrète côté navigateur ; les appels IA et intégrations passeront par des fonctions serveur.
- README : architecture, sécurité, variables d'environnement, GitHub vs base de production, OAuth, sauvegardes, déploiement.
- Tests de base sur les flux sensibles : cycle de proposition, masquage des données sensibles, absence de règle juridique codée en dur.

## Hypothèses

- Aucune affirmation juridique du cahier des charges n'est publiée comme vérifiée : chaque règle DEMO porte un statut « à vérifier » et un niveau de confiance.
- Pas de multi-organisation à ce stade : une organisation DEMO unique.
