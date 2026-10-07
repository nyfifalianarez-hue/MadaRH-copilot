# Rapport hebdomadaire RH — corrections prioritaires de fiabilité

## Constats vérifiés
- 17 indicateurs sont calculés par le serveur à partir de la base. Chacun indique sa formule, son numérateur, son dénominateur et sa source. La base est encore vide : aucun rapport réel n'a été produit.
- Seule la lecture des collaborateurs exclut les lignes marquées « démo ». Les congés, documents, tâches et validations sont lus sans ce filtre. Ils peuvent donc compter des éléments liés à des collaborateurs exclus du rapport.
- Le taux de rotation divise les départs par l'effectif actif en fin de période, et non par un effectif moyen. Ce choix n'est pas affiché comme une limite.
- L'absentéisme ne déduit pas les jours fériés. Il est déjà marqué « partiel », ce qui est correct.
- Tout nouveau compte reçoit d'abord le rôle « collaborateur ». Il devient administrateur RH seulement lors de sa première connexion par la page Compte. Ce parcours n'a jamais été testé avec un vrai compte.
- Google Sheets : l'écran vérifie un statut « connecte » qui n'existe pas dans la liste des statuts. Le statut réel s'appelle « connecte_verifie ». L'écran affiche donc toujours « non connecté », ce qui est sûr mais incohérent.
- Google Slides : le texte « Autorisation requise » est affiché et aucun lien n'est simulé. La table d'export existe. En revanche, rien ne prépare encore le contenu des diapositives ni les graphiques.

## Corrections prioritaires
1. **Cohérence des données** : ne compter les congés, documents et tâches que pour les collaborateurs réellement inclus dans le rapport, avec les mêmes filtres de service, de site et de manager.
2. **Transparence des formules** : préciser la base du taux de rotation (effectif en fin de période) dans « Voir le calcul ». Marquer comme « partiel » tout indicateur au dénominateur incertain.
3. **Tests** : ajouter des tests pour un collaborateur exclu, un congé non validé, un contrat sans fin, un salarié sans service, une période sans données et un dénominateur à zéro.
4. **Google Sheets** : utiliser le vrai statut « Connecté et vérifié ». Aucune lecture ni écriture tant que la connexion n'est pas réelle.
5. **Préparation de Google Slides, sans appel externe** :
   - construire depuis le brouillon enregistré un aperçu local des diapositives pour chaque modèle (RH, Manager, Direction) : titre, période, auteur, cartes d'indicateurs, alertes ;
   - préparer les graphiques à partir des seules valeurs enregistrées ;
   - masquer un graphique dont la valeur ou la période précédente manque, avec la mention « Données insuffisantes » ;
   - exclure toujours les données nominatives, médicales, disciplinaires et salariales ;
   - afficher un écran listant exactement les données qui seraient envoyées. Le bouton « Créer dans Google Slides » reste désactivé avec la mention « Autorisation requise ».
6. **Vérification de bout en bout** avec un vrai compte : connexion, création de l'espace, rapport vide, enregistrement d'un brouillon, historique, puis journal d'audit.

## Hors périmètre (bloqué)
- **Création réelle des présentations Google Slides** : aucune connexion Google Slides n'existe dans l'espace de travail. La création, le vrai lien et le test de connexion viendront une fois la connexion faite.
- **Lecture du Google Sheet réel** : non connecté.

## Détails techniques
- Dans `loadDataset`, filtrer les congés, documents et tâches sur les identifiants des collaborateurs retenus (et sur `is_demo = false` lorsque la colonne existe), dans `kpi.ts` ou dans la requête.
- Nouveau module pur `src/lib/reports/slides-plan.ts` : rapport et indicateurs en entrée, liste de diapositives et données de graphiques en sortie (sans appel réseau), testé avec vitest.
- Les graphiques seront plus tard des images publiques ou des tableaux natifs Slides ; ce choix sera fait au moment de la connexion.
- `sheets.tsx` : remplacer `"connecte"` par `"connecte_verifie"`.
- Aucune migration nécessaire.
