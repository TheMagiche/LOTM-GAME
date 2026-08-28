import { describe, expect, it } from 'vitest';
import { loadLotmItemCatalog } from '../lotmItemCatalog';
import { catalogAlreadySeeded } from '../lotmItemKinds';

describe('loadLotmItemCatalog', () => {
    it('loads canon items from gamedata lists with kind and grade from the source file', () => {
        const catalog = loadLotmItemCatalog();
        const byKind = (kind: string) => catalog.filter(item => item.kind === kind);
        const byGrade = (grade: string) => catalog.filter(item => item.kind === 'sealed-artefact' && item.grade === grade);

        expect(catalog.length).toBeGreaterThan(100);
        expect(byKind('beyonder-weapon').length).toBeGreaterThan(0);
        expect(byKind('medicine').length).toBeGreaterThan(0);
        expect(byKind('mystical-item').length).toBeGreaterThan(0);
        expect(byKind('sealed-artefact').length).toBeGreaterThan(0);
        expect(catalog.every(item => item.source === 'catalog' && item.id.startsWith('itm_'))).toBe(true);
        expect(byKind('sealed-artefact').every(item => Boolean(item.grade))).toBe(true);
        expect(byGrade('0').length).toBeGreaterThan(0);
        expect(byGrade('1').length).toBeGreaterThan(0);
        expect(byGrade('2').length).toBeGreaterThan(0);
        expect(byGrade('3').length).toBeGreaterThan(0);
        expect(byGrade('unique').length).toBeGreaterThan(0);
        expect(byKind('medicine').every(item => item.function.trim().length > 0)).toBe(true);
        expect(catalog.some(item => item.name === 'Amulet' && item.kind === 'mystical-item')).toBe(false);
    });

    it('keeps same-name items that differ by kind or grade', () => {
        const catalog = loadLotmItemCatalog();
        const flog = catalog.filter(item => item.name === 'Flog');
        if (flog.length >= 2) {
            expect(new Set(flog.map(item => item.grade)).size).toBeGreaterThan(1);
        }
        const gas = catalog.filter(item => item.name === 'Sanguine Anesthesia Gas');
        if (gas.length >= 2) {
            expect(new Set(gas.map(item => item.kind)).size).toBeGreaterThan(1);
        }
        expect(catalogAlreadySeeded(catalog[0], [])).toBe(false);
        expect(catalogAlreadySeeded(catalog[0], [catalog[0]])).toBe(true);
        const clone = { ...catalog[0], id: 'other-id' };
        expect(catalogAlreadySeeded(clone, [catalog[0]])).toBe(true);
    });
});
