import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Images, MapPin, RotateCw } from 'lucide-react';
import { MessageMarkdown } from '../message/MessageMarkdown';
import { ChatEmptyState } from '../chat/ChatEmptyState';
import { useAppStore } from '../../store/useAppStore';
import { formatLotmPlaceLabel, matchLotmVisuals } from '../../services/lotm/lotmVisualMatcher';
import { proseForTTS } from '../../services/tts/proseStripper';
import { hasSwipeSet } from '../../services/turn/pendingCommit';
import type { ChatMessage } from '../../types';
import { useTtsPlayback } from '../hooks/useTtsPlayback';
import { useMessageEditor } from '../hooks/useMessageEditor';
import { useSwipeVariants } from '../hooks/useSwipeVariants';
import { useSceneContinue } from '../hooks/useSceneContinue';
import { TtsPlaybackPanel } from '../tts/TtsPlaybackPanel';
import { InlineMessageEditor } from '../message/InlineMessageEditor';
import { MessageActionRail } from '../message/MessageActionRail';
import { MessageBelowSlots } from '../message/MessageBelowSlots';
import { SwipeIndicator, ContinueButton } from '../message/SwipeIndicator';
import { standingWordForName, standingWordForNpc } from './lotmStanding';
import { LotmSceneModal } from './LotmSceneModal';

function gmBeats(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter(message => message.role === 'assistant');
}

export function LotmDialoguePlate({
    messages,
    isStreaming,
    onCreateCharacter,
    editor,
    pendingMessageId,
    swipe,
    sceneContinue,
    onOpenSwipeSheet,
    onRetry,
}: {
    messages: ChatMessage[];
    isStreaming: boolean;
    onCreateCharacter: () => void;
    editor: ReturnType<typeof useMessageEditor>;
    pendingMessageId: string | null;
    swipe: ReturnType<typeof useSwipeVariants>;
    sceneContinue: ReturnType<typeof useSceneContinue>;
    onOpenSwipeSheet: (messageId: string) => void;
    onRetry?: (messageId: string) => void;
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

    const portraits = useMemo(() => {
        const onStage = new Set(onStageNpcIds ?? []);
        return match.portraits.map(portrait => {
            if (portrait.isPc) return portrait;
            const npc = npcLedger.find(entry => onStage.has(entry.id) && entry.name === portrait.name);
            const standing = standingWordForNpc(npc);
            return standing ? { ...portrait, standing } : portrait;
        });
    }, [match.portraits, npcLedger, onStageNpcIds]);

    const speakerStanding = standingWordForName(
        match.speakerName,
        npcLedger,
        onStageNpcIds,
        playerCharacter?.name,
    );

    const canPrev = index > 0;
    const canNext = index < beats.length - 1;
    const beatLabel = beats.length === 0 ? '0 / 0' : `${index + 1} / ${beats.length}`;
    const editing = !!message && editor.editingMessageId === message.id;

    const goPrev = useCallback(() => {
        setIndex(current => Math.max(0, current - 1));
    }, []);
    const goNext = useCallback(() => {
        setIndex(current => Math.min(current + 1, Math.max(0, beats.length - 1)));
    }, [beats.length]);

    useEffect(() => {
        if (sceneOpen || editing) return;
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
    }, [sceneOpen, editing, index, beats.length, goPrev, goNext]);

    return (
        <>
            <div className="lotm-plate relative z-10 mx-3 mb-1">
                <div className="lotm-plate-nameplate">
                    <span>
                        {message ? match.speakerName : 'Narration'}
                        {speakerStanding && <span className="lotm-plate-standing">{speakerStanding}</span>}
                    </span>
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
                    <LotmPlateGmBody
                        key={message.id}
                        message={message}
                        gmText={gmText}
                        isStreaming={isStreaming}
                        editing={editing}
                        editor={editor}
                        pendingMessageId={pendingMessageId}
                        swipe={swipe}
                        sceneContinue={sceneContinue}
                        onOpenSwipeSheet={onOpenSwipeSheet}
                        onRetry={onRetry}
                    />
                ) : (
                    <ChatEmptyState onCreateCharacter={onCreateCharacter} />
                )}
            </div>
            {sceneOpen && (
                <LotmSceneModal
                    backdrop={match.backdrop}
                    portraits={portraits}
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

function LotmPlateGmBody({
    message,
    gmText,
    isStreaming,
    editing,
    editor,
    pendingMessageId,
    swipe,
    sceneContinue,
    onOpenSwipeSheet,
    onRetry,
}: {
    message: ChatMessage;
    gmText: string;
    isStreaming: boolean;
    editing: boolean;
    editor: ReturnType<typeof useMessageEditor>;
    pendingMessageId: string | null;
    swipe: ReturnType<typeof useSwipeVariants>;
    sceneContinue: ReturnType<typeof useSceneContinue>;
    onOpenSwipeSheet: (messageId: string) => void;
    onRetry?: (messageId: string) => void;
}) {
    const markdownContent = gmText.replace(/^Scene\s*#\d+\s*\|?\s*/i, '');
    const tts = useTtsPlayback(message, markdownContent);
    const canSpeak = !editing && tts.ttsReady && !!markdownContent.trim();
    const pending = message.id === pendingMessageId;

    return (
        <>
            {!editing && (
                <MessageActionRail
                    variant="bar"
                    msg={message}
                    isEditing={false}
                    canSpeak={canSpeak}
                    ttsLoading={tts.ttsLoading}
                    ttsPlaying={tts.ttsPlaying}
                    ttsPaused={tts.ttsPaused}
                    ttsFinished={tts.ttsFinished}
                    onStartEdit={editor.startEditing}
                    onOpenSwipeSheet={onOpenSwipeSheet}
                    onRegenerate={editor.handleRegenerate}
                    onSpeak={tts.handleSpeak}
                    onPauseResume={tts.handlePauseResume}
                    onDelete={(id) => editor.handleDeleteOutput(id)}
                />
            )}
            <div className="lotm-plate-body gm-prose">
                {editing ? (
                    <InlineMessageEditor
                        draft={editor.inlineDraft}
                        onDraftChange={editor.setInlineDraft}
                        onSubmit={editor.handleEditSubmit}
                        onCancel={editor.cancelEditing}
                    />
                ) : (
                    <>
                        {tts.showTtsPanel && (
                            <TtsPlaybackPanel
                                prose={proseForTTS(markdownContent)}
                                ttsLoading={tts.ttsLoading}
                                ttsPaused={tts.ttsPaused}
                                ttsPlaying={tts.ttsPlaying}
                                ttsFinished={tts.ttsFinished}
                                activeSentenceIdx={tts.activeSentenceIdx}
                                activeWordIdx={tts.activeWordIdx}
                                playbackRate={tts.playbackRate}
                                totalChunks={tts.totalChunks}
                                generatedChunks={tts.generatedChunks}
                                onPauseResume={tts.handlePauseResume}
                                onSpeedChange={tts.handleSpeedChange}
                                onSpeak={tts.handleSpeak}
                                onWipe={tts.handleWipeTts}
                                onSentenceClick={tts.jumpToSentence}
                            />
                        )}
                        <MessageMarkdown content={markdownContent} />
                    </>
                )}
            </div>
            <MessageBelowSlots message={{ id: message.id, role: message.role, sceneId: message.sceneId ?? null }} />
            {message.retryable && !isStreaming && onRetry && (
                <div className="mt-2 mb-1 flex items-center gap-2 py-2 px-3 bg-void-darker border border-amber-500/30 rounded">
                    <AlertCircle size={12} className="text-amber-400 shrink-0" />
                    <span className="text-[11px] text-amber-400/80 truncate flex-1">Story AI halted — context preserved</span>
                    <button
                        type="button"
                        onClick={() => onRetry(message.id)}
                        className="text-[10px] uppercase tracking-wider text-text-dim hover:text-amber-300 shrink-0 flex items-center gap-1"
                    >
                        <RotateCw size={10} />
                        Retry
                    </button>
                </div>
            )}
            {hasSwipeSet(message) && (
                <div className="mt-2 flex items-center justify-center gap-3 select-none">
                    <SwipeIndicator
                        msg={message}
                        onPrev={() => pending && swipe.prevSwipe()}
                        onNext={() => pending && swipe.nextSwipe()}
                    />
                    <ContinueButton
                        loading={!!sceneContinue.continueLoading}
                        disabled={
                            !!sceneContinue.continueLoading
                            || !!swipe.swipeGenLoading
                            || isStreaming
                            || message.swipeSet?.[message.swipeActiveIndex ?? 0]?.streaming === true
                        }
                        onClick={() => pending && sceneContinue.runSceneContinue()}
                    />
                </div>
            )}
        </>
    );
}
