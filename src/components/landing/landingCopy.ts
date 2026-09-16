/** Title Hub collage portraits. Public marketing copy lives in lotm-site, not this demo app. */

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
