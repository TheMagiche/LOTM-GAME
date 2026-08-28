import { API_BASE as API } from '../../lib/apiBase';

export type TtsProviderInfo = {
    id: string;
    label: string;
    cached: boolean;
    ready: boolean;
    requiresSidecar: boolean;
    /** Last setup failure for this engine (Chatterbox venv/model install). */
    error?: string;
};

export type TtsStatus = {
    modelReady: boolean;
    modelCached: boolean;
    initializing?: boolean;
    voice: string;
    modelId: string;
    dtype: string;
    provider: string;
    providers: TtsProviderInfo[];
};

export async function getTtsStatus(): Promise<TtsStatus> {
    const res = await fetch(`${API}/tts/status`);
    if (!res.ok) throw new Error(`TTS status failed: ${res.status}`);
    return res.json();
}

/** Ready flag for the engine the user actually selected — not the server default (Kokoro). */
export function isEngineReady(status: TtsStatus | null | undefined, providerId?: string): boolean {
    if (!status) return false;
    const id = providerId || 'kokoro';
    const listed = status.providers?.find(p => p.id === id);
    if (listed) return !!listed.ready;
    if (status.providers && status.providers.length > 0) return false;
    return !!status.modelReady;
}

/** Pull the server's `{ error }` message out of a failed response. */
async function errorMessage(res: Response): Promise<string> {
    const body = await res.text();
    try {
        const parsed = JSON.parse(body);
        if (parsed?.error) return String(parsed.error);
    } catch {
        /* not JSON — fall through to the raw body */
    }
    return body || `HTTP ${res.status}`;
}

/**
 * Trigger the one-time model download + warmup. Resolves once ready.
 * The caller should poll getTtsStatus() to show progress.
 * For 'chatterbox-nano' the first call creates a Python venv, installs
 * dependencies, and starts the sidecar — this can take several minutes.
 * The venv and model weights live in the user data folder (not the project).
 */
export async function initTtsModel(provider?: string): Promise<TtsStatus> {
    const res = await fetch(`${API}/tts/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider ? { provider } : {}),
    });
    if (!res.ok) throw new Error(await errorMessage(res));
    return res.json();
}

/**
 * Synthesize speech. Returns a Blob (audio/wav) ready for <audio>/AudioContext.
 * provider selects the engine ('kokoro' | 'chatterbox-nano'); voice is either
 * a Kokoro voice id or a Chatterbox reference-clip filename.
 */
export async function generateTts(text: string, voice?: string, provider?: string): Promise<Blob> {
    const res = await fetch(`${API}/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, provider }),
    });
    if (!res.ok) throw new Error(await errorMessage(res));
    return res.blob();
}

/**
 * Batch-check which chunks are already cached on disk.
 * Returns a boolean array — true = already generated, no need to call generate.
 */
export async function checkCachedChunks(chunks: string[], voice?: string, provider?: string): Promise<boolean[]> {
    const res = await fetch(`${API}/tts/check-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunks: chunks.map(text => ({ text })), voice, provider }),
    });
    if (!res.ok) return chunks.map(() => false);
    const data = await res.json();
    return data.cached as boolean[];
}

/**
 * Load a cached WAV from disk (no generation). Returns a Blob or null.
 */
export async function loadCachedTts(text: string, voice?: string, provider?: string): Promise<Blob | null> {
    const params = new URLSearchParams({ text });
    if (voice) params.set('voice', voice);
    if (provider) params.set('provider', provider);
    const res = await fetch(`${API}/tts/cached?${params}`);
    if (!res.ok) return null;
    return res.blob();
}

/**
 * Delete disk-cached WAVs for these chunks. Used by the karaoke panel trash
 * button so switching Illustrated ↔ Chronicle cannot reload deleted audio.
 */
export async function wipeCachedTts(chunks: string[], voice?: string, provider?: string): Promise<void> {
    await fetch(`${API}/tts/wipe-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunks: chunks.map(text => ({ text })), voice, provider }),
    });
}