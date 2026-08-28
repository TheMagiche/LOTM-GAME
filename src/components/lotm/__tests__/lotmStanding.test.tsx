import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { NPCEntry } from '../../../types';
import { standingWordForName } from '../lotmStanding';
import { LotmStage } from '../LotmStage';

function npc(name: string, pcRelation: number): NPCEntry {
    return {
        id: `npc_${name}`,
        name,
        aliases: '',
        appearance: '',
        faction: '',
        storyRelevance: '',
        disposition: '',
        status: '',
        goals: '',
        voice: '',
        personality: '',
        exampleOutput: '',
        affinity: 0,
        pcRelation,
    };
}

describe('standingWordForName', () => {
    it('returns band words for on-stage NPCs and never a number', () => {
        const ledger = [npc('Dunn Smith', -1)];
        expect(standingWordForName('Dunn Smith', ledger, ['npc_Dunn Smith'])).toBe('Cold');
        expect(standingWordForName('Dunn Smith', ledger, ['npc_Dunn Smith'])).not.toMatch(/-1/);
        expect(standingWordForName('Narration', ledger, ['npc_Dunn Smith'])).toBeNull();
        expect(standingWordForName('Dunn Smith', ledger, [])).toBeNull();
    });
});

describe('LotmStage standing caption', () => {
    it('shows Standing words on non-PC portraits', () => {
        render(<LotmStage portraits={[{ name: 'Dunn Smith', src: 'x.webp', standing: 'Cold' }]} />);
        expect(screen.getByText('Cold')).toBeInTheDocument();
        expect(screen.queryByText('-1')).toBeNull();
    });
});
