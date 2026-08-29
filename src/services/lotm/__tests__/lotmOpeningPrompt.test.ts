import { describe, expect, it, vi } from 'vitest';
import claraJson from '../../../../mechanics/World_compendium/Lord of the Mysteries/people/lotm_pc_clara_whitlock.json';
import type { PlayerCharacter } from '../../../types';
import {
    formatLotmOpeningPrompt,
    maybeInjectLotmOpeningPrompt,
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
        expect(text).toContain('Do not interview me.');
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
