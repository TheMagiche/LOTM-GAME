// generate-lotm-gameplay.mjs
//
// Rewrites three gameplay data files from the gamedata datasets so that
// progression follows Lord of the Mysteries lore: climbing a Beyonder pathway
// by gathering potion ingredients, bounties, mystical items, and Sealed
// Artifacts — not by XP.
//
// Inputs (read-only):
//   gamedata/assets/data/pathways/*/*_abilities*.json   — per-sequence abilities
//   gamedata/assets/data/pathways/*/*_advancement.json  — potion formulas + Acting Methods
//   gamedata/assets/data/pathways/*/*_pathway_overview.json — names/aliases/authority
//   gamedata/assets/data/items/*.json                   — weapons, mystical items,
//                                                        Sealed Artifacts (grades 0–3 + unique), medicines
//   gamedata/assets/data/characters/Bounties/lotm_bounties.json — canon bounty amounts
//
// Outputs:
//   mechanics/Ability Compendium/lotm_beyonder_pathways_compendium.json
//   mechanics/World_compendium/Lord of the Mysteries/loot.json
//   mechanics/World_compendium/Lord of the Mysteries/item_catalog.json

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATHWAYS_DIR = join(ROOT, 'gamedata/assets/data/pathways');
const ITEMS_DIR = join(ROOT, 'gamedata/assets/data/items');
const BOUNTIES_PATH = join(ROOT, 'gamedata/assets/data/characters/Bounties/lotm_bounties.json');
const COMPENDIUM_OUT = join(ROOT, 'mechanics/Ability Compendium/lotm_beyonder_pathways_compendium.json');
const LOOT_OUT = join(ROOT, 'mechanics/World_compendium/Lord of the Mysteries/loot.json');
const CATALOG_OUT = join(ROOT, 'mechanics/World_compendium/Lord of the Mysteries/item_catalog.json');

const readJson = p => JSON.parse(readFileSync(p, 'utf-8'));

// ---------------------------------------------------------------------------
// 1. Load pathways
// ---------------------------------------------------------------------------

function loadPathways() {
    const folders = readdirSync(PATHWAYS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.endsWith('_pathway'))
        .map(d => d.name);

    const pathways = [];
    for (const folder of folders) {
        const dir = join(PATHWAYS_DIR, folder);
        const id = folder.replace(/_pathway$/, '');
        const files = readdirSync(dir).filter(f => f.endsWith('.json'));

        const abilitiesFile = files.find(f => f.includes('abilities'));
        const advancementFile = files.find(f => f.includes('advancement'));
        const overviewFile = files.find(f => f.includes('overview'));

        const abilities = abilitiesFile ? readJson(join(dir, abilitiesFile)) : null;
        const advancement = advancementFile ? readJson(join(dir, advancementFile)) : null;
        const overview = overviewFile ? readJson(join(dir, overviewFile)) : null;

        const name =
            overview?.pathway_name ??
            abilities?.pathway ??
            advancement?.pathway ??
            `${id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')} Pathway`;

        const aliases = overview?.aliases ?? [];
        const authority = overview?.overview?.authority ?? '';
        const description = overview?.overview?.description ?? '';

        // Merge sequences: abilities give powers; advancement gives formula/method.
        const seqMap = new Map();
        for (const seq of abilities?.sequences ?? []) {
            seqMap.set(Number(seq.sequence), {
                sequence: Number(seq.sequence),
                name: String(seq.name ?? `Sequence ${seq.sequence}`),
                description: String(seq.description ?? ''),
                abilities: (seq.abilities ?? []).map(a =>
                    typeof a === 'string' ? a : `${a.name}: ${a.description}`
                ).filter(Boolean),
            });
        }
        for (const seq of advancement?.sequences ?? []) {
            const existing = seqMap.get(Number(seq.sequence)) ?? {
                sequence: Number(seq.sequence),
                name: String(seq.name ?? `Sequence ${seq.sequence}`),
                description: '',
                abilities: [],
            };
            existing.formula = seq.formula ?? null;
            existing.actingMethod = seq.acting_method && seq.acting_method !== 'No data available.'
                ? seq.acting_method : '';
            existing.potionOverview = seq.potion_overview ?? '';
            existing.backlash = seq.consumption_backlash && seq.consumption_backlash !== 'No data available.'
                ? seq.consumption_backlash : '';
            seqMap.set(Number(seq.sequence), existing);
        }

        const sequences = [...seqMap.values()].sort((a, b) => b.sequence - a.sequence);
        if (sequences.length === 0) continue;
        pathways.push({ id, name, aliases, authority, description, sequences });
    }
    return pathways.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// 2. Load items & bounties
// ---------------------------------------------------------------------------

function loadItems() {
    const weapons = readJson(join(ITEMS_DIR, 'beyonder_weapons.json')).items ?? [];
    const mysticalA = readJson(join(ITEMS_DIR, 'list_mystical_items..json')).items ?? [];
    const medicines = readJson(join(ITEMS_DIR, 'list_medicines.json')).items ?? [];
    const grades = {};
    for (const g of ['3', '2', '1', '0', 'unique']) {
        grades[g] = readJson(join(ITEMS_DIR, `list_sealed_artefact_grade_${g}.json`)).items ?? [];
    }
    return { weapons, mystical: mysticalA, medicines, grades };
}

function loadBounties() {
    const raw = readJson(BOUNTIES_PATH).bounties ?? {};
    const out = [];
    for (const [currency, groups] of Object.entries(raw)) {
        for (const [tier, list] of Object.entries(groups)) {
            for (const b of list ?? []) {
                out.push({
                    currency,
                    tier,
                    name: b.name,
                    alias: b.alias ?? '',
                    amount: b.amount ?? null,
                    status: b.status ?? 'active',
                    flagship: b.flagship ?? null,
                    affiliation: b.affiliation ?? null,
                    notes: b.notes ?? '',
                });
            }
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// 3. Compendium generation
// ---------------------------------------------------------------------------

const SEQUENCE_TIER = seq =>
    seq >= 9 ? 'Low Sequence' : seq >= 7 ? 'Mid Sequence' : seq >= 5 ? 'Mid Sequence' :
    seq >= 4 ? 'High Sequence — Saint' : seq >= 2 ? 'Angel' : 'True God';

const TIER_LABELS = {
    'Low Sequence': 'Low Sequence (9–8)',
    'Mid Sequence': 'Mid Sequence (7–5)',
    'High Sequence — Saint': 'Saint (4–3)',
    'Angel': 'Angel (2–1)',
    'True God': 'True God (0)',
};

function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function abilityEntry(pathway, seq, abilityText, index) {
    const shortName = abilityText.split(':')[0].trim();
    const detail = abilityText.includes(':') ? abilityText.slice(abilityText.indexOf(':') + 1).trim() : '';
    const tier = SEQUENCE_TIER(seq.sequence);
    return {
        id: `${pathway.id}-seq${seq.sequence}-${slug(shortName)}-${index}`,
        name: shortName,
        aliases: '',
        category: 'active',
        origin: 'lore-granted',
        description: detail || shortName,
        appearance: '',
        activation: 'Invoked by the Beyonder; costs a moment of focus.',
        costs: [{ resource: 'Spirituality', amount: '', timing: 'On use', condition: '' }],
        range: '',
        targets: '',
        duration: 'Instant unless sustained',
        area: '',
        effect: detail,
        outcomeGuidance: `Scale potency with the holder's Sequence (${seq.sequence} — ${seq.name}). At its own Sequence this is reliable; against higher Sequences treat it as contested or blunted.`,
        limitations: [],
        counters: ['Sealing suppresses this power outright.'],
        prerequisites: [
            `Swallow and digest the Sequence ${seq.sequence} potion: ${seq.name} (${pathway.name})`,
            ...(seq.formula ? [`Formula main ingredients: ${(seq.formula.main_ingredients ?? []).join('; ')}`] : []),
        ],
        interactionTags: [pathway.id],
        counterTags: ['beyonder'],
        sourceInventoryItemId: '',
        inventoryRequiresEquipped: false,
        loreCheckRequired: false,
        loreStatus: 'verified',
        loreCheckNotes: 'Generated from gamedata canonical dataset.',
        loreCheckedAt: Date.now(),
        masteryLadder: [],
        upgradeNodes: [],
        tags: [
            pathway.name,
            `${seq.name} (Sequence ${seq.sequence})`,
            TIER_LABELS[tier],
            'Beyonder',
        ],
        source: `Lord of the Mysteries — ${pathway.name}`,
        gmNotes: '',
        promptEnabled: true,
        createdAt: 0,
        updatedAt: 0,
    };
}

function foundationEntry(pathways) {
    return {
        id: 'lotm-beyonder-foundation',
        name: 'Beyonder Constitution (Foundation)',
        aliases: 'Beyonder powers, Sequence system',
        category: 'narrative-permission',
        origin: 'innate',
        description:
            'Anyone who drinks a Beyonder potion gains Spirituality (the fuel of ritual magic and Beyonder powers), Spirit Vision, danger intuition, and access to every ability of that Sequence. Power climbs by swallowing the next lower-numbered potion formula and fully digesting it — digestion is advanced by living out the Sequence\'s Acting Method, not by rest.',
        appearance: 'Beyonders read to Spirit Vision as layered auras; recent drinkers carry residual potion coloring. Losing control distorts body and mind toward the pathway\'s mythical-creature form.',
        activation: 'Always active from the moment the first potion is consumed.',
        costs: [],
        range: 'Self',
        targets: 'The Beyonder',
        duration: 'Persistent',
        area: '',
        effect: 'Establishes what every Beyonder can do without a separate ability: sense spirits and auras, power rituals with Spirituality, and advance along the 22 pathways. Advancement is an economy of acquisition: obtain the next formula, hunt its main ingredients (or the equivalent Beyonder Characteristic), brew, swallow, then digest via the Acting Method. Higher Sequences bend reality further but carry stronger madness pressure.',
        outcomeGuidance: 'Treat Sequence as the tiebreaker in any contest between Beyonders of different pathways: the lower-numbered Sequence usually wins, but preparation, Sealed Artifacts, and pathway counters can overturn it.',
        limitations: [
            'A Beyonder can never hold potions of two different pathways above Sequence 5 — divergence kills.',
            'Every use of power draws on finite Spirituality; an exhausted Beyonder is ordinary flesh.',
            'Acting against the Sequence\'s Acting Method stalls digestion and invites loss of control.',
        ],
        counters: [
            'Sealing (Sealed Artifacts, warded barriers) suppresses Beyonder powers outright.',
            'Advantage: a Beyonder who has lost control fights wildly and predictably — bait the rampage.',
            'Disrupting a ritual\'s ingredients, circle, or chanting aborts the working.',
        ],
        prerequisites: [
            'Acquire and drink a Sequence 9 potion of one of the 22 pathways (formula: main + supplementary ingredients).',
        ],
        interactionTags: ['beyonder'],
        counterTags: ['beyonder-suppression'],
        sourceInventoryItemId: '',
        inventoryRequiresEquipped: false,
        loreCheckRequired: false,
        loreStatus: 'verified',
        loreCheckNotes: 'Generated from gamedata canonical dataset.',
        loreCheckedAt: Date.now(),
        masteryLadder: [
            {
                id: 'low-sequence',
                name: 'Low Sequence (9–8)',
                requirements: 'Swallow a Sequence 9 potion, then acquire and swallow the Sequence 8 potion of the same pathway.',
                benefits: 'Baseline abilities of both Sequences; minor physical/spiritual enhancement.',
            },
            {
                id: 'mid-sequence',
                name: 'Mid Sequence (7–5)',
                requirements: 'Digest each lower potion via its Acting Method; obtain the next formula and its ingredients.',
                benefits: 'Reality-touching powers (illusions, curses, shapeshifting) become reliable.',
            },
            {
                id: 'saint',
                name: 'High Sequence — Saint (4–3)',
                requirements: 'Survive the potion\'s madness; master the Acting Method completely.',
                benefits: 'Saint-tier authority; near-immortal resilience; regional reputation.',
            },
            {
                id: 'angel',
                name: 'Angel (2–1)',
                requirements: 'Hold a Sequence uniqueness or a god\'s favor; withstand mythification.',
                benefits: 'Angelic authority over the pathway\'s domain; resurrection-grade powers.',
            },
            {
                id: 'true-god',
                name: 'True God (0)',
                requirements: 'Uniqueness of the pathway plus worship/faith infrastructure.',
                benefits: 'Godhood: the pathway\'s authority is absolute within its domain.',
            },
        ],
        upgradeNodes: [],
        tags: ['Beyonder', 'Foundation', 'Potion System'],
        source: 'Lord of the Mysteries',
        gmNotes: 'Edit this entry first: it is the constitution of Beyonder magic. Keep individual pathway abilities in their own entries; this one defines the shared rules (potions, digestion, Spirituality, loss of control).',
        promptEnabled: true,
        createdAt: 0,
        updatedAt: 0,
    };
}

function buildCompendium(pathways) {
    const abilities = [foundationEntry(pathways)];
    for (const pathway of pathways) {
        for (const seq of pathway.sequences) {
            (seq.abilities ?? []).forEach((text, i) => {
                abilities.push(abilityEntry(pathway, seq, text, i));
            });
        }
    }
    return {
        schemaVersion: 2,
        terminology: {
            originLabels: {
                innate: 'Innate',
                trained: 'Trained',
                spell: 'Spell',
                'item-granted': 'Inventory Power',
                'enemy-action': 'Enemy Action',
                'lore-granted': 'Potion-Granted',
                other: 'Other',
            },
            categoryLabels: {
                active: 'Active',
                passive: 'Passive',
                reaction: 'Reaction',
                sustained: 'Sustained',
                transformation: 'Transformation',
                summon: 'Summon',
                stance: 'Stance',
                ritual: 'Ritual',
                crafting: 'Crafting',
                'narrative-permission': 'Narrative Permission',
                other: 'Other',
            },
        },
        abilities,
    };
}

// ---------------------------------------------------------------------------
// 4. Loot tree generation
// ---------------------------------------------------------------------------

function itemPoolText(item, kindLabel) {
    const parts = [];
    parts.push(item.name || 'Unnamed relic');
    if (item.appearance) parts.push(item.appearance);
    if (item.function) parts.push(`power: ${item.function}`);
    if (item.downside) parts.push(`cost: ${item.downside}`);
    if (item.code) parts.push(`registry code ${item.code}`);
    return parts.join(' — ');
}

function buildLootTree(items, bounties) {
    const pools = {};

    pools.streetPool = [
        { text: 'a folded newspaper, yesterday\'s scandal half-read' },
        { text: 'a brass pocket-watch, stopped at an unlucky hour' },
        { text: 'a bundle of tallow candles, damp but usable' },
        { text: 'a silk top hat, crushed, worth rescuing' },
        { text: 'a fountain pen, good nib, engraved with someone else\'s initials' },
        { text: 'a tin of throat lozenges, mostly full' },
        { text: 'a railway third-class ticket, unused, last month\'s date' },
        { text: 'a leather glove, good quality, its pair long gone' },
        { text: 'a box of matches and a stub of pencil' },
        { text: 'a prayer card of the Evernight Goddess, worn smooth by thumbing' },
        { text: 'an ivory-handled shoehorn, absurdly fine for the alley it was found in' },
        { text: 'a bottle of laudanum, a quarter full, label peeling' },
        { text: 'a daguerreotype of a family whose faces have been scratched out' },
        { text: 'a coil of stout twine and three fishhooks' },
        { text: 'a police whistle, constable-issue' },
        { text: 'a paper-wrapped meat pie, still faintly warm, no questions asked' },
    ];

    pools.provisionsPool = [
        { text: 'a loaf of dark bread and a wedge of hard cheese' },
        { text: 'a jar of pickled herring, sealed' },
        { text: 'a tin of pressed tea leaves, strong black variety' },
        { text: 'a sack of oats, enough porridge for a week' },
        { text: 'a bottle of gin, tax-unpaid' },
        { text: 'a slab of salted bacon wrapped in cloth' },
        { text: 'a bag of roasted chestnuts, evening-warm' },
        { text: 'a pot of thick cream, ice-house chilled' },
        { text: 'a box of biscuits, ship\'s variety, indestructible' },
        { text: 'a string of onions and a bulb of garlic' },
        { text: 'a bottle of tonic water, physician-approved bitterness' },
        { text: 'half a fruitcake, brandied and therefore immortal' },
    ];

    pools.toolsPool = [
        { text: 'a crowbar, honest iron, slightly curved from honest work' },
        { text: 'a lockpick roll hidden in a coat seam' },
        { text: 'a magnifying glass, case-worn, lens clear' },
        { text: 'a signal lantern with a cracked but serviceable glass' },
        { text: 'a surgeon\'s scalpel, honed, unmarked by any registry' },
        { text: 'a coil of hemp rope, thirty feet, sound' },
        { text: 'a folding knife, horn handle, edge fresh' },
        { text: 'a sextant missing one screw but reading true' },
        { text: 'a chalk box for marking rituals — or hopscotch' },
        { text: 'a camera tripod, adjustable, brass fittings' },
        { text: 'a fire-damaged ledger with legible columns under the char' },
        { text: 'a set of jeweler\'s screwdrivers in a velvet fold' },
    ];

    pools.beyonderWeaponPool = items.weapons.map(w => ({
        text: itemPoolText(w, 'weapon'),
        tier: 3,
    }));

    pools.mysticalItemPool = items.mystical.map(m => ({
        text: itemPoolText(m, 'mystical'),
        tier: 4,
    }));

    pools.medicinePool = items.medicines.map(m => ({
        text: m.name +
            (m.ingredients_process ? ` — preparation: ${m.ingredients_process}` : '') +
            (m.description ? ` — effect: ${m.description}` : ''),
        tier: 1,
    }));

    pools.grade3Pool = items.grades['3'].map(i => ({ text: itemPoolText(i), tier: 5 }));
    pools.grade2Pool = items.grades['2'].map(i => ({ text: itemPoolText(i), tier: 6 }));
    pools.grade1Pool = items.grades['1'].map(i => ({ text: itemPoolText(i), tier: 7 }));
    pools.grade0Pool = items.grades['0'].map(i => ({ text: itemPoolText(i), tier: 8 }));
    pools.uniquePool = items.grades.unique.map(i => ({ text: itemPoolText(i), tier: 9 }));

    // Bounty ledger pool — each entry is a named bounty the party can claim.
    pools.bountyLedgerPool = bounties.map(b => ({
        text: [
            `BOUNTY: ${b.name}`,
            b.alias ? `"${b.alias}"` : '',
            b.flagship ? `flagship ${b.flagship}` : '',
            b.affiliation ? `of ${b.affiliation}` : '',
            b.amount != null ? `— reward ${b.amount.toLocaleString()} gold pounds` : '— reward negotiable',
            `(status: ${b.status})`,
        ].filter(Boolean).join(' '),
        tier: b.amount != null ? Math.min(9, Math.max(1, Math.floor(Math.log10(b.amount)))) : 5,
    }));

    // Potion ingredient pool — drawn from real advancement formulas across all pathways.
    const ingredientSet = new Set();
    for (const p of loadPathways()) {
        for (const s of p.sequences) {
            for (const ing of s.formula?.main_ingredients ?? []) ingredientSet.add(ing);
            for (const ing of s.formula?.supplementary_ingredients ?? []) ingredientSet.add(ing);
            if (s.formula?.alternative) ingredientSet.add(s.formula.alternative);
        }
    }
    pools.ingredientPool = [...ingredientSet].sort().map(t => ({ text: t, tier: 2 }));

    const nodes = {
        root: {
            kind: 'pick',
            axis: 'category',
            weights: {
                currency: 18,
                mundane: 22,
                medicine: 8,
                named: 16,
                uncanny: 14,
                artifact: 12,
                bounty: 6,
                formula: 4,
            },
            branches: {
                currency: 'currencyRarityPick',
                mundane: 'mundaneSubtypePick',
                medicine: 'medicineDraw',
                named: 'namedSubtypePick',
                uncanny: 'uncannySubtypePick',
                artifact: 'artifactGradePick',
                bounty: 'bountyTierPick',
                formula: 'formulaIngredientDraw',
            },
        },

        // --- currency -------------------------------------------------------
        currencyRarityPick: {
            kind: 'pick',
            axis: 'currencyRarity',
            weights: { small: 58, mid: 32, large: 10 },
            branches: {
                small: 'smallCurrencyTypePick',
                mid: 'midCurrencyTypePick',
                large: 'largeCurrencyTypePick',
            },
        },
        smallCurrencyTypePick: {
            kind: 'pick', axis: 'currencyType',
            weights: { pence: 70, soli: 30 },
            branches: { pence: 'penceSmallAmount', soli: 'soliSmallAmount' },
        },
        midCurrencyTypePick: {
            kind: 'pick', axis: 'currencyType',
            weights: { pence: 30, soli: 55, pounds: 15 },
            branches: { pence: 'penceMidAmount', soli: 'soliMidAmount', pounds: 'poundMidAmount' },
        },
        largeCurrencyTypePick: {
            kind: 'pick', axis: 'currencyType',
            weights: { soli: 45, pounds: 55 },
            branches: { soli: 'soliLargeAmount', pounds: 'poundLargeAmount' },
        },
        penceSmallAmount: { kind: 'amount', unit: 'pence', min: 3, max: 40, next: 'penceCompose' },
        penceMidAmount: { kind: 'amount', unit: 'pence', min: 40, max: 240, next: 'penceCompose' },
        penceCompose: { kind: 'compose', template: '{pence}' },
        soliSmallAmount: { kind: 'amount', unit: 'soli', min: 1, max: 8, next: 'soliCompose' },
        soliMidAmount: { kind: 'amount', unit: 'soli', min: 8, max: 20, next: 'soliCompose' },
        soliLargeAmount: { kind: 'amount', unit: 'soli', min: 20, max: 60, next: 'soliCompose' },
        soliCompose: { kind: 'compose', template: '{soli}' },
        poundMidAmount: { kind: 'amount', unit: 'gold pounds', min: 1, max: 5, next: 'poundCompose' },
        poundLargeAmount: { kind: 'amount', unit: 'gold pounds', min: 5, max: 40, next: 'poundCompose' },
        poundCompose: { kind: 'compose', template: '{gold pounds}' },

        // --- mundane --------------------------------------------------------
        mundaneSubtypePick: {
            kind: 'pick', axis: 'mundaneSubtype',
            weights: { street: 34, provisions: 33, tools: 33 },
            branches: { street: 'streetDraw', provisions: 'provisionsDraw', tools: 'toolsDraw' },
        },
        streetDraw: { kind: 'draw', draws: [{ pool: 'streetPool', as: 'item' }], next: 'plainCompose' },
        provisionsDraw: { kind: 'draw', draws: [{ pool: 'provisionsPool', as: 'item' }], next: 'plainCompose' },
        toolsDraw: { kind: 'draw', draws: [{ pool: 'toolsPool', as: 'item' }], next: 'plainCompose' },
        plainCompose: { kind: 'compose', template: '{item}' },

        // --- medicine ---------------------------------------------------------
        medicineDraw: {
            kind: 'draw', draws: [{ pool: 'medicinePool', as: 'item' }],
            next: 'medicineCompose',
        },
        medicineCompose: {
            kind: 'compose',
            template: '{item} (a prepared medicine or alchemical agent)',
        },

        // --- named gear -----------------------------------------------------
        namedSubtypePick: {
            kind: 'pick', axis: 'namedSubtype',
            weights: { weapon: 45, item: 55 },
            branches: { weapon: 'weaponDraw', item: 'mysticalDraw' },
        },
        weaponDraw: { kind: 'draw', draws: [{ pool: 'beyonderWeaponPool', as: 'item' }], next: 'weaponCompose' },
        weaponCompose: { kind: 'compose', template: '{item} (a Beyonder weapon — activation incantation required)' },
        mysticalDraw: { kind: 'draw', draws: [{ pool: 'mysticalItemPool', as: 'item' }], next: 'mysticalCompose' },
        mysticalCompose: { kind: 'compose', template: '{item} (a mystical item of uncertain provenance)' },

        // --- uncanny materials ----------------------------------------------
        uncannySubtypePick: {
            kind: 'pick', axis: 'uncannySubtype',
            weights: { ingredient: 62, characteristic: 38 },
            branches: { ingredient: 'ingredientDraw', characteristic: 'characteristicDraw' },
        },
        ingredientDraw: { kind: 'draw', draws: [{ pool: 'ingredientPool', as: 'item' }], next: 'ingredientCompose' },
        ingredientCompose: { kind: 'compose', template: '{item} (a potion or ritual ingredient a broker would pay for)' },
        characteristicDraw: { kind: 'draw', draws: [{ pool: 'characteristicPool', as: 'item' }], next: 'characteristicCompose' },
        characteristicCompose: { kind: 'compose', template: '{item} — a raw Beyonder characteristic; valuable, corrupting, and eagerly hunted' },

        // --- sealed artifacts -------------------------------------------------
        artifactGradePick: {
            kind: 'pick', axis: 'artifactGrade',
            weights: { g3: 52, g2: 30, g1: 12, g0: 5, unique: 1 },
            branches: { g3: 'grade3Draw', g2: 'grade2Draw', g1: 'grade1Draw', g0: 'grade0Draw', unique: 'uniqueDraw' },
        },
        grade3Draw: { kind: 'draw', draws: [{ pool: 'grade3Pool', as: 'item' }], next: 'grade3Compose' },
        grade3Compose: { kind: 'compose', template: '{item} (Sealed Artifact, Grade 3 — dangerous even sealed)' },
        grade2Draw: { kind: 'draw', draws: [{ pool: 'grade2Pool', as: 'item' }], next: 'grade2Compose' },
        grade2Compose: { kind: 'compose', template: '{item} (Sealed Artifact, Grade 2 — heavily restricted)' },
        grade1Draw: { kind: 'draw', draws: [{ pool: 'grade1Pool', as: 'item' }], next: 'grade1Compose' },
        grade1Compose: { kind: 'compose', template: '{item} (Sealed Artifact, Grade 1 — a city-level threat)' },
        grade0Draw: { kind: 'draw', draws: [{ pool: 'grade0Pool', as: 'item' }], next: 'grade0Compose' },
        grade0Compose: { kind: 'compose', template: '{item} (Sealed Artifact, Grade 0 — calamity; churches would burn a district to reclaim it)' },
        uniqueDraw: { kind: 'draw', draws: [{ pool: 'uniquePool', as: 'item' }], next: 'uniqueCompose' },
        uniqueCompose: { kind: 'compose', template: '{item} (Unique artifact — one of a kind; its loss would start a war)' },

        // --- bounties ----------------------------------------------------------
        bountyTierPick: {
            kind: 'pick', axis: 'bountyTier',
            weights: { crew: 55, admiral: 30, king: 15 },
            branches: { crew: 'bountyCrewDraw', admiral: 'bountyAdmiralDraw', king: 'bountyKingDraw' },
        },
        bountyCrewDraw: { kind: 'draw', draws: [{ pool: 'bountyLedgerPool', as: 'item', filterBy: 'bountyTier' }], next: 'bountyCompose' },
        bountyAdmiralDraw: { kind: 'draw', draws: [{ pool: 'bountyLedgerPool', as: 'item', filterBy: 'bountyTier' }], next: 'bountyCompose' },
        bountyKingDraw: { kind: 'draw', draws: [{ pool: 'bountyLedgerPool', as: 'item', filterBy: 'bountyTier' }], next: 'bountyCompose' },
        bountyCompose: {
            kind: 'compose',
            template: '{item} — posted on the church boards; claimable only with proof of kill or capture',
        },

        // --- advancement formula fragments ------------------------------------
        formulaIngredientDraw: {
            kind: 'draw', draws: [{ pool: 'ingredientPool', as: 'item' }],
            next: 'formulaCompose',
        },
        formulaCompose: {
            kind: 'compose',
            template: '{item} — a lead on a potion formula ingredient; brokers, cultists, and churches all pay for these',
        },
    };

    // Characteristic pool — synthesized from pathway mythical-creature themes.
    pools.characteristicPool = [
        { text: 'a crystallized low-sequence Beyonder Characteristic (unclaimed)' },
        { text: 'a cracked mid-sequence Characteristic still whispering its Acting Method' },
        { text: 'the residue of a Saint-tier Characteristic, hot to the touch' },
        { text: 'an Angel-grade Characteristic fragment, warping space around it' },
        { text: 'abomination Beyonder Characteristic' },
        { text: 'attendant of Mysteries Beyonder Characteristic' },
        { text: 'apocalypse Beyonder Characteristic' },
        { text: 'abyss Uniqueness (rumored)' },
        { text: 'black Emperor Uniqueness (rumored)' },
    ];

    return {
        root: 'root',
        sources: {
            'backlund-streets': { rolls: [2, 4] },
            docklands: { rolls: [2, 5] },
            tavern: { rolls: [2, 4] },
            'monster-hunt': { rolls: [2, 5] },
            'cult-lair': { rolls: [3, 6] },
            'church-vault': { rolls: [4, 8] },
            'ancient-ruins': { rolls: [3, 7] },
            'aristocrat-collection': { rolls: [3, 6] },
            'mystic-shop': { rolls: [2, 5] },
            'pirate-wreck': { rolls: [2, 5] },
            'bounty-office': { rolls: [1, 3] },
        },
        nodes,
        pools,
    };
}

// ---------------------------------------------------------------------------
// 5. Inventory ledger catalog
// ---------------------------------------------------------------------------

function catalogId(kind, item) {
    const key = item.code || item.name || 'unnamed';
    return `itm_${kind}_${slug(key)}`.slice(0, 80);
}

function catalogEntry(item, kind, extra = {}) {
    return {
        id: catalogId(kind, item),
        name: item.name || 'Unnamed relic',
        aliases: '',
        kind,
        grade: extra.grade || '',
        code: item.code || '',
        appearance: item.appearance || '',
        function: item.function || item.description || '',
        downside: item.downside || '',
        ingredients: item.ingredients_process || '',
        status: item.status || '',
        holder: '',
        locationTag: '',
        possessed: false,
        pathway: '',
        notes: '',
        firstSeenScene: '',
        lastSeenScene: '',
        source: 'catalog',
    };
}

function buildItemCatalog(items) {
    const out = [];
    const seen = new Set();
    const push = (entry) => {
        if (seen.has(entry.id)) {
            entry.id = `${entry.id}-${seen.size}`;
        }
        seen.add(entry.id);
        out.push(entry);
    };
    for (const w of items.weapons) push(catalogEntry(w, 'beyonder-weapon'));
    for (const m of items.mystical) push(catalogEntry(m, 'mystical-item'));
    for (const m of items.medicines) push(catalogEntry(m, 'medicine'));
    for (const g of ['3', '2', '1', '0', 'unique']) {
        for (const i of items.grades[g] ?? []) push(catalogEntry(i, 'sealed-artefact', { grade: g }));
    }
    return { schemaVersion: 1, items: out };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const pathways = loadPathways();
const items = loadItems();
const bounties = loadBounties();

console.log(`Loaded ${pathways.length} pathways, ` +
    `${items.weapons.length} weapons, ${items.mystical.length} mystical items, ` +
    `${items.medicines.length} medicines, ` +
    `sealed artifacts: g3=${items.grades['3'].length} g2=${items.grades['2'].length} ` +
    `g1=${items.grades['1'].length} g0=${items.grades['0'].length} unique=${items.grades.unique.length}, ` +
    `${bounties.length} bounties.`);

writeFileSync(COMPENDIUM_OUT, JSON.stringify(buildCompendium(pathways), null, 1) + '\n');
console.log(`Wrote ${COMPENDIUM_OUT}`);

writeFileSync(LOOT_OUT, JSON.stringify(buildLootTree(items, bounties), null, 1) + '\n');
console.log(`Wrote ${LOOT_OUT}`);

writeFileSync(CATALOG_OUT, JSON.stringify(buildItemCatalog(items), null, 1) + '\n');
console.log(`Wrote ${CATALOG_OUT}`);
