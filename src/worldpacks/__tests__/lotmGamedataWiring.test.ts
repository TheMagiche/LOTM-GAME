import { describe, expect, it } from 'vitest';
import { mergeLotmChurches, loadLotmChurches } from '../lotmChurches';
import { mergeLotmGeography, loadLotmGeography } from '../lotmGeography';
import { formatLotmCurrencyBlock } from '../lotmCurrency';
import { labelLotmLootCategory } from '../lotmLootLabels';
import { getLotmPathway, getLotmSequence } from '../lotmPathways';
import { formatLotmBeyonderEngineBlock, applySpiritualityDelta, readLossOfControl, resolveSequenceAdvantage, applySequenceAdvantageToDiceOutcomes, applyLotmPotionDrink } from '../lotmBeyonderState';
import { DEFAULT_CHARACTER_PROFILE } from '../../types';
import type { PlayerCharacter } from '../../types';

describe('LOTM gamedata wiring', () => {
    it('loads orthodox churches including Evernight Nighthawks', () => {
        const churches = loadLotmChurches();
        const evernight = churches.find(c => c.name === 'Church of the Evernight Goddess');
        expect(evernight).toBeDefined();
        expect(evernight!.aliases).toMatch(/Nighthawks/i);
        expect(evernight!.pathways.toLowerCase()).toContain('darkness');
        expect(mergeLotmChurches([]).length).toBe(churches.length);
        expect(mergeLotmChurches(churches)).toEqual(churches);
    });

    it('loads geography beyond the lore-seeded cities', () => {
        const places = loadLotmGeography();
        expect(places.map(p => p.name)).toEqual(expect.arrayContaining([
            'Northern Continent', 'Sonia Sea', 'Spirit World',
        ]));
        expect(mergeLotmGeography(places)).toEqual(places);
    });

    it('formats Loen pound/soli/pence conversion for the GM', () => {
        const block = formatLotmCurrencyBlock();
        expect(block).toContain('[CURRENCY]');
        expect(block).toMatch(/1 gold pound = 20 soli = 240 pence/);
    });

    it('labels loot categories in LOTM terms', () => {
        expect(labelLotmLootCategory('ordinary')).toMatch(/Ordinary/i);
        expect(labelLotmLootCategory('mystical')).toMatch(/Mystical/i);
        expect(labelLotmLootCategory('characteristics')).toMatch(/characteristic/i);
        expect(labelLotmLootCategory('artifact')).toMatch(/Sealed/i);
    });

    it('attaches Acting Method and formula from advancement JSON', () => {
        const fool = getLotmPathway('fool');
        const seer = getLotmSequence(fool, 9);
        expect(seer?.actingMethod).toMatch(/fate/i);
        expect(seer?.formula?.main.length).toBeGreaterThan(0);
        expect(seer?.consumptionBacklash).toBeTruthy();
    });

    it('injects Sequence-as-Advantage and spirituality for a seeded PC', () => {
        const pc = {
            id: 'pc-1',
            name: 'Clara',
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
            affinity: 50,
            signatureKit: { equipment: [], abilities: [], pathway: 'fool', sequence: 9 },
            pcMeta: { digestion: 10, lossOfControl: 0 },
        } as PlayerCharacter;
        const profile = { ...DEFAULT_CHARACTER_PROFILE, mp: { current: 14, max: 14 } };
        const block = formatLotmBeyonderEngineBlock(pc, profile);
        expect(block).toContain('[BEYONDER]');
        expect(block).toMatch(/SEQUENCE AS TIER/);
        expect(block).toContain('SPIRITUALITY: 14/14');
        expect(block).toContain('DIGESTION: 10%');
        expect(block).toMatch(/NEXT FORMULA \(Seq 8/);
        expect(readLossOfControl(pc)).toBe(0);
        expect(applySpiritualityDelta(profile, -2).mp).toEqual({ current: 12, max: 14 });
    });

    it('collapses the fairness pool to the Sequence-as-Advantage band', () => {
        const pc = {
            id: 'pc-1',
            name: 'Clara',
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
            affinity: 50,
            signatureKit: { equipment: [], abilities: [], pathway: 'fool', sequence: 9 },
        } as PlayerCharacter;
        expect(resolveSequenceAdvantage(pc, undefined, [])?.band).toBe('Advantage');
        expect(resolveSequenceAdvantage(pc, undefined, [{ signatureKit: { sequence: 7 } }])?.band).toBe('Disadvantage');
        expect(resolveSequenceAdvantage(pc, undefined, [{ signatureKit: { sequence: 9 } }])?.band).toBe('Normal');
        const pool = '\n[DICE OUTCOMES: COMBAT=(Disadvantage: Failure, Normal: Success, Advantage: Triumph) | MUNDANE=(Narrative Boon)]';
        expect(applySequenceAdvantageToDiceOutcomes(pool, 'Advantage')).toBe(
            '\n[DICE OUTCOMES: COMBAT=(Advantage: Triumph) | MUNDANE=(Narrative Boon)]',
        );
    });

    it('attaches potion art on Fool Sequence 9', () => {
        const fool = getLotmPathway('fool');
        const seer = getLotmSequence(fool, 9);
        expect(seer?.potionSrc).toMatch(/\.webp/i);
    });

    it('blocks Sequence promotion below 100% digestion and promotes at 100%', () => {
        const base = {
            id: 'pc-1',
            name: 'Clara',
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
            affinity: 50,
            signatureKit: { equipment: [], abilities: ['Spirit Vision'], pathway: 'fool', sequence: 9 },
            pcMeta: { digestion: 40, lossOfControl: 0 as const },
        } as PlayerCharacter;
        const profile = { ...DEFAULT_CHARACTER_PROFILE, level: 9, class: 'Fool Pathway', abilities: ['Spirit Vision'] };
        expect(applyLotmPotionDrink(base, profile).ok).toBe(false);
        const ready = { ...base, pcMeta: { ...base.pcMeta, digestion: 100 } };
        const drunk = applyLotmPotionDrink(ready, profile);
        expect(drunk.ok).toBe(true);
        if (!drunk.ok) return;
        expect(drunk.pc.signatureKit?.sequence).toBe(8);
        expect(drunk.pc.pcMeta?.digestion).toBe(0);
        expect(drunk.profile.level).toBe(8);
        expect(drunk.profile.abilities.length).toBeGreaterThan(0);
    });
});
