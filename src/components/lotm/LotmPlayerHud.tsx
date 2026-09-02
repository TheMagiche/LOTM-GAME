import type { KeyboardEvent, MouseEvent } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { buildLotmPlayerHudModel } from './lotmPlayerHudModel';

function isHudChromeTarget(target: EventTarget | null): boolean {
    return !(target instanceof Element) || !target.closest('button, a, input, textarea, select, [role="button"]');
}

function Meter({
    label,
    meter,
    tone,
    value,
    title,
    stateClass,
}: {
    label: string;
    meter: { current: number; max: number; pct: number };
    tone: 'hp' | 'spi' | 'dig' | 'loc';
    value?: string;
    title?: string;
    stateClass?: string;
}) {
    const low = tone !== 'loc' && meter.pct <= 30;
    const classes = [
        'lotm-player-hud-meter',
        `is-${tone}`,
        low ? 'is-low' : '',
        stateClass ? `is-${stateClass}` : '',
    ].filter(Boolean).join(' ');
    return (
        <div className={classes} title={title}>
            <div className="lotm-player-hud-meter-row">
                <span>{label}</span>
                <span>{value ?? `${meter.current}/${meter.max}`}</span>
            </div>
            <div
                className="lotm-player-hud-meter-track"
                role="meter"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={meter.max}
                aria-valuenow={meter.current}
                aria-valuetext={value}
            >
                <span style={{ width: `${meter.pct}%` }} />
            </div>
        </div>
    );
}

export function LotmPlayerHud() {
    const playerCharacter = useAppStore(s => s.playerCharacter);
    const characterProfileData = useAppStore(s => s.characterProfileData ?? s.context.characterProfileData);
    const npcLedger = useAppStore(s => s.npcLedger);
    const onStageNpcIds = useAppStore(s => s.onStageNpcIds);
    const lastLootReceipt = useAppStore(s => s.lastLootReceipt);
    const setLastLootReceipt = useAppStore(s => s.setLastLootReceipt);

    const onStage = new Set(onStageNpcIds ?? []);
    const opponents = onStage.size === 0
        ? []
        : npcLedger.filter(npc => onStage.has(npc.id));
    const model = buildLotmPlayerHudModel(playerCharacter, characterProfileData, { opponents });
    if (!model.present) return null;

    const subtitle = [model.pathwayName, model.sequenceLabel].filter(Boolean).join(' · ');

    const openCharacterRecord = () => {
        useAppStore.getState().openPlayerGrimoire('character');
    };

    const openPathwayDetails = () => {
        useAppStore.getState().openPlayerGrimoire('pathway');
    };

    const openPlayerGrimoire = () => {
        useAppStore.getState().openPlayerGrimoire();
    };

    const onHudClick = (event: MouseEvent<HTMLElement>) => {
        if (!isHudChromeTarget(event.target)) return;
        openPlayerGrimoire();
    };

    const onHudKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openPlayerGrimoire();
    };

    const locTooltip = (() => {
        switch (model.locStage) {
            case 3:
                return 'Loss of Control: Rampage — Complete mental collapse into Mythical Creature Form. Church kill teams deployed.';
            case 2:
                return 'Loss of Control: Slippage — Severe mental distress and physical mutations. All rolls forced to Disadvantage.';
            case 1:
                return 'Loss of Control: Tells — Auditory whispers, unnatural cravings, and color distortions.';
            default:
                return 'Loss of Control: Stable — Mental equilibrium intact.';
        }
    })();

    return (
        <aside
            className="lotm-player-hud"
            aria-label="Player status. Open Player Grimoire"
            title="Sequence progress, abilities, and carried items are in the Player Grimoire"
            tabIndex={0}
            onClick={onHudClick}
            onKeyDown={onHudKeyDown}
        >
            <div className="lotm-player-hud-main">
                <div className="lotm-player-hud-identity-cluster">
                    <button
                        type="button"
                        className="lotm-player-hud-emblem-btn"
                        onClick={openPathwayDetails}
                        aria-label={model.pathwayName ? `Open Pathway details for ${model.pathwayName}` : 'Open Pathway details'}
                        title={model.pathwayName ? `Open ${model.pathwayName} details in Player Grimoire` : 'Open Pathway details'}
                    >
                        {model.emblemSrc ? (
                            <img
                                className="lotm-player-hud-emblem"
                                src={model.emblemSrc}
                                alt=""
                            />
                        ) : (
                            <div className="lotm-player-hud-emblem is-fallback" aria-hidden />
                        )}
                    </button>
                    <button
                        type="button"
                        className="lotm-player-hud-identity-btn"
                        onClick={openCharacterRecord}
                        aria-label={`Open Character Record for ${model.name}`}
                        title="Open Character Record"
                    >
                        <div className="lotm-player-hud-identity">
                            <span className="lotm-player-hud-kicker">Beyonder</span>
                            <span className="lotm-player-hud-name">{model.name}</span>
                            {(subtitle || model.sequenceBand) && (
                                <span className="lotm-player-hud-pathway">
                                    {subtitle}
                                    {model.sequenceBand && (
                                        <span
                                            className={`lotm-player-hud-band is-${model.sequenceBand.band.toLowerCase()}`}
                                            aria-label="Sequence band"
                                            title={model.sequenceBandLine}
                                        >
                                            {model.sequenceBand.band}
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
                <div className="lotm-player-hud-meters">
                    {model.spirituality && <Meter label="Spirit" meter={model.spirituality} tone="spi" />}
                    <Meter
                        label="Digestion"
                        meter={{ current: model.digestion, max: 100, pct: model.digestion }}
                        tone="dig"
                    />
                    <Meter
                        label="Loss of Control"
                        meter={{
                            current: model.locStage,
                            max: 3,
                            pct: Math.round((model.locStage / 3) * 100),
                        }}
                        tone="loc"
                        value={model.locLabel}
                        title={locTooltip}
                        stateClass={model.locLabel}
                    />
                </div>
            </div>

            {lastLootReceipt && lastLootReceipt.names.length > 0 && (
                <p className="lotm-player-hud-loot" role="status">
                    <span>Loot · {lastLootReceipt.names.join(' · ')}</span>
                    <button type="button" onClick={() => setLastLootReceipt(null)} aria-label="Dismiss loot receipt">×</button>
                </p>
            )}
        </aside>
    );
}
