// INSTRUCTIONS D'INTÉGRATION POUR APP.JSX

/*
Ce fichier explique comment intégrer les nouveaux composants Planning, Invitations 
et Notifications dans votre App.jsx existant.

Il y a 2 approches :
1. SIMPLE : Remplacer le board-view actuel par le Dashboard
2. AVANCÉE : Garder les boards ET ajouter un onglet Planning
*/

// ─── APPROCHE 1 : SIMPLE (Recommandée pour commencer) ────

/*
Remplacer le rendu du main-shell actuel par le Dashboard.

Avant :
  if (!user) return <AuthScreen ... />
  
  return (
    <div className="app-shell">
      <Sidebar ... />
      <div className="main-shell">
        <Filters ... />
        <BoardHero ... />
        <BoardCanvas ... />
      </div>
    </div>
  )

Après :
  if (!user) return <AuthScreen ... />
  
  return <Dashboard workspace={workspace} user={user} onLogout={handleLogout} />
*/

import { useEffect, useState } from "react";
import { api } from "./api";
import { Dashboard } from "./Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("deepfocus-token");
    if (savedToken) {
      setToken(savedToken);
      loadUserData(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadUserData(tkn) {
    try {
      const response = await api.me();
      setUser(response.user);
      setWorkspace(response.workspace);
    } catch (err) {
      console.error("Erreur chargement données:", err);
      localStorage.removeItem("deepfocus-token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="screen-state">Chargement...</div>;
  }

  if (!user) {
    return <AuthScreen onLogin={(tkn) => {
      setToken(tkn);
      loadUserData(tkn);
    }} />;
  }

  return (
    <Dashboard 
      workspace={workspace} 
      user={user} 
      onLogout={() => {
        localStorage.removeItem("deepfocus-token");
        setToken(null);
        setUser(null);
        setWorkspace(null);
      }}
    />
  );
}

// ─── APPROCHE 2 : AVANCÉE (Garder boards + ajouter planning) ────

/*
Ajouter le Dashboard comme onglet additionnel dans votre interface.

Modifier le Sidebar ou la TopBar pour ajouter un bouton :

<button onClick={() => setShowDashboard(!showDashboard)}>
  📅 Planning
</button>

Ensuite afficher conditionnellement :

{showDashboard ? (
  <Dashboard workspace={workspace} user={user} onLogout={handleLogout} />
) : (
  <div className="main-shell">
    {/* Votre contenu des boards existant */}
    
  </div>
)}
*/

// ─── SYNCHRONISATION TEMPS-RÉEL (EventSource) ────

/*
Pour que les changements se propagent en temps-réel entre onglets/utilisateurs,
il faut configurer l'EventSource dans App.jsx :
*/

useEffect(() => {
  if (!token) return;

  const eventSource = new EventSource(`/api/workspace/stream?token=${token}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Mise à jour temps-réel:", data);
      setWorkspace(data.workspace);
    } catch (err) {
      console.error("Erreur parsing EventSource:", err);
    }
  };

  eventSource.onerror = () => {
    console.warn("Perte de connexion temps-réel, reconnaissance...");
    eventSource.close();
  };

  return () => eventSource.close();
}, [token]);

// ─── STRUCTURE DE FICHIERS POUR LES COMPOSANTS ────

/*
src/
├── components/
│   ├── Planning.jsx          ← NEW : PlanningView + NotificationsPanel
│   ├── Invitations.jsx       ← NEW : InvitationsManager + PendingInvitationsAlert
│   ├── ... (composants existants)
├── App.jsx                   ← MODIFIÉ : Intègre Dashboard
├── Dashboard.jsx             ← NEW : Page principale avec onglets
├── api.js                    ← MODIFIÉ : Ajouter routes pour tâches/invitations
├── styles.css                ← MODIFIÉ : Ajouter styles planning
└── main.jsx                  ← Pas de changement
*/

// ─── IMPORTS NÉCESSAIRES ────

// Dans App.jsx :
import { Dashboard } from "./Dashboard";
import { PlanningView, NotificationsPanel } from "./components/Planning";
import { InvitationsManager, PendingInvitationsAlert } from "./components/Invitations";

// ─── EXEMPLE DE WORKFLOW COMPLET ────

/*
1. User créé, reçoit workspace vide
   workspace = {
     members: [{id: "m1", userId: 123, name: "Alice", role: "Owner"}],
     tasks: [],
     invitations: [],
     notifications: [],
     boards: [...] // Boards existants
   }

2. User crée une tâche via PlanningView
   POST /api/tasks/create
   → Tâche ajoutée à workspace.tasks
   → EventSource broadcast à tous les clients
   → Tous les clients reçoivent mise à jour

3. User invite User2
   POST /api/invitations/send {email: "user2@..."}
   → Invitation ajoutée à workspace.invitations
   → Status: "pending"
   → Notification créée pour User2 (quand il/elle se connecte)

4. User2 accepte invitation
   POST /api/invitations/:id/accept
   → Invitation status: "accepted"
   → User2 ajouté à workspace.members
   → Notification créée pour Owner: "User2 a rejoint"

5. User attribue tâche à User2
   PUT /api/tasks/:taskId {assignedTo: [..., "m2"]}
   → Notification créée pour User2: "Assigné à ..."
   → User2 voit tâche en Planning

6. User2 marque complétée
   PUT /api/tasks/:taskId {completed: true}
   → Tâche mise à jour en temps-réel
   → Tous les clients reçoivent update
*/

// ─── CORRECTIONS POUR TRANSITIONS ────

/*
Les tâches sont stockées dans workspace.tasks, pas dans les boards.

AVANT (Boards Kanban) :
  boards[i].lists[j].cards[k].title

APRÈS (Planning) :
  tasks[i].title, tasks[i].startDate, tasks[i].assignedTo

Les deux systèmes peuvent coexister si vous gardez les boards.
*/

// ─── GESTION D'ERREURS ────

// Toujours wrapper les appels API avec try/catch
async function createTask(taskData) {
  try {
    const response = await api.createTask(taskData);
    // Vérifier la réponse
    if (!response.task) {
      throw new Error("Réponse serveur invalide");
    }
    // Recharger les tâches
    const tasks = await api.get("/tasks", { params: { view: "all" } });
    setWorkspace(prev => ({ ...prev, tasks: tasks.tasks }));
  } catch (err) {
    console.error("Erreur créartion tâche:", err.message);
    // Afficher message d'erreur utilisateur
    alert(err.message);
  }
}

// ─── AMÉLIORATIONS FUTURES ────

/*
1. Ajouter drag-and-drop des tâches entre jours (semaine)
2. Récurrence des tâches (quotidienne, hebdomadaire, mensuelle)
3. Dépendances entre tâches (A doit être fait avant B)
4. Templates de tâches (réutiliser tâches fréquentes)
5. Export en PDF/iCal
6. Intégration calendrier Google/Outlook
7. Analytics : KPI, tendances, burn-down charts
8. Collaboration en temps-réel : édition simultanée
9. Mentions (@user) dans les commentaires
10. Assignation intelligente (suggestions basées sur historique)
*/

// ─── DOCUMENTATION API COMPLÈTE ────

/*
POST /api/auth/register
  Body: {name, email, password}
  Response: {token, user, workspace, inviteCode}

POST /api/auth/login
  Body: {email, password}
  Response: {token, user, workspace, inviteCode}

GET /api/auth/me
  Headers: {Authorization: "Bearer token"}
  Response: {user, workspace, inviteCode}

POST /api/tasks/create
  Body: {title, description?, startDate, endDate?, assignedTo: [memberId], priority?}
  Response: {task}

PUT /api/tasks/:taskId
  Body: {title?, description?, startDate?, endDate?, assignedTo?, priority?, completed?}
  Response: {task}

DELETE /api/tasks/:taskId
  Response: {ok: true}

GET /api/tasks
  Query: ?view=day|week|month&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  Response: {tasks: []}

POST /api/invitations/send
  Body: {email}
  Response: {invitation}

GET /api/invitations
  Response: {invitations: []}

POST /api/invitations/:invitationId/accept
  Response: {ok: true, member}

GET /api/notifications
  Response: {notifications: []}

PUT /api/notifications/:notificationId/read
  Response: {ok: true}

GET /api/workspace/stream?token=...
  Response: Server-Sent Events (EventSource)
  Format: data: {workspace, inviteCode}\n\n
*/

export default App;
