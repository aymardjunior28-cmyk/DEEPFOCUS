import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_URL = "http://127.0.0.1:3001";
const DEFAULT_REMOTE_URL = "https://deepfocus-zfwr.onrender.com";
let stopEmbeddedServer = null;

function getRemoteUrl() {
  const value = String(process.env.DEEPFOCUS_REMOTE_URL || "").trim();
  if (value) return value.replace(/\/+$/, "");
  return DEFAULT_REMOTE_URL;
}

async function waitForServer(timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`${SERVER_URL}/api/ping`);
      if (response.ok) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Le serveur n'a pas demarre a temps.");
}

async function startEmbeddedServer() {
  const userDataPath = app.getPath("userData");
  const dataDir = path.join(userDataPath, "data");
  const uploadsDir = path.join(userDataPath, "uploads");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });

  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  process.env.APP_DATA_DIR = dataDir;
  process.env.APP_UPLOADS_DIR = uploadsDir;

  const serverModule = await import("../server/index.js");
  await serverModule.startServer(3001);
  stopEmbeddedServer = serverModule.stopServer;
}

async function createWindow() {
  const remoteUrl = getRemoteUrl();

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.ELECTRON_DEV === "true";
  const url = isDev ? "http://localhost:5173" : remoteUrl;

  if (isDev) {
    // In dev we run the API locally (see npm script electron:dev)
    await waitForServer();
  }

  await win.loadURL(url);
  win.once("ready-to-show", () => win.show());
}

app.on("ready", async () => {
  try {
    // Production: prefer the shared internet server (Render/Neon).
    // Set DEEPFOCUS_REMOTE_URL=local to run fully offline with an embedded server.
    if (process.env.DEEPFOCUS_REMOTE_URL === "local") {
      await startEmbeddedServer();
      await waitForServer();
    }

    await createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }
});

app.on("before-quit", async () => {
  if (stopEmbeddedServer) {
    await stopEmbeddedServer();
    stopEmbeddedServer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});