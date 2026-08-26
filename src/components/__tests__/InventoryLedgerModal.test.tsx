import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InventoryLedgerModal } from '../InventoryLedgerModal';
import { useAppStore } from '../../store/useAppStore';
import type { ItemLedgerEntry } from '../../types';
import { EMPTY_ITEM_ENTRY } from '../../types';

function makeItem(id: string, name: string, extra: Partial<ItemLedgerEntry> = {}): ItemLedgerEntry {
    return {
        ...EMPTY_ITEM_ENTRY,
        id,
        name,
        kind: 'sealed-artefact',
        grade: '3',
        code: '3-1328',
        source: 'manual',
        ...extra,
    };
}

function saveNewItem(name: string) {
    fireEvent.click(screen.getByRole('button', { name: 'New Item' }));
    fireEvent.change(screen.getByPlaceholderText('Eye of Crystal'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

describe('InventoryLedgerModal', () => {
    beforeEach(() => {
        useAppStore.setState({
            itemLedgerOpen: true,
            itemLedger: [],
            inventoryItems: [],
            playerCharacter: null,
        });
    });

    afterEach(() => {
        cleanup();
        useAppStore.setState({
            itemLedgerOpen: false,
            itemLedger: [],
            inventoryItems: [],
        });
    });

    it('keeps the saved item selected after creating it', () => {
        render(<InventoryLedgerModal />);
        saveNewItem('Master Key');
        expect(screen.getByRole('heading', { name: 'Item Details' })).toBeInTheDocument();
        expect(useAppStore.getState().itemLedger.find(item => item.name === 'Master Key')?.id).toBeTruthy();
    });

    it('edits function and possessed flag', () => {
        render(<InventoryLedgerModal />);
        saveNewItem('Master Key');
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.change(screen.getByPlaceholderText('What it does when used or worn.'), {
            target: { value: 'Opens any mundane lock.' },
        });
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        const key = useAppStore.getState().itemLedger.find(item => item.name === 'Master Key');
        expect(key?.function).toBe('Opens any mundane lock.');
        expect(key?.possessed).toBe(true);
    });

    it('selects an existing item from the list', () => {
        useAppStore.setState({
            itemLedger: [makeItem('itm_1', 'Eye of Crystal')],
        });
        render(<InventoryLedgerModal />);
        fireEvent.click(screen.getAllByText('Eye of Crystal')[0]);
        expect(screen.getByRole('heading', { name: 'Item Details' })).toBeInTheDocument();
        expect(screen.getByText('3-1328')).toBeInTheDocument();
    });

    it('grants a selected item into character inventory', () => {
        useAppStore.setState({
            itemLedger: [makeItem('itm_1', 'Eye of Crystal')],
            playerCharacter: { id: 'pc_1', name: 'Klein' } as never,
        });
        render(<InventoryLedgerModal />);
        fireEvent.click(screen.getAllByText('Eye of Crystal')[0]);
        fireEvent.click(screen.getByRole('button', { name: 'Grant to Character' }));
        expect(useAppStore.getState().itemLedger[0].possessed).toBe(true);
        expect(useAppStore.getState().itemLedger[0].holder).toBe('Klein');
        expect(useAppStore.getState().inventoryItems.some(item => item.name === 'Eye of Crystal')).toBe(true);
    });
});
