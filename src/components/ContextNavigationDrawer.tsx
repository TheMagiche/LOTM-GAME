import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
    Archive, BookOpen, Brain, ChevronDown, ChevronRight, Cpu, Database, Dices, FileText,
    Landmark, LogOut, MapPin, Package,     Pin, Scissors, Scroll, ScrollText, Search, Settings,
    Sparkles, Syringe, UserCircle, Users, Workflow, Gem, Zap,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ContextScreenId } from '../store/slices/uiSlice';
import { RulesTab } from './context-drawer/RulesTab';
import { LoreTab } from './context-drawer/LoreTab';
import { EnginesTab } from './context-drawer/EnginesTab';
import { ChapterTab } from './context-drawer/ChapterTab';
import { MemoryTab } from './context-drawer/MemoryTab';
import { ScreenLightbox } from './ScreenLightbox';
import {
    readRegion, subscribeToRegion, isHeaderStatusEntry,
    type RegisteredChromeEntry,
} from '../services/mods/mounts/mountRegistry';
import { resolveModText } from '../services/mods/mounts/chromeRenderers';
import { COMPOSER_BUILTIN_ID_SET, registerComposerBuiltins } from '../services/mods/mounts/composerBuiltins';
import { useTranslation } from '../i18n/useTranslation';
import { LOTM_EXCLUSIVE_UI } from '../services/lotm/lotmExclusiveUi';
import { IS_DEMO_MODE } from '../config/demoMode';
import { exitLotmCampaign } from './lotm/LotmPlayHeader';
import { cueClose, cueNav, cueToggle } from '../services/uiSounds';
import { TokenGauge } from './TokenGauge';
import { OneShotInjectorButton } from './OneShotInjectorButton';
import { AbsoluteCommandButton } from './AbsoluteCommandButton';
import { ArcInjectorButton } from './ArcInjectorButton';
import { useChatPersistence } from '../hooks/useChatPersistence';
import { useCondenser } from './hooks/useCondenser';
import type { AiTier } from '../types/llm';

registerComposerBuiltins();

type GroupId = 'story' | 'world' | 'play' | 'mods' | 'engine';
type NavIcon = typeof ScrollText;

interface NavLeaf {
    id: string;
    label: string;
    icon: NavIcon;
    badge?: number | string;
    disabled?: boolean;
    active?: boolean;
    onSelect: () => void;
    render?: () => ReactNode;
}

// WO-screen-modernization §A-2 — `rules-mgr` is gone. Rules Manager merged
// into System Context as the [Write | Retrieval] segmented control. The nav
// drawer's screen map and the ContextScreenId type no longer carry it.
const CONTEXT_LEAVES: Record<ContextScreenId, Omit<NavLeaf, 'onSelect'>> = {
    sys: { id: 'sys', label: LOTM_EXCLUSIVE_UI ? 'Rules' : 'System Context', icon: ScrollText },
    world: { id: 'world', label: 'Lore', icon: Database },
    eng: { id: 'eng', label: 'Engine Tuning', icon: Sparkles },
    chpt: { id: 'chpt', label: 'Chapters', icon: BookOpen },
    mem: { id: 'mem', label: 'Memory', icon: Brain },
};

const GROUPS: Array<{ id: GroupId; label: string; icon: NavIcon }> = LOTM_EXCLUSIVE_UI
    ? [
        { id: 'world', label: 'World', icon: Database },
        { id: 'play', label: 'Play', icon: Sparkles },
        { id: 'engine', label: 'Engine', icon: Workflow },
        { id: 'mods', label: 'Mods', icon: Workflow },
    ]
    : [
        { id: 'story', label: 'Story', icon: FileText },
        { id: 'world', label: 'World', icon: Database },
        { id: 'play', label: 'Play', icon: Sparkles },
        { id: 'mods', label: 'Mods', icon: Workflow },
    ];

const TIER_CYCLE: Record<AiTier, AiTier> = { lite: 'pro', pro: 'max', max: 'lite' };

function useHeaderEntries(): readonly RegisteredChromeEntry[] {
    return useSyncExternalStore(
        (listener) => subscribeToRegion('header.actions', listener),
        () => readRegion('header.actions'),
        () => readRegion('header.actions'),
    );
}

function useComposerActions(): readonly RegisteredChromeEntry[] {
    return useSyncExternalStore(
        (listener) => subscribeToRegion('composer.actions', listener),
        () => readRegion('composer.actions'),
        () => readRegion('composer.actions'),
    );
}

async function drainPendingCommit(): Promise<void> {
    try {
        const { commitPendingTurn } = await import('../services/turn/pendingCommit');
        await commitPendingTurn().catch((e) => console.warn('[composer.actions] commit drain failed:', e));
    } catch (e) {
        console.warn('[composer.actions] commit drain import failed:', e);
    }
}

function NavRow({ leaf }: { leaf: NavLeaf }) {
    if (leaf.render) return <>{leaf.render()}</>;
    const Icon = leaf.icon;
    return (
        <button
            type="button"
            {...cueNav}
            onClick={leaf.onSelect}
            disabled={leaf.disabled}
            className={`w-full flex items-center gap-2 px-4 py-2 text-left text-[11px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                leaf.active
                    ? 'text-terminal bg-terminal/10 hover:bg-terminal/15'
                    : 'text-text-dim hover:text-terminal hover:bg-terminal/5'
            }`}
        >
            <Icon size={14} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{leaf.label}</span>
            {leaf.badge !== undefined && (
                <span className="min-w-[18px] px-1.5 py-0.5 rounded-full bg-terminal/15 text-terminal text-[9px] font-mono text-center">
                    {leaf.badge}
                </span>
            )}
        </button>
    );
}

export function ContextNavigationDrawer() {
    const drawerOpen = useAppStore((s) => s.drawerOpen);
    const toggleDrawer = useAppStore((s) => s.toggleDrawer);
    const contextScreen = useAppStore((s) => s.contextScreen);
    const openContextScreen = useAppStore((s) => s.openContextScreen);
    const closeContextScreen = useAppStore((s) => s.closeContextScreen);
    const chaptersCount = useAppStore((s) => s.chapters.length);
    const npcCount = useAppStore((s) => s.npcLedger.length);
    const placesCount = useAppStore((s) => s.locationLedger.length);
    const factionsCount = useAppStore((s) => s.factionLedger.length);
    const itemsCount = useAppStore((s) => s.itemLedger.length);
    const pinnedCount = useAppStore((s) => s.pinnedExcerpts.length);
    const messages = useAppStore((s) => s.messages);
    const condenser = useAppStore((s) => s.condenser);
    const setCondensed = useAppStore((s) => s.setCondensed);
    const settings = useAppStore((s) => s.settings);
    const activeCampaignId = useAppStore((s) => s.activeCampaignId);
    const pipelinePhase = useAppStore((s) => s.pipelinePhase);
    const deepArmed = useAppStore((s) => s.deepArmed);
    const setDeepArmed = useAppStore((s) => s.setDeepArmed);
    const armedRoll = useAppStore((s) => s.armedRoll);
    const armedLoot = useAppStore((s) => s.armedLoot);
    const headerEntries = useHeaderEntries();
    const composerEntries = useComposerActions();
    const { t } = useTranslation();
    const { handleOpenArchive } = useChatPersistence();
    const { triggerCondense } = useCondenser({
        messages,
        condenser,
        setCondensed,
    });
    const isStreaming = pipelinePhase !== 'idle';
    const [expanded, setExpanded] = useState<Record<GroupId, boolean>>(LOTM_EXCLUSIVE_UI
        ? { play: true, engine: false, mods: false, story: false, world: true }
        : { story: true, world: true, play: true, mods: false, engine: false }
    );

    const modEntries = useMemo(
        () => headerEntries.filter((entry) => entry.mod !== undefined && !isHeaderStatusEntry(entry)),
        [headerEntries],
    );
    const modCount = useMemo(() => new Set(modEntries.map((entry) => entry.mod?.id)).size, [modEntries]);
    const modT = t as unknown as (key: string, vars?: Record<string, string | number>) => string;

    const aiTier = useAppStore(s => s.settings?.aiTier ?? 'pro') as AiTier;
    const uiViewMode = useAppStore(s => s.settings?.uiViewMode ?? 'gm');
    const playerLocked = IS_DEMO_MODE || uiViewMode === 'player';

    const composerModLeaves: NavLeaf[] = composerEntries
        .filter((entry) => (
            entry.mod !== undefined
            && !COMPOSER_BUILTIN_ID_SET.has(entry.entryId)
            // Host-owned modal in the Play list — keep the mod's strip entry
            // but do not duplicate it as a fire-and-forget nav row.
            && entry.entryId !== 'injectArc'
        ))
        .map((entry) => ({
            id: entry.qualifiedId,
            label: resolveModText(entry.mod!.id, entry.entry.label, modT) ?? entry.mod!.name,
            icon: FileText,
            onSelect: () => {
                drainPendingCommit()
                    .then(() => Promise.resolve(entry.entry.onSelect(entry.context)))
                    .catch(() => undefined);
            },
        }));

    const exclusiveLeaves: Record<GroupId, NavLeaf[]> = {
        play: [
            { ...CONTEXT_LEAVES.chpt, badge: chaptersCount, onSelect: () => openContextScreen('chpt') },
            { id: 'askGm', label: 'Ask GM', icon: Sparkles, onSelect: () => useAppStore.getState().openAskGm() },
            {
                id: 'dice',
                label: 'Dice',
                icon: Dices,
                badge: armedRoll ? 'Armed' : undefined,
                active: !!armedRoll,
                onSelect: () => {
                    const state = useAppStore.getState();
                    if (state.armedRoll) state.setArmedRoll(null);
                    else state.openDiceRollModal();
                },
            },
            {
                id: 'loot',
                label: 'Loot',
                icon: Package,
                badge: armedLoot ? armedLoot.rolls : undefined,
                active: !!armedLoot,
                onSelect: () => useAppStore.getState().openLootRollModal(),
            },
            {
                id: 'injectArc',
                label: 'Inject Arc',
                icon: Syringe,
                onSelect: () => undefined,
                render: () => activeCampaignId ? <ArcInjectorButton layout="nav" /> : null,
            },
            {
                id: 'oneShot',
                label: 'Inject Event',
                icon: Zap,
                onSelect: () => undefined,
                render: () => activeCampaignId ? <OneShotInjectorButton layout="nav" /> : null,
            },
            {
                id: 'absoluteCommand',
                label: 'Absolute Command',
                icon: Sparkles,
                onSelect: () => undefined,
                render: () => activeCampaignId ? <AbsoluteCommandButton layout="nav" /> : null,
            },
            {
                id: 'trim',
                label: 'Trim',
                icon: Scissors,
                disabled: isStreaming || messages.length < 6,
                onSelect: triggerCondense,
            },
            ...(settings?.deepContextSearch
                ? [{
                    id: 'deepSearch',
                    label: deepArmed ? 'Deep search armed' : 'Deep search',
                    icon: Search,
                    badge: deepArmed ? 'Armed' : undefined,
                    active: deepArmed,
                    disabled: isStreaming || !activeCampaignId,
                    onSelect: () => setDeepArmed(!deepArmed),
                } satisfies NavLeaf]
                : []),
            {
                id: 'archive',
                label: 'Archive',
                icon: Scroll,
                disabled: !activeCampaignId,
                onSelect: handleOpenArchive,
            },
            ...composerModLeaves,
        ],
        engine: [
            { ...CONTEXT_LEAVES.sys, onSelect: () => openContextScreen('sys') },
            { ...CONTEXT_LEAVES.world, onSelect: () => openContextScreen('world') },
            { ...CONTEXT_LEAVES.mem, onSelect: () => openContextScreen('mem') },
            { ...CONTEXT_LEAVES.eng, onSelect: () => openContextScreen('eng') },
            { id: 'pinned', label: 'Pinned', icon: Pin, badge: pinnedCount, onSelect: () => useAppStore.getState().togglePinnedMemories() },
            { id: 'backups', label: 'Backups', icon: Archive, onSelect: () => useAppStore.getState().toggleBackupModal() },
            { id: 'blocks', label: 'Blocks', icon: Workflow, onSelect: () => useAppStore.getState().toggleBlockView() },
            { id: 'settings', label: 'Settings', icon: Settings, onSelect: () => useAppStore.getState().toggleSettings() },
            {
                id: 'aiTier',
                label: `AI tier · ${aiTier}`,
                icon: Cpu,
                onSelect: () => useAppStore.getState().updateSettings({ aiTier: TIER_CYCLE[aiTier] }),
            },
        ],
        story: [],
        world: [
            { id: 'character', label: 'Character', icon: UserCircle, onSelect: () => useAppStore.getState().togglePCPanel() },
            { id: 'npcs', label: 'NPCs', icon: Users, badge: npcCount, onSelect: () => useAppStore.getState().toggleNPCLedger() },
            { id: 'places', label: 'Places', icon: MapPin, badge: placesCount, onSelect: () => useAppStore.getState().toggleLocationLedger() },
            { id: 'factions', label: 'Factions', icon: Landmark, badge: factionsCount, onSelect: () => useAppStore.getState().toggleFactionLedger() },
            { id: 'items', label: 'Inventory', icon: Gem, badge: itemsCount, onSelect: () => useAppStore.getState().toggleItemLedger() },
        ],
        mods: modEntries.map((entry) => ({
            id: entry.qualifiedId,
            label: resolveModText(entry.mod!.id, entry.entry.label, modT) ?? entry.mod!.name,
            icon: FileText,
            onSelect: () => { Promise.resolve(entry.entry.onSelect(entry.context)).catch(() => undefined); },
        })),
    };

    const classicLeaves: Record<GroupId, NavLeaf[]> = {
        story: [
            { ...CONTEXT_LEAVES.sys, onSelect: () => openContextScreen('sys') },
            { ...CONTEXT_LEAVES.chpt, badge: chaptersCount, onSelect: () => openContextScreen('chpt') },
            { ...CONTEXT_LEAVES.mem, onSelect: () => openContextScreen('mem') },
        ],
        world: [
            { id: 'npcs', label: 'NPCs', icon: Users, badge: npcCount, onSelect: () => useAppStore.getState().toggleNPCLedger() },
            { id: 'places', label: 'Places', icon: MapPin, badge: placesCount, onSelect: () => useAppStore.getState().toggleLocationLedger() },
            { id: 'factions', label: 'Factions', icon: Landmark, badge: factionsCount, onSelect: () => useAppStore.getState().toggleFactionLedger() },
            { id: 'items', label: 'Inventory', icon: Gem, badge: itemsCount, onSelect: () => useAppStore.getState().toggleItemLedger() },
            { ...CONTEXT_LEAVES.world, onSelect: () => openContextScreen('world') },
        ],
        play: [
            { id: 'character', label: 'Character', icon: UserCircle, onSelect: () => useAppStore.getState().togglePCPanel() },
            { id: 'pinned', label: 'Pinned', icon: Pin, badge: pinnedCount, onSelect: () => useAppStore.getState().togglePinnedMemories() },
            { ...CONTEXT_LEAVES.eng, onSelect: () => openContextScreen('eng') },
        ],
        engine: [],
        mods: exclusiveLeaves.mods,
    };

    const legacyLeaves = LOTM_EXCLUSIVE_UI ? exclusiveLeaves : classicLeaves;

    // WO-screen-modernization §A-2 — `rules-mgr` is no longer a separate
    // screen. RulesTab hosts the [Write | Retrieval] segmented control and
    // embeds RulesManagerTab for the Retrieval mode, so there is one
    // destination instead of two. `RulesTab` takes no `onOpenManager` prop.
    const screenContent = contextScreen === 'sys'
        ? <RulesTab />
        : contextScreen === 'world'
            ? <LoreTab />
            : contextScreen === 'eng'
                ? <EnginesTab />
                : contextScreen === 'chpt'
                    ? <ChapterTab />
                    : contextScreen === 'mem'
                        ? <MemoryTab />
                        : null;
    const screenTitle = contextScreen ? CONTEXT_LEAVES[contextScreen].label : '';

    return (
        <>
            {drawerOpen && (
                <aside className="lotm-play-drawer w-72 max-w-[85vw] bg-surface border-r border-border flex flex-col overflow-hidden shrink-0">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                        <h2 className="text-[11px] text-terminal uppercase tracking-[0.25em] font-bold">
                            {LOTM_EXCLUSIVE_UI ? 'Menu' : '◆ CONTEXT'}
                        </h2>
                        <button type="button" {...cueClose} onClick={toggleDrawer} className="text-text-dim hover:text-terminal text-xs uppercase tracking-wider" title={t('header.drawer.close')} aria-label={t('header.drawer.close')}>×</button>
                    </div>
                    <nav aria-label="Context navigation" className="flex-1 overflow-y-auto py-2">
                        {GROUPS.filter((group) => {
                            if (playerLocked) {
                                if (group.id === 'world' || group.id === 'engine' || group.id === 'mods' || group.id === 'story') {
                                    return false;
                                }
                            }
                            if (group.id === 'mods' && modCount === 0) return false;
                            if (LOTM_EXCLUSIVE_UI && group.id === 'story') return false;
                            return true;
                        }).map((group) => {
                            const GroupIcon = group.icon;
                            const isExpanded = expanded[group.id];
                            const groupBadge = group.id === 'mods' && modCount > 0 ? modCount : undefined;
                            return (
                                <section key={group.id}>
                                    <button
                                        type="button"
                                        {...cueToggle}
                                        onClick={() => setExpanded((current) => ({ ...current, [group.id]: !current[group.id] }))}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-text-primary uppercase tracking-[0.18em] font-bold hover:text-terminal transition-colors"
                                        aria-expanded={isExpanded}
                                    >
                                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                        <GroupIcon size={13} />
                                        <span className="flex-1 text-left">{group.label}</span>
                                        {groupBadge !== undefined && <span className="text-terminal font-mono">{groupBadge}</span>}
                                    </button>
                                    {isExpanded && (
                                        <div className="pb-1">
                                            {legacyLeaves[group.id]
                                                .filter((leaf) => !IS_DEMO_MODE || !['injectArc', 'oneShot', 'absoluteCommand'].includes(leaf.id))
                                                .map((leaf) => <NavRow key={leaf.id} leaf={leaf} />)}
                                            {LOTM_EXCLUSIVE_UI && group.id === 'engine' && (
                                                <div className="px-3 py-2">
                                                    <TokenGauge />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                        {playerLocked && !IS_DEMO_MODE && (
                            <div className="my-1 border-t border-border/60 pt-1">
                                <NavRow leaf={{ id: 'settings', label: 'Settings', icon: Settings, onSelect: () => useAppStore.getState().toggleSettings() }} />
                            </div>
                        )}
                        {!LOTM_EXCLUSIVE_UI && !playerLocked && (
                            <>
                                <div className="my-2 border-t border-border" />
                                <NavRow leaf={{ id: 'backups', label: 'Backups', icon: Archive, onSelect: () => useAppStore.getState().toggleBackupModal() }} />
                                <NavRow leaf={{ id: 'blocks', label: 'Blocks', icon: Workflow, onSelect: () => useAppStore.getState().toggleBlockView() }} />
                            </>
                        )}
                    </nav>
                    {LOTM_EXCLUSIVE_UI && (
                        <div className="border-t border-border shrink-0 py-1">
                            <NavRow leaf={{ id: 'leave', label: 'Leave chronicle', icon: LogOut, onSelect: () => { void exitLotmCampaign(); } }} />
                        </div>
                    )}
                </aside>
            )}
            {contextScreen && (
                <ScreenLightbox
                    title={screenTitle}
                    onClose={closeContextScreen}
                    // These are full working surfaces (a ~3,000-token editor, a
                    // chunk manager, card collections), not dialogs. The default
                    // 90vw/90vh left a ring of backdrop the content could have
                    // used — on a 2133x1200 viewport that measured 213x120px of
                    // margin around a screen whose editor still wanted more room.
                    size="full"
                    // WO-screen-modernization §1 + §A-1 — width is per-screen,
                    // assigned by the shape classification.
                    //   - System Context (sys) is `wide`: §A-1 lays it out as an
                    //     asymmetric 2fr/1fr grid (rules editor LEFT fills height;
                    //     Active Scene Note + Diagnostics RIGHT). The grid needs
                    //     the panel width — `form`'s 1024px cap would squeeze
                    //     the editor to ~683px and re-create the narrow-porthole
                    //     complaint. The editor's own column width self-limits.
                    //   - Collection screens (Lore, Chapters, Engine Tuning) are
                    //     `wide` — their contents tile into card grids that fill
                    //     the width.
                    //   - Memory is `form` — a single-column editor.
                    width={
                        contextScreen === 'sys'
                        || contextScreen === 'world'
                        || contextScreen === 'chpt'
                        || contextScreen === 'eng'
                            ? 'wide'
                            : 'form'
                    }
                >
                    {screenContent}
                </ScreenLightbox>
            )}
        </>
    );
}
