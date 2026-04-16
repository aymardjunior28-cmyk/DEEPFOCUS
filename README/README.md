# DeepFocus

Application DeepFocus full-stack locale :

- front React + Vite
- backend Express
- base SQLite
- authentification par email/mot de passe
- sauvegarde du workspace côté serveur

## Installation

```bash
npm install
```

## Démarrage en développement

```bash
npm run dev
```

Cela lance:

- le front Vite sur `http://localhost:5173`
- l'API Express sur `http://localhost:3001`

## Vérification

```bash
npm run build
```

## Fonctionnalités actuelles

- inscription et connexion
- workspaces partageables via code d'invitation
- synchronisation temps reel via flux serveur
- boards multiples
- renommage et suppression de boards
- listes et cartes
- renommage et suppression de listes
- glisser-déposer entre listes
- détail de carte en modale
- labels, membres, cover
- checklist
- commentaires rapides
- import réel de pièces jointes
- types acceptés: Word, Excel, PDF, images, audio, vidéo
- archivage/restauration
- filtres par texte, membre et label
- persistance SQLite via API

## Fichiers clés

- `src/App.jsx` : interface principale
- `src/api.js` : appels API
- `src/styles.css` : styles du front
- `server/index.js` : routes backend
- `server/db.js` : initialisation SQLite
