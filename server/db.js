import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.APP_DATA_DIR || path.join(__dirname, "data");
const dbFile = path.join(dataDir, "db.json");
const { Pool } = pg;

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    const value = rest.join("=").trim();
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^"|"$/g, "");
    }
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === "production";

let pool = null;
let usePostgres = false;

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadStore() {
  if (!fs.existsSync(dbFile)) {
    return {
      users: [],
      workspaces: [],
      workspace_members: [],
      nextUserId: 1,
      nextWorkspaceId: 1
    };
  }

  try {
    return JSON.parse(fs.readFileSync(dbFile, "utf-8"));
  } catch (err) {
    console.warn("🟡 Impossible de lire le stockage local, réinitialisation du fichier.", err.message || err);
    return {
      users: [],
      workspaces: [],
      workspace_members: [],
      nextUserId: 1,
      nextWorkspaceId: 1
    };
  }
}

function saveStore() {
  fs.writeFileSync(dbFile, JSON.stringify(store, null, 2));
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

const store = loadStore();

async function initPostgres() {
  if (!connectionString) {
    return false;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: isProduction ? { rejectUnauthorized: false } : false
    });
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    console.warn("🟡 PostgreSQL indisponible, bascule en stockage local:", err.message || err);
    pool = null;
    return false;
  }
}

function jsonQuery(sql, params = []) {
  const normalized = normalizeSql(sql);

  if (normalized.startsWith("SELECT w.* FROM users u JOIN workspaces w ON w.id = u.active_workspace_id WHERE u.id = $1")) {
    const userId = params[0];
    const user = store.users.find((item) => String(item.id) === String(userId));
    if (!user || user.active_workspace_id == null) return { rows: [] };
    const workspace = store.workspaces.find((item) => String(item.id) === String(user.active_workspace_id));
    return { rows: workspace ? [workspace] : [] };
  }

  if (normalized.startsWith("SELECT u.id AS user_id, u.name, u.email, wm.role FROM workspace_members wm JOIN users u ON u.id = wm.user_id WHERE wm.workspace_id = $1")) {
    const workspaceId = params[0];
    const members = store.workspace_members
      .filter((item) => String(item.workspace_id) === String(workspaceId))
      .map((item) => {
        const user = store.users.find((userItem) => String(userItem.id) === String(item.user_id));
        return {
          user_id: item.user_id,
          name: user?.name || "Utilisateur",
          email: user?.email || "",
          role: item.role
        };
      });
    return { rows: members };
  }

  if (normalized.startsWith("SELECT id FROM users WHERE email = $1")) {
    const email = String(params[0] || "").trim().toLowerCase();
    const user = store.users.find((item) => String(item.email).toLowerCase() === email);
    return { rows: user ? [{ id: user.id }] : [] };
  }

  if (normalized.startsWith("INSERT INTO users")) {
    const [name, email, passwordHash, activeWorkspaceId] = params;
    const nextId = store.nextUserId++;
    const user = {
      id: nextId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password_hash: passwordHash,
      active_workspace_id: activeWorkspaceId ? Number(activeWorkspaceId) : null,
      created_at: new Date().toISOString()
    };
    store.users.push(user);
    saveStore();
    return { rows: [{ id: user.id }] };
  }

  if (normalized.startsWith("INSERT INTO workspaces")) {
    const [ownerUserId, inviteCode, dataJson] = params;
    const nextId = store.nextWorkspaceId++;
    const workspace = {
      id: nextId,
      owner_user_id: Number(ownerUserId),
      invite_code: String(inviteCode),
      data_json: String(dataJson),
      updated_at: new Date().toISOString()
    };
    store.workspaces.push(workspace);
    saveStore();
    return { rows: [{ id: workspace.id }] };
  }

  if (normalized.startsWith("UPDATE users SET active_workspace_id = $1 WHERE id = $2")) {
    const [workspaceId, userId] = params;
    const user = store.users.find((item) => String(item.id) === String(userId));
    if (user) {
      user.active_workspace_id = Number(workspaceId);
      saveStore();
    }
    return { rows: [] };
  }

  if (normalized.startsWith("INSERT INTO workspace_members")) {
    const [workspaceId, userId] = params;
    const roleMatch = normalized.match(/VALUES \(\$1, \$2, '([^']+)'\)/i);
    const role = roleMatch?.[1] || "member";
    const exists = store.workspace_members.some(
      (item) => String(item.workspace_id) === String(workspaceId) && String(item.user_id) === String(userId)
    );
    if (!exists) {
      store.workspace_members.push({
        workspace_id: Number(workspaceId),
        user_id: Number(userId),
        role
      });
      saveStore();
    }
    return { rows: [] };
  }

  if (normalized.startsWith("SELECT * FROM users WHERE email = $1")) {
    const email = String(params[0] || "").trim().toLowerCase();
    const user = store.users.find((item) => String(item.email).toLowerCase() === email);
    return { rows: user ? [user] : [] };
  }

  if (normalized.startsWith("SELECT id, name, email FROM users WHERE id = $1")) {
    const userId = params[0];
    const user = store.users.find((item) => String(item.id) === String(userId));
    if (!user) return { rows: [] };
    return { rows: [{ id: user.id, name: user.name, email: user.email }] };
  }

  if (normalized.startsWith("SELECT * FROM workspaces WHERE invite_code = $1")) {
    const inviteCode = String(params[0] || "").trim();
    const workspace = store.workspaces.find((item) => String(item.invite_code) === inviteCode);
    return { rows: workspace ? [workspace] : [] };
  }

  if (normalized.startsWith("SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2")) {
    const [workspaceId, userId] = params;
    const exists = store.workspace_members.some(
      (item) => String(item.workspace_id) === String(workspaceId) && String(item.user_id) === String(userId)
    );
    return { rows: exists ? [{ '1': 1 }] : [] };
  }

  if (normalized.startsWith("SELECT COUNT(*) AS count FROM workspace_members WHERE workspace_id = $1")) {
    const workspaceId = params[0];
    const count = store.workspace_members.filter((item) => String(item.workspace_id) === String(workspaceId)).length;
    return { rows: [{ count }] };
  }

  if (normalized.startsWith("DELETE FROM workspace_members WHERE user_id = $1")) {
    const userId = params[0];
    store.workspace_members = store.workspace_members.filter(
      (item) => String(item.user_id) !== String(userId)
    );
    saveStore();
    return { rows: [] };
  }

  if (normalized.startsWith("DELETE FROM users WHERE id = $1")) {
    const userId = params[0];
    store.users = store.users.filter((item) => String(item.id) !== String(userId));
    saveStore();
    return { rows: [] };
  }

  if (normalized.startsWith("SELECT id FROM workspaces WHERE owner_user_id = $1")) {
    const ownerUserId = params[0];
    const workspaces = store.workspaces.filter((item) => String(item.owner_user_id) === String(ownerUserId));
    return { rows: workspaces.map((item) => ({ id: item.id })) };
  }

  if (normalized.startsWith("DELETE FROM workspace_members WHERE workspace_id = ANY($1)")) {
    const workspaceIds = params[0] || [];
    store.workspace_members = store.workspace_members.filter(
      (item) => !workspaceIds.some((workspaceId) => String(item.workspace_id) === String(workspaceId))
    );
    saveStore();
    return { rows: [] };
  }

  if (normalized.startsWith("DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2")) {
    const [workspaceId, userId] = params;
    store.workspace_members = store.workspace_members.filter(
      (item) => !(String(item.workspace_id) === String(workspaceId) && String(item.user_id) === String(userId))
    );
    saveStore();
    return { rows: [] };
  }

  if (normalized.startsWith("DELETE FROM workspaces WHERE owner_user_id = $1")) {
    const ownerUserId = params[0];
    store.workspaces = store.workspaces.filter((item) => String(item.owner_user_id) !== String(ownerUserId));
    saveStore();
    return { rows: [] };
  }

  if (normalized.startsWith("SELECT * FROM workspaces WHERE id = $1")) {
    const workspaceId = params[0];
    const workspace = store.workspaces.find((item) => String(item.id) === String(workspaceId));
    return { rows: workspace ? [workspace] : [] };
  }

  if (normalized.startsWith("UPDATE workspaces SET data_json = $1, updated_at = NOW() WHERE id = $2")) {
    const [dataJson, workspaceId] = params;
    const workspace = store.workspaces.find((item) => String(item.id) === String(workspaceId));
    if (workspace) {
      workspace.data_json = String(dataJson);
      workspace.updated_at = new Date().toISOString();
      saveStore();
    }
    return { rows: [] };
  }

  throw new Error(`Requête SQL non prise en charge par le stockage local : ${normalized}`);
}

async function query(sql, params = []) {
  if (usePostgres && pool) {
    return pool.query(sql, params);
  }
  return jsonQuery(sql, params);
}

export default {
  query
};

await (async () => {
  ensureDataDir();
  usePostgres = await initPostgres();
  if (usePostgres) {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        active_workspace_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        owner_user_id INTEGER NOT NULL,
        invite_code TEXT NOT NULL UNIQUE,
        data_json TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        PRIMARY KEY (workspace_id, user_id)
      )`
    ];

    for (const sql of statements) {
      await pool.query(sql);
    }
    console.log("✅ PostgreSQL initialisée");
  } else {
    saveStore();
    console.log("✅ Stockage local initialisé dans server/data/db.json");
  }
})();

// Exporter une fonction pour initialiser le workspace global
export async function initializeGlobalWorkspace(createDefaultWorkspaceFn) {
  // Vérifier si un workspace global existe déjà
  const globalWkspace = store.workspaces.find(w => w.invite_code === "GLOBAL");
  
  if (!globalWkspace) {
    // Créer le workspace global
    const newWorkspace = {
      id: store.nextWorkspaceId++,
      owner_user_id: null,
      invite_code: "GLOBAL",
      data_json: JSON.stringify(createDefaultWorkspaceFn("DeepFocus Collaboratif")),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    store.workspaces.push(newWorkspace);
    saveStore();
    console.log("✅ Workspace global créé (ID:", newWorkspace.id, ")");
    return newWorkspace.id;
  } else {
    console.log("✅ Workspace global trouvé (ID:", globalWkspace.id, ")");
    return globalWkspace.id;
  }
}
