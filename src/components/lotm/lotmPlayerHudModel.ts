import type { CharacterProfile, InventoryItem, PlayerCharacter } from '../../types';
import {
    abilitiesForLotmSequence,
    formatLotmSequenceName,
    getLotmPathway,
    getLotmSequence,
    nextLotmSequence,
    resolveLotmPathway,
} from '../../worldpacks/lotmPathways';

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
};

export type LotmHudCarryItem = {
    id: string;
    name: string;
    qty: number;
    category: string;
    equipped: boolean;
};

export type LotmHudWorld = {
    inventory?: InventoryItem[];
    locationName?: string | null;
    locationFeature?: string | null;
    /** Explicit bounty line when a dedicated tracker exists. */
    bounty?: string | null;
};

export type LotmPlayerHudModel = {
    present: boolean;
    name: string;
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
    const coins = inventory.filter(item => item.category === 'currency' && item.name.trim());
    if (!coins.length) return '—';
    return coins.map(item => item.qty > 1 ? `${item.name} ×${item.qty}` : item.name).join(' · ');
}

function bountyLine(inventory: InventoryItem[], explicit?: string | null): string {
    if (explicit != null && explicit.trim()) return explicit.trim();
    const hit = inventory.find(item =>
        /bounty/i.test(item.name) || (item.keywords ?? []).some(k => /bounty/i.test(k))
    );
    if (!hit) return '—';
    return hit.qty > 1 ? `${hit.name} ×${hit.qty}` : hit.name;
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
    const nextInfo = getLotmSequence(pathway, nextSeq);
    const inventory = world?.inventory ?? [];

    return {
        present: Boolean(name || pathway),
        name: name || 'Unnamed',
        pathwayName: pathway?.name ?? '',
        sequenceLabel: formatLotmSequenceName(pathway?.id, sequence),
        sequenceNumber: sequence,
        emblemSrc: pathway?.emblemSrc ?? '',
        hp: toLotmHudMeter(profile?.hp),
        spirituality: toLotmHudMeter(profile?.mp),
        stats: resolveStats(profile, pc),
        abilities,
        next: nextInfo
            ? {
                sequenceLabel: formatLotmSequenceName(pathway?.id, nextSeq),
                abilities: abilitiesForLotmSequence(pathway?.id, nextSeq),
            }
            : null,
        location: locationLine(pc, world),
        currency: currencyLine(inventory),
        bounty: bountyLine(inventory, world?.bounty),
        items: carryItems(inventory, kit?.equipment),
    };
}
