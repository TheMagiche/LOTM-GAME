import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArcInjectorButton } from '../ArcInjectorButton';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../Toast', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

afterEach(() => {
    cleanup();
    useAppStore.setState({
        pipelinePhase: 'idle',
        modTables: {},
    });
});

describe('ArcInjectorButton', () => {
    it('portals the modal onto document.body above illustrated-play stacking contexts', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <div className="lotm-chat" style={{ zIndex: 3, overflow: 'hidden', position: 'relative' }}>
                <aside className="lotm-play-drawer" style={{ overflow: 'hidden' }}>
                    <ArcInjectorButton layout="nav" />
                </aside>
            </div>,
        );

        await user.click(screen.getByRole('button', { name: 'Inject Arc' }));

        const heading = screen.getByRole('heading', { name: /Inject Arc/i });
        const overlay = heading.closest('.fixed');
        expect(overlay).not.toBeNull();
        expect(overlay).toHaveClass('z-[200]');
        expect(document.body.contains(overlay)).toBe(true);
        expect(container.contains(overlay)).toBe(false);
        expect(screen.getByRole('dialog', { name: /Inject Arc/i })).toBeInTheDocument();
    });

    it('shows the active-arc gate in the modal without offering a second inject', async () => {
        const user = userEvent.setup();
        useAppStore.setState({
            modTables: {
                'mod.arc.arcs': [{ id: 'a1', title: 'Harbour squeeze', status: 'active' }],
            },
        });

        render(<ArcInjectorButton layout="nav" />);
        expect(screen.getByText('Active')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Inject Arc/ }));

        expect(screen.getByText(/An arc is already simmering/i)).toBeInTheDocument();
        expect(screen.getByText(/Harbour squeeze/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Inject$/ })).toBeDisabled();
    });
});
