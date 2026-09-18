import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('cuelume', () => ({
    bind: vi.fn(),
    play: vi.fn(),
    setEnabled: vi.fn(),
    setVolume: vi.fn(),
}));

import { bind, play, setEnabled, setVolume } from 'cuelume';
import { migrateSettings } from '../../store/slices/settingsHelpers';
import {
    applyUiSounds,
    findUiSoundTarget,
    isNavSoundTarget,
    isToggleSoundTarget,
    startUiSounds,
    stopUiSounds,
} from '../uiSounds';

function pointer(type: 'pointerdown' | 'pointerup' | 'pointerenter', target: EventTarget, pointerType = 'mouse') {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerType, relatedTarget: null });
    target.dispatchEvent(event);
}

describe('uiSounds', () => {
    beforeEach(() => {
        vi.mocked(play).mockClear();
        vi.mocked(bind).mockClear();
        vi.mocked(setEnabled).mockClear();
        vi.mocked(setVolume).mockClear();
        stopUiSounds();
        document.body.innerHTML = '';
        startUiSounds();
    });

    afterEach(() => {
        stopUiSounds();
        document.body.innerHTML = '';
    });

    it('binds cuelume once and plays press/release on unmarked buttons', () => {
        expect(bind).toHaveBeenCalledTimes(1);
        startUiSounds();
        expect(bind).toHaveBeenCalledTimes(1);

        const button = document.createElement('button');
        button.textContent = 'Save';
        document.body.append(button);

        pointer('pointerdown', button);
        pointer('pointerup', button);

        expect(play).toHaveBeenCalledWith('press');
        expect(play).toHaveBeenCalledWith('release');
    });

    it('skips press on buttons that already have data-cuelume-press', () => {
        const button = document.createElement('button');
        button.setAttribute('data-cuelume-press', 'pulse');
        document.body.append(button);

        pointer('pointerdown', button);
        expect(play).not.toHaveBeenCalled();
    });

    it('plays toggle on aria-pressed controls and tick on nav hover', () => {
        const nav = document.createElement('nav');
        const tab = document.createElement('button');
        tab.setAttribute('aria-pressed', 'true');
        tab.textContent = 'Illustrated';
        nav.append(tab);
        document.body.append(nav);

        tab.click();
        expect(play).toHaveBeenCalledWith('toggle');

        vi.mocked(play).mockClear();
        pointer('pointerenter', tab);
        expect(play).toHaveBeenCalledWith('tick');
    });

    it('does not sound disabled or skipped targets', () => {
        const disabled = document.createElement('button');
        disabled.disabled = true;
        const skipped = document.createElement('button');
        skipped.setAttribute('data-cuelume-skip', '');
        document.body.append(disabled, skipped);

        pointer('pointerdown', disabled);
        pointer('pointerdown', skipped);
        expect(play).not.toHaveBeenCalled();
        expect(findUiSoundTarget(disabled)).toBeNull();
        expect(findUiSoundTarget(skipped)).toBeNull();
    });

    it('classifies nav vs toggle targets', () => {
        const link = document.createElement('a');
        link.setAttribute('href', '/docs');
        const tab = document.createElement('button');
        tab.setAttribute('role', 'tab');
        expect(isNavSoundTarget(link)).toBe(true);
        expect(isNavSoundTarget(tab)).toBe(true);
        expect(isToggleSoundTarget(tab)).toBe(true);
        expect(isToggleSoundTarget(link)).toBe(false);
    });

    it('clamps volume when applying preferences', () => {
        applyUiSounds({ enabled: false, volume: 1.4 });
        expect(setEnabled).toHaveBeenCalledWith(false);
        expect(setVolume).toHaveBeenCalledWith(1);
    });
});

describe('migrateSettings — interface sounds', () => {
    it('defaults interaction sounds on at 60% when absent', () => {
        const out = migrateSettings({});
        expect(out.uiSoundsEnabled).toBe(true);
        expect(out.uiSoundsVolume).toBe(0.6);
    });

    it('preserves a stored mute and clamps volume', () => {
        const out = migrateSettings({
            settings: { uiSoundsEnabled: false, uiSoundsVolume: 2 },
        });
        expect(out.uiSoundsEnabled).toBe(false);
        expect(out.uiSoundsVolume).toBe(1);
    });
});
