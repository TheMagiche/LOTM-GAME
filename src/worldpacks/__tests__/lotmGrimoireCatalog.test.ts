import { describe, expect, it } from 'vitest';
import {
    LOTM_GRIMOIRE_CHURCHES,
    LOTM_GRIMOIRE_EPOCHS,
    LOTM_GRIMOIRE_PATHWAYS,
    LOTM_GRIMOIRE_VOLUMES,
    LOTM_GRIMOIRE_WORLD,
    churchSearchText,
    filterByGrimoireQuery,
    matchesGrimoireQuery,
    pathwaySearchText,
    volumeSearchText,
} from '../lotmGrimoireCatalog';

describe('LOTM grimoire catalog', () => {
    it('loads eight novel volumes from lotmdnd/assets/data/grimoire', () => {
        expect(LOTM_GRIMOIRE_VOLUMES).toHaveLength(8);
        expect(LOTM_GRIMOIRE_VOLUMES.map(v => v.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(LOTM_GRIMOIRE_VOLUMES[0]?.title).toBe('Clown');
        expect(LOTM_GRIMOIRE_VOLUMES[0]?.synopsis.length).toBeGreaterThan(40);
        expect(LOTM_GRIMOIRE_VOLUMES[0]?.events.length).toBeGreaterThan(5);
        expect(LOTM_GRIMOIRE_VOLUMES[7]?.title).toBe('The Fool');
    });

    it('loads the series epoch timeline', () => {
        expect(LOTM_GRIMOIRE_EPOCHS.length).toBeGreaterThanOrEqual(6);
        expect(LOTM_GRIMOIRE_EPOCHS.some(epoch => /pre-epoch/i.test(epoch.name))).toBe(true);
        expect(LOTM_GRIMOIRE_EPOCHS[0]?.events.length).toBeGreaterThan(0);
    });

    it('loads 22 pathway overviews without ability or potion formulas', () => {
        expect(LOTM_GRIMOIRE_PATHWAYS).toHaveLength(22);
        const fool = LOTM_GRIMOIRE_PATHWAYS.find(p => p.id === 'fool');
        expect(fool).toBeDefined();
        expect(fool?.name).toBe('Fool Pathway');
        expect(fool?.aliases).toEqual(expect.arrayContaining(['Seer Pathway']));
        expect(fool?.authority).toMatch(/Secrets and Changes/i);
        expect(fool?.description.length).toBeGreaterThan(40);
        expect(fool?.sequences.some(s => s.sequence === 9 && s.name === 'Seer')).toBe(true);
        expect(fool?.emblemSrc).toBeTruthy();
        expect(JSON.stringify(fool)).not.toMatch(/main_ingredients|potion_overview/);
    });

    it('loads orthodox churches and world flavor (not pricing)', () => {
        expect(LOTM_GRIMOIRE_CHURCHES).toHaveLength(11);
        expect(LOTM_GRIMOIRE_CHURCHES.some(c => /Evernight/i.test(c.name))).toBe(true);
        expect(LOTM_GRIMOIRE_CHURCHES.find(c => /Evernight/i.test(c.name))?.beyonderTeams)
            .toEqual(expect.arrayContaining(['Nighthawks']));

        expect(LOTM_GRIMOIRE_WORLD.geography.length).toBeGreaterThan(10);
        expect(LOTM_GRIMOIRE_WORLD.geography.some(e => e.name === 'Tingen')).toBe(true);
        expect(LOTM_GRIMOIRE_WORLD.languages.length).toBeGreaterThan(5);
        expect(LOTM_GRIMOIRE_WORLD.languages.some(e => /jotun/i.test(e.name))).toBe(true);
        expect(LOTM_GRIMOIRE_WORLD.creatures.length).toBeGreaterThan(20);
        expect(LOTM_GRIMOIRE_WORLD.food.length).toBeGreaterThan(20);
        expect(LOTM_GRIMOIRE_WORLD.currency.length).toBeGreaterThan(5);
        expect(LOTM_GRIMOIRE_WORLD.currency.some(e => /Loen/i.test(e.name))).toBe(true);
        expect(JSON.stringify(LOTM_GRIMOIRE_WORLD)).not.toMatch(/lotm_pricing/);
    });

    it('filters entries by multi-word search', () => {
        expect(matchesGrimoireQuery('Fool Pathway Seer', 'fool seer')).toBe(true);
        expect(matchesGrimoireQuery('Fool Pathway Seer', 'hunter')).toBe(false);

        const volumes = filterByGrimoireQuery(LOTM_GRIMOIRE_VOLUMES, 'clown', volumeSearchText);
        expect(volumes.map(v => v.title)).toContain('Clown');

        const pathways = filterByGrimoireQuery(LOTM_GRIMOIRE_PATHWAYS, 'evernight sleepless', pathwaySearchText);
        expect(pathways.some(p => p.id === 'darkness')).toBe(true);

        const churches = filterByGrimoireQuery(LOTM_GRIMOIRE_CHURCHES, 'nighthawks', churchSearchText);
        expect(churches.some(c => /Evernight/i.test(c.name))).toBe(true);
    });
});
