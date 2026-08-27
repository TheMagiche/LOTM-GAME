import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpDir;
let originalDataDir;
let originalVenvDir;
let originalHfHome;

async function loadPaths() {
    return import('../lib/tts/chatterboxPaths.js');
}

describe('Chatterbox install paths', () => {
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ne-chatterbox-paths-'));
        originalDataDir = process.env.DATA_DIR;
        originalVenvDir = process.env.CHATTERBOX_VENV_DIR;
        originalHfHome = process.env.CHATTERBOX_HF_HOME;
        process.env.DATA_DIR = tmpDir;
        delete process.env.CHATTERBOX_VENV_DIR;
        delete process.env.CHATTERBOX_HF_HOME;
        vi.resetModules();
    });

    afterEach(() => {
        if (originalDataDir) process.env.DATA_DIR = originalDataDir;
        else delete process.env.DATA_DIR;
        if (originalVenvDir) process.env.CHATTERBOX_VENV_DIR = originalVenvDir;
        else delete process.env.CHATTERBOX_VENV_DIR;
        if (originalHfHome) process.env.CHATTERBOX_HF_HOME = originalHfHome;
        else delete process.env.CHATTERBOX_HF_HOME;
        fs.rmSync(tmpDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('keeps venv and HF cache inside DATA_DIR so tests never touch the user profile', async () => {
        const { resolveVenvDir, resolveHfHome, projectVenvDir } = await loadPaths();
        expect(resolveVenvDir()).toBe(projectVenvDir());
        expect(resolveVenvDir()).toBe(path.join(tmpDir, '.tts_cache', 'chatterbox-venv'));
        expect(resolveHfHome()).toBe(path.join(tmpDir, '.tts_cache'));
    });

    it('honors CHATTERBOX_VENV_DIR and CHATTERBOX_HF_HOME over DATA_DIR defaults', async () => {
        const venv = path.join(tmpDir, 'system-venv');
        const hf = path.join(tmpDir, 'system-hf');
        process.env.CHATTERBOX_VENV_DIR = venv;
        process.env.CHATTERBOX_HF_HOME = hf;
        vi.resetModules();
        const { resolveVenvDir, resolveHfHome } = await loadPaths();
        expect(resolveVenvDir()).toBe(venv);
        expect(resolveHfHome()).toBe(hf);
    });

    it('reports a custom venv as cached once the install marker is present', async () => {
        const venvDir = path.join(tmpDir, 'system-venv');
        const venvPython = process.platform === 'win32'
            ? path.join(venvDir, 'Scripts', 'python.exe')
            : path.join(venvDir, 'bin', 'python');
        fs.mkdirSync(path.dirname(venvPython), { recursive: true });
        fs.writeFileSync(venvPython, '');
        fs.writeFileSync(path.join(venvDir, '.chatterbox-install.json'), '{"profile":"legacy"}');
        process.env.CHATTERBOX_VENV_DIR = venvDir;
        vi.resetModules();

        const { listProviders } = await import('../lib/tts.js');
        expect(listProviders().find(p => p.id === 'chatterbox-nano').cached).toBe(true);
    });

    it('does not treat a project venv as cached when CHATTERBOX_VENV_DIR points elsewhere', async () => {
        const projectVenv = path.join(tmpDir, '.tts_cache', 'chatterbox-venv');
        const projectPython = process.platform === 'win32'
            ? path.join(projectVenv, 'Scripts', 'python.exe')
            : path.join(projectVenv, 'bin', 'python');
        fs.mkdirSync(path.dirname(projectPython), { recursive: true });
        fs.writeFileSync(projectPython, '');
        fs.writeFileSync(path.join(projectVenv, '.chatterbox-install.json'), '{"profile":"legacy"}');

        process.env.CHATTERBOX_VENV_DIR = path.join(tmpDir, 'empty-system-venv');
        vi.resetModules();

        const { listProviders } = await import('../lib/tts.js');
        expect(listProviders().find(p => p.id === 'chatterbox-nano').cached).toBe(false);
    });

    it('places the default user install outside the project tree', async () => {
        const { defaultUserVenvDir, defaultUserHfHome, userChatterboxRoot } = await loadPaths();
        const root = userChatterboxRoot();
        expect(root).toContain(path.join('lotm-game', 'chatterbox'));
        expect(defaultUserVenvDir()).toBe(path.join(root, 'venv'));
        expect(defaultUserHfHome()).toBe(path.join(root, 'hf'));
        expect(defaultUserVenvDir()).not.toContain(`${path.sep}data${path.sep}`);
    });

    it('does not treat Kokoro\'s .cache folder as a Chatterbox HuggingFace cache', async () => {
        const dir = path.join(tmpDir, 'mixed-cache');
        fs.mkdirSync(path.join(dir, '.cache', 'onnx-community'), { recursive: true });
        const { hfLooksPopulated } = await loadPaths();
        expect(hfLooksPopulated(dir)).toBe(false);
    });

    it('recognizes a HuggingFace hub snapshot as a populated Chatterbox cache', async () => {
        const dir = path.join(tmpDir, 'hf');
        fs.mkdirSync(path.join(dir, 'hub', 'models--ResembleAI--chatterbox'), { recursive: true });
        const { hfLooksPopulated } = await loadPaths();
        expect(hfLooksPopulated(dir)).toBe(true);
    });
});
