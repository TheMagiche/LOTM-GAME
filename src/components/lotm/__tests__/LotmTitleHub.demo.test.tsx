import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_OPENROUTER_ENDPOINT } from '../../../config/demoMode';
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
});
