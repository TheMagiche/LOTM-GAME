import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PcBackgroundHost } from '../PcBackgroundModal';

afterEach(() => {
    cleanup();
});

const who = 'Her grandfather kept the ledgers for a Nighthawk chantry.';

describe('PcBackgroundHost', () => {
    it('opens the Background modal automatically with the sheet Who You Are blurb', () => {
        const { container } = render(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty
                name="Clara Whitlock"
                storyRelevance={who}
            />,
        );

        const dialog = screen.getByRole('dialog', { name: /background/i });
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveClass('z-[200]');
        expect(document.body.contains(dialog)).toBe(true);
        expect(container.contains(dialog)).toBe(false);
        expect(screen.getByText('Clara Whitlock')).toBeInTheDocument();
        expect(screen.getByText(/grandfather kept the ledgers/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^background$/i })).not.toBeInTheDocument();
    });

    it('does not render Background when storyRelevance is blank', () => {
        render(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty
                name="Clara Whitlock"
                storyRelevance="   "
            />,
        );
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();
    });

    it('does not open Background when the chronicle already has messages', () => {
        render(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty={false}
                name="Clara Whitlock"
                storyRelevance={who}
            />,
        );
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();
    });

    it('stays open after the empty chat is replaced', () => {
        const { rerender } = render(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty
                name="Clara Whitlock"
                storyRelevance={who}
            />,
        );
        expect(screen.getByRole('dialog', { name: /background/i })).toBeInTheDocument();

        rerender(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty={false}
                name="Clara Whitlock"
                storyRelevance={who}
            />,
        );
        expect(screen.getByRole('dialog', { name: /background/i })).toBeInTheDocument();
    });

    it('dismisses the auto-opened modal without a reopen trigger', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty
                name="Clara Whitlock"
                storyRelevance={who}
            />,
        );
        await user.click(screen.getByRole('button', { name: /close background/i }));
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();

        rerender(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty={false}
                name="Clara Whitlock"
                storyRelevance={who}
            />,
        );
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^background$/i })).not.toBeInTheDocument();
    });

    it('resets hold when the campaign changes', () => {
        const { rerender } = render(
            <PcBackgroundHost
                campaignId="c1"
                messagesEmpty
                name="Clara Whitlock"
                storyRelevance={who}
            />,
        );
        expect(screen.getByRole('dialog', { name: /background/i })).toBeInTheDocument();

        rerender(
            <PcBackgroundHost
                campaignId="c2"
                messagesEmpty={false}
                name="Klein Moretti"
                storyRelevance="A history graduate who woke in someone else's body."
            />,
        );
        expect(screen.queryByRole('dialog', { name: /background/i })).not.toBeInTheDocument();
    });
});
