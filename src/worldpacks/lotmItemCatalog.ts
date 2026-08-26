import catalogJson from '../../Example_Setup/World_compendium/Lord of the Mysteries/item_catalog.json?raw';
import type { ItemLedgerEntry } from '../types';
import { normalizeItemLedgerEntry } from '../types';

let cached: ItemLedgerEntry[] | null = null;

export function loadLotmItemCatalog(): ItemLedgerEntry[] {
    if (cached) return cached;
    try {
        const parsed = JSON.parse(catalogJson) as { items?: Partial<ItemLedgerEntry>[] };
        cached = (parsed.items ?? []).map(item => normalizeItemLedgerEntry({ ...item, source: 'catalog' }));
    } catch (e) {
        console.warn('[LotmItemCatalog] Failed to parse canon catalog:', e);
        cached = [];
    }
    return cached;
}
