import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Settings, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { deleteCampaign, listCampaigns, saveCampaign } from '../../store/campaignStore';
import { hydrateCampaign } from '../../store/campaignHydrator';
import { backgroundQueue } from '../../services/infrastructure/backgroundQueue';
import { createLotmCampaign } from '../../services/lotm/createLotmCampaign';
import { filterLoadableCampaigns, pickContinueCampaign } from '../../services/lotm/lotmExclusiveUi';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { LORD_OF_THE_MYSTERIES_PACK } from '../../worldpacks/lordOfTheMysteries';
import type { Campaign } from '../../types';
import { Backdrop } from '../primitives/Backdrop';
import { GhostBtn, DangerBtn } from '../primitives/Buttons';

const DEFAULT_CHRONICLE_NAME = LORD_OF_THE_MYSTERIES_PACK.suggestedName;

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
    const [namingNew, setNamingNew] = useState(false);
    const [newName, setNewName] = useState(DEFAULT_CHRONICLE_NAME);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const cover = lotmAssetUrl(LORD_OF_THE_MYSTERIES_PACK.coverAssetPath ?? 'image/cover.webp');

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

    const continueCampaign = pickContinueCampaign(campaigns);
    const sortedCampaigns = campaigns
        .slice()
        .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));

    const openNewChronicle = () => {
        if (busy) return;
        setRenamingId(null);
        setNewName(DEFAULT_CHRONICLE_NAME);
        setNamingNew(true);
    };

    const begin = async () => {
        if (busy) return;
        const name = newName.trim() || DEFAULT_CHRONICLE_NAME;
        setBusy(true);
        try {
            const created = await createLotmCampaign({ playAsClara: true, name });
            await enterCampaign(created);
        } catch (e) {
            console.error('[LotmTitleHub] begin failed', e);
            setBusy(false);
        }
    };

    const continuePlay = async (campaign: Campaign) => {
        if (busy) return;
        setRenamingId(null);
        setBusy(true);
        try {
            await enterCampaign(campaign);
        } catch (e) {
            console.error('[LotmTitleHub] continue failed', e);
            setBusy(false);
        }
    };

    const startRename = (campaign: Campaign) => {
        if (busy) return;
        setNamingNew(false);
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
        refresh();
    };

    return (
        <div className="lotm-title-hub">
            <div className="lotm-title-hub-art" style={{ backgroundImage: `url("${cover}")` }} aria-hidden />
            <div className="lotm-title-hub-scrim" aria-hidden />

            <button
                type="button"
                className="lotm-title-hub-gear"
                title="Settings"
                aria-label="Settings"
                onClick={() => useAppStore.getState().toggleSettings()}
            >
                <Settings size={15} />
            </button>

            <div className="lotm-title-hub-copy">
                <p className="lotm-title-hub-kicker">Fifth Epoch</p>
                <h1>Lord of the Mysteries</h1>
                <p className="lotm-title-hub-sub">A Victorian occult chronicle. Beyonders, potions, and the fog above Tingen.</p>
            </div>

            <div className="lotm-title-hub-actions">
                {namingNew ? (
                    <form
                        className="lotm-title-hub-nameform"
                        onSubmit={e => {
                            e.preventDefault();
                            begin();
                        }}
                    >
                        <label htmlFor="lotm-new-chronicle-name">Chronicle name</label>
                        <input
                            id="lotm-new-chronicle-name"
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder={DEFAULT_CHRONICLE_NAME}
                            autoFocus
                            disabled={busy}
                            maxLength={80}
                        />
                        <button type="submit" className="lotm-title-hub-primary" disabled={busy}>
                            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                            Begin
                        </button>
                        <button
                            type="button"
                            className="lotm-title-hub-ghost"
                            disabled={busy}
                            onClick={() => setNamingNew(false)}
                        >
                            Cancel
                        </button>
                    </form>
                ) : (
                    <>
                        {continueCampaign ? (
                            <button
                                type="button"
                                className="lotm-title-hub-primary"
                                disabled={busy}
                                onClick={() => continuePlay(continueCampaign)}
                            >
                                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                                Continue
                            </button>
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

                        {continueCampaign && (
                            <button
                                type="button"
                                className="lotm-title-hub-ghost"
                                disabled={busy}
                                onClick={openNewChronicle}
                            >
                                New chronicle
                            </button>
                        )}
                    </>
                )}
            </div>

            {sortedCampaigns.length > 0 && (
                <div className="lotm-title-hub-saves-wrap">
                    <p className="lotm-title-hub-saves-label">Choose a chronicle</p>
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
