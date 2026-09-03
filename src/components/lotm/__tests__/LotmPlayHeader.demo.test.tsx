import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { LotmPlayHeader } from '../LotmPlayHeader';

vi.mock('../../../config/demoMode', async () => {
    const actual = await vi.importActual<typeof import('../../../config/demoMode')>('../../../config/demoMode');
    return { ...actual, IS_DEMO_MODE: true };
});

afterEach(() => {
    cleanup();
    useAppStore.getState().endLotmWorldIndex();
    useAppStore.setState({ lotmChronicleOpen: false, drawerOpen: false });
});

describe('LotmPlayHeader demo chrome', () => {
    it('hides the chronicle view toggle', () => {
        render(<LotmPlayHeader />);

        expect(screen.getByRole('button', { name: 'Open Player Grimoire' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ask GM' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Illustrated' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Chronicle' })).not.toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Play view' })).not.toBeInTheDocument();
    });

    it('keeps chronicle view closed even if the store asks to open it', () => {
        useAppStore.getState().setLotmChronicleOpen(true);
        expect(useAppStore.getState().lotmChronicleOpen).toBe(false);

        useAppStore.getState().toggleLotmChronicle();
        expect(useAppStore.getState().lotmChronicleOpen).toBe(false);
    });
});
