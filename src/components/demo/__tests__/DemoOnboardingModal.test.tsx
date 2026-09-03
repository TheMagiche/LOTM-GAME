import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_OPENROUTER_ENDPOINT } from '../../../config/demoMode';
import { useAppStore } from '../../../store/useAppStore';
import { DemoOnboardingModal } from '../DemoOnboardingModal';

vi.mock('../../../config/demoMode', async () => {
    const actual = await vi.importActual<typeof import('../../../config/demoMode')>('../../../config/demoMode');
    return { ...actual, IS_DEMO_MODE: true };
});

function seedProvider(apiKey: string, endpoint = DEMO_OPENROUTER_ENDPOINT) {
    const existing = useAppStore.getState().settings.providers[0];
    const provider = existing
        ? { ...existing, endpoint, apiKey }
        : { id: 'demo', label: 'OpenRouter', endpoint, apiKey, modelName: 'openrouter/free', apiFormat: 'openai' as const };
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

describe('DemoOnboardingModal', () => {
    beforeEach(() => {
        seedProvider('');
    });

    it('asks for an OpenRouter key when none is stored', () => {
        render(<DemoOnboardingModal />);
        expect(screen.getByRole('dialog', { name: /OpenRouter API key/i })).toBeInTheDocument();
    });

    it('stays hidden when a usable key already exists', () => {
        seedProvider('sk-or-v1-stored');
        useAppStore.getState().openDemoOnboarding();
        render(<DemoOnboardingModal />);
        expect(screen.queryByRole('dialog', { name: /OpenRouter API key/i })).not.toBeInTheDocument();
    });
});
