/**
 * Where Chatterbox-Nano's heavy artifacts live.
 *
 * The Python venv and HuggingFace weights are hundreds of MB to ~1.5GB. Those
 * must survive a wipe of the project's data/ folder, so new installs go in a
 * user-level directory. Voice clips and generated WAV cache stay in
 * data/.tts_cache (small, campaign-adjacent).
 *
 * Overrides:
 *   CHATTERBOX_VENV_DIR  — Python venv root
 *   CHATTERBOX_HF_HOME   — HuggingFace hub cache (model weights)
 *
 * Tests (and anyone who sets DATA_DIR) stay inside that tree so they never
 * touch the real user profile. process.env.HF_HOME is intentionally ignored:
 * Kokoro sets it to data/.tts_cache, which would pin weights back in-project.
 */
import os from 'os';
import path from 'path';
import fs from 'fs';
import { CACHE_DIR } from './cache.js';

const APP_DIR = 'lotm-game';

export function userChatterboxRoot() {
    if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', APP_DIR, 'chatterbox');
    }
    if (process.platform === 'win32') {
        const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        return path.join(base, APP_DIR, 'chatterbox');
    }
    const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    return path.join(xdg, APP_DIR, 'chatterbox');
}

export function defaultUserVenvDir() {
    return path.join(userChatterboxRoot(), 'venv');
}

export function defaultUserHfHome() {
    return path.join(userChatterboxRoot(), 'hf');
}

export function projectVenvDir() {
    return path.join(CACHE_DIR, 'chatterbox-venv');
}

export function venvPythonAt(venvDir) {
    return process.platform === 'win32'
        ? path.join(venvDir, 'Scripts', 'python.exe')
        : path.join(venvDir, 'bin', 'python');
}

export function isInstalledAt(venvDir) {
    try {
        return fs.existsSync(venvPythonAt(venvDir))
            && fs.existsSync(path.join(venvDir, '.chatterbox-install.json'));
    } catch {
        return false;
    }
}

export function hfLooksPopulated(dir) {
    try {
        const hub = path.join(dir, 'hub');
        if (fs.existsSync(hub)) {
            // HuggingFace hub snapshots look like models--org--name.
            // A bare `hub/` or Kokoro's sibling `.cache/` must not count.
            return fs.readdirSync(hub).some(n => n.startsWith('models--'));
        }
        const transformers = path.join(dir, 'transformers');
        return fs.existsSync(transformers) && fs.readdirSync(transformers).length > 0;
    } catch {
        return false;
    }
}

/** Relocated DATA_DIR (tests, custom data roots) keeps artifacts inside that tree. */
function isolateInDataDir() {
    return !!process.env.DATA_DIR;
}

export function resolveVenvDir() {
    if (process.env.CHATTERBOX_VENV_DIR) return process.env.CHATTERBOX_VENV_DIR;
    if (isolateInDataDir()) return projectVenvDir();
    const user = defaultUserVenvDir();
    if (isInstalledAt(user)) return user;
    if (isInstalledAt(projectVenvDir())) return projectVenvDir();
    return user;
}

export function resolveHfHome() {
    if (process.env.CHATTERBOX_HF_HOME) return process.env.CHATTERBOX_HF_HOME;
    if (isolateInDataDir()) return CACHE_DIR;
    const user = defaultUserHfHome();
    if (hfLooksPopulated(user)) return user;
    if (hfLooksPopulated(CACHE_DIR)) return CACHE_DIR;
    return user;
}
