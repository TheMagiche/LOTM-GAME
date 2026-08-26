import { describe, expect, it } from 'vitest';
import {
    DEFAULT_PLAYABLE_PC_ID,
    LORD_OF_THE_MYSTERIES_PACK,
    LOTM_PLAYABLE_PCS,
    parsePlayablePc,
} from '../lordOfTheMysteries';
import { resolvePlayablePc } from '../../services/lotm/createLotmCampaign';

describe('LOTM playable PCs', () => {
    it('loads one Sequence 9 starter per pathway', () => {
        expect(LOTM_PLAYABLE_PCS).toHaveLength(22);
        const pathways = LOTM_PLAYABLE_PCS.map(pc => pc.pathway);
        expect(new Set(pathways).size).toBe(22);
        expect(LOTM_PLAYABLE_PCS.every(pc => pc.sequence === 9 && pc.name && pc.subtitle)).toBe(true);
        expect(LORD_OF_THE_MYSTERIES_PACK.playablePcs).toBe(LOTM_PLAYABLE_PCS);
    });

    it('defaults to Clara on the Fool pathway and supports interview (empty id)', () => {
        const clara = resolvePlayablePc(LORD_OF_THE_MYSTERIES_PACK);
        expect(clara?.name).toBe('Clara Whitlock');
        expect(clara?.signatureKit?.pathway).toBe('fool');
        expect(DEFAULT_PLAYABLE_PC_ID).toBe(clara?.id);

        expect(resolvePlayablePc(LORD_OF_THE_MYSTERIES_PACK, '')).toBeNull();

        const sailor = LOTM_PLAYABLE_PCS.find(pc => pc.pathway === 'tyrant');
        expect(sailor).toBeDefined();
        const resolved = resolvePlayablePc(LORD_OF_THE_MYSTERIES_PACK, sailor!.id);
        expect(resolved?.name).toBe(sailor!.name);
        expect(parsePlayablePc(sailor!.file.contents)?.name).toBe(sailor!.name);
    });
});
