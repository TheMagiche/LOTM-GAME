import { describe, expect, it } from 'vitest';
import { mergeLootIntoInventory, inventoryDeltaFromLootLabel } from '../lootToInventory';
import { HUNT_BOUNTY_KEYWORD } from '../../../worldpacks/lotmPurse';
import { purseToInventoryItems } from '../../../worldpacks/lotmPurse';

describe('lootToInventory', () => {
    it('parses Loen currency drop labels into purse rows', () => {
        expect(inventoryDeltaFromLootLabel('12 soli')).toEqual(expect.objectContaining({
            name: 'soli', qty: 12, category: 'currency',
        }));
        expect(inventoryDeltaFromLootLabel('5 gold pounds')).toEqual(expect.objectContaining({
            name: 'Loen gold pound', qty: 5, category: 'currency',
        }));
        expect(inventoryDeltaFromLootLabel('40 pence')).toEqual(expect.objectContaining({
            name: 'pence', qty: 40, category: 'currency',
        }));
    });

    it('tags hunt posters so they never look like a wanted bounty on the PC', () => {
        const poster = inventoryDeltaFromLootLabel(
            'BOUNTY: Cattleya "Queen of Stars" flagship The Future — reward 37,000 gold pounds (status: active) — posted on the church boards; claimable only with proof of kill or capture',
        );
        expect(poster).toEqual(expect.objectContaining({
            category: 'key',
        }));
        expect(poster?.keywords).toContain(HUNT_BOUNTY_KEYWORD);
        expect(inventoryDeltaFromLootLabel('Sealed artifact: 2-049')).toBeNull();
    });

    it('merges currency drops into an existing purse and appends hunt posters', () => {
        const current = purseToInventoryItems({ soli: 10 });
        const next = mergeLootIntoInventory(current, [
            { label: '8 soli', parts: {} },
            { label: 'BOUNTY: Danitz "Blazing" of The Golden Dream — reward 10,000 gold pounds (status: removed)', parts: {} },
        ]);
        expect(next.find(i => i.name === 'soli')?.qty).toBe(18);
        expect(next.some(i => i.keywords?.includes(HUNT_BOUNTY_KEYWORD))).toBe(true);
    });
});
