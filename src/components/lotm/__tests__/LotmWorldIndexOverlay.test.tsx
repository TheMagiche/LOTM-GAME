import { cleanup, render, screen, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { useEmbeddingStatus, type EmbeddingRuntime } from '../../../hooks/useEmbeddingStatus';
import { formatWorldIndexProgress, LotmWorldIndexOverlay } from '../LotmWorldIndexOverlay';

vi.mock('../../../hooks/useEmbeddingStatus', () => ({
    useEmbeddingStatus: vi.fn(),
}));

const mockedStatus = vi.mocked(useEmbeddingStatus);

function runtime(partial: Partial<EmbeddingRuntime> = {}): EmbeddingRuntime {
    return { modelReady: true, jobs: [], polled: false, ...partial };
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useAppStore.getState().endLotmWorldIndex();
});

describe('formatWorldIndexProgress', () => {
    it('shows preparing copy before a campaign id exists', () => {
        expect(formatWorldIndexProgress(null, true, false)).toEqual({
            title: 'Indexing the world',
            detail: 'Preparing…',
        });
    });

    it('shows counts while a lore job is running', () => {
        expect(formatWorldIndexProgress({
            campaignId: 'c1',
            kind: 'lore',
            done: 40,
            total: 200,
            startedAt: 1,
        }, true, true)).toEqual({
            title: 'Indexing the world',
            detail: '40 / 200 (20%)',
        });
    });
});

describe('LotmWorldIndexOverlay', () => {
    beforeEach(() => {
        mockedStatus.mockReturnValue(runtime());
        useAppStore.getState().endLotmWorldIndex();
    });

    it('renders nothing without a lock', () => {
        const { container } = render(<LotmWorldIndexOverlay />);
        expect(container).toBeEmptyDOMElement();
    });

    it('stays off the title/selection screen until a campaign id exists', () => {
        useAppStore.getState().beginLotmWorldIndex({ campaignId: null, emblemSrc: '/emblem.webp' });
        const { container } = render(<LotmWorldIndexOverlay />);
        expect(container).toBeEmptyDOMElement();
    });

    it('blocks the dashboard with a static emblem and preparing copy', () => {
        useAppStore.getState().beginLotmWorldIndex({ campaignId: 'camp-1', emblemSrc: '/emblem.webp' });
        render(<LotmWorldIndexOverlay />);

        const dialog = screen.getByRole('dialog', { name: 'Indexing the world' });
        expect(dialog).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByText('Preparing…')).toBeInTheDocument();
        expect(dialog.querySelector('img.lotm-world-index-emblem')).toHaveAttribute('src', '/emblem.webp');
    });

    it('shows live world-index counts once a lore job is reported', () => {
        mockedStatus.mockReturnValue(runtime({
            polled: true,
            jobs: [{ campaignId: 'camp-1', kind: 'lore', done: 12, total: 80, startedAt: 1 }],
        }));
        useAppStore.getState().beginLotmWorldIndex({ campaignId: 'camp-1', emblemSrc: '/emblem.webp' });
        render(<LotmWorldIndexOverlay />);

        expect(screen.getByText('12 / 80 (15%)')).toBeInTheDocument();
    });

    it('dismisses after the lore job finishes', async () => {
        mockedStatus.mockReturnValue(runtime({
            polled: true,
            jobs: [{ campaignId: 'camp-1', kind: 'lore', done: 80, total: 80, startedAt: 1 }],
        }));
        useAppStore.getState().beginLotmWorldIndex({ campaignId: 'camp-1', emblemSrc: '/emblem.webp' });
        const { rerender } = render(<LotmWorldIndexOverlay />);

        mockedStatus.mockReturnValue(runtime({ polled: true, jobs: [] }));
        rerender(<LotmWorldIndexOverlay />);

        await waitFor(() => {
            expect(useAppStore.getState().lotmWorldIndexLock).toBeNull();
        });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('does not dismiss before the first embedding poll settles', () => {
        vi.useFakeTimers();
        mockedStatus.mockReturnValue(runtime({ polled: false, jobs: [] }));
        useAppStore.getState().beginLotmWorldIndex({ campaignId: 'camp-1', emblemSrc: '/emblem.webp' });
        render(<LotmWorldIndexOverlay />);

        act(() => { vi.advanceTimersByTime(5000); });

        expect(useAppStore.getState().lotmWorldIndexLock).not.toBeNull();
        expect(screen.getByRole('dialog', { name: 'Indexing the world' })).toBeInTheDocument();
    });
});
