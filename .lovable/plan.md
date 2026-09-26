# Plan — Module « Rapport hebdomadaire RH » (état vérifié + implémentation)

## État réel vérifié (reconfirmer le 26/09)

**Ce qui existe déjà :**
- Moteur KPI pur et complet (`src/lib/reports/kpi.ts`, `periods.ts`) : effectif actif, nouvelles recrues, départs, rotation, onboarding en cours, contrats à échéance, congés validés, absences, absentéisme (fiabilité partielle), congés en attente, documents manquants/expirés, complétude documentaire, tâches réalisées/en retard, validations en attente, délai moyen de validation. Comparaison à la période précédente, aucun pourcentage si dénominateur nul, indicateurs sans source déclarés « indisponibles », alertes critiques/attention, marquage DEMO.
- Tables créées : `weekly_reports`, `weekly_report_metrics`, `weekly_report_exports` (statuts, rôles, versions, RLS par organisation, horodatages automatiques).

**Ce qui manque (vérifié, y compris par le typecheck) :**
- Erreurs de compilation actives : liens vers `/audit`, `/integrations`, `/parametres` dans la barre latérale et la recherche globale pointent vers des écrans inexistants ; deux accès d'index non sécurisés dans `src/routes/sheets.tsx` (lignes 51-52).
- Aucun écran « Rapports RH » ni entrée de navigation.
- Aucune fonction serveur de lecture des données ni d'enregistrement de rapport.
- Base de données entièrement vide (0 ligne partout : organisation, profils, salariés, congés, intégrations). L'application tourne sur les données de démonstration côté navigateur ; le moteur KPI ne peut rien calculer depuis la base.
- Flux Google Slides inexistant : aucun callback OAuth, aucune création réelle de présentation, aucun test de connexion.
- Aucun test (vitest installé, aucun fichier de test).

**BUILD possible maintenant : oui.** Aucun blocage technique ; le build passe avec des erreurs de typage à corriger au premier lancement. Aucune donnée ne sera simulée : les indicateurs resteront vides ou marqués DEMO tant que la base ne contient rien.

## Plan d'implémentation (en mode Build)

### Étape 0 — Déblocages pré-requis
1. Créer les trois écrans manquants `/integrations`, `/audit`, `/parametres` (statuts honnêtes : « Non connecté », « Autorisation requise », jamais « connecté » sans test réel) et corriger les accès d'index de `sheets.tsx`.
2. Enregistrer l'attachement de jeton authentifié dans `src/start.ts` (requis par les fonctions serveur du module).
3. Migration unique de données de démonstration : organisation démo, salariés, congés, documents, tâches tous marqués « DONNÉES DE DÉMONSTRATION », référentiel des scopes d'intégration. Insérée dans la migration, jamais à la volée.

### Étape 1 — Module Rapports RH
4. Fonctions serveur : lecture du jeu de données du périmètre (filtrée par organisation), création du brouillon de rapport, historique.
5. Écran `/rapports` : sélection de période (semaine courante / précédente / personnalisée / mois), filtres service / site / manager / type de contrat ; aperçu avec cartes KPI, graphiques, tableaux, alertes ; chaque KPI affiche « Voir le calcul » (numérateur, dénominateur, formule, source, période, comparaison, fiabilité) ; gestion du zéro et des données insuffisantes ; badge « DONNÉES DE DÉMONSTRATION » le cas échéant.
6. Trois modèles : RH détaillé, Manager, Direction — mêmes données, aucun chiffre inventé.
7. Brouillon enregistré dans `weekly_reports` + métriques ; historique complet ; RBAC/RLS existants conservés ; agrégation par défaut, aucune donnée individuelle sensible.

### Étape 2 — Google Slides réel
8. Flux d'autorisation Google côté serveur (secrets à ajouter dans Réglages → Secrets), état « Autorisation requise » tant qu'aucun test de lecture réel n'a réussi ; création réelle de présentation après confirmation explicite ; écriture dans `weekly_report_exports` ; jamais de lien simulé.

### Étape 3 — Tests et vérification finale
9. Tests : calculs KPI (zéro, période vide), permissions, Google non autorisé, propositions → confirmation → audit.
10. Vérification : compilation sans erreur, navigation de tous les écrans, requêtes réelles, erreurs évidentes.

Ordre et budget : Étapes 0 et 1 en priorité ; Étapes 2-3 selon budget restant (crédits quotidiens rechargés chaque jour).
