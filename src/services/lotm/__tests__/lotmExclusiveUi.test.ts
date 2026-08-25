import { describe, expect, it } from 'vitest';
import type { Campaign } from '../../../types';
import { filterLoadableCampaigns, pickContinueCampaign } from '../lotmExclusiveUi';

function campaign(partial: Partial<Campaign> & Pick<Campaign, 'id' | 'name'>): Campaign {
    return {
        coverImage: '',
        createdAt: 1,
        lastPlayedAt: 1,
        ...partial,
    };
}

describe('lotmExclusiveUi', () => {
    it('hides non-LOTM campaigns from the title screen', () => {
        const lotm = campaign({ id: 'a', name: 'Fifth Epoch', worldPackId: 'lord-of-the-mysteries' });
        const other = campaign({ id: 'b', name: 'Iron Crown' });
        expect(filterLoadableCampaigns([lotm, other])).toEqual([lotm]);
    });

    it('continues the most recently played LOTM chronicle', () => {
        const older = campaign({
            id: 'old',
            name: 'Old',
            worldPackId: 'lord-of-the-mysteries',
            lastPlayedAt: 10,
        });
        const newer = campaign({
            id: 'new',
            name: 'New',
            uiSkin: 'lotm-illustrated',
            lastPlayedAt: 99,
        });
        const other = campaign({ id: 'x', name: 'Other', lastPlayedAt: 1000 });
        expect(pickContinueCampaign([older, other, newer])?.id).toBe('new');
    });
});
