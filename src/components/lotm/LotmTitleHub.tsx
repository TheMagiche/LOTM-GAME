import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, KeyRound, Loader2, Pencil, Settings, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { deleteCampaign, listCampaigns, saveCampaign } from '../../store/campaignStore';
import { hydrateCampaign } from '../../store/campaignHydrator';
import { backgroundQueue } from '../../services/infrastructure/backgroundQueue';
import { createLotmCampaign } from '../../services/lotm/createLotmCampaign';
import { filterLoadableCampaigns, pickContinueCampaign } from '../../services/lotm/lotmExclusiveUi';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { LORD_OF_THE_MYSTERIES_PACK, DEFAULT_PLAYABLE_PC_ID } from '../../worldpacks/lordOfTheMysteries';
import { getLotmPathway, lotmChronicleName, resolveLotmPathway } from '../../worldpacks/lotmPathways';
import { LANDING_COLLAGE_CARDS } from '../landing/landingCopy';
import type { Campaign } from '../../types';
import { Backdrop } from '../primitives/Backdrop';
import { GhostBtn, DangerBtn } from '../primitives/Buttons';
import { LotmTarotSelect } from './LotmTarotSelect';
import { IS_DEMO_MODE, LOTM_SITE_ORIGIN, hasUsableDemoProvider } from '../../config/demoMode';
import {
    DemoOccupiedError,
    acquireDemoOccupancy,
    getDemoOccupancy,
    getDemoSessionId,
    purgeDemoSessionCampaigns,
} from '../../services/demo/demoSession';
import { DemoOccupiedModal } from '../demo/DemoOccupiedModal';
import { cueClose, cueNav, cuePrimary, play } from '../../services/uiSounds';

function timeAgo(ts: number | undefined): string {
    if (!ts) return 'Unplayed';
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 60) return `${Math.max(mins, 0)}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

async function enterCampaign(campaign: Campaign): Promise<void> {
    backgroundQueue.clear('Campaign switch to ' + campaign.id);
    const updated = { ...campaign, lastPlayedAt: Date.now(), uiSkin: 'lotm-illustrated' as const };
    await saveCampaign(updated);
    await hydrateCampaign(campaign.id);
    play('arrival');
    const { reconcilePendingCommitOnLaunch } = await import('../../services/turn/pendingCommit');
    reconcilePendingCommitOnLaunch().catch(e => console.warn('[Reconcile] failed:', e));
}

export function LotmTitleHub() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [pickingPc, setPickingPc] = useState(false);
    const [selectedPcId, setSelectedPcId] = useState(DEFAULT_PLAYABLE_PC_ID);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const [pickingChronicle, setPickingChronicle] = useState(false);
    const [enteringId, setEnteringId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [occupiedOpen, setOccupiedOpen] = useState(false);
    const [occupiedExpiresAt, setOccupiedExpiresAt] = useState<number | null>(null);
    const [occupiedRemainingMs, setOccupiedRemainingMs] = useState(0);
    const hubRef = useRef<HTMLDivElement | null>(null);
    const playablePcs = LORD_OF_THE_MYSTERIES_PACK.playablePcs ?? [];

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!hubRef.current) return;
        const rect = hubRef.current.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setMousePos({ x: normX, y: normY });
    };

    const handleMouseLeave = () => {
        setMousePos({ x: 0, y: 0 });
    };

    const refresh = useCallback(async () => {
        const list = await listCampaigns();
        setCampaigns(filterLoadableCampaigns(list.filter(c => c && c.id && c.name && c.id !== 'undefined')));
    }, []);

    useEffect(() => {
        let mounted = true;
        listCampaigns().then(list => {
            if (!mounted) return;
            setCampaigns(filterLoadableCampaigns(list.filter(c => c && c.id && c.name && c.id !== 'undefined')));
        });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (!pickingPc) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busy) setPickingPc(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pickingPc, busy]);

    const providers = useAppStore(s => s.settings.providers);
    const demoKeyReady = IS_DEMO_MODE && hasUsableDemoProvider(providers);
    const continueCampaign = IS_DEMO_MODE ? null : pickContinueCampaign(campaigns);
    const sortedCampaigns = campaigns
        .slice()
        .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));

    const closeChroniclePicker = () => {
        setPickingChronicle(false);
        setRenamingId(null);
        setRenameDraft('');
    };

    const showOccupied = (remainingMs: number, expiresAt: number | null) => {
        setOccupiedRemainingMs(remainingMs);
        setOccupiedExpiresAt(expiresAt);
        setOccupiedOpen(true);
    };

    const refreshOccupancy = useCallback(async () => {
        if (!IS_DEMO_MODE) return;
        const status = await getDemoOccupancy(getDemoSessionId());
        if (status.occupied && !status.yours) {
            setOccupiedRemainingMs(status.remainingMs);
            setOccupiedExpiresAt(status.expiresAt);
            return;
        }
        setOccupiedOpen(false);
        setOccupiedRemainingMs(0);
        setOccupiedExpiresAt(null);
    }, []);

    useEffect(() => {
        if (!IS_DEMO_MODE) return;
        void refreshOccupancy();
        const timer = window.setInterval(() => { void refreshOccupancy(); }, 10_000);
        return () => window.clearInterval(timer);
    }, [refreshOccupancy]);

    const openNewChronicle = async () => {
        if (busy) return;
        if (IS_DEMO_MODE && !hasUsableDemoProvider(useAppStore.getState().settings.providers)) {
            useAppStore.getState().openDemoOnboarding();
            return;
        }
        if (IS_DEMO_MODE) {
            const status = await getDemoOccupancy(getDemoSessionId());
            if (status.occupied && !status.yours) {
                showOccupied(status.remainingMs, status.expiresAt);
                return;
            }
        }
        closeChroniclePicker();
        setSelectedPcId(DEFAULT_PLAYABLE_PC_ID);
        setPickingPc(true);
    };

    const begin = async () => {
        if (busy) return;
        if (IS_DEMO_MODE && !hasUsableDemoProvider(useAppStore.getState().settings.providers)) {
            useAppStore.getState().openDemoOnboarding();
            return;
        }
        const pcId = selectedPcId || DEFAULT_PLAYABLE_PC_ID;
        const pc = playablePcs.find(option => option.id === pcId);
        const name = pc ? lotmChronicleName(pc.name, pc.pathway) : undefined;
        const emblemSrc = getLotmPathway(pc?.pathway)?.emblemSrc
            || resolveLotmPathway(pc?.pathway)?.emblemSrc
            || '';
        setBusy(true);
        try {
            if (IS_DEMO_MODE) {
                const occupancy = await acquireDemoOccupancy(getDemoSessionId());
                useAppStore.getState().setDemoSessionExpiresAt(occupancy.expiresAt);
            }
            const created = await createLotmCampaign({ pcId, name });
            useAppStore.getState().beginLotmWorldIndex({ campaignId: created.id, emblemSrc });
            await enterCampaign(created);
        } catch (e) {
            console.error('[LotmTitleHub] begin failed', e);
            useAppStore.getState().endLotmWorldIndex();
            useAppStore.getState().setDemoSessionExpiresAt(null);
            if (IS_DEMO_MODE) {
                await purgeDemoSessionCampaigns(getDemoSessionId());
            }
            if (e instanceof DemoOccupiedError) {
                showOccupied(e.remainingMs, e.expiresAt);
            }
            setBusy(false);
        }
    };

    const continuePlay = async (campaign: Campaign) => {
        if (busy) return;
        setRenamingId(null);
        setBusy(true);
        setEnteringId(campaign.id);
        try {
            await enterCampaign(campaign);
        } catch (e) {
            console.error('[LotmTitleHub] continue failed', e);
            setBusy(false);
            setEnteringId(null);
        }
    };

    const startRename = (campaign: Campaign) => {
        if (busy) return;
        setPickingPc(false);
        setRenamingId(campaign.id);
        setRenameDraft(campaign.name);
    };

    const commitRename = async (campaign: Campaign) => {
        const name = renameDraft.trim();
        if (!name) return;
        if (name !== campaign.name) {
            await saveCampaign({ ...campaign, name });
            await refresh();
        }
        setRenamingId(null);
    };

    const cancelRename = () => {
        setRenamingId(null);
        setRenameDraft('');
    };

    const handleDelete = async (id: string) => {
        await deleteCampaign(id);
        setConfirmDelete(null);
        if (renamingId === id) cancelRename();
        const list = await listCampaigns();
        const next = filterLoadableCampaigns(list.filter(c => c && c.id && c.name && c.id !== 'undefined'));
        setCampaigns(next);
        if (next.length === 0) closeChroniclePicker();
    };

    return (
        <div
            ref={hubRef}
            className={`lotm-title-hub${pickingPc ? ' is-picking' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* OCCULT FLOATING CARD MESH (shared Title Hub chrome) */}
            <div
                className="lotm-landing-collage-backdrop"
                aria-hidden="true"
                style={{
                    transform: `translate3d(${mousePos.x * -12}px, ${mousePos.y * -12}px, 0)`,
                    opacity: pickingPc ? 0.22 : 0.85,
                    transition: 'opacity 0.4s ease, transform 0.18s ease-out',
                }}
            >
                <div className="lotm-landing-collage-mesh">
                    {LANDING_COLLAGE_CARDS.map((card, idx) => {
                        const imgSrc = lotmAssetUrl(card.image);
                        return (
                            <div
                                key={card.id}
                                className={`lotm-collage-floating-card card-pos-${idx}`}
                                style={{
                                    transform: `translate3d(${mousePos.x * (idx % 3 === 0 ? 8 : -8)}px, ${mousePos.y * (idx % 2 === 0 ? 8 : -8)}px, 0)`,
                                }}
                            >
                                <div className="lotm-collage-card-inner">
                                    <img src={imgSrc} alt="" className="lotm-collage-card-img" />
                                    <div className="lotm-collage-card-overlay">
                                        <span className="lotm-collage-card-arcana">{card.tarotNumber}</span>
                                        <span className="lotm-collage-card-name">{card.name}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="lotm-title-hub-scrim" aria-hidden />

            {IS_DEMO_MODE ? (
                <a
                    href={LOTM_SITE_ORIGIN}
                    {...cueNav}
                    className="lotm-title-hub-grimoire lotm-title-hub-landing"
                    title="Back to landing page"
                    aria-label="Back to landing page"
                >
                    <ArrowLeft size={16} />
                </a>
            ) : (
                <button
                    type="button"
                    {...cueNav}
                    className="lotm-title-hub-grimoire"
                    title="Grimoire"
                    aria-label="Open Grimoire"
                    disabled={busy}
                    onClick={() => useAppStore.getState().openGrimoire()}
                >
                    <BookOpen size={15} />
                </button>
            )}

            {!IS_DEMO_MODE && pickingPc && (
                <button
                    type="button"
                    {...cueNav}
                    className="lotm-title-hub-back"
                    title="Go back"
                    aria-label="Go back"
                    disabled={busy}
                    onClick={() => setPickingPc(false)}
                >
                    <ArrowLeft size={16} />
                </button>
            )}

            {(!IS_DEMO_MODE || !demoKeyReady) && (
                <button
                    type="button"
                    {...cueNav}
                    className="lotm-title-hub-gear"
                    title={IS_DEMO_MODE ? 'API key' : 'Settings'}
                    aria-label={IS_DEMO_MODE ? 'API key' : 'Settings'}
                    disabled={busy}
                    onClick={() => {
                        if (IS_DEMO_MODE) useAppStore.getState().openDemoOnboarding();
                        else useAppStore.getState().toggleSettings();
                    }}
                >
                    {IS_DEMO_MODE ? <KeyRound size={15} /> : <Settings size={15} />}
                </button>
            )}

            {!pickingPc && (
                <div className="lotm-title-hub-copy">
                    <p className="lotm-title-hub-kicker">AI Narrative RPG</p>
                    <h1>Lord of the Mysteries</h1>
                    <p className="lotm-title-hub-sub">A Victorian occult chronicle. Join the world of beyonders.</p>
                    {IS_DEMO_MODE && (
                        <p className="lotm-demo-banner">Demo sessions last 5 minutes — your chronicle is removed when you leave or time runs out.</p>
                    )}
                </div>
            )}

            <div className="lotm-title-hub-actions">
                {pickingPc ? (
                    <>
                        <LotmTarotSelect
                            pcs={playablePcs}
                            selectedId={selectedPcId}
                            onSelect={setSelectedPcId}
                            onConfirm={() => { void begin(); }}
                            disabled={busy}
                        />
                        <div className="lotm-tarot-actions">
                            <button type="button" {...cuePrimary} className="lotm-title-hub-primary" disabled={busy} onClick={() => { void begin(); }}>
                                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                                Begin
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="lotm-title-hub-action-row">
                            {continueCampaign ? (
                                <>
                                    <button
                                        type="button"
                                        {...cuePrimary}
                                        className="lotm-title-hub-primary"
                                        disabled={busy}
                                        onClick={() => setPickingChronicle(true)}
                                    >
                                        Continue
                                    </button>
                                    <button
                                        type="button"
                                        {...cueNav}
                                        className="lotm-title-hub-ghost"
                                        disabled={busy}
                                        onClick={openNewChronicle}
                                    >
                                        New chronicle
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        {...cuePrimary}
                                        className="lotm-title-hub-primary"
                                        disabled={busy}
                                        onClick={openNewChronicle}
                                    >
                                        Begin
                                    </button>
                                    <button
                                        type="button"
                                        {...cueNav}
                                        className="lotm-title-hub-ghost"
                                        disabled={busy}
                                        onClick={() => useAppStore.getState().openGrimoire()}
                                    >
                                        <BookOpen size={14} />
                                        Grimoire
                                    </button>
                                </>
                            )}
                        </div>
                        {!continueCampaign && (
                            <p className="lotm-title-hub-grimoire-hint">New to the story? Open the Grimoire before you begin.</p>
                        )}
                    </>
                )}
            </div>

            {pickingChronicle && sortedCampaigns.length > 0 && (
                <Backdrop onClick={closeChroniclePicker}>
                    <div
                        className="lotm-title-hub-chronicles-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="lotm-chronicles-title"
                        onClick={e => e.stopPropagation()}
                    >
                        <p id="lotm-chronicles-title" className="lotm-title-hub-saves-label">Choose a chronicle</p>
                        <ul className="lotm-title-hub-saves">
                            {sortedCampaigns.map(c => (
                                <li key={c.id}>
                                    {renamingId === c.id ? (
                                        <>
                                            <form
                                                className="lotm-title-hub-save-edit"
                                                onSubmit={e => {
                                                    e.preventDefault();
                                                    commitRename(c);
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    value={renameDraft}
                                                    onChange={e => setRenameDraft(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            cancelRename();
                                                        }
                                                    }}
                                                    aria-label={`Rename ${c.name}`}
                                                    autoFocus
                                                    disabled={busy}
                                                    maxLength={80}
                                                />
                                            </form>
                                            <button
                                                type="button"
                                                className="lotm-title-hub-save-rename"
                                                title="Save name"
                                                aria-label={`Save name for ${c.name}`}
                                                disabled={busy || !renameDraft.trim()}
                                                onClick={() => commitRename(c)}
                                            >
                                                <Check size={13} />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            {...cueNav}
                                            className="lotm-title-hub-save"
                                            disabled={busy}
                                            onClick={() => continuePlay(c)}
                                        >
                                            <span>{c.name}</span>
                                            <span>
                                                {enteringId === c.id ? <Loader2 size={13} className="animate-spin" /> : null}
                                                {c.id === continueCampaign?.id ? 'Latest · ' : ''}
                                                {timeAgo(c.lastPlayedAt)}
                                            </span>
                                        </button>
                                    )}
                                    {renamingId !== c.id && (
                                        <button
                                            type="button"
                                            className="lotm-title-hub-save-rename"
                                            title="Rename chronicle"
                                            aria-label={`Rename ${c.name}`}
                                            disabled={busy}
                                            onClick={() => startRename(c)}
                                        >
                                            <Pencil size={13} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        {...cueClose}
                                        className="lotm-title-hub-save-delete"
                                        title="Delete chronicle"
                                        aria-label={`Delete ${c.name}`}
                                        onClick={() => setConfirmDelete(c.id)}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Backdrop>
            )}

            {confirmDelete && (
                <Backdrop onClick={() => setConfirmDelete(null)}>
                    <div
                        style={{
                            background: '#161218',
                            border: '1px solid rgba(192,57,43,0.4)',
                            borderRadius: 6,
                            padding: '28px 28px 24px',
                            maxWidth: 340,
                            width: '100%',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <p style={{ color: '#f3ead8', fontSize: 14, marginBottom: 20, lineHeight: 1.6, fontFamily: "'EB Garamond', serif" }}>
                            Delete this chronicle? This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <GhostBtn onClick={() => setConfirmDelete(null)}>Cancel</GhostBtn>
                            <DangerBtn onClick={() => handleDelete(confirmDelete)}>Delete</DangerBtn>
                        </div>
                    </div>
                </Backdrop>
            )}

            {IS_DEMO_MODE && (
                <DemoOccupiedModal
                    open={occupiedOpen}
                    expiresAt={occupiedExpiresAt}
                    remainingMs={occupiedRemainingMs}
                    onDismiss={() => setOccupiedOpen(false)}
                />
            )}
        </div>
    );
}
