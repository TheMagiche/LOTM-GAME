/**
 * Interaction sounds via [cuelume](https://cuelume.dev/).
 *
 * `bind()` covers any `data-cuelume-*` markup (the preferred API). A
 * document-level fallback then plays press/release on unmarked buttons and
 * a tick on unmarked nav hover, so the rest of the UI sounds without tagging
 * every component.
 */
import { bind, play, setEnabled, setVolume, type SoundName } from 'cuelume';

export { play };
export type { SoundName };

export const DEFAULT_UI_SOUNDS_ENABLED = true;
export const DEFAULT_UI_SOUNDS_VOLUME = 0.6;

/** Empty value = cuelume's default sound for that behavior. */
export const cuePress = {
    'data-cuelume-press': '',
    'data-cuelume-release': '',
} as const;

export const cuePrimary = {
    'data-cuelume-press': 'pulse',
    'data-cuelume-release': 'release',
} as const;

export const cueNav = {
    'data-cuelume-hover': 'tick',
    'data-cuelume-press': 'scan',
    'data-cuelume-release': 'release',
} as const;

export const cueToggle = {
    'data-cuelume-hover': 'tick',
    'data-cuelume-toggle': '',
} as const;

export const cuePage = {
    'data-cuelume-hover': 'tick',
    'data-cuelume-press': 'page',
} as const;

export const cueClose = {
    'data-cuelume-press': 'droplet',
} as const;

export const UI_SOUND_TARGET_SELECTOR = [
    'button',
    'a[href]',
    'summary',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="option"]',
    '[role="switch"]',
].join(', ');

const ATTR = {
    hover: 'data-cuelume-hover',
    press: 'data-cuelume-press',
    release: 'data-cuelume-release',
    toggle: 'data-cuelume-toggle',
    skip: 'data-cuelume-skip',
} as const;

let started = false;
let teardown: (() => void) | null = null;
let lastHoverAt = -Infinity;
const HOVER_GAP_MS = 150;

export function applyUiSounds(prefs: { enabled?: boolean; volume?: number }): void {
    if (typeof prefs.enabled === 'boolean') setEnabled(prefs.enabled);
    if (typeof prefs.volume === 'number' && Number.isFinite(prefs.volume)) {
        setVolume(Math.min(1, Math.max(0, prefs.volume)));
    }
}

export function startUiSounds(): void {
    if (typeof document === 'undefined') return;
    if (started) return;
    started = true;
    bind();

    const onPointerEnter = (event: Event) => onFallbackHover(event as PointerEvent);
    const onPointerDown = (event: Event) => onFallbackPress(event as PointerEvent, 'press');
    const onPointerUp = (event: Event) => onFallbackPress(event as PointerEvent, 'release');
    const onClick = (event: Event) => onFallbackToggle(event as MouseEvent);

    document.addEventListener('pointerenter', onPointerEnter, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('click', onClick, true);

    teardown = () => {
        document.removeEventListener('pointerenter', onPointerEnter, true);
        document.removeEventListener('pointerdown', onPointerDown, true);
        document.removeEventListener('pointerup', onPointerUp, true);
        document.removeEventListener('click', onClick, true);
        started = false;
        teardown = null;
        lastHoverAt = -Infinity;
    };
}

export function stopUiSounds(): void {
    teardown?.();
}

export function findUiSoundTarget(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null;
    const el = target.closest<HTMLElement>(UI_SOUND_TARGET_SELECTOR);
    if (!el) return null;
    if (el.closest(`[${ATTR.skip}]`)) return null;
    if (isDisabled(el)) return null;
    return el;
}

function isDisabled(el: HTMLElement): boolean {
    if (el.getAttribute('aria-disabled') === 'true') return true;
    if (el.hasAttribute('disabled')) return true;
    if ('disabled' in el && Boolean((el as HTMLButtonElement).disabled)) return true;
    return false;
}

export function isNavSoundTarget(el: HTMLElement): boolean {
    const role = el.getAttribute('role');
    if (el.tagName === 'A' && el.hasAttribute('href')) return true;
    if (role === 'tab' || role === 'menuitem' || role === 'menuitemcheckbox' || role === 'menuitemradio' || role === 'option') {
        return true;
    }
    return Boolean(
        el.closest('nav, header, [role="navigation"], [role="tablist"], [role="menu"], [role="menubar"], [role="listbox"]'),
    );
}

export function isToggleSoundTarget(el: HTMLElement): boolean {
    const role = el.getAttribute('role');
    if (role === 'tab' || role === 'switch' || role === 'menuitemcheckbox' || role === 'menuitemradio') return true;
    if (el.tagName === 'SUMMARY') return true;
    if (el.hasAttribute('aria-pressed') || el.hasAttribute('aria-checked')) return true;
    if (el.hasAttribute('aria-expanded')) return true;
    return false;
}

function isFineMouse(event: PointerEvent): boolean {
    if (event.pointerType && event.pointerType !== 'mouse') return false;
    return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches !== false;
}

function prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function onFallbackHover(event: PointerEvent): void {
    if (!isFineMouse(event) || prefersReducedMotion()) return;
    const el = findUiSoundTarget(event.target);
    if (!el || el.hasAttribute(ATTR.hover) || !isNavSoundTarget(el)) return;
    const related = event.relatedTarget;
    if (related instanceof Node && el.contains(related)) return;
    const now = performance.now();
    if (now - lastHoverAt < HOVER_GAP_MS) return;
    lastHoverAt = now;
    play('tick');
}

function onFallbackPress(event: PointerEvent, kind: 'press' | 'release'): void {
    const el = findUiSoundTarget(event.target);
    if (!el || isToggleSoundTarget(el)) return;
    if (kind === 'press' && el.hasAttribute(ATTR.press)) return;
    if (kind === 'release' && el.hasAttribute(ATTR.release)) return;
    play(kind);
}

function onFallbackToggle(event: MouseEvent): void {
    const el = findUiSoundTarget(event.target);
    if (!el || !isToggleSoundTarget(el) || el.hasAttribute(ATTR.toggle)) return;
    play('toggle');
}
