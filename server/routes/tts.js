import { Router } from 'express';
import { wrapAsync } from '../lib/asyncHandler.js';
import { initTts, generateSpeech, isTtsReady, getTtsStatus, listVoices, isAudioCached, loadCachedAudio, listProviders } from '../lib/tts.js';

export function createTtsRouter() {
    const router = Router();

    // Status — polled by the client to drive the speaker button + Advanced tab.
    // Includes providers[] so the UI can enumerate engines.
    router.get('/api/tts/status', wrapAsync((_req, res) => {
        res.json(getTtsStatus());
    }));

    // Trigger model download + warmup. Returns once ready. Long-running; the
    // client polls /status while waiting. Body: { provider?: string } — for
    // Chatterbox-Nano this creates the venv, installs deps, and starts the
    // sidecar on first use (progress lines stream as JSON lines are not used;
    // the client polls /status instead).
    router.post('/api/tts/init', wrapAsync(async (req, res) => {
        const { provider } = req.body || {};
        await initTts(provider);
        res.json({ ok: true, ...getTtsStatus(provider) });
    }));

    // List voices. Only meaningful after init. Query: ?provider=chatterbox-nano
    router.get('/api/tts/voices', wrapAsync((req, res) => {
        res.json({ voices: listVoices(req.query.provider) });
    }));

    // Batch check: which chunks are already cached on disk?
    // POST body: { chunks: [{ text, voice? }, ...], voice?, provider? } -> { cached: boolean[] }
    router.post('/api/tts/check-cache', wrapAsync((req, res) => {
        const { chunks, voice, provider } = req.body || {};
        if (!Array.isArray(chunks)) {
            return res.status(400).json({ error: 'Missing chunks array' });
        }
        const cached = chunks.map(c => isAudioCached(c.text, c.voice || voice, provider));
        return res.json({ cached });
    }));

    // Load a cached WAV from disk without generating.
    // GET /api/tts/cached?text=...&voice=...&provider=...
    router.get('/api/tts/cached', wrapAsync((req, res) => {
        const text = req.query.text;
        const voice = req.query.voice;
        const provider = req.query.provider;
        if (typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ error: 'Missing text' });
        }
        const buf = loadCachedAudio(text, voice, provider);
        if (!buf) {
            return res.status(404).json({ error: 'Not cached' });
        }
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', String(buf.length));
        return res.send(buf);
    }));

    // Generate speech. Expects { text, voice?, provider? } in JSON body.
    // Returns audio/wav.
    router.post('/api/tts/generate', wrapAsync(async (req, res) => {
        const { text, voice, provider } = req.body || {};
        if (typeof text !== 'string' || !text.trim()) {
            return res.status(400).json({ error: 'Missing text' });
        }
        // Readiness is per-engine: checking the active provider here would let a
        // request for a different engine through (or wrongly reject one).
        // Installed but sidecar is down — generate() calls init() and starts it.
        // A hard 503 here is why Settings preview failed after a restart:
        // the engine was cached, the sidecar was not yet healthy.
        if (!isTtsReady(provider)) {
            const info = listProviders().find(p => p.id === (provider || 'kokoro'));
            if (!info?.cached) {
                return res.status(503).json({ error: 'TTS model not ready. Download it first from Settings → Advanced.' });
            }
        }
        const buf = await generateSpeech(text, voice, provider);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', String(buf.length));
        return res.send(buf);
    }));

    return router;
}