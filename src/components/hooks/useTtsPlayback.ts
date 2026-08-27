import { useRef, useState, useEffect } from 'react';
import type { ChatMessage } from '../../types';
import { useTtsStatus } from '../../services/tts/useTtsStatus';
import { isEngineReady } from '../../services/tts/ttsClient';
import { KokoroBuffer } from '../../services/tts/kokoroBuffer';
import { useAppStore } from '../../store/useAppStore';

/**
 * TTS playback state for one message bubble (Kokoro, local) — chunked +
 * highlight-synced + controllable. The audio engine lives in KokoroBuffer;
 * this hook owns the React state the panel and action rail render.
 */
export function useTtsPlayback(msg: ChatMessage, markdownContent: string) {
    const ttsStatus = useTtsStatus();
    const ttsEnabled = useAppStore(s => s.settings.ttsEnabled);
    const ttsVoice = useAppStore(s => s.settings.ttsVoice);
    const ttsProvider = useAppStore(s => s.settings.ttsProvider);
    const [ttsLoading, setTtsLoading] = useState(false);
    const [ttsPlaying, setTtsPlaying] = useState(false);
    const [ttsPaused, setTtsPaused] = useState(false);
    const [ttsFinished, setTtsFinished] = useState(false);
    const [activeSentenceIdx, setActiveSentenceIdx] = useState(-1);
    const [activeWordIdx, setActiveWordIdx] = useState(-1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [totalChunks, setTotalChunks] = useState(0);
    const [generatedChunks, setGeneratedChunks] = useState(0);
    const [hasCache, setHasCache] = useState(false);

    const bufferRef = useRef<KokoroBuffer | null>(null);
    if (!bufferRef.current) {
        bufferRef.current = new KokoroBuffer({
            setLoading: setTtsLoading,
            setPlaying: setTtsPlaying,
            setPaused: setTtsPaused,
            setFinished: setTtsFinished,
            setActiveSentenceIdx,
            setActiveWordIdx,
            setTotalChunks,
            setGeneratedChunks,
            setHasCache,
            setPlaybackRate,
        });
    }
    const buffer = bufferRef.current;

    // Cleanup on unmount
    useEffect(() => {
        return () => buffer.destroy();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Preload disk-cached chunks on mount / voice or engine change.
    // Wipe in-memory audio first so a Kokoro/Chatterbox switch cannot replay
    // the previous engine's blobs from this bubble's buffer.
    useEffect(() => {
        if (msg.role !== 'assistant') return;
        buffer.wipe();
        if (!ttsEnabled) return;
        return buffer.preloadFromDisk(markdownContent, ttsVoice ?? 'af_heart', ttsProvider);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ttsEnabled, ttsVoice, ttsProvider, msg.id]);

    const handleSpeak = () => { void buffer.speak(markdownContent, ttsVoice ?? 'af_heart', ttsProvider); };
    const handlePauseResume = () => buffer.pauseResume();
    const handleWipeTts = () => buffer.wipe();
    const handleSpeedChange = (delta: number) => buffer.changeSpeed(delta);
    const stopPlayback = () => buffer.stop();

    // Karaoke sentence click: jump while playing, or start playback from there.
    const jumpToSentence = (si: number) => {
        if (ttsPlaying || ttsLoading) {
            buffer.requestSkip(si);
        } else {
            // Not currently playing — start from this chunk.
            buffer.setInitialSkip(si);
            handleSpeak();
        }
    };

    const ttsReady = isEngineReady(ttsStatus, ttsProvider) && !!ttsEnabled;

    return {
        ttsReady,
        ttsLoading,
        ttsPlaying,
        ttsPaused,
        ttsFinished,
        activeSentenceIdx,
        activeWordIdx,
        playbackRate,
        totalChunks,
        generatedChunks,
        hasCache,
        handleSpeak,
        handlePauseResume,
        handleWipeTts,
        handleSpeedChange,
        stopPlayback,
        jumpToSentence,
    };
}
