import { LANDING_LOADER } from './landingCopy';

type LotmLandingLoaderProps = {
    loaded: number;
    total: number;
    fadingOut?: boolean;
};

export function LotmOccultSeal() {
    return (
        <div className="lotm-occult-seal" aria-hidden="true">
            <span className="lotm-occult-seal-cross" />
            <span className="lotm-occult-seal-ring" />
            <span className="lotm-occult-seal-ring lotm-occult-seal-ring-inner" />
            <span className="lotm-occult-seal-core" />
        </div>
    );
}

export function LotmLandingLoader({ loaded, total, fadingOut = false }: LotmLandingLoaderProps) {
    const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

    return (
        <div
            className={`lotm-landing-loader${fadingOut ? ' is-done' : ''}`}
            role="status"
            aria-live="polite"
            aria-busy={!fadingOut}
            aria-label={LANDING_LOADER.detail}
        >
            <div className="lotm-landing-loader-panel">
                <LotmOccultSeal />
                <p className="lotm-landing-loader-kicker">{LANDING_LOADER.kicker}</p>
                <p className="lotm-landing-loader-title">{LANDING_LOADER.title}</p>
                <p className="lotm-landing-loader-detail">{LANDING_LOADER.detail}</p>
                {total > 0 && (
                    <>
                        <div className="lotm-landing-loader-bar" aria-hidden="true">
                            <div className="lotm-landing-loader-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="lotm-landing-loader-count">
                            {LANDING_LOADER.portraitsLabel(loaded, total)}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
