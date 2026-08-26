import { describe, expect, it } from 'vitest';
import claraJson from '../../../../Example_Setup/World_compendium/Lord of the Mysteries/people/lotm_pc_clara_whitlock.json';
import { DEFAULT_CHARACTER_PROFILE } from '../../../types';
import type { PlayerCharacter } from '../../../types';
import { attachLotmPathwaysToNpcs } from '../../../worldpacks/lotmPathways';
import { characterIdentityFromPlayerCharacter, characterProfileFromPlayerCharacter } from '../profileFromPc';

describe('characterProfileFromPlayerCharacter', () => {
    it('seeds Clara Whitlock into the in-game Character Profile sheet', () => {
        const row = (Array.isArray(claraJson) ? claraJson[0] : claraJson) as PlayerCharacter;
        const seeded = attachLotmPathwaysToNpcs([row])[0];
        const profile = characterProfileFromPlayerCharacter(seeded, DEFAULT_CHARACTER_PROFILE);

        expect(profile.name).toBe('Clara Whitlock');
        expect(profile.race).toMatch(/Human/i);
        expect(profile.class).toMatch(/Fool Pathway/);
        expect(profile.class).toMatch(/Seq 9 Seer/);
        expect(profile.level).toBe(9);
        expect(profile.hp).toEqual({ current: 18, max: 18 });
        expect(profile.mp).toEqual({ current: 14, max: 14 });
        expect(profile.stats).toEqual({ Spirituality: 7, Physique: 4, Reasoning: 6 });
        expect(profile.abilities).toEqual(expect.arrayContaining(['Spirit Vision', 'Danger Intuition']));
        expect(profile.skills.length).toBeGreaterThan(0);
        expect(profile.traits).toEqual(expect.arrayContaining(['curious', 'secretive']));
        expect(profile.notes).toMatch(/Eyes of the Fool/);

        const identity = characterIdentityFromPlayerCharacter(seeded, profile);
        expect(identity.name).toBe('Clara Whitlock');
        expect(identity.level).toBe(9);
        expect(identity.archetype).toMatch(/Seer/);
    });
});
