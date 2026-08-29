import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';

vi.mock('../../location-ledger/LotmWorldMapView', () => ({
    LotmWorldMapView: ({ onSelectName, highlightCoords, readOnly }: {
        onSelectName?: (name: string) => void;
        highlightCoords?: [number, number] | null;
        readOnly?: boolean;
    }) => (
        <div data-testid="lotm-world-map" role="region" aria-label="World map" data-readonly={readOnly}>
            <span>World map</span>
            {highlightCoords && <span>Highlighted: {highlightCoords.join(',')}</span>}
            <button
                data-testid="mock-select-map-pin"
                onClick={() => onSelectName?.('Tingen')}
            >
                Select Tingen Pin
            </button>
        </div>
    ),
}));

import { LotmGrimoire } from '../LotmGrimoire';
import { LotmPlayHeader } from '../LotmPlayHeader';

afterEach(() => {
    cleanup();
    useAppStore.getState().closeGrimoire();
    useAppStore.setState({
        activeCampaignId: null,
        playerCharacter: null,
        locationLedger: [],
        askGmOpen: false,
    });
});

describe('LotmGrimoire overlay', () => {
    it('renders nothing while closed', () => {
        const { container } = render(<LotmGrimoire />);
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('dialog', { name: 'Grimoire' })).toBeNull();
    });

    it('opens from store state and switches sections', () => {
        useAppStore.getState().openGrimoire();
        render(<LotmGrimoire />);

        expect(screen.getByRole('dialog', { name: 'Grimoire' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Clown' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Volumes' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Epochs' }));
        const preEpoch = screen.getByRole('heading', { name: /Pre-Epoch/i }).closest('button')!;
        expect(preEpoch).toBeInTheDocument();
        expect(preEpoch).not.toHaveTextContent(/recorded events/i);
        expect(screen.queryByRole('heading', { name: 'Clown' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Pathways' }));
        const fool = screen.getByRole('heading', { name: 'Fool Pathway' }).closest('button')!;
        expect(fool).toBeInTheDocument();
        expect(fool.querySelector('img')).toBeTruthy();
        expect(fool).not.toHaveTextContent(/Secrets and Changes|The Fool ·/i);

        fireEvent.click(screen.getByRole('button', { name: 'World' }));
        expect(screen.getByRole('tab', { name: 'Geography' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', { name: 'Tingen' })).toBeInTheDocument();
        expect(screen.getByText('Lord of the Mysteries World Map')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'World map' })).toBeInTheDocument();

        // Clicking show on map focuses the location on map and highlights card
        const showOnMapBtn = screen.getAllByRole('button', { name: /Show on map/i })[0];
        fireEvent.click(showOnMapBtn);
        expect(screen.getByRole('button', { name: /Focused on map/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Clear Selection/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Churches' }));
        const evernight = screen.getByRole('heading', { name: /Church of the Evernight Goddess/i }).closest('button')!;
        expect(evernight).toBeInTheDocument();
        expect(evernight).not.toHaveTextContent(/Nighthawks|Loen Kingdom/i);
        expect(evernight.querySelector('img')).toBeTruthy();

        const ancientSun = screen.getByRole('heading', { name: /Church of the Ancient Sun God/i }).closest('button')!;
        expect(ancientSun.querySelector('img')).toBeNull();
        expect(ancientSun.querySelector('[aria-label="Unknown emblem"]')).toBeTruthy();
    });

    it('filters the active section by search', () => {
        useAppStore.getState().openGrimoire();
        render(<LotmGrimoire />);

        fireEvent.click(screen.getByRole('button', { name: 'Pathways' }));
        expect(screen.queryByRole('searchbox', { name: 'Search the Grimoire' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Search the Grimoire' }));
        const search = screen.getByRole('searchbox', { name: 'Search the Grimoire' });
        fireEvent.change(search, { target: { value: 'seer' } });

        expect(screen.getByRole('heading', { name: 'Fool Pathway' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Darkness Pathway' })).toBeNull();
    });

    it('opens a volume detail then returns to the list', () => {
        useAppStore.getState().openGrimoire();
        render(<LotmGrimoire />);

        const clownCard = screen.getByRole('heading', { name: 'Clown' }).closest('button')!;
        expect(clownCard).toHaveTextContent(/Chapters 1-213/);
        expect(clownCard).not.toHaveTextContent(/Klein Moretti committed suicide/);

        fireEvent.click(clownCard);
        expect(screen.getByRole('heading', { name: 'Clown', level: 3 })).toBeInTheDocument();
        expect(screen.getByText(/Title meaning/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /All volumes/i }));
        expect(screen.getByRole('heading', { name: 'Clown' })).toBeInTheDocument();
    });

    it('closes from the overlay close control', () => {
        useAppStore.getState().openGrimoire();
        render(<LotmGrimoire />);
        fireEvent.click(screen.getByRole('button', { name: 'Close Grimoire' }));
        expect(useAppStore.getState().grimoireOpen).toBe(false);
        expect(screen.queryByRole('dialog', { name: 'Grimoire' })).toBeNull();
    });

    it('remains pure world lore without player chronicle strip', () => {
        useAppStore.setState({
            activeCampaignId: 'camp_test',
            playerCharacter: {
                id: 'pc-1',
                name: 'Clara Whitlock',
                aliases: '',
                appearance: '',
                faction: 'Unaffiliated civilian (unregistered Beyonder)',
                storyRelevance: '',
                disposition: '',
                status: '',
                goals: '',
                voice: '',
                personality: '',
                exampleOutput: '',
                affinity: 0,
                signatureKit: { equipment: [], abilities: [], pathway: 'fool', sequence: 9 },
            },
            locationLedger: [{
                id: 'loc_tingen',
                name: 'Tingen',
                aliases: '',
                broadLocation: '',
                features: [],
                connections: [],
                description: '',
                firstSeenScene: '',
                lastSeenScene: '',
                source: 'manual',
            }],
            context: { ...useAppStore.getState().context, currentPlaceId: 'loc_tingen' },
        });
        useAppStore.getState().openGrimoire();
        render(<LotmGrimoire />);
        expect(screen.queryByLabelText('Your chronicle')).toBeNull();
    });

    it('opens a pathway page from openGrimoire focus', () => {
        useAppStore.getState().openGrimoire({ section: 'pathways', id: 'fool' });
        render(<LotmGrimoire />);
        expect(screen.getByRole('heading', { name: /Fool Pathway/i, level: 3 })).toBeInTheDocument();
    });

    it('navigates to How to Play guide from the bottom rail button and filters categories', () => {
        useAppStore.getState().openGrimoire();
        render(<LotmGrimoire />);

        const guideBtn = screen.getByRole('button', { name: /How to Play/i });
        expect(guideBtn).toBeInTheDocument();
        fireEvent.click(guideBtn);

        expect(screen.getByRole('heading', { name: /How to Play Lord of the Mysteries/i })).toBeInTheDocument();
        expect(screen.getByText(/Spiritual Actions & Dice System \(Dice Me\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Mystical Harvest & Loot Drops \(Roll Loot\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Background World Arcs \(Inject Arc\)/i)).toBeInTheDocument();
        expect(screen.getByText(/One-Shot Scene Directives \(Inject Event\)/i)).toBeInTheDocument();

        // Switch category filter to Spiritual Dice
        fireEvent.click(screen.getByRole('tab', { name: /Spiritual Dice/i }));
        expect(screen.getByText(/Spiritual Actions & Dice System \(Dice Me\)/i)).toBeInTheDocument();
        expect(screen.queryByText(/Mystical Harvest & Loot Drops \(Roll Loot\)/i)).toBeNull();

        // Expand a guide section to verify detailed instructions
        fireEvent.click(screen.getByText(/Spiritual Actions & Dice System \(Dice Me\)/i));
        expect(screen.getByText(/Sequence Advantage & Disadvantage/i)).toBeInTheDocument();
    });
});

describe('LotmPlayHeader Grimoire action', () => {
    it('opens the player grimoire from the top menu', () => {
        render(<LotmPlayHeader />);
        fireEvent.click(screen.getByRole('button', { name: 'Open Player Grimoire' }));
        expect(useAppStore.getState().playerGrimoireOpen).toBe(true);
    });

    it('opens Ask GM from the top menu', () => {
        render(<LotmPlayHeader />);
        fireEvent.click(screen.getByRole('button', { name: 'Ask GM' }));
        expect(useAppStore.getState().askGmOpen).toBe(true);
    });
});
