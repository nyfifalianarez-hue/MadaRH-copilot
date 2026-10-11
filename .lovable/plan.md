# État réel après l'itération du 11 oct. 2026

## Livré et vérifié
- Assistant IA réel : route serveur `/api/chat` (session obligatoire, 401 sinon), modèle Lovable AI `openai/gpt-6-astra` en flux continu, clé uniquement côté serveur.
- Conversations enregistrées (`chat_threads`, `chat_messages`, accès limité au propriétaire dans son organisation), historique, contexte conservé (30 derniers messages).
- Contexte juridique : règles lues depuis la bibliothèque à chaque message ; sources réelles uniquement, classées « vérifiée / à vérifier » ; bibliothèque vide signalée explicitement.
- Erreurs en français : connexion, configuration, crédits (402), refus (403), quota (429), service (5xx), réseau ; réessai et arrêt.
- Menu : vrai compte connecté affiché (plus de « Utilisateur · Lecteur » fictif), nom en typographie serif.
- Palette « registre institutionnel » appliquée à toute l'application ; état vide trompeur du tableau de bord corrigé.

## Tests
- 62 tests automatiques, vérification des types, build : OK.
- Vrai appel au modèle (même requête que le serveur) : réponse reçue, contexte conservé.
- 401 sans session vérifié sur le serveur local.

## Non vérifié / à faire
- Parcours connecté complet dans le navigateur et isolation entre deux organisations : aucun compte n'existe.
- Bibliothèque juridique vide : aucune réponse « Droit vérifié » possible.
- Étapes 3 (actions outillées) et 4 (écrans branchés sur la base) du plan initial.
- Intégrations Google/Slack/Gmail : secrets ou connexions absents.
