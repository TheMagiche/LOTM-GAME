import type { Campaign } from '../../types';
import { isLotmCampaign } from './lotmSkin';
import { LOTM_EXCLUSIVE_UI } from './lotmFlags';

export { LOTM_EXCLUSIVE_UI };

export const LOTM_DOCUMENT_TITLE = 'Lord of the Mysteries';

export function filterLoadableCampaigns(campaigns: Campaign[]): Campaign[] {
    return campaigns.filter(isLotmCampaign);
}

export function pickContinueCampaign(campaigns: Campaign[]): Campaign | null {
    const loadable = filterLoadableCampaigns(campaigns);
    if (loadable.length === 0) return null;
    return [...loadable].sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))[0] ?? null;
}

export function applyLotmExclusiveDocumentChrome(): void {
    document.documentElement.setAttribute('data-ui-skin', 'lotm-illustrated');
    document.documentElement.setAttribute('data-theme', 'dark');
    document.title = LOTM_DOCUMENT_TITLE;
}

export function clearLotmExclusiveDocumentChrome(): void {
    document.documentElement.removeAttribute('data-ui-skin');
}
