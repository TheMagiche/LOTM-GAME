import type { InventoryItem, LootItem } from '../../types';
import { normalizeInventoryItem } from '../../types';
import { HUNT_BOUNTY_KEYWORD, LOTM_CURRENCY_NAMES } from '../../worldpacks/lotmPurse';

const CURRENCY_DROP = /^(\d+)\s+(pence|soli|gold pounds?)$/i;

export type LootInventoryDelta = InventoryItem;

function currencyFromLabel(label: string): InventoryItem | null {
    const match = label.trim().match(CURRENCY_DROP);
    if (!match) return null;
    const qty = parseInt(match[1], 10);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const rawUnit = match[2].toLowerCase();
    const unit = rawUnit.startsWith('gold pound') || rawUnit === 'pounds' || rawUnit === 'pound'
        ? 'pounds'
        : rawUnit === 'soli'
            ? 'soli'
            : 'pence';
    return normalizeInventoryItem({
        id: `loot_purse_${unit}_${qty}`,
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

function huntPosterFromLabel(label: string): InventoryItem | null {
    const text = label.trim();
    if (!/^BOUNTY:/i.test(text)) return null;
    return normalizeInventoryItem({
        id: `loot_hunt_${Math.random().toString(36).slice(2, 8)}`,
        name: text,
        qty: 1,
        category: 'key',
        keywords: [HUNT_BOUNTY_KEYWORD, 'bounty', 'hunt'],
        equipped: false,
        lastUsedScene: '000',
        importance: 6,
        notes: 'Hunt contract from the church boards — not a bounty on the PC.',
        locationTag: 'inventory',
    });
}

export function inventoryDeltaFromLootLabel(label: string): InventoryItem | null {
    const trimmed = label.trim();
    if (!trimmed) return null;
    return currencyFromLabel(trimmed) ?? huntPosterFromLabel(trimmed);
}

function mergeItem(existing: InventoryItem[], incoming: InventoryItem): void {
    const hit = existing.find(
        item => item.name.toLowerCase() === incoming.name.toLowerCase()
            && (item.locationTag || 'inventory') === (incoming.locationTag || 'inventory'),
    );
    if (hit) {
        hit.qty += incoming.qty || 1;
        return;
    }
    existing.push(incoming);
}

/** Apply currency drops and hunt posters into the live inventory. Other loot stays narration-only. */
export function mergeLootIntoInventory(
    current: InventoryItem[],
    lootItems: LootItem[],
): InventoryItem[] {
    const next = current.map(item => ({ ...item }));
    let changed = false;
    for (const loot of lootItems) {
        const delta = inventoryDeltaFromLootLabel(loot.label);
        if (!delta) continue;
        mergeItem(next, delta);
        changed = true;
    }
    return changed ? next : current;
}
