import type { ItemLedgerEntry } from '../../types';

function normalizeKey(value: string): string {
    return value.trim().toLowerCase();
}

function keysOf(item: ItemLedgerEntry): string[] {
    return [
        item.name,
        item.code,
        ...item.aliases.split(/[,;/]/),
    ].map(normalizeKey).filter(Boolean);
}

export function resolveItem(name: string, ledger: ItemLedgerEntry[]): ItemLedgerEntry | undefined {
    const target = normalizeKey(name);
    if (!target) return undefined;
    return ledger.find(item => keysOf(item).includes(target));
}
