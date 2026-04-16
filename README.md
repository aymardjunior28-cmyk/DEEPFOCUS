# DeepFocus

DeepFocus est une application collaborative de gestion de taches (web + desktop).

- Front: React + Vite
- Backend: Express (API REST)
- Auth: email / mot de passe (JWT)
- Donnees: Postgres (recommande en production) ou stockage local (fallback dev)
- Temps reel: flux workspace (SSE)
- Desktop: Electron (optionnel), pointe vers le serveur Internet

## Demarrage local

```bash
npm install
npm run dev
```

- Front: http://localhost:5173
- API: http://localhost:3001

## Production (Render + Neon)

- Render (Web Service): `npm install` puis `npm start`
- Variables d'env (Render):
  - `NODE_ENV=production`
  - `JWT_SECRET=...`
  - `DATABASE_URL=postgresql://...` (Neon, avec `sslmode=require`)

Test sante:

- `/api/ping`

## Build desktop (Windows)

```bash
npm run pack:win
```

Sorties:

- Installateur: `release/DeepFocus Setup 1.0.0.exe`
- Portable: `release/win-unpacked/DeepFocus.exe`

## Docs

Voir le dossier `README/` pour:

- Deploiement
- Tests
- Exemples
- Verifications