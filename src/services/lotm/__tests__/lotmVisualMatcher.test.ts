import { describe, expect, it } from 'vitest';
import {
    attachLotmPortraitsToNpcs,
    findTingenLocationId,
    inferSpeakerName,
    matchLotmBackdrop,
    matchLotmCgEcho,
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

    it('does not echo CGs from place name or on-stage cast alone', () => {
        expect(matchLotmCgEcho({ placeName: 'Tingen' })).toBeNull();
        expect(matchLotmCgEcho({
            placeName: 'Tingen',
            npcLedger: [{ id: 'n1', name: 'Dunn Smith', aliases: 'Dunn' } as never],
            onStageNpcIds: ['n1'],
        })).toBeNull();
    });

    it('does not echo spoiler CGs unless the flag is on', () => {
        const safe = matchLotmCgEcho({ placeName: 'Tingen', latestGmText: 'The Nighthawks chantry' });
        expect(safe?.id).toBe('tingen-nighthawks');
        const fog = matchLotmCgEcho({ latestGmText: 'Above the grey fog of Sefirah' }, new Set());
        expect(fog).toBeNull();
        const spoiler = matchLotmCgEcho({ latestGmText: 'Sefirah Castle', spoilers: true });
        expect(spoiler?.tag).toBe('spoiler');
    });

    it('respects dismissed CG paths', () => {
        const echo = matchLotmCgEcho(
            { placeName: 'Tingen', latestGmText: 'nighthawks' },
            new Set(['image/vol_1/Miscellaneous/nighthawks.webp']),
        );
        expect(echo).toBeNull();
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
});
