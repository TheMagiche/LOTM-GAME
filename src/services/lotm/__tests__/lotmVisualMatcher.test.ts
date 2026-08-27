import { describe, expect, it } from 'vitest';
import {
    attachLotmPortraitsToNpcs,
    findTingenLocationId,
    inferSpeakerName,
    matchLotmBackdrop,
    matchLotmPortraitEntry,
    matchLotmPortraits,
    matchLotmVisuals,
} from '../lotmVisualMatcher';
import { LOTM_DEFAULT_BACKDROP } from '../../../worldpacks/lotmVisualManifest';

describe('lotmVisualMatcher', () => {
    it('maps Tingen aliases to the Tingen backdrop', () => {
        expect(matchLotmBackdrop('Tingen City')).toBe('image/backgrounds/tingen_city.webp');
        expect(matchLotmBackdrop('a walk past St. Selena Cathedral')).toBe('image/backgrounds/tingen_city.webp');
        expect(matchLotmBackdrop(null, null, 'the grey fog of Sefirah Castle')).toBe('image/backgrounds/sefirah_castle.webp');
    });

    it('keeps the current-location backdrop even when GM text names another place', () => {
        expect(matchLotmBackdrop('Tingen', '', 'Above the grey fog of Sefirah Castle'))
            .toBe('image/backgrounds/tingen_city.webp');
    });

    it('matches a place through its region when the local name is unknown', () => {
        const match = matchLotmVisuals({
            placeName: "Nero's Apartment",
            placeRegion: 'Tingen',
            latestGmText: 'Above the grey fog of Sefirah Castle',
        });
        expect(match.backdrop).toBe('image/backgrounds/tingen_city.webp');
    });

    it('falls back to Tingen when nothing matches', () => {
        expect(matchLotmBackdrop('a nameless alley')).toBe(LOTM_DEFAULT_BACKDROP);
    });

    it('finds Dunn and hides Amon without spoilers', () => {
        expect(matchLotmPortraitEntry('Dunn Smith', false)?.portrait).toContain('dunn_smith');
        expect(matchLotmPortraitEntry('Amon', false)).toBeNull();
        expect(matchLotmPortraitEntry('Amon', true)?.portrait).toContain('amon');
    });

    it('stages portraits from on-stage ids and GM text', () => {
        const hits = matchLotmPortraits({
            latestGmText: 'Leonard Mitchell leaned in the doorway.',
            npcLedger: [
                { id: 'n1', name: 'Dunn Smith', aliases: '', portrait: '' } as never,
                { id: 'n2', name: 'Audrey Hall', aliases: '', portrait: '/assets/lotm/image/characters/audrey_hall.webp' } as never,
            ],
            onStageNpcIds: ['n1'],
            spoilers: false,
        });
        expect(hits.map(h => h.name)).toEqual(expect.arrayContaining(['Dunn Smith', 'Leonard Mitchell']));
        expect(hits.length).toBeLessThanOrEqual(3);
    });

    it('attaches portrait URLs onto lore NPCs that match the manifest', () => {
        const [dunn, stranger] = attachLotmPortraitsToNpcs([
            { name: 'Dunn Smith', portrait: '' },
            { name: 'Mrs. Pegg', portrait: '' },
        ]);
        expect(dunn.portrait).toBe('/assets/lotm/image/characters/dunn_smith.webp');
        expect(stranger.portrait).toBe('');
    });

    it('finds Tingen in a location ledger', () => {
        expect(findTingenLocationId([
            { id: 'loc_1', name: 'Backlund', aliases: '', broadLocation: 'Loen Kingdom' } as never,
            { id: 'loc_2', name: 'Tingen', aliases: 'university city', broadLocation: 'Loen Kingdom' } as never,
        ])).toBe('loc_2');
    });

    it('infers a speaker nameplate from bracketed names', () => {
        expect(inferSpeakerName('[**Dunn**] sighed.', [])).toBe('Dunn');
        expect(inferSpeakerName('Fog rolled in.', [])).toBe('Narration');
    });

    it('returns a combined visual match', () => {
        const match = matchLotmVisuals({
            placeName: 'Tingen',
            latestGmText: '[Dunn] poured two cups of coffee.',
            npcLedger: [{ id: 'n1', name: 'Dunn Smith', aliases: 'Dunn' } as never],
            onStageNpcIds: ['n1'],
        });
        expect(match.backdrop).toContain('tingen');
        expect(match.portraits.length).toBeGreaterThan(0);
        expect(match.speakerName).toBe('Dunn');
    });

    it('maps Eternal Blazing Sun / The Sun God to Aucuses, not Derrick', () => {
        expect(matchLotmPortraitEntry('The Eternal Blazing Sun', false)?.id).toBe('eternal-blazing-sun');
        expect(matchLotmPortraitEntry('The Sun God', false)?.id).toBe('eternal-blazing-sun');
        expect(matchLotmPortraitEntry('The Sun God', false)?.portrait).toContain('aucuses');
        expect(matchLotmPortraitEntry('The', false)).toBeNull();
    });

    it('does not stage a portrait from the English word "the"', () => {
        const hits = matchLotmPortraits({
            latestGmText: 'The tavern door opened and the rain came in.',
            npcLedger: [{
                id: 'n1',
                name: 'The Eternal Blazing Sun',
                aliases: 'The Sun God',
                portrait: '/assets/lotm/image/characters/derrick_berg.webp',
            } as never],
        });
        expect(hits.map(h => h.name).join(' ')).not.toMatch(/eternal|sun god|derrick/i);
    });

    it('prefers the Sun God over Derrick when the longer title is used', () => {
        const hits = matchLotmPortraits({
            latestGmText: 'A hymn to the Sun God rolled through the cathedral.',
        });
        expect(hits.some(h => h.src.includes('aucuses'))).toBe(true);
        expect(hits.some(h => h.src.includes('derrick'))).toBe(false);
    });

    it('rewrites a wrong auto-attached LOTM portrait onto the Sun God', () => {
        const [sun] = attachLotmPortraitsToNpcs([{
            name: 'The Eternal Blazing Sun',
            aliases: 'The Sun God',
            portrait: '/assets/lotm/image/characters/derrick_berg.webp',
        }], false, 'correct');
        expect(sun.portrait).toContain('aucuses');
        expect(sun.portrait).not.toContain('derrick');
    });

    it('does not refill a cleared portrait in correct mode', () => {
        const [sun] = attachLotmPortraitsToNpcs([{
            name: 'The Eternal Blazing Sun',
            aliases: 'The Sun God',
            portrait: '',
        }], false, 'correct');
        expect(sun.portrait).toBe('');
    });
});
