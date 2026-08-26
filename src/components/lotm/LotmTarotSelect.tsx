import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlayablePcOption } from '../../worldpacks/lordOfTheMysteries';
import {
    formatLotmSequenceName,
    formatLotmTarotKicker,
    lotmTarotOrder,
    resolveLotmPathway,
} from '../../worldpacks/lotmPathways';

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
    if (abs === 1) return { x: offset * 168, rotateY: -offset * 28, scale: 0.86, zIndex: 50, opacity: 0.78, blur: 0 };
    if (abs === 2) return { x: offset * 250, rotateY: -offset * 38, scale: 0.72, zIndex: 20, opacity: 0.42, blur: 0.6 };
    if (abs === 3) return { x: offset * 310, rotateY: -offset * 46, scale: 0.6, zIndex: 5, opacity: 0.18, blur: 1.2 };
    return { x: offset * 340, rotateY: -offset * 52, scale: 0.5, zIndex: 0, opacity: 0, blur: 2 };
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
                        const hidden = slot.opacity === 0;
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
                                <span className="lotm-tarot-card-arcana">{formatLotmTarotKicker(pathway) || pathway?.name}</span>
                                <span className="lotm-tarot-card-emblem">
                                    {emblem ? (
                                        <img src={emblem} alt="" aria-hidden="true" />
                                    ) : null}
                                </span>
                                <span className="lotm-tarot-card-name">{pc.name}</span>
                                <span className="lotm-tarot-card-pathway">{pathway?.name || pc.pathway}</span>
                                <span className="lotm-tarot-card-sequence">{formatLotmSequenceName(pc.pathway, pc.sequence)}</span>
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
