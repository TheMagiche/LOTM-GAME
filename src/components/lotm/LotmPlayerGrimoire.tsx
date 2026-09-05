import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BookOpen,
    Compass,
    Eye,
    Flame,
    HelpCircle,
    MapPin,
    Package,
    ScrollText,
    Search,
    Shield,
    Sparkles,
    User,
    X,
} from 'lucide-react';
import { LotmHowToPlayGuide } from './LotmHowToPlayGuide';
import { useAppStore } from '../../store/useAppStore';
import type { PlayerGrimoireSection } from '../../store/slices/uiSlice';
import type {
    CharacterProfile,
    DivergenceCategory,
    HexAxis,
    InventoryItem,
    InventoryItemCategory,
    ItemLedgerGrade,
    LocationEntry,
    NPCEntry,
    PlayerCharacter,
} from '../../types';
import { ITEM_GRADE_LABELS } from '../../types';
import {
    abilitiesForLotmSequence,
    formatLotmSequenceName,
    getLotmPathway,
    getLotmSequence,
    nextLotmSequence,
    type LotmPathwayDef,
    type LotmSequenceInfo,
} from '../../worldpacks/lotmPathways';
import { findLotmAbilityByName, warmupLotmAbilityCompendium } from '../../worldpacks/lotmAbilityCompendium';
import { commitLotmPotionDrink } from './lotmPotionDrink';
import { buildLotmPlayerHudModel } from './lotmPlayerHudModel';
import { LOC_STAGE_LABELS, readDigestion, readLossOfControl } from '../../worldpacks/lotmBeyonderState';
import { formatLotmPurseLine } from '../../worldpacks/lotmPurse';
import { inventoryBadgeFor, inventoryItemMatchesTab } from '../../worldpacks/lotmItemKinds';
import { hexBand, relationBand } from '../../services/npc/agency/agencyBands';
import { TRAIT_VOCAB } from '../../services/npc/agency/agencyPools';
import { selectPcBonds } from '../character/pcBonds';
import { CATEGORY_LABELS, EMPTY_REGISTER, getEntriesForNpc } from '../../services/campaign-state/divergenceRegister';
import { LotmWorldMapView } from '../location-ledger/LotmWorldMapView';
import { INITIAL_LOCATIONS } from '../../worldpacks/lotmMapData';
import { toast } from '../Toast';
import { uid } from '../../utils/uid';
import { campaignCoverSrc, lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { matchLotmPortraitEntry } from '../../services/lotm/lotmVisualMatcher';

const PLAYER_SECTIONS: Array<{ id: PlayerGrimoireSection; label: string; icon: React.ReactNode }> = [
    { id: 'character', label: 'Character Record', icon: <User size={14} /> },
    { id: 'pathway', label: 'Potion & Pathway', icon: <Flame size={14} /> },
    { id: 'location', label: 'Location & Travel', icon: <Compass size={14} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={14} /> },
    { id: 'chronicle', label: 'Chronicle & Standing', icon: <ScrollText size={14} /> },
];

const SEQUENCE_NUMBERS = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;
const HEX_AXES: HexAxis[] = ['drive', 'diligence', 'boldness', 'warmth', 'empathy', 'composure'];

const INVENTORY_TABS: Array<{ id: InventoryItemCategory | 'all' | 'equipped'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'equipped', label: 'Equipped' },
    { id: 'beyonder-weapon', label: 'Weapons' },
    { id: 'medicine', label: 'Medicines' },
    { id: 'mystical-item', label: 'Mystical Items' },
    { id: 'sealed-artefact', label: 'Sealed Artefacts' },
    { id: 'currency', label: 'Currency' },
    { id: 'misc', label: 'Misc' },
];

const CATEGORY_COLORS: Record<DivergenceCategory, string> = {
    locations: 'text-blue-400',
    npc_events: 'text-amber-300',
    promises_debts: 'text-amber-400',
    world_state: 'text-cyan-400',
    party_facts: 'text-emerald-400',
    rules_lore: 'text-purple-400',
    misc: 'text-neutral-400',
};

export function LotmPlayerGrimoire() {
    const open = useAppStore(s => s.playerGrimoireOpen);
    const closePlayerGrimoire = useAppStore(s => s.closePlayerGrimoire);
    const section = useAppStore(s => s.playerGrimoireSection);
    const setSection = useAppStore(s => s.setPlayerGrimoireSection);

    const playerCharacter = useAppStore(s => s.playerCharacter);
    const characterProfileData = useAppStore(s => s.characterProfileData ?? s.context.characterProfileData);
    const inventoryItems = useAppStore(s => s.inventoryItems ?? s.context.inventoryItems ?? []);
    const locationLedger = useAppStore(s => s.locationLedger);
    const npcLedger = useAppStore(s => s.npcLedger);
    const onStageNpcIds = useAppStore(s => s.onStageNpcIds);
    const currentPlaceId = useAppStore(s => s.context.currentPlaceId);
    const currentFeature = useAppStore(s => s.context.currentFeature);
    const divergenceRegister = useAppStore(s => s.divergenceRegister);
    const context = useAppStore(s => s.context);

    const restoreFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        warmupLotmAbilityCompendium();
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        restoreFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
            restoreFocusRef.current?.focus();
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closePlayerGrimoire();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, closePlayerGrimoire]);

    const currentPlace = currentPlaceId
        ? locationLedger.find(place => place.id === currentPlaceId)
        : undefined;

    const onStage = new Set(onStageNpcIds ?? []);
    const opponents = onStage.size === 0
        ? []
        : npcLedger.filter(npc => onStage.has(npc.id));

    const hudModel = useMemo(() => buildLotmPlayerHudModel(playerCharacter, characterProfileData, {
        inventory: inventoryItems,
        locationName: currentPlace?.name || null,
        locationFeature: currentFeature || null,
        opponents,
    }), [playerCharacter, characterProfileData, inventoryItems, currentPlace?.name, currentFeature, opponents]);

    if (!open) return null;

    const characterName = playerCharacter?.name || characterProfileData?.name || 'Player';

    return createPortal(
        <div
            className="lotm-grimoire"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lotm-player-grimoire-title"
            onClick={closePlayerGrimoire}
        >
            <div className="lotm-grimoire-frame" onClick={event => event.stopPropagation()}>
                <header className="lotm-grimoire-header">
                    <div className="lotm-grimoire-brand">
                        <BookOpen size={16} aria-hidden />
                        <div className="lotm-grimoire-titles">
                            <p className="lotm-grimoire-kicker">Lord of the Mysteries · Player Grimoire</p>
                            <h2 id="lotm-player-grimoire-title">
                                {characterName} {hudModel.sequenceLabel ? `(${hudModel.sequenceLabel})` : ''}
                            </h2>
                        </div>
                    </div>
                    <div className="lotm-grimoire-header-actions">
                        <button
                            type="button"
                            className="lotm-grimoire-close"
                            title="Close Player Grimoire (Esc)"
                            aria-label="Close Player Grimoire"
                            onClick={closePlayerGrimoire}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </header>

                <div className="lotm-grimoire-body">
                    <nav className="lotm-grimoire-rail" aria-label="Player Grimoire sections">
                        <div className="lotm-grimoire-rail-top">
                            {PLAYER_SECTIONS.map(entry => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className={section === entry.id ? 'is-active' : undefined}
                                    aria-pressed={section === entry.id}
                                    onClick={() => setSection(entry.id)}
                                >
                                    <span className="flex items-center gap-2">
                                        {entry.icon}
                                        <span>{entry.label}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="lotm-grimoire-rail-bottom">
                            <button
                                type="button"
                                className={`lotm-grimoire-rail-guide-btn${section === 'guide' ? ' is-active' : ''}`}
                                aria-pressed={section === 'guide'}
                                onClick={() => setSection('guide')}
                            >
                                <span className="flex items-center gap-2">
                                    <HelpCircle size={14} />
                                    <span>How to Play</span>
                                </span>
                            </button>
                        </div>
                    </nav>

                    <div className="lotm-grimoire-main">
                        {section === 'character' && (
                            <CharacterGMPane
                                pc={playerCharacter}
                                profile={characterProfileData}
                                hudModel={hudModel}
                            />
                        )}
                        {section === 'pathway' && (
                            <PotionPathwayPane
                                pc={playerCharacter}
                                profile={characterProfileData}
                                hudModel={hudModel}
                            />
                        )}
                        {section === 'location' && (
                            <LocationTravelPane
                                currentPlace={currentPlace}
                                currentFeature={currentFeature}
                                worldDay={context.worldDay}
                            />
                        )}
                        {section === 'inventory' && (
                            <InventoryPane
                                inventory={inventoryItems}
                            />
                        )}
                        {section === 'chronicle' && (
                            <ChronicleStandingPane
                                pc={playerCharacter}
                                profile={context.characterProfile}
                                npcLedger={npcLedger}
                                divergenceRegister={divergenceRegister}
                            />
                        )}
                        {section === 'guide' && <LotmHowToPlayGuide />}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ── 1. Potion & Pathway Section ──────────────────────────────────────────

function PotionPathwayPane({
    pc,
    profile,
    hudModel,
}: {
    pc: PlayerCharacter | null | undefined;
    profile: CharacterProfile | null | undefined;
    hudModel: ReturnType<typeof buildLotmPlayerHudModel>;
}) {
    const pathway = getLotmPathway(pc?.signatureKit?.pathway)
        ?? (hudModel.pathwayId ? getLotmPathway(hudModel.pathwayId) : undefined);
    const currentSeqNum = hudModel.sequenceNumber;
    const [inspectedSeq, setInspectedSeq] = useState<number | undefined>(currentSeqNum);

    // Keep inspected seq in sync when current changes
    useEffect(() => {
        if (currentSeqNum !== undefined && inspectedSeq === undefined) {
            setInspectedSeq(currentSeqNum);
        }
    }, [currentSeqNum, inspectedSeq]);

    const activeSeqNum = inspectedSeq ?? currentSeqNum ?? 9;
    const seqInfo = getLotmSequence(pathway, activeSeqNum);
    const nextSeqNum = nextLotmSequence(currentSeqNum);
    const nextSeqInfo = getLotmSequence(pathway, nextSeqNum);

    const digestion = hudModel.digestion;
    const locStage = hudModel.locStage;
    const canDrink = hudModel.canDrink;

    const abilities = abilitiesForLotmSequence(pathway?.id, activeSeqNum);

    return (
        <div className="space-y-6">
            {/* Header / Pathway Banner */}
            <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {pathway?.emblemSrc ? (
                        <img
                            src={pathway.emblemSrc}
                            alt={pathway.name}
                            className="w-16 h-16 object-contain rounded-full border border-[#c9a227]/50 bg-black/60 p-1 shadow-md shadow-black/50"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full border border-[#c9a227]/30 bg-black/60 flex items-center justify-center text-[#c9a227]">
                            <Flame size={24} />
                        </div>
                    )}
                    <div>
                        <p className="font-['Cinzel'] text-[10px] tracking-[0.24em] uppercase text-[#c9a227]">
                            Beyonder Pathway
                        </p>
                        <h3 className="font-['EB_Garamond'] text-2xl font-bold text-[#f3ead8]">
                            {pathway?.name || hudModel.pathwayName || 'Mortal'}
                        </h3>
                        <p className="text-xs text-[#e0c36a] mt-0.5">
                            {hudModel.sequenceLabel || 'Uninitiated'} {pathway?.tarotCard ? `· ${pathway.tarotCard}` : ''}
                        </p>
                    </div>
                </div>

                {/* Digestion & Loss of Control Status */}
                <div className="flex flex-col gap-2 min-w-55">
                    <div>
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-['Cinzel'] text-[#c9a227] tracking-wider uppercase text-[9px]">Digestion</span>
                            <span className="font-mono text-[#f3ead8]">{digestion}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#09080c] border border-[#c9a227]/15 rounded-full shadow-[inset_2px_2px_5px_#040305,inset_-2px_-2px_5px_#141118] overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${digestion >= 100 ? 'bg-emerald-400' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, digestion))}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-['Cinzel'] text-[#c9a227] tracking-wider uppercase text-[9px]">Loss of Control</span>
                            <span className={`text-[11px] ${locStage > 0 ? 'text-red-400 font-semibold' : 'text-emerald-300'}`}>
                                {LOC_STAGE_LABELS[locStage]}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#09080c] border border-[#c9a227]/15 rounded-full shadow-[inset_2px_2px_5px_#040305,inset_-2px_-2px_5px_#141118] overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${locStage >= 3 ? 'bg-red-600' : locStage >= 1 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (locStage / 4) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {hudModel.sequenceBandLine && (
                <div className="p-3.5 bg-[#0e0c11] border border-[#c9a227]/16 rounded-xl shadow-[inset_3px_3px_8px_#060507,inset_-3px_-3px_8px_#191620] text-xs text-[#e8e0d0] flex items-center gap-2">
                    <Sparkles size={14} className="text-[#c9a227] shrink-0" />
                    <span>{hudModel.sequenceBandLine}</span>
                </div>
            )}

            {/* Sequence Ladder */}
            <div className="space-y-2">
                <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227]">
                    Sequence Ladder (Click to Inspect)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
                    {SEQUENCE_NUMBERS.map(num => {
                        const isCurrent = currentSeqNum === num;
                        const isDigested = currentSeqNum !== undefined && num > currentSeqNum;
                        const isInspected = inspectedSeq === num;
                        const info = getLotmSequence(pathway, num);
                        return (
                            <button
                                key={num}
                                type="button"
                                onClick={() => setInspectedSeq(num)}
                                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                                    isCurrent
                                        ? 'border-[#e0c36a] bg-[#221a28] shadow-[inset_2px_2px_6px_#050407,inset_-2px_-2px_6px_#1b1722,0_0_12px_rgba(201,162,39,0.3)] ring-1 ring-[#e0c36a]'
                                        : isInspected
                                            ? 'border-[#c9a227]/80 bg-[#1c1624] shadow-[3px_3px_8px_#050407,-2px_-2px_6px_#1b1722]'
                                            : isDigested
                                                ? 'border-[#4a3f2b] bg-[#120f16] opacity-75 shadow-[2px_2px_5px_#050407,-1px_-1px_4px_#18141f]'
                                                : 'border-[#2d2537] bg-[#0e0b13] shadow-[2px_2px_6px_#050407,-2px_-2px_5px_#18141f] hover:border-[#c9a227]/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-['Cinzel'] text-[10px] font-bold text-[#c9a227]">
                                        Seq {num}
                                    </span>
                                    {isCurrent && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    )}
                                </div>
                                <span className="text-[11px] text-[#f3ead8] font-['EB_Garamond'] truncate mt-1">
                                    {info?.name || '—'}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider text-[#a09075] mt-0.5">
                                    {isCurrent ? 'Current' : isDigested ? 'Digested' : 'Upcoming'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Inspect Section: Details for Sequence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Acting & Core Abilities */}
                <div className="space-y-4">
                    <div className="bg-[#0e0c11] border border-[#c9a227]/14 p-5 rounded-xl shadow-[inset_3px_3px_8px_#060507,inset_-3px_-3px_8px_#191620] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#c9a227]/20 pb-2">
                            <h4 className="font-['EB_Garamond'] text-lg font-bold text-[#f3ead8]">
                                {formatLotmSequenceName(pathway?.id, activeSeqNum)}
                            </h4>
                            <span className="font-['Cinzel'] text-[9px] uppercase tracking-wider px-2 py-0.5 border border-[#c9a227]/30 text-[#e0c36a] rounded">
                                {activeSeqNum === currentSeqNum ? 'Active Sequence' : `Sequence ${activeSeqNum}`}
                            </span>
                        </div>

                        {seqInfo?.actingMethod ? (
                            <div>
                                <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-[#c9a227] mb-1">
                                    Acting Method & Principles
                                </p>
                                <p className="text-sm italic text-[#e8e0d0] bg-[#141118] p-3.5 rounded-lg border border-[#c9a227]/20 shadow-[2px_2px_6px_#050407,-2px_-2px_5px_#1b1722]">
                                    "{seqInfo.actingMethod}"
                                </p>
                            </div>
                        ) : null}

                        {seqInfo?.potionOverview && (
                            <div>
                                <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-[#c9a227] mb-1">
                                    Potion Overview
                                </p>
                                <p className="text-xs text-[#d8cfbe] leading-relaxed">
                                    {seqInfo.potionOverview}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#0e0c11] border border-[#c9a227]/14 p-5 rounded-xl shadow-[inset_3px_3px_8px_#060507,inset_-3px_-3px_8px_#191620] space-y-3">
                        <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                            <Sparkles size={13} />
                            <span>Sequence Abilities & Powers</span>
                        </p>

                        {abilities.length === 0 ? (
                            <p className="text-xs italic text-[#a09075]">No explicit abilities recorded for this sequence.</p>
                        ) : (
                            <div className="space-y-2.5">
                                {abilities.map((abilityName, idx) => {
                                    const comp = findLotmAbilityByName(abilityName);
                                    return (
                                        <div key={idx} className="p-3.5 bg-[#141118] border border-[#c9a227]/14 rounded-lg shadow-[3px_3px_8px_#050407,-2px_-2px_6px_#1b1722] space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h5 className="font-['EB_Garamond'] text-base font-semibold text-[#f3ead8]">
                                                    {abilityName}
                                                </h5>
                                                {comp?.pathway && (
                                                    <span className="text-[9px] font-['Cinzel'] tracking-wider uppercase text-[#c9a227]/80">
                                                        {comp.pathway}
                                                    </span>
                                                )}
                                            </div>
                                            {comp?.description && (
                                                <p className="text-xs text-[#d0c6b4] leading-relaxed">
                                                    {comp.description}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Advancement Potion Formula & Drink Action */}
                <div className="space-y-4">
                    <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#c9a227]/25 pb-3">
                            <div>
                                <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-[#c9a227]">
                                    Advancement Potion
                                </p>
                                <h4 className="font-['EB_Garamond'] text-xl font-bold text-[#f3ead8]">
                                    {nextSeqInfo
                                        ? formatLotmSequenceName(pathway?.id, nextSeqNum)
                                        : 'Apotheosis Reached (Seq 0)'}
                                </h4>
                            </div>

                            {nextSeqInfo?.potionSrc && (
                                <img
                                    src={nextSeqInfo.potionSrc}
                                    alt="Advancement Potion"
                                    className="w-14 h-14 object-contain rounded-lg border border-[#c9a227]/40 bg-black/50 p-1 shadow-md"
                                />
                            )}
                        </div>

                        {nextSeqInfo?.formula ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-amber-400 mb-1">
                                        Main Ingredients
                                    </p>
                                    <ul className="list-disc list-inside text-xs text-[#e8e0d0] space-y-1 bg-[#0e0c11] p-3 rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620]">
                                        {nextSeqInfo.formula.main.map((ing, idx) => (
                                            <li key={idx}>{ing}</li>
                                        ))}
                                    </ul>
                                </div>

                                {nextSeqInfo.formula.supplementary?.length > 0 && (
                                    <div>
                                        <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-[#c9a227]/80 mb-1">
                                            Supplementary Ingredients
                                        </p>
                                        <ul className="list-disc list-inside text-xs text-[#d0c6b4] space-y-1 bg-[#0e0c11] p-3 rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620]">
                                            {nextSeqInfo.formula.supplementary.map((ing, idx) => (
                                                <li key={idx}>{ing}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {nextSeqInfo.formula.alternative && (
                                    <div>
                                        <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-purple-400 mb-1">
                                            Alternative / Ritual Prerequisite
                                        </p>
                                        <p className="text-xs text-[#d8cfbe] bg-[#0e0c11] p-3 rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620]">
                                            {nextSeqInfo.formula.alternative}
                                        </p>
                                    </div>
                                )}

                                {nextSeqInfo.consumptionBacklash && (
                                    <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-200">
                                        <p className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-red-400 mb-0.5">
                                            Consumption Risk / Backlash
                                        </p>
                                        <p>{nextSeqInfo.consumptionBacklash}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs italic text-[#a09075]">
                                {nextSeqNum !== undefined
                                    ? 'No secret formula recorded for this Sequence level yet.'
                                    : 'You have reached the pinnacle of the Sequence chain.'}
                            </p>
                        )}

                        {/* Drink Potion Button */}
                        <div className="pt-2 border-t border-[#c9a227]/20 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={!canDrink}
                                onClick={() => commitLotmPotionDrink()}
                                className={`w-full py-3 px-4 rounded-lg font-['Cinzel'] text-xs font-bold uppercase tracking-widest transition-all ${
                                    canDrink
                                        ? 'bg-linear-to-r from-[#e0c36a] to-[#c9a227] text-black shadow-[0_4px_16px_rgba(201,162,39,0.35),3px_3px_8px_#050407] hover:brightness-110 cursor-pointer active:scale-[0.99]'
                                        : 'bg-[#141118] text-[#7a6f5e] border border-neutral-800 shadow-[inset_2px_2px_5px_#050407] cursor-not-allowed'
                                }`}
                            >
                                <span>Drink Next Sequence Potion</span>
                            </button>
                            {!canDrink && nextSeqInfo && (
                                <p className="text-[10px] text-center text-[#9f917c]">
                                    {digestion < 100
                                        ? `Potion digestion is incomplete (${digestion}% / 100%). Act according to the principles to digest.`
                                        : 'Cannot advance at this time.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 2. Location & Travel Section ─────────────────────────────────────────

function LocationTravelPane({
    currentPlace,
    currentFeature,
    worldDay,
}: {
    currentPlace: LocationEntry | undefined;
    currentFeature: string | null | undefined;
    worldDay: number | undefined;
}) {
    const locationLedger = useAppStore(s => s.locationLedger);
    const setLocationLedger = useAppStore(s => s.setLocationLedger);
    const updateContext = useAppStore(s => s.updateContext);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlaceIdOrName, setSelectedPlaceIdOrName] = useState<string | null>(
        currentPlace?.id ?? (locationLedger[0]?.id || null),
    );

    // Filtered ledger locations
    const filteredLedger = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return locationLedger;
        return locationLedger.filter(loc =>
            loc.name.toLowerCase().includes(q)
            || loc.broadLocation.toLowerCase().includes(q)
            || loc.aliases.toLowerCase().includes(q)
            || loc.description.toLowerCase().includes(q),
        );
    }, [locationLedger, searchQuery]);

    // Known map locations not yet in ledger
    const mapLocations = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const existingNames = new Set(locationLedger.map(l => l.name.toLowerCase()));
        return INITIAL_LOCATIONS.filter(pin => {
            if (existingNames.has(pin.name.toLowerCase())) return false;
            if (!q) return true;
            return pin.name.toLowerCase().includes(q)
                || pin.category.toLowerCase().includes(q)
                || pin.description.toLowerCase().includes(q);
        });
    }, [locationLedger, searchQuery]);

    const activeLocationEntry = useMemo(() => {
        if (!selectedPlaceIdOrName) return currentPlace;
        const byId = locationLedger.find(l => l.id === selectedPlaceIdOrName);
        if (byId) return byId;
        const byName = locationLedger.find(l => l.name.toLowerCase() === selectedPlaceIdOrName.toLowerCase());
        if (byName) return byName;
        return null;
    }, [selectedPlaceIdOrName, locationLedger, currentPlace]);

    const activeMapPin = useMemo(() => {
        if (activeLocationEntry) return null;
        if (!selectedPlaceIdOrName) return null;
        return INITIAL_LOCATIONS.find(pin => pin.name.toLowerCase() === selectedPlaceIdOrName.toLowerCase()) || null;
    }, [activeLocationEntry, selectedPlaceIdOrName]);

    const handleShiftLocation = (placeName: string, existingEntry?: LocationEntry | null) => {
        if (existingEntry) {
            updateContext({
                currentPlaceId: existingEntry.id,
                currentFeature: null,
            });
            toast.success(`Shifted location to ${existingEntry.name}`);
            return;
        }

        // Find existing by name
        const match = locationLedger.find(l => l.name.toLowerCase() === placeName.toLowerCase());
        if (match) {
            updateContext({
                currentPlaceId: match.id,
                currentFeature: null,
            });
            toast.success(`Shifted location to ${match.name}`);
            return;
        }

        // Create new location entry from map pin
        const pin = INITIAL_LOCATIONS.find(p => p.name.toLowerCase() === placeName.toLowerCase());
        const newId = `loc_${Date.now()}_${uid(4)}`;
        const newEntry: LocationEntry = {
            id: newId,
            name: pin?.name || placeName,
            aliases: '',
            broadLocation: pin?.category || 'Northern Continent',
            features: [],
            connections: [],
            description: pin?.description || `A notable location in the Lord of the Mysteries world.`,
            source: 'manual',
            firstSeenScene: 'travel',
            lastSeenScene: 'travel',
        };

        setLocationLedger([...locationLedger, newEntry]);
        updateContext({
            currentPlaceId: newId,
            currentFeature: null,
        });
        setSelectedPlaceIdOrName(newId);
        toast.success(`Traveled to ${newEntry.name}`);
    };

    const handleShiftFeature = (featureName: string) => {
        updateContext({ currentFeature: featureName });
        toast.success(`Moved to ${featureName}`);
    };

    const handleClearFeature = () => {
        updateContext({ currentFeature: null });
        toast.info(`Left feature area`);
    };

    const isCurrentActive = activeLocationEntry && currentPlace?.id === activeLocationEntry.id;

    return (
        <div className="space-y-6">
            {/* Current Position Summary Card */}
            <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full border border-[#c9a227]/40 bg-black/60 flex items-center justify-center text-[#c9a227] shadow-inner shrink-0">
                        <MapPin size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-[#c9a227]">
                                Current Coordinates
                            </p>
                            {worldDay !== undefined && (
                                <span className="text-[9px] font-mono px-2 py-0.5 border border-[#c9a227]/30 text-[#e0c36a] rounded-md bg-[#141118] shadow-[2px_2px_5px_#050407]">
                                    Day {worldDay}
                                </span>
                            )}
                        </div>
                        <h3 className="font-['EB_Garamond'] text-2xl font-bold text-[#f3ead8]">
                            {currentPlace?.name || 'Unknown Territory'}
                        </h3>
                        <p className="text-xs text-[#d8cfbe]">
                            {currentPlace?.broadLocation || 'The Northern & Southern Continents'}
                            {currentFeature ? ` · Feature: ${currentFeature}` : ''}
                        </p>
                    </div>
                </div>

                {currentFeature && (
                    <button
                        type="button"
                        onClick={handleClearFeature}
                        className="py-1.5 px-3.5 border border-[#c9a227]/30 bg-[#141118] text-[#e0c36a] hover:text-[#f3ead8] hover:border-[#c9a227] rounded-lg text-xs font-['Cinzel'] tracking-wider uppercase shadow-[3px_3px_8px_#050407,-2px_-2px_6px_#1b1722] transition-all"
                    >
                        Step Outside Feature
                    </button>
                )}
            </div>

            {/* Interactive World Map */}
            <div className="space-y-2">
                <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                    <Compass size={14} />
                    <span>Interactive World Map & Exploration</span>
                </p>
                <div className="h-80 sm:h-96 min-h-85 border border-[#c9a227]/20 rounded-xl overflow-hidden bg-[#09080c] shadow-[inset_3px_3px_10px_#040306,inset_-3px_-3px_10px_#141118]">
                    <LotmWorldMapView
                        readOnly
                        highlightCoords={activeLocationEntry?.coordinates || activeMapPin?.coordinates}
                        onSelectName={(name) => {
                            setSelectedPlaceIdOrName(name);
                        }}
                    />
                </div>
            </div>

            {/* Location Ledger & Destination Selector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 1/3: Available Locations Directory */}
                <div className="lg:col-span-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="font-['Cinzel'] text-[10px] tracking-wider uppercase text-[#c9a227]">
                            Known Locations ({filteredLedger.length + mapLocations.length})
                        </p>
                    </div>

                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a09075]" />
                        <input
                            type="text"
                            placeholder="Search regions, cities, harbors…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-black/50 border border-[#c9a227]/25 rounded py-1.5 pl-8 pr-3 text-xs text-[#f3ead8] placeholder-[#7a6f5e] outline-none focus:border-[#c9a227]"
                        />
                    </div>

                    <div className="max-h-90 overflow-y-auto space-y-1.5 pr-1">
                        {filteredLedger.map(loc => {
                            const isCurrent = currentPlace?.id === loc.id;
                            const isSelected = activeLocationEntry?.id === loc.id;
                            return (
                                <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => setSelectedPlaceIdOrName(loc.id)}
                                    className={`w-full text-left p-2.5 rounded border transition-colors ${
                                        isSelected
                                            ? 'border-[#c9a227] bg-[#221a28]'
                                            : isCurrent
                                                ? 'border-[#c9a227]/50 bg-[#17131b]'
                                                : 'border-[#2d2537] bg-[#0e0b13] hover:border-[#c9a227]/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-['EB_Garamond'] text-sm font-semibold text-[#f3ead8]">
                                            {loc.name}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[8px] font-['Cinzel'] tracking-wider uppercase px-1.5 py-0.2 bg-amber-900/50 text-amber-300 rounded-xs border border-amber-600/40">
                                                Here
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-[#a09075] truncate mt-0.5">
                                        {loc.broadLocation || 'Recorded Place'}
                                    </p>
                                </button>
                            );
                        })}

                        {mapLocations.map(pin => {
                            const isSelected = !activeLocationEntry && activeMapPin?.name === pin.name;
                            return (
                                <button
                                    key={pin.id}
                                    type="button"
                                    onClick={() => setSelectedPlaceIdOrName(pin.name)}
                                    className={`w-full text-left p-2.5 rounded border transition-colors ${
                                        isSelected
                                            ? 'border-[#c9a227] bg-[#221a28]'
                                            : 'border-[#2d2537] bg-[#0a080f] opacity-85 hover:opacity-100 hover:border-[#c9a227]/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-['EB_Garamond'] text-sm text-[#e8e0d0]">
                                            {pin.name}
                                        </span>
                                        <span className="text-[8px] font-['Cinzel'] tracking-wider uppercase text-[#c9a227]/70">
                                            {pin.type}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[#8a7e6b] truncate mt-0.5">
                                        {pin.category} (Map)
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right 2/3: Selected Place Details & Shift Location Action */}
                <div className="lg:col-span-2">
                    {activeLocationEntry || activeMapPin ? (
                        <div className="bg-[#120f16] border border-[#c9a227]/30 p-5 rounded-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-[#c9a227]/20 pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-[#c9a227]">
                                            {activeLocationEntry ? 'Ledger Record' : 'Canon Map Location'}
                                        </span>
                                        {isCurrentActive && (
                                            <span className="text-[8px] font-['Cinzel'] uppercase px-1.5 py-0.2 bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 rounded-xs">
                                                Active Station
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-['EB_Garamond'] text-2xl font-bold text-[#f3ead8]">
                                        {activeLocationEntry?.name || activeMapPin?.name}
                                    </h4>
                                    <p className="text-xs text-[#c9a227]">
                                        {activeLocationEntry?.broadLocation || activeMapPin?.category}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleShiftLocation(
                                        activeLocationEntry?.name || activeMapPin?.name || '',
                                        activeLocationEntry,
                                    )}
                                    className={`py-2 px-4 rounded font-['Cinzel'] text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
                                        isCurrentActive && !currentFeature
                                            ? 'bg-black/40 text-[#a09075] border border-[#c9a227]/20 cursor-default'
                                            : 'bg-linear-to-r from-amber-700 to-[#c9a227] text-black hover:brightness-110 shadow-md shadow-amber-950/50 cursor-pointer active:scale-95'
                                    }`}
                                >
                                    <ArrowRight size={14} />
                                    <span>{isCurrentActive ? 'Already Here' : 'Shift Location / Travel'}</span>
                                </button>
                            </div>

                            <div>
                                <p className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-[#c9a227] mb-1">
                                    Description & Atmosphere
                                </p>
                                <p className="text-sm text-[#e8e0d0] leading-relaxed bg-black/30 p-3 rounded border border-[#c9a227]/15">
                                    {activeLocationEntry?.description || activeMapPin?.description || 'No description recorded.'}
                                </p>
                            </div>

                            {/* Features list if present */}
                            {activeLocationEntry?.features && activeLocationEntry.features.length > 0 && (
                                <div>
                                    <p className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-[#c9a227] mb-2">
                                        Features & Specific Locales ({activeLocationEntry.features.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {activeLocationEntry.features.map((feat, idx) => {
                                            const isSelectedFeature = currentFeature === feat && isCurrentActive;
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isCurrentActive) {
                                                            handleShiftLocation(activeLocationEntry.name, activeLocationEntry);
                                                        }
                                                        handleShiftFeature(feat);
                                                    }}
                                                    className={`py-1 px-2.5 rounded text-xs border transition-colors flex items-center gap-1.5 ${
                                                        isSelectedFeature
                                                            ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                                                            : 'border-[#c9a227]/30 bg-black/40 text-[#e8e0d0] hover:border-[#c9a227] hover:text-[#c9a227]'
                                                    }`}
                                                >
                                                    <span>{feat}</span>
                                                    {isSelectedFeature ? (
                                                        <span className="text-[9px] text-amber-400">(Here)</span>
                                                    ) : (
                                                        <ArrowRight size={10} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[#0e0c11] border border-[#c9a227]/14 p-8 rounded-xl text-center text-sm text-[#a09075] shadow-[inset_3px_3px_8px_#060507,inset_-3px_-3px_8px_#191620]">
                            Select a location from the map or list to view its details and travel.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── 3. Character Record (Read-Only GM View) Section ──────────────────────

function resolveCharacterRecordPortrait(pc: PlayerCharacter | null | undefined): string {
    const stored = (pc?.portrait ?? '').trim();
    if (stored) {
        if (stored.startsWith('data:') || stored.startsWith('blob:') || stored.startsWith('http')) return stored;
        if (stored.startsWith('image/')) return lotmAssetUrl(stored);
        return campaignCoverSrc(stored);
    }
    const name = pc?.name?.trim();
    if (!name) return '';
    const hit = matchLotmPortraitEntry(name, false);
    return hit ? lotmAssetUrl(hit.portrait) : '';
}

function CharacterGMPane({
    pc,
    profile,
    hudModel,
}: {
    pc: PlayerCharacter | null | undefined;
    profile: CharacterProfile | null | undefined;
    hudModel: ReturnType<typeof buildLotmPlayerHudModel>;
}) {
    const visual = pc?.visualProfile;
    const traits = pc?.traits ?? profile?.traits ?? [];
    const wants = pc?.wants;
    const boundaries = pc?.boundaries;
    const triggers = pc?.behavioralTriggers ?? [];
    const portraitSrc = useMemo(() => resolveCharacterRecordPortrait(pc), [pc]);

    const traitTierMap = useMemo(() => Object.fromEntries(TRAIT_VOCAB.map(t => [t.text, t.tier])), []);

    return (
        <div className="space-y-6">
            {/* Top Identity Banner */}
            <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {portraitSrc ? (
                        <img
                            src={portraitSrc}
                            alt={pc?.name || 'Player portrait'}
                            className="w-20 h-28 object-cover rounded-lg border border-[#c9a227]/40 shadow-[3px_3px_8px_#050407] shrink-0"
                        />
                    ) : (
                        <div className="w-20 h-28 rounded-lg border border-[#c9a227]/30 bg-[#0e0c11] shadow-[inset_2px_2px_5px_#060507] flex items-center justify-center text-[#c9a227] shrink-0">
                            <User size={24} />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-[#c9a227]">
                                Protagonist Dossier (Game Master Record)
                            </span>
                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-[#0e0c11] border border-[#c9a227]/30 text-[#e0c36a] rounded-md shadow-[inset_1px_1px_3px_#060507]">
                                {pc?.tier || 'protagonist'}
                            </span>
                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 rounded-md shadow-[inset_1px_1px_3px_#060507]">
                                {pc?.status || 'Alive'}
                            </span>
                        </div>
                        <h3 className="font-['EB_Garamond'] text-2xl font-bold text-[#f3ead8]">
                            {pc?.name || profile?.name || 'Unknown Character'}
                        </h3>
                        <p className="text-xs text-[#d0c6b4]">
                            {pc?.aliases ? `Aliases: ${pc.aliases} · ` : ''}
                            {pc?.faction || 'Independent'}
                            {pc?.origin ? ` · Origin: ${pc.origin}` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="font-['Cinzel'] text-[10px] tracking-wider uppercase text-[#c9a227]">
                        {hudModel.pathwayName}
                    </span>
                    <span className="font-['EB_Garamond'] text-lg font-semibold text-[#f3ead8]">
                        {hudModel.sequenceLabel}
                    </span>
                </div>
            </div>

            {/* Grid for GM View Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Identity & Lore */}
                <div className="bg-[#121015] border border-[#c9a227]/16 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                    <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                        <ScrollText size={13} />
                        <span>Identity, Heritage & Story Lore</span>
                    </p>
                    <div className="space-y-2 text-xs text-[#d8cfbe]">
                        {pc?.lore || profile?.backstory ? (
                            <p className="leading-relaxed bg-[#0e0c11] p-3.5 rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620]">
                                {pc?.lore || profile?.backstory}
                            </p>
                        ) : (
                            <p className="italic text-[#8a7e6b]">No detailed story backstory logged.</p>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                            <div className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_5px_#060507]">
                                <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block">Faction / Church</span>
                                <span className="text-[#f3ead8]">{pc?.faction || 'None'}</span>
                            </div>
                            <div className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_5px_#060507]">
                                <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block">Origin / Realm</span>
                                <span className="text-[#f3ead8]">{pc?.origin || profile?.origin || 'Loen Kingdom'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personality & Voice */}
                <div className="bg-[#121015] border border-[#c9a227]/16 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                    <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                        <User size={13} />
                        <span>Personality & Voice Persona</span>
                    </p>
                    <div className="space-y-2 text-xs text-[#d8cfbe]">
                        <div>
                            <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block mb-1">Disposition</span>
                            <p className="bg-[#0e0c11] p-3 rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620] leading-relaxed">
                                {pc?.personality || profile?.personality || 'Pragmatic, cautious, attentive to mysticism.'}
                            </p>
                        </div>
                        <div>
                            <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block mb-1">Speech Style & Tone</span>
                            <p className="bg-[#0e0c11] p-3 rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620] italic">
                                {pc?.speechStyle || profile?.speechStyle || 'Polite, composed, guarded.'}
                            </p>
                        </div>
                        {pc?.dialogueExamples && (
                            <div>
                                <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block mb-1">Dialogue Quote</span>
                                <p className="bg-[#0e0c11] p-3 rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620] italic text-amber-200">
                                    "{pc.dialogueExamples}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Personality Hexagon Radar / Meters */}
                <div className="bg-[#121015] border border-[#c9a227]/16 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                    <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                        <Activity size={13} />
                        <span>Personality Hexagon (Agency Axes)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {HEX_AXES.map(axis => {
                            const val = pc?.personalityHex?.[axis] ?? 0;
                            const clamped = Math.max(-3, Math.min(3, Math.round(val)));
                            const band = hexBand(axis, clamped);
                            // Normalize -3..+3 to 0..100%
                            const pct = Math.round(((clamped + 3) / 6) * 100);
                            return (
                                <div key={axis} className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620]">
                                    <div className="flex justify-between items-center text-[10px] mb-1.5">
                                        <span className="font-['Cinzel'] uppercase tracking-wider text-[#c9a227]">{axis}</span>
                                        <span className="font-mono text-[#f3ead8]">{clamped > 0 ? `+${clamped}` : clamped}</span>
                                    </div>
                                    <div className="w-full h-2 bg-[#09080c] border border-[#c9a227]/15 rounded-full shadow-[inset_1px_1px_3px_#040305,inset_-1px_-1px_3px_#141118] overflow-hidden mb-1">
                                        <div
                                            className="h-full bg-linear-to-r from-amber-600 to-[#c9a227]"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <p className="text-[9px] text-[#a09075] text-right font-['Cinzel'] uppercase tracking-wider">
                                        {band}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Traits & Wants */}
                <div className="bg-[#121015] border border-[#c9a227]/16 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                    <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                        <Sparkles size={13} />
                        <span>Traits & Core Wants</span>
                    </p>
                    <div className="space-y-3 text-xs">
                        <div>
                            <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block mb-1.5">Core Traits</span>
                            <div className="flex flex-wrap gap-2">
                                {traits.length > 0 ? (
                                    traits.map((t, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2.5 py-1 bg-[#141118] border border-[#c9a227]/30 text-[#e8e0d0] rounded-lg text-[11px] font-['Cinzel'] shadow-[2px_2px_5px_#050407,-1px_-1px_4px_#1b1722]"
                                        >
                                            {t}
                                            {traitTierMap[t] && (
                                                <span className="text-[8px] text-[#c9a227] ml-1 uppercase">
                                                    ({traitTierMap[t]})
                                                </span>
                                            )}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs italic text-[#8a7e6b]">No core traits selected.</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                            <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block">Wants & Aspirations</span>
                            {wants?.short?.length ? (
                                <p className="text-[11px] text-[#d8cfbe] bg-[#0e0c11] p-2.5 rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_5px_#060507]">
                                    <span className="text-amber-400 font-semibold font-['Cinzel'] text-[9px] uppercase">Short: </span>
                                    {wants.short.join('; ')}
                                </p>
                            ) : null}
                            {wants?.medium?.length ? (
                                <p className="text-[11px] text-[#d8cfbe] bg-[#0e0c11] p-2.5 rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_5px_#060507]">
                                    <span className="text-amber-400 font-semibold font-['Cinzel'] text-[9px] uppercase">Medium: </span>
                                    {wants.medium.join('; ')}
                                </p>
                            ) : null}
                            {wants?.long ? (
                                <p className="text-[11px] text-[#d8cfbe] bg-[#0e0c11] p-2.5 rounded-lg border border-[#c9a227]/12 shadow-[inset_2px_2px_5px_#060507]">
                                    <span className="text-amber-400 font-semibold font-['Cinzel'] text-[9px] uppercase">Long: </span>
                                    {wants.long}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Boundaries & Behavioral Triggers */}
                <div className="bg-[#121015] border border-[#c9a227]/16 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                    <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                        <Shield size={13} />
                        <span>Boundaries & Behavioral Triggers</span>
                    </p>
                    <div className="space-y-3 text-xs text-[#d8cfbe]">
                        {boundaries?.hard?.length ? (
                            <div>
                                <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-red-400 block mb-1">Hard Boundaries</span>
                                <p className="bg-red-950/20 border border-red-500/20 p-2.5 rounded-lg text-[11px] shadow-[inset_2px_2px_5px_#060507]">
                                    {boundaries.hard.join('; ')}
                                </p>
                            </div>
                        ) : null}

                        {boundaries?.soft?.length ? (
                            <div>
                                <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-amber-400 block mb-1">Soft Boundaries</span>
                                <p className="bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg text-[11px] shadow-[inset_2px_2px_5px_#060507]">
                                    {boundaries.soft.join('; ')}
                                </p>
                            </div>
                        ) : null}

                        {triggers.length > 0 && (
                            <div>
                                <span className="font-['Cinzel'] text-[8px] uppercase tracking-wider text-[#c9a227] block mb-1.5">Behavioral Triggers</span>
                                <div className="space-y-1.5">
                                    {triggers.map((trig, idx) => (
                                        <div key={idx} className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_5px_#060507] text-[11px]">
                                            <span className="text-amber-300 font-semibold">When: </span>
                                            <span>{trig.trigger}</span>
                                            <span className="text-[#c9a227] font-semibold ml-2">→ </span>
                                            <span>{trig.behavior}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Visual Profile & Attributes */}
                <div className="bg-[#121015] border border-[#c9a227]/16 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                    <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                        <Eye size={13} />
                        <span>Visual Profile & Attributes</span>
                    </p>
                    {portraitSrc ? (
                        <img
                            src={portraitSrc}
                            alt=""
                            className="w-full max-h-80 object-cover object-top rounded-lg border border-[#c9a227]/30 shadow-[3px_3px_8px_#050407]"
                        />
                    ) : null}
                    <div className="grid grid-cols-2 gap-2.5 text-xs text-[#d8cfbe]">
                        <div className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_5px_#060507]">
                            <span className="font-['Cinzel'] text-[8px] uppercase text-[#c9a227] block">Gender & Age</span>
                            <span>{visual?.gender || '—'} · {visual?.age || '—'}</span>
                        </div>
                        <div className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_5px_#060507]">
                            <span className="font-['Cinzel'] text-[8px] uppercase text-[#c9a227] block">Build / Height</span>
                            <span>{visual?.build || '—'}</span>
                        </div>
                        <div className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_5px_#060507]">
                            <span className="font-['Cinzel'] text-[8px] uppercase text-[#c9a227] block">Hair & Eyes</span>
                            <span>{visual?.hair || '—'} · {visual?.eyes || '—'}</span>
                        </div>
                        <div className="p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_5px_#060507]">
                            <span className="font-['Cinzel'] text-[8px] uppercase text-[#c9a227] block">Skin Complexion</span>
                            <span>{visual?.skin || '—'}</span>
                        </div>
                        <div className="col-span-2 p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_5px_#060507]">
                            <span className="font-['Cinzel'] text-[8px] uppercase text-[#c9a227] block">Attire / Clothing</span>
                            <span>{visual?.clothing || 'Victorian formal frock coat, top hat, cane.'}</span>
                        </div>
                        {visual?.distinguishingFeatures && (
                            <div className="col-span-2 p-2.5 bg-[#0e0c11] rounded-lg border border-[#c9a227]/14 shadow-[inset_2px_2px_5px_#060507]">
                                <span className="font-['Cinzel'] text-[8px] uppercase text-[#c9a227] block">Distinguishing Marks</span>
                                <span>{visual.distinguishingFeatures}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 4. Inventory & Belongings Section ────────────────────────────────────

function InventoryPane({ inventory }: { inventory: InventoryItem[] }) {
    const [selectedTab, setSelectedTab] = useState<InventoryItemCategory | 'all' | 'equipped'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const purseLine = useMemo(() => formatLotmPurseLine(inventory), [inventory]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return inventory.filter(item => {
            if (!inventoryItemMatchesTab(item, selectedTab)) return false;
            if (!q) return true;
            return item.name.toLowerCase().includes(q)
                || item.description?.toLowerCase().includes(q)
                || item.notes?.toLowerCase().includes(q)
                || item.category.toLowerCase().includes(q);
        });
    }, [inventory, selectedTab, searchQuery]);

    return (
        <div className="space-y-6">
            {/* Purse / Currency Summary Banner */}
            <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full border border-[#c9a227]/40 bg-[#0e0c11] shadow-[inset_2px_2px_5px_#060507] flex items-center justify-center text-[#c9a227]">
                        <Package size={20} />
                    </div>
                    <div>
                        <p className="font-['Cinzel'] text-[9px] tracking-wider uppercase text-[#c9a227]">
                            Purse & Holdings
                        </p>
                        <h4 className="font-['EB_Garamond'] text-xl font-bold text-[#f3ead8]">
                            {purseLine || 'No coin recorded in purse'}
                        </h4>
                    </div>
                </div>
                <div className="text-xs font-mono text-[#e0c36a] bg-[#0e0c11] px-3 py-1 rounded-lg border border-[#c9a227]/15 shadow-[inset_2px_2px_5px_#060507]">
                    Total Items: {inventory.length}
                </div>
            </div>

            {/* Category Subtabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {INVENTORY_TABS.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedTab(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-['Cinzel'] tracking-wider uppercase transition-all ${
                                selectedTab === tab.id
                                    ? 'bg-[#221a28] border border-[#c9a227] text-[#e0c36a] shadow-[inset_2px_2px_5px_#050407,inset_-2px_-2px_5px_#1b1722,0_0_10px_rgba(201,162,39,0.2)]'
                                    : 'bg-[#141118] border border-[#c9a227]/15 text-[#a09075] shadow-[2px_2px_6px_#050407,-1px_-1px_4px_#1b1722] hover:border-[#c9a227]/40 hover:text-[#e8e0d0]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative min-w-50">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a09075]" />
                    <input
                        type="text"
                        placeholder="Search items…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0e0c11] border border-[#c9a227]/20 rounded-lg py-1.5 pl-8 pr-3 text-xs text-[#f3ead8] placeholder-[#7a6f5e] outline-none focus:border-[#c9a227] shadow-[inset_2px_2px_5px_#050407,inset_-2px_-2px_5px_#191620]"
                    />
                </div>
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
                <div className="p-8 text-center bg-[#0e0c11] border border-[#c9a227]/14 rounded-xl text-sm text-[#a09075] italic shadow-[inset_3px_3px_8px_#060507,inset_-3px_-3px_8px_#191620]">
                    No items found matching this category.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredItems.map(item => {
                        const isSealedArtefact = item.category === 'sealed-artefact';
                        const badge = inventoryBadgeFor(item);
                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-xl border space-y-3 transition-all ${
                                    isSealedArtefact
                                        ? 'border-amber-600/40 bg-[#161014] shadow-[6px_6px_16px_#050408,-4px_-4px_12px_#22161c]'
                                        : 'border-[#c9a227]/16 bg-[#121015] shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822]'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {item.equipped && (
                                                <span className="text-[8px] font-['Cinzel'] uppercase px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 rounded-md shadow-[1px_1px_3px_#050407]">
                                                    Equipped
                                                </span>
                                            )}
                                            {badge && (
                                                <span className={`text-[8px] font-['Cinzel'] uppercase px-2 py-0.5 rounded-md border shadow-[1px_1px_3px_#050407] ${
                                                    isSealedArtefact
                                                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                                        : 'bg-[#141118] text-[#c9a227] border-[#c9a227]/30'
                                                }`}>
                                                    {badge}
                                                </span>
                                            )}
                                        </div>
                                        <h5 className="font-['EB_Garamond'] text-lg font-bold text-[#f3ead8] mt-1">
                                            {item.name}
                                        </h5>
                                    </div>
                                    <span className="font-mono text-xs text-[#c9a227] bg-[#0e0c11] px-2.5 py-0.5 rounded-md border border-[#c9a227]/20 shadow-[inset_1px_1px_3px_#060507]">
                                        x{item.qty || 1}
                                    </span>
                                </div>

                                {item.description && (
                                    <p className="text-xs text-[#d8cfbe] leading-relaxed">
                                        {item.description}
                                    </p>
                                )}

                                {/* Mandatory Flaw / Downside for Sealed Artefacts */}
                                {isSealedArtefact && item.notes && (
                                    <div className="p-3 bg-[#141118] border border-amber-600/35 rounded-lg text-xs text-amber-200 flex items-start gap-2 shadow-[2px_2px_5px_#050407,-1px_-1px_4px_#1b1722]">
                                        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-amber-400 block mb-0.5">
                                                Negative Flaw / Downside
                                            </span>
                                            <span>{item.notes}</span>
                                        </div>
                                    </div>
                                )}

                                {!isSealedArtefact && item.notes && (
                                    <p className="text-[11px] text-[#a09075] italic">
                                        Note: {item.notes}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── 5. Chronicle & Standing Section ──────────────────────────────────────

function ChronicleStandingPane({
    pc,
    profile,
    npcLedger,
    divergenceRegister,
}: {
    pc: PlayerCharacter | null | undefined;
    profile: ReturnType<typeof useAppStore.getState>['context']['characterProfile'];
    npcLedger: NPCEntry[];
    divergenceRegister: ReturnType<typeof useAppStore.getState>['divergenceRegister'];
}) {
    const bonds = useMemo(() => selectPcBonds(npcLedger), [npcLedger]);
    const divergenceEntries = useMemo(
        () => getEntriesForNpc(divergenceRegister ?? EMPTY_REGISTER, pc?.id || 'pc'),
        [divergenceRegister, pc?.id],
    );

    const activeTraits = (profile?.activeTraits ?? []).filter(t => !t.superseded);
    const supersededTraits = (profile?.activeTraits ?? []).filter(t => t.superseded);

    return (
        <div className="space-y-6">
            {/* Active Traits Section */}
            <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                    <Sparkles size={14} />
                    <span>Active Chronicle Traits & Evolutions</span>
                </p>

                {activeTraits.length === 0 ? (
                    <p className="text-xs italic text-[#8a7e6b]">No dynamic chronicle traits established yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeTraits.map(trait => (
                            <div key={trait.id} className="p-3.5 bg-[#0e0c11] border border-[#c9a227]/14 rounded-lg shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620] space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-[#c9a227]">
                                        {CATEGORY_LABELS[trait.category] || trait.category}
                                    </span>
                                    <span className="text-[9px] font-mono text-[#a09075]">
                                        Scene: {trait.sceneEstablished}
                                    </span>
                                </div>
                                <p className="text-xs text-[#f3ead8]">{trait.text}</p>
                            </div>
                        ))}
                    </div>
                )}

                {supersededTraits.length > 0 && (
                    <div className="pt-3 border-t border-[#c9a227]/15">
                        <p className="font-['Cinzel'] text-[9px] uppercase tracking-wider text-[#a09075] mb-2">
                            Superseded / Evolved Traits ({supersededTraits.length})
                        </p>
                        <div className="space-y-1.5 opacity-60">
                            {supersededTraits.map(trait => (
                                <p key={trait.id} className="text-xs text-[#a09075] line-through">
                                    {trait.text}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Standing / NPC Relationships */}
            <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                    <User size={14} />
                    <span>Standing & Social Relations ({bonds.length})</span>
                </p>

                {bonds.length === 0 ? (
                    <p className="text-xs italic text-[#8a7e6b]">No distinct NPC standings established yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {bonds.map(npc => {
                            const rel = npc.pcRelation ?? 0;
                            const clamped = Math.max(-3, Math.min(3, Math.round(rel)));
                            const band = relationBand(clamped);
                            const isPositive = clamped > 0;
                            const isNegative = clamped < 0;
                            return (
                                <div key={npc.id} className="p-3.5 bg-[#0e0c11] border border-[#c9a227]/14 rounded-lg shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h5 className="font-['EB_Garamond'] text-base font-bold text-[#f3ead8]">
                                                {npc.name}
                                            </h5>
                                            <p className="text-[10px] text-[#a09075]">
                                                {npc.role || npc.faction || 'Acquaintance'}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-mono font-bold ${
                                            isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-[#a09075]'
                                        }`}>
                                            {clamped > 0 ? `+${clamped}` : clamped}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="w-full h-2 bg-[#09080c] border border-[#c9a227]/15 rounded-full shadow-[inset_1px_1px_3px_#040305,inset_-1px_-1px_3px_#141118] overflow-hidden mb-1">
                                            <div
                                                className={`h-full ${isPositive ? 'bg-emerald-500' : isNegative ? 'bg-red-500' : 'bg-neutral-500'}`}
                                                style={{ width: `${Math.round(((clamped + 3) / 6) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] font-['Cinzel'] uppercase tracking-wider text-right text-[#c9a227]">
                                            {band}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Established Events & Divergence Log */}
            <div className="bg-[#121015] border border-[#c9a227]/20 p-5 rounded-xl shadow-[6px_6px_16px_#050408,-5px_-5px_14px_#1c1822] space-y-3">
                <p className="font-['Cinzel'] text-[10px] tracking-[0.2em] uppercase text-[#c9a227] flex items-center gap-2">
                    <ScrollText size={14} />
                    <span>Established Chronicle Events ({divergenceEntries.length})</span>
                </p>

                {divergenceEntries.length === 0 ? (
                    <p className="text-xs italic text-[#8a7e6b]">No divergence chronicle events logged for the protagonist.</p>
                ) : (
                    <div className="space-y-2.5">
                        {divergenceEntries.map(entry => {
                            const color = CATEGORY_COLORS[entry.category] || 'text-[#c9a227]';
                            return (
                                <div key={entry.id} className="p-3.5 bg-[#0e0c11] border border-[#c9a227]/14 rounded-lg shadow-[inset_2px_2px_6px_#060507,inset_-2px_-2px_6px_#191620] space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className={`font-['Cinzel'] text-[9px] uppercase tracking-wider ${color}`}>
                                            {CATEGORY_LABELS[entry.category] || entry.category}
                                        </span>
                                        <span className="text-[9px] font-mono text-[#a09075]">
                                            Turn {entry.turnRegistered}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#f3ead8] leading-relaxed">
                                        {entry.fact}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
