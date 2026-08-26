import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useEmbeddingStatus, type EmbedJob } from '../../hooks/useEmbeddingStatus';
import { getLotmPathway } from '../../worldpacks/lotmPathways';

const JOB_WAIT_MS = 2500;

export function formatWorldIndexProgress(
    job: EmbedJob | null,
    modelReady: boolean,
    hasCampaign: boolean,
): { title: string; detail: string } {
    if (job && job.total > 0) {
        const pct = Math.round((job.done / job.total) * 100);
        return {
            title: 'Indexing the world',
            detail: `${job.done} / ${job.total} (${pct}%)`,
        };
    }
    if (job) {
        return { title: 'Indexing the world', detail: 'Starting…' };
    }
    if (hasCampaign && !modelReady) {
        return { title: 'Indexing the world', detail: 'Warming the retrieval model…' };
    }
    return { title: 'Indexing the world', detail: 'Preparing…' };
}

export function LotmWorldIndexOverlay() {
    const lock = useAppStore(s => s.lotmWorldIndexLock);
    const endLotmWorldIndex = useAppStore(s => s.endLotmWorldIndex);
    const runtime = useEmbeddingStatus(lock?.campaignId ?? null);
    const loreJob = lock?.campaignId
        ? (runtime.jobs.find(job => job.kind === 'lore') ?? null)
        : null;
    const seenJob = useRef(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        seenJob.current = false;
    }, [lock?.campaignId]);

    useEffect(() => {
        if (loreJob) seenJob.current = true;
    }, [loreJob]);

    useEffect(() => {
        if (!lock?.campaignId) return;
        if (!runtime.polled) return;
        if (loreJob) return;
        if (seenJob.current) {
            endLotmWorldIndex();
            return;
        }
        const timer = window.setTimeout(() => endLotmWorldIndex(), JOB_WAIT_MS);
        return () => window.clearTimeout(timer);
    }, [lock?.campaignId, runtime.polled, loreJob, endLotmWorldIndex]);

    useEffect(() => {
        if (!lock) return;
        useAppStore.setState({
            settingsOpen: false,
            drawerOpen: false,
            npcLedgerOpen: false,
            pcPanelOpen: false,
            locationLedgerOpen: false,
            factionLedgerOpen: false,
            itemLedgerOpen: false,
            backupModalOpen: false,
            contextScreen: null,
        });
        overlayRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            event.stopPropagation();
            if (event.key === 'Escape' || event.key === 'Tab') event.preventDefault();
        };
        window.addEventListener('keydown', onKey, true);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKey, true);
        };
    }, [lock]);

    if (!lock?.campaignId) return null;

    const emblemSrc = lock.emblemSrc || getLotmPathway('fool')?.emblemSrc || '';
    const copy = formatWorldIndexProgress(loreJob, runtime.modelReady, !!lock.campaignId);
    const pct = loreJob && loreJob.total > 0 ? Math.min(100, Math.round((loreJob.done / loreJob.total) * 100)) : null;

    return (
        <div
            ref={overlayRef}
            className="lotm-world-index-overlay"
            role="dialog"
            aria-modal="true"
            aria-busy="true"
            aria-labelledby="lotm-world-index-title"
            aria-describedby="lotm-world-index-progress"
            tabIndex={-1}
        >
            <div className="lotm-world-index-panel">
                <div className="lotm-world-index-emblem-wrap" aria-hidden="true">
                    {emblemSrc ? (
                        <img className="lotm-world-index-emblem" src={emblemSrc} alt="" />
                    ) : (
                        <span className="lotm-world-index-emblem is-fallback" />
                    )}
                </div>
                <p id="lotm-world-index-title" className="lotm-world-index-title">{copy.title}</p>
                <p id="lotm-world-index-progress" className="lotm-world-index-progress">{copy.detail}</p>
                {pct !== null && (
                    <div className="lotm-world-index-bar" aria-hidden="true">
                        <div className="lotm-world-index-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
}
