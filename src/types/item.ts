// ─── Inventory Ledger Types ───────────────────────────────────────────
// World catalog of Beyonder items, Sealed Artifacts, medicines, and similar
// relics. Distinct from `inventoryItems` (what the PC is carrying). Seeded
// from the LOTM canon catalog and editable in InventoryLedgerModal.

export type ItemLedgerKind =
    | 'sealed-artefact'
    | 'mystical-item'
    | 'beyonder-weapon'
    | 'medicine'
    | 'ingredient'
    | 'characteristic'
    | 'other';

export type ItemLedgerGrade = '3' | '2' | '1' | '0' | 'unique' | '';

export type ItemLedgerEntry = {
    id: string;
    name: string;
    aliases: string;
    kind: ItemLedgerKind;
    grade: ItemLedgerGrade;
    code: string;
    appearance: string;
    function: string;
    downside: string;
    ingredients: string;
    status: string;
    holder: string;
    locationTag: string;
    possessed: boolean;
    pathway: string;
    notes: string;
    firstSeenScene: string;
    lastSeenScene: string;
    source: 'llm' | 'manual' | 'catalog';
};

export const ITEM_KIND_LABELS: Record<ItemLedgerKind, string> = {
    'sealed-artefact': 'Sealed Artifact',
    'mystical-item': 'Mystical Item',
    'beyonder-weapon': 'Beyonder Weapon',
    medicine: 'Medicine',
    ingredient: 'Ingredient',
    characteristic: 'Characteristic',
    other: 'Other',
};

export const ITEM_GRADE_LABELS: Record<Exclude<ItemLedgerGrade, ''>, string> = {
    '3': 'Grade 3',
    '2': 'Grade 2',
    '1': 'Grade 1',
    '0': 'Grade 0',
    unique: 'Unique',
};

export const ITEM_KINDS: ItemLedgerKind[] = [
    'sealed-artefact',
    'mystical-item',
    'beyonder-weapon',
    'medicine',
    'ingredient',
    'characteristic',
    'other',
];

export const EMPTY_ITEM_ENTRY: ItemLedgerEntry = {
    id: '',
    name: '',
    aliases: '',
    kind: 'other',
    grade: '',
    code: '',
    appearance: '',
    function: '',
    downside: '',
    ingredients: '',
    status: '',
    holder: '',
    locationTag: '',
    possessed: false,
    pathway: '',
    notes: '',
    firstSeenScene: '',
    lastSeenScene: '',
    source: 'manual',
};

const KINDS = new Set<string>(ITEM_KINDS);
const GRADES = new Set<string>(['3', '2', '1', '0', 'unique', '']);

export function normalizeItemLedgerEntry(item: Partial<ItemLedgerEntry>): ItemLedgerEntry {
    const kind = KINDS.has(item.kind ?? '') ? (item.kind as ItemLedgerKind) : 'other';
    const grade = GRADES.has(item.grade ?? '') ? (item.grade as ItemLedgerGrade) : '';
    const source = item.source === 'llm' || item.source === 'catalog' ? item.source : 'manual';
    return {
        id: item.id ?? '',
        name: (item.name ?? '').trim(),
        aliases: item.aliases ?? '',
        kind,
        grade,
        code: item.code ?? '',
        appearance: item.appearance ?? '',
        function: item.function ?? '',
        downside: item.downside ?? '',
        ingredients: item.ingredients ?? '',
        status: item.status ?? '',
        holder: item.holder ?? '',
        locationTag: item.locationTag ?? '',
        possessed: item.possessed === true,
        pathway: item.pathway ?? '',
        notes: item.notes ?? '',
        firstSeenScene: item.firstSeenScene ?? '',
        lastSeenScene: item.lastSeenScene ?? '',
        source,
    };
}
