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
        settings: {
            ...useAppStore.getState().settings,
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
