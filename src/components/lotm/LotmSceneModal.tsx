import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import type { LotmPortraitHit } from '../../services/lotm/lotmVisualMatcher';
import { LotmStage } from './LotmStage';

export function LotmSceneModal({
    backdrop,
    portraits,
    speakerName,
    beatLabel,
    canPrev,
    canNext,
    onPrev,
    onNext,
    onClose,
}: {
    backdrop: string;
    portraits: LotmPortraitHit[];
    speakerName: string;
    beatLabel: string;
    canPrev: boolean;
    canNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key === 'ArrowLeft' && canPrev) {
                event.preventDefault();
                onPrev();
            }
            if (event.key === 'ArrowRight' && canNext) {
                event.preventDefault();
                onNext();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [canPrev, canNext, onClose, onPrev, onNext]);

    const backdropUrl = lotmAssetUrl(backdrop);

    return createPortal(
        <div
            className="lotm-scene-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lotm-scene-title"
            onClick={onClose}
        >
            <div className="lotm-scene-modal-frame" onClick={e => e.stopPropagation()}>
                <header className="lotm-scene-modal-header">
                    <div>
                        <p className="lotm-scene-modal-kicker">Scene</p>
                        <h2 id="lotm-scene-title">{speakerName}</h2>
                    </div>
                    <button type="button" className="lotm-scene-modal-close" onClick={onClose} aria-label="Close scene">
                        <X size={16} />
                    </button>
                </header>

                <div className="lotm-scene-modal-stage">
                    <div
                        className="lotm-backdrop"
                        style={{ backgroundImage: `url("${backdropUrl}")` }}
                        aria-hidden
                    />
                    <div className="lotm-backdrop-scrim" aria-hidden />
                    <LotmStage portraits={portraits} />
                </div>

                <footer className="lotm-scene-modal-nav">
                    <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Previous GM text">
                        <ChevronLeft size={16} />
                    </button>
                    <span>{beatLabel}</span>
                    <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next GM text">
                        <ChevronRight size={16} />
                    </button>
                </footer>
            </div>
        </div>,
        document.body,
    );
}
