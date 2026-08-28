import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContextNavigationDrawer } from '../ContextNavigationDrawer';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
    useAppStore.setState({ drawerOpen: true, contextScreen: null });
});

afterEach(() => {
    cleanup();
    useAppStore.setState({ drawerOpen: true, contextScreen: null });
});

describe('ContextNavigationDrawer', () => {
    it('renders play navigation and keeps engine tools collapsed', () => {
        render(<ContextNavigationDrawer />);

        expect(screen.getByRole('navigation', { name: 'Context navigation' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Character' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Grimoire' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ask GM' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'System Context' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Rules' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Backups' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Leave chronicle' })).toBeInTheDocument();
    });

    it('reveals engine controls from the collapsed Engine menu', () => {
        render(<ContextNavigationDrawer />);
        fireEvent.click(screen.getByRole('button', { name: 'Engine' }));

        expect(screen.getByRole('button', { name: 'Rules' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Backups' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Rules' }));
        expect(useAppStore.getState().contextScreen).toBe('sys');
        expect(screen.getByRole('dialog', { name: 'Rules' })).toBeInTheDocument();
    });

    it('can collapse Play without hiding Engine', () => {
        render(<ContextNavigationDrawer />);
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));

        expect(screen.queryByRole('button', { name: 'Character' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Engine' })).toBeInTheDocument();
    });
});
