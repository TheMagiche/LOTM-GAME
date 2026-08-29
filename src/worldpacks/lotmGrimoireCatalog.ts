/**
 * Player-facing LOTM lore catalog for the Grimoire overlay.
 * Loads novel reference JSON from gamedata/assets/data — not abilities,
 * potion formulas, items, or pricing (those are game mechanics).
 *
 * Volume files currently live in `grimoire/` (the `volumes/` rename has not landed).
 */

import { lotmAssetUrl } from '../services/lotm/lotmAssetUrl';
import { LOTM_CHURCH_EMBLEMS } from './lotmVisualManifest';

export type GrimoireSectionId = 'volumes' | 'epochs' | 'pathways' | 'world' | 'churches' | 'guide';

export type GrimoireWorldTabId = 'geography' | 'languages' | 'creatures' | 'food' | 'currency';

export const GRIMOIRE_SECTIONS: { id: GrimoireSectionId; label: string }[] = [
    { id: 'volumes', label: 'Volumes' },
    { id: 'epochs', label: 'Epochs' },
    { id: 'pathways', label: 'Pathways' },
    { id: 'world', label: 'World' },
    { id: 'churches', label: 'Churches' },
];

export const GRIMOIRE_WORLD_TABS: { id: GrimoireWorldTabId; label: string }[] = [
    { id: 'geography', label: 'Geography' },
    { id: 'languages', label: 'Languages' },
    { id: 'creatures', label: 'Creatures' },
    { id: 'food', label: 'Food' },
    { id: 'currency', label: 'Currency' },
];

export type GrimoireVolumeEvent = {
    date: string;
    chapters: string;
    event: string;
};

export type GrimoireVolume = {
    id: string;
    number: number;
    title: string;
    book: string;
    chaptersCovered: string;
    totalChapters: number;
    titleMeaning: string;
    synopsis: string;
    events: GrimoireVolumeEvent[];
    previousVolume: string;
    nextVolume: string;
};

export type GrimoireEpochEvent = {
    time: string;
    description: string;
};

export type GrimoireEpoch = {
    id: string;
    name: string;
    events: GrimoireEpochEvent[];
};

export type GrimoireSequenceName = {
    sequence: number;
    name: string;
    band: string;
};

export type GrimoireGod = {
    name: string;
    status: string;
    type: string;
};

export type GrimoirePathwayLore = {
    id: string;
    name: string;
    aliases: string[];
    description: string;
    highSequenceCharacteristics: string;
    authority: string;
    pathwaySwitchingNote: string;
    sequences: GrimoireSequenceName[];
    tarotCard: string;
    tarotNumber: string;
    tarotDescription: string;
    gods: GrimoireGod[];
    mythicalCreatureForm: string;
    pinnacleForm: string;
    sefirah: string;
    aboveTheSequence: string;
    relatedOrganizations: string[];
    emblemSrc: string;
};

export type GrimoireChurch = {
    id: string;
    name: string;
    alsoCalled: string;
    godWorshiped: string;
    pathways: string[];
    domain: string;
    beyonderTeams: string[];
    hierarchyLeader: string;
    headquarters: string;
    upperEchelon: string;
    clergyAttire: string;
    foundedIn: string;
    extraDetails: string;
    emblemSrc: string;
};

export type GrimoireWorldEntry = {
    id: string;
    kind: GrimoireWorldTabId;
    name: string;
    subtitle: string;
    description: string;
    extra: string[];
};

export type GrimoireWorldCatalog = Record<GrimoireWorldTabId, GrimoireWorldEntry[]>;

type JsonRecord = Record<string, unknown>;

type RawVolumeFile = {
    volume?: {
        title?: string;
        book?: string;
        chapters_covered?: string;
        total_chapters?: number;
        title_meaning?: string;
        synopsis?: string;
        timeline_of_major_events?: Array<{ date?: string; chapters?: string; event?: string }>;
        previous_volume?: string;
        next_volume?: string;
    };
};

type RawTimelineFile = {
    timeline?: Record<string, {
        name?: string;
        events?: Array<{ time?: string | null; date?: string | null; description?: string }>;
    }>;
};

type RawSequenceLevel = { sequence?: number; name?: string };

type RawOverviewFile = {
    pathway_name?: string;
    aliases?: string[];
    overview?: {
        description?: string;
        high_sequence_characteristics?: string;
        authority?: string;
        pathway_switching_note?: string;
    };
    sequence_levels?: Record<string, RawSequenceLevel[]>;
    corresponding_tarot_card?: {
        card?: string;
        card_number?: string;
        description?: string;
    };
    god?: Array<{ name?: string; status?: string; type?: string }>;
    mythical_creature_form?: { description?: string };
    pinnacle_mythical_creature_form?: { description?: string };
    sefirah?: { name?: string };
    above_the_sequence?: { name?: string };
    related_organizations?: Array<{ name?: string } | string>;
};

type RawChurch = {
    name?: string;
    also_called?: string;
    god_worshiped?: string;
    pathways?: string[];
    domain?: string;
    beyonder_teams?: string[];
    hierarchy?: {
        leader?: string;
        headquarters?: string;
        upper_echelon?: string;
        clergy_attire?: string;
    };
    founded_in?: string;
    extra_details?: string;
};

type RawChurchFile = { churches?: RawChurch[] };

type RawCreature = { name?: string; description?: string; pathway?: string | null };

const volumeFiles = import.meta.glob(
    '../../gamedata/assets/data/grimoire/lotm_vol_*.json',
    { eager: true, import: 'default' },
) as Record<string, RawVolumeFile>;

const timelineFiles = import.meta.glob(
    '../../gamedata/assets/data/grimoire/Lotm_timeline.json',
    { eager: true, import: 'default' },
) as Record<string, RawTimelineFile>;

const overviewFiles = import.meta.glob(
    '../../gamedata/assets/data/pathways/**/*pathway_overview.json',
    { eager: true, import: 'default' },
) as Record<string, RawOverviewFile>;

const emblemFiles = import.meta.glob(
    '../../gamedata/assets/data/pathways/**/*Symbol2.webp',
    { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const churchFiles = import.meta.glob(
    '../../gamedata/assets/data/churches/orthodox_churches.json',
    { eager: true, import: 'default' },
) as Record<string, RawChurchFile>;

const worldFiles = import.meta.glob(
    '../../gamedata/assets/data/world/**/*.json',
    { eager: true, import: 'default' },
) as Record<string, unknown>;

const SEQUENCE_BAND_LABELS: Record<string, string> = {
    low_sequence: 'Low Sequence',
    mid_sequence: 'Mid Sequence',
    high_sequence_saint: 'Saint',
    high_sequence_angel: 'Angel',
    true_god: 'True God',
};

const SEQUENCE_BAND_ORDER = [
    'low_sequence',
    'mid_sequence',
    'high_sequence_saint',
    'high_sequence_angel',
    'true_god',
];

const CHURCH_EMBLEM_NEEDLES: Array<[string, keyof typeof LOTM_CHURCH_EMBLEMS]> = [
    ['church of the fool', 'fool'],
    ['evernight', 'evernight'],
    ['lord of storms', 'storms'],
    ['steam and machinery', 'steam'],
    ['knowledge and wisdom', 'knowledge'],
    ['eternal blazing sun', 'sun'],
    ['earth mother', 'earth'],
    ['god of combat', 'combat'],
];

function asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as JsonRecord;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function titleCaseKey(key: string): string {
    return key
        .replace(/['’]/g, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, ch => ch.toUpperCase());
}

function slug(value: string): string {
    return value.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function folderIdFromPathwayPath(path: string): string {
    const match = path.match(/pathways\/([^/]+)_pathway\//i);
    return match ? match[1].toLowerCase() : '';
}

function emblemSrcFromGlob(id: string): string {
    const needle = `/pathways/${id}_pathway/`;
    const entry = Object.entries(emblemFiles).find(([p]) => p.includes(needle));
    return entry?.[1] ?? '';
}

function churchEmblemSrc(name: string): string {
    const n = name.toLowerCase();
    for (const [needle, key] of CHURCH_EMBLEM_NEEDLES) {
        if (!n.includes(needle)) continue;
        const relative = LOTM_CHURCH_EMBLEMS[key];
        return relative ? lotmAssetUrl(relative) : '';
    }
    return '';
}

function volumeNumberFromPath(path: string): number {
    const match = path.match(/lotm_vol_(\d+)\.json$/i);
    return match ? Number(match[1]) : 0;
}

function buildVolumes(): GrimoireVolume[] {
    return Object.entries(volumeFiles)
        .map(([path, raw]): GrimoireVolume | null => {
            const number = volumeNumberFromPath(path);
            const vol = raw?.volume;
            if (!number || !vol) return null;
            return {
                id: String(number),
                number,
                title: asString(vol.title) || `Volume ${number}`,
                book: asString(vol.book),
                chaptersCovered: asString(vol.chapters_covered),
                totalChapters: Number(vol.total_chapters) || 0,
                titleMeaning: asString(vol.title_meaning),
                synopsis: asString(vol.synopsis),
                events: (vol.timeline_of_major_events ?? [])
                    .map(row => ({
                        date: asString(row?.date),
                        chapters: asString(row?.chapters),
                        event: asString(row?.event),
                    }))
                    .filter(row => row.event || row.date),
                previousVolume: asString(vol.previous_volume),
                nextVolume: asString(vol.next_volume),
            };
        })
        .filter((row): row is GrimoireVolume => row !== null)
        .sort((a, b) => a.number - b.number);
}

function buildEpochs(): GrimoireEpoch[] {
    const raw = Object.values(timelineFiles)[0];
    const timeline = raw?.timeline ?? {};
    return Object.entries(timeline).map(([key, value]) => ({
        id: slug(value?.name || key),
        name: asString(value?.name) || key,
        events: (value?.events ?? [])
            .map(ev => ({
                time: asString(ev?.time) || asString(ev?.date),
                description: asString(ev?.description),
            }))
            .filter(ev => ev.description),
    }));
}

function buildPathways(): GrimoirePathwayLore[] {
    return Object.entries(overviewFiles)
        .map(([path, raw]): GrimoirePathwayLore | null => {
            const id = folderIdFromPathwayPath(path);
            if (!id || !raw) return null;
            const sequences: GrimoireSequenceName[] = [];
            for (const band of SEQUENCE_BAND_ORDER) {
                const rows = raw.sequence_levels?.[band] ?? [];
                for (const row of rows) {
                    const sequence = Number(row?.sequence);
                    if (!Number.isInteger(sequence) || sequence < 0 || sequence > 9) continue;
                    sequences.push({
                        sequence,
                        name: asString(row?.name) || `Sequence ${sequence}`,
                        band: SEQUENCE_BAND_LABELS[band] ?? band,
                    });
                }
            }
            sequences.sort((a, b) => b.sequence - a.sequence);

            const orgs = (raw.related_organizations ?? [])
                .map(entry => (typeof entry === 'string' ? entry : asString(entry?.name)))
                .filter(Boolean);

            return {
                id,
                name: asString(raw.pathway_name) || `${titleCaseKey(id)} Pathway`,
                aliases: (raw.aliases ?? []).map(a => asString(a)).filter(Boolean),
                description: asString(raw.overview?.description),
                highSequenceCharacteristics: asString(raw.overview?.high_sequence_characteristics),
                authority: asString(raw.overview?.authority),
                pathwaySwitchingNote: asString(raw.overview?.pathway_switching_note),
                sequences,
                tarotCard: asString(raw.corresponding_tarot_card?.card),
                tarotNumber: asString(raw.corresponding_tarot_card?.card_number),
                tarotDescription: asString(raw.corresponding_tarot_card?.description),
                gods: (raw.god ?? [])
                    .map(g => ({
                        name: asString(g?.name),
                        status: asString(g?.status),
                        type: asString(g?.type),
                    }))
                    .filter(g => g.name),
                mythicalCreatureForm: asString(raw.mythical_creature_form?.description),
                pinnacleForm: asString(raw.pinnacle_mythical_creature_form?.description),
                sefirah: asString(raw.sefirah?.name),
                aboveTheSequence: asString(raw.above_the_sequence?.name),
                relatedOrganizations: orgs,
                emblemSrc: emblemSrcFromGlob(id),
            };
        })
        .filter((row): row is GrimoirePathwayLore => row !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
}

function buildChurches(): GrimoireChurch[] {
    const raw = Object.values(churchFiles)[0];
    return (raw?.churches ?? []).map((church, index) => {
        const name = asString(church.name) || `Church ${index + 1}`;
        return {
            id: slug(name) || `church-${index}`,
            name,
            alsoCalled: asString(church.also_called),
            godWorshiped: asString(church.god_worshiped),
            pathways: (church.pathways ?? []).map(asString).filter(Boolean),
            domain: asString(church.domain),
            beyonderTeams: (church.beyonder_teams ?? []).map(asString).filter(Boolean),
            hierarchyLeader: asString(church.hierarchy?.leader),
            headquarters: asString(church.hierarchy?.headquarters),
            upperEchelon: asString(church.hierarchy?.upper_echelon),
            clergyAttire: asString(church.hierarchy?.clergy_attire),
            foundedIn: asString(church.founded_in),
            extraDetails: asString(church.extra_details),
            emblemSrc: churchEmblemSrc(name),
        };
    });
}

function worldFile(suffix: string): unknown {
    const entry = Object.entries(worldFiles).find(([path]) => path.includes(suffix) && !path.includes('/Pricing/'));
    return entry?.[1];
}

function collectPlaces(raw: unknown, listKey: string, kind: GrimoireWorldTabId, prefix: string): GrimoireWorldEntry[] {
    const root = asRecord(raw);
    const group = asRecord(root?.[listKey]);
    const list = Array.isArray(group?.list) ? group.list : [];
    return list
        .map((item, index): GrimoireWorldEntry | null => {
            const rec = asRecord(item);
            if (!rec) return null;
            const name = asString(rec.name);
            if (!name) return null;
            return {
                id: `${prefix}-${slug(name) || index}`,
                kind,
                name,
                subtitle: asString(rec.type),
                description: asString(rec.description),
                extra: [],
            };
        })
        .filter((row): row is GrimoireWorldEntry => row !== null);
}

function walkNamedLeaves(
    node: unknown,
    parent: string,
    kind: GrimoireWorldTabId,
    prefix: string,
    out: GrimoireWorldEntry[],
): void {
    const rec = asRecord(node);
    if (!rec) return;
    for (const [key, value] of Object.entries(rec)) {
        if (key === 'alphabet_image' || key === 'alphabet_images' || key === 'script_image') continue;
        const nested = asRecord(value);
        if (!nested) continue;
        const name = titleCaseKey(key);
        const description = asString(nested.description);
        const extras: string[] = [];
        const usage = nested.usage;
        if (Array.isArray(usage)) extras.push(`Usage: ${usage.map(asString).filter(Boolean).join(', ')}`);
        const notes = asString(nested.notes);
        if (notes) extras.push(notes);
        const createdBy = asString(nested.created_by);
        if (createdBy) extras.push(`Created by ${createdBy}`);
        const epoch = asString(nested.epoch);
        if (epoch) extras.push(epoch);
        const characteristics = asString(nested.characteristics);
        if (characteristics) extras.push(characteristics);
        const example = asString(nested.example_phrase);
        if (example) extras.push(example);
        const origin = asString(nested.origin);
        if (origin) extras.push(origin);
        const primaryUsers = asString(nested.primary_users);
        if (primaryUsers) extras.push(`Used by ${primaryUsers}`);
        const pathway = asString(nested.pathway);
        if (pathway) extras.push(`${pathway} pathway`);

        if (description || extras.length > 0) {
            out.push({
                id: `${prefix}-${slug(parent)}-${slug(name) || out.length}`,
                kind,
                name,
                subtitle: parent,
                description,
                extra: extras,
            });
        }
        walkNamedLeaves(nested, name, kind, prefix, out);
    }
}

function flattenFood(raw: unknown): GrimoireWorldEntry[] {
    const guide = asRecord(asRecord(raw)?.guide);
    const out: GrimoireWorldEntry[] = [];
    walkNamedLeaves(guide?.foods, '', 'food', 'food', out);
    walkNamedLeaves(guide?.beverages, 'Beverage', 'food', 'drink', out);

    const slang = asRecord(guide?.drink_slang);
    if (slang) {
        for (const [key, value] of Object.entries(slang)) {
            const description = asString(value);
            if (!description) continue;
            out.push({
                id: `slang-${slug(key)}`,
                kind: 'food',
                name: titleCaseKey(key),
                subtitle: 'Drink slang',
                description,
                extra: [],
            });
        }
    }
    return out;
}

function flattenCurrency(raw: unknown): GrimoireWorldEntry[] {
    const root = asRecord(raw);
    const currencies = asRecord(root?.currencies);
    const out: GrimoireWorldEntry[] = [];
    if (currencies) {
        for (const [key, value] of Object.entries(currencies)) {
            const rec = asRecord(value);
            if (!rec) continue;
            const region = asString(rec.region) || titleCaseKey(key);
            const unit = asString(rec.primary_unit);
            const notes = asString(rec.notes);
            const extras: string[] = [];
            if (unit) extras.push(`Primary unit: ${titleCaseKey(unit)}`);
            const conversions = asRecord(rec.conversion_rates);
            if (conversions) {
                const bits = Object.entries(conversions)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => `${titleCaseKey(k)}: ${String(v)}`);
                if (bits.length) extras.push(bits.join(' · '));
            }
            out.push({
                id: `currency-${slug(key)}`,
                kind: 'currency',
                name: region,
                subtitle: unit ? titleCaseKey(unit) : '',
                description: notes,
                extra: extras,
            });
        }
    }
    const notes = Array.isArray(root?.notes) ? root.notes.map(asString).filter(Boolean) : [];
    if (notes.length) {
        out.push({
            id: 'currency-notes',
            kind: 'currency',
            name: 'Exchange notes',
            subtitle: '',
            description: notes[0] ?? '',
            extra: notes.slice(1),
        });
    }
    return out;
}

function flattenCreatures(raw: unknown): GrimoireWorldEntry[] {
    const root = asRecord(raw);
    const list = Array.isArray(root?.land_creatures) ? (root.land_creatures as RawCreature[]) : [];
    return list
        .map((item, index): GrimoireWorldEntry | null => {
            const name = asString(item?.name);
            if (!name) return null;
            const pathway = asString(item?.pathway);
            return {
                id: `creature-${slug(name) || index}`,
                kind: 'creatures',
                name,
                subtitle: pathway ? `${pathway} Pathway` : '',
                description: asString(item?.description),
                extra: [],
            };
        })
        .filter((row): row is GrimoireWorldEntry => row !== null);
}

function flattenLanguages(raw: unknown): GrimoireWorldEntry[] {
    const languages = asRecord(asRecord(raw)?.languages);
    const out: GrimoireWorldEntry[] = [];
    if (!languages) return out;
    walkNamedLeaves(languages.mystical_languages, 'Mystical', 'languages', 'lang-m', out);
    walkNamedLeaves(languages.common_languages, 'Common', 'languages', 'lang-c', out);
    return out;
}

function buildWorld(): GrimoireWorldCatalog {
    const continents = worldFile('/Geography/continents_realms.json');
    const nations = worldFile('/Geography/nations.json');
    const seas = worldFile('/Geography/seas_and_oceans.json');
    return {
        geography: [
            ...collectPlaces(continents, 'continents_and_realms', 'geography', 'geo-c'),
            ...collectPlaces(nations, 'major_nations_and_cities', 'geography', 'geo-n'),
            ...collectPlaces(seas, 'seas_and_oceans', 'geography', 'geo-s'),
        ],
        languages: flattenLanguages(worldFile('/Language/lotm_languages.json')),
        creatures: flattenCreatures(worldFile('/Creatures/list_creatures_general.json')),
        food: flattenFood(worldFile('/Food/lotm_food_beverage.json')),
        currency: flattenCurrency(worldFile('/Currency/lotm_currency.json')),
    };
}

export const LOTM_GRIMOIRE_VOLUMES: GrimoireVolume[] = buildVolumes();
export const LOTM_GRIMOIRE_EPOCHS: GrimoireEpoch[] = buildEpochs();
export const LOTM_GRIMOIRE_PATHWAYS: GrimoirePathwayLore[] = buildPathways();
export const LOTM_GRIMOIRE_CHURCHES: GrimoireChurch[] = buildChurches();
export const LOTM_GRIMOIRE_WORLD: GrimoireWorldCatalog = buildWorld();

export function matchesGrimoireQuery(text: string, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = text.toLowerCase();
    return q.split(/\s+/).every(part => hay.includes(part));
}

export function filterByGrimoireQuery<T>(items: T[], query: string, textOf: (item: T) => string): T[] {
    if (!query.trim()) return items;
    return items.filter(item => matchesGrimoireQuery(textOf(item), query));
}

export function volumeSearchText(volume: GrimoireVolume): string {
    return [volume.title, volume.book, volume.synopsis, volume.titleMeaning, `volume ${volume.number}`].join(' ');
}

export function epochSearchText(epoch: GrimoireEpoch): string {
    return [epoch.name, ...epoch.events.map(ev => ev.description)].join(' ');
}

export function pathwaySearchText(pathway: GrimoirePathwayLore): string {
    return [
        pathway.name,
        ...pathway.aliases,
        pathway.description,
        pathway.authority,
        pathway.tarotCard,
        ...pathway.sequences.map(s => s.name),
        ...pathway.gods.map(g => g.name),
    ].join(' ');
}

export function churchSearchText(church: GrimoireChurch): string {
    return [
        church.name,
        church.alsoCalled,
        church.godWorshiped,
        church.domain,
        church.extraDetails,
        ...church.pathways,
        ...church.beyonderTeams,
    ].join(' ');
}

export function worldEntrySearchText(entry: GrimoireWorldEntry): string {
    return [entry.name, entry.subtitle, entry.description, ...entry.extra].join(' ');
}
