import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { buildLotmPlayerHudModel } from './lotmPlayerHudModel';
import { formatLotmBountyLine } from '../../worldpacks/lotmPurse';

const SEQUENCE_LADDER = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

function Meter({
    label,
    meter,
    tone,
}: {
    label: string;
    meter: { current: number; max: number; pct: number };
    tone: 'hp' | 'spi' | 'dig';
}) {
    return (
        <div className={`lotm-player-hud-meter is-${tone}${meter.pct <= 30 ? ' is-low' : ''}`}>
            <div className="lotm-player-hud-meter-row">
                <span>{label}</span>
                <span>{meter.current}/{meter.max}</span>
            </div>
            <div
                className="lotm-player-hud-meter-track"
                role="meter"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={meter.max}
                aria-valuenow={meter.current}
            >
                <span style={{ width: `${meter.pct}%` }} />
            </div>
        </div>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div className="lotm-player-hud-fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function hasVisibleBounty(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—') return false;
    if (/^0(\s+pounds?)?$/i.test(trimmed)) return false;
    if (/—\s*0\s+pounds?$/i.test(trimmed)) return false;
    return true;
}

export function LotmPlayerHud() {
    const playerCharacter = useAppStore(s => s.playerCharacter);
    const characterProfileData = useAppStore(s => s.characterProfileData ?? s.context.characterProfileData);
    const inventoryItems = useAppStore(s => s.inventoryItems ?? s.context.inventoryItems ?? []);
    const locationLedger = useAppStore(s => s.locationLedger);
    const npcLedger = useAppStore(s => s.npcLedger);
    const onStageNpcIds = useAppStore(s => s.onStageNpcIds);
    const currentPlaceId = useAppStore(s => s.context.currentPlaceId);
    const currentFeature = useAppStore(s => s.context.currentFeature);
    const pcPanelOpen = useAppStore(s => s.pcPanelOpen);
    const togglePCPanel = useAppStore(s => s.togglePCPanel);
    const lastLootReceipt = useAppStore(s => s.lastLootReceipt);
    const setLastLootReceipt = useAppStore(s => s.setLastLootReceipt);
    const [inventoryOpen, setInventoryOpen] = useState(false);

    const currentPlace = currentPlaceId
        ? locationLedger.find(place => place.id === currentPlaceId)
        : undefined;
    const onStage = new Set(onStageNpcIds ?? []);
    const opponents = onStage.size === 0
        ? []
        : npcLedger.filter(npc => onStage.has(npc.id));
    const model = buildLotmPlayerHudModel(playerCharacter, characterProfileData, {
        inventory: inventoryItems,
        locationName: currentPlace?.name || null,
        locationFeature: currentFeature || null,
        bounty: characterProfileData?.bounty
            || formatLotmBountyLine(playerCharacter?.pcMeta?.bounty)
            || null,
        opponents,
    });
    if (!model.present) return null;

    const subtitle = [model.pathwayName, model.sequenceLabel].filter(Boolean).join(' · ');
    const showBounty = hasVisibleBounty(model.bounty);

    const openSheet = () => {
        if (!pcPanelOpen) togglePCPanel();
    };

    const openPathwayPage = () => {
        if (!model.pathwayId) {
            openSheet();
            return;
        }
        useAppStore.getState().openGrimoire({ section: 'pathways', id: model.pathwayId });
    };

    return (
        <aside className={`lotm-player-hud${inventoryOpen ? ' is-expanded' : ''}`} aria-label="Player status">
            <div className="lotm-player-hud-main">
                <div className="lotm-player-hud-identity-cluster">
                    <button
                        type="button"
                        className="lotm-player-hud-emblem-btn"
                        onClick={openPathwayPage}
                        aria-label={model.pathwayName ? `Open Grimoire for ${model.pathwayName}` : 'Open Grimoire'}
                        title={model.pathwayName ? `Open ${model.pathwayName} in the Grimoire` : 'Open Grimoire'}
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
                        onClick={openSheet}
                        aria-label={`Open character sheet for ${model.name}`}
                        title="Open character sheet"
                    >
                        <div className="lotm-player-hud-identity">
                            <span className="lotm-player-hud-kicker">Beyonder</span>
                            <span className="lotm-player-hud-name">{model.name}</span>
                            {subtitle && <span className="lotm-player-hud-pathway">{subtitle}</span>}
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
                    <div className={`lotm-player-hud-loc is-${model.locLabel}`} title={`Loss of Control: ${model.locLabel}`}>
                        <span>LoC</span>
                        <strong>{model.locLabel}</strong>
                    </div>
                </div>
                <div className="lotm-player-hud-actions">
                    <button
                        type="button"
                        className="lotm-player-hud-toggle"
                        aria-expanded={inventoryOpen}
                        aria-controls="lotm-player-hud-inventory"
                        onClick={() => setInventoryOpen(open => !open)}
                    >
                        <ChevronDown size={16} />
                        Inventory
                    </button>
                </div>
            </div>

            {model.sequenceBandLine && (
                <p className={`lotm-player-hud-band is-${model.sequenceBand?.band.toLowerCase()}`} aria-label="Sequence band">
                    {model.sequenceBandLine}
                </p>
            )}
            {model.abilities.length > 0 && (
                <p className="lotm-player-hud-ability-preview" aria-label="Sequence abilities" title={model.abilities.join(' · ')}>
                    {model.abilities.join(' · ')}
                </p>
            )}
            {lastLootReceipt && lastLootReceipt.names.length > 0 && (
                <p className="lotm-player-hud-loot" role="status">
                    <span>Loot · {lastLootReceipt.names.join(' · ')}</span>
                    <button type="button" onClick={() => setLastLootReceipt(null)} aria-label="Dismiss loot receipt">×</button>
                </p>
            )}

            {typeof model.sequenceNumber === 'number' && (
                <ol className="lotm-player-hud-track" aria-label={`Sequence ladder, currently ${model.sequenceLabel || `Sequence ${model.sequenceNumber}`}`}>
                    {SEQUENCE_LADDER.map(seq => {
                        const state = seq === model.sequenceNumber
                            ? 'is-current'
                            : seq > model.sequenceNumber!
                                ? 'is-past'
                                : 'is-ahead';
                        return (
                            <li key={seq} className={state} title={`Sequence ${seq}`}>
                                {seq}
                            </li>
                        );
                    })}
                </ol>
            )}

            {inventoryOpen && (
                <div id="lotm-player-hud-inventory" className="lotm-player-hud-details">
                    <dl className="lotm-player-hud-facts">
                        <Fact label="Location" value={model.location} />
                        {showBounty && <Fact label="Bounty" value={model.bounty} />}
                    </dl>
                    {model.stats.length > 0 && (
                        <dl className="lotm-player-hud-stats">
                            {model.stats.map(stat => (
                                <div key={stat.label}>
                                    <dt>{stat.label}</dt>
                                    <dd>{stat.value}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    <div>
                        <p className="lotm-player-hud-section">Carried</p>
                        {model.items.length > 0 ? (
                            <ul className="lotm-player-hud-items">
                                {model.items.map(item => (
                                    <li key={item.id}>
                                        <span>{item.name}</span>
                                        {item.badge && <span className="lotm-player-hud-qty">{item.badge}</span>}
                                        {item.qty > 1 && <span className="lotm-player-hud-qty">×{item.qty}</span>}
                                        {item.equipped && <span className="lotm-player-hud-equipped">equipped</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="lotm-player-hud-empty">No items recorded yet.</p>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}
