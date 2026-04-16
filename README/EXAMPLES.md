// EXEMPLES D'UTILISATION - Système Multi-Utilisateurs + Planning

// ═════════════════════════════════════════════════════════════════════════════
// 1. CRÉER UNE TÂCHE VIA API
// ═════════════════════════════════════════════════════════════════════════════

// Exemple 1 : Tâche simple d'une journée
const tacheSimple = {
  title: "Rédiger la proposition",
  description: "Proposer à l'équipe les nouvelles features",
  startDate: "2026-04-20",
  endDate: "2026-04-20",
  priority: "medium",
  assignedTo: ["member-alice"], // Un seul assigné
};

// Exemple 2 : Tâche multi-jours avec plusieurs assignés
const tacheComplexe = {
  title: "Lancement produit",
  description: "Orchestration du lancement complet",
  startDate: "2026-04-20",
  endDate: "2026-04-25",
  priority: "high",
  assignedTo: ["member-alice", "member-bob", "member-charlie"],
};

// Exemple 3 : Tâche sans assignation (owner seulement)
const tachePersonnelle = {
  title: "Vérifier les statistiques",
  description: "Analyser la croissance du Q2",
  startDate: "2026-04-22",
  endDate: "2026-04-22",
  priority: "low",
  assignedTo: [],
};

// Appel API
async function creerTache(tacheData) {
  try {
    const response = await fetch("/api/tasks/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
      },
      body: JSON.stringify(tacheData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur création tâche");
    }
    
    const result = await response.json();
    console.log("✅ Tâche créée:", result.task);
    return result.task;
  } catch (err) {
    console.error("❌ Erreur:", err.message);
  }
}

// Utilisation
await creerTache(tacheSimple);
await creerTache(tacheComplexe);


// ═════════════════════════════════════════════════════════════════════════════
// 2. INVITER DES UTILISATEURS
// ═════════════════════════════════════════════════════════════════════════════

async function inviterUtilisateur(email) {
  try {
    const response = await fetch("/api/invitations/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
      },
      body: JSON.stringify({ email })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const result = await response.json();
    console.log("✅ Invitation envoyée à:", email);
    console.log("   Status:", result.invitation.status);
    return result.invitation;
  } catch (err) {
    console.error("❌ Erreur invitation:", err.message);
  }
}

// Inviter 3 personnes
await inviterUtilisateur("alice@example.com");
await inviterUtilisateur("bob@example.com");
await inviterUtilisateur("charlie@example.com");

// Limite : max 5 utilisateurs supplémentaires (+ owner = 6 total)


// ═════════════════════════════════════════════════════════════════════════════
// 3. ACCEPTER UNE INVITATION (côté nouveau membre)
// ═════════════════════════════════════════════════════════════════════════════

async function accepterInvitation(invitationId) {
  try {
    const response = await fetch(`/api/invitations/${invitationId}/accept`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const result = await response.json();
    console.log("✅ Invitation acceptée!");
    console.log("   Nouveau membre ajouté:", result.member);
    return result;
  } catch (err) {
    console.error("❌ Erreur acceptation:", err.message);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// 4. LISTER LES TÂCHES AVEC DIFFÉRENTES VUES
// ═════════════════════════════════════════════════════════════════════════════

// Vue Jour : toutes les tâches du 20 avril
async function chargerTachesJour(date) {
  try {
    const response = await fetch(
      `/api/tasks?view=day&startDate=${date}`,
      {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
        }
      }
    );
    
    const result = await response.json();
    console.log(`📅 Tâches du ${date}:`, result.tasks);
    return result.tasks;
  } catch (err) {
    console.error("❌ Erreur chargement tâches:", err.message);
  }
}

// Vue Semaine : 7 jours à partir du lundi
async function chargerTachesSemaine(lundi) {
  const dimanche = new Date(lundi);
  dimanche.setDate(dimanche.getDate() + 6);
  
  try {
    const response = await fetch(
      `/api/tasks?view=week&startDate=${lundi}&endDate=${dimanche.toISOString().split('T')[0]}`,
      {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
        }
      }
    );
    
    const result = await response.json();
    console.log(`📆 Tâches de la semaine ${lundi}:`, result.tasks);
    return result.tasks;
  } catch (err) {
    console.error("❌ Erreur chargement tâches:", err.message);
  }
}

// Vue Mois : tous les avril 2026
async function chargerTachesMois(mois) {
  try {
    const response = await fetch(
      `/api/tasks?view=month&startDate=${mois}-01`,
      {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
        }
      }
    );
    
    const result = await response.json();
    console.log(`📊 Tâches du mois ${mois}:`, result.tasks);
    return result.tasks;
  } catch (err) {
    console.error("❌ Erreur chargement tâches:", err.message);
  }
}

// Utilisation
await chargerTachesJour("2026-04-20");
await chargerTachesSemaine("2026-04-20");
await chargerTachesMois("2026-04");


// ═════════════════════════════════════════════════════════════════════════════
// 5. MODIFIER UNE TÂCHE
// ═════════════════════════════════════════════════════════════════════════════

async function modifierTache(taskId, updates) {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const result = await response.json();
    console.log("✅ Tâche modifiée:", result.task);
    return result.task;
  } catch (err) {
    console.error("❌ Erreur modification:", err.message);
  }
}

// Exemples de modification
await modifierTache("task-abc123", {
  title: "Nouveau titre"
});

await modifierTache("task-abc123", {
  completed: true  // Marquer comme complétée
});

await modifierTache("task-abc123", {
  assignedTo: ["member-alice", "member-bob"],  // Changer les assignations
  priority: "high"
});

await modifierTache("task-abc123", {
  description: "Nouvelle description mise à jour"
});


// ═════════════════════════════════════════════════════════════════════════════
// 6. SUPPRIMER UNE TÂCHE
// ═════════════════════════════════════════════════════════════════════════════

async function supprimerTache(taskId) {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    console.log("✅ Tâche supprimée");
    return true;
  } catch (err) {
    console.error("❌ Erreur suppression:", err.message);
    return false;
  }
}

// Utilisation
await supprimerTache("task-abc123");


// ═════════════════════════════════════════════════════════════════════════════
// 7. GÉRER LES NOTIFICATIONS
// ═════════════════════════════════════════════════════════════════════════════

// Charger toutes les notifications
async function chargerNotifications() {
  try {
    const response = await fetch("/api/notifications", {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
      }
    });
    
    const result = await response.json();
    console.log("🔔 Notifications:");
    result.notifications.forEach(n => {
      console.log(`  - [${n.read ? "LUE" : "NOUVELLE"}] ${n.message}`);
    });
    return result.notifications;
  } catch (err) {
    console.error("❌ Erreur chargement notifications:", err.message);
  }
}

// Marquer une notification comme lue
async function marquerNotificationLue(notifId) {
  try {
    const response = await fetch(`/api/notifications/${notifId}/read`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("deepfocus-token")}`
      }
    });
    
    if (!response.ok) throw new Error("Erreur serveur");
    console.log("✅ Notification marquée comme lue");
  } catch (err) {
    console.error("❌ Erreur:", err.message);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// 8. SYNCHRONISATION TEMPS-RÉEL (EventSource)
// ═════════════════════════════════════════════════════════════════════════════

function setupEventStream(token, onUpdate) {
  const eventSource = new EventSource(`/api/workspace/stream?token=${token}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("🔄 Mise à jour temps-réel reçue:", data);
      onUpdate(data.workspace);
    } catch (err) {
      console.error("Erreur parsing:", err);
    }
  };
  
  eventSource.onerror = () => {
    console.warn("⚠️ Perte de connexion au serveur");
    eventSource.close();
    
    // Reconnexion après 3 secondes
    setTimeout(() => {
      console.log("🔄 Tentative de reconnexion...");
      setupEventStream(token, onUpdate);
    }, 3000);
  };
  
  return eventSource;
}

// Utilisation dans React
useEffect(() => {
  const token = localStorage.getItem("deepfocus-token");
  if (!token) return;
  
  const eventSource = setupEventStream(token, (updatedWorkspace) => {
    setWorkspace(updatedWorkspace);
    console.log("✅ Interface mise à jour");
  });
  
  return () => eventSource.close();
}, []);


// ═════════════════════════════════════════════════════════════════════════════
// 9. FLUX COMPLET : CRÉER UNE ÉQUIPE ET COLLABORER
// ═════════════════════════════════════════════════════════════════════════════

async function scenarioComplet() {
  console.log("🚀 Scénario complet d'utilisation:");
  
  // 1. User 1 (Marie) s'enregistre
  console.log("\n1️⃣ Enregistrement de Marie (owner)...");
  // → Workspace créé automatiquement
  // → Code d'invitation généré
  
  // 2. Marie invite 2 membres
  console.log("2️⃣ Marie invite Pierre et Luc...");
  await inviterUtilisateur("pierre@example.com");
  await inviterUtilisateur("luc@example.com");
  
  // 3. Pierre et Luc acceptent l'invitation
  console.log("3️⃣ Pierre et Luc acceptent...");
  // → Ils reçoivent les notifications
  // → Ils voient le workspace
  
  // 4. Marie crée des tâches
  console.log("4️⃣ Marie crée les tâches du sprint...");
  const t1 = await creerTache({
    title: "Design UI",
    startDate: "2026-04-20",
    assignedTo: ["member-pierre"]
  });
  const t2 = await creerTache({
    title: "Backend API",
    startDate: "2026-04-20",
    assignedTo: ["member-luc"]
  });
  const t3 = await creerTache({
    title: "Tests E2E",
    startDate: "2026-04-22",
    assignedTo: ["member-pierre", "member-luc"]
  });
  
  // 5. Pierre et Luc voient les tâches en Planning
  console.log("5️⃣ Pierre et Luc voient les tâches...");
  const tachesPierre = await chargerTachesJour("2026-04-20");
  console.log("  Pierre voit:", tachesPierre.length, "tâches");
  
  // 6. Pierre marque son Design comme complété
  console.log("6️⃣ Pierre complète le design...");
  await modifierTache(t1.id, { completed: true });
  
  // 7. Marie vérifie l'avancement
  console.log("7️⃣ Marie voit l'avancement du sprint...");
  const tachesMois = await chargerTachesMois("2026-04");
  console.log("  Total:", tachesMois.length, "tâches");
  console.log("  Complétées:", tachesMois.filter(t => t.completed).length);
  
  console.log("\n✅ Scénario complété!");
}

// Lancer le scénario
// await scenarioComplet();


// ═════════════════════════════════════════════════════════════════════════════
// 10. STRUCTURES DE DONNÉES DE RÉFÉRENCE
// ═════════════════════════════════════════════════════════════════════════════

// Structure d'une Tâche
const exempleTache = {
  id: "task-xyz789",
  title: "Rédiger documentation",
  description: "Documentation technique complète du module API",
  startDate: "2026-04-20",
  endDate: "2026-04-22",
  priority: "high",  // low, medium, high
  assignedTo: ["member-alice", "member-bob"],
  createdBy: 123,    // User ID
  createdAt: "2026-04-15T10:00:00Z",
  completed: false,
  attachments: [],
  comments: []
};

// Structure d'une Notification
const exempleNotification = {
  id: "notif-abc123",
  userId: 456,
  taskId: "task-xyz789",
  type: "task_assigned",  // ou "member_joined"
  message: "Vous avez été assigné à : Rédiger documentation",
  read: false,
  createdAt: "2026-04-15T11:00:00Z"
};

// Structure d'une Invitation
const exempleInvitation = {
  id: "invite-def456",
  email: "nouveau@example.com",
  status: "pending",  // ou "accepted"
  createdAt: "2026-04-15T09:00:00Z",
  createdBy: 123
};

// Structure d'un Membre du Workspace
const exempleMembre = {
  id: "member-ghi789",
  userId: 456,
  name: "Alice Martin",
  role: "member",  // ou "Owner"
  color: "#2563eb"
};

console.log("📚 Structures de données disponibles ci-dessus");
