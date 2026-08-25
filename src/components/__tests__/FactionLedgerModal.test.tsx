import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FactionLedgerModal } from '../FactionLedgerModal';
import { useAppStore } from '../../store/useAppStore';
import type { FactionEntry } from '../../types';

function makeFaction(id: string, name: string): FactionEntry {
    return {
        id,
        name,
        aliases: '',
        type: '',
        stance: '',
        keyMembers: '',
        region: '',
        pathways: '',
        description: '',
        relations: [],
        firstSeenScene: '1',
        lastSeenScene: '1',
        source: 'manual',
    };
}

function saveNewFaction(name: string) {
    fireEvent.click(screen.getByRole('button', { name: 'New Faction' }));
    fireEvent.change(screen.getByPlaceholderText('Church of the Evernight Goddess'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('FactionLedgerModal', () => {
    beforeEach(() => {
        useAppStore.setState({
            factionLedgerOpen: true,
            factionLedger: [],
        });
    });

    afterEach(() => {
        cleanup();
        useAppStore.setState({
            factionLedgerOpen: false,
            factionLedger: [],
        });
    });

    it('keeps the saved faction selected after creating it', () => {
        render(<FactionLedgerModal />);
        saveNewFaction('Tarot Club');
        expect(screen.getByRole('heading', { name: 'Faction Details' })).toBeInTheDocument();
        expect(useAppStore.getState().factionLedger.find(f => f.name === 'Tarot Club')?.id).toBeTruthy();
    });

    it('edits stance and relations between two factions', () => {
        render(<FactionLedgerModal />);
        saveNewFaction('Tarot Club');
        saveNewFaction('Aurora Order');

        fireEvent.click(screen.getByText('Tarot Club'));
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.change(screen.getByPlaceholderText('Lawful establishment in Loen'), { target: { value: 'Hidden gathering' } });
        fireEvent.change(screen.getByDisplayValue('Select faction...'), {
            target: { value: useAppStore.getState().factionLedger.find(f => f.name === 'Aurora Order')?.id },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        const tarot = useAppStore.getState().factionLedger.find(f => f.name === 'Tarot Club');
        const aurora = useAppStore.getState().factionLedger.find(f => f.name === 'Aurora Order');
        expect(tarot?.stance).toBe('Hidden gathering');
        expect(tarot?.relations).toEqual(expect.arrayContaining([
            expect.objectContaining({ toId: aurora?.id, kind: 'allied' }),
        ]));
        expect(aurora?.relations).toEqual(expect.arrayContaining([
            expect.objectContaining({ toId: tarot?.id, kind: 'allied' }),
        ]));
    });

    it('selects an existing faction from the list', () => {
        useAppStore.setState({
            factionLedger: [makeFaction('fac_1', 'Secret Order')],
        });
        render(<FactionLedgerModal />);
        fireEvent.click(screen.getAllByText('Secret Order')[0]);
        expect(screen.getByRole('heading', { name: 'Faction Details' })).toBeInTheDocument();
    });
});
