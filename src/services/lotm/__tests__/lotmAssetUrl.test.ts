import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../../lib/apiBase');
});

async function loadWithAssetBase(assetBase: string) {
    vi.resetModules();
    vi.doMock('../../../lib/apiBase', () => ({
        API_BASE: assetBase ? `${assetBase}/api` : '/api',
        ASSET_BASE: assetBase,
    }));
    return import('../lotmAssetUrl');
}

describe('lotmAssetUrl', () => {
    it('prefixes gamedata-relative paths for the Express static mount', async () => {
        const { lotmAssetUrl } = await loadWithAssetBase('');
        expect(lotmAssetUrl('image/characters/dunn_smith.webp'))
            .toBe('/assets/lotm/image/characters/dunn_smith.webp');
    });

    it('points at localhost when the renderer is file:// (Electron)', async () => {
        const { lotmAssetUrl, resolveMediaUrl } = await loadWithAssetBase('http://localhost:3001');
        expect(lotmAssetUrl('image/characters/dunn_smith.webp'))
            .toBe('http://localhost:3001/assets/lotm/image/characters/dunn_smith.webp');
        expect(resolveMediaUrl('/assets/lotm/image/characters/dunn_smith.webp'))
            .toBe('http://localhost:3001/assets/lotm/image/characters/dunn_smith.webp');
        expect(resolveMediaUrl('image/players/clara_whitlock.webp'))
            .toBe('http://localhost:3001/assets/lotm/image/players/clara_whitlock.webp');
    });
});

describe('resolveMediaUrl', () => {
    it('leaves data, blob, and http URLs alone', async () => {
        const { resolveMediaUrl } = await loadWithAssetBase('http://localhost:3001');
        expect(resolveMediaUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
        expect(resolveMediaUrl('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
        expect(resolveMediaUrl('https://cdn.example/p.webp')).toBe('https://cdn.example/p.webp');
    });

    it('is a no-op prefix in the browser (empty ASSET_BASE)', async () => {
        const { resolveMediaUrl, campaignCoverSrc } = await loadWithAssetBase('');
        expect(resolveMediaUrl('/assets/lotm/image/characters/audrey_hall.webp'))
            .toBe('/assets/lotm/image/characters/audrey_hall.webp');
        expect(campaignCoverSrc('/assets/lotm/image/cover.webp'))
            .toBe('/assets/lotm/image/cover.webp');
    });
});
