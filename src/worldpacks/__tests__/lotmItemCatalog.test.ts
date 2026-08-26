import { describe, expect, it } from 'vitest';
import { loadLotmItemCatalog } from '../lotmItemCatalog';

describe('loadLotmItemCatalog', () => {
    it('loads canon sealed artefacts, medicines, weapons, and mystical items', () => {
        const catalog = loadLotmItemCatalog();
        const kinds = new Set(catalog.map(item => item.kind));
        expect(catalog.length).toBeGreaterThan(100);
        expect(kinds.has('sealed-artefact')).toBe(true);
        expect(kinds.has('medicine')).toBe(true);
        expect(kinds.has('beyonder-weapon')).toBe(true);
        expect(kinds.has('mystical-item')).toBe(true);
        expect(catalog.every(item => item.source === 'catalog' && item.id.startsWith('itm_'))).toBe(true);
    });
});
