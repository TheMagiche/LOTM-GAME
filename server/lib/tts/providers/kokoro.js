/**
 * Kokoro-82M provider — the original local TTS engine, extracted verbatim from
 * the old single-engine server/lib/tts.js. Runs fully in Node via kokoro-js
 * (ONNX Runtime), no sidecar needed.
 */
import path from 'path';
import fs from 'fs';
import { CACHE_DIR, applyHfCacheEnv, isAudioCached, loadCachedAudio, saveCachedAudio } from '../cache.js';

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'q8';
export const DEFAULT_VOICE = 'af_heart';

let tts = null;
let initPromise = null;
let modelReady = false;

export default {
    id: 'kokoro',
    label: 'Kokoro-82M',
    // ~510 phoneme limit per call (~300 chars); the client chunks at 200.
    maxChunkChars: 200,
    requiresSidecar: false,

    isCached() {
        // Transformers.js stores it under .cache/onnx-community/<model>/onnx/model_quantized.onnx
        const modelFile = path.join(CACHE_DIR, '.cache', 'onnx-community', 'Kokoro-82M-v1.0-ONNX', 'onnx', 'model_quantized.onnx');
        return fs.existsSync(modelFile);
    },

    isReady() {
        return modelReady;
    },

    /**
     * Lazy-load Kokoro. The first call downloads ~90MB (q8) from Hugging Face
     * into CACHE_DIR. Subsequent calls reuse the cached weights. Safe to call
     * concurrently — the second caller awaits the first init.
     */
    async init() {
        if (modelReady && tts) return;
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                applyHfCacheEnv();
                const { KokoroTTS } = await import('kokoro-js');
                tts = await KokoroTTS.from_pretrained(MODEL_ID, {
                    dtype: DTYPE,
                    device: 'cpu',
                    cache_dir: CACHE_DIR,
                });
                modelReady = true;
                initPromise = null; // clear so status reports initializing:false once ready
                console.log(`[TTS] Kokoro model loaded: ${MODEL_ID} (${DTYPE})`);
            } catch (err) {
                console.error('[TTS] Init failed:', err.message);
                initPromise = null;
                throw err;
            }
        })();

        return initPromise;
    },

    /**
     * Synthesize speech for a single text chunk. Returns a WAV buffer.
     * Caller passes pre-stripped prose; we don't sanitize here.
     */
    async generate(text, voice) {
        const v = voice || DEFAULT_VOICE;

        // Check disk cache first — if we've generated this exact (text, voice)
        // before, return the saved WAV without spinning up the model.
        const cached = loadCachedAudio(this.id, text, v);
        if (cached) return cached;

        await this.init();
        const audio = await tts.generate(text, { voice: v });
        let buf;
        if (typeof audio.toBuffer === 'function') {
            buf = Buffer.from(audio.toBuffer());
        } else if (typeof audio.blob === 'function') {
            const ab = await audio.blob();
            buf = Buffer.from(await ab.arrayBuffer());
        } else {
            const tmp = path.join(CACHE_DIR, `_tts_${Date.now()}.wav`);
            await audio.save(tmp);
            buf = fs.readFileSync(tmp);
            fs.unlink(tmp, () => {});
        }

        saveCachedAudio(this.id, text, v, buf);
        return buf;
    },

    /** List available voices from the loaded model. Returns [] before init. */
    listVoices() {
        if (!tts || typeof tts.list_voices !== 'function') return [];
        try {
            return tts.list_voices();
        } catch {
            return [];
        }
    },
};
