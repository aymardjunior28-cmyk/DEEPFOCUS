# DeepFocus - Upgrade Multi-Utilisateurs avec Planning

## 🎯 Nouvelles Fonctionnalités

### 1. **Système de Tâches avec Planning (jour/semaine/mois)**
- Créez des tâches avec dates de début et fin
- Trois vues disponibles :
  - **Vue Jour** : Toutes les tâches d'un jour spécifique
  - **Vue Semaine** : Grille de 7 jours avec aperçu des tâches
  - **Vue Mois** : Calendrier avec points de tâches
- Priorités : Basse, Normale, Haute (couleurs distinctives)
- Marquez les tâches comme complétées

### 2. **Attributions Multi-Membres**
- Attribuez une tâche à **1 ou plusieurs membres**
- Les membres assignés reçoivent une **notification immédiate**
- Affichage des avatars des responsables sur chaque tâche
- Filtrage des tâches par utilisateur

### 3. **Système d'Invitations**
- Le propriétaire de l'espace peut inviter jusqu'à **5 utilisateurs supplémentaires**
- Les utilisateurs reçoivent une **invitation par email** (dans l'identité)
- Statut des invitations : `pending`, `accepted`
- Gestion des membres avec affichage des rôles

### 4. **Notifications en Temps Réel**
- **2 types de notifications** :
  - `task_assigned` : Vous avez été assigné à une tâche
  - `member_joined` : Un nouveau membre a rejoint l'espace
- Affichage du badge avec compteur de non-lus
- Marquer comme lues individuellement
- Les invitations s'affichent à la connexion

### 5. **Architecture Multi-Utilisateurs**
- Chaque utilisateur a ses **permissions** basées sur le rôle :
  - **Owner** : Accès complet + invitations
  - **Member** : Ses tâches assignées + tâches créées
- **Sync temps-réel** via EventSource (SSE)
- Données persistantes en JSON/PostgreSQL

---

## 📦 Routes API Nouvelles

### Tâches
```
POST   /api/tasks/create          # Créer une tâche
PUT    /api/tasks/:taskId         # Modifier une tâche
DELETE /api/tasks/:taskId         # Supprimer une tâche
GET    /api/tasks                 # Lister les tâches (avec filtres)
```

**Paramètres GET** :
- `view` : "day" | "week" | "month"
- `startDate` : "YYYY-MM-DD"
- `endDate` : "YYYY-MM-DD" (pour week/month)

### Invitations
```
POST   /api/invitations/send              # Envoyer une invitation
GET    /api/invitations                   # Lister les invitations
POST   /api/invitations/:invitationId/accept # Accepter
```

### Notifications
```
GET    /api/notifications                      # Lister les notifications
PUT    /api/notifications/:notificationId/read # Marquer comme lue
```

---

## 📊 Structure des Données (Workspace)

```javascript
{
  members: [
    {
      id: "member-xxx",
      userId: 123,        // null si non lié à un utilisateur
      name: "Alice",
      role: "Owner",      // ou "member"
      color: "#0f766e"
    }
  ],
  tasks: [
    {
      id: "task-xxx",
      title: "Titre de la tâche",
      description: "...",
      startDate: "2026-04-15",
      endDate: "2026-04-18",
      priority: "high",
      assignedTo: ["member-xxx", "member-yyy"],
      createdBy: 123,
      createdAt: "2026-04-15T10:00:00Z",
      completed: false,
      attachments: [],
      comments: []
    }
  ],
  invitations: [
    {
      id: "invite-xxx",
      email: "nouveau@example.com",
      status: "pending",    // ou "accepted"
      createdAt: "2026-04-15T10:00:00Z",
      createdBy: 123
    }
  ],
  notifications: [
    {
      id: "notif-xxx",
      userId: 124,
      taskId: "task-xxx",
      type: "task_assigned",
      message: "Vous avez été assigné à : ...",
      read: false,
      createdAt: "2026-04-15T10:00:00Z"
    }
  ]
}
```

---

## 🎨 Nouveaux Composants React

### `PlanningView`
Gère l'affichage du planning avec les 3 vues et création de tâches.

```jsx
<PlanningView 
  workspace={workspace} 
  onTasksChange={setTasks}
/>
```

### `NotificationsPanel`
Affiche les notifications non-lues.

```jsx
<NotificationsPanel workspace={workspace} />
```

### `InvitationsManager`
Permet au propriétaire de gérer les invitations et membres.

```jsx
<InvitationsManager workspace={workspace} />
```

### `Dashboard`
Intègre tout et fournit une navigation par onglets.

```jsx
<Dashboard 
  workspace={workspace}
  user={user}
  onLogout={handleLogout}
/>
```

---

## 🔐 Permissions & Contrôles

| Action | Owner | Member |
|--------|-------|--------|
| Créer une tâche | ✅ | ✅ |
| Modifier ses tâches | ✅ | ✅ |
| Modifier tâches d'autres | ✅ (si assigné) | ✅ (si assigné) |
| Inviter des membres | ✅ | ❌ |
| Voir tous les membres | ✅ | ✅ |
| Modifier tâche d'autrui | ✅ | ❌ |
| Supprimer tâche | ✅ (si créateur) | ❌ |

---

## 🚀 Installation & Démarrage

```bash
# Installation des dépendances
npm install

# Développement (Vite + Express avec watch)
npm run dev

# Production
npm run build
npm start
```

**Accès** :
- Frontend : http://localhost:5173
- API : http://localhost:3001
- Espace partagé : Utiliser un code d'invitation

---

## 💡 Flux Utilisateur

### 1. **Nouvel Utilisateur**
1. S'inscrit → Crée un compte + workspace par défaut
2. Reçoit un code d'invitation pour partager
3. Peut créer immédiatement des tâches

### 2. **Inviter un Membre**
1. Click "👥 Membres" (si Owner)
2. Entrer l'email → "Envoyer"
3. Notification "Invitation en attente"
4. Le destinataire voit l'alerte à sa connexion

### 3. **Accepter une Invitation**
1. Connexion → Voir "Vous avez 1 invitation(s)"
2. Click "Accepter" → Rejoint le workspace
3. Voir les tâches assignées au Planning

### 4. **Créer une Tâche**
1. Aller au Planning
2. Click "+ Nouvelle tâche"
3. Remplir : Titre, Dates, Priorité
4. Sélectionner les membres assignés
5. Les assignés reçoivent une notification

---

## 📱 Responsive Design

- ✅ Desktop (>1200px) : Layout complet
- ✅ Tablet (768-1200px) : Sidebar collapsible
- ✅ Mobile (<768px) : Stack vertical

---

## 🔄 Synchronisation Temps-Réel

Les changements se propagent via **EventSource** :

```javascript
const eventSource = new EventSource(`/api/workspace/stream?token=${token}`);
eventSource.onmessage = (evt) => {
  const data = JSON.parse(evt.data);
  // Met à jour le workspace en temps réel
};
```

---

## 🛠️ Configuration Supplémentaire

### Variables d'environnement
```bash
DATABASE_URL=postgresql://...  # Pour production
NODE_ENV=production            # Mode production
JWT_SECRET=your-secret-key     # Clé JWT personnalisée
PORT=3001                      # Port API
```

### Limites
- Maximum **5 utilisateurs supplémentaires** par workspace
- Taille max fichier : **25MB**
- Types fichier acceptés : PDF, Word, Excel, Image, Audio, Vidéo

---

## 📝 Notes Importantes

1. **Les tâches sont liées au workspace**, pas à l'utilisateur
2. **Les notifications sont persistantes** dans le workspace
3. **Les permissions** sont vérifiées côté serveur
4. **La sync en temps-réel** actualise tous les clients connectés
5. **Les invitations** sont envoyées par email (conceptuellement)

---

## 🐛 Dépannage

**Les tâches ne s'affichent pas ?**
- Vérifier que le membre est bien assigné
- Rafraîchir la page
- Vérifier les permissions (Owner ≠ Member)

**Les notifications n'arrivent pas ?**
- Recharger la page (nouvelle connexion SSE)
- Vérifier le type de notification (`task_assigned`, `member_joined`)

**Les invitations en attente ne disparaissent pas ?**
- Rafraîchir après acceptation
- Vérifier l'email correct

---

## 📚 Prochaines Améliorations Possibles

- [ ] Envoi d'emails réels via SMTP
- [ ] Notifications push (desktop/mobile)
- [ ] Historique des modifications
- [ ] Analytics & statistiques
- [ ] Intégrations Slack/Teams
- [ ] Récurrence de tâches
- [ ] Dépendances entre tâches

---

**Version** : 2.0 (Multi-utilisateurs + Planning)  
**Dernière mise à jour** : Avril 2026
