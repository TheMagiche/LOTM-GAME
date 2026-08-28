import type { CharacterProfile, PlayerCharacter } from '../types';
import {
    formatLotmSequenceName,
    getLotmPathway,
    getLotmSequence,
    resolveLotmPathway,
} from './lotmPathways';

export type LossOfControlStage = 0 | 1 | 2 | 3;

export const LOC_STAGE_LABELS: Record<LossOfControlStage, string> = {
    0: 'stable',
    1: 'tells',
    2: 'slippage',
    3: 'rampage',
};

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

export function readSpirituality(profile: CharacterProfile | undefined, pc: PlayerCharacter | null | undefined): { current: number; max: number } | null {
    const fromProfile = profile?.mp;
    const fromMeta = pc?.pcMeta?.spirituality;
    const pair = fromProfile ?? fromMeta;
    if (!pair) return null;
    const max = Number(pair.max);
    const current = Number(pair.current);
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(current)) return null;
    return { current, max };
}

export function applySpiritualityDelta(
    profile: CharacterProfile,
    delta: number,
): CharacterProfile {
    const current = Number(profile.mp?.current);
    const max = Number(profile.mp?.max);
    if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return profile;
    return {
        ...profile,
        mp: { current: clamp(current + delta, 0, max), max },
    };
}

export function readDigestion(pc: PlayerCharacter | null | undefined): number {
    const n = Number(pc?.pcMeta?.digestion);
    return Number.isFinite(n) ? clamp(n, 0, 100) : 0;
}

export function readLossOfControl(pc: PlayerCharacter | null | undefined): LossOfControlStage {
    const n = Number(pc?.pcMeta?.lossOfControl);
    if (n === 1 || n === 2 || n === 3) return n;
    return 0;
}

export function bumpLossOfControl(pc: PlayerCharacter, to: LossOfControlStage): PlayerCharacter {
    return {
        ...pc,
        pcMeta: { ...pc.pcMeta, lossOfControl: to },
    };
}

export type SequenceAdvantageBand = 'Advantage' | 'Normal' | 'Disadvantage';

type SequenceOpponent = { signatureKit?: { sequence?: number }; archived?: boolean; isPC?: boolean };

/**
 * Engine-owned Sequence-as-Advantage. Lower Sequence number is stronger.
 * Mundane opposition (no Sequence) is Advantage; spiritually spent or LoC 2+
 * is Disadvantage. The fairness pool is collapsed to this band so the GM
 * cannot cherry-pick.
 */
export function resolveSequenceAdvantage(
    pc: PlayerCharacter | null | undefined,
    profile: CharacterProfile | undefined,
    opponents: SequenceOpponent[] | undefined,
): { band: SequenceAdvantageBand; reason: string } | null {
    const hasPathway = Boolean(pc?.signatureKit?.pathway);
    const sequence = typeof pc?.signatureKit?.sequence === 'number'
        ? pc.signatureKit.sequence
        : (hasPathway ? Number(profile?.level) : NaN);
    if (!Number.isFinite(sequence)) return null;

    const spi = readSpirituality(profile, pc);
    const loc = readLossOfControl(pc);
    if (spi && spi.current <= 0) {
        return { band: 'Disadvantage', reason: `Seq ${sequence} spiritually spent — ordinary flesh` };
    }
    if (loc >= 2) {
        return { band: 'Disadvantage', reason: `Seq ${sequence} Loss of Control (${LOC_STAGE_LABELS[loc]})` };
    }

    const beyonderSeqs = (opponents ?? [])
        .filter(o => !o.archived && !o.isPC)
        .map(o => o.signatureKit?.sequence)
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

    if (beyonderSeqs.length === 0) {
        return { band: 'Advantage', reason: `Seq ${sequence} vs mundanes` };
    }

    const strongest = Math.min(...beyonderSeqs);
    if (sequence < strongest) return { band: 'Advantage', reason: `Seq ${sequence} vs Seq ${strongest}` };
    if (sequence > strongest) return { band: 'Disadvantage', reason: `Seq ${sequence} vs Seq ${strongest}` };
    return { band: 'Normal', reason: `Seq ${sequence} vs Seq ${strongest}` };
}

const LEGACY_POOL_RE = /([A-Z]+)=\(Disadvantage: ([^,]+), Normal: ([^,]+), Advantage: ([^)]+)\)/g;

/** Collapse a 3-band fairness pool to the engine-chosen Sequence band. */
export function applySequenceAdvantageToDiceOutcomes(block: string, band: SequenceAdvantageBand): string {
    if (!block) return block;
    return block.replace(LEGACY_POOL_RE, (_m, cat: string, disadv: string, normal: string, adv: string) => {
        const pick = band === 'Disadvantage' ? disadv.trim() : band === 'Normal' ? normal.trim() : adv.trim();
        return `${cat}=(${band}: ${pick})`;
    });
}

/**
 * Engine-owned Beyonder block. Sequence-as-Advantage is applied to the dice
 * pool in the turn stage; this block restates the trackers the GM must narrate.
 */
export function formatLotmBeyonderEngineBlock(
    pc: PlayerCharacter | null | undefined,
    profile: CharacterProfile | undefined,
): string {
    const kit = pc?.signatureKit;
    const pathway = getLotmPathway(kit?.pathway) ?? resolveLotmPathway(kit?.pathway) ?? resolveLotmPathway(profile?.class);
    if (!pathway && !kit?.pathway) return '';
    const sequence = typeof kit?.sequence === 'number' ? kit.sequence : Number(profile?.level);
    const seqInfo = getLotmSequence(pathway, Number.isFinite(sequence) ? sequence : undefined);
    const spi = readSpirituality(profile, pc);
    const digestion = readDigestion(pc);
    const loc = readLossOfControl(pc);
    const acting = seqInfo?.actingMethod || (profile?.skills ?? []).join('; ');

    const lines: string[] = [];
    if (Number.isFinite(sequence)) {
        lines.push(`SEQUENCE: ${formatLotmSequenceName(pathway?.id, sequence) || `Sequence ${sequence}`}`);
        lines.push('SEQUENCE AS TIER: engine-owned — use the [SEQUENCE AS TIER] band already applied to DICE OUTCOMES. Do not invent or swap the band.');
    }
    if (spi) {
        lines.push(`SPIRITUALITY: ${spi.current}/${spi.max}${spi.current <= 0 ? ' — spent; they are ordinary flesh with secrets until they rest or meditate' : ''}`);
    }
    if (acting) lines.push(`ACTING METHOD: ${acting}`);
    lines.push(`DIGESTION: ${digestion}% — advancement stalls until the Acting Method is lived; do not promote Sequence while this is below 100.`);
    lines.push(`LOSS OF CONTROL: ${LOC_STAGE_LABELS[loc]}${loc === 3 ? ' — church kill teams arrive; there is no talking down a rampage' : loc === 2 ? ' — partial transformation, powers firing unbidden' : loc === 1 ? ' — altered appetite, whispers, colours wrong' : ''}`);
    const nextSeq = typeof sequence === 'number' && sequence > 0 ? sequence - 1 : undefined;
    const nextInfo = getLotmSequence(pathway, nextSeq);
    if (nextInfo?.formula?.main.length) {
        lines.push(`NEXT FORMULA (Seq ${nextSeq} ${nextInfo.name}): main ${nextInfo.formula.main.join('; ')}`);
    }
    return `[BEYONDER]\n${lines.join('\n')}`;
}
