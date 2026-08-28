import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContextNavigationDrawer } from '../ContextNavigationDrawer';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
    useAppStore.setState({ drawerOpen: true, contextScreen: null, activeCampaignId: 'camp-1' });
});

afterEach(() => {
    cleanup();
    useAppStore.setState({
        drawerOpen: true,
        contextScreen: null,
        activeCampaignId: null,
        askGmOpen: false,
        diceRollModalOpen: false,
        armedRoll: null,
        armedLoot: null,
        armedOneShot: null,
        armedAbsoluteCommand: null,
        deepArmed: false,
    });
});

describe('ContextNavigationDrawer', () => {
    it('renders play navigation and keeps engine tools collapsed', () => {
        render(<ContextNavigationDrawer />);

        expect(screen.getByRole('navigation', { name: 'Context navigation' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'World' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Character' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^NPCs/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Places/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Factions/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Inventory/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Grimoire' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Save campaign' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Ask GM' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Dice' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Loot' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Trim' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Inject Event' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Absolute Command' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'System Context' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Rules' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Backups' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Leave chronicle' })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Ask GM' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: 'Dice' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: 'Loot' })).toHaveLength(1);
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

    it('can collapse Play without hiding World or Engine', () => {
        render(<ContextNavigationDrawer />);
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));

        expect(screen.queryByRole('button', { name: 'Ask GM' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Character' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Engine' })).toBeInTheDocument();
    });

    it('can collapse World without hiding Play', () => {
        render(<ContextNavigationDrawer />);
        fireEvent.click(screen.getByRole('button', { name: 'World' }));

        expect(screen.queryByRole('button', { name: 'Character' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Ask GM' })).toBeInTheDocument();
    });

    it('opens Ask GM, Dice, and Inject Event from Play', () => {
        render(<ContextNavigationDrawer />);

        fireEvent.click(screen.getByRole('button', { name: 'Ask GM' }));
        expect(useAppStore.getState().askGmOpen).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Dice' }));
        expect(useAppStore.getState().diceRollModalOpen).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Inject Event' }));
        expect(screen.getByRole('heading', { name: /Inject Event/i })).toBeInTheDocument();
    });

    it('disarms Dice from Play when a roll is already armed', () => {
        useAppStore.setState({ armedRoll: 'd20' });
        render(<ContextNavigationDrawer />);

        fireEvent.click(screen.getByRole('button', { name: /^Dice/ }));
        expect(useAppStore.getState().armedRoll).toBeNull();
        expect(useAppStore.getState().diceRollModalOpen).toBe(false);
    });
});
