import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
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

    it('hides the chronicle strip without a campaign', () => {
        useAppStore.getState().openGrimoire();
        render(<LotmGrimoire />);
        expect(screen.queryByLabelText('Your chronicle')).toBeNull();
    });

    it('shows live place and pathway acting in the chronicle strip', () => {
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
        const strip = screen.getByLabelText('Your chronicle');
        expect(strip).toHaveTextContent('Tingen');
        expect(strip).toHaveTextContent(/Fool/i);
        expect(strip.textContent).toMatch(/fate/i);
    });

    it('opens a pathway page from openGrimoire focus', () => {
        useAppStore.getState().openGrimoire({ section: 'pathways', id: 'fool' });
        render(<LotmGrimoire />);
        expect(screen.getByRole('heading', { name: /Fool Pathway/i, level: 3 })).toBeInTheDocument();
    });
});

describe('LotmPlayHeader Grimoire action', () => {
    it('opens the grimoire from the top menu', () => {
        render(<LotmPlayHeader />);
        fireEvent.click(screen.getByRole('button', { name: 'Open Grimoire' }));
        expect(useAppStore.getState().grimoireOpen).toBe(true);
    });

    it('opens Ask GM from the top menu', () => {
        render(<LotmPlayHeader />);
        fireEvent.click(screen.getByRole('button', { name: 'Ask GM' }));
        expect(useAppStore.getState().askGmOpen).toBe(true);
    });
});
