import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { ChatComposer } from '../ChatComposer';
import { LotmPlayHeader } from '../../lotm/LotmPlayHeader';

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
        settings: {
            ...useAppStore.getState().settings,
            aiTier: 'pro',
            presets: useAppStore.getState().settings.presets.slice(0, 1),
        },
    });
});

describe('ChatComposer preset picker', () => {
    it('hides the preset dropdown when only one setting exists', () => {
        useAppStore.setState({
            settings: {
                ...useAppStore.getState().settings,
                presets: [{ ...useAppStore.getState().settings.presets[0], name: 'Default Setting' }],
            },
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

        expect(screen.queryByTitle('Active AI Preset')).toBeNull();
        expect(screen.queryByText('Default Setting')).toBeNull();
    });

    it('shows the preset dropdown when more than one setting exists', () => {
        const first = useAppStore.getState().settings.presets[0];
        useAppStore.setState({
            settings: {
                ...useAppStore.getState().settings,
                presets: [first, { ...first, id: 'p2', name: 'Cloud' }],
                activePresetId: first.id,
            },
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

        expect(screen.getByTitle('Active AI Preset')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Cloud' })).toBeInTheDocument();
    });
});

describe('LotmPlayHeader menu during indexing', () => {
    it('disables Open menu while the world-index overlay is locked', () => {
        useAppStore.getState().beginLotmWorldIndex({ campaignId: 'camp-1', emblemSrc: '/emblem.webp' });
        render(<LotmPlayHeader />);

        const menu = screen.getByRole('button', { name: 'Open menu unavailable while indexing' });
        expect(menu).toBeDisabled();
        fireEvent.click(menu);
        expect(useAppStore.getState().drawerOpen).toBe(false);
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
