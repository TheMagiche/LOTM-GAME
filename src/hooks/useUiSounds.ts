import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
    DEFAULT_UI_SOUNDS_ENABLED,
    DEFAULT_UI_SOUNDS_VOLUME,
    applyUiSounds,
    startUiSounds,
} from '../services/uiSounds';

/** Bind cuelume once and keep mute/volume in sync with settings. */
export function useUiSounds(): void {
    const enabled = useAppStore((s) => s.settings.uiSoundsEnabled ?? DEFAULT_UI_SOUNDS_ENABLED);
    const volume = useAppStore((s) => s.settings.uiSoundsVolume ?? DEFAULT_UI_SOUNDS_VOLUME);

    useEffect(() => {
        startUiSounds();
    }, []);

    useEffect(() => {
        applyUiSounds({ enabled, volume });
    }, [enabled, volume]);
}
