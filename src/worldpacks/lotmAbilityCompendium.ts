export type LotmCompendiumAbility = {
    id: string;
    name: string;
    description: string;
    costs: string[];
    limitations: string[];
    pathwayId: string;
    sequence: number | null;
};

type RawCost = { resource?: string; amount?: string; timing?: string };
type RawAbility = {
    id?: string;
    name?: string;
    description?: string;
    costs?: RawCost[];
    limitations?: string[];
    promptEnabled?: boolean;
};

type RawCompendium = { abilities?: RawAbility[] };

let cached: LotmCompendiumAbility[] | null = null;
let loading: Promise<LotmCompendiumAbility[]> | null = null;

function parseId(id: string): { pathwayId: string; sequence: number | null } {
    const seq = id.match(/^([a-z0-9_]+)-seq(\d)-/i);
    if (seq) return { pathwayId: seq[1].toLowerCase(), sequence: Number(seq[2]) };
    return { pathwayId: '', sequence: null };
}

function compact(raw: RawCompendium): LotmCompendiumAbility[] {
    return (raw.abilities ?? []).flatMap(row => {
        const id = String(row.id ?? '').trim();
        const name = String(row.name ?? '').trim();
        if (!id || !name) return [];
        const parsed = parseId(id);
        return [{
            id,
            name,
            description: String(row.description ?? '').trim(),
            costs: (row.costs ?? []).map(c => [c.resource, c.amount, c.timing].filter(Boolean).join(' ')).filter(Boolean),
            limitations: (row.limitations ?? []).map(s => String(s).trim()).filter(Boolean),
            pathwayId: parsed.pathwayId,
            sequence: parsed.sequence,
        }];
    });
}

/** Lazy-load the 2.4MB LOTM ability catalog (separate chunk, not in the main bundle). */
export async function loadLotmAbilityCompendium(): Promise<LotmCompendiumAbility[]> {
    if (cached) return cached;
    if (!loading) {
        loading = import('../../mechanics/Ability Compendium/lotm_beyonder_pathways_compendium.json')
            .then(mod => {
                cached = compact((mod.default ?? mod) as RawCompendium);
                return cached;
            })
            .catch(err => {
                console.warn('[LotmAbilityCompendium] Failed to load catalog:', err);
                cached = [];
                return cached;
            });
    }
    return loading;
}

export function getLotmAbilityCompendiumSync(): LotmCompendiumAbility[] {
    return cached ?? [];
}

export function abilitiesForLotmCompendium(
    pathwayId: string | undefined,
    sequence: number | undefined,
    max = 8,
): LotmCompendiumAbility[] {
    const all = getLotmAbilityCompendiumSync();
    if (all.length === 0) return [];
    const foundation = all.filter(a => a.id.includes('foundation')).slice(0, 1);
    const matched = typeof sequence === 'number' && pathwayId
        ? all.filter(a => a.pathwayId === pathwayId && a.sequence === sequence).slice(0, max)
        : [];
    return [...foundation, ...matched];
}

export function formatLotmAbilityBlock(pathwayId: string | undefined, sequence: number | undefined): string {
    const rows = abilitiesForLotmCompendium(pathwayId, sequence);
    if (rows.length === 0) return '';
    const lines = rows.map(a => {
        const cost = a.costs[0] ? ` [${a.costs[0]}]` : '';
        const limit = a.limitations[0] ? ` — ${a.limitations[0]}` : '';
        return `${a.name}${cost}: ${a.description.slice(0, 180)}${limit}`;
    });
    return `[BEYONDER ABILITIES]\n${lines.join('\n')}`;
}

export function findLotmAbilityByName(
    name: string,
    pathwayId?: string,
    sequence?: number,
): LotmCompendiumAbility | undefined {
    const needle = name.split(':')[0].trim().toLowerCase();
    if (!needle) return undefined;
    const all = getLotmAbilityCompendiumSync();
    if (all.length === 0) return undefined;
    const exact = all.filter(a => a.name.toLowerCase() === needle);
    const pool = exact.length ? exact : all.filter(a => a.name.toLowerCase().includes(needle) || needle.includes(a.name.toLowerCase()));
    const pathwayMatch = pathwayId ? pool.filter(a => a.pathwayId === pathwayId) : pool;
    const seqMatch = typeof sequence === 'number'
        ? pathwayMatch.filter(a => a.sequence === sequence || a.sequence == null)
        : pathwayMatch;
    return seqMatch[0] ?? pathwayMatch[0] ?? pool[0];
}

/** Fire-and-forget warmup so the first turn can inject the catalog. */
export function warmupLotmAbilityCompendium(): void {
    void loadLotmAbilityCompendium();
}
