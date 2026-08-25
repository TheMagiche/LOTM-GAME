import { describe, expect, it } from 'vitest';
import { buildFactionBlock } from '../factions';
import type { FactionEntry, NPCEntry } from '../../../types';

function faction(id: string, name: string, extra: Partial<FactionEntry> = {}): FactionEntry {
    return {
        id,
        name,
        aliases: '',
        type: 'Secret organization',
        stance: 'Unknown',
        keyMembers: '',
        region: '',
        pathways: '',
        description: 'A compact description.',
        relations: [],
        firstSeenScene: '',
        lastSeenScene: '',
        source: 'manual',
        ...extra,
    };
}

describe('buildFactionBlock', () => {
    it('omits the block when the ledger is empty', () => {
        expect(buildFactionBlock({
            ledger: [],
            history: [],
            userMessage: 'The Tarot Club meets tonight.',
        })).toBe('');
    });

    it('injects a mentioned faction and skips names already in RAG headers', () => {
        const tarot = faction('fac_1', 'Tarot Club');
        const aurora = faction('fac_2', 'Aurora Order');
        const block = buildFactionBlock({
            ledger: [tarot, aurora],
            history: [],
            userMessage: 'The Tarot Club and the Aurora Order both moved.',
            relevantLore: [{ header: 'FACTION — Aurora Order', content: '', id: 'l1', tokens: 1, alwaysInclude: false, triggerKeywords: [], category: 'faction', linkedEntities: [], priority: 7, scanDepth: 3 }],
        });
        expect(block).toContain('[FACTIONS]');
        expect(block).toContain('Tarot Club');
        expect(block).not.toContain('Aurora Order');
    });

    it('includes a faction held by an on-stage NPC even without a text mention', () => {
        const church = faction('fac_3', 'Church of the Evernight Goddess', { aliases: 'Nighthawks' });
        const npc = { id: 'npc_dunn', name: 'Dunn Smith', faction: 'Nighthawks' } as NPCEntry;
        const block = buildFactionBlock({
            ledger: [church],
            history: [],
            userMessage: 'He looks tired.',
            npcLedger: [npc],
            onStageNpcIds: ['npc_dunn'],
        });
        expect(block).toContain('Church of the Evernight Goddess');
    });
});
