import { GhostBtn } from '../primitives/Buttons';
import { Backdrop } from '../primitives/Backdrop';
import { formatDemoCountdown } from '../../config/demoMode';
import { useDemoRemainingMs } from '../../services/demo/demoSessionClock';

export function DemoOccupiedModal({
    open,
    expiresAt = null,
    remainingMs = 0,
    onDismiss,
}: {
    open: boolean;
    expiresAt?: number | null;
    remainingMs?: number;
    onDismiss: () => void;
}) {
    const liveRemaining = useDemoRemainingMs(open ? expiresAt : null);
    if (!open) return null;
    const remaining = liveRemaining ?? remainingMs;
    const hasTime = remaining > 0;
    return (
        <Backdrop onClick={onDismiss}>
            <div
                className="lotm-demo-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lotm-demo-occupied-title"
                onClick={e => e.stopPropagation()}
            >
                <p id="lotm-demo-occupied-title" className="lotm-demo-modal-title">A chronicle is in play</p>
                <p className="lotm-demo-modal-body">
                    Another visitor is already in a demo session.
                    {hasTime
                        ? ` This slot should free in about ${formatDemoCountdown(remaining)}.`
                        : ' Please try again shortly.'}
                </p>
                <div className="lotm-demo-modal-actions">
                    <GhostBtn onClick={onDismiss}>OK</GhostBtn>
                </div>
            </div>
        </Backdrop>
    );
}
