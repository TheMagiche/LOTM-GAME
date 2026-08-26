import type { NPCEntry, NPCSignatureKit } from '../types';
import { sanitizeSignatureKit } from '../services/npc/signatureKit';

type RawAbility = string | { name?: string; description?: string };
type RawSequence = {
    sequence?: number;
    name?: string;
    abilities?: RawAbility[];
};
type RawAbilityFile = {
    pathway?: string;
    sequences?: RawSequence[];
};
type RawOverviewFile = {
    pathway_name?: string;
    aliases?: string[];
    corresponding_tarot_card?: {
        card?: string;
        card_number?: string;
    };
};

const abilityFiles = import.meta.glob(
    '../../lotmdnd/assets/data/pathways/**/*abilities*.json',
    { eager: true, import: 'default' },
) as Record<string, RawAbilityFile>;

const overviewFiles = import.meta.glob(
    '../../lotmdnd/assets/data/pathways/**/*pathway_overview.json',
    { eager: true, import: 'default' },
) as Record<string, RawOverviewFile>;

const emblemFiles = import.meta.glob(
    '../../lotmdnd/assets/data/pathways/**/*Symbol2.webp',
    { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const TAROT_ORDER: Record<string, number> = {
    '0': 0, I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
    XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18, XIX: 19,
    XX: 20, XXI: 21, XXII: 22,
};

export type LotmSequenceInfo = {
    sequence: number;
    name: string;
    abilities: string[];
    shortAbilities: string[];
};

export type LotmPathwayDef = {
    id: string;
    name: string;
    aliases: string[];
    sequences: LotmSequenceInfo[];
    /** Path relative to `lotmdnd/` for the pathway emblem. */
    emblemPath: string;
    /** Vite-resolved URL for the emblem image. */
    emblemSrc: string;
    tarotCard: string;
    tarotNumber: string;
};

function folderIdFromPath(path: string): string {
    const match = path.match(/pathways\/([^/]+)_pathway\//i);
    return match ? match[1].toLowerCase() : '';
}

function shortAbilityName(raw: RawAbility): string {
    if (typeof raw === 'string') {
        const cut = raw.split(':')[0].trim();
        return cut || raw.trim();
    }
    return String(raw?.name ?? '').trim();
}

function fullAbilityText(raw: RawAbility): string {
    if (typeof raw === 'string') return raw.trim();
    const name = String(raw?.name ?? '').trim();
    const desc = String(raw?.description ?? '').trim();
    if (name && desc) return `${name}: ${desc}`;
    return name || desc;
}

function titleCaseId(id: string): string {
    return id.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function emblemFromGlob(id: string): { path: string; src: string } {
    const needle = `/pathways/${id}_pathway/`;
    const entry = Object.entries(emblemFiles).find(([p]) => p.includes(needle));
    if (!entry) return { path: '', src: '' };
    const [path, src] = entry;
    const idx = path.indexOf('assets/data/pathways');
    return { path: idx >= 0 ? path.slice(idx) : '', src };
}

function primaryTarotNumber(raw: string): string {
    return raw.split(/\s+or\s+/i)[0]?.trim() ?? '';
}

function buildCatalog(): LotmPathwayDef[] {
    const byId = new Map<string, LotmPathwayDef>();

    for (const [path, raw] of Object.entries(abilityFiles)) {
        const id = folderIdFromPath(path);
        if (!id || !raw) continue;
        const sequences = (raw.sequences ?? [])
            .map((seq): LotmSequenceInfo | null => {
                const sequence = Number(seq.sequence);
                if (!Number.isInteger(sequence) || sequence < 0 || sequence > 9) return null;
                const abilities = (seq.abilities ?? []).map(fullAbilityText).filter(Boolean);
                const shortAbilities = (seq.abilities ?? []).map(shortAbilityName).filter(Boolean);
                return {
                    sequence,
                    name: String(seq.name ?? `Sequence ${sequence}`).trim(),
                    abilities,
                    shortAbilities,
                };
            })
            .filter((row): row is LotmSequenceInfo => row !== null)
            .sort((a, b) => b.sequence - a.sequence);

        const emblem = emblemFromGlob(id);
        byId.set(id, {
            id,
            name: String(raw.pathway || `${titleCaseId(id)} Pathway`).trim(),
            aliases: [],
            sequences,
            emblemPath: emblem.path,
            emblemSrc: emblem.src,
            tarotCard: '',
            tarotNumber: '',
        });
    }

    for (const [path, raw] of Object.entries(overviewFiles)) {
        const id = folderIdFromPath(path);
        const def = byId.get(id);
        if (!def || !raw) continue;
        if (raw.pathway_name) def.name = raw.pathway_name.trim();
        def.aliases = (raw.aliases ?? []).map(a => String(a).trim()).filter(Boolean);
        def.tarotCard = String(raw.corresponding_tarot_card?.card ?? '').trim();
        def.tarotNumber = String(raw.corresponding_tarot_card?.card_number ?? '').trim();
        if (!def.emblemPath || !def.emblemSrc) {
            const emblem = emblemFromGlob(id);
            def.emblemPath = def.emblemPath || emblem.path;
            def.emblemSrc = def.emblemSrc || emblem.src;
        }
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const LOTM_PATHWAYS: LotmPathwayDef[] = buildCatalog();

const byId = new Map(LOTM_PATHWAYS.map(p => [p.id, p]));

export function getLotmPathway(id: string | undefined | null): LotmPathwayDef | undefined {
    if (!id) return undefined;
    return byId.get(id.trim().toLowerCase().replace(/\s+/g, '_'));
}

export function normalizeLotmKey(value: string): string {
    return value.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function resolveLotmPathway(text: string | undefined | null): LotmPathwayDef | undefined {
    if (!text) return undefined;
    const direct = getLotmPathway(text);
    if (direct) return direct;
    const key = normalizeLotmKey(text.replace(/pathway/gi, ''));
    if (!key) return undefined;

    const namesOf = (pathway: LotmPathwayDef) =>
        [pathway.id.replace(/_/g, ' '), pathway.name, ...pathway.aliases, ...pathway.sequences.map(s => s.name)]
            .map(name => normalizeLotmKey(name.replace(/pathway/gi, '')))
            .filter(Boolean);

    for (const pathway of LOTM_PATHWAYS) {
        if (namesOf(pathway).some(n => n === key)) return pathway;
    }
    for (const pathway of LOTM_PATHWAYS) {
        if (namesOf(pathway).some(n => n.includes(key) || key.includes(n))) return pathway;
    }
    return undefined;
}

export function getLotmSequence(pathway: LotmPathwayDef | undefined, sequence: number | undefined): LotmSequenceInfo | undefined {
    if (!pathway || typeof sequence !== 'number') return undefined;
    return pathway.sequences.find(s => s.sequence === sequence);
}

export function nextLotmSequence(sequence: number | undefined): number | undefined {
    if (typeof sequence !== 'number' || sequence <= 0) return undefined;
    return sequence - 1;
}

export function abilitiesForLotmSequence(pathwayId: string | undefined, sequence: number | undefined, max = 8): string[] {
    const seq = getLotmSequence(getLotmPathway(pathwayId) ?? resolveLotmPathway(pathwayId), sequence);
    if (!seq) return [];
    return seq.shortAbilities.slice(0, max);
}

export function formatLotmPathwayLabel(pathwayId: string | undefined, sequence: number | undefined): string {
    const pathway = getLotmPathway(pathwayId) ?? resolveLotmPathway(pathwayId);
    if (!pathway) return '';
    const seq = getLotmSequence(pathway, sequence);
    if (!seq) return pathway.name;
    return `${pathway.name} · Seq ${seq.sequence} ${seq.name}`;
}

export function formatLotmSequenceName(pathwayId: string | undefined, sequence: number | undefined): string {
    const pathway = getLotmPathway(pathwayId) ?? resolveLotmPathway(pathwayId);
    const seq = getLotmSequence(pathway, sequence);
    if (!seq) return typeof sequence === 'number' ? `Sequence ${sequence}` : '';
    return `Sequence ${seq.sequence} · ${seq.name}`;
}

export function formatLotmTarotKicker(pathway: LotmPathwayDef | undefined): string {
    if (!pathway?.tarotCard) return '';
    const num = primaryTarotNumber(pathway.tarotNumber);
    return num ? `${num} · ${pathway.tarotCard}` : pathway.tarotCard;
}

export function lotmTarotOrder(pathway: LotmPathwayDef | undefined): number {
    const raw = primaryTarotNumber(pathway?.tarotNumber ?? '');
    if (raw in TAROT_ORDER) return TAROT_ORDER[raw];
    return 99;
}

/** Campaign title: character name and their pathway. */
export function lotmChronicleName(characterName: string, pathwayId: string | undefined): string {
    const pathway = getLotmPathway(pathwayId) ?? resolveLotmPathway(pathwayId);
    const pathwayName = pathway?.name || pathwayId || 'Unknown Pathway';
    return `${characterName} — ${pathwayName}`;
}

export function kitFromLotmPathway(
    pathwayId: string,
    sequence: number,
    mergeInto?: NPCSignatureKit,
): NPCSignatureKit {
    const abilities = abilitiesForLotmSequence(pathwayId, sequence);
    const base: NPCSignatureKit = {
        equipment: mergeInto?.equipment ?? [],
        abilities: abilities.length ? abilities : (mergeInto?.abilities ?? []),
        pathway: pathwayId,
        sequence,
    };
    const sanitized = sanitizeSignatureKit(base, mergeInto);
    return sanitized ?? base;
}

/** Canon Tingen-era / Tarot Club assignments — distinct pathways per named character. */
export const LOTM_CANON_PATHWAYS: Record<string, { pathway: string; sequence: number }> = {
    'clara whitlock': { pathway: 'fool', sequence: 9 },
    'klein moretti': { pathway: 'fool', sequence: 9 },
    'audrey hall': { pathway: 'visionary', sequence: 9 },
    'alger wilson': { pathway: 'tyrant', sequence: 7 },
    'dunn smith': { pathway: 'darkness', sequence: 7 },
    'leonard mitchell': { pathway: 'darkness', sequence: 8 },
    'zaratul': { pathway: 'fool', sequence: 4 },
    'amon': { pathway: 'error', sequence: 1 },
    'adam': { pathway: 'visionary', sequence: 2 },
    'azik eggers': { pathway: 'death', sequence: 2 },
    'roselle gustav': { pathway: 'black_emperor', sequence: 0 },
    'will auceptin': { pathway: 'wheel_of_fortune', sequence: 1 },
    'fors wall': { pathway: 'door', sequence: 9 },
    'xio derecha': { pathway: 'justiciar', sequence: 9 },
};

export function lookupCanonPathway(name: string, aliases?: string): { pathway: string; sequence: number } | undefined {
    const keys = [name, ...(aliases ?? '').split(',')].map(s => normalizeLotmKey(s)).filter(Boolean);
    for (const key of keys) {
        const hit = LOTM_CANON_PATHWAYS[key];
        if (hit) return hit;
    }
    return undefined;
}

export function applyLotmPathwayToNpc<T extends Pick<NPCEntry, 'name' | 'aliases' | 'signatureKit'>>(npc: T): T {
    const kit = npc.signatureKit;
    let pathwayId = kit?.pathway ? (getLotmPathway(kit.pathway) ?? resolveLotmPathway(kit.pathway))?.id : undefined;
    let sequence = typeof kit?.sequence === 'number' ? kit.sequence : undefined;

    if (!pathwayId) {
        const canon = lookupCanonPathway(npc.name, npc.aliases);
        if (canon) {
            pathwayId = canon.pathway;
            sequence = sequence ?? canon.sequence;
        }
    }
    if (!pathwayId && kit?.element) {
        pathwayId = resolveLotmPathway(kit.element)?.id;
        sequence = sequence ?? 9;
    }
    if (!pathwayId) return npc;

    const nextKit: NPCSignatureKit = {
        equipment: kit?.equipment ?? [],
        abilities: (kit?.abilities?.length ? kit.abilities : abilitiesForLotmSequence(pathwayId, sequence ?? 9)),
        element: kit?.element,
        pathway: pathwayId,
        sequence: sequence ?? 9,
    };
    const sanitized = sanitizeSignatureKit(nextKit, kit);
    if (!sanitized) return npc;
    if (
        kit?.pathway === sanitized.pathway
        && kit?.sequence === sanitized.sequence
        && JSON.stringify(kit.abilities) === JSON.stringify(sanitized.abilities)
    ) return npc;
    return { ...npc, signatureKit: sanitized };
}

export function attachLotmPathwaysToNpcs<T extends Pick<NPCEntry, 'name' | 'aliases' | 'signatureKit'>>(npcs: T[]): T[] {
    return npcs.map(applyLotmPathwayToNpc);
}
