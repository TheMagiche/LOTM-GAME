import { saveCampaign } from '../../store/campaignStore';
import { initializeCampaignState } from '../campaignInit';
import type { Campaign, PlayerCharacter } from '../../types';
import { uid } from '../../utils/uid';
import { LORD_OF_THE_MYSTERIES_PACK, worldPackToFile } from '../../worldpacks/lordOfTheMysteries';
import { lotmAssetUrl } from './lotmAssetUrl';

function parseDefaultPc(raw: string): PlayerCharacter | null {
    try {
        const parsed = JSON.parse(raw) as unknown;
        const row = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!row || typeof row !== 'object') return null;
        return row as PlayerCharacter;
    } catch {
        return null;
    }
}

export async function createLotmCampaign(options?: {
    name?: string;
    playAsClara?: boolean;
}): Promise<Campaign> {
    const pack = LORD_OF_THE_MYSTERIES_PACK;
    const playAsClara = options?.playAsClara !== false;
    const campaign: Campaign = {
        id: uid(),
        name: options?.name?.trim() || pack.suggestedName,
        coverImage: pack.coverAssetPath ? lotmAssetUrl(pack.coverAssetPath) : '',
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        worldPackId: pack.id,
        uiSkin: 'lotm-illustrated',
    };

    const playerCharacter = playAsClara && pack.defaultPc
        ? parseDefaultPc(pack.defaultPc.contents)
        : null;

    await saveCampaign(campaign);
    await initializeCampaignState({
        campaignId: campaign.id,
        loreFile: worldPackToFile(pack.lore),
        rulesFile: worldPackToFile(pack.rules),
        lootFile: worldPackToFile(pack.loot),
        starterText: pack.starter?.contents ?? null,
        playerCharacter,
        attachLotmVisuals: true,
    });

    return campaign;
}
