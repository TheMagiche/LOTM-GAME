import { saveCampaign } from '../../store/campaignStore';
import { initializeCampaignState } from '../campaignInit';
import type { Campaign, PlayerCharacter } from '../../types';
import { uid } from '../../utils/uid';
import {
    DEFAULT_PLAYABLE_PC_ID,
    LORD_OF_THE_MYSTERIES_PACK,
    parsePlayablePc,
    worldPackToFile,
    type WorldPack,
} from '../../worldpacks/lordOfTheMysteries';
import { lotmChronicleName } from '../../worldpacks/lotmPathways';
import { lotmAssetUrl } from './lotmAssetUrl';

export function resolvePlayablePc(
    pack: WorldPack,
    pcId?: string | null,
): PlayerCharacter | null {
    if (pcId === '') return null;
    const id = pcId || DEFAULT_PLAYABLE_PC_ID;
    const option = pack.playablePcs?.find(pc => pc.id === id);
    const raw = option?.file.contents ?? pack.defaultPc?.contents;
    return raw ? parsePlayablePc(raw) : null;
}

export async function createLotmCampaign(options?: {
    name?: string;
    /** Playable PC id. Omitted = Clara. */
    pcId?: string | null;
}): Promise<Campaign> {
    const pack = LORD_OF_THE_MYSTERIES_PACK;
    const playerCharacter = resolvePlayablePc(pack, options?.pcId);
    const autoName = playerCharacter
        ? lotmChronicleName(playerCharacter.name, playerCharacter.signatureKit?.pathway)
        : pack.suggestedName;
    const campaign: Campaign = {
        id: uid(),
        name: options?.name?.trim() || autoName,
        coverImage: pack.coverAssetPath ? lotmAssetUrl(pack.coverAssetPath) : '',
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        worldPackId: pack.id,
        uiSkin: 'lotm-illustrated',
    };

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
