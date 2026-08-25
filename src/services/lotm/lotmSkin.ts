import type { Campaign } from '../../types';
import { LOTM_EXCLUSIVE_UI } from './lotmFlags';

export function isLotmCampaign(campaign: Campaign | null | undefined): boolean {
    if (!campaign) return false;
    return campaign.worldPackId === 'lord-of-the-mysteries' || campaign.uiSkin === 'lotm-illustrated';
}

export function shouldUseIllustratedShell(campaign: Campaign | null | undefined): boolean {
    if (!campaign) return false;
    if (LOTM_EXCLUSIVE_UI && isLotmCampaign(campaign)) return true;
    return campaign.uiSkin === 'lotm-illustrated';
}
