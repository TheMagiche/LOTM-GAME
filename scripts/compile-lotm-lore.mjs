#!/usr/bin/env node
/**
 * Concatenate LOTM lore author sources into the compiled markdown the RAG
 * pipeline / README / tests import as a single file.
 *
 *   node scripts/compile-lotm-lore.mjs
 *
 * One-shot split + enrich from the compiled file (only if lore/ is empty):
 *
 *   node scripts/compile-lotm-lore.mjs --from-compiled
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOTM_DIR = join(ROOT, 'mechanics/World_compendium/Lord of the Mysteries');
const LORE_DIR = join(LOTM_DIR, 'lore');
const COMPILED = join(LOTM_DIR, 'world_lore_lord_of_the_mysteries.md');
const DEMO = join(LOTM_DIR, 'demo_world_lore_lord_of_the_mysteries.md');

export const LOTM_LORE_PART_FILES = [
    'overview.md',
    'factions.md',
    'locations.md',
    'characters_gameplay.md',
    'power_economy_events.md',
    'engine_seeds.md',
];

export function concatenateLotmLore(parts) {
    return parts
        .map(part => String(part).replace(/\s+$/g, ''))
        .filter(part => part.length > 0)
        .join('\n\n') + '\n';
}

const REQUIRED_CHAR_FIELDS = [
    'Aliases', 'Appearance', 'Disposition', 'Personality', 'Voice', 'Status',
    'Faction', 'Goals', 'StoryRelevance', 'Example Output', 'Affinity',
];

const FACTION_EXTRAS = {
    'Church of the Evernight Goddess': {
        Region: 'Loen Kingdom (Winter County cathedral; chantries in every major city)',
        Status: 'Active',
        Aliases: 'Nighthawks, Church of Evernight, Red Gloves',
        OpposedTo: 'Church of the God of Combat, Church of the Eternal Blazing Sun',
    },
    'Church of the Lord of Storms': {
        Region: 'Rorsted Archipelago; Loen coastal cities',
        Status: 'Active',
        Aliases: 'Mandated Punishers, Storm Church',
        OpposedTo: 'Church of the Eternal Blazing Sun, Church of the God of Knowledge and Wisdom',
    },
    'Church of the God of Combat': {
        Region: 'Feysac Empire (Great Twilight Hall near Saint Millom)',
        Status: 'Active',
        Aliases: 'Twilight Giant Church, Combat Church',
        OpposedTo: 'Church of the Evernight Goddess',
    },
    'Church of the God of Steam and Machinery': {
        Region: 'Backlund factory districts; Loen industrial cities',
        Status: 'Active',
        Aliases: 'Mechanical Heart, Steam Church',
        AlliedWith: 'Church of the God of Knowledge and Wisdom',
    },
    'Church of the God of Knowledge and Wisdom': {
        Region: 'Lenburg, Segar, Masin',
        Status: 'Active',
        Aliases: 'White Tower Church, Knowledge Church',
        OpposedTo: 'Church of the Lord of Storms, Church of the Eternal Blazing Sun',
        AlliedWith: 'Church of the God of Steam and Machinery',
    },
    'Church of the Eternal Blazing Sun': {
        Region: 'Intis Republic and southern colonies',
        Status: 'Active',
        Aliases: 'Sun Church, Inquisition',
        OpposedTo: 'Church of the Evernight Goddess, Church of the Lord of Storms, Church of the God of Knowledge and Wisdom',
    },
    'Church of the Earth Mother': {
        Region: 'Feynapotter Kingdom and rural Loen',
        Status: 'Active',
        Aliases: 'Fertility Order, Mother Church',
        AlliedWith: 'Sanguines, House Castiya (Feynapotter Royal Family)',
    },
    'Inter-Church Politics & Jurisdiction': {
        Region: 'Northern Continent (all orthodox territories)',
        Status: 'Active',
        Aliases: 'the Seven Churches',
    },
    'Aurora Order': {
        Region: 'Intis Republic; cells across Loen',
        Status: 'Active',
        Aliases: 'Aurora Society',
        OpposedTo: 'Church of the Eternal Blazing Sun, Church of the Evernight Goddess',
        AlliedWith: 'House Sauron (Intis Republic)',
    },
    'Psychology Alchemists': {
        Region: 'Backlund; Loen high society',
        Status: 'Active',
        Aliases: 'Spectator Circle',
        AlliedWith: 'Church of the Evernight Goddess',
    },
    'Element Dawn': {
        Region: 'Northern Continent universities',
        Status: 'Active',
        Aliases: 'Savants of Dawn',
    },
    'Theosophy Order': {
        Region: 'Scattered Door-pathway lodges',
        Status: 'Active',
        AlliedWith: 'Tamara Family',
    },
    'Moses Ascetic Order': {
        Region: 'Hidden hermitages; Spirit World approaches',
        Status: 'Active',
        Aliases: 'Hermit Order',
    },
    'Life School of Thought': {
        Region: 'Nomadic; fate-reading circles',
        Status: 'Active',
        Aliases: 'Wheel of Fortune school',
    },
    'Rose School of Thought': {
        Region: 'Southern Continent; hidden Loen cells',
        Status: 'Active',
        Aliases: 'Indulgence Faction, Temperance Faction',
        OpposedTo: 'Church of the Evernight Goddess, Church of the Eternal Blazing Sun',
        AlliedWith: 'The True Creator',
    },
    'Demoness Sect': {
        Region: 'Hidden; urban misfortune networks',
        Status: 'Active',
        AlliedWith: 'Demoness Family',
        OpposedTo: 'Church of the Eternal Blazing Sun',
    },
    'Secret Order': {
        Region: 'Scattered Antigonus relics; Loen and Intis',
        Status: 'Active',
        AlliedWith: 'Zaratul Family, Antigonus Family',
        OpposedTo: 'Church of the Evernight Goddess',
    },
    'Tarot Club': {
        Region: 'Gray fog above the Spirit World',
        Status: 'Active',
        Aliases: 'the Fool\'s gathering',
    },
    'House Augustus (Loen Royal Family)': {
        Region: 'Backlund (Loen palace)',
        Status: 'Active',
        Aliases: 'Loen Royal Family, Augustus',
        AlliedWith: 'Church of the Evernight Goddess',
        OpposedTo: 'House Einhorn (Feysac Imperial Family)',
    },
    'House Einhorn (Feysac Imperial Family)': {
        Region: 'Saint Millom, Feysac Empire',
        Status: 'Active',
        Aliases: 'Feysac Imperial Family, Einhorn',
        AlliedWith: 'Church of the God of Combat',
        OpposedTo: 'House Augustus (Loen Royal Family)',
    },
    'House Castiya (Feynapotter Royal Family)': {
        Region: 'Feynapotter City',
        Status: 'Active',
        Aliases: 'Castiya',
        AlliedWith: 'Church of the Earth Mother',
    },
    'House Sauron (Intis Republic)': {
        Region: 'Trier, Intis Republic',
        Status: 'Active',
        Aliases: 'Sauron',
        AlliedWith: 'Aurora Order',
        OpposedTo: 'Church of the Eternal Blazing Sun',
    },
    'Antigonus Family': {
        Region: 'Relics scattered; Hornacis / Tingen traces',
        Status: 'Mostly extinct; legacy active',
        Aliases: 'the Half-Fool\'s line',
        AlliedWith: 'Secret Order',
        OpposedTo: 'Church of the Evernight Goddess',
    },
    'Tudor Family': {
        Region: 'Historical; Northern Continent ruins',
        Status: 'Extinct (main line)',
        OpposedTo: 'Trunsoest Family, Solomon Family',
    },
    'Solomon Family': {
        Region: 'Hidden remnants',
        Status: 'Mostly extinct',
        Aliases: 'Solomon Empire remnants',
    },
    'Amon Family': {
        Region: 'Everywhere and nowhere',
        Status: 'Active (weakened)',
        Aliases: 'the Blasphemer\'s house',
        AlliedWith: 'Jacob Family',
        OpposedTo: 'Church of the Evernight Goddess',
    },
    'Jacob Family': {
        Region: 'Margins of the Beyonder world',
        Status: 'Active (diminished)',
        AlliedWith: 'Amon Family',
    },
    'Zaratul Family': {
        Region: 'Secret Order lodges',
        Status: 'Active (weakened)',
        AlliedWith: 'Secret Order',
    },
    'Abraham Family': {
        Region: 'Scattered by curse',
        Status: 'Active (cursed)',
        Aliases: 'Door wanderers',
        AlliedWith: 'Tarot Club',
    },
    'Tamara Family': {
        Region: 'Split lodges; Mirror World approaches',
        Status: 'Active (fractured)',
        AlliedWith: 'Theosophy Order',
    },
    'Trunsoest Family': {
        Region: 'Historical; ancestral to modern thrones',
        Status: 'Extinct (main line)',
    },
    'Eggers Family': {
        Region: 'Tingen; Underworld approaches',
        Status: 'Active',
        AlliedWith: 'Church of the Evernight Goddess',
    },
    'Sanguines': {
        Region: 'Feynapotter; Earth Mother parishes',
        Status: 'Active',
        Aliases: 'vampire clans, Moon kin',
        AlliedWith: 'Church of the Earth Mother',
    },
    'Nois Family (and Devil Vassals Andariel & Beria)': {
        Region: 'Abyss-facing underworld',
        Status: 'Active',
        Aliases: 'House Nois, Andariel, Beria',
        OpposedTo: 'Church of the Eternal Blazing Sun, Church of the Evernight Goddess',
    },
    'Demoness Family': {
        Region: 'Hidden; urban calamity networks',
        Status: 'Active (reorganized as sect)',
        AlliedWith: 'Demoness Sect',
    },
};

const CHAR_EXTRAS = {
    'Klein Moretti': {
        PersonalityHex: 'drive:+2, diligence:+2, boldness:+1, warmth:+1, empathy:+2, composure:+1',
        Traits: '[secretive, curious, pragmatic, loyal]',
        CoreWant: 'remain human at the end of the Fool\'s pathway',
        WantsShort: '[read, reminisce, tidy]',
        WantsMedium: '[protect Melissa, keep identities separate]',
        HardBoundaries: '[will not abandon family, will not casually sacrifice innocents]',
    },
    'Audrey Hall': {
        PersonalityHex: 'drive:+1, diligence:+1, boldness:+1, warmth:+3, empathy:+3, composure:+1',
        Traits: '[curious, generous, loyal, honorable]',
        CoreWant: 'help without becoming a Spectator who only watches',
        WantsShort: '[socialize casually, read]',
        WantsMedium: '[keep the Tarot Club alive, protect her family]',
    },
    'Alger Wilson': {
        PersonalityHex: 'drive:+2, diligence:+1, boldness:+1, warmth:-1, empathy:-1, composure:+2',
        Traits: '[pragmatic, secretive, opportunistic]',
        CoreWant: 'stand somewhere no god is watching',
        WantsShort: '[wander, drink]',
        WantsMedium: '[secure a ship, hedge church against pirate]',
    },
    'Dunn Smith': {
        PersonalityHex: 'drive:+1, diligence:+3, boldness:+1, warmth:+2, empathy:+2, composure:+2',
        Traits: '[loyal, protective, honorable]',
        CoreWant: 'bring every rookie home alive',
        WantsShort: '[pray, rest, tidy]',
        WantsMedium: '[keep Tingen quiet, train new Nighthawks]',
        HardBoundaries: '[will not abandon a teammate, will not hide a loss of control]',
        SoftBoundaries: '[dislikes paperwork about the dead, dislikes sending rookies alone]',
        BehavioralTriggers: '[losing control:goes still and issues orders, memorial book:voice drops]',
    },
    'Leonard Mitchell': {
        PersonalityHex: 'drive:+1, diligence:-1, boldness:+1, warmth:+2, empathy:+1, composure:-1',
        Traits: '[loyal, eccentric, secretive]',
        CoreWant: 'survive the voice in his dreams without becoming it',
        WantsShort: '[read, socialize casually, daydream]',
        WantsMedium: '[protect Dunn\'s squad, understand Pallez]',
        BehavioralTriggers: '[Pallez:goes wry and listens inward, Dunn:drops the jokes]',
    },
    'Zaratul': {
        PersonalityHex: 'drive:+2, diligence:+2, boldness:+1, warmth:-2, empathy:-2, composure:+3',
        Traits: '[scheming, secretive, ruthless]',
        CoreWant: 'recover the Antigonus uniqueness',
    },
    'Amon': {
        PersonalityHex: 'drive:+2, diligence:+1, boldness:+3, warmth:-1, empathy:-3, composure:+2',
        Traits: '[opportunistic, treacherous, eccentric]',
        CoreWant: 'steal whatever is most interesting, including you',
        BehavioralTriggers: '[monocle:smiles wider, Fool:becomes genuinely curious]',
    },
    'Adam': {
        PersonalityHex: 'drive:+3, diligence:+3, boldness:+1, warmth:+1, empathy:-1, composure:+3',
        Traits: '[scheming, secretive, authoritarian]',
        CoreWant: 'complete the script he has already written',
    },
    'Azik Eggers': {
        PersonalityHex: 'drive:+1, diligence:+2, boldness:-1, warmth:+1, empathy:+2, composure:+2',
        Traits: '[honorable, secretive, protective]',
        CoreWant: 'settle ancestral debts without devouring another generation',
        WantsShort: '[read, reminisce]',
        WantsMedium: '[protect students, remember who he was]',
    },
    'Roselle Gustav': {
        PersonalityHex: 'drive:+3, diligence:+1, boldness:+3, warmth:+2, empathy:0, composure:-1',
        Traits: '[ambitious, proud, eccentric]',
        CoreWant: 'leave a world that can read his diary and survive it',
    },
    'Will Auceptin': {
        PersonalityHex: 'drive:+1, diligence:+1, boldness:-1, warmth:+2, empathy:+2, composure:+3',
        Traits: '[secretive, curious, opportunistic]',
        CoreWant: 'grow up again and settle an older account',
    },
    'Fors Wall': {
        PersonalityHex: 'drive:+2, diligence:+1, boldness:+1, warmth:+1, empathy:+1, composure:0',
        Traits: '[mercenary, pragmatic, ambitious]',
        CoreWant: 'financial security before her luck runs out',
        WantsShort: '[read, snack]',
        WantsMedium: '[finish a manuscript, stay solvent]',
    },
    'Xio Derecha': {
        PersonalityHex: 'drive:+2, diligence:+3, boldness:+2, warmth:0, empathy:+1, composure:+1',
        Traits: '[honorable, stubborn, protective]',
        CoreWant: 'cure her bloodline and close every case she opens',
        WantsShort: '[train casually, tidy]',
        WantsMedium: '[collect a bounty, buy medicine]',
        HardBoundaries: '[will not take a bribe to drop a case]',
    },
    'The Evernight Goddess': {
        Disposition: 'Patient, concealing, merciful at a distance.',
        Voice: 'Silence, moonlight, a woman\'s whisper that might be wind.',
        Goals: 'Keep the night\'s children alive long enough to choose their own endings.',
        'Example Output': '"Sleep. What hunts you cannot find you in my dark."',
        Affinity: '50',
        PersonalityHex: 'drive:+2, diligence:+3, boldness:0, warmth:+1, empathy:+2, composure:+3',
        Traits: '[protective, secretive, ritual-bound]',
        CoreWant: 'conceal what must not yet be seen',
        Tier: 'recurring',
    },
    'The Lord of Storms': {
        Disposition: 'Proud, jealous, magnificent in wrath.',
        Voice: 'Thunder given words; oaths spoken like sentences.',
        Goals: 'Bind sailors to his name and punish blasphemy with weather.',
        'Example Output': '"You swore. The sea remembers. So do I."',
        Affinity: '50',
        PersonalityHex: 'drive:+2, diligence:+2, boldness:+3, warmth:-1, empathy:0, composure:-1',
        Traits: '[proud, oath-bound, territorial]',
        Tier: 'recurring',
    },
    'The God of Combat': {
        Disposition: 'Martial, honor-bound, contemptuous of cowardice.',
        Voice: 'Marching cadence; short declarations that sound like orders.',
        Goals: 'See glory earned in battle and Feysac\'s armies blessed.',
        'Example Output': '"If you will not fight, kneel. If you will fight, stand where I can see you."',
        Affinity: '50',
        PersonalityHex: 'drive:+2, diligence:+2, boldness:+3, warmth:0, empathy:0, composure:+1',
        Traits: '[honorable, proud, competitive]',
        Tier: 'recurring',
    },
    'The God of Steam and Machinery': {
        Disposition: 'Methodical, pragmatic, jealous of mechanical truth.',
        Voice: 'Measured, technical, impatient with miracles that skip the diagram.',
        Goals: 'Keep industry as covenant and unauthorized machinery sealed.',
        'Example Output': '"Invention is prayer with better tolerances. Do not skip the proof."',
        Affinity: '50',
        PersonalityHex: 'drive:+2, diligence:+3, boldness:0, warmth:-1, empathy:0, composure:+2',
        Traits: '[pragmatic, secretive, obsessive]',
        Tier: 'recurring',
    },
    'The Eternal Blazing Sun': {
        Disposition: 'Righteous, purifying, intolerant of the unclean.',
        Voice: 'Bright, absolute, leaving no shade for argument.',
        Goals: 'Burn corruption from congregation and colony alike.',
        'Example Output': '"Light does not negotiate with rot."',
        Affinity: '50',
        PersonalityHex: 'drive:+2, diligence:+2, boldness:+2, warmth:-1, empathy:-1, composure:+2',
        Traits: '[fanatical, honorable, authoritarian]',
        Tier: 'recurring',
    },
    'Lilith (The Earth Mother)': {
        Disposition: 'Gentle, fertile, quietly ancient.',
        Voice: 'Warm as a harvest blessing; the Moon aspect is quieter and colder.',
        Goals: 'Keep birth, harvest, and blood-tides in covenant.',
        'Example Output': '"Eat. Rest. The field will still be here at dawn — if you are."',
        Affinity: '50',
        PersonalityHex: 'drive:+1, diligence:+2, boldness:0, warmth:+3, empathy:+2, composure:+2',
        Traits: '[protective, generous, ritual-bound]',
        Tier: 'recurring',
    },
    'The God of Knowledge and Wisdom': {
        Disposition: 'Orderly, curious, dispassionate.',
        Voice: 'Archivist calm; questions filed, never forgotten.',
        Goals: 'See every truth written down, including the ones that should not be read.',
        'Example Output': '"Ask. I will answer. Whether you should have asked is a separate record."',
        Affinity: '50',
        PersonalityHex: 'drive:+2, diligence:+3, boldness:0, warmth:-1, empathy:0, composure:+3',
        Traits: '[curious, secretive, obsessive]',
        Tier: 'recurring',
    },
    'The True Creator': {
        Disposition: 'Corrupting, liberating, hungry for surrender.',
        Voice: 'A choir that does not agree with itself.',
        Goals: 'Free humanity from restraint by devouring the self that restrains.',
        'Example Output': '"You already wanted this. I am only honest about it."',
        Affinity: '50',
        PersonalityHex: 'drive:+3, diligence:0, boldness:+2, warmth:+1, empathy:-3, composure:-2',
        Traits: '[fanatical, depraved, manipulative]',
        Tier: 'recurring',
    },
};

function firstSentence(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const match = clean.match(/^[^.!?]+[.!?]?/);
    return (match ? match[0] : clean).trim();
}

function inferTraits(blob) {
    const text = blob.toLowerCase();
    const hits = [];
    const rules = [
        ['loyal', /loyal|devoted|teammate|squad/],
        ['secretive', /secret|hidden|covert|conceal/],
        ['pragmatic', /pragmatic|practical|transaction/],
        ['curious', /curious|research|archiv/],
        ['ambitious', /ambitious|advance|sequence/],
        ['honorable', /honor|principled|oath/],
        ['protective', /protect|guardian|keep .* alive/],
        ['scheming', /scheme|arrang|design for humanity/],
        ['proud', /proud|jealous|magnificent/],
        ['stubborn', /stubborn|relentless/],
        ['eccentric', /eccentric|poet|joke/],
        ['mercenary', /money-motivated|bounty|soli/],
        ['ruthless', /ruthless|amoral|corpses/],
        ['opportunistic', /hedge|useful|opportun/],
        ['authoritarian', /absolute|intolerant|authorit/],
        ['ritual-bound', /ritual|prayer|acting method/],
        ['fanatical', /zealot|fanatic|heresy/],
        ['oath-bound', /oath|bind/],
    ];
    for (const [trait, re] of rules) {
        if (re.test(text) && !hits.includes(trait)) hits.push(trait);
        if (hits.length >= 4) break;
    }
    return hits.length ? `[${hits.join(', ')}]` : '[secretive, pragmatic]';
}

function inferHex(blob) {
    const text = blob.toLowerCase();
    const hex = { drive: 1, diligence: 1, boldness: 0, warmth: 0, empathy: 0, composure: 1 };
    if (/cautious|methodical|archiv/.test(text)) hex.diligence += 1;
    if (/brave|wrath|warrior|bold/.test(text)) hex.boldness += 2;
    if (/kind|gentle|empath|mercy/.test(text)) { hex.warmth += 2; hex.empathy += 2; }
    if (/amoral|ruthless|corrupt/.test(text)) { hex.empathy -= 2; hex.warmth -= 1; }
    if (/serene|patient|calm/.test(text)) hex.composure += 1;
    if (/playful|flippant|joke/.test(text)) hex.composure -= 1;
    if (/ambitious|conquer|advance/.test(text)) hex.drive += 1;
    const clamp = n => Math.max(-3, Math.min(3, n));
    return Object.entries(hex).map(([k, v]) => `${k}:${clamp(v) >= 0 ? '+' : ''}${clamp(v)}`).join(', ');
}

function parseNamedFields(body) {
    const fields = new Map();
    const other = [];
    for (const line of body.split('\n')) {
        const standard = line.match(/^\*\*([^:*]+):\*\*\s*(.*)$/);
        const compact = line.match(/^\*\*([^:*]+):\s*(.+?)\*\*\s*$/);
        const match = standard || compact;
        if (match) {
            const key = match[1].trim();
            const canonical = key === 'Alias' ? 'Aliases' : key;
            if (!fields.has(canonical)) fields.set(canonical, match[2].trim());
        } else {
            other.push(line);
        }
    }
    return { fields, other };
}

function enrichFactionBlock(header, body) {
    const name = header.replace(/^FACTION\s+[—–-]\s*/, '').trim();
    const extras = FACTION_EXTRAS[name] || {};
    const { fields, other } = parseNamedFields(body);
    for (const [key, value] of Object.entries(extras)) {
        if (!fields.has(key)) fields.set(key, value);
    }
    if (!fields.has('Status')) fields.set('Status', 'Active');
    const preferred = ['Type', 'Key Members', 'Stance', 'Region', 'Status', 'Aliases', 'Pathways', 'AlliedWith', 'OpposedTo'];
    const lines = [];
    for (const key of preferred) {
        if (fields.has(key)) {
            lines.push(`**${key}:** ${fields.get(key)}`);
            fields.delete(key);
        }
    }
    for (const [key, value] of fields) lines.push(`**${key}:** ${value}`);
    const rest = other.join('\n').trim();
    return [lines.join('\n'), rest].filter(Boolean).join('\n');
}

function enrichLocationBlock(header, body) {
    const { fields, other } = parseNamedFields(body);
    const paren = header.match(/\(([^()]+)\)\s*$/);
    const region = paren ? paren[1].trim() : '';
    if (!fields.has('ConnectedTo') && region) {
        const guesses = {
            'Fifth Epoch civilization': 'Loen Kingdom, Intis Republic, Feysac Empire, Sonia Sea',
            'highest plane': 'Spirit World',
        };
        const target = guesses[region] || region;
        fields.set('ConnectedTo', `[${target}]`);
    }
    const preferred = ['Type', 'Status', 'Aliases', 'Features', 'ConnectedTo', 'BroadLocation', 'Description'];
    const lines = [];
    for (const key of preferred) {
        if (fields.has(key)) {
            lines.push(`**${key}:** ${fields.get(key)}`);
            fields.delete(key);
        }
    }
    for (const [key, value] of fields) lines.push(`**${key}:** ${value}`);
    const rest = other.join('\n').trim();
    return [lines.join('\n'), rest].filter(Boolean).join('\n');
}

function enrichCharacterBlock(header, body) {
    const name = header.replace(/^CHARACTER\s+[—–-]\s*/, '').trim();
    const extras = CHAR_EXTRAS[name] || {};
    const { fields, other } = parseNamedFields(body);
    for (const [key, value] of Object.entries(extras)) {
        if (!fields.has(key)) fields.set(key, value);
    }

    const prose = other.join(' ').replace(/\s+/g, ' ').trim();
    const summary = fields.get('Summary') || prose;
    const personality = fields.get('Personality') || fields.get('Disposition') || summary;

    if (!fields.has('Aliases')) fields.set('Aliases', 'none');
    if (!fields.has('Appearance')) {
        fields.set('Appearance', firstSentence(summary) || `A figure known in Beyonder circles as ${name}.`);
    }
    if (!fields.has('Disposition')) {
        fields.set('Disposition', firstSentence(personality) || 'Guarded, purposeful.');
    }
    if (!fields.has('Personality')) {
        fields.set('Personality', firstSentence(summary) || fields.get('Disposition'));
    }
    if (!fields.has('Voice')) {
        fields.set('Voice', 'Measured; reveals only what the scene requires.');
    }
    if (!fields.has('Status')) fields.set('Status', 'Alive');
    if (!fields.has('Faction')) fields.set('Faction', 'Unknown');
    if (!fields.has('Goals')) {
        fields.set('Goals', fields.get('StoryRelevance') || firstSentence(summary) || `Survive and advance ${name}'s own designs.`);
    }
    if (!fields.has('StoryRelevance')) {
        fields.set('StoryRelevance', firstSentence(summary) || `A named figure whose appearance shifts the local Beyonder balance.`);
    }
    if (!fields.has('Example Output')) {
        const seed = firstSentence(fields.get('Voice') || personality);
        fields.set('Example Output', `"${seed.replace(/^["']|["']$/g, '')}"`);
    }
    if (!fields.has('Affinity')) fields.set('Affinity', '50');
    if (!fields.has('Tier')) fields.set('Tier', /god|angel|king of angels|deceased/i.test(`${fields.get('Status')} ${fields.get('StoryRelevance')}`) ? 'recurring' : 'recurring');
    if (!fields.has('Traits')) {
        fields.set('Traits', inferTraits(`${personality} ${fields.get('Disposition')} ${summary}`));
    }
    if (!fields.has('PersonalityHex')) {
        fields.set('PersonalityHex', inferHex(`${personality} ${fields.get('Disposition')} ${summary}`));
    }

    const compactKeys = new Set(['Wandering', 'Location', 'Intro Boost']);
    const preferred = [
        'Aliases', 'Appearance', 'Disposition', 'Personality', 'Voice', 'Status', 'Faction',
        'Goals', 'StoryRelevance', 'Example Output', 'Affinity',
        'PersonalityHex', 'Traits', 'Tier', 'Region', 'Haunt',
        'CoreWant', 'SessionWant', 'SceneWant', 'WantsShort', 'WantsMedium', 'WantsLong',
        'HardBoundaries', 'SoftBoundaries', 'BehavioralTriggers',
        'SignatureEquipment', 'SignatureAbilities', 'Pathway', 'Sequence',
        'Wandering', 'Location', 'Intro Boost',
    ];
    const formatField = (key, value) => compactKeys.has(key)
        ? `**${key}: ${value}**`
        : `**${key}:** ${value}`;
    const lines = [];
    for (const key of preferred) {
        if (fields.has(key)) {
            lines.push(formatField(key, fields.get(key)));
            fields.delete(key);
        }
    }
    for (const [key, value] of fields) {
        lines.push(formatField(key, value));
    }
    const rest = other.map(l => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return [lines.join('\n'), rest].filter(Boolean).join('\n');
}

function transformSection(markdown, kind) {
    const lines = markdown.split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const match = lines[i].match(/^### (FACTION|LOCATION|CHARACTER) — (.+)$/);
        if (!match) {
            out.push(lines[i]);
            i += 1;
            continue;
        }
        const type = match[1];
        const header = `${type} — ${match[2]}`;
        i += 1;
        const bodyLines = [];
        while (i < lines.length && !/^#{1,3} /.test(lines[i])) {
            bodyLines.push(lines[i]);
            i += 1;
        }
        const trimmed = bodyLines.join('\n').replace(/\s+$/, '');
        let next = trimmed;
        if (kind === 'faction' && type === 'FACTION') next = enrichFactionBlock(header, trimmed);
        if (kind === 'location' && type === 'LOCATION') next = enrichLocationBlock(header, trimmed);
        if (kind === 'character' && type === 'CHARACTER') next = enrichCharacterBlock(header, trimmed);
        out.push(`### ${header}`);
        out.push(next);
        if (out[out.length - 1] !== '') out.push('');
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function promoteFactionSubgroups(factionsMd) {
    return factionsMd
        .replace(/^### 2a\. ORTHODOX CHURCHES\s*$/m, '## 2a. ORTHODOX CHURCHES\n\nOrthodox churches hold complete or near-complete pathways and police Beyonder crime through sanctioned squads.')
        .replace(/^### 2b\. SECRET ORGANIZATIONS\s*$/m, '## 2b. SECRET ORGANIZATIONS\n\nSecret organizations operate beyond church control: heretical, scholarly, or simply unofficial.')
        .replace(/^### 2c\. NOBLE & ANGEL FAMILIES\s*$/m, '## 2c. NOBLE & ANGEL FAMILIES');
}

function splitCompiled(compiled) {
    const markers = [
        { file: 'overview.md', start: 0 },
        { file: 'factions.md', re: /^## 2\. FACTIONS\s*$/m },
        { file: 'locations.md', re: /^## 3\. LOCATIONS\s*$/m },
        { file: 'characters_gameplay.md', re: /^## 4\. CHARACTERS\s*$/m },
        { file: 'power_economy_events.md', re: /^## 5\. POWER SYSTEM/m },
        { file: 'engine_seeds.md', re: /^## 9\. ENGINE SEED TAGS/m },
    ];
    const indexes = markers.map((m, i) => {
        if (i === 0) return 0;
        const match = compiled.match(m.re);
        if (!match) throw new Error(`Missing section for ${m.file}`);
        return match.index;
    });
    indexes.push(compiled.length);

    const parts = {};
    for (let i = 0; i < markers.length; i++) {
        parts[markers[i].file] = compiled.slice(indexes[i], indexes[i + 1]).replace(/\s+$/, '') + '\n';
    }
    parts['factions.md'] = promoteFactionSubgroups(parts['factions.md']);
    parts['factions.md'] = transformSection(parts['factions.md'], 'faction');
    parts['locations.md'] = transformSection(parts['locations.md'], 'location');
    parts['characters_gameplay.md'] = transformSection(parts['characters_gameplay.md'], 'character');
    parts['characters_gameplay.md'] = parts['characters_gameplay.md'].replace(
        '](./characters.md)',
        '](../characters.md)',
    );
    return parts;
}

function groupDemoFactions(demo) {
    let next = demo
        .replace(
            /(Power in the Fifth Epoch is divided among orthodox churches[\s\S]*?\n\n)(### FACTION — Church of the Evernight Goddess)/,
            '$1## 2a. ORTHODOX CHURCHES\n\nOrthodox churches hold complete or near-complete pathways and police Beyonder crime through sanctioned squads.\n\n$2',
        )
        .replace(
            /(<!-- rag: keyword, priority:7, triggers: nighthawks, evernight, goddess, red gloves, church -->\n\n)(### FACTION — Aurora Order)/,
            '$1## 2b. SECRET ORGANIZATIONS\n\nSecret organizations operate beyond church control.\n\n$2',
        )
        .replace(
            /(<!-- rag: keyword, priority:7, triggers: tarot club, justice, hanged man, the fool, gray fog, ritual to the fool -->\n\n)(### FACTION — House Augustus)/,
            '$1## 2c. NOBLE & ANGEL FAMILIES\n\n$2',
        );
    next = transformSection(next, 'faction');
    next = transformSection(next, 'location');
    next = transformSection(next, 'character');
    return next;
}

function writeParts(parts) {
    mkdirSync(LORE_DIR, { recursive: true });
    for (const file of LOTM_LORE_PART_FILES) {
        writeFileSync(join(LORE_DIR, file), parts[file].replace(/\s+$/, '') + '\n');
    }
}

function compileFromParts() {
    const parts = LOTM_LORE_PART_FILES.map(file => {
        const path = join(LORE_DIR, file);
        if (!existsSync(path)) throw new Error(`Missing lore part: ${path}`);
        return readFileSync(path, 'utf8');
    });
    const compiled = concatenateLotmLore(parts);
    writeFileSync(COMPILED, compiled);
    return compiled;
}

const fromCompiled = process.argv.includes('--from-compiled');
const loreExists = existsSync(LORE_DIR) && readdirSync(LORE_DIR).some(f => f.endsWith('.md'));

if (fromCompiled) {
    if (loreExists) {
        console.error('lore/ already exists. Refusing --from-compiled so author sources are not overwritten.');
        console.error('Edit files in lore/ then run: node scripts/compile-lotm-lore.mjs');
        process.exit(1);
    }
    const compiled = readFileSync(COMPILED, 'utf8');
    writeParts(splitCompiled(compiled));
    const demo = readFileSync(DEMO, 'utf8');
    if (!demo.includes('## 2a. ORTHODOX CHURCHES')) {
        writeFileSync(DEMO, groupDemoFactions(demo));
    }
} else if (!loreExists) {
    const compiled = readFileSync(COMPILED, 'utf8');
    writeParts(splitCompiled(compiled));
}

const out = compileFromParts();
console.log(`Wrote ${COMPILED} (${out.length} chars) from ${LOTM_LORE_PART_FILES.length} lore parts.`);
