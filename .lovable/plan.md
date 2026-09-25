# Plan — Module « Rapport hebdomadaire RH » (état vérifié + implémentation)

## État réel vérifié ce jour

**Ce qui existe déjà :**
- Moteur KPI pur et complet (`src/lib/reports/kpi.ts`, `periods.ts`) : effectif actif, nouvelles recrues, départs, rotation, onboarding en cours, contrats à échéance, congés validés, absences, absentéisme (fiabilité partielle), congés en attente, documents manquants/expirés, complétude documentaire, tâches réalisées/en retard, validations en attente, délai moyen de validation. Comparaison à la période précédente, aucun pourcentage si dénominateur nul, indicateurs sans source déclarés « indisponibles », alertes critiques/attention, marquage DEMO.
- Tables créées : `weekly_reports`, `weekly_report_metrics`, `weekly_report_exports` (rôles, statuts, versions, RLS par organisation, horodatages automatiques).

**Ce qui manque (vérifié) :**
- Aucun écran « Rapports RH » : pas de route, pas d'entrée dans la barre latérale ni la recherche globale.
- Aucune fonction serveur : aucune lecture des données ni enregistrement de rapport n'existe dans le projet.
- Base de données entièrement vide (0 ligne partout : organisation, profils, salariés, congés, documents, tâches, intégrations). L'application tourne encore sur les données de démonstration côté navigateur ; le moteur KPI ne peut rien calculer depuis la base.
- Flux Google Slides inexistant : aucun callback OAuth, aucune création réelle de présentation, aucun test de connexion.
- Trois écrans annoncés absents : `/integrations`, `/audit`, `/parametres` (liens brisés dans la barre latérale et la recherche globale).
- Aucun test (vitest installé mais aucun fichier de test).

**BUILD possible maintenant : oui.** Solde 5,00 crédits (quotidiens 5/5), build actuel OK, aucun blocage technique. En mode Plan, chaque message coûte 1 crédit.

## Plan d'implémentation (en mode Build)

### Étape 0 — Déblocages pré-requis
1. Créer les trois écrans manquants `/integrations`, `/audit`, `/parametres` (navigation honnête : « Non connecté », « Autorisation requise », jamais « connecté » sans test réel).
2. Enregistrer l'attachement de jeton authentifié dans `src/start.ts` (les fonctions serveur du module en dépendent).
3. Migration unique de données de démonstration : organisation démo, salariés, congés, documents, tâches tous marqués « DONNÉES DE DÉMONSTRATION » (`is_demo = vrai`), référentiel des scopes d'intégration. Insérée dans la migration, jamais à la volée.

### Étape 1 — Module Rapports RH
4. Fonctions serveur : lecture du jeu de données du périmètre (salariés, congés, documents, tâches, propositions, filtrées par organisation), création du brouillon de rapport, historique des rapports.
5. Écran `/rapports` : sélection de période (semaine courante / précédente / personnalisée / mois), filtres service / site / manager / type de contrat ; aperçu avec cartes KPI, graphiques, tableaux, alertes et points d'attention ; chaque KPI affiche « Voir le calcul » (numérateur, dénominateur, formule, source, période, comparaison, fiabilité) ; gestion propre du zéro et des données insuffisantes ; badge « DONNÉES DE DÉMONSTRATION » le cas échéant.
6. Trois modèles : RH détaillé, Manager, Direction (contenu adapté par modèle, mêmes données, aucun chiffre inventé).
7. Brouillon enregistré dans `weekly_reports` + métriques ; historique complet (auteur, version, période, filtres, sources, statut) ; RBAC/RLS existants conservés ; agrégation par défaut, aucune donnée individuelle sensible.

### Étape 2 — Google Slides réel
8. Flux d'autorisation Google côté serveur (secrets à ajouter dans Réglages → Secrets), état « Autorisation requise » tant qu'aucun test de lecture réel n'a réussi ; création réelle de présentation après confirmation explicite ; écriture dans `weekly_report_exports` ; jamais de lien simulé ni de statut « connecté » non vérifié.

### Étape 3 — Tests et vérification finale
9. Tests : calculs KPI (zéro, période vide, données manquantes), permissions, Google non autorisé, propositions → confirmation → audit.
10. Vérification : compilation, navigation de tous les écrans, requêtes réelles, erreurs évidentes.

Ordre et budget : Étapes 0 et 1 en priorité (cœur du module), Étapes 2-3 selon budget restant ; les crédits quotidiens se rechargent chaque jour.
