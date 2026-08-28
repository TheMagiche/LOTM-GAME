import type { InventoryItem, PlayerCharacter } from '../types';
import { normalizeInventoryItem } from '../types';

export type LotmPurse = {
    pounds?: number;
    soli?: number;
    pence?: number;
};

export type LotmBounty = {
    amountPounds?: number;
    issuer?: string;
    status?: 'none' | 'active' | 'removed';
};

/** Sequence 9 civilian default: under one pound. One pound feeds a laborer's family for a week. */
export const DEFAULT_LOTM_PURSE: LotmPurse = { soli: 10 };

export const LOTM_CURRENCY_NAMES = {
    pounds: 'Loen gold pound',
    soli: 'soli',
    pence: 'pence',
} as const;

export const HUNT_BOUNTY_KEYWORD = 'hunt-bounty';

const UNIT_ORDER = ['pounds', 'soli', 'pence'] as const;

function finiteQty(n: number | undefined): number {
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function looksLikeCurrencyName(name: string): boolean {
    const lower = name.toLowerCase();
    return /\b(pence|soli|pounds?)\b/.test(lower)
        || /gold\s*pounds?/.test(lower)
        || /loen gold pound/.test(lower)
        || /\b(verl d['']or|coppet|gold hoern|risot)\b/.test(lower);
}

function unitForCurrencyName(name: string): (typeof UNIT_ORDER)[number] | null {
    const lower = name.toLowerCase();
    if (/gold\s*pound|\bpounds?\b/.test(lower) && !/\bpence\b/.test(lower)) return 'pounds';
    if (/\bsoli\b/.test(lower)) return 'soli';
    if (/\bpence\b/.test(lower)) return 'pence';
    return null;
}

function currencyItem(unit: (typeof UNIT_ORDER)[number], qty: number): InventoryItem {
    return normalizeInventoryItem({
        id: `pc_purse_${unit}`,
        name: LOTM_CURRENCY_NAMES[unit],
        qty,
        category: 'currency',
        keywords: [unit, 'currency', 'loen'],
        equipped: false,
        lastUsedScene: '000',
        importance: 4,
        notes: '',
        locationTag: 'inventory',
    });
}

export function purseToInventoryItems(purse: LotmPurse | null | undefined): InventoryItem[] {
    const src = purse ?? DEFAULT_LOTM_PURSE;
    const out: InventoryItem[] = [];
    const pounds = finiteQty(src.pounds);
    const soli = finiteQty(src.soli);
    const pence = finiteQty(src.pence);
    if (pounds) out.push(currencyItem('pounds', pounds));
    if (soli) out.push(currencyItem('soli', soli));
    if (pence) out.push(currencyItem('pence', pence));
    return out;
}

export function defaultPurseForPc(pc: PlayerCharacter | null | undefined): LotmPurse {
    const authored = pc?.pcMeta?.purse;
    if (authored && (finiteQty(authored.pounds) || finiteQty(authored.soli) || finiteQty(authored.pence))) {
        return authored;
    }
    return DEFAULT_LOTM_PURSE;
}

export function formatLotmPurseLine(items: InventoryItem[]): string {
    const totals: Record<(typeof UNIT_ORDER)[number], number> = { pounds: 0, soli: 0, pence: 0 };
    let other: string[] = [];
    for (const item of items) {
        if (item.category !== 'currency' || !item.name.trim()) continue;
        const unit = unitForCurrencyName(item.name);
        const qty = Number.isFinite(item.qty) ? item.qty : 1;
        if (unit) totals[unit] += qty;
        else other.push(qty > 1 ? `${item.name} ×${qty}` : item.name);
    }
    const loen: string[] = [];
    if (totals.pounds) loen.push(totals.pounds === 1 ? '1 pound' : `${totals.pounds} pounds`);
    if (totals.soli) loen.push(`${totals.soli} soli`);
    if (totals.pence) loen.push(`${totals.pence} pence`);
    const parts = [...loen, ...other];
    return parts.length ? parts.join(' · ') : '';
}

export function formatLotmBountyLine(
    bounty?: LotmBounty | string | null,
): string {
    if (bounty == null) return '';
    if (typeof bounty === 'string') return bounty.trim();
    if (bounty.status === 'none') return '';
    if (bounty.status === 'removed') return 'lifted';
    const amount = finiteQty(bounty.amountPounds);
    const issuer = (bounty.issuer ?? '').trim();
    if (!amount && !issuer) return '';
    if (issuer && amount) return `${issuer} — ${amount} pounds`;
    if (amount) return `${amount} pounds`;
    return issuer;
}

function kitItems(pc: PlayerCharacter): InventoryItem[] {
    return (pc.signatureKit?.equipment ?? [])
        .map(name => name.trim())
        .filter(Boolean)
        .map((name, index) => normalizeInventoryItem({
            id: `pc_kit_${index}`,
            name,
            qty: 1,
            category: looksLikeCurrencyName(name) ? 'currency' : 'misc',
            keywords: name.toLowerCase().split(/\s+/).filter(w => w.length > 2),
            equipped: false,
            lastUsedScene: '000',
            importance: 5,
            notes: '',
            locationTag: 'inventory',
        }));
}

/** Kit equipment plus purse coins. Used when attaching a PC to an empty inventory. */
export function kitAndPurseInventory(pc: PlayerCharacter): InventoryItem[] {
    const kit = kitItems(pc);
    const purse = purseToInventoryItems(defaultPurseForPc(pc));
    const hasCurrency = kit.some(item => item.category === 'currency');
    return hasCurrency ? kit : [...kit, ...purse];
}

/**
 * Seed kit + purse only when the campaign inventory is still empty.
 * Returns the existing list unchanged when it already has rows.
 */
export function seedInventoryIfEmpty(
    existing: InventoryItem[] | null | undefined,
    pc: PlayerCharacter | null | undefined,
): InventoryItem[] {
    if (existing && existing.length > 0) return existing;
    if (!pc) return existing ?? [];
    return kitAndPurseInventory(pc);
}
