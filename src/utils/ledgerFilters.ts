import type { NPCEntry, LocationEntry, FactionEntry, ItemLedgerEntry, ItemLedgerKind, ItemLedgerGrade } from '../types';
import { ITEM_GRADE_LABELS, ITEM_KIND_LABELS } from '../types';

export type SortOrder = 'none' | 'az' | 'za';

function applySort<T extends { name: string }>(list: T[], order: SortOrder): T[] {
    if (order === 'az') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (order === 'za') return [...list].sort((a, b) => b.name.localeCompare(a.name));
    return list;
}

/**
 * The NPC ledger excludes the player character (isPC === true) — the PC has its
 * own dedicated panel. Returns a new array; does not mutate input.
 */
export function filterPCOut<T extends { isPC?: boolean }>(list: T[]): T[] {
    return list.filter(n => !n.isPC);
}

export function filterNPCs(npcs: NPCEntry[], query: string, order: SortOrder = 'none'): NPCEntry[] {
    let list = filterPCOut(npcs);
    if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(n =>
            n.name.toLowerCase().includes(q) ||
            n.aliases?.toLowerCase().includes(q) ||
            n.faction?.toLowerCase().includes(q)
        );
    }
    return applySort(list, order);
}

export function filterLocations(locations: LocationEntry[], query: string): LocationEntry[] {
    let list = locations;
    if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(l =>
            l.name.toLowerCase().includes(q) ||
            l.aliases?.toLowerCase().includes(q) ||
            l.broadLocation?.toLowerCase().includes(q)
        );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterFactions(factions: FactionEntry[], query: string): FactionEntry[] {
    let list = factions;
    if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(f =>
            f.name.toLowerCase().includes(q) ||
            f.aliases?.toLowerCase().includes(q) ||
            f.type?.toLowerCase().includes(q) ||
            f.region?.toLowerCase().includes(q)
        );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export type ItemLedgerFilter =
    | ItemLedgerKind
    | 'all'
    | 'possessed'
    | 'grade-0'
    | 'grade-1'
    | 'grade-2'
    | 'grade-3'
    | 'grade-unique';

export const ITEM_LEDGER_FILTERS: ItemLedgerFilter[] = [
    'all',
    'possessed',
    'beyonder-weapon',
    'medicine',
    'mystical-item',
    'grade-0',
    'grade-1',
    'grade-2',
    'grade-3',
    'grade-unique',
    'other',
];

const GRADE_FILTERS: Record<string, ItemLedgerGrade> = {
    'grade-0': '0',
    'grade-1': '1',
    'grade-2': '2',
    'grade-3': '3',
    'grade-unique': 'unique',
};

const OTHER_KINDS = new Set<ItemLedgerKind>(['ingredient', 'characteristic', 'other']);

export function itemLedgerFilterLabel(filter: ItemLedgerFilter): string {
    if (filter === 'all') return 'All';
    if (filter === 'possessed') return 'Possessed';
    if (filter === 'grade-unique') return 'Unique';
    if (filter.startsWith('grade-')) return ITEM_GRADE_LABELS[GRADE_FILTERS[filter] as Exclude<ItemLedgerGrade, ''>] ?? filter;
    return ITEM_KIND_LABELS[filter as ItemLedgerKind] ?? filter;
}

export function filterItems(
    items: ItemLedgerEntry[],
    query: string,
    kind: ItemLedgerFilter = 'all',
): ItemLedgerEntry[] {
    let list = items;
    if (kind === 'possessed') {
        list = list.filter(item => item.possessed);
    } else if (kind === 'other') {
        list = list.filter(item => OTHER_KINDS.has(item.kind));
    } else if (kind in GRADE_FILTERS) {
        const grade = GRADE_FILTERS[kind];
        list = list.filter(item => item.kind === 'sealed-artefact' && item.grade === grade);
    } else if (kind !== 'all') {
        list = list.filter(item => item.kind === kind);
    }
    if (query.trim()) {
        const q = query.toLowerCase();
        list = list.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.aliases?.toLowerCase().includes(q) ||
            item.code?.toLowerCase().includes(q) ||
            item.holder?.toLowerCase().includes(q) ||
            item.locationTag?.toLowerCase().includes(q) ||
            item.status?.toLowerCase().includes(q) ||
            ITEM_KIND_LABELS[item.kind]?.toLowerCase().includes(q)
        );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
}