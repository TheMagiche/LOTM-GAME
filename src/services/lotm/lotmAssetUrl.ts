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

/** Campaign covers may be data URLs or `/assets/lotm/...` paths. */
export function campaignCoverSrc(coverImage: string | undefined | null): string {
    if (!coverImage) return '';
    if (coverImage.startsWith('data:') || coverImage.startsWith('blob:') || coverImage.startsWith('http')) {
        return coverImage;
    }
    if (coverImage.startsWith('/assets/')) {
        return `${ASSET_BASE || ''}${coverImage}`;
    }
    return coverImage;
}
