import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getTtsStatus, isEngineReady, type TtsStatus } from './ttsClient';

/**
 * Tracks the selected TTS engine's readiness. Polls /api/tts/status while that
 * engine is still warming; stops once it is ready. Uses providers[] so Chatterbox
 * being ready is not hidden behind the Kokoro-default top-level modelReady flag.
 *
 * The speaker button in MessageBubble uses this to decide whether to render.
 */
export function useTtsStatus(pollMs = 3000) {
    const ttsProvider = useAppStore(s => s.settings.ttsProvider) ?? 'kokoro';
    const [status, setStatus] = useState<TtsStatus | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        let cancelled = false;

        const schedule = (delay: number) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(tick, delay);
        };

        const tick = async () => {
            try {
                const s = await getTtsStatus();
                if (cancelled) return;
                setStatus(s);
                if (isEngineReady(s, ttsProvider) && !s.initializing) return;
                schedule(pollMs);
            } catch {
                if (cancelled) return;
                schedule(pollMs);
            }
        };

        tick();
        return () => {
            cancelled = true;
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [pollMs, ttsProvider]);

    return status;
}