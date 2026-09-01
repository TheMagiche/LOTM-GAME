import { GhostBtn, DangerBtn } from '../primitives/Buttons';
import { Backdrop } from '../primitives/Backdrop';

export function DemoIdleWarningModal({
    open,
    onStay,
    onLeave,
}: {
    open: boolean;
    onStay: () => void;
    onLeave: () => void;
}) {
    if (!open) return null;
    return (
        <Backdrop onClick={onStay}>
            <div
                className="lotm-demo-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lotm-demo-idle-title"
                onClick={e => e.stopPropagation()}
            >
                <p id="lotm-demo-idle-title" className="lotm-demo-modal-title">Session expiring</p>
                <p className="lotm-demo-modal-body">
                    This demo chronicle will be removed in a few minutes. Export is not available on the public demo.
                </p>
                <div className="lotm-demo-modal-actions">
                    <GhostBtn onClick={onStay}>Keep playing</GhostBtn>
                    <DangerBtn onClick={onLeave}>Leave now</DangerBtn>
                </div>
            </div>
        </Backdrop>
    );
}
