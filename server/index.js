import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "trello2-local-secret";
const MAX_ADDITIONAL_USERS = 5;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
const streams = new Map();

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use("/uploads", express.static(uploadsDir));

// Servir le build React en production
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "../dist");
  app.use(express.static(distDir));
}

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
    activity: [{ id: createId("activity"), text: "Workspace created", createdAt: new Date().toISOString() }],
    boards: [
      {
        id: createId("board"),
        name: "Product Launch",
        description: "Shared launch board with real-time sync.",
        cover: "sunset",
        favorite: true,
        lists: [
          {
            id: createId("list"),
            name: "Backlog",
            cards: [
              {
                id: createId("card"),
                title: "Prepare landing page",
                description: "Hero, CTA and responsive polish.",
                dueDate: addDays(2),
                labels: [labels[0].id, labels[4].id],
                members: [ownerMemberId],
                cover: "sunset",
                checklist: [
                  { id: createId("check"), text: "Hero copy", done: true },
                  { id: createId("check"), text: "Mobile layout", done: false }
                ],
                comments: [],
                attachments: [],
                archived: false,
                createdAt: new Date().toISOString()
              }
            ]
          },
          { id: createId("list"), name: "In Progress", cards: [] },
          { id: createId("list"), name: "Done", cards: [] }
        ]
      }
    ]
  };
}

async function getWorkspaceRowByUserId(userId) {
  const result = await pool.query(
    `SELECT w.*
     FROM users u
     JOIN workspaces w ON w.id = u.active_workspace_id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
}

async function syncWorkspaceMembers(workspaceRow) {
  const workspace = JSON.parse(workspaceRow.data_json);
  const result = await pool.query(
    `SELECT u.id AS user_id, u.name, u.email, wm.role
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1`,
    [workspaceRow.id]
  );
  const members = result.rows;

  const byUser = new Map(workspace.members.filter((m) => m.userId).map((m) => [m.userId, m]));
  for (const user of members) {
    if (byUser.has(user.user_id)) {
      const existing = byUser.get(user.user_id);
      existing.name = user.name;
      existing.role = user.role;
    } else {
      workspace.members.push({
        id: createId("member"),
        userId: user.user_id,
        name: user.name,
        role: user.role,
        color: ["#0f766e", "#2563eb", "#7c3aed", "#ea580c"][user.user_id % 4]
      });
    }
  }
  return workspace;
}

async function saveWorkspaceById(workspaceId, workspace) {
  await pool.query(
    "UPDATE workspaces SET data_json = $1, updated_at = NOW() WHERE id = $2",
    [JSON.stringify(workspace), workspaceId]
  );
}

async function broadcastWorkspace(workspaceId) {
  const result = await pool.query("SELECT * FROM workspaces WHERE id = $1", [workspaceId]);
  const row = result.rows[0];
  if (!row) return;
  const workspace = await syncWorkspaceMembers(row);
  const payload = JSON.stringify({ workspace, inviteCode: row.invite_code });
  const clients = streams.get(workspaceId) || new Set();
  for (const res of clients) {
    res.write(`data: ${payload}\n\n`);
  }
}

async function responseForUser(user) {
  const workspaceRow = await getWorkspaceRowByUserId(user.id);
  const workspace = await syncWorkspaceMembers(workspaceRow);
  return {
    user: { id: user.id, name: user.name, email: user.email, activeWorkspaceId: workspaceRow.id },
    workspace,
    inviteCode: workspaceRow.invite_code
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
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [safeEmail]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Cet email existe deja" });

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [name.trim(), safeEmail, passwordHash]
    );
    const userId = userResult.rows[0].id;

    const workspace = createDefaultWorkspace(name.trim());
    workspace.members[0].userId = userId;
    const inviteCode = createInviteCode();

    const workspaceResult = await pool.query(
      "INSERT INTO workspaces (owner_user_id, invite_code, data_json) VALUES ($1, $2, $3) RETURNING id",
      [userId, inviteCode, JSON.stringify(workspace)]
    );
    const workspaceId = workspaceResult.rows[0].id;

    await pool.query("UPDATE users SET active_workspace_id = $1 WHERE id = $2", [workspaceId, userId]);
    await pool.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
      [workspaceId, userId]
    );

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
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [safeEmail]);
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
    const result = await pool.query("SELECT id, name, email FROM users WHERE id = $1", [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(await responseForUser(user));
  } catch (err) {
    next(err);
  }
});

// ─── Routes Workspace ────────────────────────────────────────────────────────

app.post("/api/workspace/join", auth, async (req, res, next) => {
  try {
    const inviteCode = String(req.body?.inviteCode || "").trim().toUpperCase();
    const rowResult = await pool.query("SELECT * FROM workspaces WHERE invite_code = $1", [inviteCode]);
    const row = rowResult.rows[0];
    if (!row) return res.status(404).json({ error: "Code invalide" });

    const existingMembership = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [row.id, req.user.userId]
    );
    const totalMembersResult = await pool.query(
      "SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = $1",
      [row.id]
    );
    const totalMembers = parseInt(totalMembersResult.rows[0].count, 10);

    if (!existingMembership.rows.length && totalMembers >= MAX_ADDITIONAL_USERS + 1) {
      return res.status(409).json({ error: "Limite de 5 utilisateurs supplementaires atteinte" });
    }

    await pool.query("UPDATE users SET active_workspace_id = $1 WHERE id = $2", [row.id, req.user.userId]);
    await pool.query(
      "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
      [row.id, req.user.userId]
    );

    const userResult = await pool.query("SELECT id, name, email FROM users WHERE id = $1", [req.user.userId]);
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
    const group = streams.get(workspaceId) || new Set();
    group.add(res);
    streams.set(workspaceId, group);

    const workspace = await syncWorkspaceMembers(workspaceRow);
    res.write(`data: ${JSON.stringify({ workspace, inviteCode: workspaceRow.invite_code })}\n\n`);

    req.on("close", () => {
      const current = streams.get(workspaceId);
      if (!current) return;
      current.delete(res);
      if (!current.size) streams.delete(workspaceId);
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
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Carte introuvable" });
    }

    await saveWorkspaceById(req.workspaceRow.id, req.workspace);
    await broadcastWorkspace(req.workspaceRow.id);
    res.json({ workspace: req.workspace });
  } catch (err) {
    next(err);
  }
});

// ─── Route keep-alive (empêche Render de s'endormir) ───────────────────────
app.get("/api/ping", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── Fallback React en production ────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "../dist");
  app.get("*", (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

// ─── Gestionnaire d'erreurs global ───────────────────────────────────────────
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  if (error?.message) {
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: "Erreur serveur" });
});

app.listen(PORT, () => {
  console.log(`🚀 Trello 2 API sur http://localhost:${PORT}`);
});
