import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { ChatComposer } from '../ChatComposer';
import { LotmPlayHeader } from '../../lotm/LotmPlayHeader';

function renderComposer() {
    return render(
        <ChatComposer
            input=""
            inputRef={createRef()}
            isStreaming={false}
            oocBusy={false}
            onInputChange={() => {}}
            onKeyDown={() => {}}
            onSend={() => {}}
            onStop={() => {}}
        />,
    );
}

afterEach(() => {
    cleanup();
    useAppStore.getState().endLotmWorldIndex();
    useAppStore.setState({
        drawerOpen: false,
        lotmChronicleOpen: false,
        deepArmed: false,
        armedRoll: null,
        armedLoot: null,
        armedOneShot: null,
        armedAbsoluteCommand: null,
        activeCampaignId: null,
        diceRollModalOpen: false,
        settings: {
            ...useAppStore.getState().settings,
            aiTier: 'pro',
            presets: useAppStore.getState().settings.presets.slice(0, 1),
        },
    });
});

describe('ChatComposer preset picker', () => {
    it('keeps the AI preset out of the input well', () => {
        const first = useAppStore.getState().settings.presets[0];
        useAppStore.setState({
            settings: {
                ...useAppStore.getState().settings,
                presets: [first, { ...first, id: 'p2', name: 'Cloud' }],
                activePresetId: first.id,
            },
        });
        renderComposer();

        expect(screen.queryByTitle('Active AI Preset')).toBeNull();
        expect(screen.queryByRole('option', { name: 'Cloud' })).toBeNull();
    });

    it('moves the AI preset into the More menu', () => {
        const first = useAppStore.getState().settings.presets[0];
        useAppStore.setState({
            settings: {
                ...useAppStore.getState().settings,
                presets: [first, { ...first, id: 'p2', name: 'Cloud' }],
                activePresetId: first.id,
            },
        });
        renderComposer();

        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        expect(screen.getByTitle('Active AI Preset')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Cloud' })).toBeInTheDocument();
    });
});

describe('ChatComposer player shortcuts', () => {
    it('shows icon shortcuts for dice, loot, inject arc, inject event, and more', () => {
        useAppStore.setState({ activeCampaignId: 'camp-1' });
        renderComposer();

        expect(screen.getByRole('toolbar', { name: 'Player controls' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Dice' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Loot' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Inject Arc' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Inject Event' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Absolute Command' })).toBeNull();
        expect(screen.queryByRole('menuitem', { name: 'Archive' })).toBeNull();
    });

    it('opens extra functions from More', () => {
        useAppStore.setState({ activeCampaignId: 'camp-1' });
        renderComposer();

        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        expect(screen.getByRole('button', { name: 'Absolute Command' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();
        expect(screen.getByTitle('Active AI Preset')).toBeInTheDocument();
    });

    it('opens the dice modal from the icon shortcut', () => {
        useAppStore.setState({ activeCampaignId: 'camp-1' });
        renderComposer();

        fireEvent.click(screen.getByRole('button', { name: 'Dice' }));
        expect(useAppStore.getState().diceRollModalOpen).toBe(true);
    });
});

describe('LotmPlayHeader menu during indexing', () => {
    it('hides header actions while the world-index overlay is locked', () => {
        useAppStore.getState().beginLotmWorldIndex({ campaignId: 'camp-1', emblemSrc: '/emblem.webp' });
        render(<LotmPlayHeader />);

        expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Save campaign' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Open Player Grimoire' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Ask GM' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Illustrated' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Chronicle' })).toBeNull();
        expect(screen.queryByRole('button', { name: /AI Tier/i })).toBeNull();
    });

    it('restores header actions after the world-index lock clears', () => {
        useAppStore.getState().beginLotmWorldIndex({ campaignId: 'camp-1', emblemSrc: '/emblem.webp' });
        const { rerender } = render(<LotmPlayHeader />);
        useAppStore.getState().endLotmWorldIndex();
        rerender(<LotmPlayHeader />);

        expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save campaign' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open Player Grimoire' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ask GM' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Illustrated' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Chronicle' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /AI Tier/i })).toBeInTheDocument();
    });
});

describe('LotmPlayHeader play controls', () => {
    it('toggles illustrated and chronicle views from the top menu', () => {
        render(<LotmPlayHeader />);

        const illustrated = screen.getByRole('button', { name: 'Illustrated' });
        const chronicle = screen.getByRole('button', { name: 'Chronicle' });
        expect(illustrated).toHaveAttribute('aria-pressed', 'true');
        expect(chronicle).toHaveAttribute('aria-pressed', 'false');

        fireEvent.click(chronicle);
        expect(useAppStore.getState().lotmChronicleOpen).toBe(true);
        expect(illustrated).toHaveAttribute('aria-pressed', 'false');
        expect(chronicle).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(illustrated);
        expect(useAppStore.getState().lotmChronicleOpen).toBe(false);
    });

    it('cycles AI tier from the top menu', () => {
        render(<LotmPlayHeader />);

        const tier = screen.getByRole('button', { name: /AI Tier: pro/i });
        expect(tier).toHaveTextContent('pro');
        fireEvent.click(tier);
        expect(useAppStore.getState().settings.aiTier).toBe('max');
        expect(screen.getByRole('button', { name: /AI Tier: max/i })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /AI Tier: max/i }));
        expect(useAppStore.getState().settings.aiTier).toBe('lite');
    });

    it('shows Save campaign on the top menu', () => {
        render(<LotmPlayHeader />);

        expect(screen.getByRole('button', { name: 'Save campaign' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open Player Grimoire' })).toBeInTheDocument();
    });
});

describe('ChatComposer armed chips', () => {
    it('shows compact armed status next to the input', () => {
        useAppStore.setState({
            deepArmed: true,
            armedRoll: 'd20',
            armedLoot: { rolls: 2 },
            armedOneShot: 'combat',
            armedAbsoluteCommand: 'Keep Elara friendly.',
        });
        render(
            <ChatComposer
                input=""
                inputRef={createRef()}
                isStreaming={false}
                oocBusy={false}
                onInputChange={() => {}}
                onKeyDown={() => {}}
                onSend={() => {}}
                onStop={() => {}}
            />,
        );

        expect(screen.getByText('Deep')).toBeInTheDocument();
        expect(screen.getByText('Dice')).toBeInTheDocument();
        expect(screen.getByText('Loot')).toBeInTheDocument();
        expect(screen.getByText('Event')).toBeInTheDocument();
        expect(screen.getByText('Absolute')).toBeInTheDocument();
    });
});
