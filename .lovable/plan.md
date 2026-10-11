# MadaRH Copilot — vraie assistance IA RH et refonte visuelle

## Constats vérifiés
- **Assistant** (`src/routes/assistant.tsx`) : aucun appel à un modèle d'IA. `buildAnswer()` renvoie un texte local fixe et toute question libre est traitée comme « general ». C'est la cause du problème signalé.
- **Fournisseur d'IA** : la clé serveur `LOVABLE_API_KEY` est déjà présente. On peut donc utiliser Lovable AI, sans clé à ajouter. Les paquets `ai`, `@ai-sdk/*` et `react-markdown` ne sont pas installés.
- **Base** : 0 compte, 0 salarié, 0 règle juridique, 0 source juridique. Les tables `legal_sources`, `legal_rules` et `legal_rule_versions` existent mais sont vides. L'assistant ne peut donc citer aucun droit vérifié pour l'instant.
- **Écrans encore sur des listes locales vides** : collaborateurs, fiche collaborateur, congés, documents, recrutement, veille juridique, assistant et tableau de bord. Seuls Rapports, Audit, Intégrations et Paramètres lisent la base.
- **Intégrations** : aucune connexion Google Slides, Google Sheets, Gmail ou Slack. Il manque les secrets `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SLACK_CLIENT_ID` et `SLACK_CLIENT_SECRET` (ou les connexions correspondantes de l'espace de travail).
- **Préservé** : les 4 migrations existantes, le moteur de calcul des indicateurs (49 tests), les règles d'accès par organisation et par rôle, et le journal d'audit.

## Étape 1 — Assistant IA réel (priorité absolue)
- Une fonction serveur authentifiée `/api/chat` (session obligatoire) envoie la conversation en flux continu à Lovable AI (modèle par défaut `openai/gpt-6-astra`, réflexion faible ou moyenne). La clé n'est jamais envoyée au navigateur.
- **Configuration manquante** : si `LOVABLE_API_KEY` est absente, l'écran affiche « Assistant indisponible : clé IA manquante côté serveur ». Aucune réponse de repli.
- **Erreurs explicites en français** :
  - 429 : trop de demandes, réessai plus tard ;
  - 402 : crédits IA épuisés, assistant suspendu ;
  - 403 : accès refusé, motif affiché ;
  - 5xx : quelques nouvelles tentatives espacées, puis message d'erreur.
  - Un bouton Arrêter interrompt la réponse.
- **Conversations** : enregistrées dans la base (nouvelles tables `chat_threads` et `chat_messages`, visibles par leur seul propriétaire, dans son organisation). Chaque conversation a sa propre adresse `/assistant/$threadId`.
- **Confidentialité** : pas de données médicales, disciplinaires ou salariales individuelles dans les messages envoyés au modèle, sauf droit explicite. Chaque appel est journalisé dans l'audit (modèle utilisé et coût), sans recopier le texte des messages.
- **Coût** : facturé à chaque demande sur le crédit IA de l'espace de travail. Un indicateur de consommation sera affiché dans Paramètres.

## Étape 2 — Ancrage juridique et honnêteté
- Instructions système en français, spécialisées en administration RH à Madagascar.
- Outil `rechercher_regles` : lit `legal_rules`, `legal_rule_versions` et `legal_sources` dans la base (source, article, lien, date de vérification, date d'effet, statut, niveau de confiance).
- **Chaque réponse est structurée en trois blocs** :
  - « Droit vérifié » : uniquement des règles au statut vérifié, avec citation ;
  - « Source à vérifier » : règles enregistrées mais non vérifiées ;
  - « Conseil pratique » : sans valeur juridique.
- Sans règle en base, l'assistant le dit (« Aucune règle sourcée enregistrée ») et propose d'en ajouter une à la bibliothèque. Il est interdit d'inventer un article, une durée, un taux ou une citation.
- **Contrôle automatique après la réponse** : toute citation absente de la base est retirée et signalée.
- L'assistant pose des questions s'il manque une information (type de contrat, ancienneté, dates, établissement).
- Écran Veille juridique branché sur la base : ajout d'une source ou d'une règle, avec versions, puis passage au statut « vérifié » par l'administrateur RH uniquement, avec audit.

## Étape 3 — Actions RH outillées
Tous les outils de l'assistant passent par le même circuit : aperçu, confirmation explicite, exécution, audit. Les outils qui modifient des données ou envoient quelque chose exigent une approbation dans le chat.
- **Calculs** : jours de congé consommés ou restants, ancienneté, fins de contrat. Ils se fondent uniquement sur les règles de la bibliothèque. Sans règle, le calcul est refusé.
- **Congés et absences** : préparer une demande, puis l'enregistrer dans `leave_absences` après confirmation.
- **Brouillons** (contrat, attestation, relance de documents, courriel) : enregistrés dans `generated_documents` au statut brouillon. Un envoi par Gmail est désactivé tant que Gmail n'est pas connecté.
- **CNaPS / OSTIE** : liste de démarches et pièces à fournir, uniquement à partir de sources enregistrées. Aucun taux de cotisation sans source vérifiée.
- **Dossiers** : documents manquants et pièces expirées, lus dans la base.
- **Rapports** : lancer un brouillon de rapport hebdomadaire, en réutilisant les fonctions existantes.
- **Google Sheets** : formules et prévisualisation d'un tableau. L'écriture reste désactivée sans connexion vérifiée.

## Étape 4 — Données réelles partout
- Remplacer le stockage local (`src/data/store.tsx`) par des lectures et écritures dans la base : salariés, congés, documents, tâches, propositions et règles juridiques. Les propositions deviennent la table `action_proposals`, avec aperçu, confirmation et audit côté serveur.
- Chaque écran a un état vide explicite (« Aucune donnée disponible »), un état de chargement et un état d'erreur.
- Ajouter la connexion Google au compte en plus de l'e-mail, et traduire les erreurs d'authentification.
- Corriger l'affichage « Dossiers complets » du tableau de bord quand il n'y a aucune donnée.

## Étape 5 — Refonte visuelle premium
- **Direction** : « registre institutionnel ». Papier ivoire et encre profonde, accent vert de Madagascar, accent terre cuite pour les alertes. Titres en Source Serif 4, texte en Source Sans 3 (déjà chargés).
- **Système de design** : couleurs et ombres définies au même endroit, mode sombre, échelle d'espacement de 4 px, hiérarchie typographique en 6 niveaux.
- **Navigation** : menu latéral groupé avec un accès direct à l'assistant, recherche globale (Ctrl+K), et sur mobile un menu dans un tiroir.
- **Chat au centre** :
  - réponses mises en forme, sans fond ;
  - bulles utilisateur bien contrastées ;
  - citations sous forme de pastilles cliquables (source, article, date de vérification) ;
  - indicateur « Droit vérifié / À vérifier / Conseil » ;
  - actions de l'assistant affichées en cartes repliées ;
  - zone de saisie toujours active et suggestions.
- **Tableau de bord** : indicateurs réels, alertes, raccourcis vers l'assistant.
- Cartes, formulaires et tableaux homogènes, états vides illustrés sobrement, squelettes de chargement, transitions discrètes de 150 à 200 ms.
- **Accessibilité** : contraste AA, navigation au clavier, focus visible, libellés lisibles par les lecteurs d'écran, interface utilisable dès 360 px de large.

## Étape 6 — Tests et critères d'acceptation
- **Tests automatiques** :
  - sans session, `/api/chat` renvoie 401 ;
  - sans `LOVABLE_API_KEY`, erreur explicite ;
  - les erreurs 402, 403 et 429 s'affichent correctement ;
  - une citation inventée est retirée par le contrôle ;
  - sans règle en base, la mention « aucune règle sourcée » apparaît ;
  - une action est impossible sans confirmation ;
  - l'audit est bien écrit ;
  - une organisation A ne peut pas lire les conversations ni les données d'une organisation B.
- **Test réel** : une question libre en français obtient une réponse du modèle, vérifiée dans le journal des appels IA. Une seconde question garde le contexte. Rechargement de la page : l'historique est restauré.
- **Contrôles visuels dans le navigateur** : tableau de bord, chat, Rapports, Veille juridique, sur ordinateur et sur mobile.
- **Ordre de livraison** : 1, puis 2, puis 4 (données), puis 3, puis 5. Typecheck, tests et build à chaque étape.

## Blocages exacts
- **Aucun compte utilisateur** : le test de bout en bout connecté demande que vous créiez un compte avec une vraie adresse.
- **Bibliothèque juridique vide** : sans sources officielles saisies et vérifiées par vous (Code du travail, décrets, textes CNaPS et OSTIE), l'assistant ne pourra jamais afficher de « Droit vérifié ».
- **Connexions Google Sheets, Google Slides, Gmail et Slack absentes** : il faut `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SLACK_CLIENT_ID` et `SLACK_CLIENT_SECRET`, ou des connexions de l'espace de travail.
- **Crédit IA de l'espace de travail** : une petite allocation gratuite chaque mois, puis il faut une offre payante.

## Détails techniques
- Paquets : `ai`, `@ai-sdk/openai` (API Responses avec `store: false` et réflexion), `react-markdown`, composants AI Elements pour le chat.
- Route serveur TanStack `src/routes/api/chat.ts` : vérification du jeton, outils Zod, `stopWhen(stepCountIs(50))`, enregistrement en fin de réponse.
- Migration additive : `chat_threads` et `chat_messages`, avec les droits d'accès d'abord puis les règles par organisation et par propriétaire, et des index. Aucune table existante n'est modifiée.
- Les fonctions serveur existantes (rapports, espace de travail, audit) sont réutilisées.
