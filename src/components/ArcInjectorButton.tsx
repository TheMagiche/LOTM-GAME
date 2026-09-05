import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Loader2, Syringe, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { spawnArc, pickArcSpawnInput } from '../services/arc';
import { computeOpenThreads } from '../services/arc/openThreads';
import { toast } from './Toast';
import type { NPCPressure } from '../types';
import type { ArcRecord } from '../types/arc';

type Phase = 'idle' | 'loading' | 'success' | 'error';

function readActiveArcs(arcs: unknown): ArcRecord[] {
    if (!Array.isArray(arcs)) return [];
    return arcs.filter((arc): arc is ArcRecord => !!arc && arc.status === 'active');
}

/**
 * Arc Injector — manual trigger for the Arc Engine (System 2 / Oracle).
 *
 * The press authors ONE auto-generated, laddered arc into `mod.arc.arcs`.
 * The player prods the timing but does NOT author the arc. It then surfaces
 * gradually (ambient → rumor → direct) via the existing tick / digest path.
 *
 * LOTM exclusive UI hides the chat action strip, so the only invocation point
 * is the Play menu. A fire-and-forget button there has nowhere to paint
 * loading / success / error. Both strip and nav layouts therefore open a
 * portaled modal (same stacking-context reason as Absolute Command).
 */
export function ArcInjectorButton({
    onDone,
    layout = 'strip',
}: {
    onDone?: () => void;
    layout?: 'strip' | 'nav' | 'icon';
} = {}) {
    const pipelinePhase = useAppStore(s => s.pipelinePhase);
    const storedArcs = useAppStore(s => s.modTables['mod.arc.arcs']);
    const activeArcs = readActiveArcs(storedArcs);
    const arcActive = activeArcs.length > 0;

    const [modalOpen, setModalOpen] = useState(false);
    const [phase, setPhase] = useState<Phase>('idle');
    const resetTimer = useRef<number | null>(null);
    // Synchronous re-entry lock. `phase` is React state (async), so two taps
    // in the same tick could both pass the guard and spawn TWO arcs.
    const inFlight = useRef(false);

    useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

    const isStreaming = pipelinePhase !== 'idle';

    const closeModal = () => {
        if (phase === 'loading') return;
        setModalOpen(false);
        setPhase('idle');
    };

    const handleInject = async () => {
        if (inFlight.current || phase === 'loading' || arcActive) return;
        const state = useAppStore.getState();

        const provider = state.getActiveStoryEndpoint?.();
        if (!provider) {
            toast.error('No Story AI configured. Set one in Settings → AI Providers.');
            return;
        }

        inFlight.current = true;
        setPhase('loading');
        try {
            const { commitPendingTurn } = await import('../services/turn/pendingCommit');
            await commitPendingTurn().catch(e => console.warn('[ArcInjector] commit failed:', e));

            const sealedChapters = (state.chapters ?? []).filter(c => c.sealedAt != null && !c.invalidated);
            const openThreads = computeOpenThreads(sealedChapters);
            const archiveIndex = state.archiveIndex ?? [];
            const nowScene = archiveIndex.length > 0
                ? parseInt(archiveIndex[archiveIndex.length - 1].sceneId, 10) || 0
                : 0;
            const bornScene = archiveIndex.length > 0
                ? archiveIndex[archiveIndex.length - 1].sceneId
                : '000';

            const latestChapter = sealedChapters[sealedChapters.length - 1];
            const worldContext = latestChapter?.summary
                ? `Recently sealed chapter "${latestChapter.title}": ${latestChapter.summary}`
                : '';

            const lastGm = [...state.messages].reverse().find(m => m.role === 'assistant');
            const fallbackAnchorText = typeof lastGm?.content === 'string' ? lastGm.content : undefined;

            const npcLedger = state.npcLedger ?? [];
            const pressure: Record<string, NPCPressure> = {};
            for (const npc of npcLedger) {
                if (npc.pressure) pressure[npc.id] = npc.pressure;
            }

            const liveArcs = (state.getModTable('mod.arc.arcs') as ArcRecord[] | undefined) ?? [];
            if (readActiveArcs(liveArcs).length > 0) {
                toast.info('An arc is already simmering — it frees up once it plays out.');
                setPhase('idle');
                return;
            }

            const spawnInput = pickArcSpawnInput({
                arcs: liveArcs,
                openThreads,
                pressure,
                npcLedger,
                worldContext,
                bornScene,
                nowScene,
                fallbackAnchorText,
            });

            if (!spawnInput) {
                toast.info('Nothing to anchor an arc to yet — play a little further first.');
                setPhase('idle');
                return;
            }

            const arc = await spawnArc({ provider, ...spawnInput });
            if (!arc) {
                toast.error('Arc generation failed — try again.');
                setPhase('error');
                resetTimer.current = window.setTimeout(() => setPhase('idle'), 2500);
                return;
            }

            const currentArcs = (state.getModTable('mod.arc.arcs') as ArcRecord[] | undefined) ?? [];
            state.setModTable('mod.arc.arcs', [...currentArcs, arc]);
            const activeCount = currentArcs.filter(a => a.status === 'active').length + 1;
            toast.success(`Arc injected — ${activeCount} now simmering. It will surface as the story unfolds.`);
            setPhase('success');
            resetTimer.current = window.setTimeout(() => {
                setPhase('idle');
                setModalOpen(false);
                onDone?.();
            }, 1600);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to inject an arc');
            setPhase('error');
            resetTimer.current = window.setTimeout(() => setPhase('idle'), 2500);
        } finally {
            inFlight.current = false;
        }
    };

    const disabled = isStreaming || phase === 'loading' || phase === 'success';
    const title = arcActive
        ? 'An arc is already simmering — it frees up once it plays out'
        : 'Inject a new background story arc';

    return (
        <>
            {layout === 'nav' ? (
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    disabled={isStreaming}
                    title={title}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-[11px] text-text-dim hover:text-terminal hover:bg-terminal/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Syringe size={14} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">Inject Arc</span>
                    {arcActive && (
                        <span className="min-w-[18px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[9px] font-mono text-center">
                            Active
                        </span>
                    )}
                </button>
            ) : layout === 'icon' ? (
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    disabled={disabled}
                    title={title}
                    aria-label="Inject Arc"
                    className={`chat-composer-shortcut${arcActive ? ' is-armed' : ''}`}
                >
                    <Syringe size={16} />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    disabled={disabled}
                    title={title}
                    className="shrink-0 flex items-center gap-1.5 bg-void border border-amber-500/50 text-amber-500 hover:bg-amber-500/5 text-[10px] sm:text-[11px] uppercase tracking-wider px-3 h-[32px] rounded-sm transition-all disabled:cursor-not-allowed whitespace-nowrap"
                >
                    <Syringe size={13} />
                    <span className="hidden xs:inline">INJECT ARC</span>
                    <span className="inline xs:hidden">ARC</span>
                </button>
            )}

            {modalOpen && !isStreaming && (
                <ArcInjectModal
                    phase={phase}
                    arcActive={arcActive}
                    activeTitle={activeArcs[0]?.title}
                    onClose={closeModal}
                    onInject={handleInject}
                />
            )}
        </>
    );
}

function ArcInjectModal({
    phase,
    arcActive,
    activeTitle,
    onClose,
    onInject,
}: {
    phase: Phase;
    arcActive: boolean;
    activeTitle?: string;
    onClose: () => void;
    onInject: () => void;
}) {
    const openedAtRef = useRef(0);
    useEffect(() => {
        openedAtRef.current = Date.now();
    }, []);

    const handleBackdropClick = () => {
        if (phase === 'loading') return;
        if (Date.now() - openedAtRef.current < 350) return;
        onClose();
    };

    const busy = phase === 'loading';
    const Icon = phase === 'loading'
        ? Loader2
        : phase === 'success'
            ? Check
            : phase === 'error'
                ? AlertCircle
                : Syringe;

    const confirmLabel = phase === 'loading'
        ? 'Injecting…'
        : phase === 'success'
            ? 'Injected'
            : phase === 'error'
                ? 'Retry'
                : 'Inject';

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
            onClick={handleBackdropClick}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="inject-arc-title"
                className="bg-surface border border-border rounded-lg w-full max-w-sm mx-4 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2
                        id="inject-arc-title"
                        className="text-amber-500 text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-2"
                    >
                        <Syringe size={14} /> Inject Arc
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="text-text-dim hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-[11px] text-text-dim leading-relaxed">
                        Author one background world pressure — a systemic condition that
                        worsens over time and surfaces as ambient signs, then rumor, then
                        a crisis. You choose the timing; the engine authors the ladder.
                    </p>
                    {arcActive ? (
                        <p className="text-[11px] text-amber-500/90 leading-relaxed">
                            An arc is already simmering
                            {activeTitle ? ` (“${activeTitle}”)` : ''}.
                            The injector frees itself once that arc plays out.
                        </p>
                    ) : (
                        <p className="text-[10px] text-text-dim/70 leading-relaxed">
                            Grounds on the freshest open chapter thread, a pressured NPC,
                            or the last GM line. One arc at a time.
                        </p>
                    )}
                    {phase === 'error' && (
                        <p className="text-[11px] text-danger leading-relaxed">
                            Generation failed. Check your Story AI and try again.
                        </p>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="px-3 py-1.5 text-xs text-text-dim hover:text-text-primary rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onInject}
                        disabled={busy || arcActive || phase === 'success'}
                        className="px-3 py-1.5 text-xs font-semibold bg-amber-500/20 text-amber-500 rounded hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                    >
                        <Icon size={13} className={busy ? 'animate-spin' : ''} />
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
