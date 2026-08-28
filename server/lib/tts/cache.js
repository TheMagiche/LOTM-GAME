/**
 * Shared TTS provider infrastructure: on-disk audio cache keyed by
 * (provider, voice, text). Same contract the original Kokoro-only tts.js used,
 * generalized so multiple engines can coexist without colliding.
 */
import { DATA_DIR } from '../fileStore.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const CACHE_DIR = path.join(DATA_DIR, '.tts_cache');
export const AUDIO_CACHE_DIR = path.join(CACHE_DIR, 'audio');

export function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    if (!fs.existsSync(AUDIO_CACHE_DIR)) {
        fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
    }
}

/**
 * Stable hash of (provider + voice + text) — the on-disk audio cache key.
 * Same input always maps to the same WAV file, so generated audio survives
 * server restarts and campaign switches. The provider id is mixed in so two
 * engines never read each other's audio (different voices, sample rates).
 */
export function audioCacheHash(providerId, text, voice) {
    // chatterbox used to write IEEE-float WAVs that <audio> cannot play;
    // '|pcm16' busts that cache so new 16-bit files are generated.
    const extra = providerId === 'chatterbox-nano' ? '|pcm16' : '';
    return crypto.createHash('sha256')
        .update(`${providerId}|${voice || ''}|${text}${extra}`)
        .digest('hex').slice(0, 24);
}

export function audioCachePath(providerId, text, voice) {
    return path.join(AUDIO_CACHE_DIR, `${audioCacheHash(providerId, text, voice)}.wav`);
}

/** Check if a chunk's audio is already on disk (previously generated). */
export function isAudioCached(providerId, text, voice) {
    return fs.existsSync(audioCachePath(providerId, text, voice));
}

/** Load a cached WAV file from disk. Returns a Buffer or null if not found. */
export function loadCachedAudio(providerId, text, voice) {
    const p = audioCachePath(providerId, text, voice);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p);
}

/** Persist a generated WAV to disk so it survives server restarts. */
export function saveCachedAudio(providerId, text, voice, buf) {
    try {
        ensureCacheDir();
        fs.writeFileSync(audioCachePath(providerId, text, voice), buf);
    } catch (e) {
        console.warn('[TTS] Failed to cache audio to disk:', e.message);
    }
}

/** Delete a cached WAV so the karaoke panel cannot resurrect it after trash. */
export function deleteCachedAudio(providerId, text, voice) {
    const p = audioCachePath(providerId, text, voice);
    try {
        if (!fs.existsSync(p)) return false;
        fs.unlinkSync(p);
        return true;
    } catch (e) {
        console.warn('[TTS] Failed to delete cached audio:', e.message);
        return false;
    }
}

/**
 * kokoro-js v1.2.1 bundles its own nested @huggingface/transformers that ignores
 * the `cache_dir` option and writes to `<kokoro-js>/node_modules/.cache/...`.
 * In the packaged Electron build that path is inside the read-only ASAR, which
 * would force a re-download on every launch.
 *
 * Workaround: set the HF/Transformers.js env cache dirs BEFORE importing kokoro-js
 * so its nested transformers instance picks them up. We point both at our
 * data/.tts_cache so the model survives server restarts and stays writable.
 */
export function applyHfCacheEnv() {
    ensureCacheDir();
    process.env.HF_HOME = CACHE_DIR;
    process.env.TRANSFORMERS_CACHE = CACHE_DIR;
    process.env.HF_HUB_CACHE = CACHE_DIR;
    process.env.XDG_CACHE_HOME = CACHE_DIR;
}
