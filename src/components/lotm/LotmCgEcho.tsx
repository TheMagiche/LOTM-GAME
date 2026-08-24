import { X } from 'lucide-react';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';

export function LotmCgEcho({ image, onDismiss }: { image: string; onDismiss: () => void }) {
    return (
        <div className="lotm-cg-echo" role="dialog" aria-label="Illustrated echo">
            <button type="button" className="lotm-cg-dismiss" onClick={onDismiss} aria-label="Dismiss illustration">
                <X size={16} />
            </button>
            <img src={lotmAssetUrl(image)} alt="" />
        </div>
    );
}
