import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AbsoluteCommandButton } from '../AbsoluteCommandButton';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../Toast', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

afterEach(() => {
    cleanup();
    useAppStore.getState().setArmedAbsoluteCommand(null);
    useAppStore.getState().setPipelinePhase('idle');
});

describe('AbsoluteCommandButton', () => {
    it('portals the modal onto document.body above illustrated-play stacking contexts', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <div className="lotm-chat" style={{ zIndex: 3, overflow: 'hidden', position: 'relative' }}>
                <div className="chat-composer-bar" style={{ backdropFilter: 'blur(8px)' }}>
                    <AbsoluteCommandButton />
                </div>
            </div>,
        );

        await user.click(screen.getByTitle(/Issue a binding out-of-character instruction/i));

        const heading = screen.getByRole('heading', { name: /Absolute Command/i });
        const overlay = heading.closest('.fixed');
        expect(overlay).not.toBeNull();
        expect(overlay).toHaveClass('z-[200]');
        expect(document.body.contains(overlay)).toBe(true);
        expect(container.contains(overlay)).toBe(false);
    });
});
