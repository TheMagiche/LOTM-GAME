/** Marketing copy and metadata for the demo LandingPage — keep in sync with docs/agents/lotm-landing-page.md */

export const LANDING_CREATOR_URL = 'https://themagiche.vercel.app';
export const LANDING_SPONSOR_URL = 'https://ko-fi.com/themagiche';
export const LANDING_ENGINE_REPO_URL = 'https://github.com/Sagesheep/NarrativeEngine-P';
export const LANDING_README_URL = `${LANDING_ENGINE_REPO_URL}#getting-started`;
export const LANDING_WIKI_URL = 'https://lordofthemysteries.fandom.com/wiki/';

export const LANDING_HERO = {
    kicker: 'AI Narrative RPG',
    brand: 'Lord of the Mysteries',
    sub: 'A Victorian occult chronicle. Join the world of Beyonders.',
    cta: 'Enter the demo',
} as const;

export const LANDING_LOADER = {
    kicker: LANDING_HERO.kicker,
    title: LANDING_HERO.brand,
    detail: 'Gathering the gray fog…',
    portraitsLabel: (loaded: number, total: number) => `${loaded} / ${total} portraits`,
} as const;

export interface LandingPillar {
    id: string;
    title: string;
    body: string;
}

export const LANDING_PILLARS: LandingPillar[] = [
    {
        id: 'acting-method',
        title: 'Acting Method',
        body: 'Digest potions by living your Sequence. Roleplay the principles behind your Pathway — or risk Loss of Control as madness claws back.',
    },
    {
        id: 'spiritual-actions',
        title: 'Spiritual Actions',
        body: 'Arm Divination, Spirit Vision, Ritual Magic, Beyonder Power, or the mundane. Sequence Advantage and Spirituality cost shape every d20.',
    },
    {
        id: 'mystical-harvest',
        title: 'Mystical Harvest',
        body: 'Claim Extraordinary Characteristics, Sealed Artefacts with dangerous flaws, formulas, and Loen coin under the Law of Convergence.',
    },
    {
        id: 'memory',
        title: 'Memory That Never Forgets',
        body: 'Lossless scene archives and local semantic recall keep multi-session chronicles coherent — no cloud vector store required.',
    },
    {
        id: 'living-world',
        title: 'Living World & NPCs',
        body: 'Background arcs advance without you. NPCs pursue their own goals while churches hush Beyonder incidents behind the Masquerade.',
    },
];

export const LANDING_HOW_IT_PLAYS = {
    heading: 'How it plays',
    lead: 'An AI Game Master runs a Fifth Epoch of gaslight, steam, and hidden gods — you write what your Beyonder does next.',
    steps: [
        {
            title: 'Write your actions',
            desc: 'Dialogue, thoughts, and spell invocations flow into the chronicle. The GM weighs Sequence, inventory, and known lore.',
        },
        {
            title: 'Witness the reply',
            desc: 'Swipe narrative variants, then commit. Arm Dice Me or Roll Loot when risk or harvest enters the scene.',
        },
        {
            title: 'Advance the Pathway',
            desc: 'Digest potions, manage Spirituality and Loss of Control, and face world arcs that do not wait for the protagonist.',
        },
    ],
} as const;

export const LANDING_BYOK = {
    heading: 'Bring your own key',
    body: 'Connect OpenRouter, OpenAI, Ollama, or any OpenAI-compatible API. Keys stay in your browser — the demo never stores them server-side. Ephemeral chronicles are purged when you leave or idle out.',
} as const;

export const LANDING_SELF_HOST = {
    heading: 'Self-host the chronicle',
    body: 'Prefer a private table?  Run locally — no subscription, campaigns stay on your machine.',
    cta: 'Coming soon',
} as const;

export const LANDING_DOWNLOADS = {
    heading: 'Desktop builds',
    lead: 'Native Windows, macOS, and Linux packages are on the roadmap. Until then, use the web demo or self-host from source.',
    platforms: [
        { id: 'windows', label: 'Windows' },
        { id: 'macos', label: 'macOS' },
        { id: 'linux', label: 'Linux' },
    ],
    badge: 'Coming soon',
} as const;

export const LANDING_SPONSOR = {
    kicker: 'Support Development',
    heading: 'Sponsor the Project',
    lead: 'Help fund server hosting, continuous development, and expanded occult compendiums for the Lord of the Mysteries chronicle.',
    cta: 'Sponsor on Ko-fi',
    note: 'Every cup of coffee powers new pathways, refined GM models, and richer interactive features.',
} as const;

export interface SpecialThanksCredit {
    id: string;
    name: string;
    role: string;
    description: string;
    url?: string;
    badge?: string;
}

export const LANDING_SPECIAL_THANKS: {
    kicker: string;
    heading: string;
    lead: string;
    credits: SpecialThanksCredit[];
} = {
    kicker: 'Attribution & Lore Sources',
    heading: 'Special Thanks',
    lead: 'This experience is built upon extraordinary open-source engines and the vast community lore of the Lord of the Mysteries universe.',
    credits: [
        {
            id: 'narrative-engine',
            name: 'Narrative-P Engine',
            role: 'Source Engine & Architecture',
            description:
                'The core self-hosted TTRPG engine providing lossless memory recall, local vector embeddings, dynamic NPC agency, and multi-LLM turn orchestration.',
            url: LANDING_ENGINE_REPO_URL,
            badge: 'Source Engine',
        },
        {
            id: 'lotm-wiki',
            name: 'Lord of the Mysteries Wiki',
            role: 'Lore & Compendium Reference',
            description:
                'The community-maintained encyclopedia of the 22 pathways, potion formulas, Sealed Artefact classifications, and Fifth Epoch world history.',
            url: LANDING_WIKI_URL,
            badge: 'Lore Source',
        },
        {
            id: 'cuttlefish',
            name: 'Cuttlefish That Loves Diving',
            role: 'Original Author & Creator',
            description:
                'Author of the acclaimed web novel Lord of the Mysteries (诡秘之主), creator of the Victorian occult universe, acting method, and cosmic horror mythos.',
            badge: 'Author',
        },
    ],
};

export interface CollageCardItem {
    id: string;
    name: string;
    title: string;
    pathway: string;
    tarotNumber?: string;
    image: string;
    quote?: string;
    type: 'character' | 'emblem';
}

export const LANDING_COLLAGE_CARDS: CollageCardItem[] = [
    {
        id: 'the-fool',
        name: 'The Fool',
        title: 'The Fool That Doesn’t Belong to This Era',
        pathway: 'Fool Pathway',
        tarotNumber: '0',
        image: 'image/characters/the_fool.webp',
        quote: 'The Mysterious Ruler above the gray fog; The King of Yellow and Black who wields good luck.',
        type: 'character',
    },
    {
        id: 'audrey-hall',
        name: 'Audrey Hall',
        title: 'Miss Justice',
        pathway: 'Visionary Pathway',
        tarotNumber: 'VIII',
        image: 'image/characters/audrey_hall.webp',
        quote: 'Spectator, Telepathist, and Dreamwalker of the Tarot Club.',
        type: 'character',
    },
    {
        id: 'alger-wilson',
        name: 'Alger Wilson',
        title: 'The Hanged Man',
        pathway: 'Tyrant Pathway',
        tarotNumber: 'XII',
        image: 'image/characters/alger_wilson.webp',
        quote: 'Captain of the Blue Avenger; Lord of Storms faithful navigating turbulent waters.',
        type: 'character',
    },
    {
        id: 'gehrman-sparrow',
        name: 'Gehrman Sparrow',
        title: 'The World / Adventurer',
        pathway: 'Fool Pathway',
        tarotNumber: 'XXI',
        image: 'image/characters/gehrman_sparrow.webp',
        quote: 'Cold-blooded pirate hunter and master of disguise across the Five Seas.',
        type: 'character',
    },
    {
        id: 'fors-wall',
        name: 'Fors Wall',
        title: 'The Magician',
        pathway: 'Door Pathway',
        tarotNumber: 'I',
        image: 'image/characters/fors_wall.webp',
        quote: 'Novelist in Backlund; Apprentice and Traveler wandering between dimensions.',
        type: 'character',
    },
    {
        id: 'derrick-berg',
        name: 'Derrick Berg',
        title: 'The Sun',
        pathway: 'Sun Pathway',
        tarotNumber: 'XIX',
        image: 'image/characters/derrick_berg.webp',
        quote: 'Youth of the City of Silver bearing the cleansing light of the Sun.',
        type: 'character',
    },
    {
        id: 'leonard-mitchell',
        name: 'Leonard Mitchell',
        title: 'The Star',
        pathway: 'Darkness Pathway',
        tarotNumber: 'XVII',
        image: 'image/characters/leonard_mitchell.webp',
        quote: 'Poet and Red Glove Nighthawk guarding Backlund in the dark of night.',
        type: 'character',
    },
    {
        id: 'amon',
        name: 'Amon',
        title: 'Blasphemer / Angel of Time',
        pathway: 'Error Pathway',
        tarotNumber: 'IV',
        image: 'image/characters/amon.webp',
        quote: 'Adjusting a monocle on the right eye with a subtle, unnerving smile.',
        type: 'character',
    },
    {
        id: 'cattleya',
        name: 'Cattleya',
        title: 'The Hermit / Admiral of Stars',
        pathway: 'Hermit Pathway',
        tarotNumber: 'IX',
        image: 'image/characters/cattleya.webp',
        quote: 'Pirate Admiral of the Future; seeker of esoteric and forbidden knowledge.',
        type: 'character',
    },
    {
        id: 'emlyn-white',
        name: 'Emlyn White',
        title: 'The Moon',
        pathway: 'Moon Pathway',
        tarotNumber: 'XVIII',
        image: 'image/characters/emlyn_white.webp',
        quote: 'Sanguine doctor and doll collector worshipping the Earth Mother.',
        type: 'character',
    },
    {
        id: 'evernight-goddess',
        name: 'Evernight Goddess',
        title: 'Lady of Crimson & Silence',
        pathway: 'Darkness Pathway',
        tarotNumber: 'II',
        image: 'image/characters/evernight_goddess.webp',
        quote: 'The Mother of Concealment, Empress of Horror and Calamity.',
        type: 'character',
    },
    {
        id: 'dunn-smith',
        name: 'Dunn Smith',
        title: 'Captain of Tingen Nighthawks',
        pathway: 'Darkness Pathway',
        tarotNumber: 'XII',
        image: 'image/characters/dunn_smith.webp',
        quote: 'We are guardians, but also a bunch of miserable wretches that are constantly fighting against threats and madness.',
        type: 'character',
    },
];

export const LANDING_FOOTER = {
    creatorLabel: 'Creator: themagiche',
    creatorUrl: LANDING_CREATOR_URL,
    sponsorLabel: 'Sponsor on Ko-fi',
    sponsorUrl: LANDING_SPONSOR_URL,
    license: 'Narrative Engine is MIT licensed.',
    disclaimer:
        'Lord of the Mysteries characters, settings, and terminology are intellectual property of their respective owners. This project is unofficial fan content and is not affiliated with or endorsed by the rights holders.',
} as const;
