/**
 * Chatterbox-Nano provider — 110M CPU-native TTS from Resemble AI, run in a
 * Python sidecar process (see server/tts_sidecar/chatterbox_server.py).
 *
 * Unlike Kokoro there are no built-in named voices: Nano clones a voice from a
 * reference audio clip. Clips live in data/.tts_cache/chatterbox/voices/ and
 * the "voice" parameter is the clip's filename. A missing/unknown clip falls
 * back to the model's default speaker.
 */
import fs from 'fs';
import path from 'path';
import { isAudioCached, loadCachedAudio, saveCachedAudio } from '../cache.js';
import {
    ensureRunning,
    isSidecarInstalled,
    getSidecarPort,
    getVoicesDir,
    getSetupError,
    listVoiceClips,
} from '../sidecarManager.js';

export const DEFAULT_VOICE = 'default.wav';
export const SETUP_STAGES = [
    'Creating Python environment...',
    'Installing Chatterbox dependencies (CPU torch)...',
    'Loading Chatterbox-Nano model (first run downloads weights)...',
];

async function synthesize(text, voice) {
    const port = getSidecarPort();
    const res = await fetch(`http://127.0.0.1:${port}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) {
        let msg = `Sidecar error ${res.status}`;
        try {
            const body = await res.json();
            if (body.error) msg = body.error;
        } catch { /* non-JSON error body */ }
        throw new Error(msg);
    }
    return Buffer.from(await res.arrayBuffer());
}

export default {
    id: 'chatterbox-nano',
    label: 'Chatterbox-Nano',
    // Nano handles longer inputs than Kokoro comfortably; keep chunks modest
    // for streaming playback latency rather than model limits.
    maxChunkChars: 300,
    requiresSidecar: true,

    isCached() {
        return isSidecarInstalled();
    },

    isReady() {
        return !!getSidecarPort();
    },

    async init(onStage) {
        await ensureRunning(onStage);
    },

    /** Last setup failure, so the UI can explain a stalled download. */
    getError() {
        return getSetupError();
    },

    async generate(text, voice) {
        const v = voice || DEFAULT_VOICE;

        // Disk cache first — same contract as the Kokoro provider.
        const cached = loadCachedAudio(this.id, text, v);
        if (cached) return cached;

        await this.init();

        // Fall back to no clip (model default speaker) when the file is gone.
        let effectiveVoice = v;
        const clipPath = path.join(getVoicesDir(), v);
        if (!fs.existsSync(clipPath)) effectiveVoice = '';

        const buf = await synthesize(text, effectiveVoice);
        saveCachedAudio(this.id, text, v, buf);
        return buf;
    },

    /** Reference clips available for cloning. */
    listVoices() {
        return listVoiceClips();
    },
};
