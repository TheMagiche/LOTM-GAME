import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import claraJson from '../../../../mechanics/World_compendium/Lord of the Mysteries/people/lotm_pc_clara_whitlock.json';
import { DEFAULT_CHARACTER_PROFILE } from '../../../types';
import type { PlayerCharacter } from '../../../types';
import { characterProfileFromPlayerCharacter } from '../../../services/character/profileFromPc';
import { useAppStore } from '../../../store/useAppStore';
import { attachLotmPathwaysToNpcs } from '../../../worldpacks/lotmPathways';
import { LotmPlayerHud } from '../LotmPlayerHud';

function seedClara() {
    const row = (Array.isArray(claraJson) ? claraJson[0] : claraJson) as PlayerCharacter;
    const seeded = attachLotmPathwaysToNpcs([row])[0];
    const profile = characterProfileFromPlayerCharacter(seeded, DEFAULT_CHARACTER_PROFILE);
    useAppStore.setState({
        playerCharacter: seeded,
        characterProfileData: profile,
        pcPanelOpen: false,
    });
    return { seeded, profile };
}

afterEach(() => {
    cleanup();
    useAppStore.setState({
        playerCharacter: null,
        characterProfileData: DEFAULT_CHARACTER_PROFILE,
        inventoryItems: [],
        pcPanelOpen: false,
        grimoireOpen: false,
        grimoireFocus: null,
        playerGrimoireOpen: false,
        playerGrimoireSection: 'character',
    });
});

describe('LotmPlayerHud', () => {
    beforeEach(() => {
        useAppStore.setState({
            playerCharacter: null,
            characterProfileData: DEFAULT_CHARACTER_PROFILE,
            inventoryItems: [],
            pcPanelOpen: false,
            grimoireOpen: false,
            grimoireFocus: null,
            playerGrimoireOpen: false,
            playerGrimoireSection: 'character',
        });
    });

    it('renders nothing without a seeded character', () => {
        const { container } = render(<LotmPlayerHud />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows name, sequence, emblem, Spirit, Loss of Control, and digestion on the play HUD', () => {
        seedClara();
        render(<LotmPlayerHud />);

        const hud = screen.getByRole('complementary', { name: /Player status/i });
        expect(hud).toBeInTheDocument();
        expect(screen.getByText('Clara Whitlock')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open Character Record for Clara Whitlock' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Open Pathway details for Fool Pathway/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Sheet$/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /inventory/i })).not.toBeInTheDocument();
        expect(screen.getByText(/Fool Pathway/i)).toBeInTheDocument();
        expect(screen.getByText(/Sequence 9/)).toBeInTheDocument();
        expect(screen.getByText(/Fool Pathway · Sequence 9 · Seer/)).toBeInTheDocument();
        expect(hud.querySelector('img.lotm-player-hud-emblem')).toBeTruthy();
        expect(screen.queryByRole('meter', { name: 'HP' })).toBeNull();
        expect(screen.getByRole('meter', { name: 'Spirit' })).toHaveAttribute('aria-valuenow', '14');
        expect(screen.getByRole('meter', { name: 'Digestion' })).toHaveAttribute('aria-valuenow', '0');
        expect(screen.getByText('Loss of Control')).toBeInTheDocument();
        expect(screen.getByRole('meter', { name: 'Loss of Control' })).toHaveAttribute('aria-valuenow', '0');
        expect(screen.getByRole('meter', { name: 'Loss of Control' })).toHaveAttribute('aria-valuemax', '3');
        expect(screen.getByRole('meter', { name: 'Loss of Control' })).toHaveAttribute('aria-valuetext', 'stable');
        expect(screen.getByText('stable')).toBeInTheDocument();
        expect(screen.getByLabelText('Sequence band')).toHaveTextContent(/Advantage/);
        expect(screen.queryByLabelText(/Sequence ladder/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Sequence abilities')).not.toBeInTheDocument();
        expect(screen.queryByText(/Spirit Vision/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Revere fate/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Open Player Grimoire/i })).not.toBeInTheDocument();
    });

    it('renders Loss of Control as a stage meter matching Spirit and Digestion', () => {
        const { seeded } = seedClara();
        useAppStore.setState({
            playerCharacter: {
                ...seeded,
                pcMeta: { ...seeded.pcMeta, lossOfControl: 2 },
            },
        });
        render(<LotmPlayerHud />);

        const loc = screen.getByRole('meter', { name: 'Loss of Control' });
        expect(loc).toHaveAttribute('aria-valuenow', '2');
        expect(loc).toHaveAttribute('aria-valuemax', '3');
        expect(loc).toHaveAttribute('aria-valuetext', 'slippage');
        expect(screen.getByText('slippage')).toBeInTheDocument();
        expect(screen.queryByText('LoC')).not.toBeInTheDocument();
    });

    it('opens the Player Grimoire from the HUD chrome without revealing location or carried items', () => {
        seedClara();
        useAppStore.setState({
            inventoryItems: [
                {
                    id: 'c1',
                    name: 'soli',
                    qty: 4,
                    category: 'currency',
                    keywords: [],
                    equipped: false,
                    lastUsedScene: '',
                    importance: 1,
                    notes: '',
                },
                {
                    id: 'k1',
                    name: "Grandfather's leather casebook",
                    qty: 1,
                    category: 'misc',
                    keywords: [],
                    equipped: false,
                    lastUsedScene: '',
                    importance: 2,
                    notes: '',
                },
            ],
        });
        render(<LotmPlayerHud />);

        fireEvent.click(screen.getByRole('complementary', { name: /Player status/i }));
        expect(useAppStore.getState().playerGrimoireOpen).toBe(true);
        expect(useAppStore.getState().playerGrimoireSection).toBe('character');
        expect(screen.queryByText('Location')).not.toBeInTheDocument();
        expect(screen.queryByText('Carried')).not.toBeInTheDocument();
        expect(screen.queryByText('soli')).not.toBeInTheDocument();
        expect(screen.queryByText(/Grandfather's leather casebook/)).not.toBeInTheDocument();
        expect(screen.queryByText('Bounty')).not.toBeInTheDocument();
        expect(screen.getByRole('complementary', { name: /Player status/i })).not.toHaveAttribute('aria-expanded');
        expect(screen.queryByRole('button', { name: /Open Player Grimoire/i })).not.toBeInTheDocument();
    });

    it('opens the Player Grimoire Character Record from the name and Pathway details from the emblem', async () => {
        const user = userEvent.setup();
        seedClara();
        render(<LotmPlayerHud />);

        await user.click(screen.getByRole('button', { name: 'Open Character Record for Clara Whitlock' }));
        expect(useAppStore.getState().playerGrimoireOpen).toBe(true);
        expect(useAppStore.getState().playerGrimoireSection).toBe('character');
        expect(screen.queryByText('Location')).not.toBeInTheDocument();

        useAppStore.getState().closePlayerGrimoire();

        await user.click(screen.getByRole('button', { name: /Open Pathway details for Fool Pathway/i }));
        expect(useAppStore.getState().playerGrimoireOpen).toBe(true);
        expect(useAppStore.getState().playerGrimoireSection).toBe('pathway');
    });
});
