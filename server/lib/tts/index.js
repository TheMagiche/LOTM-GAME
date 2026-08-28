/**
 * TTS engine registry — dispatch layer over pluggable providers.
 *
 * Providers live in ./providers/ and implement:
 *   { id, label, maxChunkChars, requiresSidecar, isCached(), isReady(),
 *     init(onStage?), generate(text, voice), listVoices() }
 *
 * This module preserves the original single-engine (Kokoro) export surface so
 * server/routes/tts.js and server.js keep working unchanged; the active
 * provider comes from the TTS_ACTIVE_PROVIDER env override or defaults to
 * kokoro until the client selects one per-request.
 */
import { isAudioCached as cacheIsAudioCached, loadCachedAudio as cacheLoad, deleteCachedAudio as cacheDelete } from './cache.js';
import kokoro from './providers/kokoro.js';
import chatterboxNano from './providers/chatterboxNano.js';

const PROVIDERS = new Map([kokoro, chatterboxNano].map(p => [p.id, p]));

let activeProviderId = process.env.TTS_ACTIVE_PROVIDER || 'kokoro';

export function getProvider(id) {
    return PROVIDERS.get(id || activeProviderId) || PROVIDERS.get('kokoro');
}

export function setActiveProvider(id) {
    if (!PROVIDERS.has(id)) {
        const err = new Error(`Unknown TTS provider: ${id}`);
        err.statusCode = 400;
        throw err;
    }
    activeProviderId = id;
    return getProvider(id);
}

export function listProviders() {
    return [...PROVIDERS.values()].map(p => ({
        id: p.id,
        label: p.label,
        cached: !!p.isCached(),
        ready: !!p.isReady(),
        requiresSidecar: !!p.requiresSidecar,
        // Present only after a failed setup, so the UI can explain a download
        // that stopped instead of spinning forever.
        ...(p.getError?.() ? { error: p.getError() } : {}),
    }));
}

// ── Legacy single-engine surface (active provider scoped) ───────────────

export function isTtsReady(providerId) {
    return !!getProvider(providerId).isReady();
}

export function getTtsStatus(providerId) {
    const p = getProvider(providerId);
    const initializing = p.id === 'chatterbox-nano'
        ? false // sidecar readiness is reflected via ready; setup progress flows through /init
        : undefined;
    return {
        modelReady: !!p.isReady(),
        modelCached: !!p.isCached(),
        ...(initializing !== undefined ? { initializing } : {}),
        voice: '',
        modelId: p.label,
        dtype: p.requiresSidecar ? 'sidecar' : 'q8',
        provider: p.id,
        providers: listProviders(),
    };
}

export async function initTts(providerId, onStage) {
    const p = getProvider(providerId);
    await p.init(onStage);
    return p;
}

export async function generateSpeech(text, voice, providerId) {
    if (!text || !text.trim()) {
        const err = new Error('Empty text');
        err.statusCode = 400;
        throw err;
    }
    const p = getProvider(providerId);
    return p.generate(text, voice);
}

export function isAudioCached(text, voice, providerId) {
    const p = getProvider(providerId);
    return cacheIsAudioCached(p.id, text, voice);
}

export function loadCachedAudio(text, voice, providerId) {
    const p = getProvider(providerId);
    return cacheLoad(p.id, text, voice);
}

export function deleteCachedAudio(text, voice, providerId) {
    const p = getProvider(providerId);
    return cacheDelete(p.id, text, voice);
}

export function listVoices(providerId) {
    try {
        return getProvider(providerId).listVoices() ?? [];
    } catch {
        return [];
    }
}

/**
 * Auto-warm on server boot IF a provider's model is already cached.
 * Does NOT trigger a download. Kokoro warms in-process; Chatterbox-Nano only
 * starts its sidecar if the venv was already set up.
 */
export async function warmupTts() {
    for (const p of PROVIDERS.values()) {
        if (!p.isCached()) continue;
        try {
            const start = Date.now();
            await p.init();
            console.log(`[TTS] Warmup complete for ${p.id} (${Date.now() - start}ms)`);
            return true;
        } catch (err) {
            console.error(`[TTS] Warmup failed for ${p.id}:`, err.message);
        }
    }
    return false;
}
