import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { saveCampaign } from '../../store/campaignStore';
import { LOTM_LATE_VOLUME_CUTOFF } from '../../worldpacks/lotmVisualManifest';
import { API_BASE } from '../../lib/apiBase';
import { Backdrop } from '../primitives/Backdrop';

type LotmIndex = {
    backgrounds: string[];
    characters: string[];
    spoilerCharacters: string[];
    book: string[];
    volumes: Record<string, string[]>;
    pathways: string[];
    emblems: string[];
};

type TabId = 'places' | 'people' | 'book' | 'volumes' | 'pathways';

const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'places', label: 'Places' },
    { id: 'people', label: 'People' },
    { id: 'book', label: 'Book' },
    { id: 'volumes', label: 'Volumes' },
    { id: 'pathways', label: 'Pathways' },
];

function filenameLabel(path: string): string {
    return path.split('/').pop()?.replace(/\.webp$/i, '').replace(/_/g, ' ') ?? path;
}

export function IllustratedArchive() {
    const open = useAppStore(s => s.illustratedArchiveOpen);
    const close = useAppStore(s => s.closeIllustratedArchive);
    const meta = useAppStore(s => s.activeCampaignMeta);
    const patchMeta = useAppStore(s => s.patchActiveCampaignMeta);
    const spoilers = meta?.lotmSpoilers === true;
    const [tab, setTab] = useState<TabId>('places');
    const [index, setIndex] = useState<LotmIndex | null>(null);
    const [lightbox, setLightbox] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        fetch(`${API_BASE}/lotm/index`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (!cancelled && data) setIndex(data); })
            .catch(() => { if (!cancelled) setIndex(null); });
        return () => { cancelled = true; };
    }, [open]);

    const items = useMemo(() => {
        if (!index) return [];
        if (tab === 'places') return index.backgrounds;
        if (tab === 'people') {
            return spoilers
                ? [...index.characters, ...index.spoilerCharacters]
                : index.characters;
        }
        if (tab === 'book') return index.book;
        if (tab === 'pathways') return [...index.emblems, ...index.pathways.filter(p => /Symbol2\.webp$/i.test(p))];
        const vols = Object.entries(index.volumes)
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
        const out: string[] = [];
        for (const [key, files] of vols) {
            const n = Number(key.replace('vol_', ''));
            if (!spoilers && n >= LOTM_LATE_VOLUME_CUTOFF) continue;
            out.push(...files);
        }
        return out;
    }, [index, tab, spoilers]);

    if (!open) return null;

    const toggleSpoilers = async () => {
        if (!meta) return;
        const next = { ...meta, lotmSpoilers: !spoilers };
        patchMeta({ lotmSpoilers: next.lotmSpoilers });
        await saveCampaign(next);
    };

    return (
        <Backdrop onClick={close}>
            <div className="lotm-archive" onClick={e => e.stopPropagation()}>
                <header className="lotm-archive-head">
                    <div>
                        <p className="lotm-archive-kicker">Illustrated Archive</p>
                        <h2>Fifth Epoch stills</h2>
                    </div>
                    <div className="lotm-archive-head-actions">
                        <label className="lotm-spoiler-toggle">
                            <input type="checkbox" checked={spoilers} onChange={toggleSpoilers} />
                            Late-volume illustrations
                        </label>
                        <button type="button" onClick={close} aria-label="Close archive">
                            <X size={16} />
                        </button>
                    </div>
                </header>
                <nav className="lotm-archive-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            className={tab === t.id ? 'is-active' : ''}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
                <div className="lotm-archive-grid">
                    {!index && <p className="lotm-archive-empty">Loading the archive…</p>}
                    {index && items.length === 0 && (
                        <p className="lotm-archive-empty">
                            {tab === 'volumes' && !spoilers
                                ? 'Late volumes are sealed. Enable late-volume illustrations to browse them.'
                                : 'No stills in this drawer.'}
                        </p>
                    )}
                    {items.map(path => (
                        <button
                            key={path}
                            type="button"
                            className="lotm-archive-tile"
                            onClick={() => setLightbox(path)}
                            title={filenameLabel(path)}
                        >
                            <img src={lotmAssetUrl(path)} alt={filenameLabel(path)} loading="lazy" />
                        </button>
                    ))}
                </div>
                {lightbox && (
                    <div className="lotm-archive-lightbox" onClick={() => setLightbox(null)}>
                        <img src={lotmAssetUrl(lightbox)} alt={filenameLabel(lightbox)} />
                    </div>
                )}
            </div>
        </Backdrop>
    );
}
