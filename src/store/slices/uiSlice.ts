import type { StateCreator } from 'zustand';
import type { PayloadTrace, PipelinePhase, StreamingStats, LoreCheckResult, LoreCheckSelection, ArmedLoot } from '../../types';
import type { OneShotEventId } from '../../services/oneshot/oneShotEvents';
import { IS_DEMO_MODE } from '../../config/demoMode';

// WO-screen-modernization §A-2 — `rules-mgr` is gone. Rules Manager merged
// into System Context as the [Write | Retrieval] segmented control; the nav
// drawer's screen map no longer carries a separate entry.
export type ContextScreenId = 'sys' | 'world' | 'eng' | 'chpt' | 'mem';

export type GrimoireFocus = {
    section: 'volumes' | 'epochs' | 'pathways' | 'world' | 'churches' | 'guide';
    id?: string | null;
};

export type PlayerGrimoireSection = 'character' | 'pathway' | 'location' | 'inventory' | 'chronicle' | 'guide';

export type LastLootReceipt = {
    names: string[];
    at: number;
};


export type LotmWorldIndexLock = {
    campaignId: string | null;
    emblemSrc: string;
};

// ── Slice type ─────────────────────────────────────────────────────────

export type UISlice = {
    settingsOpen: boolean;
    drawerOpen: boolean;
    npcLedgerOpen: boolean;
    pcPanelOpen: boolean;
    locationLedgerOpen: boolean;
    locationLedgerFocusId: string | null;
    openLocationLedgerAt: (idOrName: string) => void;
    clearLocationLedgerFocus: () => void;
    factionLedgerOpen: boolean;
    itemLedgerOpen: boolean;
    blockViewOpen: boolean;
    backupModalOpen: boolean;
    contextScreen: ContextScreenId | null;
    lastPayloadTrace?: PayloadTrace[];
    pipelinePhase: PipelinePhase;
    streamingStats: StreamingStats | null;
    loreCheckOpen: boolean;
    loreCheckStatus: string;
    loreCheckError: string;
    loreCheckResult: LoreCheckResult | null;
    loreCheckSelection: LoreCheckSelection | null;
    demoOnboardingOpen: boolean;
    openDemoOnboarding: () => void;
    closeDemoOnboarding: () => void;
    toggleSettings: () => void;
    toggleDrawer: () => void;
    toggleNPCLedger: () => void;
    togglePCPanel: () => void;
    toggleLocationLedger: () => void;
    toggleFactionLedger: () => void;
    toggleItemLedger: () => void;
    toggleBlockView: () => void;
    toggleBackupModal: () => void;
    openContextScreen: (screen: ContextScreenId) => void;
    closeContextScreen: () => void;
    setLastPayloadTrace: (trace?: PayloadTrace[]) => void;
    setPipelinePhase: (phase: PipelinePhase) => void;
    setStreamingStats: (stats: StreamingStats | null) => void;
    setLoreCheckStatus: (status: string) => void;
    setLoreCheckResult: (result: LoreCheckResult | null) => void;
    setLoreCheckError: (error: string) => void;
    openLoreCheck: (selection: LoreCheckSelection) => void;
    closeLoreCheck: () => void;
    divergenceEntryOpen: boolean;
    openDivergenceEntry: () => void;
    closeDivergenceEntry: () => void;
    deepArmed: boolean;
    setDeepArmed: (v: boolean) => void;
    toggleDeepArmed: () => void;
    // Player-called dice ("dice me"): the armed roll request, resolved at send time. null = not armed.
    // Accepts the new ManualRollRequest shape OR legacy '1d20'|'adv'|'disadv' string.
    armedRoll: import('../../types').ManualRollRequest | string | null;
    setArmedRoll: (mode: import('../../types').ManualRollRequest | string | null) => void;
    // Dice roll modal (3-gate configurator)
    diceRollModalOpen: boolean;
    openDiceRollModal: () => void;
    closeDiceRollModal: () => void;
    // Loot Engine WO-05: armed loot drop config, resolved at send time. Mirrors armedRoll.
    armedLoot: ArmedLoot | null;
    armLoot: (payload: ArmedLoot) => void;
    clearArmedLoot: () => void;
    lootRollModalOpen: boolean;
    openLootRollModal: () => void;
    closeLootRollModal: () => void;
    lastLootReceipt: LastLootReceipt | null;
    setLastLootReceipt: (receipt: LastLootReceipt | null) => void;
    // One-Shot Event Injector v1: armed event id, appended to the next turn's
    // LLM input (after historyInput capture) and cleared by the caller. Mirrors
    // armedRoll/armedLoot — fires once, never persists in chat history.
    armedOneShot: OneShotEventId | null;
    setArmedOneShot: (id: OneShotEventId | null) => void;
    // Absolute Command v1: armed binding OOC instruction for this turn only.
    // Mirrors armedOneShot — cleared before runTurn so it fires exactly once,
    // never persists in chat history. Suppresses Director Brief, watchdog nudge,
    // and GM_REMINDER; placed last in the prompt for maximum recency.
    armedAbsoluteCommand: string | null;
    setArmedAbsoluteCommand: (text: string | null) => void;
    troubleModalOpen: boolean;
    troubleLoading: boolean;
    troubleOptions: string[];
    openTroubleModal: (options: string[]) => void;
    closeTroubleModal: () => void;
    setTroubleLoading: (v: boolean) => void;
    composerInjection: string | null;
    injectToComposer: (text: string) => void;
    consumeComposerInjection: () => void;
    pinnedMemoriesOpen: boolean;
    togglePinnedMemories: () => void;
    closePinnedMemories: () => void;
    askGmOpen: boolean;
    openAskGm: () => void;
    closeAskGm: () => void;
    // Inline Scene Image V1
    sceneImageModalOpen: boolean;
    sceneImageDraft: import('../../types').SceneImageDraft | null;
    openSceneImageModal: (draft: import('../../types').SceneImageDraft) => void;
    closeSceneImageModal: () => void;
    updateSceneImageDraft: (patch: Partial<import('../../types').SceneImageDraft>) => void;
    setComposingSceneImage: (v: boolean) => void;
    setGeneratingSceneImage: (v: boolean) => void;
    /** Blocks the LOTM UI while a newly created chronicle's world lore is embedding. */
    lotmWorldIndexLock: LotmWorldIndexLock | null;
    beginLotmWorldIndex: (lock: LotmWorldIndexLock) => void;
    endLotmWorldIndex: () => void;
    /** LOTM play dashboard: false = illustrated stage, true = full chronicle transcript. */
    lotmChronicleOpen: boolean;
    setLotmChronicleOpen: (open: boolean) => void;
    toggleLotmChronicle: () => void;
    /** Player-facing LOTM lore encyclopedia overlay. */
    grimoireOpen: boolean;
    grimoireFocus: GrimoireFocus | null;
    openGrimoire: (focus?: GrimoireFocus) => void;
    closeGrimoire: () => void;
    toggleGrimoire: () => void;
    clearGrimoireFocus: () => void;
    /** In-game Player Grimoire overlay (Potion, Location shift & map, Read-only Character sheet, Inventory, Chronicle). */
    playerGrimoireOpen: boolean;
    playerGrimoireSection: PlayerGrimoireSection;
    openPlayerGrimoire: (section?: PlayerGrimoireSection) => void;
    closePlayerGrimoire: () => void;
    togglePlayerGrimoire: () => void;
    setPlayerGrimoireSection: (section: PlayerGrimoireSection) => void;
};

// ── Slice creator ──────────────────────────────────────────────────────

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
    settingsOpen: false,
    drawerOpen: false,
    npcLedgerOpen: false,
    pcPanelOpen: false,
    locationLedgerOpen: false,
    locationLedgerFocusId: null,
    factionLedgerOpen: false,
    itemLedgerOpen: false,
    blockViewOpen: false,
    backupModalOpen: false,
    contextScreen: null,
    pipelinePhase: 'idle',
    streamingStats: null,
    loreCheckOpen: false,
    loreCheckStatus: '',
    loreCheckError: '',
    loreCheckResult: null,
    loreCheckSelection: null,
    demoOnboardingOpen: false,
    openDemoOnboarding: () => { if (IS_DEMO_MODE) set({ demoOnboardingOpen: true }); },
    closeDemoOnboarding: () => set({ demoOnboardingOpen: false }),
    toggleSettings: () => {
        if (IS_DEMO_MODE) return;
        set((s) => ({ settingsOpen: !s.settingsOpen }));
    },
    toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
    toggleNPCLedger: () => set((s) => ({ npcLedgerOpen: !s.npcLedgerOpen })),
    togglePCPanel: () => set((s) => ({ pcPanelOpen: !s.pcPanelOpen })),
    toggleLocationLedger: () => set((s) => ({ locationLedgerOpen: !s.locationLedgerOpen })),
    openLocationLedgerAt: (idOrName) => set({ locationLedgerOpen: true, locationLedgerFocusId: idOrName }),
    clearLocationLedgerFocus: () => set({ locationLedgerFocusId: null }),
    toggleFactionLedger: () => set((s) => ({ factionLedgerOpen: !s.factionLedgerOpen })),
    toggleItemLedger: () => set((s) => ({ itemLedgerOpen: !s.itemLedgerOpen })),
    toggleBlockView: () => set((s) => ({ blockViewOpen: !s.blockViewOpen })),
    toggleBackupModal: () => set((s) => ({ backupModalOpen: !s.backupModalOpen })),
    openContextScreen: (screen) => set({ contextScreen: screen }),
    closeContextScreen: () => set({ contextScreen: null }),
    setLastPayloadTrace: (trace) => set({ lastPayloadTrace: trace }),
    setPipelinePhase: (phase) => set({ pipelinePhase: phase }),
    setStreamingStats: (stats) => set({ streamingStats: stats }),
    setLoreCheckStatus: (status) => set({ loreCheckStatus: status }),
    setLoreCheckResult: (result) => set({ loreCheckResult: result }),
    setLoreCheckError: (error) => set({ loreCheckError: error }),
    openLoreCheck: (selection) => set({ loreCheckOpen: true, loreCheckSelection: selection, loreCheckResult: null, loreCheckError: '', loreCheckStatus: '' }),
    closeLoreCheck: () => set({ loreCheckOpen: false, loreCheckSelection: null, loreCheckResult: null, loreCheckError: '', loreCheckStatus: '' }),
    divergenceEntryOpen: false,
    openDivergenceEntry: () => set({ divergenceEntryOpen: true }),
    closeDivergenceEntry: () => set({ divergenceEntryOpen: false }),
    deepArmed: false,
    setDeepArmed: (v) => set({ deepArmed: v }),
    toggleDeepArmed: () => set((s) => ({ deepArmed: !s.deepArmed })),
    armedRoll: null,
    setArmedRoll: (mode) => set({ armedRoll: mode }),
    diceRollModalOpen: false,
    openDiceRollModal: () => set({ diceRollModalOpen: true }),
    closeDiceRollModal: () => set({ diceRollModalOpen: false }),
    armedLoot: null,
    armLoot: (payload) => set({ armedLoot: payload }),
    clearArmedLoot: () => set({ armedLoot: null }),
    lootRollModalOpen: false,
    openLootRollModal: () => set({ lootRollModalOpen: true }),
    closeLootRollModal: () => set({ lootRollModalOpen: false }),
    lastLootReceipt: null,
    setLastLootReceipt: (receipt) => set({ lastLootReceipt: receipt }),
    armedOneShot: null,
    setArmedOneShot: (id) => set({ armedOneShot: id }),
    armedAbsoluteCommand: null,
    setArmedAbsoluteCommand: (text) => set({ armedAbsoluteCommand: text }),
    troubleModalOpen: false,
    troubleLoading: false,
    troubleOptions: [],
    openTroubleModal: (options) => set({ troubleOptions: options, troubleModalOpen: true, troubleLoading: false }),
    closeTroubleModal: () => set({ troubleModalOpen: false, troubleOptions: [], troubleLoading: false }),
    setTroubleLoading: (v) => set({ troubleLoading: v }),
    composerInjection: null,
    injectToComposer: (text) => set({ composerInjection: text }),
    consumeComposerInjection: () => set({ composerInjection: null }),
    pinnedMemoriesOpen: false,
    togglePinnedMemories: () => set((s) => ({ pinnedMemoriesOpen: !s.pinnedMemoriesOpen })),
    closePinnedMemories: () => set({ pinnedMemoriesOpen: false }),
    askGmOpen: false,
    openAskGm: () => set({ askGmOpen: true }),
    closeAskGm: () => set({ askGmOpen: false }),
    sceneImageModalOpen: false,
    sceneImageDraft: null,
    openSceneImageModal: (draft) => set({ sceneImageModalOpen: true, sceneImageDraft: draft }),
    closeSceneImageModal: () => set({ sceneImageModalOpen: false, sceneImageDraft: null }),
    updateSceneImageDraft: (patch) => set((s) => ({
        sceneImageDraft: s.sceneImageDraft ? { ...s.sceneImageDraft, ...patch } : null,
    })),
    setComposingSceneImage: (v) => set((s) => ({
        sceneImageDraft: s.sceneImageDraft ? { ...s.sceneImageDraft, isComposing: v } : null,
    })),
    setGeneratingSceneImage: (v) => set((s) => ({
        sceneImageDraft: s.sceneImageDraft ? { ...s.sceneImageDraft, isGenerating: v } : null,
    })),
    lotmWorldIndexLock: null,
    beginLotmWorldIndex: (lock) => set({ lotmWorldIndexLock: lock }),
    endLotmWorldIndex: () => set({ lotmWorldIndexLock: null }),
    lotmChronicleOpen: false,
    setLotmChronicleOpen: (open) => {
        if (IS_DEMO_MODE) return;
        set({ lotmChronicleOpen: open });
    },
    toggleLotmChronicle: () => {
        if (IS_DEMO_MODE) return;
        set((s) => ({ lotmChronicleOpen: !s.lotmChronicleOpen }));
    },
    grimoireOpen: false,
    grimoireFocus: null,
    openGrimoire: (focus) => set({ grimoireOpen: true, grimoireFocus: focus ?? null }),
    closeGrimoire: () => set({ grimoireOpen: false, grimoireFocus: null }),
    toggleGrimoire: () => set((s) => ({ grimoireOpen: !s.grimoireOpen, grimoireFocus: s.grimoireOpen ? null : s.grimoireFocus })),
    clearGrimoireFocus: () => set({ grimoireFocus: null }),
    playerGrimoireOpen: false,
    playerGrimoireSection: 'character',
    openPlayerGrimoire: (section) => set((s) => ({
        playerGrimoireOpen: true,
        playerGrimoireSection: section ?? s.playerGrimoireSection ?? 'character',
    })),
    closePlayerGrimoire: () => set({ playerGrimoireOpen: false }),
    togglePlayerGrimoire: () => set((s) => ({ playerGrimoireOpen: !s.playerGrimoireOpen })),
    setPlayerGrimoireSection: (section) => set({ playerGrimoireSection: section }),
});
