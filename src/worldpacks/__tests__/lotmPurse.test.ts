import { describe, expect, it } from 'vitest';
import type { InventoryItem, PlayerCharacter } from '../../types';
import { DEFAULT_CHARACTER_PROFILE } from '../../types';
import {
    DEFAULT_LOTM_PURSE,
    defaultPurseForPc,
    formatLotmBountyLine,
    formatLotmPurseLine,
    kitAndPurseInventory,
    purseToInventoryItems,
    seedInventoryIfEmpty,
} from '../lotmPurse';
import claraJson from '../../../mechanics/World_compendium/Lord of the Mysteries/people/lotm_pc_clara_whitlock.json';
import { attachLotmPathwaysToNpcs } from '../lotmPathways';

function barePc(extra: Partial<PlayerCharacter> = {}): PlayerCharacter {
    return {
        id: 'pc-1',
        name: 'Test',
        aliases: '',
        appearance: '',
        faction: '',
        storyRelevance: '',
        disposition: '',
        status: '',
        goals: '',
        voice: '',
        personality: '',
        exampleOutput: '',
        affinity: 0,
        ...extra,
    };
}

describe('lotmPurse', () => {
    it('defaults a Sequence 9 civilian purse to 10 soli', () => {
        expect(DEFAULT_LOTM_PURSE).toEqual({ soli: 10 });
        expect(defaultPurseForPc(barePc())).toEqual({ soli: 10 });
        const items = purseToInventoryItems(undefined);
        expect(items).toEqual([expect.objectContaining({ name: 'soli', qty: 10, category: 'currency' })]);
    });

    it('honors an authored purse and skips empty units', () => {
        const items = purseToInventoryItems({ pounds: 2, soli: 0, pence: 6 });
        expect(items.map(i => `${i.qty} ${i.name}`)).toEqual(['2 Loen gold pound', '6 pence']);
    });

    it('formats mixed Loen denominations on one HUD line', () => {
        const items: InventoryItem[] = [
            ...purseToInventoryItems({ pounds: 4, soli: 8, pence: 6 }),
        ];
        expect(formatLotmPurseLine(items)).toBe('4 pounds · 8 soli · 6 pence');
        expect(formatLotmPurseLine([])).toBe('');
    });

    it('formats a wanted bounty and treats none as empty', () => {
        expect(formatLotmBountyLine({ amountPounds: 30, issuer: 'Church of the Evernight', status: 'active' }))
            .toBe('Church of the Evernight — 30 pounds');
        expect(formatLotmBountyLine({ status: 'none' })).toBe('');
        expect(formatLotmBountyLine('Church of Storms — 50 pounds')).toBe('Church of Storms — 50 pounds');
        expect(formatLotmBountyLine(null)).toBe('');
    });

    it('seeds Clara kit plus her authored 4 soli / 6 pence', () => {
        const row = (Array.isArray(claraJson) ? claraJson[0] : claraJson) as PlayerCharacter;
        const seeded = attachLotmPathwaysToNpcs([row])[0];
        const items = kitAndPurseInventory(seeded);
        expect(items.map(i => i.name)).toEqual(expect.arrayContaining([
            "Grandfather's leather casebook (Seer formula and cipher margins)",
            'soli',
            'pence',
        ]));
        expect(items.find(i => i.name === 'soli')?.qty).toBe(4);
        expect(items.find(i => i.name === 'pence')?.qty).toBe(6);
        expect(items.some(i => i.category === 'currency')).toBe(true);
    });

    it('does not treat silver pendulum kit gear as currency', () => {
        const pc = barePc({
            signatureKit: { equipment: ['Divination kit — chalk, silver pendulum, candle stubs'], abilities: [] },
        });
        const items = kitAndPurseInventory(pc);
        expect(items.find(i => i.name.includes('silver pendulum'))?.category).toBe('misc');
        expect(items.find(i => i.name === 'soli')?.qty).toBe(10);
    });

    it('seedInventoryIfEmpty is a no-op when the campaign already has rows', () => {
        const existing: InventoryItem[] = purseToInventoryItems({ pounds: 1 });
        const next = seedInventoryIfEmpty(existing, barePc());
        expect(next).toBe(existing);
    });

    it('seedInventoryIfEmpty fills kit + purse on an empty campaign', () => {
        const pc = barePc({ signatureKit: { equipment: ['Composing stick'], abilities: [] } });
        const next = seedInventoryIfEmpty([], pc);
        expect(next.map(i => i.name)).toEqual(['Composing stick', 'soli']);
        expect(DEFAULT_CHARACTER_PROFILE.bounty).toBeUndefined();
    });
});
