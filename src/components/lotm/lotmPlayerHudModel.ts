import type { CharacterProfile, InventoryItem, PlayerCharacter } from '../../types';
import { formatLotmBountyLine, formatLotmPurseLine } from '../../worldpacks/lotmPurse';
import {
    abilitiesForLotmSequence,
    formatLotmSequenceName,
    getLotmPathway,
    getLotmSequence,
    nextLotmSequence,
    resolveLotmPathway,
} from '../../worldpacks/lotmPathways';
import {
    LOC_STAGE_LABELS,
    formatSequenceAdvantageLine,
    readDigestion,
    readLossOfControl,
    resolveSequenceAdvantage,
    type LossOfControlStage,
    type SequenceAdvantageResult,
} from '../../worldpacks/lotmBeyonderState';
import { inventoryBadgeFor } from '../../worldpacks/lotmItemKinds';

export type LotmHudMeter = {
    current: number;
    max: number;
    pct: number;
};

export type LotmHudStat = {
    label: string;
    value: number;
};

export type LotmHudNextSequence = {
    sequenceLabel: string;
    abilities: string[];
    potionSrc: string;
    formula: string;
};

export type LotmHudCarryItem = {
    id: string;
    name: string;
    qty: number;
    category: string;
    equipped: boolean;
    badge?: string | null;
};

export type LotmHudWorld = {
    inventory?: InventoryItem[];
    locationName?: string | null;
    locationFeature?: string | null;
    /** Wanted bounty on the PC. Hunt posters never belong here. */
    bounty?: string | null;
    opponents?: Array<{ signatureKit?: { sequence?: number }; archived?: boolean; isPC?: boolean }>;
};

export type LotmPlayerHudModel = {
    present: boolean;
    name: string;
    pathwayId: string;
    pathwayName: string;
    sequenceLabel: string;
    sequenceNumber: number | undefined;
    emblemSrc: string;
    hp: LotmHudMeter | null;
    spirituality: LotmHudMeter | null;
    stats: LotmHudStat[];
    abilities: string[];
    next: LotmHudNextSequence | null;
    location: string;
    currency: string;
    bounty: string;
    items: LotmHudCarryItem[];
    digestion: number;
    locStage: LossOfControlStage;
    locLabel: string;
    sequenceBand: SequenceAdvantageResult | null;
    sequenceBandLine: string;
    actingMethod: string;
    formula: string;
    potionSrc: string;
    canDrink: boolean;
};

const PREFERRED_STATS = ['Spirituality', 'Physique', 'Reasoning'] as const;

export function toLotmHudMeter(pair?: { current: number; max: number } | null): LotmHudMeter | null {
    if (!pair) return null;
    const max = Number(pair.max);
    const current = Number(pair.current);
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(current)) return null;
    const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)));
    return { current, max, pct };
}

function list(values: string[] | undefined): string[] {
    return (values ?? []).map(v => v.trim()).filter(Boolean);
}

function resolveStats(
    profile: CharacterProfile | null | undefined,
    pc: PlayerCharacter | null | undefined,
): LotmHudStat[] {
    const record = profile?.stats ?? pc?.pcMeta?.stats ?? {};
    const out: LotmHudStat[] = [];
    const seen = new Set<string>();
    for (const preferred of PREFERRED_STATS) {
        const match = Object.entries(record).find(([key]) => key.toLowerCase() === preferred.toLowerCase());
        if (!match || !Number.isFinite(match[1])) continue;
        out.push({ label: match[0], value: match[1] });
        seen.add(match[0].toLowerCase());
    }
    for (const [label, value] of Object.entries(record)) {
        if (seen.has(label.toLowerCase()) || !Number.isFinite(value)) continue;
        out.push({ label, value });
    }
    return out;
}

function currencyLine(inventory: InventoryItem[]): string {
    return formatLotmPurseLine(inventory) || '—';
}

function bountyLine(explicit?: string | null): string {
    return formatLotmBountyLine(explicit) || '—';
}

function locationLine(
    pc: PlayerCharacter | null | undefined,
    world: LotmHudWorld | undefined,
): string {
    const parts = [
        world?.locationName,
        world?.locationFeature,
        !world?.locationName ? pc?.region : undefined,
    ].map(part => (part ?? '').trim()).filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
}

function carryItems(
    inventory: InventoryItem[],
    kitEquipment: string[] | undefined,
): LotmHudCarryItem[] {
    if (inventory.length) {
        return inventory
            .filter(item => item.name.trim())
            .map(item => ({
                id: item.id,
                name: item.name.trim(),
                qty: Number.isFinite(item.qty) ? item.qty : 1,
                category: item.category,
                equipped: Boolean(item.equipped),
                badge: inventoryBadgeFor(item),
            }));
    }
    return list(kitEquipment).map((name, index) => ({
        id: `kit-${index}`,
        name,
        qty: 1,
        category: 'misc',
        equipped: false,
    }));
}

/**
 * Snapshot of the play-view HUD. Identity comes from the PC row; meters and
 * the acting sheet come from `characterProfileData` so HP/abilities update
 * when the engine scans the chronicle. Inventory/location/bounty ride in
 * `world` so they can stay unwired without hiding the rest of the panel.
 */
export function buildLotmPlayerHudModel(
    pc: PlayerCharacter | null | undefined,
    profile: CharacterProfile | null | undefined,
    world?: LotmHudWorld,
): LotmPlayerHudModel {
    const kit = pc?.signatureKit;
    const pathway = getLotmPathway(kit?.pathway)
        ?? resolveLotmPathway(kit?.pathway)
        ?? resolveLotmPathway(profile?.class)
        ?? resolveLotmPathway(kit?.element);
    const sequence = typeof kit?.sequence === 'number'
        ? kit.sequence
        : (typeof profile?.level === 'number' && Number.isFinite(profile.level) ? profile.level : undefined);
    const name = (pc?.name || profile?.name || '').trim();
    const fromProfile = list(profile?.abilities);
    const fromKit = list(kit?.abilities);
    const fromCatalog = abilitiesForLotmSequence(pathway?.id, sequence);
    const abilities = fromProfile.length ? fromProfile : (fromKit.length ? fromKit : fromCatalog);
    const nextSeq = nextLotmSequence(sequence);
    const seqInfo = getLotmSequence(pathway, sequence);
    const nextInfo = getLotmSequence(pathway, nextSeq);
    const inventory = world?.inventory ?? [];
    const digestion = readDigestion(pc);
    const locStage = readLossOfControl(pc);
    const sequenceBand = resolveSequenceAdvantage(pc, profile ?? undefined, world?.opponents);
    const actingMethod = (seqInfo?.actingMethod || (profile?.skills ?? []).join('; ')).trim();
    const formula = seqInfo?.formula?.main.length ? seqInfo.formula.main.join('; ') : '';

    return {
        present: Boolean(name || pathway),
        name: name || 'Unnamed',
        pathwayId: pathway?.id ?? '',
        pathwayName: pathway?.name ?? '',
        sequenceLabel: formatLotmSequenceName(pathway?.id, sequence),
        sequenceNumber: sequence,
        emblemSrc: pathway?.emblemSrc ?? '',
        hp: null,
        spirituality: toLotmHudMeter(profile?.mp),
        stats: resolveStats(profile, pc),
        abilities,
        next: nextInfo
            ? {
                sequenceLabel: formatLotmSequenceName(pathway?.id, nextSeq),
                abilities: abilitiesForLotmSequence(pathway?.id, nextSeq),
                potionSrc: nextInfo.potionSrc ?? '',
                formula: nextInfo.formula?.main.length ? nextInfo.formula.main.join('; ') : '',
            }
            : null,
        location: locationLine(pc, world),
        currency: currencyLine(inventory),
        bounty: bountyLine(world?.bounty),
        items: carryItems(inventory, kit?.equipment),
        digestion,
        locStage,
        locLabel: LOC_STAGE_LABELS[locStage],
        sequenceBand,
        sequenceBandLine: formatSequenceAdvantageLine(sequenceBand),
        actingMethod,
        formula,
        potionSrc: seqInfo?.potionSrc ?? '',
        canDrink: digestion >= 100 && Boolean(nextInfo),
    };
}
