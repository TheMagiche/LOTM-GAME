import { cleanup, render, screen } from '@testing-library/react';
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
        pcPanelOpen: false,
        grimoireOpen: false,
        grimoireFocus: null,
    });
});

describe('LotmPlayerHud', () => {
    beforeEach(() => {
        useAppStore.setState({
        playerCharacter: null,
        characterProfileData: DEFAULT_CHARACTER_PROFILE,
        pcPanelOpen: false,
        grimoireOpen: false,
        grimoireFocus: null,
    });
    });

    it('renders nothing without a seeded character', () => {
        const { container } = render(<LotmPlayerHud />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows name, sequence, emblem, Spirit, LoC, digestion, and abilities on the play HUD', () => {
        seedClara();
        render(<LotmPlayerHud />);

        const hud = screen.getByRole('complementary', { name: 'Player status' });
        expect(hud).toBeInTheDocument();
        expect(screen.getByText('Clara Whitlock')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open character sheet for Clara Whitlock' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Open Grimoire for Fool Pathway/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Sheet$/i })).not.toBeInTheDocument();
        expect(screen.getByText(/Fool Pathway/i)).toBeInTheDocument();
        expect(screen.getByText(/Sequence 9/)).toBeInTheDocument();
        expect(screen.getByText(/Fool Pathway · Sequence 9 · Seer/)).toBeInTheDocument();
        expect(hud.querySelector('img.lotm-player-hud-emblem')).toBeTruthy();
        expect(screen.queryByRole('meter', { name: 'HP' })).toBeNull();
        expect(screen.getByRole('meter', { name: 'Spirit' })).toHaveAttribute('aria-valuenow', '14');
        expect(screen.getByRole('meter', { name: 'Digestion' })).toHaveAttribute('aria-valuenow', '0');
        expect(screen.getByText('stable')).toBeInTheDocument();
        expect(screen.getByLabelText('Sequence band')).toHaveTextContent(/Advantage/);
        expect(screen.getByLabelText(/Sequence ladder/i).querySelector('li.is-current')).toHaveTextContent('9');
        expect(screen.getByText(/Spirit Vision/)).toBeInTheDocument();
    });

    it('expands inventory facts, carried items, and the next Sequence', async () => {
        const user = userEvent.setup();
        seedClara();
        render(<LotmPlayerHud />);

        await user.click(screen.getByRole('button', { name: /inventory/i }));
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Tingen')).toBeInTheDocument();
        expect(screen.getByText('Currency')).toBeInTheDocument();
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Bounty')).toBeInTheDocument();
        expect(screen.getByText('Physique')).toBeInTheDocument();
        expect(screen.getByText(/Grandfather's leather casebook/)).toBeInTheDocument();
        expect(screen.getByText('Sequence abilities')).toBeInTheDocument();
        expect(screen.getByText(/Sequence 8 · Clown/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /inventory/i })).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', { name: /Drink next potion/i })).toBeDisabled();
    });

    it('opens the character sheet from the name and the Grimoire from the emblem', async () => {
        const user = userEvent.setup();
        seedClara();
        render(<LotmPlayerHud />);

        await user.click(screen.getByRole('button', { name: 'Open character sheet for Clara Whitlock' }));
        expect(useAppStore.getState().pcPanelOpen).toBe(true);

        await user.click(screen.getByRole('button', { name: /Open Grimoire for Fool Pathway/i }));
        expect(useAppStore.getState().grimoireOpen).toBe(true);
        expect(useAppStore.getState().grimoireFocus).toEqual({ section: 'pathways', id: 'fool' });
    });
});
