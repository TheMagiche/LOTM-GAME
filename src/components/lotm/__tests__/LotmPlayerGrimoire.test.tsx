import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { LotmPlayerGrimoire } from '../LotmPlayerGrimoire';
import type { InventoryItem, LocationEntry, NPCEntry, PlayerCharacter } from '../../../types';

const MOCK_PC: PlayerCharacter = {
    id: 'pc-test-1',
    name: 'Klein Moretti',
    aliases: 'The Fool, Sherlock Moriarty',
    appearance: 'Victorian gentleman with black hair and brown eyes',
    faction: 'Nighthawks of Tingen',
    storyRelevance: 'Protagonist transmigrator',
    disposition: 'Pragmatic and cautious',
    status: 'Alive',
    goals: 'Survive and unravel the truth of transmigration',
    voice: 'Polite and measured',
    personality: 'Pragmatic, cautious, highly analytical, valuing life',
    speechStyle: 'Victorian scholar tone',
    dialogueExamples: 'The taste of a Demoness ain\'t bad.',
    affinity: 100,
    origin: 'Loen Kingdom · Tingen',
    tier: 'protagonist',
    signatureKit: {
        pathway: 'fool',
        sequence: 9,
        abilities: ['Spirit Vision', 'Divination'],
        equipment: ['Cane', 'Revolver'],
    },
    pcMeta: {
        digestion: 100,
        lossOfControl: 0,
        stats: {
            Spirituality: 45,
            Physique: 12,
            Reasoning: 18,
        },
    },
    personalityHex: {
        drive: 2,
        diligence: 2,
        boldness: 1,
        warmth: 1,
        empathy: 2,
        composure: 2,
    },
    traits: ['cautious', 'analytical', 'resourceful'],
    wants: {
        short: ['Master Divination', 'Digest Seer Potion'],
        medium: ['Advance to Clown', 'Protect Melissa and Benson'],
        long: 'Uncover the mysteries of the Fog of History',
    },
    boundaries: {
        hard: ['Do not harm innocent people for personal gain'],
        soft: ['Avoid reckless direct confrontation'],
    },
    behavioralTriggers: [
        { trigger: 'Sensing mysticism danger', behavior: 'Retreat to the gray fog above the spirit world' },
    ],
    visualProfile: {
        gender: 'Male',
        age: '22',
        build: 'Slim, intellectual',
        hair: 'Black, parted neatly',
        eyes: 'Deep brown',
        skin: 'Fair',
        clothing: 'Black trench coat and silk top hat',
        distinguishingFeatures: 'Carries a silver pocket watch and a monocle pocket',
    },
};

const MOCK_LOCATION: LocationEntry = {
    id: 'loc-tingen-1',
    name: 'Tingen City',
    aliases: 'Tingen',
    broadLocation: 'Ahasuerus County, Loen Kingdom',
    features: ['Blackthorn Security Company', 'Divination Club', 'Daffodil Street'],
    connections: [],
    description: 'A quiet university city in the northern continent.',
    firstSeenScene: 'scene-1',
    lastSeenScene: 'scene-5',
    source: 'manual',
};

const MOCK_DESTINATION: LocationEntry = {
    id: 'loc-backlund-1',
    name: 'Backlund',
    aliases: 'The Capital of Capitals',
    broadLocation: 'Loen Kingdom',
    features: ['Queen\'s Square', 'Bravehearts Bar', 'Bactrian Street'],
    connections: [],
    description: 'The sprawling steam-shrouded capital of the Loen Kingdom.',
    firstSeenScene: 'scene-10',
    lastSeenScene: 'scene-12',
    source: 'manual',
};

const MOCK_ITEMS: InventoryItem[] = [
    {
        id: 'item-1',
        name: 'Brass Revolver',
        category: 'beyonder-weapon',
        qty: 1,
        equipped: true,
        description: 'A standard six-shot brass revolver with hunting bullets.',
    },
    {
        id: 'item-2',
        name: 'Master Key',
        category: 'sealed-artefact',
        grade: '3',
        qty: 1,
        equipped: false,
        description: 'A bone-carved key that can unlock almost any standard lock.',
        notes: 'User has a strong urge to get lost and wander into dangerous hidden rooms.',
    },
];

const MOCK_NPCS: NPCEntry[] = [
    {
        id: 'npc-dunn',
        name: 'Dunn Smith',
        aliases: 'Captain',
        appearance: 'Deep grey eyes, receding hairline',
        faction: 'Nighthawks',
        storyRelevance: 'Captain of the Tingen Nighthawks',
        disposition: 'Fatherly, forgetful',
        status: 'Alive',
        goals: 'Protect Tingen from supernatural threats',
        voice: 'Deep, comforting baritone',
        personality: 'Caring and responsible',
        exampleOutput: '',
        affinity: 85,
        pcRelation: 2,
        role: 'Nighthawk Captain',
    },
    {
        id: 'npc-leonard',
        name: 'Leonard Mitchell',
        aliases: 'The Poet',
        appearance: 'Green eyes, untamed hair',
        faction: 'Nighthawks',
        storyRelevance: 'Fellow Nighthawk teammate',
        disposition: 'Flamboyant, secretive',
        status: 'Alive',
        goals: 'Find clues on Old Neil',
        voice: 'Poetic, slightly arrogant',
        personality: 'Charming, concealed depths',
        exampleOutput: '',
        affinity: 75,
        pcRelation: 1,
        role: 'Midnight Poet',
    },
];

describe('LotmPlayerGrimoire component', () => {
    beforeEach(() => {
        useAppStore.setState({
            playerGrimoireOpen: false,
            playerGrimoireSection: 'character',
            playerCharacter: MOCK_PC,
            locationLedger: [MOCK_LOCATION, MOCK_DESTINATION],
            inventoryItems: MOCK_ITEMS,
            npcLedger: MOCK_NPCS,
            context: {
                ...useAppStore.getState().context,
                currentPlaceId: 'loc-tingen-1',
                currentFeature: 'Blackthorn Security Company',
                worldDay: 4,
                characterProfile: {
                    identity: { name: 'Klein Moretti' },
                    activeTraits: [
                        {
                            id: 'trait-1',
                            subject: 'Klein Moretti',
                            category: 'party_facts',
                            text: 'Became an official civilian staff of the Nighthawks',
                            importance: 5,
                            eventTags: [],
                            sceneEstablished: 'Scene 1',
                            superseded: false,
                            source: 'manual',
                        },
                    ],
                },
            },
        });
    });

    afterEach(() => {
        cleanup();
        useAppStore.getState().closePlayerGrimoire();
    });

    it('renders nothing when closed', () => {
        const { container } = render(<LotmPlayerGrimoire />);
        expect(container).toBeEmptyDOMElement();
    });

    it('opens and renders Character Record section by default', () => {
        useAppStore.getState().openPlayerGrimoire();
        render(<LotmPlayerGrimoire />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getAllByText(/Klein Moretti/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Protagonist Dossier \(Game Master Record\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Personality & Voice Persona/i)).toBeInTheDocument();
        expect(screen.getByText(/Personality Hexagon \(Agency Axes\)/i)).toBeInTheDocument();
        expect(screen.getAllByText(/drive/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/composure/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Black trench coat and silk top hat/i)).toBeInTheDocument();
    });

    it('switches to Potion & Pathway section and displays pathway progression', () => {
        useAppStore.getState().openPlayerGrimoire('pathway');
        render(<LotmPlayerGrimoire />);

        expect(screen.getByText(/Fool Pathway/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Sequence 9 · Seer/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/100%/)).toBeInTheDocument();
        expect(screen.getByText(/Drink Next Sequence Potion/i)).toBeInTheDocument();
    });

    it('inspects different sequences in the ladder', () => {
        useAppStore.getState().openPlayerGrimoire('pathway');
        render(<LotmPlayerGrimoire />);

        // Click on Seq 8
        const seq8Btn = screen.getByRole('button', { name: /Seq 8/i });
        fireEvent.click(seq8Btn);

        expect(screen.getAllByRole('heading', { name: /Sequence 8 · Clown/i }).length).toBeGreaterThan(0);
    });

    it('advances sequence upon clicking Drink Next Sequence Potion', () => {
        useAppStore.getState().openPlayerGrimoire('pathway');
        render(<LotmPlayerGrimoire />);

        const drinkBtn = screen.getByRole('button', { name: /Drink Next Sequence Potion/i });
        expect(drinkBtn).not.toBeDisabled();

        fireEvent.click(drinkBtn);

        const updatedPc = useAppStore.getState().playerCharacter;
        expect(updatedPc?.signatureKit?.sequence).toBe(8);
    });

    it('switches to Location & Travel section and allows shifting location', () => {
        useAppStore.getState().openPlayerGrimoire('location');
        render(<LotmPlayerGrimoire />);

        expect(screen.getByText(/Current Coordinates/i)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Tingen City', level: 3 })).toBeInTheDocument();

        // Select Backlund from list (search the Known Locations directory)
        const backlundCards = screen.getAllByRole('button', { name: /Backlund/i });
        fireEvent.click(backlundCards[0]);

        const travelBtn = screen.getByRole('button', { name: /Shift Location \/ Travel/i });
        fireEvent.click(travelBtn);

        expect(useAppStore.getState().context.currentPlaceId).toBe('loc-backlund-1');
        expect(useAppStore.getState().context.currentFeature).toBeNull();
    });

    it('switches to Character Record section and renders read-only GM view', () => {
        useAppStore.getState().openPlayerGrimoire('character');
        render(<LotmPlayerGrimoire />);

        expect(screen.getByText(/Protagonist Dossier \(Game Master Record\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Personality & Voice Persona/i)).toBeInTheDocument();
        expect(screen.getByText(/Personality Hexagon \(Agency Axes\)/i)).toBeInTheDocument();
        expect(screen.getAllByText(/drive/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/composure/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Black trench coat and silk top hat/i)).toBeInTheDocument();
        expect(screen.getByText(/Uncover the mysteries of the Fog of History/i)).toBeInTheDocument();
    });

    it('switches to Inventory section with category filtering and sealed artefact flaw warning', () => {
        useAppStore.getState().openPlayerGrimoire('inventory');
        render(<LotmPlayerGrimoire />);

        expect(screen.getByText(/Purse & Holdings/i)).toBeInTheDocument();
        expect(screen.getByText('Brass Revolver')).toBeInTheDocument();
        expect(screen.getByText('Master Key')).toBeInTheDocument();
        expect(screen.getByText(/Negative Flaw \/ Downside/i)).toBeInTheDocument();

        // Filter to Weapons tab
        fireEvent.click(screen.getByRole('button', { name: 'Weapons' }));
        expect(screen.getByText('Brass Revolver')).toBeInTheDocument();
        expect(screen.queryByText('Master Key')).toBeNull();
    });

    it('switches to Chronicle & Standing section and displays bonds and active traits', () => {
        useAppStore.getState().openPlayerGrimoire('chronicle');
        render(<LotmPlayerGrimoire />);

        expect(screen.getByText(/Active Chronicle Traits & Evolutions/i)).toBeInTheDocument();
        expect(screen.getByText(/Became an official civilian staff of the Nighthawks/i)).toBeInTheDocument();
        expect(screen.getByText(/Standing & Social Relations/i)).toBeInTheDocument();
        expect(screen.getByText('Dunn Smith')).toBeInTheDocument();
        expect(screen.getByText('Leonard Mitchell')).toBeInTheDocument();
        expect(screen.getByText('+2')).toBeInTheDocument();
        expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('closes on clicking close button or pressing Escape', () => {
        useAppStore.getState().openPlayerGrimoire();
        render(<LotmPlayerGrimoire />);

        fireEvent.click(screen.getByRole('button', { name: 'Close Player Grimoire' }));
        expect(useAppStore.getState().playerGrimoireOpen).toBe(false);

        useAppStore.getState().openPlayerGrimoire();
        render(<LotmPlayerGrimoire />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(useAppStore.getState().playerGrimoireOpen).toBe(false);
    });
});
