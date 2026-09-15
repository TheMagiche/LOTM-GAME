import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { chunkLoreFile } from '../loreChunker';
import { parseLocationsFromLore } from '../loreLocationParser';
import { parseFactionsFromLore } from '../loreFactionParser';
import { extractEngineSeeds } from '../loreEngineSeeder';
import { loadLootTree } from '../lootTreeLoader';

const LOTM_DIR = resolve(__dirname, '../../../../mechanics/World_compendium/Lord of the Mysteries');
const lore = readFileSync(resolve(LOTM_DIR, 'demo_world_lore_lord_of_the_mysteries.md'), 'utf-8');
const chunks = chunkLoreFile(lore);

describe('LOTM demo world pack', () => {
    it('is a trimmed lore file that still seeds engines and Tingen', () => {
        expect(lore.length).toBeLessThan(readFileSync(resolve(LOTM_DIR, 'world_lore_lord_of_the_mysteries.md'), 'utf-8').length);
        expect(chunks.find(c => c.id === 'preamble' && c.alwaysInclude)).toBeDefined();
        const seeds = extractEngineSeeds(chunks);
        expect(seeds.surpriseTypes.length).toBeGreaterThanOrEqual(5);
        expect(seeds.encounterTypes.length).toBeGreaterThanOrEqual(5);
        expect(parseLocationsFromLore(chunks).map(l => l.name)).toEqual(expect.arrayContaining([
            'Tingen', 'Backlund', 'Loen Kingdom',
        ]));
        expect(parseFactionsFromLore(chunks).map(f => f.name)).toEqual(expect.arrayContaining([
            'Church of the Evernight Goddess',
            'Tarot Club',
        ]));
    });

    it('assigns distinct RAG groups to demo church, secret-org, and family factions', () => {
        const evernight = chunks.find(c => c.header.includes('Church of the Evernight Goddess'));
        const aurora = chunks.find(c => c.header.includes('Aurora Order'));
        const augustus = chunks.find(c => c.header.includes('House Augustus'));
        expect(evernight?.group).toMatch(/2a-orthodox-churches/);
        expect(aurora?.group).toMatch(/2b-secret-organizations/);
        expect(augustus?.group).toMatch(/2c-noble-angel-families/);
        expect(new Set([evernight?.group, aurora?.group, augustus?.group]).size).toBe(3);
    });

    it('loads demo_loot.json as a valid loot tree', () => {
        const loot = JSON.parse(readFileSync(resolve(LOTM_DIR, 'demo_loot.json'), 'utf-8'));
        expect(loadLootTree(loot)).not.toBeNull();
    });
});
