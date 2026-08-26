import { describe, expect, it } from 'vitest';
import { firstNameHighlightToken, npcHighlightVariants } from '../MessageMarkdown';

describe('npc name highlight variants', () => {
    it('does not index the article in "The Eternal Blazing Sun"', () => {
        expect(firstNameHighlightToken('The Eternal Blazing Sun')).toBe('Eternal');
        const keys = npcHighlightVariants({
            name: 'The Eternal Blazing Sun',
            aliases: 'The Sun God',
        }).map(k => k.toLowerCase());
        expect(keys).toContain('the eternal blazing sun');
        expect(keys).toContain('the sun god');
        expect(keys).not.toContain('the');
    });

    it('still indexes a real given name from a multi-word name', () => {
        expect(firstNameHighlightToken('Rin Holmes')).toBe('Rin');
        expect(npcHighlightVariants({ name: 'Dunn Smith', aliases: '' })).toEqual(
            expect.arrayContaining(['Dunn Smith', 'Dunn']),
        );
    });
});
