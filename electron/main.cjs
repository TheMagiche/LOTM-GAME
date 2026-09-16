'use strict';

const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 3001;
const HEALTH_TIMEOUT_MS = 90_000;

let mainWindow = null;
let serverProcess = null;
let quitting = false;

function unpackRoot() {
  if (!app.isPackaged) return path.join(__dirname, '..');
  return path.join(process.resourcesPath, 'app.asar.unpacked');
}

function resourcePath(...parts) {
  if (!app.isPackaged) {
    const mapped = { 'bundled-mods': ['public', 'bundled-mods'], gamedata: ['gamedata'] };
    const key = parts[0];
    if (mapped[key]) return path.join(__dirname, '..', ...mapped[key], ...parts.slice(1));
    return path.join(__dirname, '..', ...parts);
  }
  return path.join(process.resourcesPath, ...parts);
}

function applyEnv() {
  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  const modsDir = path.join(userData, 'mods');
  const ttsCache = path.join(dataDir, '.tts_cache');
  const embedCache = path.join(dataDir, '.embeddings_cache');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(modsDir, { recursive: true });
  fs.mkdirSync(ttsCache, { recursive: true });
  fs.mkdirSync(embedCache, { recursive: true });

  process.env.NODE_ENV = 'production';
  process.env.HOST = HOST;
  process.env.PORT = String(PORT);
  process.env.DATA_DIR = dataDir;
  process.env.MODS_DIR = modsDir;
  process.env.BUNDLED_MODS_DIR = resourcePath('bundled-mods');
  process.env.LOTM_ASSETS_DIR = resourcePath('gamedata');
  process.env.HF_HOME = ttsCache;
  process.env.TRANSFORMERS_CACHE = ttsCache;
  process.env.HF_HUB_CACHE = ttsCache;
  process.env.XDG_CACHE_HOME = ttsCache;
}

function waitForHealth() {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(`http://${HOST}:${PORT}/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2500, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() - started > HEALTH_TIMEOUT_MS) {
        reject(new Error(`Local server did not become ready on ${HOST}:${PORT}`));
        return;
      }
      setTimeout(attempt, 400);
    };
    attempt();
  });
}

function spawnServer() {
  const bundle = path.join(unpackRoot(), 'server.bundle.cjs');
  if (!fs.existsSync(bundle)) {
    throw new Error(`Server bundle missing at ${bundle}`);
  }
  const modulePath = path.join(unpackRoot(), 'node_modules');
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_PATH: [modulePath, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
  };
  serverProcess = spawn(process.execPath, [bundle], {
    cwd: unpackRoot(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.on('data', (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });
  serverProcess.stderr.on('data', (chunk) => {
    process.stderr.write(`[server] ${chunk}`);
  });
  serverProcess.on('exit', (code, signal) => {
    serverProcess = null;
    if (!quitting && code) {
      dialog.showErrorBox(
        'Chronicle server stopped',
        `The local server exited (${signal || `code ${code}`}).`,
      );
      app.quit();
    }
  });
}

function killServer() {
  if (!serverProcess) return;
  const child = serverProcess;
  serverProcess = null;
  child.removeAllListeners('exit');
  try {
    child.kill('SIGTERM');
  } catch {
    /* already gone */
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  const indexHtml = app.isPackaged
    ? path.join(app.getAppPath(), 'dist', 'index.html')
    : path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexHtml);
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    applyEnv();
    try {
      spawnServer();
      await waitForHealth();
    } catch (err) {
      killServer();
      dialog.showErrorBox(
        'Could not start the chronicle',
        `${err.message}\n\nPort ${PORT} must be free. Close other copies of the app (or anything using that port) and try again.`,
      );
      app.quit();
      return;
    }
    createWindow();
  });
}

app.on('before-quit', () => {
  quitting = true;
  killServer();
});

app.on('window-all-closed', () => {
  app.quit();
});
