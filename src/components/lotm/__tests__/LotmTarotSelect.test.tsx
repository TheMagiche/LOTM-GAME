import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PLAYABLE_PC_ID, LOTM_PLAYABLE_PCS } from '../../../worldpacks/lordOfTheMysteries';
import { lotmChronicleName } from '../../../worldpacks/lotmPathways';
import { LotmTarotSelect } from '../LotmTarotSelect';

afterEach(() => {
    cleanup();
});

describe('LotmTarotSelect', () => {
    it('renders tarot cards with pathway, sequence, and emblem — no custom-character option', () => {
        const clara = LOTM_PLAYABLE_PCS.find(pc => pc.id === DEFAULT_PLAYABLE_PC_ID);
        expect(clara).toBeDefined();

        render(
            <LotmTarotSelect
                pcs={LOTM_PLAYABLE_PCS}
                selectedId={DEFAULT_PLAYABLE_PC_ID}
                onSelect={() => {}}
                onConfirm={() => {}}
            />,
        );

        expect(screen.getByRole('listbox', { name: 'Starting characters' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Clara Whitlock/i, selected: true })).toBeInTheDocument();
        expect(screen.getByText('Fool Pathway')).toBeInTheDocument();
        expect(screen.getAllByText('Sequence 9 · Seer').length).toBeGreaterThan(0);
        expect(screen.getByRole('option', { selected: true }).querySelector('img')).toBeTruthy();
        expect(screen.queryByText(/create my own/i)).toBeNull();
        expect(screen.queryByLabelText(/chronicle name/i)).toBeNull();
        expect(lotmChronicleName(clara!.name, clara!.pathway)).toBe('Clara Whitlock — Fool Pathway');
    });

    it('moves to the next card without offering a name field', () => {
        const onSelect = vi.fn();
        render(
            <LotmTarotSelect
                pcs={LOTM_PLAYABLE_PCS}
                selectedId={DEFAULT_PLAYABLE_PC_ID}
                onSelect={onSelect}
                onConfirm={() => {}}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
        expect(onSelect).toHaveBeenCalled();
        expect(onSelect.mock.calls[0][0]).not.toBe('');
        expect(screen.queryByRole('textbox')).toBeNull();
    });
});
