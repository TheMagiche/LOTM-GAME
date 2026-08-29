import { describe, expect, it } from 'vitest';
import type { CharacterProfile, NPCEntry, PlayerCharacter } from '../../types';
import { DEFAULT_CHARACTER_PROFILE } from '../../types';
import {
    applyLotmPotionDrink,
    applySequenceAdvantageToDiceOutcomes,
    applySpiritualityDelta,
    bumpLossOfControl,
    formatLotmBeyonderEngineBlock,
    formatSequenceAdvantageLine,
    readDigestion,
    readLossOfControl,
    readSpirituality,
    resolveSequenceAdvantage,
} from '../lotmBeyonderState';

function mockPc(extra: Partial<PlayerCharacter> = {}): PlayerCharacter {
    return {
        id: 'pc-test',
        name: 'Clara Whitlock',
        aliases: '',
        appearance: '',
        faction: 'Nighthawks',
        storyRelevance: 'Protagonist',
        disposition: 'Calm',
        status: 'Active',
        goals: 'Advancement',
        voice: 'Measured',
        personality: 'Careful',
        exampleOutput: '',
        affinity: 0,
        signatureKit: {
            pathway: 'fool',
            sequence: 9,
            abilities: ['Spirit Vision', 'Divination'],
        },
        pcMeta: {
            archetype: 'Seer',
            combatTier: 'Sequence 9',
            digestion: 100,
            lossOfControl: 0,
        },
        ...extra,
    };
}

function mockNpc(name: string, pathway: string, sequence: number): NPCEntry {
    return {
        id: `npc-${name}`,
        name,
        aliases: '',
        appearance: '',
        faction: 'Enemies',
        storyRelevance: 'Antagonist',
        disposition: 'Hostile',
        status: 'Active',
        goals: 'Ambush',
        voice: 'Harsh',
        personality: 'Ruthless',
        exampleOutput: '',
        affinity: 0,
        signatureKit: {
            pathway,
            sequence,
        },
    };
}

describe('lotmBeyonderState', () => {
    it('resolves Sequence Advantage correctly against lower tier and higher sequence opponents', () => {
        const pc = mockPc({ signatureKit: { pathway: 'fool', sequence: 8 } });
        const weakerNpc = mockNpc('Cultist', 'secret_supplicant', 9);
        const result = resolveSequenceAdvantage(pc, undefined, [weakerNpc]);

        expect(result.band).toBe('Advantage');
        expect(result.reason).toContain('Seq 8');
        expect(formatSequenceAdvantageLine(result)).toContain('Advantage');
    });

    it('resolves Disadvantage when fighting a stronger opponent', () => {
        const pc = mockPc({ signatureKit: { pathway: 'fool', sequence: 9 } });
        const strongerNpc = mockNpc('Bishop', 'sun', 7);
        const result = resolveSequenceAdvantage(pc, undefined, [strongerNpc]);

        expect(result.band).toBe('Disadvantage');
        expect(result.reason).toContain('Seq 9 vs Seq 7');
    });

    it('manages Spirituality consumption and Loss of Control escalation', () => {
        const profile: CharacterProfile = {
            ...DEFAULT_CHARACTER_PROFILE,
            mp: { current: 5, max: 10 },
        };

        const spent = applySpiritualityDelta(profile, -1);
        expect(spent.mp?.current).toBe(4);

        const pc = mockPc();
        expect(readLossOfControl(pc)).toBe(0);
        const bumped = bumpLossOfControl(pc, 1);
        expect(readLossOfControl(bumped)).toBe(1);
    });

    it('handles potion drinking advancement flow correctly when 100% digested', () => {
        const pc = mockPc({
            signatureKit: { pathway: 'fool', sequence: 9 },
            pcMeta: { digestion: 100, lossOfControl: 0 },
        });
        const profile: CharacterProfile = {
            ...DEFAULT_CHARACTER_PROFILE,
            level: 9,
            class: 'Fool Pathway · Sequence 9 · Seer',
        };

        const result = applyLotmPotionDrink(pc, profile);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.pc.signatureKit?.sequence).toBe(8);
            expect(result.pc.pcMeta?.digestion).toBe(0);
            expect(result.profile.level).toBe(8);
        }
    });

    it('rejects potion drinking when digestion is below 100%', () => {
        const pc = mockPc({
            signatureKit: { pathway: 'fool', sequence: 9 },
            pcMeta: { digestion: 50, lossOfControl: 0 },
        });
        const profile: CharacterProfile = {
            ...DEFAULT_CHARACTER_PROFILE,
            level: 9,
        };

        const result = applyLotmPotionDrink(pc, profile);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain('not fully digested');
        }
    });

    it('formats Beyonder engine block for AI prompt injection', () => {
        const pc = mockPc();
        const block = formatLotmBeyonderEngineBlock(pc, undefined);
        expect(block).toContain('[BEYONDER]');
        expect(block).toContain('Sequence 9');
    });

    it('collapses dice outcomes to single engine Sequence band', () => {
        const input = '[DICE OUTCOMES: COMBAT=(Disadvantage: Failure, Normal: Success, Advantage: Triumph)]';
        const collapsed = applySequenceAdvantageToDiceOutcomes(input, 'Advantage');
        expect(collapsed).toContain('COMBAT=(Advantage: Triumph)');
        expect(collapsed).not.toContain('Normal: Success');
    });
});
