import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let tmpDir;
let originalDataDir;
let originalVenvDir;
let originalHfHome;

describe('TTS persisted model status', () => {
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ne-tts-test-'));
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

    it('reports a downloaded model as cached before startup warmup finishes', async () => {
        const modelFile = path.join(
            tmpDir,
            '.tts_cache',
            '.cache',
            'onnx-community',
            'Kokoro-82M-v1.0-ONNX',
            'onnx',
            'model_quantized.onnx',
        );
        fs.mkdirSync(path.dirname(modelFile), { recursive: true });
        fs.writeFileSync(modelFile, 'model');

        const { getTtsStatus, listProviders } = await import('../lib/tts.js');

        const kokoro = listProviders().find(p => p.id === 'kokoro');
        expect(kokoro).toMatchObject({ cached: true, ready: false });
        expect(getTtsStatus()).toMatchObject({
            provider: 'kokoro',
            modelCached: true,
            modelReady: false,
        });
    });

    it('exposes chatterbox-nano as a selectable second engine', async () => {
        const { listProviders, getTtsStatus } = await import('../lib/tts.js');

        const providers = listProviders();
        expect(providers.map(p => p.id)).toContain('chatterbox-nano');
        const nano = providers.find(p => p.id === 'chatterbox-nano');
        expect(nano.requiresSidecar).toBe(true);
        // Not installed in a fresh tmp DATA_DIR — venv doesn't exist yet.
        expect(nano.cached).toBe(false);
        // Status lists all engines even when only reporting the active one.
        expect(getTtsStatus().providers.map(p => p.id)).toEqual(['kokoro', 'chatterbox-nano']);
    });

    it('does not report a half-installed chatterbox venv as cached', async () => {
        // A venv whose python exists but whose pip install died partway through
        // must not count as installed, or init reports "cached" and then fails.
        const venvPython = process.platform === 'win32'
            ? path.join(tmpDir, '.tts_cache', 'chatterbox-venv', 'Scripts', 'python.exe')
            : path.join(tmpDir, '.tts_cache', 'chatterbox-venv', 'bin', 'python');
        fs.mkdirSync(path.dirname(venvPython), { recursive: true });
        fs.writeFileSync(venvPython, '');

        const { listProviders } = await import('../lib/tts.js');
        expect(listProviders().find(p => p.id === 'chatterbox-nano').cached).toBe(false);
    });

    it('reports chatterbox as cached once the install marker is written', async () => {
        const venvDir = path.join(tmpDir, '.tts_cache', 'chatterbox-venv');
        const venvPython = process.platform === 'win32'
            ? path.join(venvDir, 'Scripts', 'python.exe')
            : path.join(venvDir, 'bin', 'python');
        fs.mkdirSync(path.dirname(venvPython), { recursive: true });
        fs.writeFileSync(venvPython, '');
        fs.writeFileSync(path.join(venvDir, '.chatterbox-install.json'), '{"profile":"legacy"}');

        const { listProviders } = await import('../lib/tts.js');
        const nano = listProviders().find(p => p.id === 'chatterbox-nano');
        expect(nano.cached).toBe(true);
        // Port-bound is not ready — the model must pass /health first.
        expect(nano.ready).toBe(false);
    });

    it('keys the audio cache by provider so engines never collide', async () => {
        const { audioCacheHash } = await import('../lib/tts/cache.js');
        const a = audioCacheHash('kokoro', 'hello', 'af_heart');
        const b = audioCacheHash('chatterbox-nano', 'hello', 'af_heart');
        expect(a).not.toBe(b);
        // Same inputs → same key (stable).
        expect(audioCacheHash('kokoro', 'hello', 'af_heart')).toBe(a);
        expect(audioCacheHash('chatterbox-nano', 'hello', 'af_heart')).toBe(b);
    });
});