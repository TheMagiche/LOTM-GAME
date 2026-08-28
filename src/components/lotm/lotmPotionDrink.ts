import { toast } from '../Toast';
import { useAppStore } from '../../store/useAppStore';
import { applyLotmPotionDrink } from '../../worldpacks/lotmBeyonderState';

/** UI commit for a digested next-Sequence drink. Never silently increments Sequence. */
export function commitLotmPotionDrink(): boolean {
    const state = useAppStore.getState();
    const result = applyLotmPotionDrink(state.playerCharacter, state.characterProfileData);
    if (!result.ok) {
        toast.warning(result.error);
        return false;
    }
    state.updatePlayerCharacter({
        signatureKit: result.pc.signatureKit,
        pcMeta: result.pc.pcMeta,
    });
    state.setCharacterProfileData(result.profile);
    toast.success(`Drank the ${result.pc.signatureKit?.sequence != null ? `Sequence ${result.pc.signatureKit.sequence}` : 'next'} potion.`);
    return true;
}
