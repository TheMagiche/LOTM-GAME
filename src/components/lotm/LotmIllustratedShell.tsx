import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { matchLotmVisuals } from '../../services/lotm/lotmVisualMatcher';
import { ChatArea } from '../ChatArea';
import { LotmStage } from './LotmStage';
import { LotmCgEcho } from './LotmCgEcho';
import { LotmChapterCard } from './LotmChapterCard';

export function LotmIllustratedShell() {
    const context = useAppStore(s => s.context);
    const locationLedger = useAppStore(s => s.locationLedger);
    const npcLedger = useAppStore(s => s.npcLedger);
    const onStageNpcIds = useAppStore(s => s.onStageNpcIds);
    const playerCharacter = useAppStore(s => s.playerCharacter);
    const messages = useAppStore(s => s.messages);
    const spoilers = useAppStore(s => s.activeCampaignMeta?.lotmSpoilers === true);
    const campaignId = useAppStore(s => s.activeCampaignId);
    const [dismissedCgs, setDismissedCgs] = useState<Set<string>>(() => new Set());
    const [chronicleOpen, setChronicleOpen] = useState(false);

    useEffect(() => {
        setDismissedCgs(new Set());
        setChronicleOpen(false);
    }, [campaignId]);

    const latestGm = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant') return messages[i];
        }
        return null;
    }, [messages]);

    const currentPlace = context.currentPlaceId
        ? locationLedger.find(l => l.id === context.currentPlaceId)
        : undefined;

    const match = useMemo(() => matchLotmVisuals({
        placeName: currentPlace?.name,
        placeAliases: currentPlace?.aliases,
        latestGmText: latestGm?.displayContent || latestGm?.content || '',
        npcLedger,
        onStageNpcIds,
        playerCharacter,
        spoilers,
    }, dismissedCgs), [
        currentPlace?.name, currentPlace?.aliases, latestGm?.content, latestGm?.displayContent,
        npcLedger, onStageNpcIds, playerCharacter, spoilers, dismissedCgs,
    ]);

    const backdropUrl = lotmAssetUrl(match.backdrop);

    return (
        <div className="lotm-shell relative flex-1 flex flex-col min-w-0 overflow-hidden">
            <div
                className="lotm-backdrop pointer-events-none"
                style={{ backgroundImage: `url("${backdropUrl}")` }}
                aria-hidden
            />
            <div className="lotm-backdrop-scrim pointer-events-none" aria-hidden />

            {!chronicleOpen && (
                <LotmStage portraits={match.portraits} />
            )}

            <ChatArea
                presentation="illustrated"
                chronicleOpen={chronicleOpen}
                onToggleChronicle={() => setChronicleOpen(v => !v)}
                speakerName={match.speakerName}
                latestAssistantId={latestGm?.id ?? null}
            />

            {match.cgEcho && !chronicleOpen && (
                <LotmCgEcho
                    image={match.cgEcho.image}
                    onDismiss={() => setDismissedCgs(prev => new Set(prev).add(match.cgEcho!.image))}
                />
            )}

            <LotmChapterCard />
        </div>
    );
}
