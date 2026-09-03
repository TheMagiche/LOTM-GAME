import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DemoOccupiedModal } from '../DemoOccupiedModal';
import { DemoIdleWarningModal } from '../DemoIdleWarningModal';

afterEach(() => {
    cleanup();
});

describe('demo session modals', () => {
    it('explains that a chronicle is already in play', () => {
        render(
            <DemoOccupiedModal
                open
                remainingMs={90_000}
                expiresAt={Date.now() + 90_000}
                onDismiss={() => {}}
            />,
        );
        expect(screen.getByRole('dialog', { name: /A chronicle is in play/i })).toBeInTheDocument();
        expect(screen.getByText(/another visitor is already in a demo session/i)).toBeInTheDocument();
        expect(screen.getByText(/1:30/)).toBeInTheDocument();
    });

    it('shows remaining time on the expiring-session warning', () => {
        render(
            <DemoIdleWarningModal
                open
                remainingMs={45_000}
                expiresAt={Date.now() + 45_000}
                onStay={() => {}}
                onLeave={() => {}}
            />,
        );
        expect(screen.getByRole('dialog', { name: /Session expiring/i })).toBeInTheDocument();
        expect(screen.getByText(/removed in 0:45/i)).toBeInTheDocument();
    });
});
