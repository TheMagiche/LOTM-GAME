import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsModal } from '../SettingsModal';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../settings-modal/ProvidersTab', () => ({
    ProvidersTab: () => <div data-testid="providers-tab">Providers Content</div>,
}));
vi.mock('../settings-modal/PresetsTab', () => ({
    PresetsTab: () => <div data-testid="presets-tab">Presets Content</div>,
}));
vi.mock('../settings-modal/GlobalSettingsTab', () => ({
    GlobalSettingsTab: () => <div data-testid="global-tab">Global Content</div>,
}));
vi.mock('../settings-modal/ExtensionsTab', () => ({
    ExtensionsTab: () => <div data-testid="extensions-tab">Extensions Content</div>,
}));
vi.mock('../settings-modal/AdvancedTab', () => ({
    AdvancedTab: () => <div data-testid="advanced-tab">Advanced Content</div>,
}));
vi.mock('../settings-modal/DebugTab', () => ({
    DebugTab: () => <div data-testid="debug-tab">Debug Content</div>,
}));

beforeEach(() => {
    useAppStore.setState({
        settingsOpen: true,
        settings: {
            ...useAppStore.getState().settings,
            uiViewMode: 'gm',
        },
    });
});

afterEach(() => {
    cleanup();
    useAppStore.setState({
        settingsOpen: false,
    });
});

describe('SettingsModal view modes', () => {
    it('returns null when settingsOpen is false', () => {
        useAppStore.setState({ settingsOpen: false });
        const { container } = render(<SettingsModal />);
        expect(container.firstChild).toBeNull();
    });

    it('renders all 6 tabs and view mode controls in default Game Master view', () => {
        render(<SettingsModal />);

        // Check view mode buttons in header
        expect(screen.getByRole('button', { name: 'Player' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Game Master' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Game Master' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-pressed', 'false');

        // All 6 tabs should be present
        expect(screen.getByRole('button', { name: 'Providers' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Presets' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Global' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Extensions' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Advanced' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Debug' })).toBeInTheDocument();
    });

    it('switches to Player view when Player toggle button is clicked', () => {
        render(<SettingsModal />);

        fireEvent.click(screen.getByRole('button', { name: 'Player' }));

        expect(useAppStore.getState().settings.uiViewMode).toBe('player');
        expect(screen.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Game Master' })).toHaveAttribute('aria-pressed', 'false');

        // In Player view, only Providers, Presets, and Advanced should be rendered
        expect(screen.getByRole('button', { name: 'Providers' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Presets' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Advanced' })).toBeInTheDocument();

        expect(screen.queryByRole('button', { name: 'Global' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Extensions' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Debug' })).toBeNull();
    });

    it('falls back to Providers tab if an excluded tab was active when switching to Player view', () => {
        render(<SettingsModal />);

        // Switch to Debug tab in GM mode
        fireEvent.click(screen.getByRole('button', { name: 'Debug' }));
        expect(screen.getByTestId('debug-tab')).toBeInTheDocument();

        // Switch to Player mode
        fireEvent.click(screen.getByRole('button', { name: 'Player' }));

        // Active tab should automatically fall back to Providers
        expect(screen.getByTestId('providers-tab')).toBeInTheDocument();
        expect(screen.queryByTestId('debug-tab')).toBeNull();
    });

    it('can switch back to Game Master view from Player view', () => {
        useAppStore.setState({
            settings: {
                ...useAppStore.getState().settings,
                uiViewMode: 'player',
            },
        });
        render(<SettingsModal />);

        expect(screen.queryByRole('button', { name: 'Global' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Game Master' }));

        expect(useAppStore.getState().settings.uiViewMode).toBe('gm');
        expect(screen.getByRole('button', { name: 'Global' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Extensions' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Debug' })).toBeInTheDocument();
    });
});
