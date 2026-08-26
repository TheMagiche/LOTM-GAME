import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    it('opens the Background modal automatically with the sheet Who You Are blurb', () => {
        useAppStore.setState({
            playerCharacter: makePc(),
        });
        const { container } = render(<ChatEmptyState onCreateCharacter={() => {}} />);
        expect(screen.queryByRole('button', { name: /create character/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^background$/i })).not.toBeInTheDocument();

        const dialog = screen.getByRole('dialog', { name: /background/i });
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveClass('z-[200]');
        expect(document.body.contains(dialog)).toBe(true);
        expect(container.contains(dialog)).toBe(false);
        expect(screen.getByText('Clara Whitlock')).toBeInTheDocument();
        expect(screen.getByText(/grandfather kept the ledgers/i)).toBeInTheDocument();
    });

    it('does not render Background when storyRelevance is blank', () => {
        useAppStore.setState({
            playerCharacter: makePc({ storyRelevance: '   ' }),
        });
        render(<ChatEmptyState onCreateCharacter={() => {}} />);
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^background$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /create character/i })).not.toBeInTheDocument();
    });

    it('dismisses the auto-opened modal without a reopen trigger', async () => {
        const user = userEvent.setup();
        useAppStore.setState({
            playerCharacter: makePc(),
        });
        render(<ChatEmptyState onCreateCharacter={() => {}} />);
        await user.click(screen.getByRole('button', { name: /close background/i }));
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^background$/i })).not.toBeInTheDocument();
    });
});
