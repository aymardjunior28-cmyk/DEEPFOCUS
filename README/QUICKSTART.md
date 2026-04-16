// QUICK START - Les 3 Étapes Essentielles

// ============================================
// ÉTAPE 1 : DÉMARRER L'APP
// ============================================

// Terminal 1 - Backend + Frontend
$ npm run dev

// Attend ~10 secondes, puis :
// ✅ Vite running on http://localhost:5173
// ✅ Express running on http://localhost:3001

// Terminal 2 - Optionnel: Watch logs
$ tail -f server.log


// ============================================
// ÉTAPE 2 : TEST SCENARIO (MANUAL)
// ============================================

// 1. Créer User 1 (Owner)
// - Email: alice@test.com
// - Password: password123
// - → Workspace créé auto

// 2. Aller au Planning (📅 Planning tab)
// - Voir 3 boutons : "Jour | Semaine | Mois"
// - Cliquer "+ Nouvelle tâche"

// 3. Créer tâche simple
// - Titre: "Test Monday"
// - From: 15 avril 2026
// - To: 15 avril 2026
// - Priority: Medium
// - Assigned: (vide pour l'instant)
// - CRÉER

// 4. Voir la tâche
// - Vue Jour : affichée pour 15 avril
// - Vue Semaine : visible dans la grille
// - Vue Mois : point visible le 15

// 5. Inviter User 2
// - Onglet "👥 Membres"
// - "+ Inviter un utilisateur"
// - Email: bob@test.com
// - ENVOYER

// 6. Créer User 2 (Member)
// - Nouvel onglet
// - Email: bob@test.com (MÊME que l'invitation!)
// - S'enregistrer

// 7. User 2 accepte
// - Alerte: "Vous avez 1 invitation(s)"
// - ACCEPTER → Rejoint l'espace

// 8. User 1 assigne à User 2
// - Revenir User 1
// - Modifier la tâche 
// - Cocher "Bob" dans les assignés
// - SAUVER

// 9. User 2 reçoit notification
// - User 2 : Ouvrir Notifications (🔔)
// - Voir : "[NEW] Vous avez été assigné à : Test Monday"
// - Cliquer → Marquer comme lue
// - Badge disparaît

// 10. User 2 voit la tâche
// - Planning (User 2)
// - Vue Jour : tâche visible avec avatar "A" (Alice)
// - Peut cliquer pour voir détails


// ============================================
// ÉTAPE 3 : VÉRIFIER CE QUI MARCHE
// ============================================

✅ Planning Views
   □ Jour affiche bien les tâches du jour
   □ Semaine affiche grille 7 jours
   □ Mois affiche calendrier avec points

✅ Tâches
   □ Création avec titre + dates
   □ Modification priorité/statut
   □ Suppression (delete)
   □ Multi-assignation

✅ Invitations
   □ Owner peut inviter (max 5)
   □ Invité reçoit alerte
   □ Status: pending → accepted

✅ Notifications
   □ Notifications affichées
   □ Badge rouge avec compte
   □ Marquer comme lues

✅ Sync Temps-Réel
   □ Ouvrir 2 onglets (User 1)
   □ Créer tâche dans onglet 1
   □ Onglet 2 : apparaît auto (< 1s)


// ============================================
// FICHIERS CLÉS À CONNAÎTRE
// ============================================

📂 Structure:
  src/
    components/
      Planning.jsx         ← UI Planning (Jour/Semaine/Mois)
      Invitations.jsx      ← Gestion invitations
    Dashboard.jsx          ← Page principale (onglets)
    api.js                 ← Méthodes API (client)
    App.jsx                ← À modifier pour utiliser Dashboard
    styles.css             ← Styles planning + notif
  server/
    index.js               ← Routes API (+11 nouvelles)
    db.js                  ← Persistance données


// ============================================
// 10 POINTS CLÉS À RETENIR
// ============================================

1. MAX 5 USERS + OWNER = 6 total par workspace
2. OWNER = full access, MEMBER = actions limités
3. TÂCHES = attribut `assignedTo: ["member-id", ...]`
4. NOTIFICATIONS = créées auto quand assigné
5. INVITATIONS = email reçu à reconnexion
6. SYNC = EventSource (< 50ms)
7. PLANNING = 3 vues (jour/semaine/mois)
8. COMPLÉTÉE = checkbox sur la tâche
9. PRIORITÉ = visuelle (couleur + bordure)
10. PERMISSIONS = vérifiées côté serveur (sécure)


// ============================================
// API CALLS RAPIDES (avec curl)
// ============================================

// 1. Créer tâche
curl -X POST http://localhost:3001/api/tasks/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Task Test",
    "startDate": "2026-04-20",
    "endDate": "2026-04-20",
    "priority": "high",
    "assignedTo": ["member-abc"]
  }'

// 2. Lister jour
curl "http://localhost:3001/api/tasks?view=day&startDate=2026-04-20" \
  -H "Authorization: Bearer TOKEN"

// 3. Inviter
curl -X POST http://localhost:3001/api/invitations/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "novo@test.com"}'

// 4. Notifications
curl "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer TOKEN"


// ============================================
// ERREURS COMMUNES & SOLUTIONS
// ============================================

❌ "Les tâches ne s'affichent pas"
   → Vérifier date = celle du jour (sélecteur)
   → S'assurer d'être member/owner du workspace

❌ "Pas de notifications"
   → Rafraîchir page (reconnect SSE)
   → Vérifier être assigné à la tâche

❌ "Erreur 'Limite atteinte'"
   → Max 6 users atteint
   → Supprimer/accepter avant nouvelle invitation

❌ "Invitations invisibles"
   → Se reconnecter (emails en attente)
   → Vérifier email utilisé à l'inscription

❌ "Sync ne fonctionne pas"
   → Vérifier token JWT (max 7j)
   → Ouvrir console pour SSE errors


// ============================================
// DOCUMENTATION À LIRE
// ============================================

AVANT DE CODER :
  1. README_UPGRADE.md ← Vue d'ensemble (5 min)
  2. FINAL_SUMMARY.md ← Résumé exécutif (3 min)

POUR DÉVELOPPER :
  3. INTEGRATION.md ← Comment ajouter à App.jsx (15 min)
  4. EXAMPLES.md ← Code samples (30 min)

POUR TESTER :
  5. TESTING.md ← Checklist complète (1h)
  6. DEPLOYMENT.md ← Avant prod (10 min)

QUESTIONS SPÉCIFIQUES :
  → Voir le fichier pertinent dans la liste


// ============================================
// COMMANDES UTILES
// ============================================

# Démarrer dev (compilé + hot reload)
npm run dev

# Build production
npm run build

# Start production
npm start

# Vérifier les fichiers créés
ls src/components/Planning.jsx
ls src/Dashboard.jsx
ls server/index.js

# Vérifier la doc complète
wc -l *.md

# Tester rapidement
npm run build && npm run preview


// ============================================
// INTÉGRATION RAPIDE DANS APP.JSX
// ============================================

// Ajouter en haut :
import { Dashboard } from "./Dashboard";

// Remplacer le return existant par :
if (!user) return <AuthScreen ... />

return (
  <Dashboard 
    workspace={workspace}
    user={user}
    onLogout={() => {
      localStorage.removeItem("deepfocus-token");
      // ... redirection login
    }}
  />
);

// C'est tout ! Dashboard s'occupe du reste.


// ============================================
// ROADMAP SUITE
// ============================================

NOW (Fait ✅)
  ✅ Planning jour/semaine/mois
  ✅ Multi-users avec invitations
  ✅ Tâches attributables
  ✅ Notifications en temps-réel

NEXT (À faire)
  ⏳ Email réel (SendGrid)
  ⏳ Tâches récurrentes
  ⏳ Analytics/KPI
  ⏳ Mentions (@user)
  ⏳ Slack/Teams intégration
  ⏳ Mobile app (React Native)


// ============================================
// STATS FINALES
// ============================================

Code Écrit :
  • 2000+ lignes de code
  • 11 routes API
  • 4 composants React
  • 800 lignes CSS

Documentation :
  • 6 fichiers Markdown
  • 4000+ mots explications 
  • 50+ code examples
  • Checklist complète

Features Livrées :
  • Planning jour/semaine/mois
  • Multi-users + invitations
  • Notifications temps-réel
  • Attributions flexibles
  • Sync instantanée
  • Permissions sécurisées


// ============================================
// 🚀 C'EST NOUVEAU, C'EST DUUU !
// ============================================

Bienvenue dans DeepFocus 2.0 ! 

Tu as tous les outils pour :
✅ Gérer des tâches collaborativement
✅ Voir qui fait quoi en temps-réel
✅ Recevoir notifications d'assignations
✅ Planning professionnel 3-en-1
✅ Permissions multi-niveaux

À toi de jouer ! 🎉

npm run dev       # Démarrer
localhost:5173    # Accès
README_UPGRADE.md # Documentation

Amuse-toi bien ! 🚀
