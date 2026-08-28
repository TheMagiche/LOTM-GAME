import { describe, expect, it } from 'vitest';
import { resolveItem } from '../resolveItem';
import { EMPTY_ITEM_ENTRY } from '../../../types';
import { filterItems } from '../../../utils/ledgerFilters';

const crystal = {
    ...EMPTY_ITEM_ENTRY,
    id: 'itm_1',
    name: 'Eye of Crystal',
    code: '3-1328',
    aliases: 'Crystal Eye',
    kind: 'sealed-artefact' as const,
    grade: '3' as const,
};

const salts = {
    ...EMPTY_ITEM_ENTRY,
    id: 'itm_2',
    name: 'Mysticism Smelling Salts',
    kind: 'medicine' as const,
    possessed: true,
};

describe('resolveItem', () => {
    it('matches by name, alias, or registry code', () => {
        const ledger = [crystal];
        expect(resolveItem('Eye of Crystal', ledger)?.id).toBe('itm_1');
        expect(resolveItem('Crystal Eye', ledger)?.id).toBe('itm_1');
        expect(resolveItem('3-1328', ledger)?.id).toBe('itm_1');
        expect(resolveItem('Master Key', ledger)).toBeUndefined();
    });
});

describe('filterItems', () => {
    it('filters by possessed, kind, and search', () => {
        const ledger = [crystal, salts];
        expect(filterItems(ledger, '', 'possessed').map(item => item.id)).toEqual(['itm_2']);
        expect(filterItems(ledger, '', 'medicine').map(item => item.id)).toEqual(['itm_2']);
        expect(filterItems(ledger, '1328').map(item => item.id)).toEqual(['itm_1']);
    });

    it('filters sealed artefacts by grade', () => {
        const ledger = [crystal, salts];
        expect(filterItems(ledger, '', 'grade-3').map(item => item.id)).toEqual(['itm_1']);
        expect(filterItems(ledger, '', 'grade-0')).toEqual([]);
        expect(filterItems(ledger, '', 'other')).toEqual([]);
    });
});
