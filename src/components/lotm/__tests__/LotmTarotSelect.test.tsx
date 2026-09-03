import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PLAYABLE_PC_ID, LOTM_PLAYABLE_PCS } from '../../../worldpacks/lordOfTheMysteries';
import { lotmChronicleName, resolveLotmPathway } from '../../../worldpacks/lotmPathways';
import { getCharacterImageForPc, LotmTarotSelect } from '../LotmTarotSelect';

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

    it('resolves player images from gamedata/image/players for matching characters', () => {
        const clara = LOTM_PLAYABLE_PCS.find(pc => pc.name === 'Clara Whitlock')!;
        const benedict = LOTM_PLAYABLE_PCS.find(pc => pc.name === 'Benedict Faulkner')!;
        const arthur = LOTM_PLAYABLE_PCS.find(pc => pc.name === 'Arthur Pendel')!;
        const cassian = LOTM_PLAYABLE_PCS.find(pc => pc.name === 'Cassian Dray')!;

        expect(getCharacterImageForPc(clara, resolveLotmPathway(clara.pathway))).toContain('image/players/clara_whitlock.jpeg');
        expect(getCharacterImageForPc(benedict, resolveLotmPathway(benedict.pathway))).toContain('image/players/benedict_faulkner.jpeg');
        expect(getCharacterImageForPc(arthur, resolveLotmPathway(arthur.pathway))).toContain('image/players/arthur_pendel.jpeg');
        expect(getCharacterImageForPc(cassian, resolveLotmPathway(cassian.pathway))).toContain('image/players/cassian_dray.jpeg');
    });
});
