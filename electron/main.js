import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_URL = "http://127.0.0.1:3001";
let serverProcess = null;

function spawnServer() {
  if (serverProcess) return;

  const serverPath = path.join(__dirname, "..", "server", "index.js");
  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "production"
    },
    stdio: "inherit"
  });

  serverProcess.on("exit", (code) => {
    serverProcess = null;
    if (code !== 0) {
      console.error(`Server process exited with code ${code}`);
    }
  });
}

async function waitForServer(timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`${SERVER_URL}/api/ping`);
      if (response.ok) return;
    } catch (error) {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Le serveur n'a pas démarré à temps.");
}

async function createWindow() {
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
  const url = isDev ? "http://localhost:5173" : SERVER_URL;

  if (isDev) {
    await waitForServer();
  } else {
    await waitForServer();
  }

  win.loadURL(url);
  win.once("ready-to-show", () => win.show());
}

app.on("ready", async () => {
  spawnServer();
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
