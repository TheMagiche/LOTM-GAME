// Bundled world packs. Files live in mechanics (the canonical, user-editable
// location) and are inlined at build time with Vite's ?raw imports, so the pack
// works offline and needs no server route — the same bytes a manual file-pick
// would supply, handed to the campaign form as File objects.
import loreMd from '../../mechanics/World_compendium/Lord of the Mysteries/world_lore_lord_of_the_mysteries.md?raw';
import rulesMd from '../../mechanics/Ruleset/AI_GM_OS_LOTM_v1.md?raw';
import lootJson from '../../mechanics/World_compendium/Lord of the Mysteries/loot.json?raw';
import starterMd from '../../mechanics/World_compendium/Lord of the Mysteries/lotm_starterPrompt.md?raw';
import type { CampaignUiSkin, PlayerCharacter } from '../types';
import { formatLotmPathwayLabel } from './lotmPathways';

const peopleRaw = import.meta.glob(
    '../../mechanics/World_compendium/Lord of the Mysteries/people/lotm_pc_*.json',
    { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

export interface WorldPackFile {
    name: string;
    contents: string;
}

export type PlayablePcOption = {
    id: string;
    name: string;
    pathway: string;
    sequence: number;
    subtitle: string;
    region?: string;
    file: WorldPackFile;
};

export interface WorldPack {
    id: string;
    label: string;
    /** One-line pitch shown on the Quick Start button. */
    description: string;
    /** Pre-fills the campaign name field when it is empty. */
    suggestedName: string;
    lore: WorldPackFile;
    rules: WorldPackFile;
    loot: WorldPackFile;
    starter?: WorldPackFile;
    /** Sequence 9 starter roster (one per pathway). */
    playablePcs?: PlayablePcOption[];
    /** Fallback / default starter PC (Clara). */
    defaultPc?: WorldPackFile;
    uiSkin?: CampaignUiSkin;
    coverAssetPath?: string;
}

export function worldPackToFile(file: WorldPackFile): File {
    return new File([file.contents], file.name, { type: 'text/plain' });
}

export function parsePlayablePc(raw: string): PlayerCharacter | null {
    try {
        const parsed = JSON.parse(raw) as unknown;
        const row = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!row || typeof row !== 'object') return null;
        return row as PlayerCharacter;
    } catch {
        return null;
    }
}

function fileNameFromPath(path: string): string {
    return path.split('/').pop() || 'pc.json';
}

function buildPlayablePcs(files: Record<string, string>): PlayablePcOption[] {
    const out: PlayablePcOption[] = [];
    for (const [path, contents] of Object.entries(files)) {
        const row = parsePlayablePc(contents);
        if (!row?.name) continue;
        const pathway = row.signatureKit?.pathway ?? '';
        const sequence = typeof row.signatureKit?.sequence === 'number' ? row.signatureKit.sequence : 9;
        out.push({
            id: row.id || fileNameFromPath(path).replace(/\.json$/, ''),
            name: row.name,
            pathway,
            sequence,
            subtitle: formatLotmPathwayLabel(pathway, sequence) || row.pcMeta?.archetype || '',
            region: row.region,
            file: { name: fileNameFromPath(path), contents },
        });
    }
    return out.sort((a, b) => a.subtitle.localeCompare(b.subtitle) || a.name.localeCompare(b.name));
}

export const LOTM_PLAYABLE_PCS: PlayablePcOption[] = buildPlayablePcs(peopleRaw);

export const DEFAULT_PLAYABLE_PC_ID =
    LOTM_PLAYABLE_PCS.find(pc => pc.pathway === 'fool')?.id
    ?? LOTM_PLAYABLE_PCS[0]?.id
    ?? '';

const claraFile = LOTM_PLAYABLE_PCS.find(pc => pc.id === DEFAULT_PLAYABLE_PC_ID)?.file;

export const LORD_OF_THE_MYSTERIES_PACK: WorldPack = {
    id: 'lord-of-the-mysteries',
    label: 'Lord of the Mysteries',
    description: 'Fifth Epoch Victorian occult — Beyonder potions, 22 pathways, Sealed Artifacts',
    suggestedName: 'Lord of the Mysteries',
    uiSkin: 'lotm-illustrated',
    coverAssetPath: 'image/cover.webp',
    lore: {
        name: 'world_lore_lord_of_the_mysteries.md',
        contents: loreMd,
    },
    rules: {
        name: 'AI_GM_OS_LOTM_v1.md',
        contents: rulesMd,
    },
    loot: {
        name: 'loot.json',
        contents: lootJson,
    },
    starter: {
        name: 'lotm_starterPrompt.md',
        contents: starterMd,
    },
    playablePcs: LOTM_PLAYABLE_PCS,
    defaultPc: claraFile,
};

/** Registry consumed by the New Campaign modal's Quick Start section. */
export const WORLD_PACKS: WorldPack[] = [LORD_OF_THE_MYSTERIES_PACK];
