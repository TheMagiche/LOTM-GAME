import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, MapPin } from 'lucide-react';
import { MessageMarkdown } from '../message/MessageMarkdown';
import { ChatEmptyState } from '../chat/ChatEmptyState';
import { useAppStore } from '../../store/useAppStore';
import { formatLotmPlaceLabel, matchLotmVisuals } from '../../services/lotm/lotmVisualMatcher';
import type { ChatMessage } from '../../types';
import { LotmSceneModal } from './LotmSceneModal';

function gmBeats(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter(message => message.role === 'assistant');
}

export function LotmDialoguePlate({
    messages,
    isStreaming,
    onCreateCharacter,
}: {
    messages: ChatMessage[];
    isStreaming: boolean;
    onCreateCharacter: () => void;
}) {
    const beats = useMemo(() => gmBeats(messages), [messages]);
    const lastId = beats.at(-1)?.id ?? null;
    const [index, setIndex] = useState(() => Math.max(0, beats.length - 1));
    const [sceneOpen, setSceneOpen] = useState(false);
    const lastIdRef = useRef(lastId);

    useEffect(() => {
        if (lastId !== lastIdRef.current) {
            lastIdRef.current = lastId;
            setIndex(Math.max(0, beats.length - 1));
        } else {
            setIndex(current => Math.min(current, Math.max(0, beats.length - 1)));
        }
    }, [lastId, beats.length]);

    const campaignId = useAppStore(s => s.activeCampaignId);
    useEffect(() => {
        setSceneOpen(false);
    }, [campaignId]);

    const context = useAppStore(s => s.context);
    const locationLedger = useAppStore(s => s.locationLedger);
    const npcLedger = useAppStore(s => s.npcLedger);
    const onStageNpcIds = useAppStore(s => s.onStageNpcIds);
    const playerCharacter = useAppStore(s => s.playerCharacter);
    const spoilers = useAppStore(s => s.activeCampaignMeta?.lotmSpoilers === true);

    const message = beats[index] ?? null;
    const viewingLatest = !!message && message.id === lastId;
    const gmText = message?.displayContent || message?.content || '';

    const currentFeature = context.currentFeature || null;
    const currentPlace = context.currentPlaceId
        ? locationLedger.find(place => place.id === context.currentPlaceId)
        : undefined;
    const locationLabel = formatLotmPlaceLabel(currentPlace?.name, currentFeature);

    const match = useMemo(() => matchLotmVisuals({
        placeName: currentPlace?.name,
        placeAliases: currentPlace?.aliases,
        placeRegion: currentPlace?.broadLocation,
        placeFeature: currentFeature,
        latestGmText: gmText,
        npcLedger,
        onStageNpcIds,
        playerCharacter,
        spoilers,
    }), [
        currentPlace?.name, currentPlace?.aliases, currentPlace?.broadLocation, currentFeature, gmText,
        npcLedger, onStageNpcIds, playerCharacter, spoilers,
    ]);

    const canPrev = index > 0;
    const canNext = index < beats.length - 1;
    const beatLabel = beats.length === 0 ? '0 / 0' : `${index + 1} / ${beats.length}`;

    const goPrev = useCallback(() => {
        setIndex(current => Math.max(0, current - 1));
    }, []);
    const goNext = useCallback(() => {
        setIndex(current => Math.min(current + 1, Math.max(0, beats.length - 1)));
    }, [beats.length]);

    useEffect(() => {
        if (sceneOpen) return;
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) return;
            if (event.key === 'ArrowLeft' && index > 0) {
                event.preventDefault();
                goPrev();
            }
            if (event.key === 'ArrowRight' && index < beats.length - 1) {
                event.preventDefault();
                goNext();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [sceneOpen, index, beats.length, goPrev, goNext]);

    return (
        <>
            <div className="lotm-plate relative z-10 mx-3 mb-1">
                <div className="lotm-plate-nameplate">
                    <span>{message ? match.speakerName : 'Narration'}</span>
                    <div className="lotm-plate-controls">
                        {isStreaming && viewingLatest && <span className="lotm-plate-streaming">writing</span>}
                        <button
                            type="button"
                            className="lotm-plate-scene"
                            onClick={() => setSceneOpen(true)}
                            aria-label="Open scene illustration"
                            title={locationLabel ? `View scene: ${locationLabel}` : 'View scene backdrop and portraits'}
                        >
                            <Images size={13} />
                            <span>Scene</span>
                        </button>
                        {beats.length > 0 && (
                            <div className="lotm-plate-nav" role="group" aria-label="GM text">
                                <button type="button" onClick={goPrev} disabled={!canPrev} aria-label="Previous GM text">
                                    <ChevronLeft size={14} />
                                </button>
                                <span aria-live="polite">{beatLabel}</span>
                                <button type="button" onClick={goNext} disabled={!canNext} aria-label="Next GM text">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <p className="lotm-plate-location" aria-label="Current location">
                    <MapPin size={12} aria-hidden />
                    <span>{locationLabel || 'Location unknown'}</span>
                </p>
                {message ? (
                    <div className="lotm-plate-body gm-prose">
                        <MessageMarkdown content={gmText} />
                    </div>
                ) : (
                    <ChatEmptyState onCreateCharacter={onCreateCharacter} />
                )}
            </div>
            {sceneOpen && (
                <LotmSceneModal
                    backdrop={match.backdrop}
                    portraits={match.portraits}
                    speakerName={message ? match.speakerName : 'Scene'}
                    locationLabel={locationLabel}
                    beatLabel={beatLabel}
                    canPrev={canPrev}
                    canNext={canNext}
                    onPrev={goPrev}
                    onNext={goNext}
                    onClose={() => setSceneOpen(false)}
                />
            )}
        </>
    );
}
