import compiledCatalogJson from '../../mechanics/World_compendium/Lord of the Mysteries/item_catalog.json';
import type { ItemLedgerEntry } from '../types';
import { normalizeItemLedgerEntry } from '../types';

type CompiledCatalog = { items?: unknown[] };

let cached: ItemLedgerEntry[] | null = null;

export function loadLotmItemCatalog(): ItemLedgerEntry[] {
    if (cached) return cached;
    try {
        const items = (compiledCatalogJson as CompiledCatalog)?.items;
        if (!Array.isArray(items) || items.length === 0) {
            cached = [];
            return cached;
        }
        cached = items.map(row => normalizeItemLedgerEntry(row as ItemLedgerEntry));
    } catch (e) {
        console.warn('[LotmItemCatalog] Failed to load compiled item catalog:', e);
        cached = [];
    }
    return cached;
}
