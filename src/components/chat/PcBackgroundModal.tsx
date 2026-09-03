import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Holds `PcBackgroundModal` for the current campaign session. Opens on the
 * first empty-chat load, then stays mounted after indexing finishes and the
 * opening brief is sent — ChatEmptyState unmounts at that point. A campaign
 * switch resets dismiss / hold.
 */
export function PcBackgroundHost({
    campaignId,
    messagesEmpty,
    name,
    storyRelevance,
}: {
    campaignId: string | null;
    messagesEmpty: boolean;
    name: string;
    storyRelevance: string;
}) {
    const who = storyRelevance.trim();
    const [sessionId, setSessionId] = useState(campaignId);
    const [dismissed, setDismissed] = useState(false);
    const [held, setHeld] = useState(() => messagesEmpty && who.length > 0);

    if (sessionId !== campaignId) {
        setSessionId(campaignId);
        setDismissed(false);
        setHeld(messagesEmpty && who.length > 0);
    }

    useEffect(() => {
        if (messagesEmpty && who) setHeld(true);
    }, [messagesEmpty, who]);

    if (dismissed || !held || !who) return null;

    return (
        <PcBackgroundModal
            name={name}
            storyRelevance={who}
            onClose={() => setDismissed(true)}
        />
    );
}

/**
 * Read-only dossier for the PC sheet "Who You Are" (`storyRelevance`) field.
 * Portals onto `document.body` so illustrated play's `backdrop-filter` and
 * `.lotm-chat` stacking context cannot trap `position: fixed` (same reason
 * as AbsoluteCommandButton). Auto-shown on empty-chat load — no open trigger.
 * Stays until the player closes it (X, Escape, or backdrop).
 */
export function PcBackgroundModal({
    name,
    storyRelevance,
    onClose,
}: {
    name: string;
    storyRelevance: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pc-background-title"
            onClick={onClose}
        >
            <div
                className="bg-surface border border-border rounded-lg w-full max-w-lg mx-4 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <h2 id="pc-background-title" className="text-terminal text-sm font-bold tracking-[0.2em] uppercase">
                        Background
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-text-dim hover:text-text-primary"
                        aria-label="Close Background"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto space-y-2">
                    {name ? (
                        <p className="text-text-primary text-sm tracking-wide">{name}</p>
                    ) : null}
                    <p className="text-text-primary/80 text-sm leading-relaxed whitespace-pre-wrap">
                        {storyRelevance}
                    </p>
                </div>
            </div>
        </div>,
        document.body,
    );
}
