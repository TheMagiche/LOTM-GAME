import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_OPENROUTER_ENDPOINT } from '../../../config/demoMode';
import { getDemoOccupancy } from '../../../services/demo/demoSession';
import { useAppStore } from '../../../store/useAppStore';
import { LotmTitleHub } from '../LotmTitleHub';

vi.mock('../../../config/demoMode', async () => {
    const actual = await vi.importActual<typeof import('../../../config/demoMode')>('../../../config/demoMode');
    return { ...actual, IS_DEMO_MODE: true };
});

vi.mock('../../../store/campaignStore', () => ({
    listCampaigns: vi.fn().mockResolvedValue([]),
    deleteCampaign: vi.fn(),
    saveCampaign: vi.fn(),
}));

vi.mock('../../../services/demo/demoSession', async () => {
    const actual = await vi.importActual<typeof import('../../../services/demo/demoSession')>('../../../services/demo/demoSession');
    return {
        ...actual,
        getDemoOccupancy: vi.fn().mockResolvedValue({
            occupied: false,
            yours: false,
            remainingMs: 0,
            expiresAt: null,
        }),
        acquireDemoOccupancy: vi.fn(),
        purgeDemoSessionCampaigns: vi.fn(),
        getDemoSessionId: () => 'demo_session_test1',
    };
});

function seedProvider(apiKey: string) {
    const existing = useAppStore.getState().settings.providers[0];
    const provider = existing
        ? { ...existing, endpoint: DEMO_OPENROUTER_ENDPOINT, apiKey }
        : {
            id: 'demo',
            label: 'OpenRouter',
            endpoint: DEMO_OPENROUTER_ENDPOINT,
            apiKey,
            modelName: 'openrouter/free',
            apiFormat: 'openai' as const,
        };
    useAppStore.setState({
        settingsLoaded: true,
        settings: {
            ...useAppStore.getState().settings,
            providers: [provider],
        },
    });
}

afterEach(() => {
    cleanup();
    vi.mocked(getDemoOccupancy).mockResolvedValue({
        occupied: false,
        yours: false,
        remainingMs: 0,
        expiresAt: null,
    });
});

describe('LotmTitleHub demo chrome', () => {
    beforeEach(() => {
        seedProvider('');
    });

    it('replaces the top-left Grimoire with a back-to-landing control', async () => {
        render(<LotmTitleHub />);
        await waitFor(() => {
            expect(screen.getByRole('link', { name: /Back to landing page/i })).toBeInTheDocument();
        });
        expect(screen.getByRole('link', { name: /Back to landing page/i })).toHaveAttribute('href', '/');
        expect(screen.queryByRole('button', { name: /Open Grimoire/i })).not.toBeInTheDocument();
    });

    it('hides the API key control once a key exists', async () => {
        seedProvider('sk-or-v1-stored');
        render(<LotmTitleHub />);
        await waitFor(() => {
            expect(screen.getByRole('link', { name: /Back to landing page/i })).toBeInTheDocument();
        });
        expect(screen.queryByRole('button', { name: /API key/i })).not.toBeInTheDocument();
    });

    it('keeps the API key control when no key is stored', async () => {
        render(<LotmTitleHub />);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /API key/i })).toBeInTheDocument();
        });
    });

    it('blocks Begin with a session-at-play modal when another demo is occupying the slot', async () => {
        vi.mocked(getDemoOccupancy).mockResolvedValue({
            occupied: true,
            yours: false,
            remainingMs: 120_000,
            expiresAt: Date.now() + 120_000,
        });
        seedProvider('sk-or-v1-stored');
        render(<LotmTitleHub />);
        await userEvent.click(screen.getByRole('button', { name: /^Begin$/i }));
        expect(await screen.findByRole('dialog', { name: /A chronicle is in play/i })).toBeInTheDocument();
    });
});
