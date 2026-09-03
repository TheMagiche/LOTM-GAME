import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlayablePcOption } from '../../worldpacks/lordOfTheMysteries';
import {
    formatLotmSequenceName,
    formatLotmTarotKicker,
    lotmTarotOrder,
    resolveLotmPathway,
    type LotmPathwayDef,
} from '../../worldpacks/lotmPathways';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { LOTM_PLAYER_PORTRAITS } from '../../worldpacks/lotmVisualManifest';

interface SlotStyle {
    x: number;
    rotateY: number;
    scale: number;
    zIndex: number;
    opacity: number;
    blur: number;
}

function getSlotStyle(offset: number): SlotStyle {
    const abs = Math.abs(offset);
    if (abs === 0) return { x: 0, rotateY: 0, scale: 1, zIndex: 100, opacity: 1, blur: 0 };
    if (abs === 1) return { x: offset * 185, rotateY: -offset * 26, scale: 0.88, zIndex: 50, opacity: 0.82, blur: 0 };
    if (abs === 2) return { x: offset * 280, rotateY: -offset * 36, scale: 0.74, zIndex: 20, opacity: 0.45, blur: 0.6 };
    if (abs === 3) return { x: offset * 345, rotateY: -offset * 44, scale: 0.62, zIndex: 5, opacity: 0.18, blur: 1.2 };
    return { x: offset * 380, rotateY: -offset * 50, scale: 0.5, zIndex: 0, opacity: 0, blur: 2 };
}

function wrappedOffset(index: number, active: number, length: number): number {
    let offset = index - active;
    const half = Math.floor(length / 2);
    if (offset > half) offset -= length;
    if (offset < -half) offset += length;
    return offset;
}

export function sortPlayablePcsForTarot(pcs: PlayablePcOption[]): PlayablePcOption[] {
    return pcs.slice().sort((a, b) => {
        const order = lotmTarotOrder(resolveLotmPathway(a.pathway)) - lotmTarotOrder(resolveLotmPathway(b.pathway));
        return order || a.name.localeCompare(b.name);
    });
}

const PLAYER_CHARACTER_ART: Record<string, string> = Object.fromEntries(
    LOTM_PLAYER_PORTRAITS.map(entry => [entry.id.replace(/-/g, '_'), entry.portrait]),
);

const PATHWAY_CHARACTER_ART: Record<string, string> = {
    fool: 'image/characters/the_fool.webp',
    visionary: 'image/characters/audrey_hall.webp',
    tyrant: 'image/characters/alger_wilson.webp',
    sun: 'image/characters/derrick_berg.webp',
    door: 'image/characters/fors_wall.webp',
    darkness: 'image/characters/leonard_mitchell.webp',
    death: 'image/characters/daly_simone.webp',
    twilight_giant: 'image/characters/colin_iliad.webp',
    red_priest: 'image/characters/danitz_dubois.webp',
    demoness: 'image/characters/trissy.webp',
    hermit: 'image/characters/cattleya.webp',
    paragon: 'image/characters/roselle_gustav.webp',
    black_emperor: 'image/characters/roselle_gustav.webp',
    justiciar: 'image/characters/xio_derecha.webp',
    wheel_of_fortune: 'image/characters/will_auceptin.webp',
    moon: 'image/characters/emlyn_white.webp',
    mother: 'image/characters/frank_lee.webp',
    planter: 'image/characters/frank_lee.webp',
    chained: 'image/characters/sharron.webp',
    abyss: 'image/characters/true_creator.webp',
    criminal: 'image/characters/true_creator.webp',
    hanged_man: 'image/characters/sasrir.webp',
    secrets_supplicant: 'image/characters/sasrir.webp',
    reader: 'image/characters/edwina_edwards.webp',
    white_tower: 'image/characters/edwina_edwards.webp',
    error: 'image/characters/amon.webp',
    marauder: 'image/characters/amon.webp',
};

function normalizePcKey(key: string): string {
    return key.toLowerCase().replace(/^pc_lotm_/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getCharacterImageForPc(pc: PlayablePcOption, pathway: LotmPathwayDef | undefined): string {
    const pcIdKey = normalizePcKey(pc.id);
    if (PLAYER_CHARACTER_ART[pcIdKey]) {
        return lotmAssetUrl(PLAYER_CHARACTER_ART[pcIdKey]);
    }
    const pcNameKey = normalizePcKey(pc.name);
    if (PLAYER_CHARACTER_ART[pcNameKey]) {
        return lotmAssetUrl(PLAYER_CHARACTER_ART[pcNameKey]);
    }
    for (const [key, path] of Object.entries(PLAYER_CHARACTER_ART)) {
        if (pcIdKey.includes(key) || key.includes(pcIdKey) || pcNameKey.includes(key) || key.includes(pcNameKey)) {
            return lotmAssetUrl(path);
        }
    }

    const pathwayId = pathway?.id?.toLowerCase() || pc.pathway?.toLowerCase() || '';
    const charPath = PATHWAY_CHARACTER_ART[pathwayId];
    if (charPath) return lotmAssetUrl(charPath);
    for (const [key, path] of Object.entries(PATHWAY_CHARACTER_ART)) {
        if (pathwayId.includes(key) || key.includes(pathwayId)) return lotmAssetUrl(path);
    }
    if (pathway?.emblemSrc) return pathway.emblemSrc;
    return lotmAssetUrl('image/players/clara_whitlock.jpeg');
}

export interface LotmTarotSelectProps {
    pcs: PlayablePcOption[];
    selectedId: string;
    onSelect: (id: string) => void;
    onConfirm: () => void;
    disabled?: boolean;
}

export function LotmTarotSelect({
    pcs,
    selectedId,
    onSelect,
    onConfirm,
    disabled,
}: LotmTarotSelectProps) {
    const deck = useMemo(() => sortPlayablePcsForTarot(pcs), [pcs]);
    const activeIdx = Math.max(0, deck.findIndex(pc => pc.id === selectedId));
    const active = deck[activeIdx];
    const touchStartX = useRef(0);

    const navigate = (dir: number) => {
        if (disabled || deck.length === 0) return;
        const next = (activeIdx + dir + deck.length) % deck.length;
        onSelect(deck[next].id);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (disabled || deck.length === 0) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const dir = e.key === 'ArrowLeft' ? -1 : 1;
                const next = (activeIdx + dir + deck.length) % deck.length;
                onSelect(deck[next].id);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeIdx, deck, disabled, onConfirm, onSelect]);

    if (!active) return null;

    const activePathway = resolveLotmPathway(active.pathway);

    return (
        <div className="lotm-tarot">
            <p className="lotm-tarot-kicker">Choose a Beyonder</p>
            <div
                className="lotm-tarot-stage"
                onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={e => {
                    const dx = e.changedTouches[0].clientX - touchStartX.current;
                    if (Math.abs(dx) > 40) navigate(dx < 0 ? 1 : -1);
                }}
            >
                <button
                    type="button"
                    className="lotm-tarot-nav"
                    aria-label="Previous card"
                    disabled={disabled}
                    onClick={() => navigate(-1)}
                >
                    <ChevronLeft size={22} />
                </button>
                <div className="lotm-tarot-fan" role="listbox" aria-label="Starting characters" aria-activedescendant={active.id}>
                    {deck.map((pc, i) => {
                        const offset = wrappedOffset(i, activeIdx, deck.length);
                        const slot = getSlotStyle(offset);
                        const selected = offset === 0;
                        const pathway = resolveLotmPathway(pc.pathway);
                        const emblem = pathway?.emblemSrc || '';
                        const charImg = getCharacterImageForPc(pc, pathway);
                        const hidden = slot.opacity === 0;
                        const arcanaKicker = formatLotmTarotKicker(pathway) || pathway?.name;
                        return (
                            <button
                                key={pc.id}
                                id={pc.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                tabIndex={selected ? 0 : -1}
                                disabled={disabled || hidden}
                                className={`lotm-tarot-card${selected ? ' is-active' : ''}`}
                                style={{
                                    transform: `translateX(${slot.x}px) rotateY(${slot.rotateY}deg) scale(${slot.scale})`,
                                    zIndex: slot.zIndex,
                                    opacity: slot.opacity,
                                    filter: slot.blur ? `blur(${slot.blur}px)` : undefined,
                                    pointerEvents: hidden ? 'none' : 'auto',
                                }}
                                onClick={() => {
                                    if (!selected) onSelect(pc.id);
                                }}
                                onDoubleClick={() => {
                                    if (selected) onConfirm();
                                }}
                            >
                                <div className="lotm-tarot-card-inner">
                                    <img src={charImg} alt={pc.name} className="lotm-tarot-card-img" />
                                    {emblem ? (
                                        <div className="lotm-tarot-card-emblem-badge" aria-hidden="true">
                                            <img src={emblem} alt="" />
                                        </div>
                                    ) : null}
                                    <div className="lotm-tarot-card-overlay">
                                        <span className="lotm-tarot-card-arcana">{arcanaKicker}</span>
                                        <span className="lotm-tarot-card-name">{pc.name}</span>
                                        <span className="lotm-tarot-card-pathway">{pathway?.name || pc.pathway}</span>
                                        <span className="lotm-tarot-card-sequence">{formatLotmSequenceName(pc.pathway, pc.sequence)}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <button
                    type="button"
                    className="lotm-tarot-nav"
                    aria-label="Next card"
                    disabled={disabled}
                    onClick={() => navigate(1)}
                >
                    <ChevronRight size={22} />
                </button>
            </div>
            <p className="lotm-tarot-caption">
                {active.name}
                <span>
                    {activePathway?.name || active.pathway}
                    {' · '}
                    {formatLotmSequenceName(active.pathway, active.sequence)}
                </span>
            </p>
        </div>
    );
}
