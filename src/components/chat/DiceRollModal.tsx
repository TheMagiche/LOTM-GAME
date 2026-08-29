import { useEffect, useRef, useState } from 'react';
import { X, Dices, Sparkles, AlertTriangle, Eye, Flame, Compass, Crosshair, Sparkle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { buildDefaultDiceSystem } from '../../types';
import type { RollDefinition, RollModifier, RollAggregation, ManualRollRequest } from '../../types';
import { LOTM_EXCLUSIVE_UI } from '../../services/lotm/lotmFlags';
import { isLotmCampaign } from '../../services/lotm/lotmSkin';
import {
    formatSequenceAdvantageLine,
    resolveSequenceAdvantage,
    readSpirituality,
    readLossOfControl,
    LOC_STAGE_LABELS,
} from '../../worldpacks/lotmBeyonderState';

type LotmActionDomain = 'beyonder_ability' | 'divination' | 'spirit_vision' | 'ritual_magic' | 'physical';

const LOTM_ACTION_DOMAINS: Array<{
    id: LotmActionDomain;
    label: string;
    icon: typeof Sparkles;
    hint: string;
}> = [
    {
        id: 'beyonder_ability',
        label: 'Beyonder Power',
        icon: Sparkles,
        hint: 'Channel innate Sequence authority',
    },
    {
        id: 'divination',
        label: 'Divination',
        icon: Compass,
        hint: 'Dowsing rod, dream revelation, astromancy',
    },
    {
        id: 'spirit_vision',
        label: 'Spirit Vision',
        icon: Eye,
        hint: 'Perceive etheric auras & spiritual bodies',
    },
    {
        id: 'ritual_magic',
        label: 'Ritual Magic',
        icon: Flame,
        hint: 'Chalk circles, deity prayers & sacrificial vows',
    },
    {
        id: 'physical',
        label: 'Physical / Mundane',
        icon: Crosshair,
        hint: 'Victorian revolver shot, sprint, street brawl',
    },
];

/**
 * Spiritual Action & Divination Modal (LOTM) / Dice Me Modal (Generic).
 *
 * Configures and arms a manual action or roll before sending.
 * In Lord of the Mysteries mode, surfaces in-world Sequence Advantage,
 * Spirituality costs (-1 SPI), and Loss of Control risk alerts.
 */
export function DiceRollModal() {
    const open = useAppStore(s => s.diceRollModalOpen);
    const onClose = useAppStore(s => s.closeDiceRollModal);
    const setArmedRoll = useAppStore(s => s.setArmedRoll);
    const context = useAppStore(s => s.context);
    const playerCharacter = useAppStore(s => s.playerCharacter);
    const characterProfileData = useAppStore(s => s.characterProfileData ?? s.context.characterProfileData);
    const npcLedger = useAppStore(s => s.npcLedger);
    const onStageNpcIds = useAppStore(s => s.onStageNpcIds);
    const lotm = LOTM_EXCLUSIVE_UI || isLotmCampaign(useAppStore(s => s.activeCampaignMeta));

    const diceSystem = context.diceSystem ?? buildDefaultDiceSystem();
    const defaultRollDef: RollDefinition = { modifier: 'none', count: 1, aggregation: 'pick_one' };

    const [dieTypeId, setDieTypeId] = useState(diceSystem.dieTypes[0]?.id ?? '');
    const [rollDef, setRollDef] = useState<RollDefinition>(defaultRollDef);
    const [selectedDomain, setSelectedDomain] = useState<LotmActionDomain>('beyonder_ability');
    const [showAdvancedGates, setShowAdvancedGates] = useState(false);
    const openedAtRef = useRef(0);

    const onStage = new Set(onStageNpcIds ?? []);
    const opponents = onStage.size === 0
        ? []
        : npcLedger.filter(npc => onStage.has(npc.id));

    const sequenceBand = lotm
        ? resolveSequenceAdvantage(playerCharacter, characterProfileData, opponents)
        : null;
    const sequenceBandLine = formatSequenceAdvantageLine(sequenceBand);

    const spi = lotm ? readSpirituality(characterProfileData, playerCharacter) : null;
    const loc = lotm ? readLossOfControl(playerCharacter) : 0;

    useEffect(() => {
        if (open) {
            setDieTypeId(diceSystem.dieTypes[0]?.id ?? '');
            // When in LOTM, default modifier to engine-computed Sequence band if present
            const defaultModifier: RollModifier = sequenceBand?.band === 'Advantage'
                ? 'adv'
                : sequenceBand?.band === 'Disadvantage'
                ? 'disadv'
                : 'none';
            setRollDef({ modifier: defaultModifier, count: 1, aggregation: 'pick_one' });
            setSelectedDomain('beyonder_ability');
            setShowAdvancedGates(false);
            openedAtRef.current = Date.now();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const handleBackdropClick = () => {
        if (Date.now() - openedAtRef.current < 350) return;
        onClose();
    };

    const handleDomainSelect = (domain: LotmActionDomain) => {
        setSelectedDomain(domain);
        if (domain === 'beyonder_ability') {
            const mod: RollModifier = sequenceBand?.band === 'Advantage'
                ? 'adv'
                : sequenceBand?.band === 'Disadvantage'
                ? 'disadv'
                : 'none';
            setRollDef(prev => ({ ...prev, modifier: mod }));
        } else if (domain === 'physical') {
            setRollDef(prev => ({ ...prev, modifier: 'none' }));
        }
    };

    const confirm = () => {
        const req: ManualRollRequest = { dieTypeId, rollDef };
        setArmedRoll(req);
        onClose();
    };

    const selectedDie = diceSystem.dieTypes.find(d => d.id === dieTypeId);
    const isTotalAll = rollDef.aggregation === 'total_all';

    const preview = (() => {
        if (!selectedDie) return '—';
        const modLabel = !isTotalAll && rollDef.modifier === 'adv'
            ? ' (Advantage: highest)'
            : !isTotalAll && rollDef.modifier === 'disadv'
            ? ' (Disadvantage: lowest)'
            : isTotalAll ? ' (Sum all)' : '';
        return `${rollDef.count}${selectedDie.name}${modLabel}`;
    })();

    const bandBadgeStyle = (() => {
        if (!sequenceBand) return 'border-border text-text-dim bg-surface';
        if (sequenceBand.band === 'Advantage') return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
        if (sequenceBand.band === 'Disadvantage') return 'border-red-500/40 text-red-400 bg-red-500/10';
        return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    })();

    return (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleBackdropClick}>
            <div className="bg-surface border border-border rounded-lg w-full max-w-md mx-4 flex flex-col shadow-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-void/50">
                    <h2 className="text-terminal text-sm font-bold tracking-[0.18em] uppercase flex items-center gap-2">
                        {lotm ? <Sparkles size={16} className="text-amber-400" /> : <Dices size={16} />}
                        {lotm ? 'Spiritual Action & Divination' : 'Dice Me'}
                    </h2>
                    <button onClick={onClose} className="text-text-dim hover:text-text-primary p-1 rounded hover:bg-void transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* LOTM Sequence Advantage Banner */}
                    {lotm && sequenceBand && (
                        <div className={`p-2.5 rounded border text-xs leading-relaxed flex items-start gap-2.5 ${bandBadgeStyle}`}>
                            <Sparkle size={15} className="shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold tracking-wide uppercase text-[11px]">
                                    Sequence Band: {sequenceBand.band}
                                </div>
                                <div className="text-[11px] opacity-90 mt-0.5">
                                    {sequenceBand.reason}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LOTM Action Domains */}
                    {lotm && (
                        <div>
                            <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1.5 font-semibold">
                                Action Domain & Intent
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                {LOTM_ACTION_DOMAINS.map(domain => {
                                    const Icon = domain.icon;
                                    const active = selectedDomain === domain.id;
                                    return (
                                        <button
                                            key={domain.id}
                                            type="button"
                                            onClick={() => handleDomainSelect(domain.id)}
                                            className={`flex flex-col items-start p-2 rounded text-left border transition-all ${
                                                active
                                                    ? 'bg-terminal/15 border-terminal text-terminal shadow-sm'
                                                    : 'bg-void/60 border-border/70 text-text-dim hover:text-text-primary hover:border-border'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                <Icon size={12} className={active ? 'text-terminal' : 'text-text-dim'} />
                                                <span>{domain.label}</span>
                                            </div>
                                            <span className="text-[9px] opacity-70 mt-1 line-clamp-1">
                                                {domain.hint}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Spirituality & Loss of Control Status */}
                    {lotm && (
                        <div className="bg-void/80 border border-border/80 rounded p-3 space-y-2 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-text-dim font-medium">Spirituality Consumption</span>
                                {spi ? (
                                    <span className="font-mono text-terminal font-semibold">
                                        {spi.current} / {spi.max} SPI &rarr; {Math.max(0, spi.current - 1)} (-1 SPI)
                                    </span>
                                ) : (
                                    <span className="text-text-dim/60">Unspent</span>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] border-t border-border/40 pt-1.5">
                                <span className="text-text-dim font-medium">Loss of Control</span>
                                <span className={`font-medium ${loc > 0 ? (loc >= 2 ? 'text-red-400 font-bold' : 'text-amber-400') : 'text-text-dim'}`}>
                                    Stage {loc}: {LOC_STAGE_LABELS[loc as keyof typeof LOC_STAGE_LABELS]}
                                </span>
                            </div>

                            {/* Warnings */}
                            {spi && spi.current <= 0 && (
                                <div className="flex items-center gap-2 p-2 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-[10px]">
                                    <AlertTriangle size={14} className="shrink-0 text-red-400" />
                                    <span>
                                        Critical Fatigue: Acting at 0 SPI will advance Loss of Control to Stage {Math.min(3, loc + 1)}!
                                    </span>
                                </div>
                            )}

                            {loc >= 2 && (
                                <div className="flex items-center gap-2 p-2 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-[10px]">
                                    <AlertTriangle size={14} className="shrink-0 text-red-400" />
                                    <span>
                                        Unstable Spirit: Severe slippage ({LOC_STAGE_LABELS[loc as keyof typeof LOC_STAGE_LABELS]}) forces Disadvantage on all outcomes.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Modifier Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-text-dim uppercase tracking-wider font-semibold">Outcome Modifier</span>
                            {lotm && sequenceBand && (
                                <span className="text-[9px] text-text-dim/70">
                                    Engine suggests: {sequenceBand.band}
                                </span>
                            )}
                        </div>
                        <select
                            value={rollDef.modifier}
                            onChange={e => setRollDef({ ...rollDef, modifier: e.target.value as RollModifier })}
                            disabled={isTotalAll}
                            className="w-full bg-void border border-border focus:border-terminal text-[13px] text-text-primary rounded px-2.5 py-1.5 outline-none disabled:opacity-40"
                        >
                            <option value="none">Normal (Standard Fate)</option>
                            <option value="adv">Advantage (Favorable Omen / Superiority)</option>
                            <option value="disadv">Disadvantage (Impaired / Outmatched)</option>
                        </select>
                    </div>

                    {/* Advanced Gates Toggle */}
                    <div className="border-t border-border/40 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowAdvancedGates(!showAdvancedGates)}
                            className="text-[10px] text-text-dim hover:text-terminal transition-colors flex items-center justify-between w-full py-1"
                        >
                            <span className="uppercase tracking-wider font-medium">
                                {showAdvancedGates ? '− Hide Mechanics Details' : '+ Advanced Mechanics (Dice & Gates)'}
                            </span>
                            <span className="font-mono text-terminal">{preview}</span>
                        </button>

                        {showAdvancedGates && (
                            <div className="space-y-3 mt-3 pt-3 border-t border-border/30 bg-void/30 p-2.5 rounded">
                                {/* Die type */}
                                <div>
                                    <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1">Die Oracle</div>
                                    <select
                                        value={dieTypeId}
                                        onChange={e => setDieTypeId(e.target.value)}
                                        className="w-full bg-void border border-border focus:border-terminal text-[12px] text-text-primary rounded px-2 py-1.5 outline-none"
                                    >
                                        {diceSystem.dieTypes.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} (1–{d.faces})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {/* Gate 2: Count */}
                                    <div>
                                        <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1">Dice Count</div>
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={rollDef.count}
                                            onChange={e => setRollDef({ ...rollDef, count: Math.max(1, parseInt(e.target.value) || 1) })}
                                            className="w-full bg-void border border-border focus:border-terminal text-[12px] text-text-primary rounded px-2 py-1.5 outline-none text-center"
                                        />
                                    </div>

                                    {/* Gate 3: Aggregation */}
                                    <div>
                                        <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1">Aggregation</div>
                                        <select
                                            value={rollDef.aggregation}
                                            onChange={e => {
                                                const agg = e.target.value as RollAggregation;
                                                const modifier = agg === 'total_all' ? 'none' : rollDef.modifier;
                                                setRollDef({ ...rollDef, aggregation: agg, modifier });
                                            }}
                                            className="w-full bg-void border border-border focus:border-terminal text-[12px] text-text-primary rounded px-2 py-1.5 outline-none"
                                        >
                                            <option value="pick_one">Pick One</option>
                                            <option value="total_all">Sum Total</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview box */}
                    <div className="text-[11px] text-terminal font-mono bg-terminal/10 border border-terminal/20 rounded px-2.5 py-2 text-center">
                        <span className="text-text-dim mr-2">Configured:</span>
                        <span className="font-semibold">{preview}</span>
                    </div>

                    <p className="text-[10px] text-text-dim/70 leading-relaxed">
                        {lotm
                            ? 'Arming this action will resolve deterministic dice and deduct 1 Spirituality on your next send. The GM will narrate the mystical outcome as fact.'
                            : 'Confirm to arm the roll. On your next send, the engine rolls real dice and the GM narrates the outcome as fact.'}
                    </p>
                </div>

                {/* Footer buttons */}
                <div className="px-4 py-3 border-t border-border flex justify-end gap-2 bg-void/50">
                    <button onClick={onClose} className="px-3 py-1.5 text-xs text-text-dim hover:text-text-primary rounded transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={confirm}
                        disabled={!selectedDie}
                        className="px-4 py-1.5 text-xs font-semibold bg-terminal/20 text-terminal border border-terminal/30 rounded hover:bg-terminal/30 transition-colors disabled:opacity-30"
                    >
                        {lotm ? 'Arm Spiritual Action' : 'Arm Roll'}
                    </button>
                </div>
            </div>
        </div>
    );
}
