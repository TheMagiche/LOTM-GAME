export const LANDING_ASSET_TIMEOUT_MS = 12_000;

export const LOTM_BOOT_SPLASH_ID = 'lotm-boot-splash';

export function dismissLotmBootSplash(): void {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(LOTM_BOOT_SPLASH_ID);
    if (!el) return;
    el.classList.add('is-done');
    const remove = () => el.remove();
    el.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 500);
}

export function preloadImage(src: string): Promise<boolean> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

export async function preloadLandingAssets(
    urls: string[],
    onProgress?: (loaded: number, total: number) => void,
    timeoutMs = LANDING_ASSET_TIMEOUT_MS,
): Promise<void> {
    const unique = [...new Set(urls.filter(Boolean))];
    const total = unique.length;
    if (total === 0) {
        onProgress?.(0, 0);
        return;
    }

    let loaded = 0;
    onProgress?.(0, total);

    const work = Promise.all(
        unique.map((src) =>
            preloadImage(src).then(() => {
                loaded += 1;
                onProgress?.(loaded, total);
            }),
        ),
    );

    await Promise.race([
        work,
        new Promise<void>((resolve) => {
            window.setTimeout(resolve, timeoutMs);
        }),
    ]);
}
