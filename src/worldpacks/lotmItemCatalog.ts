import weaponsJson from '../../gamedata/assets/data/items/beyonder_weapons.json';
import medicinesJson from '../../gamedata/assets/data/items/list_medicines.json';
import mysticalJson from '../../gamedata/assets/data/items/list_mystical_items.json';
import sealedGrade0Json from '../../gamedata/assets/data/items/list_sealed_artefact_grade_0.json';
import sealedGrade1Json from '../../gamedata/assets/data/items/list_sealed_artefact_grade_1.json';
import sealedGrade2Json from '../../gamedata/assets/data/items/list_sealed_artefact_grade_2.json';
import sealedGrade3Json from '../../gamedata/assets/data/items/list_sealed_artefact_grade_3.json';
import sealedUniqueJson from '../../gamedata/assets/data/items/list_sealed_artefact_grade_unique.json';
import type { ItemLedgerEntry, ItemLedgerGrade, ItemLedgerKind } from '../types';
import { normalizeItemLedgerEntry } from '../types';

type RawItem = {
    name?: string;
    appearance?: string;
    function?: string;
    description?: string;
    downside?: string;
    status?: string;
    code?: string;
    ingredients_process?: string;
};

type RawList = { items?: RawItem[] };

function listFrom(raw: unknown): RawItem[] {
    const items = (raw as RawList | undefined)?.items;
    return Array.isArray(items) ? items : [];
}

function slug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function catalogId(kind: ItemLedgerKind, item: RawItem): string {
    const key = item.code || item.name || 'unnamed';
    return `itm_${kind}_${slug(key)}`.slice(0, 80);
}

function toEntry(item: RawItem, kind: ItemLedgerKind, grade: ItemLedgerGrade = ''): ItemLedgerEntry {
    return normalizeItemLedgerEntry({
        id: catalogId(kind, item),
        name: item.name || 'Unnamed relic',
        kind,
        grade,
        code: item.code || '',
        appearance: item.appearance || '',
        function: item.function || item.description || '',
        downside: item.downside || '',
        ingredients: item.ingredients_process || '',
        status: item.status || '',
        source: 'catalog',
    });
}

let cached: ItemLedgerEntry[] | null = null;

export function loadLotmItemCatalog(): ItemLedgerEntry[] {
    if (cached) return cached;
    const out: ItemLedgerEntry[] = [];
    const seen = new Set<string>();
    const push = (entry: ItemLedgerEntry) => {
        if (seen.has(entry.id)) {
            entry = { ...entry, id: `${entry.id}-${seen.size}` };
        }
        seen.add(entry.id);
        out.push(entry);
    };
    try {
        for (const item of listFrom(weaponsJson)) push(toEntry(item, 'beyonder-weapon'));
        for (const item of listFrom(mysticalJson)) push(toEntry(item, 'mystical-item'));
        for (const item of listFrom(medicinesJson)) push(toEntry(item, 'medicine'));
        const grades: Array<[unknown, ItemLedgerGrade]> = [
            [sealedGrade0Json, '0'],
            [sealedGrade1Json, '1'],
            [sealedGrade2Json, '2'],
            [sealedGrade3Json, '3'],
            [sealedUniqueJson, 'unique'],
        ];
        for (const [raw, grade] of grades) {
            for (const item of listFrom(raw)) push(toEntry(item, 'sealed-artefact', grade));
        }
        cached = out;
    } catch (e) {
        console.warn('[LotmItemCatalog] Failed to load canon item lists:', e);
        cached = [];
    }
    return cached;
}
