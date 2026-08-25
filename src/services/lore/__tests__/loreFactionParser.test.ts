import { describe, it, expect } from 'vitest';
import { parseFactionsFromLore, parseFactionHeaderName } from '../loreFactionParser';
import type { LoreChunk } from '../../../types';

function facChunk(header: string, content: string): LoreChunk {
    return {
        id: `test-${Math.random().toString(36).slice(2, 8)}`,
        header,
        content,
        tokens: 100,
        alwaysInclude: false,
        triggerKeywords: [],
        category: 'faction',
        linkedEntities: [],
        priority: 7,
        scanDepth: 3,
    };
}

describe('parseFactionHeaderName', () => {
    it('strips FACTION -- and FACTION — markers', () => {
        expect(parseFactionHeaderName('FACTION -- Church of the Evernight Goddess'))
            .toBe('Church of the Evernight Goddess');
        expect(parseFactionHeaderName('FACTION — Tarot Club')).toBe('Tarot Club');
    });

    it('strips a [CHUNK: ...] marker', () => {
        expect(parseFactionHeaderName('[CHUNK: FACTION] Aurora Order')).toBe('Aurora Order');
    });
});

describe('parseFactionsFromLore — field mapping', () => {
    const BLOCK = `**Type:** Orthodox Church (Darkness pathway complete)
**Key Members:** Dunn Smith, Leonard Mitchell
**Stance:** Lawful establishment in the Loen Kingdom.
The Evernight Goddess rules the night.`;

    it('maps Type, Stance, Key Members and lifts the parenthetical into pathways', () => {
        const [faction] = parseFactionsFromLore([facChunk('FACTION — Church of the Evernight Goddess', BLOCK)]);
        expect(faction.name).toBe('Church of the Evernight Goddess');
        expect(faction.type).toBe('Orthodox Church');
        expect(faction.pathways).toBe('Darkness pathway complete');
        expect(faction.stance).toBe('Lawful establishment in the Loen Kingdom.');
        expect(faction.keyMembers).toBe('Dunn Smith, Leonard Mitchell');
        expect(faction.description).toContain('Evernight Goddess');
        expect(faction.id).toMatch(/^fac_/);
        expect(faction.source).toBe('manual');
    });

    it('ignores non-faction chunks', () => {
        const chunk = facChunk('CHARACTER -- Dunn Smith', BLOCK);
        expect(parseFactionsFromLore([{ ...chunk, category: 'character' }])).toHaveLength(0);
    });

    it('collapses duplicate headers from windowed chunks', () => {
        const factions = parseFactionsFromLore([
            facChunk('FACTION — Tarot Club', '**Type:** Secret organization\nA gathering.'),
            facChunk('FACTION — Tarot Club', '**Type:** Secret organization\nA gathering.'),
        ]);
        expect(factions).toHaveLength(1);
    });

    it('wires AlliedWith and OpposedTo into symmetric relations', () => {
        const factions = parseFactionsFromLore([
            facChunk('FACTION — Aurora Order', '**Type:** Secret cult\n**OpposedTo:** Church of the Evernight Goddess\nA True Creator cult.'),
            facChunk('FACTION — Church of the Evernight Goddess', '**Type:** Orthodox Church\n**AlliedWith:** Church of the Lord of Storms\nNight and concealment.'),
            facChunk('FACTION — Church of the Lord of Storms', '**Type:** Orthodox Church\nStorm and wrath.'),
        ]);
        const byName = Object.fromEntries(factions.map(f => [f.name, f]));
        const evernight = byName['Church of the Evernight Goddess'];
        const aurora = byName['Aurora Order'];
        const storms = byName['Church of the Lord of Storms'];
        expect(aurora.relations.some(r => r.toId === evernight.id && r.kind === 'opposed')).toBe(true);
        expect(evernight.relations.some(r => r.toId === aurora.id && r.kind === 'opposed')).toBe(true);
        expect(evernight.relations.some(r => r.toId === storms.id && r.kind === 'allied')).toBe(true);
        expect(storms.relations.some(r => r.toId === evernight.id && r.kind === 'allied')).toBe(true);
    });
});
