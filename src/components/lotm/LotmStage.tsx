import { lotmAssetUrl, isLotmAssetPath } from '../../services/lotm/lotmAssetUrl';
import { ASSET_BASE } from '../../lib/apiBase';
import type { LotmPortraitHit } from '../../services/lotm/lotmVisualMatcher';

function portraitSrc(src: string): string {
    if (!src) return '';
    if (isLotmAssetPath(src) || src.startsWith('/assets/lotm/')) {
        const rel = src.replace(/^.*\/assets\/lotm\//, '');
        return lotmAssetUrl(rel);
    }
    if (src.startsWith('/assets/')) return `${ASSET_BASE || ''}${src}`;
    if (src.startsWith('image/') || src.startsWith('assets/')) return lotmAssetUrl(src);
    return src;
}

export function LotmStage({ portraits }: { portraits: LotmPortraitHit[] }) {
    return (
        <div className="lotm-stage relative z-10 flex-1 flex items-end justify-center gap-6 px-6 min-h-0 pointer-events-none">
            {portraits.length === 0 ? (
                <div className="lotm-stage-empty mb-8 text-center">
                    <p className="lotm-stage-empty-label"></p>
                </div>
            ) : portraits.map((p, i) => (
                <figure
                    key={`${p.name}-${i}`}
                    className={`lotm-portrait ${p.isPc ? 'lotm-portrait-pc' : ''}`}
                >
                    <img src={portraitSrc(p.src)} alt={p.name} />
                    <figcaption>
                        <span className="lotm-portrait-name">{p.name}</span>
                        {p.seqLabel && <span className="lotm-portrait-seq">{p.seqLabel}</span>}
                        {p.standing && <span className="lotm-portrait-standing">{p.standing}</span>}
                    </figcaption>
                </figure>
            ))}
        </div>
    );
}
