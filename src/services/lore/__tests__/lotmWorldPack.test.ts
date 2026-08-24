import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { chunkLoreFile } from '../loreChunker';
import { parseNPCsFromLore } from '../loreNPCParser';
import { parseLocationsFromLore } from '../loreLocationParser';
import { extractEngineSeeds } from '../loreEngineSeeder';
import { loadLootTree } from '../lootTreeLoader';

// The shipped Lord of the Mysteries world pack is a fixture like any other
// Example_Setup compendium — these tests keep its machine-parsed format honest.
const LOTM_DIR = resolve(__dirname, '../../../../Example_Setup/World_compendium/Lord of the Mysteries');
const lore = readFileSync(resolve(LOTM_DIR, 'world_lore_lord_of_the_mysteries.md'), 'utf-8');
const chunks = chunkLoreFile(lore);

describe('LOTM world pack — chunking', () => {
    it('produces an always-include overview preamble', () => {
        const overview = chunks.find(c => c.id === 'preamble' && c.alwaysInclude);
        expect(overview).toBeDefined();
    });

    it('classifies factions, power systems, economy and events', () => {
        expect(chunks.filter(c => c.category === 'faction').length).toBeGreaterThanOrEqual(7);
        // [CHUNK: POWER] markers keep the Beyonder rules in the power_system bucket
        expect(chunks.filter(c => c.category === 'power_system').length).toBeGreaterThanOrEqual(6);
        expect(chunks.find(c => c.category === 'economy')).toBeDefined();
        expect(chunks.filter(c => c.category === 'event').length).toBeGreaterThanOrEqual(4);
    });

    it('seeds the surprise / encounter / world-event engines', () => {
        const seeds = extractEngineSeeds(chunks);
        expect(seeds.surpriseTypes.length).toBeGreaterThanOrEqual(5);
        expect(seeds.encounterTypes.length).toBeGreaterThanOrEqual(5);
        expect(seeds.worldWho.length).toBeGreaterThanOrEqual(3);
        expect(seeds.worldWhat.length).toBeGreaterThanOrEqual(3);
        expect(seeds.worldWhere.length).toBeGreaterThanOrEqual(3);
        expect(seeds.worldWhy.length).toBeGreaterThanOrEqual(3);
    });
});

describe('LOTM world pack — NPC ledger seeding', () => {
    const npcs = parseNPCsFromLore(chunks);

    it('extracts the canon cast', () => {
        expect(npcs.map(n => n.name)).toEqual(expect.arrayContaining([
            'Klein Moretti', 'Audrey Hall', 'Alger Wilson', 'Dunn Smith',
            'Leonard Mitchell', 'Zaratul', 'Amon', 'Adam', 'Azik Eggers',
            'Roselle Gustav', 'Will Auceptin', 'Fors Wall', 'Xio Derecha',
        ]));
    });

    it('fills every required field for every character — no placeholders', () => {
        for (const npc of npcs) {
            expect(npc.name.trim(), 'name').toBeTruthy();
            expect(npc.appearance?.trim() ?? '', `${npc.name} appearance`).toBeTruthy();
            expect(npc.disposition?.trim() ?? '', `${npc.name} disposition`).toBeTruthy();
            expect(npc.personality?.trim() ?? '', `${npc.name} personality`).toBeTruthy();
            expect(npc.voice?.trim() ?? '', `${npc.name} voice`).toBeTruthy();
            expect(npc.goals?.trim() ?? '', `${npc.name} goals`).toBeTruthy();
            expect(npc.storyRelevance?.trim() ?? '', `${npc.name} storyRelevance`).toBeTruthy();
            expect(npc.exampleOutput?.trim() ?? '', `${npc.name} exampleOutput`).toBeTruthy();
            expect(typeof npc.affinity).toBe('number');
        }
    });

    it('carries agency fields through to the ledger', () => {
        const dunn = npcs.find(n => n.name === 'Dunn Smith');
        const amon = npcs.find(n => n.name === 'Amon');
        expect(dunn?.tier).toBe('recurring');
        expect(dunn?.region).toBe('tingen');
        expect(dunn?.haunt?.length ?? 0).toBeGreaterThan(0);
        expect(amon?.signatureKit?.abilities.length ?? 0).toBeGreaterThan(0);
    });
});

describe('LOTM world pack — location ledger seeding', () => {
    const locations = parseLocationsFromLore(chunks);

    it('extracts canon geography with broad regions', () => {
        expect(locations.map(l => l.name)).toEqual(expect.arrayContaining([
            'Loen Kingdom', 'Backlund', 'Tingen', 'Intis Republic', 'Trier',
            'Feysac Empire', 'Feynapotter Kingdom', 'Rorsted Archipelago',
            'Bayam', 'Forsaken Land of the Gods',
        ]));
        expect(locations.find(l => l.name === 'Backlund')?.broadLocation).toBe('Loen Kingdom');
        expect(locations.find(l => l.name === 'Tingen')?.broadLocation).toBe('Loen Kingdom');
    });

    it('resolves ConnectedTo only against places in this file', () => {
        const byName = new Map(locations.map(l => [l.name, l]));
        const backlund = byName.get('Backlund');
        expect(backlund?.connections.length ?? 0).toBeGreaterThan(0);
        for (const conn of backlund?.connections ?? []) {
            expect(byName.has(conn.toId) || locations.some(l => l.id === conn.toId)).toBe(true);
        }
    });

    it('keeps descriptions inside the [LOCATION] block budget', () => {
        for (const loc of locations) {
            expect((loc.description ?? '').length).toBeLessThanOrEqual(240);
        }
    });
});

describe('LOTM world pack — loot tree', () => {
    const loot = JSON.parse(readFileSync(resolve(LOTM_DIR, 'loot.json'), 'utf-8'));

    it('loads as a valid LootTree', () => {
        expect(loadLootTree(loot)).not.toBeNull();
    });
});
