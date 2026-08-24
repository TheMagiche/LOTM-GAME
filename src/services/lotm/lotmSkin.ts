import type { Campaign } from '../../types';

export function isLotmCampaign(campaign: Campaign | null | undefined): boolean {
    if (!campaign) return false;
    return campaign.worldPackId === 'lord-of-the-mysteries' || campaign.uiSkin === 'lotm-illustrated';
}

export function shouldUseIllustratedShell(campaign: Campaign | null | undefined): boolean {
    return campaign?.uiSkin === 'lotm-illustrated';
}
