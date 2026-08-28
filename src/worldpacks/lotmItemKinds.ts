import type {
    InventoryItem,
    InventoryItemCategory,
    InventoryProposal,
    ItemLedgerEntry,
    ItemLedgerGrade,
    ItemLedgerKind,
} from '../types';
import { ITEM_GRADE_LABELS, ITEM_KIND_LABELS } from '../types';

export const INVENTORY_CATEGORIES: InventoryItemCategory[] = [
    'beyonder-weapon',
    'medicine',
    'mystical-item',
    'sealed-artefact',
    'currency',
    'misc',
    'key',
    'weapon',
    'armor',
    'consumable',
    'equipped',
];

export const INVENTORY_CATEGORY_SET = new Set<string>(INVENTORY_CATEGORIES);

const LEGACY_PROPOSAL_KIND: Record<string, InventoryProposal['kind']> = {
    weapon: 'beyonder-weapon',
    armor: 'misc',
    consumable: 'medicine',
};

export const PROPOSAL_KINDS: InventoryProposal['kind'][] = [
    'beyonder-weapon',
    'medicine',
    'mystical-item',
    'sealed-artefact',
    'currency',
    'misc',
];

export function normalizeProposalKind(raw: string): InventoryProposal['kind'] {
    if ((PROPOSAL_KINDS as string[]).includes(raw)) return raw as InventoryProposal['kind'];
    return LEGACY_PROPOSAL_KIND[raw] ?? 'misc';
}

export function ledgerKindToInventoryCategory(kind: ItemLedgerKind): InventoryItemCategory {
    if (kind === 'beyonder-weapon') return 'beyonder-weapon';
    if (kind === 'medicine' || kind === 'ingredient') return 'medicine';
    if (kind === 'mystical-item') return 'mystical-item';
    if (kind === 'sealed-artefact') return 'sealed-artefact';
    return 'misc';
}

export function proposalKindToInventoryCategory(kind: InventoryProposal['kind']): InventoryItemCategory {
    if (kind === 'beyonder-weapon') return 'beyonder-weapon';
    if (kind === 'medicine') return 'medicine';
    if (kind === 'mystical-item') return 'mystical-item';
    if (kind === 'sealed-artefact') return 'sealed-artefact';
    if (kind === 'currency') return 'currency';
    return 'misc';
}

export function qualityToGrade(quality: InventoryProposal['quality']): ItemLedgerGrade | undefined {
    if (quality === 'grade-0') return '0';
    if (quality === 'grade-1') return '1';
    if (quality === 'grade-2') return '2';
    if (quality === 'grade-3') return '3';
    if (quality === 'unique') return 'unique';
    return undefined;
}

export function normalizeInventoryCategory(raw: string | undefined): InventoryItemCategory {
    if (raw && INVENTORY_CATEGORY_SET.has(raw)) return raw as InventoryItemCategory;
    return 'misc';
}

/** Legacy rows still show under the LOTM tab they belong to. */
export function inventoryItemMatchesTab(
    item: InventoryItem,
    tab: InventoryItemCategory | 'all' | 'equipped',
    gradeFilter: ItemLedgerGrade | 'all' = 'all',
): boolean {
    if (tab === 'all') return true;
    if (tab === 'equipped') return item.equipped;
    if (tab === 'beyonder-weapon') return item.category === 'beyonder-weapon' || item.category === 'weapon';
    if (tab === 'medicine') return item.category === 'medicine' || item.category === 'consumable';
    if (tab === 'mystical-item') return item.category === 'mystical-item';
    if (tab === 'sealed-artefact') {
        if (item.category !== 'sealed-artefact') return false;
        if (gradeFilter === 'all' || !gradeFilter) return true;
        return item.grade === gradeFilter;
    }
    if (tab === 'misc') return item.category === 'misc' || item.category === 'armor' || item.category === 'key';
    return item.category === tab;
}

export function expandInventoryCategories(
    selected: (InventoryItemCategory | 'equipped')[],
): Set<InventoryItemCategory | 'equipped'> {
    const set = new Set<InventoryItemCategory | 'equipped'>(selected);
    if (set.has('weapon')) set.add('beyonder-weapon');
    if (set.has('consumable')) set.add('medicine');
    if (set.has('beyonder-weapon')) set.add('weapon');
    if (set.has('medicine')) set.add('consumable');
    return set;
}

export function catalogAlreadySeeded(item: ItemLedgerEntry, ledger: ItemLedgerEntry[]): boolean {
    if (item.id && ledger.some(entry => entry.id === item.id)) return true;
    const name = item.name.trim().toLowerCase();
    if (!name) return false;
    return ledger.some(entry =>
        entry.name.trim().toLowerCase() === name
        && entry.kind === item.kind
        && (entry.grade || '') === (item.grade || ''),
    );
}

export function inventoryNotesFromLedger(item: ItemLedgerEntry): string {
    return [item.function, item.downside && `Cost: ${item.downside}`].filter(Boolean).join(' ');
}

export function inventoryKeywordsFromLedger(item: ItemLedgerEntry): string[] {
    return [
        ITEM_KIND_LABELS[item.kind],
        item.code,
        item.grade && ITEM_GRADE_LABELS[item.grade as Exclude<ItemLedgerGrade, ''>],
    ].filter((value): value is string => Boolean(value));
}

export function inventoryBadgeFor(item: Pick<InventoryItem, 'category' | 'grade'>): string | null {
    if (item.category === 'sealed-artefact' && item.grade) {
        return ITEM_GRADE_LABELS[item.grade as Exclude<ItemLedgerGrade, ''>] ?? 'Sealed Artifact';
    }
    if (item.category === 'beyonder-weapon' || item.category === 'weapon') return 'Weapon';
    if (item.category === 'medicine' || item.category === 'consumable') return 'Medicine';
    if (item.category === 'mystical-item') return 'Mystical';
    if (item.category === 'currency') return 'Currency';
    return null;
}
