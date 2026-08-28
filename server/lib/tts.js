/**
 * Compatibility shim — the TTS engine moved to server/lib/tts/ (provider
 * registry + kokoro + chatterbox-nano providers). All original exports are
 * preserved so server.js and existing routes/tests keep working.
 */
export {
    isTtsReady,
    getTtsStatus,
    initTts,
    generateSpeech,
    isAudioCached,
    loadCachedAudio,
    deleteCachedAudio,
    listVoices,
    warmupTts,
    setActiveProvider,
    listProviders,
} from './tts/index.js';
export { killSidecar } from './tts/sidecarManager.js';
