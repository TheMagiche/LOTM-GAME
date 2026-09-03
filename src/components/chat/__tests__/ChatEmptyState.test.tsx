import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PlayerCharacter } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { ChatEmptyState } from '../ChatEmptyState';

function makePc(extra: Partial<PlayerCharacter> = {}): PlayerCharacter {
    return {
        id: 'pc_test',
        name: 'Clara Whitlock',
        aliases: '',
        appearance: '',
        faction: '',
        storyRelevance: 'Her grandfather kept the ledgers for a Nighthawk chantry.',
        disposition: '',
        status: 'Alive',
        goals: '',
        voice: '',
        personality: '',
        exampleOutput: '',
        affinity: 50,
        ...extra,
    };
}

afterEach(() => {
    cleanup();
    useAppStore.setState({ playerCharacter: null });
});

describe('ChatEmptyState', () => {
    beforeEach(() => {
        useAppStore.setState({ playerCharacter: null });
    });

    it('shows Create Character when no player character exists', () => {
        render(<ChatEmptyState onCreateCharacter={() => {}} />);
        expect(screen.getByRole('button', { name: /create character/i })).toBeInTheDocument();
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^background$/i })).not.toBeInTheDocument();
    });

    it('hides Create Character when a player character exists', () => {
        useAppStore.setState({
            playerCharacter: makePc(),
        });
        render(<ChatEmptyState onCreateCharacter={() => {}} />);
        expect(screen.queryByRole('button', { name: /create character/i })).not.toBeInTheDocument();
        expect(screen.getByText('Awaiting transmission...')).toBeInTheDocument();
    });
});
