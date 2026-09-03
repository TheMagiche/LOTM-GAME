import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenerationProgress } from '../GenerationProgress';
import { UtilityCallStrip } from '../UtilityCallStrip';
import { startUtilityCall, type UtilityCallHandle } from '../../services/llm/utilityCallTracker';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../../config/demoMode', async () => {
    const actual = await vi.importActual<typeof import('../../config/demoMode')>('../../config/demoMode');
    return { ...actual, IS_DEMO_MODE: true };
});

const openCalls: UtilityCallHandle[] = [];

afterEach(() => {
    cleanup();
    for (const handle of openCalls.splice(0)) {
        handle.settleSuccess();
    }
    useAppStore.setState({ pipelinePhase: 'idle', streamingStats: null });
});

describe('story generation chrome in demo', () => {
    it('hides the Story Generation utility strip', () => {
        const handle = startUtilityCall('story-generation', 'OpenRouter', 60000);
        openCalls.push(handle);
        useAppStore.setState({ pipelinePhase: 'generating' });
        render(<UtilityCallStrip />);

        expect(screen.queryByText(/Story Generation/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/generating/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /extend/i })).not.toBeInTheDocument();
    });

    it('hides the generation progress stepper', () => {
        render(
            <GenerationProgress
                phase="generating"
                stats={{ tokens: 12, elapsed: 1400, speed: 8 }}
            />,
        );

        expect(screen.queryByText('Generating')).not.toBeInTheDocument();
        expect(screen.queryByText(/tok/i)).not.toBeInTheDocument();
    });
});
