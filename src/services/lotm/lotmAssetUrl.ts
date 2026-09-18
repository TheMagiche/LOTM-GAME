import { ASSET_BASE } from '../../lib/apiBase';

/** Prefix a path relative to `gamedata/` so it resolves in Vite proxy and Electron. */
export function lotmAssetUrl(relativePath: string): string {
    const trimmed = relativePath.replace(/^\/+/, '');
    const prefix = ASSET_BASE || '';
    return `${prefix}/assets/lotm/${trimmed}`;
}

export function isLotmAssetPath(src: string | undefined | null): boolean {
    if (!src) return false;
    return src.startsWith('/assets/lotm/') || src.includes('/assets/lotm/');
}

/**
 * Turn a stored portrait / cover / asset path into a URL the renderer can load.
 *
 * Campaign JSON keeps root-absolute `/assets/...` paths (same-origin in the
 * browser). Electron loads the UI via `file://`, so those must be prefixed
 * with the local Express origin.
 */
export function resolveMediaUrl(src: string | undefined | null): string {
    if (!src) return '';
    const trimmed = src.trim();
    if (!trimmed) return '';
    if (
        trimmed.startsWith('data:')
        || trimmed.startsWith('blob:')
        || /^https?:\/\//i.test(trimmed)
    ) {
        return trimmed;
    }
    if (trimmed.startsWith('/assets/')) {
        return `${ASSET_BASE || ''}${trimmed}`;
    }
    if (isLotmAssetPath(trimmed)) {
        const rel = trimmed.replace(/^.*\/assets\/lotm\//, '');
        return lotmAssetUrl(rel);
    }
    if (trimmed.startsWith('image/') || trimmed.startsWith('assets/')) {
        return lotmAssetUrl(trimmed);
    }
    return trimmed;
}

/** Campaign covers may be data URLs or `/assets/lotm/...` paths. */
export function campaignCoverSrc(coverImage: string | undefined | null): string {
    return resolveMediaUrl(coverImage);
}
