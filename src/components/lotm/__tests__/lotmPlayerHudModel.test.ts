import { describe, expect, it } from 'vitest';
import claraJson from '../../../../mechanics/World_compendium/Lord of the Mysteries/people/lotm_pc_clara_whitlock.json';
import { DEFAULT_CHARACTER_PROFILE } from '../../../types';
import type { PlayerCharacter } from '../../../types';
import { attachLotmPathwaysToNpcs } from '../../../worldpacks/lotmPathways';
import { characterProfileFromPlayerCharacter } from '../../../services/character/profileFromPc';
import { buildLotmPlayerHudModel, toLotmHudMeter } from '../lotmPlayerHudModel';

describe('toLotmHudMeter', () => {
    it('clamps the fill percentage to 0–100', () => {
        expect(toLotmHudMeter({ current: 9, max: 18 })).toEqual({ current: 9, max: 18, pct: 50 });
        expect(toLotmHudMeter({ current: 24, max: 18 })).toEqual({ current: 24, max: 18, pct: 100 });
        expect(toLotmHudMeter({ current: -2, max: 10 })).toEqual({ current: -2, max: 10, pct: 0 });
        expect(toLotmHudMeter({ current: 4, max: 0 })).toBeNull();
        expect(toLotmHudMeter(null)).toBeNull();
    });
});

describe('buildLotmPlayerHudModel', () => {
    it('hides the HUD when no character has been seeded', () => {
        const model = buildLotmPlayerHudModel(null, DEFAULT_CHARACTER_PROFILE);
        expect(model.present).toBe(false);
    });

    it('surfaces Clara Whitlock identity, emblem, meters, sequence, and abilities', () => {
        const row = (Array.isArray(claraJson) ? claraJson[0] : claraJson) as PlayerCharacter;
        const seeded = attachLotmPathwaysToNpcs([row])[0];
        const profile = characterProfileFromPlayerCharacter(seeded, DEFAULT_CHARACTER_PROFILE);
        const model = buildLotmPlayerHudModel(seeded, profile);

        expect(model.present).toBe(true);
        expect(model.name).toBe('Clara Whitlock');
        expect(model.pathwayName).toMatch(/Fool/i);
        expect(model.sequenceLabel).toMatch(/Sequence 9/);
        expect(model.sequenceLabel).toMatch(/Seer/);
        expect(model.sequenceNumber).toBe(9);
        expect(model.emblemSrc).toBeTruthy();
        expect(model.hp).toBeNull();
        expect(model.spirituality).toEqual({ current: 14, max: 14, pct: 100 });
        expect(model.digestion).toBe(0);
        expect(model.locLabel).toBe('stable');
        expect(model.canDrink).toBe(false);
        expect(model.sequenceBandLine).toMatch(/Advantage/);
        expect(model.actingMethod).toBeTruthy();
        expect(model.pathwayId).toBe('fool');
        expect(model.stats.map(s => s.label)).toEqual(expect.arrayContaining(['Spirituality', 'Physique', 'Reasoning']));
        expect(model.abilities).toEqual(expect.arrayContaining(['Spirit Vision', 'Danger Intuition']));
        expect(model.next?.sequenceLabel).toMatch(/Sequence 8/);
        expect(model.next?.abilities.length).toBeGreaterThan(0);
        expect(model.location).toBe('Tingen');
        expect(model.currency).toBe('—');
        expect(model.bounty).toBe('—');
        expect(model.items.map(item => item.name)).toEqual(expect.arrayContaining([
            "Grandfather's leather casebook (Seer formula and cipher margins)",
        ]));
    });

    it('prefers live sheet abilities over the kit snapshot', () => {
        const model = buildLotmPlayerHudModel(
            {
                id: 'pc-1',
                name: 'Clara Whitlock',
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
                signatureKit: {
                    equipment: [],
                    abilities: ['Spirit Vision'],
                    pathway: 'fool',
                    sequence: 9,
                },
            },
            {
                ...DEFAULT_CHARACTER_PROFILE,
                name: 'Clara Whitlock',
                hp: { current: 7, max: 18 },
                abilities: ['Spirit Vision', 'Flaming Jump'],
            },
        );

        expect(model.hp).toBeNull();
        expect(model.abilities).toEqual(['Spirit Vision', 'Flaming Jump']);
    });

    it('wires location, currency, and bounty from the live world snapshot', () => {
        const model = buildLotmPlayerHudModel(
            {
                id: 'pc-1',
                name: 'Clara Whitlock',
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
            },
            { ...DEFAULT_CHARACTER_PROFILE, name: 'Clara Whitlock' },
            {
                locationName: 'Tingen',
                locationFeature: 'Dorge docks',
                bounty: 'Church of the Evernight — 30 pounds',
                inventory: [
                    {
                        id: 'c1',
                        name: 'Loen gold pound',
                        qty: 4,
                        category: 'currency',
                        keywords: [],
                        equipped: false,
                        lastUsedScene: '',
                        importance: 1,
                        notes: '',
                    },
                    {
                        id: 'w1',
                        name: 'Composing stick',
                        qty: 1,
                        category: 'weapon',
                        keywords: [],
                        equipped: true,
                        lastUsedScene: '',
                        importance: 2,
                        notes: '',
                    },
                ],
            },
        );

        expect(model.location).toBe('Tingen · Dorge docks');
        expect(model.currency).toBe('4 pounds');
        expect(model.bounty).toBe('Church of the Evernight — 30 pounds');
        expect(model.items).toEqual([
            expect.objectContaining({ name: 'Loen gold pound', qty: 4, category: 'currency' }),
            expect.objectContaining({ name: 'Composing stick', equipped: true }),
        ]);
    });

    it('does not treat a hunt poster in inventory as the PC wanted bounty', () => {
        const model = buildLotmPlayerHudModel(
            {
                id: 'pc-1',
                name: 'Clara Whitlock',
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
            },
            { ...DEFAULT_CHARACTER_PROFILE, name: 'Clara Whitlock' },
            {
                inventory: [
                    {
                        id: 'b1',
                        name: 'BOUNTY: Cattleya "Queen of Stars" flagship The Future — reward 37,000 gold pounds (status: active)',
                        qty: 1,
                        category: 'key',
                        keywords: ['hunt-bounty'],
                        equipped: false,
                        lastUsedScene: '',
                        importance: 6,
                        notes: '',
                    },
                ],
            },
        );
        expect(model.bounty).toBe('—');
        expect(model.items[0].name).toMatch(/^BOUNTY:/);
    });

    it('formats a seeded Loen purse and an authored wanted bounty', () => {
        const model = buildLotmPlayerHudModel(
            {
                id: 'pc-1',
                name: 'Clara Whitlock',
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
                pcMeta: { bounty: { amountPounds: 30, issuer: 'Church of the Evernight', status: 'active' } },
            },
            { ...DEFAULT_CHARACTER_PROFILE, name: 'Clara Whitlock', bounty: 'Church of the Evernight — 30 pounds' },
            {
                inventory: [
                    {
                        id: 'c1',
                        name: 'soli',
                        qty: 4,
                        category: 'currency',
                        keywords: [],
                        equipped: false,
                        lastUsedScene: '',
                        importance: 1,
                        notes: '',
                    },
                    {
                        id: 'c2',
                        name: 'pence',
                        qty: 6,
                        category: 'currency',
                        keywords: [],
                        equipped: false,
                        lastUsedScene: '',
                        importance: 1,
                        notes: '',
                    },
                ],
                bounty: 'Church of the Evernight — 30 pounds',
            },
        );
        expect(model.currency).toBe('4 soli · 6 pence');
        expect(model.bounty).toBe('Church of the Evernight — 30 pounds');
    });

    it('shows Disadvantage when a stronger Sequence is on stage', () => {
        const model = buildLotmPlayerHudModel(
            {
                id: 'pc-1',
                name: 'Clara Whitlock',
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
                signatureKit: { equipment: [], abilities: [], pathway: 'fool', sequence: 9 },
            },
            { ...DEFAULT_CHARACTER_PROFILE, name: 'Clara Whitlock', mp: { current: 14, max: 14 } },
            { opponents: [{ signatureKit: { sequence: 7 } }] },
        );
        expect(model.sequenceBand?.band).toBe('Disadvantage');
        expect(model.sequenceBandLine).toMatch(/Disadvantage/);
    });
});
