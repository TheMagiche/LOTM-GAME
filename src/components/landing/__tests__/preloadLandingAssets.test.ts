import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    LANDING_ASSET_TIMEOUT_MS,
    LOTM_BOOT_SPLASH_ID,
    dismissLotmBootSplash,
    preloadImage,
    preloadLandingAssets,
} from '../preloadLandingAssets';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.getElementById(LOTM_BOOT_SPLASH_ID)?.remove();
});

function stubImage(behavior: 'load' | 'error' | 'hang') {
    class StubImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
            if (behavior === 'hang') return;
            queueMicrotask(() => {
                if (behavior === 'load') this.onload?.();
                else this.onerror?.();
            });
        }
    }
    vi.stubGlobal('Image', StubImage);
}

describe('preloadLandingAssets', () => {
    it('reports progress as each portrait resolves', async () => {
        stubImage('load');
        const progress: Array<[number, number]> = [];
        await preloadLandingAssets(['a.webp', 'b.webp', 'a.webp'], (loaded, total) => {
            progress.push([loaded, total]);
        });
        expect(progress[0]).toEqual([0, 2]);
        expect(progress.at(-1)).toEqual([2, 2]);
    });

    it('treats a failed image as finished so the gate cannot hang', async () => {
        stubImage('error');
        await expect(preloadImage('missing.webp')).resolves.toBe(false);
        await expect(preloadLandingAssets(['missing.webp'])).resolves.toBeUndefined();
    });

    it('releases the gate when images never finish', async () => {
        stubImage('hang');
        vi.useFakeTimers();
        const pending = preloadLandingAssets(['slow.webp'], undefined, 250);
        await vi.advanceTimersByTimeAsync(250);
        await expect(pending).resolves.toBeUndefined();
        expect(LANDING_ASSET_TIMEOUT_MS).toBeGreaterThan(0);
    });
});

describe('dismissLotmBootSplash', () => {
    it('fades and removes the static HTML splash', () => {
        vi.useFakeTimers();
        const splash = document.createElement('div');
        splash.id = LOTM_BOOT_SPLASH_ID;
        document.body.append(splash);

        dismissLotmBootSplash();
        expect(splash.classList.contains('is-done')).toBe(true);

        vi.advanceTimersByTime(500);
        expect(document.getElementById(LOTM_BOOT_SPLASH_ID)).toBeNull();
    });
});
