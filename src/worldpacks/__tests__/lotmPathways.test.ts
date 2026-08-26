import { describe, expect, it } from 'vitest';
import {
    LOTM_PATHWAYS,
    abilitiesForLotmSequence,
    applyLotmPathwayToNpc,
    formatLotmPathwayLabel,
    formatLotmSequenceName,
    formatLotmTarotKicker,
    getLotmPathway,
    lookupCanonPathway,
    lotmChronicleName,
    lotmTarotOrder,
    nextLotmSequence,
    resolveLotmPathway,
} from '../lotmPathways';

describe('LOTM pathway catalog', () => {
    it('loads all 22 pathways from lotmdnd/assets/data', () => {
        expect(LOTM_PATHWAYS).toHaveLength(22);
        expect(getLotmPathway('fool')).toBeDefined();
        expect(getLotmPathway('darkness')).toBeDefined();
        expect(getLotmPathway('error')).toBeDefined();
        expect(getLotmPathway('door')).toBeDefined();
        expect(getLotmPathway('justiciar')).toBeDefined();
    });

    it('resolves pathway names, aliases, and Sequence potion names', () => {
        expect(resolveLotmPathway('Fool')?.id).toBe('fool');
        expect(resolveLotmPathway('Seer')?.id).toBe('fool');
        expect(resolveLotmPathway('Spectator')?.id).toBe('visionary');
        expect(resolveLotmPathway('Sleepless')?.id).toBe('darkness');
        expect(resolveLotmPathway('Error Pathway')?.id).toBe('error');
    });

    it('lists Sequence abilities for leveling (9 → 0)', () => {
        const seer = abilitiesForLotmSequence('fool', 9);
        expect(seer).toEqual(expect.arrayContaining(['Enhanced Memory', 'Spirit Vision']));
        const clown = abilitiesForLotmSequence('fool', 8);
        expect(clown.length).toBeGreaterThan(0);
        expect(clown).not.toEqual(seer);
        expect(nextLotmSequence(9)).toBe(8);
        expect(nextLotmSequence(1)).toBe(0);
        expect(nextLotmSequence(0)).toBeUndefined();
        expect(formatLotmPathwayLabel('fool', 9)).toMatch(/Seq 9 Seer/);
        expect(formatLotmSequenceName('fool', 9)).toBe('Sequence 9 · Seer');
        expect(lotmChronicleName('Clara Whitlock', 'fool')).toBe('Clara Whitlock — Fool Pathway');
        expect(formatLotmTarotKicker(getLotmPathway('fool'))).toMatch(/The Fool/);
        expect(lotmTarotOrder(getLotmPathway('fool'))).toBe(0);
    });

    it('attaches a pathway emblem and tarot card to every pathway', () => {
        expect(LOTM_PATHWAYS.every(p => p.emblemPath.endsWith('_Symbol2.webp'))).toBe(true);
        expect(LOTM_PATHWAYS.every(p => p.tarotCard.length > 0)).toBe(true);
        expect(getLotmPathway('fool')?.emblemPath).toContain('fool_pathway');
        expect(getLotmPathway('fool')?.emblemSrc).toBeTruthy();
        expect(getLotmPathway('wheel_of_fortune')?.emblemPath).toContain('Wheel_of_Fortune_Symbol2.webp');
        expect(resolveLotmPathway('hunter')?.id).toBe('red_priest');
        expect(getLotmPathway('paragon')?.tarotCard).toBe('The High Priestess');
        expect(lotmTarotOrder(getLotmPathway('paragon'))).toBe(2);
        expect(getLotmPathway('door')?.tarotCard).toBe('The Magician');
    });

    it('assigns distinct canon pathways to Clara vs the Tingen / Tarot roster', () => {
        expect(lookupCanonPathway('Clara Whitlock')).toEqual({ pathway: 'fool', sequence: 9 });
        expect(lookupCanonPathway('Dunn Smith')).toEqual({ pathway: 'darkness', sequence: 7 });
        expect(lookupCanonPathway('Amon')).toEqual({ pathway: 'error', sequence: 1 });
        expect(lookupCanonPathway('Fors Wall')).toEqual({ pathway: 'door', sequence: 9 });

        const dunn = applyLotmPathwayToNpc({ name: 'Dunn Smith', aliases: 'Captain Smith', signatureKit: undefined });
        expect(dunn.signatureKit?.pathway).toBe('darkness');
        expect(dunn.signatureKit?.sequence).toBe(7);
        expect(dunn.signatureKit?.abilities.length).toBeGreaterThan(0);

        const clara = applyLotmPathwayToNpc({ name: 'Clara Whitlock', aliases: '', signatureKit: undefined });
        expect(clara.signatureKit?.pathway).toBe('fool');
        expect(clara.signatureKit?.pathway).not.toBe(dunn.signatureKit?.pathway);
    });
});
