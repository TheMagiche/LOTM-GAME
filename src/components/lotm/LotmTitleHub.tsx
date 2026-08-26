import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, Pencil, Settings, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { deleteCampaign, listCampaigns, saveCampaign } from '../../store/campaignStore';
import { hydrateCampaign } from '../../store/campaignHydrator';
import { backgroundQueue } from '../../services/infrastructure/backgroundQueue';
import { createLotmCampaign } from '../../services/lotm/createLotmCampaign';
import { filterLoadableCampaigns, pickContinueCampaign } from '../../services/lotm/lotmExclusiveUi';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { LORD_OF_THE_MYSTERIES_PACK, DEFAULT_PLAYABLE_PC_ID } from '../../worldpacks/lordOfTheMysteries';
import { getLotmPathway, lotmChronicleName, resolveLotmPathway } from '../../worldpacks/lotmPathways';
import type { Campaign } from '../../types';
import { Backdrop } from '../primitives/Backdrop';
import { GhostBtn, DangerBtn } from '../primitives/Buttons';
import { LotmTarotSelect } from './LotmTarotSelect';

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
    const cover = lotmAssetUrl(LORD_OF_THE_MYSTERIES_PACK.coverAssetPath ?? 'image/cover.webp');
    const playablePcs = LORD_OF_THE_MYSTERIES_PACK.playablePcs ?? [];

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

    const continueCampaign = pickContinueCampaign(campaigns);
    const sortedCampaigns = campaigns
        .slice()
        .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));

    const closeChroniclePicker = () => {
        setPickingChronicle(false);
        setRenamingId(null);
        setRenameDraft('');
    };

    const openNewChronicle = () => {
        if (busy) return;
        closeChroniclePicker();
        setSelectedPcId(DEFAULT_PLAYABLE_PC_ID);
        setPickingPc(true);
    };

    const begin = async () => {
        if (busy) return;
        const pcId = selectedPcId || DEFAULT_PLAYABLE_PC_ID;
        const pc = playablePcs.find(option => option.id === pcId);
        const name = pc ? lotmChronicleName(pc.name, pc.pathway) : undefined;
        const emblemSrc = getLotmPathway(pc?.pathway)?.emblemSrc
            || resolveLotmPathway(pc?.pathway)?.emblemSrc
            || '';
        setBusy(true);
        try {
            const created = await createLotmCampaign({ pcId, name });
            useAppStore.getState().beginLotmWorldIndex({ campaignId: created.id, emblemSrc });
            await enterCampaign(created);
        } catch (e) {
            console.error('[LotmTitleHub] begin failed', e);
            useAppStore.getState().endLotmWorldIndex();
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
        <div className={`lotm-title-hub${pickingPc ? ' is-picking' : ''}`}>
            <div className="lotm-title-hub-art" style={{ backgroundImage: `url("${cover}")` }} aria-hidden />
            <div className="lotm-title-hub-scrim" aria-hidden />

            {pickingPc && (
                <button
                    type="button"
                    className="lotm-title-hub-back"
                    title="Go back"
                    aria-label="Go back"
                    disabled={busy}
                    onClick={() => setPickingPc(false)}
                >
                    <ArrowLeft size={16} />
                </button>
            )}

            <button
                type="button"
                className="lotm-title-hub-gear"
                title="Settings"
                aria-label="Settings"
                disabled={busy}
                onClick={() => useAppStore.getState().toggleSettings()}
            >
                <Settings size={15} />
            </button>

            {!pickingPc && (
                <div className="lotm-title-hub-copy">
                    <p className="lotm-title-hub-kicker">Dungeon Master</p>
                    <h1>Lord of the Mysteries</h1>
                    <p className="lotm-title-hub-sub">A Victorian occult chronicle. Join the world of beyonders.</p>
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
                            <button type="button" className="lotm-title-hub-primary" disabled={busy} onClick={() => { void begin(); }}>
                                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                                Begin
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="lotm-title-hub-action-row">
                        {continueCampaign ? (
                            <>
                                <button
                                    type="button"
                                    className="lotm-title-hub-primary"
                                    disabled={busy}
                                    onClick={() => setPickingChronicle(true)}
                                >
                                    Continue
                                </button>
                                <button
                                    type="button"
                                    className="lotm-title-hub-ghost"
                                    disabled={busy}
                                    onClick={openNewChronicle}
                                >
                                    New chronicle
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="lotm-title-hub-primary"
                                disabled={busy}
                                onClick={openNewChronicle}
                            >
                                Begin
                            </button>
                        )}
                    </div>
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
        </div>
    );
}
