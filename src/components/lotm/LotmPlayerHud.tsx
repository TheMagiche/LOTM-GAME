import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Sparkles, X, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { buildLotmPlayerHudModel } from './lotmPlayerHudModel';
import { formatLotmBountyLine } from '../../worldpacks/lotmPurse';
import { findLotmAbilityByName, warmupLotmAbilityCompendium } from '../../worldpacks/lotmAbilityCompendium';

const SEQUENCE_LADDER = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

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
    const lastLootReceipt = useAppStore(s => s.lastLootReceipt);
    const setLastLootReceipt = useAppStore(s => s.setLastLootReceipt);
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [selectedAbilityName, setSelectedAbilityName] = useState<string | null>(null);

    useEffect(() => {
        warmupLotmAbilityCompendium();
    }, []);

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

    const openCharacterRecord = () => {
        useAppStore.getState().openPlayerGrimoire('character');
    };

    const openPathwayDetails = () => {
        useAppStore.getState().openPlayerGrimoire('pathway');
    };

    const toggleAbility = (abilityName: string) => {
        setSelectedAbilityName(current => (current === abilityName ? null : abilityName));
    };

    const activeAbilityDetail = selectedAbilityName
        ? findLotmAbilityByName(selectedAbilityName, model.pathwayId, model.sequenceNumber)
        : null;

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

    const toggleInventory = () => setInventoryOpen(open => !open);

    const onHudClick = (event: MouseEvent<HTMLElement>) => {
        if (!isHudChromeTarget(event.target)) return;
        toggleInventory();
    };

    const onHudKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleInventory();
    };

    return (
        <aside
            className={`lotm-player-hud${inventoryOpen ? ' is-expanded' : ''}`}
            aria-label="Player status"
            aria-expanded={inventoryOpen}
            aria-controls="lotm-player-hud-inventory"
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

            {model.sequenceBandLine && (
                <p className={`lotm-player-hud-band is-${model.sequenceBand?.band.toLowerCase()}`} aria-label="Sequence band">
                    {model.sequenceBandLine}
                </p>
            )}

            {/* Quick Ability Deck */}
            {model.abilities.length > 0 && (
                <div className="lotm-player-hud-ability-preview" aria-label="Sequence abilities" title={model.abilities.join(' · ')}>
                    {model.abilities.map((name, i) => (
                        <span key={name}>
                            {i > 0 && ' · '}
                            <button
                                type="button"
                                onClick={() => toggleAbility(name)}
                                className={`lotm-player-hud-ability-btn hover:underline transition-colors ${
                                    selectedAbilityName === name ? 'text-terminal font-semibold' : ''
                                }`}
                                title="Click to view ability costs & description"
                            >
                                {name}
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Expanded Ability Details Card */}
            {selectedAbilityName && (
                <div className="mx-1 my-1.5 p-3 rounded-lg bg-[#0e0c11] border border-[#c9a227]/20 text-xs text-[#f3ead8] shadow-[inset_3px_3px_8px_#060507,inset_-2px_-2px_6px_#191620] relative animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#c9a227]/20 pb-1.5 mb-2">
                        <div className="flex items-center gap-2 font-bold text-[#e0c36a]">
                            <Sparkles size={13} className="text-amber-400" />
                            <span>{activeAbilityDetail?.name || selectedAbilityName}</span>
                            {activeAbilityDetail?.costs?.[0] && (
                                <span className="font-mono text-[10px] font-normal px-2 py-0.5 rounded-md bg-[#141118] text-[#e0c36a] border border-[#c9a227]/30 shadow-[1px_1px_3px_#050407]">
                                    {activeAbilityDetail.costs[0]}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedAbilityName(null)}
                            className="text-[#a09075] hover:text-[#f3ead8] p-1 rounded-md hover:bg-white/5 transition-colors"
                            aria-label="Close ability detail"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <p className="text-xs leading-relaxed text-[#d0c6b4]">
                        {activeAbilityDetail?.description || 'Channel this sequence ability during spiritual actions.'}
                    </p>
                    {activeAbilityDetail?.limitations?.[0] && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-300 bg-amber-950/40 px-2.5 py-1.5 rounded-md border border-amber-600/30">
                            <AlertTriangle size={12} className="shrink-0 text-amber-400" />
                            <span>Limit: {activeAbilityDetail.limitations[0]}</span>
                        </div>
                    )}
                </div>
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
