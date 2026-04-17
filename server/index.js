import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import db, { initializeGlobalWorkspace } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "deepfocus-dev-secret");
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error("⚠️  JWT_SECRET doit être défini en production");
  process.exit(1);
}
const MAX_ADDITIONAL_USERS = 5;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.APP_UPLOADS_DIR || path.join(__dirname, "uploads");
const streams = new Map();
const onlineUsers = new Map(); // { workspaceId: Set<userId> }
let GLOBAL_WORKSPACE_ID = null; // ID du workspace global partagé
let httpServer = null;

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use("/uploads", express.static(uploadsDir));

// Servir le build React
const distDir = path.join(__dirname, "../dist");
app.use(express.static(distDir));

// Fallback route pour SPA - servir index.html pour les routes inconnues
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Route API non trouvée" });
  }
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) {
      res.status(404).json({ error: "Page non trouvée" });
    }
  });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safe);
  }
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) cb(null, true);
    else cb(new Error("Type de fichier non autorise"));
  }
});

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stableMemberId(userId) {
  return `member-${userId}`;
}

function normalizeRole(role) {
  return String(role || "").toLowerCase() === "owner" ? "Owner" : "member";
}

function cleanupRemovedMemberReferences(workspace, memberToRemove) {
  const removedMemberId = memberToRemove?.id;
  const removedUserId = memberToRemove?.userId;

  workspace.tasks = (workspace.tasks || []).map((task) => ({
    ...task,
    assignedTo: (task.assignedTo || []).filter((memberId) => memberId !== removedMemberId)
  }));

  for (const board of workspace.boards || []) {
    for (const list of board.lists || []) {
      for (const card of list.cards || []) {
        card.members = (card.members || []).filter((memberId) => memberId !== removedMemberId);
      }
    }
  }

  workspace.notifications = (workspace.notifications || []).filter((notification) => {
    if (removedUserId != null && notification.userId === removedUserId) {
      return false;
    }
    return notification.memberId !== removedMemberId;
  });
}

function createInviteCode() {
  return `JOIN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

function parseToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    req.user = parseToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Token invalide" });
  }
}

function createDefaultWorkspace(name) {
  const ownerMemberId = createId("member");
  const members = [{ id: ownerMemberId, userId: null, name, role: "Owner", color: "#0f766e" }];

  const labels = [
    { id: createId("label"), name: "Product", color: "#0f766e" },
    { id: createId("label"), name: "Design", color: "#8b5cf6" },
    { id: createId("label"), name: "Urgent", color: "#dc2626" },
    { id: createId("label"), name: "Tech", color: "#2563eb" },
    { id: createId("label"), name: "Marketing", color: "#ea580c" }
  ];

  const addDays = (days) => {
    const value = new Date();
    value.setDate(value.getDate() + days);
    return value.toISOString().slice(0, 10);
  };

  return {
    members,
    labels,
    tasks: [],
    invitations: [],
    notifications: [],
    activity: [{ id: createId("activity"), text: "Workspace créé", createdAt: new Date().toISOString() }],
    boards: [
      {
        id: createId("board"),
        name: "📊 Dashboard",
        description: "Vue d'ensemble de vos projets et progressions",
        cover: "#0f766e",
        favorite: true,
        lists: [
          {
            id: createId("list"),
            name: "Projets Actifs",
            cards: [
              {
                id: createId("card"),
                title: "🚀 Bienvenue dans DeepFocus",
                description: "Commencez par créer votre premier projet ou tâche. Cliquez sur les boutons \"+\" pour ajouter du contenu.",
                dueDate: addDays(7),
                labels: [labels[0].id],
                members: [ownerMemberId],
                cover: "#0f766e",
                checklist: [],
                comments: [],
                attachments: [],
                archived: false,
                createdAt: new Date().toISOString()
              }
            ]
          }
        ]
      },
      {
        id: createId("board"),
        name: "📋 Tâches",
        description: "Gérez vos tâches et votre planning",
        cover: "#2563eb",
        favorite: true,
        lists: [
          { id: createId("list"), name: "À Faire", cards: [] },
          { id: createId("list"), name: "En Cours", cards: [] },
          { id: createId("list"), name: "Terminées", cards: [] }
        ]
      },
      {
        id: createId("board"),
        name: "🎨 Design",
        description: "Prototypes et ressources visuelles",
        cover: "#8b5cf6",
        favorite: false,
        lists: [
          { id: createId("list"), name: "Concepts", cards: [] },
          { id: createId("list"), name: "En Révision", cards: [] },
          { id: createId("list"), name: "Approuvé", cards: [] }
        ]
      },
      {
        id: createId("board"),
        name: "🔧 Développement",
        description: "Suivi du développement technique",
        cover: "#2563eb",
        favorite: false,
        lists: [
          { id: createId("list"), name: "Backlog", cards: [] },
          { id: createId("list"), name: "Sprint Actif", cards: [] },
          { id: createId("list"), name: "Code Review", cards: [] },
          { id: createId("list"), name: "Déployé", cards: [] }
        ]
      },
      {
        id: createId("board"),
        name: "📈 Marketing",
        description: "Campagnes et stratégies marketing",
        cover: "#ea580c",
        favorite: false,
        lists: [
          { id: createId("list"), name: "Idées", cards: [] },
          { id: createId("list"), name: "En Préparation", cards: [] },
          { id: createId("list"), name: "En Cours", cards: [] },
          { id: createId("list"), name: "Analysé", cards: [] }
        ]
      }
    ]
  };
}

async function getWorkspaceRowByUserId(userId) {
  const result = await db.query(
    `SELECT w.*
     FROM users u
     JOIN workspaces w ON w.id = u.active_workspace_id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
}

async function syncWorkspaceMembers(workspaceRow) {
  if (!workspaceRow || !workspaceRow.data_json) {
    console.warn("⚠️ Workspace invalide:", workspaceRow);
    const empty = { boards: [], members: [], invitations: [], activity: [], tasks: [], labels: [], notifications: [] };
    return empty;
  }
  
  console.log("🔄 Syncing workspace ID:", workspaceRow.id, "invite_code:", workspaceRow.invite_code);
  
  let workspace;
  try {
    workspace = JSON.parse(workspaceRow.data_json);
    console.log("✅ JSON parsé avec succès. Boards count:", workspace.boards?.length || 0);
  } catch (err) {
    console.error("⚠️ Erreur parsing workspace JSON:", err.message);
    console.error("Data_json preview:", workspaceRow.data_json.substring(0, 200));
    return { boards: [], members: [], invitations: [], activity: [], tasks: [], labels: [], notifications: [] };
  }
  
  // S'assurer que toutes les propriétés existent
  workspace.boards = workspace.boards || [];
  workspace.members = workspace.members || [];
  workspace.invitations = workspace.invitations || [];
  workspace.activity = workspace.activity || [];
  workspace.tasks = workspace.tasks || [];
  workspace.labels = workspace.labels || [];
  workspace.notifications = workspace.notifications || [];
  
  console.log("✅ Workspace chargé avec", workspace.boards.length, "boards");
  
  const result = await db.query(
    `SELECT u.id AS user_id, u.name, u.email, wm.role
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1`,
    [workspaceRow.id]
  );
  const members = result.rows;

  workspace.members = (workspace.members || [])
    .filter((member) => member.userId !== null && member.userId !== undefined)
    .map((member) => ({
      ...member,
      id: member.id || stableMemberId(member.userId),
      role: normalizeRole(member.role)
    }));
  
  const byUser = new Map(workspace.members.map((m) => [m.userId, m]));
  for (const user of members) {
    if (byUser.has(user.user_id)) {
      const existing = byUser.get(user.user_id);
      existing.id = existing.id || stableMemberId(user.user_id);
      existing.name = user.name;
      existing.role = normalizeRole(user.role);
    } else {
      workspace.members.push({
        id: stableMemberId(user.user_id),
        userId: user.user_id,
        name: user.name,
        role: normalizeRole(user.role),
        color: ["#0f766e", "#2563eb", "#7c3aed", "#ea580c"][user.user_id % 4]
      });
    }
  }
  return workspace;
}

async function saveWorkspaceById(workspaceId, workspace) {
  await db.query(
    "UPDATE workspaces SET data_json = $1, updated_at = NOW() WHERE id = $2",
    [JSON.stringify(workspace), workspaceId]
  );
}

function findTaskById(workspace, taskId) {
  workspace.tasks = workspace.tasks || [];
  return workspace.tasks.find((task) => task.id === taskId);
}

async function broadcastWorkspace(workspaceId) {
  const result = await db.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
  const row = result.rows[0];
  if (!row) return;
  const workspace = await syncWorkspaceMembers(row);
  const online = onlineUsers.get(workspaceId) || new Set();
  workspace.onlineUserIds = Array.from(online);
  const payload = JSON.stringify({ workspace, inviteCode: row.invite_code });
  const clients = streams.get(workspaceId) || new Set();
  for (const res of clients) {
    res.write(`data: ${payload}\n\n`);
  }
}

async function responseForUser(user) {
  const workspaceRow = await getWorkspaceRowByUserId(user.id);
  if (!workspaceRow) {
    console.error("⚠️  Workspace non trouvé pour l'utilisateur:", user.id);
    return {
      user: { id: user.id, name: user.name, email: user.email, activeWorkspaceId: null },
      workspace: { boards: [], members: [], invitations: [], notifications: [], activity: [], tasks: [], labels: [] },
      inviteCode: null
    };
  }
  
  console.log("📦 WorkspaceRow pour l'utilisateur", user.id, ":", { id: workspaceRow.id, invite_code: workspaceRow.invite_code });
  
  const workspace = await syncWorkspaceMembers(workspaceRow);
  
  console.log("✅ Workspace chargé avec", workspace.boards?.length || 0, "boards pour l'utilisateur", user.id);
  
  return {
    user: { id: user.id, name: user.name, email: user.email, activeWorkspaceId: workspaceRow.id },
    workspace,
    inviteCode: workspaceRow.invite_code || null
  };
}

async function withCurrentWorkspace(req, res, next) {
  try {
    const row = await getWorkspaceRowByUserId(req.user.userId);
    if (!row) return res.status(404).json({ error: "Workspace introuvable" });
    req.workspaceRow = row;
    req.workspace = await syncWorkspaceMembers(row);
    next();
  } catch (err) {
    next(err);
  }
}

// ─── Routes Auth ────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nom, email et mot de passe requis" });
    }

    const safeEmail = email.trim().toLowerCase();
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [safeEmail]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Cet email existe deja" });

    // Utiliser le workspace global
    let globalWorkspaceId = GLOBAL_WORKSPACE_ID;
    if (!globalWorkspaceId) {
      console.warn("⚠️  GLOBAL_WORKSPACE_ID non défini, utilisation du fallback 1");
      globalWorkspaceId = 1;
    }
    
    console.log("📝 Enregistrement utilisateur - Workspace ID:", globalWorkspaceId);

    // Vérifier que le workspace existe
    const wsCheck = await db.query("SELECT id, invite_code FROM workspaces WHERE id = $1", [globalWorkspaceId]);
    if (wsCheck.rows.length === 0) {
      console.error("❌ Workspace global introuvable (ID:", globalWorkspaceId, ")");
      return res.status(500).json({ error: "Workspace global non trouvé" });
    }
    
    console.log("✅ Workspace trouvé:", wsCheck.rows[0]);

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await db.query(
      "INSERT INTO users (name, email, password_hash, active_workspace_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [name.trim(), safeEmail, passwordHash, globalWorkspaceId]
    );
    const userId = userResult.rows[0].id;

    // Ajouter le user comme membre du workspace global
    await db.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
      [globalWorkspaceId, userId]
    );

    // Mettre à jour le workspace pour ajouter le membre
    await broadcastWorkspace(globalWorkspaceId);

    const user = { id: userId, name: name.trim(), email: safeEmail };
    res.json({ token: signToken(user), ...(await responseForUser(user)) });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const safeEmail = (email || "").trim().toLowerCase();
    const result = await db.query("SELECT * FROM users WHERE email = $1", [safeEmail]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });

    const matches = await bcrypt.compare(password || "", user.password_hash);
    if (!matches) return res.status(401).json({ error: "Identifiants invalides" });

    res.json({ token: signToken(user), ...(await responseForUser(user)) });
  } catch (err) {
    next(err);
  }
});

app.get("/api/auth/me", auth, async (req, res, next) => {
  try {
    const result = await db.query("SELECT id, name, email FROM users WHERE id = $1", [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(await responseForUser(user));
  } catch (err) {
    next(err);
  }
});
app.delete("/api/auth/delete", auth, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Enlever le user du workspace global
    await db.query("DELETE FROM workspace_members WHERE user_id = $1", [userId]);
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
    
    // Broadcaster la mise à jour
    if (GLOBAL_WORKSPACE_ID) {
      await broadcastWorkspace(GLOBAL_WORKSPACE_ID);
    }
    
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
// ─── Routes Workspace ────────────────────────────────────────────────────────

app.post("/api/workspace/join", auth, async (req, res, next) => {
  try {
    const inviteCode = String(req.body?.inviteCode || "").trim().toUpperCase();
    const rowResult = await db.query("SELECT * FROM workspaces WHERE invite_code = $1", [inviteCode]);
    const row = rowResult.rows[0];
    if (!row) return res.status(404).json({ error: "Code invalide" });

    const existingMembership = await db.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [row.id, req.user.userId]
    );
    const totalMembersResult = await db.query(
      "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = $1",
      [row.id]
    );
    const totalMembers = parseInt(totalMembersResult.rows[0].count, 10);

    if (!existingMembership.rows.length && totalMembers >= MAX_ADDITIONAL_USERS + 1) {
      return res.status(409).json({ error: "Limite de 5 utilisateurs supplementaires atteinte" });
    }

    await db.query("UPDATE users SET active_workspace_id = $1 WHERE id = $2", [row.id, req.user.userId]);
    await db.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
      [row.id, req.user.userId]
    );

    const userResult = await db.query("SELECT id, name, email FROM users WHERE id = $1", [req.user.userId]);
    const user = userResult.rows[0];
    await broadcastWorkspace(row.id);
    res.json(await responseForUser(user));
  } catch (err) {
    next(err);
  }
});

app.get("/api/workspace/stream", async (req, res) => {
  const token = String(req.query.token || "");
  try {
    const payload = parseToken(token);
    const workspaceRow = await getWorkspaceRowByUserId(payload.userId);
    if (!workspaceRow) return res.status(404).end();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });

    const workspaceId = workspaceRow.id;
    const userId = payload.userId;
    
    // Ajouter utilisateur à online
    const online = onlineUsers.get(workspaceId) || new Set();
    online.add(userId);
    onlineUsers.set(workspaceId, online);
    
    const group = streams.get(workspaceId) || new Set();
    group.add(res);
    streams.set(workspaceId, group);

    const workspace = await syncWorkspaceMembers(workspaceRow);
    workspace.onlineUserIds = Array.from(online);
    res.write(`data: ${JSON.stringify({ workspace, inviteCode: workspaceRow.invite_code })}\n\n`);

    req.on("close", () => {
      // Enlever utilisateur de online
      const current = onlineUsers.get(workspaceId);
      if (current) {
        current.delete(userId);
        if (current.size === 0) {
          onlineUsers.delete(workspaceId);
        }
      }
      
      const streamGroup = streams.get(workspaceId);
      if (!streamGroup) return;
      streamGroup.delete(res);
      if (!streamGroup.size) streams.delete(workspaceId);
      
      // Broadcaster la mise à jour
      broadcastWorkspace(workspaceId);
    });
  } catch {
    res.status(401).end();
  }
});

app.put("/api/workspace", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    const workspace = req.body?.workspace;
    if (!workspace || !Array.isArray(workspace.boards)) {
      return res.status(400).json({ error: "Workspace invalide" });
    }
    await saveWorkspaceById(req.workspaceRow.id, workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Route Pièces jointes ────────────────────────────────────────────────────

app.post("/api/attachments", auth, withCurrentWorkspace, upload.single("file"), async (req, res, next) => {
  try {
    const cardId = String(req.body?.cardId || "");
    if (!req.file || !cardId) {
      return res.status(400).json({ error: "Fichier et carte requis" });
    }

    let attached = false;
    for (const board of req.workspace.boards) {
      for (const list of board.lists) {
        const card = list.cards.find((item) => item.id === cardId);
        if (card) {
          card.attachments.push({
            id: createId("file"),
            name: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            url: `/uploads/${req.file.filename}`,
            createdAt: new Date().toISOString()
          });
          attached = true;
        }
      }
    }

    if (!attached) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn("Impossible de supprimer le fichier:", err.message);
      }
      return res.status(404).json({ error: "Carte introuvable" });
    }

    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ workspace: req.workspace });
  } catch (err) {
    next(err);
  }
});

// ─── Routes Tâches (Planning) ────────────────────────────────────────────────

app.post("/api/tasks/create", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, assignedTo = [], priority = "medium" } = req.body ?? {};
    if (!title || !startDate) {
      return res.status(400).json({ error: "Titre et date de début requis" });
    }

    const task = {
      id: createId("task"),
      title: title.trim(),
      description: description?.trim() || "",
      startDate,
      endDate: endDate || startDate,
      priority,
      assignedTo: Array.isArray(assignedTo) ? assignedTo : [],
      createdBy: req.user.userId,
      createdAt: new Date().toISOString(),
      completed: false,
      attachments: [],
      comments: []
    };

    req.workspace.tasks = req.workspace.tasks || [];
    req.workspace.tasks.push(task);

    // Créer des notifications pour les utilisateurs assignés
    for (const memberId of task.assignedTo) {
      const member = req.workspace.members.find(m => m.id === memberId);
      if (member?.userId) {
        const notification = {
          id: createId("notif"),
          userId: member.userId,
          taskId: task.id,
          type: "task_assigned",
          message: `Vous avez été assigné à : ${title}`,
          read: false,
          createdAt: new Date().toISOString()
        };
        req.workspace.notifications = req.workspace.notifications || [];
        req.workspace.notifications.push(notification);
      }
    }

    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

app.post("/api/tasks/:taskId/attachments", auth, withCurrentWorkspace, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Fichier requis" });
    }

    const task = findTaskById(req.workspace, req.params.taskId);
    if (!task) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Tâche introuvable" });
    }

    const userMember = req.workspace.members.find((member) => member.userId === req.user.userId);
    const isCreator = task.createdBy === req.user.userId;
    const isAssigned = task.assignedTo.includes(userMember?.id);

    if (!isCreator && !isAssigned) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: "Accès refusé" });
    }

    task.attachments = task.attachments || [];
    task.attachments.push({
      id: createId("taskfile"),
      name: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      createdAt: new Date().toISOString()
    });

    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ task, attachment: task.attachments.at(-1) });
  } catch (err) {
    next(err);
  }
});

app.put("/api/tasks/:taskId", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, assignedTo, priority, completed } = req.body ?? {};
    const task = findTaskById(req.workspace, req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: "Tâche introuvable" });
    }

    // Vérifier permissions : créateur ou assigné
    const userMember = req.workspace.members.find(m => m.userId === req.user.userId);
    const isCreator = task.createdBy === req.user.userId;
    const isAssigned = task.assignedTo.includes(userMember?.id);
    
    if (!isCreator && !isAssigned) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (startDate !== undefined) task.startDate = startDate;
    if (endDate !== undefined) task.endDate = endDate;
    if (priority !== undefined) task.priority = priority;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (completed !== undefined) task.completed = completed;

    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/tasks/:taskId", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    const task = findTaskById(req.workspace, req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: "Tâche introuvable" });
    }

    if (task.createdBy !== req.user.userId) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    req.workspace.tasks = req.workspace.tasks.filter(t => t.id !== req.params.taskId);
    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/tasks", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    const { view = "all", startDate, endDate } = req.query;
    req.workspace.tasks = req.workspace.tasks || [];
    let tasks = [...req.workspace.tasks];

    const userMember = req.workspace.members.find(m => m.userId === req.user.userId);
    
    // Filtrer selon le rôle
    if (normalizeRole(userMember?.role) !== "Owner") {
      tasks = tasks.filter(t => 
        t.createdBy === req.user.userId || t.assignedTo.includes(userMember?.id)
      );
    }

    // Filtrer par vue (jour/semaine/mois)
    if (view === "day" && startDate) {
      tasks = tasks.filter(t => t.startDate === startDate);
    } else if (view === "week" && startDate && endDate) {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      tasks = tasks.filter(t => t.startDate >= start && t.startDate <= end);
    } else if (view === "month" && startDate) {
      const month = startDate.substring(0, 7);
      tasks = tasks.filter(t => t.startDate?.substring(0, 7) === month);
    }

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// ─── Routes Invitations ──────────────────────────────────────────────────────

app.post("/api/invitations/send", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: "Email requis" });
    }

    const userMember = req.workspace.members.find(m => m.userId === req.user.userId);
    if (!userMember) {
      return res.status(403).json({ error: "Vous devez être membre de l'espace" });
    }

    // Vérifier le nombre de membres
    const totalMembers = req.workspace.members.length;
    if (totalMembers >= MAX_ADDITIONAL_USERS + 1) {
      return res.status(409).json({ error: `Limite de ${MAX_ADDITIONAL_USERS} utilisateurs supplémentaires atteinte` });
    }

    const invitation = {
      id: createId("invite"),
      email: email.trim().toLowerCase(),
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: req.user.userId
    };

    req.workspace.invitations = req.workspace.invitations || [];
    req.workspace.invitations.push(invitation);

    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ invitation });
  } catch (err) {
    next(err);
  }
});

app.get("/api/invitations", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    req.workspace.invitations = req.workspace.invitations || [];
    const userMember = req.workspace.members.find(m => m.userId === req.user.userId);
    
    let invitations = req.workspace.invitations;
    if (normalizeRole(userMember?.role) !== "Owner") {
      invitations = invitations.filter(i => i.email === req.user.email);
    }

    res.json({ invitations });
  } catch (err) {
    next(err);
  }
});

app.post("/api/invitations/:invitationId/accept", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    req.workspace.invitations = req.workspace.invitations || [];
    const invitation = req.workspace.invitations.find(i => i.id === req.params.invitationId);
    
    if (!invitation) {
      return res.status(404).json({ error: "Invitation introuvable" });
    }

    if (invitation.email !== req.user.email) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    invitation.status = "accepted";
    
    // Ajouter le membre
    const newMember = {
      id: createId("member"),
      userId: req.user.userId,
      name: req.user.name || req.user.email,
      role: "member",
      color: ["#0f766e", "#2563eb", "#7c3aed", "#ea580c"][req.user.userId % 4]
    };
    req.workspace.members.push(newMember);

    // Créer une notification pour l'owner
    const owner = req.workspace.members.find(m => m.role === "Owner");
    if (owner?.userId) {
      const notification = {
        id: createId("notif"),
        userId: owner.userId,
        type: "member_joined",
        message: `${req.user.name || req.user.email} a rejoint l'espace`,
        read: false,
        createdAt: new Date().toISOString()
      };
      req.workspace.notifications = req.workspace.notifications || [];
      req.workspace.notifications.push(notification);
    }

    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ ok: true, member: newMember });
  } catch (err) {
    next(err);
  }
});

// ─── Route Suppression Membre ────────────────────────────────────────────────

app.delete("/api/workspace/members/:memberId", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    const memberId = req.params.memberId;
    const memberToRemove = req.workspace.members.find(m => m.id === memberId);
    
    if (!memberToRemove) {
      return res.status(404).json({ error: "Membre introuvable" });
    }

    // Ne pas pouvoir se supprimer soi-même
    if (memberToRemove.userId === req.user.userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas vous supprimer vous-même" });
    }

    // Enlever le membre du workspace
    req.workspace.members = req.workspace.members.filter(m => m.id !== memberId);
    cleanupRemovedMemberReferences(req.workspace, memberToRemove);
    
    // Enlever de la base de données si c'est un vrai user
    if (memberToRemove.userId) {
      await db.query(
        "DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
        [req.workspaceRow.id, memberToRemove.userId]
      );
    }

    // Sauvegarder les changements
    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    
    // Broadcaster immédiatement
    await broadcastWorkspace(req.workspaceRow.id);
    
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Routes Notifications ────────────────────────────────────────────────────

app.get("/api/notifications", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    req.workspace.notifications = req.workspace.notifications || [];
    const notifications = req.workspace.notifications.filter(n => n.userId === req.user.userId);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

app.put("/api/notifications/:notificationId/read", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    req.workspace.notifications = req.workspace.notifications || [];
    const notification = req.workspace.notifications.find(n => n.id === req.params.notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: "Notification introuvable" });
    }

    if (notification.userId !== req.user.userId) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    notification.read = true;
    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/notifications/:notificationId", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    req.workspace.notifications = req.workspace.notifications || [];
    const notification = req.workspace.notifications.find((item) => item.id === req.params.notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification introuvable" });
    }

    if (notification.userId !== req.user.userId) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    req.workspace.notifications = req.workspace.notifications.filter(
      (item) => item.id !== req.params.notificationId
    );
    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/notifications", auth, withCurrentWorkspace, async (req, res, next) => {
  try {
    req.workspace.notifications = (req.workspace.notifications || []).filter(
      (notification) => notification.userId !== req.user.userId
    );
    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Route keep-alive (empêche Render de s'endormir) ───────────────────────
app.get("/api/ping", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── Sitemap pour robots et search engines ───────────────────────────────────
app.get("/sitemap.xml", (req, res) => {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol).split(",")[0];
  const host = req.get("host");
  const baseUrl = `${proto}://${host}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n</urlset>`;
  res.type("application/xml").send(xml);
});

// ─── Fallback React en production ────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "../dist");
  app.get("*", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// ─── Gestionnaire d'erreurs global ───────────────────────────────────────────
app.use((error, _req, res, _next) => {
  console.error("Server error:", error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  if (error?.message) {
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: String(error) || "Erreur serveur" });
});

async function initServer() {
  try {
    // Initialiser le workspace global
    GLOBAL_WORKSPACE_ID = await initializeGlobalWorkspace(createDefaultWorkspace);
    console.log("✅ Workspace global initialisé (ID:", GLOBAL_WORKSPACE_ID, ")");
    
    // Vérifier qu'il existe dans la DB
    const checkResult = await db.query("SELECT id, invite_code FROM workspaces WHERE id = $1", [GLOBAL_WORKSPACE_ID]);
    if (checkResult.rows.length === 0) {
      console.error("❌ Workspace global (ID:", GLOBAL_WORKSPACE_ID, ") introuvable après création");
      throw new Error("Impossible de créer le workspace global");
    }
    
    const wsRow = checkResult.rows[0];
    console.log("✅ Workspace global vérifié dans la DB - ID:", wsRow.id, ", invite_code:", wsRow.invite_code);
  } catch (err) {
    console.error("❌ Erreur initialisation workspace global:", err.message);
    process.exit(1);
  }
}

export async function startServer(port = PORT) {
  if (httpServer) {
    return httpServer;
  }

  await initServer();
  await new Promise((resolve) => {
    httpServer = app.listen(port, () => {
      console.log(`🚀 DeepFocus API sur http://localhost:${port}`);
      resolve();
    });
  });
  return httpServer;
}

export async function stopServer() {
  if (!httpServer) return;
  await new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  httpServer = null;
}

const launchedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (launchedDirectly) {
  startServer().catch((error) => {
    console.error("❌ Impossible de démarrer le serveur:", error);
    process.exit(1);
  });
}
