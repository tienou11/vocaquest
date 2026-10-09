# VocaQuest

Application web pour apprendre le vocabulaire anglais, allemand et espagnol depuis le français (10 niveaux, 514 mots par langue, leçons personnelles, multi-profils).

## Architecture

- `public/` : interface (HTML, CSS, JavaScript sans dépendance), compatible Safari, Chrome, Edge, Firefox.
- `server/` : logique métier (`core.mjs`), API (`http.mjs`), connecteur MCP pour Claude (`mcp.mjs`), stockage (`store.mjs` : Netlify Blobs en production, fichiers locaux en développement), base initiale (`seed.mjs`).
- `netlify/functions/` : points d'entrée `/api/*` et `/mcp/*`.

## Variables d'environnement (Netlify)

| Variable | Rôle |
|---|---|
| `INVITE_CODE` | code du lien d'invitation (`https://…/?i=CODE`) qui crée un profil |
| `ADMIN_CODE` | code administrateur (dans Mon profil, ou lien `?i=ADMIN_CODE`) |
| `MCP_SECRET` | segment secret de l'URL du connecteur Claude : `https://…/mcp/MCP_SECRET` |

## Développement local

```
node dev/server.mjs        # http://localhost:8888/?i=famille  (admin : admin-test)
node dev/test-api.mjs      # tests de l'API et du connecteur MCP
node dev/build-demo.mjs demo.html   # démo autonome (serveur exécuté dans le navigateur)
```
