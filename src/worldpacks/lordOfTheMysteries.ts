// Bundled world packs. Files live in Example_Setup (the canonical, user-editable
// location) and are inlined at build time with Vite's ?raw imports, so the pack
// works offline and needs no server route — the same bytes a manual file-pick
// would supply, handed to the campaign form as File objects.
import loreMd from '../../Example_Setup/World_compendium/Lord of the Mysteries/world_lore_lord_of_the_mysteries.md?raw';
import rulesMd from '../../Example_Setup/Ruleset/AI_GM_OS_LOTM_v1.md?raw';
import lootJson from '../../Example_Setup/World_compendium/Lord of the Mysteries/loot.json?raw';

export interface WorldPackFile {
    name: string;
    contents: string;
}

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
}

export function worldPackToFile(file: WorldPackFile): File {
    return new File([file.contents], file.name, { type: 'text/plain' });
}

export const LORD_OF_THE_MYSTERIES_PACK: WorldPack = {
    id: 'lord-of-the-mysteries',
    label: 'Lord of the Mysteries',
    description: 'Fifth Epoch Victorian occult — Beyonder potions, 22 pathways, Sealed Artifacts',
    suggestedName: 'Lord of the Mysteries',
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
};

/** Registry consumed by the New Campaign modal's Quick Start section. */
export const WORLD_PACKS: WorldPack[] = [LORD_OF_THE_MYSTERIES_PACK];
