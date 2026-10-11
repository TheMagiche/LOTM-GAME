import { describe, expect, it, vi } from 'vitest';
import claraJson from '../../../../mechanics/World_compendium/Lord of the Mysteries/people/lotm_pc_clara_whitlock.json';
import type { PlayerCharacter } from '../../../types';
import { LORD_OF_THE_MYSTERIES_PACK } from '../../../worldpacks/lordOfTheMysteries';
import {
    LOTM_INTERVIEW_OPENING,
    LOTM_PREBUILT_OPENING_STARTER,
    formatLotmOpeningPrompt,
    isLotmInterviewStarter,
    maybeInjectLotmOpeningPrompt,
    openingPromptToAutoSend,
} from '../lotmOpeningPrompt';

const clara = (Array.isArray(claraJson) ? claraJson[0] : claraJson) as PlayerCharacter;

describe('formatLotmOpeningPrompt', () => {
    it('returns empty when no named character exists', () => {
        expect(formatLotmOpeningPrompt(null)).toBe('');
        expect(formatLotmOpeningPrompt({ ...clara, name: '   ' })).toBe('');
    });

    it('builds Clara Whitlock as the first player prompt', () => {
        const text = formatLotmOpeningPrompt(clara);
        expect(text).toMatch(/^Begin the chronicle as Clara Whitlock\./);
        expect(text).toContain('Fool Pathway');
        expect(text).toContain('Seer');
        expect(text).toContain('Tingen');
        expect(text).toContain('Aldous Whitlock');
        expect(text).toContain('What I want:');
        expect(text).toContain('Sequence 9 · Seer potion');
        expect(text).toContain('Fool Pathway');
        expect(text).toMatch(/dark-blue gelatinous/i);
        expect(text).toMatch(/life up to the moment I acquire/i);
        expect(text).toContain('Do not start at the cup');
        expect(text).toContain('Do not interview me.');
    });
});

describe('LOTM_PREBUILT_OPENING_STARTER', () => {
    it('opens on origin through acquiring the potion, then the drink', () => {
        expect(LOTM_PREBUILT_OPENING_STARTER).toMatch(/ordinary life/i);
        expect(LOTM_PREBUILT_OPENING_STARTER).toMatch(/puts the Sequence 9 potion in their hands/i);
        expect(LOTM_PREBUILT_OPENING_STARTER).toContain('Do not start at the cup');
        expect(LOTM_PREBUILT_OPENING_STARTER).toMatch(/acquire the potion, then consume it/i);
        expect(LOTM_PREBUILT_OPENING_STARTER).toMatch(/those wait after the drink/i);
    });
});

describe('openingPromptToAutoSend', () => {
    it('returns the brief only for an empty chronicle that is not still indexing', () => {
        expect(openingPromptToAutoSend([], clara)).toContain('Clara Whitlock');
        expect(openingPromptToAutoSend([], clara, { indexing: true })).toBe('');
        expect(openingPromptToAutoSend([{ id: 'm1' }], clara)).toBe('');
        expect(openingPromptToAutoSend([], null)).toBe('');
    });

    it('kicks segment 1 only for an empty unseeded chronicle on the interview starter', () => {
        const starter = LORD_OF_THE_MYSTERIES_PACK.starter?.contents ?? '';
        expect(isLotmInterviewStarter(starter)).toBe(true);
        expect(isLotmInterviewStarter(LOTM_PREBUILT_OPENING_STARTER)).toBe(false);

        expect(openingPromptToAutoSend([], null, { starter, starterActive: true })).toBe(LOTM_INTERVIEW_OPENING);
        expect(openingPromptToAutoSend([], null, { starter, starterActive: false })).toBe('');
        expect(openingPromptToAutoSend([], null, { starter: LOTM_PREBUILT_OPENING_STARTER, starterActive: true })).toBe('');
        expect(openingPromptToAutoSend([], null, { indexing: true, starter, starterActive: true })).toBe('');
        expect(openingPromptToAutoSend([{ id: 'm1' }], null, { starter, starterActive: true })).toBe('');

        const seeded = openingPromptToAutoSend([], clara, { starter, starterActive: true });
        expect(seeded).toContain('Clara Whitlock');
        expect(seeded).toContain('Sequence 9 · Seer potion');
        expect(seeded).toContain('Do not interview me.');
        expect(seeded).not.toContain(LOTM_INTERVIEW_OPENING);
    });
});

describe('maybeInjectLotmOpeningPrompt', () => {
    it('injects only on an empty chronicle with a seeded PC', () => {
        const inject = vi.fn();
        expect(maybeInjectLotmOpeningPrompt([], clara, inject)).toBe(true);
        expect(inject).toHaveBeenCalledWith(expect.stringContaining('Clara Whitlock'));

        inject.mockClear();
        expect(maybeInjectLotmOpeningPrompt([{ id: 'm1' }], clara, inject)).toBe(false);
        expect(inject).not.toHaveBeenCalled();

        expect(maybeInjectLotmOpeningPrompt([], null, inject)).toBe(false);
        expect(inject).not.toHaveBeenCalled();
    });
});
