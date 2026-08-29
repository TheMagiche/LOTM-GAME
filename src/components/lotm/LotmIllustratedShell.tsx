import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { maybeInjectLotmOpeningPrompt } from '../../services/lotm/lotmOpeningPrompt';
import { ChatArea } from '../ChatArea';
import { LotmChapterCard } from './LotmChapterCard';
import { LotmPlayerHud } from './LotmPlayerHud';
import { LotmWorldIndexOverlay } from './LotmWorldIndexOverlay';

export function LotmIllustratedShell() {
    const campaignId = useAppStore(s => s.activeCampaignId);
    const chronicleOpen = useAppStore(s => s.lotmChronicleOpen);
    const setLotmChronicleOpen = useAppStore(s => s.setLotmChronicleOpen);
    useEffect(() => {
        setLotmChronicleOpen(false);
    }, [campaignId, setLotmChronicleOpen]);

    useEffect(() => {
        const { messages, playerCharacter, injectToComposer } = useAppStore.getState();
        maybeInjectLotmOpeningPrompt(messages, playerCharacter, injectToComposer);
    }, [campaignId]);

    return (
        <div className="lotm-shell relative flex-1 flex flex-col min-w-0 overflow-hidden">
            <LotmPlayerHud />
            <ChatArea presentation="illustrated" chronicleOpen={chronicleOpen} />
            <LotmChapterCard />
            <LotmWorldIndexOverlay />
        </div>
    );
}
