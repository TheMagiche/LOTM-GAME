import { describe, expect, it } from 'vitest';
import { buildItemLedgerBlock } from '../items';
import type { ItemLedgerEntry } from '../../../types';
import { EMPTY_ITEM_ENTRY } from '../../../types';

function item(id: string, name: string, extra: Partial<ItemLedgerEntry> = {}): ItemLedgerEntry {
    return {
        ...EMPTY_ITEM_ENTRY,
        id,
        name,
        kind: 'sealed-artefact',
        grade: '3',
        function: 'A compact effect.',
        downside: 'A compact cost.',
        ...extra,
    };
}

describe('buildItemLedgerBlock', () => {
    it('omits the block when the ledger is empty', () => {
        expect(buildItemLedgerBlock({
            ledger: [],
            history: [],
            userMessage: 'Klein puts on the Eye of Crystal.',
        })).toBe('');
    });

    it('injects possessed items even when they are not named', () => {
        const block = buildItemLedgerBlock({
            ledger: [item('itm_1', 'Eye of Crystal', { possessed: true, code: '3-1328' })],
            history: [],
            userMessage: 'We walk down the street.',
        });
        expect(block).toContain('[ITEMS]');
        expect(block).toContain('Eye of Crystal');
        expect(block).toContain('in party possession');
    });

    it('injects a named artefact and skips unnamed unpossessed ones', () => {
        const block = buildItemLedgerBlock({
            ledger: [
                item('itm_1', 'Eye of Crystal'),
                item('itm_2', 'Master Key', { function: 'Opens locks.' }),
            ],
            history: [],
            userMessage: 'He draws the Master Key.',
        });
        expect(block).toContain('Master Key');
        expect(block).not.toContain('Eye of Crystal');
    });
});
