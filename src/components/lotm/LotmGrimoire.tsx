import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookOpen, CircleHelp, MapPin, Search, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
    GRIMOIRE_SECTIONS,
    GRIMOIRE_WORLD_TABS,
    LOTM_GRIMOIRE_CHURCHES,
    LOTM_GRIMOIRE_EPOCHS,
    LOTM_GRIMOIRE_PATHWAYS,
    LOTM_GRIMOIRE_VOLUMES,
    LOTM_GRIMOIRE_WORLD,
    churchSearchText,
    epochSearchText,
    filterByGrimoireQuery,
    pathwaySearchText,
    volumeSearchText,
    worldEntrySearchText,
    type GrimoireChurch,
    type GrimoireEpoch,
    type GrimoirePathwayLore,
    type GrimoireSectionId,
    type GrimoireVolume,
    type GrimoireWorldEntry,
    type GrimoireWorldTabId,
} from '../../worldpacks/lotmGrimoireCatalog';

export function LotmGrimoire() {
    const open = useAppStore(s => s.grimoireOpen);
    const closeGrimoire = useAppStore(s => s.closeGrimoire);
    const grimoireFocus = useAppStore(s => s.grimoireFocus);
    const clearGrimoireFocus = useAppStore(s => s.clearGrimoireFocus);
    const [section, setSection] = useState<GrimoireSectionId>('volumes');
    const [worldTab, setWorldTab] = useState<GrimoireWorldTabId>('geography');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);
    const searchExpanded = searchOpen || query.trim().length > 0;

    useEffect(() => {
        if (!open || !grimoireFocus) return;
        setSection(grimoireFocus.section);
        setSelectedId(grimoireFocus.id ?? null);
        if (grimoireFocus.section === 'world') setWorldTab('geography');
        clearGrimoireFocus();
    }, [open, grimoireFocus, clearGrimoireFocus]);

    useEffect(() => {
        if (!open) return undefined;
        restoreFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
            restoreFocusRef.current?.focus();
        };
    }, [open]);

    useEffect(() => {
        if (!open || !searchExpanded) return undefined;
        const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
        return () => window.clearTimeout(timer);
    }, [open, searchExpanded]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            if (selectedId) {
                setSelectedId(null);
                return;
            }
            if (searchExpanded) {
                setQuery('');
                setSearchOpen(false);
                return;
            }
            closeGrimoire();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, closeGrimoire, selectedId, searchExpanded]);

    if (!open) return null;

    return createPortal(
        <div
            className="lotm-grimoire"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lotm-grimoire-title"
            onClick={closeGrimoire}
        >
            <div className="lotm-grimoire-frame" onClick={event => event.stopPropagation()}>
                <header className="lotm-grimoire-header">
                    <div className="lotm-grimoire-brand">
                        <BookOpen size={16} aria-hidden />
                        <div className="lotm-grimoire-titles">
                            <p className="lotm-grimoire-kicker">Lord of the Mysteries</p>
                            <h2 id="lotm-grimoire-title">Grimoire</h2>
                        </div>
                    </div>
                    <div className="lotm-grimoire-header-actions">
                        <div className={`lotm-grimoire-search${searchExpanded ? ' is-open' : ''}`}>
                            <button
                                type="button"
                                className="lotm-grimoire-search-toggle"
                                title={searchExpanded ? 'Close search' : 'Search the Grimoire'}
                                aria-label={searchExpanded ? 'Close search' : 'Search the Grimoire'}
                                aria-expanded={searchExpanded}
                                onClick={() => {
                                    if (searchExpanded && !query.trim()) {
                                        setSearchOpen(false);
                                        return;
                                    }
                                    setSearchOpen(true);
                                }}
                            >
                                <Search size={15} />
                            </button>
                            {searchExpanded && (
                                <input
                                    ref={searchRef}
                                    type="search"
                                    value={query}
                                    onChange={event => {
                                        setQuery(event.target.value);
                                        setSelectedId(null);
                                    }}
                                    onBlur={() => {
                                        if (!query.trim()) setSearchOpen(false);
                                    }}
                                    placeholder="Search this section"
                                    aria-label="Search the Grimoire"
                                />
                            )}
                        </div>
                        <button
                            type="button"
                            className="lotm-grimoire-close"
                            onClick={closeGrimoire}
                            aria-label="Close Grimoire"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </header>
                <div className="lotm-grimoire-body">
                    <nav className="lotm-grimoire-rail" aria-label="Grimoire sections">
                        {GRIMOIRE_SECTIONS.map(entry => (
                            <button
                                key={entry.id}
                                type="button"
                                className={section === entry.id ? 'is-active' : undefined}
                                aria-pressed={section === entry.id}
                                onClick={() => {
                                    setSection(entry.id);
                                    setSelectedId(null);
                                }}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </nav>
                    <div className="lotm-grimoire-main">
                        {section === 'volumes' && (
                            <VolumesPane
                                query={query}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        )}
                        {section === 'epochs' && (
                            <EpochsPane
                                query={query}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        )}
                        {section === 'pathways' && (
                            <PathwaysPane
                                query={query}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        )}
                        {section === 'world' && (
                            <WorldPane
                                query={query}
                                worldTab={worldTab}
                                onWorldTab={setWorldTab}
                                onShowOnMap={(name) => {
                                    closeGrimoire();
                                    useAppStore.getState().openLocationLedgerAt(name);
                                }}
                            />
                        )}
                        {section === 'churches' && (
                            <ChurchesPane
                                query={query}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button type="button" className="lotm-grimoire-back" onClick={onClick}>
            <ArrowLeft size={13} />
            {label}
        </button>
    );
}

function EmptyHint({ text }: { text: string }) {
    return <p className="lotm-grimoire-empty">{text}</p>;
}

function EmblemMark({ src }: { src: string }) {
    if (src) return <img src={src} alt="" />;
    return (
        <span className="lotm-grimoire-unknown-emblem" title="Unknown emblem" aria-label="Unknown emblem">
            <CircleHelp size={36} aria-hidden />
        </span>
    );
}

function VolumesPane({
    query,
    selectedId,
    onSelect,
}: {
    query: string;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    const volumes = useMemo(
        () => filterByGrimoireQuery(LOTM_GRIMOIRE_VOLUMES, query, volumeSearchText),
        [query],
    );
    const selectedVolume = volumes.find(v => v.id === selectedId) ?? null;

    if (selectedVolume) {
        return <VolumeDetail volume={selectedVolume} onBack={() => onSelect(null)} />;
    }

    if (volumes.length === 0) return <EmptyHint text="No volumes match that search." />;

    return (
        <ul className="lotm-grimoire-cards lotm-grimoire-cards-compact">
            {volumes.map(volume => (
                <li key={volume.id}>
                    <button type="button" className="lotm-grimoire-card" onClick={() => onSelect(volume.id)}>
                        <h4>{volume.title}</h4>
                        {volume.chaptersCovered && (
                            <p className="lotm-grimoire-card-meta">Chapters {volume.chaptersCovered}</p>
                        )}
                    </button>
                </li>
            ))}
        </ul>
    );
}

function EpochsPane({
    query,
    selectedId,
    onSelect,
}: {
    query: string;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    const epochs = useMemo(
        () => filterByGrimoireQuery(LOTM_GRIMOIRE_EPOCHS, query, epochSearchText),
        [query],
    );
    const selectedEpoch = epochs.find(e => e.id === selectedId) ?? null;

    if (selectedEpoch) {
        return <EpochDetail epoch={selectedEpoch} onBack={() => onSelect(null)} />;
    }

    if (epochs.length === 0) return <EmptyHint text="No epochs match that search." />;

    return (
        <ul className="lotm-grimoire-cards lotm-grimoire-cards-compact">
            {epochs.map(epoch => (
                <li key={epoch.id}>
                    <button type="button" className="lotm-grimoire-card" onClick={() => onSelect(epoch.id)}>
                        <h4>{epoch.name}</h4>
                    </button>
                </li>
            ))}
        </ul>
    );
}

function VolumeDetail({ volume, onBack }: { volume: GrimoireVolume; onBack: () => void }) {
    return (
        <article className="lotm-grimoire-detail">
            <BackButton onClick={onBack} label="All volumes" />
            <p className="lotm-grimoire-card-kicker">Volume {volume.number}</p>
            <h3>{volume.title}</h3>
            <p className="lotm-grimoire-card-meta">
                {volume.book}
                {volume.chaptersCovered ? ` · Chapters ${volume.chaptersCovered}` : ''}
            </p>
            {volume.titleMeaning && (
                <>
                    <h4>Title meaning</h4>
                    <p>{volume.titleMeaning}</p>
                </>
            )}
            {volume.synopsis && (
                <>
                    <h4>Synopsis</h4>
                    <p>{volume.synopsis}</p>
                </>
            )}
            {volume.events.length > 0 && (
                <>
                    <h4>Major events</h4>
                    <ol className="lotm-grimoire-timeline">
                        {volume.events.map((event, index) => (
                            <li key={`${event.date}-${index}`}>
                                <p className="lotm-grimoire-card-kicker">
                                    {event.date || 'Undated'}
                                    {event.chapters ? ` · Ch. ${event.chapters}` : ''}
                                </p>
                                <p>{event.event}</p>
                            </li>
                        ))}
                    </ol>
                </>
            )}
        </article>
    );
}

function EpochDetail({ epoch, onBack }: { epoch: GrimoireEpoch; onBack: () => void }) {
    return (
        <article className="lotm-grimoire-detail">
            <BackButton onClick={onBack} label="All epochs" />
            <h3>{epoch.name}</h3>
            <p className="lotm-grimoire-card-meta">{epoch.events.length} recorded events</p>
            <ol className="lotm-grimoire-timeline">
                {epoch.events.map((event, index) => (
                    <li key={`${event.time}-${index}`}>
                        {event.time && <p className="lotm-grimoire-card-kicker">{event.time}</p>}
                        <p>{event.description}</p>
                    </li>
                ))}
            </ol>
        </article>
    );
}

function PathwaysPane({
    query,
    selectedId,
    onSelect,
}: {
    query: string;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    const pathways = useMemo(
        () => filterByGrimoireQuery(LOTM_GRIMOIRE_PATHWAYS, query, pathwaySearchText),
        [query],
    );
    const selected = pathways.find(p => p.id === selectedId) ?? null;
    if (selected) return <PathwayDetail pathway={selected} onBack={() => onSelect(null)} />;

    if (pathways.length === 0) return <EmptyHint text="No pathways match that search." />;

    return (
        <ul className="lotm-grimoire-cards lotm-grimoire-cards-compact">
            {pathways.map(pathway => (
                <li key={pathway.id}>
                    <button type="button" className="lotm-grimoire-card is-emblem" onClick={() => onSelect(pathway.id)}>
                        <EmblemMark src={pathway.emblemSrc} />
                        <h4>{pathway.name}</h4>
                    </button>
                </li>
            ))}
        </ul>
    );
}

function PathwayDetail({ pathway, onBack }: { pathway: GrimoirePathwayLore; onBack: () => void }) {
    return (
        <article className="lotm-grimoire-detail">
            <BackButton onClick={onBack} label="All pathways" />
            <div className="lotm-grimoire-detail-hero">
                {pathway.emblemSrc && <img src={pathway.emblemSrc} alt="" />}
                <div>
                    <h3>{pathway.name}</h3>
                    {pathway.aliases.length > 0 && (
                        <p className="lotm-grimoire-card-meta">{pathway.aliases.join(' · ')}</p>
                    )}
                </div>
            </div>
            {pathway.tarotCard && (
                <p className="lotm-grimoire-card-meta">
                    Tarot {pathway.tarotNumber ? `${pathway.tarotNumber} · ` : ''}{pathway.tarotCard}
                </p>
            )}
            {pathway.description && <p>{pathway.description}</p>}
            {pathway.authority && (
                <>
                    <h4>Authority</h4>
                    <p>{pathway.authority}</p>
                </>
            )}
            {pathway.highSequenceCharacteristics && (
                <>
                    <h4>High sequence</h4>
                    <p>{pathway.highSequenceCharacteristics}</p>
                </>
            )}
            {pathway.sequences.length > 0 && (
                <>
                    <h4>Sequence ladder</h4>
                    <ol className="lotm-grimoire-ladder">
                        {pathway.sequences.map(seq => (
                            <li key={seq.sequence}>
                                <span>Seq {seq.sequence}</span>
                                <strong>{seq.name}</strong>
                                <em>{seq.band}</em>
                            </li>
                        ))}
                    </ol>
                </>
            )}
            {pathway.gods.length > 0 && (
                <>
                    <h4>Gods</h4>
                    <ul className="lotm-grimoire-plain">
                        {pathway.gods.map(god => (
                            <li key={god.name}>
                                {god.name}
                                {god.type ? ` — ${god.type}` : ''}
                                {god.status ? ` (${god.status})` : ''}
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {pathway.mythicalCreatureForm && (
                <>
                    <h4>Mythical creature form</h4>
                    <p>{pathway.mythicalCreatureForm}</p>
                </>
            )}
            {pathway.pinnacleForm && (
                <>
                    <h4>Pinnacle form</h4>
                    <p>{pathway.pinnacleForm}</p>
                </>
            )}
            {pathway.tarotDescription && (
                <>
                    <h4>Tarot</h4>
                    <p>{pathway.tarotDescription}</p>
                </>
            )}
            {(pathway.sefirah || pathway.aboveTheSequence) && (
                <p className="lotm-grimoire-card-meta">
                    {[pathway.sefirah && `Sefirah: ${pathway.sefirah}`, pathway.aboveTheSequence && `Above the Sequence: ${pathway.aboveTheSequence}`]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
            )}
            {pathway.relatedOrganizations.length > 0 && (
                <>
                    <h4>Related organizations</h4>
                    <p>{pathway.relatedOrganizations.join(' · ')}</p>
                </>
            )}
            {pathway.pathwaySwitchingNote && (
                <>
                    <h4>Pathway switching</h4>
                    <p>{pathway.pathwaySwitchingNote}</p>
                </>
            )}
        </article>
    );
}

function WorldPane({
    query,
    worldTab,
    onWorldTab,
    onShowOnMap,
}: {
    query: string;
    worldTab: GrimoireWorldTabId;
    onWorldTab: (id: GrimoireWorldTabId) => void;
    onShowOnMap?: (name: string) => void;
}) {
    const entries = useMemo(
        () => filterByGrimoireQuery(LOTM_GRIMOIRE_WORLD[worldTab], query, worldEntrySearchText),
        [query, worldTab],
    );

    return (
        <div className="lotm-grimoire-stack">
            <div className="lotm-grimoire-subtabs" role="tablist" aria-label="World topics">
                {GRIMOIRE_WORLD_TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={worldTab === tab.id}
                        className={worldTab === tab.id ? 'is-active' : undefined}
                        onClick={() => onWorldTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {entries.length === 0 ? <EmptyHint text="Nothing in this topic matches that search." /> : (
                <ul className="lotm-grimoire-cards">
                    {entries.map(entry => (
                        <li key={entry.id} className="lotm-grimoire-static-card">
                            <WorldCard
                                entry={entry}
                                showOnMap={worldTab === 'geography' ? onShowOnMap : undefined}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function WorldCard({ entry, showOnMap }: { entry: GrimoireWorldEntry; showOnMap?: (name: string) => void }) {
    return (
        <article className="lotm-grimoire-card is-static">
            {entry.subtitle && <p className="lotm-grimoire-card-kicker">{entry.subtitle}</p>}
            <h4>{entry.name}</h4>
            {entry.description && <p className="lotm-grimoire-card-body is-full">{entry.description}</p>}
            {entry.extra.map(line => (
                <p key={line} className="lotm-grimoire-card-meta">{line}</p>
            ))}
            {showOnMap && (
                <button
                    type="button"
                    className="lotm-grimoire-map-btn"
                    onClick={() => showOnMap(entry.name)}
                >
                    <MapPin size={11} /> Show on map
                </button>
            )}
        </article>
    );
}

function ChurchesPane({
    query,
    selectedId,
    onSelect,
}: {
    query: string;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}) {
    const churches = useMemo(
        () => filterByGrimoireQuery(LOTM_GRIMOIRE_CHURCHES, query, churchSearchText),
        [query],
    );
    const selected = churches.find(c => c.id === selectedId) ?? null;
    if (selected) return <ChurchDetail church={selected} onBack={() => onSelect(null)} />;
    if (churches.length === 0) return <EmptyHint text="No churches match that search." />;

    return (
        <ul className="lotm-grimoire-cards lotm-grimoire-cards-compact">
            {churches.map(church => (
                <li key={church.id}>
                    <button type="button" className="lotm-grimoire-card is-emblem" onClick={() => onSelect(church.id)}>
                        <EmblemMark src={church.emblemSrc} />
                        <h4>{church.name}</h4>
                    </button>
                </li>
            ))}
        </ul>
    );
}

function ChurchDetail({ church, onBack }: { church: GrimoireChurch; onBack: () => void }) {
    return (
        <article className="lotm-grimoire-detail">
            <BackButton onClick={onBack} label="All churches" />
            <div className="lotm-grimoire-detail-hero">
                {church.emblemSrc && <img src={church.emblemSrc} alt="" />}
                <div>
                    <h3>{church.name}</h3>
                    {church.alsoCalled && <p className="lotm-grimoire-card-meta">{church.alsoCalled}</p>}
                </div>
            </div>
            {church.godWorshiped && (
                <>
                    <h4>God worshiped</h4>
                    <p>{church.godWorshiped}</p>
                </>
            )}
            {church.pathways.length > 0 && (
                <>
                    <h4>Pathways</h4>
                    <p>{church.pathways.join(' · ')}</p>
                </>
            )}
            {church.domain && (
                <>
                    <h4>Domain</h4>
                    <p>{church.domain}</p>
                </>
            )}
            {church.beyonderTeams.length > 0 && (
                <>
                    <h4>Beyonder teams</h4>
                    <p>{church.beyonderTeams.join(' · ')}</p>
                </>
            )}
            {(church.hierarchyLeader || church.headquarters || church.upperEchelon || church.clergyAttire) && (
                <>
                    <h4>Hierarchy</h4>
                    <ul className="lotm-grimoire-plain">
                        {church.hierarchyLeader && <li>Leader: {church.hierarchyLeader}</li>}
                        {church.headquarters && <li>Headquarters: {church.headquarters}</li>}
                        {church.upperEchelon && <li>Upper echelon: {church.upperEchelon}</li>}
                        {church.clergyAttire && <li>Attire: {church.clergyAttire}</li>}
                    </ul>
                </>
            )}
            {church.foundedIn && (
                <>
                    <h4>Founded</h4>
                    <p>{church.foundedIn}</p>
                </>
            )}
            {church.extraDetails && (
                <>
                    <h4>Notes</h4>
                    <p>{church.extraDetails}</p>
                </>
            )}
        </article>
    );
}
