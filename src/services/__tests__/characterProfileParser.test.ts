import { describe, expect, it } from 'vitest';
import { applyCharacterProfilePatch } from '../characterProfileParser';
import { DEFAULT_CHARACTER_PROFILE } from '../../types';
import { minifyBookkeepingStub } from '../turn/contextMinifier';
import { purseToInventoryItems } from '../../worldpacks/lotmPurse';

describe('applyCharacterProfilePatch', () => {
    it('writes a wanted bounty string onto the live sheet', () => {
        const next = applyCharacterProfilePatch(DEFAULT_CHARACTER_PROFILE, {
            bounty: 'Church of the Evernight — 30 pounds',
        });
        expect(next.bounty).toBe('Church of the Evernight — 30 pounds');
        expect(next.hp).toEqual(DEFAULT_CHARACTER_PROFILE.hp);
    });

    it('clears a lifted bounty with an empty string', () => {
        const current = { ...DEFAULT_CHARACTER_PROFILE, bounty: 'Church of Storms — 50 pounds' };
        const next = applyCharacterProfilePatch(current, { bounty: '' });
        expect(next.bounty).toBe('');
    });
});

describe('minifyBookkeepingStub', () => {
    it('injects CR and BOUNTY so the GM cannot invent a conflicting total', () => {
        const stub = minifyBookkeepingStub(
            { ...DEFAULT_CHARACTER_PROFILE, name: 'Clara', bounty: 'Church of the Evernight — 30 pounds' },
            purseToInventoryItems({ soli: 4, pence: 6 }),
        );
        expect(stub).toMatch(/CR:4soli,6pence/);
        expect(stub).toContain('BOUNTY:Church of the Evernight — 30 pounds');
    });
});
