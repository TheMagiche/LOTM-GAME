import './index.css';
import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { CampaignHub } from './components/CampaignHub';
import { Header } from './components/Header';
import { ContextNavigationDrawer as ContextDrawer } from './components/ContextNavigationDrawer';
import { ChatArea } from './components/ChatArea';
import { LotmIllustratedShell } from './components/lotm/LotmIllustratedShell';
import { LotmGrimoire } from './components/lotm/LotmGrimoire';
import { LotmPlayerGrimoire } from './components/lotm/LotmPlayerGrimoire';
import { SettingsModal } from './components/SettingsModal';
import { ChatRightRail } from './components/ChatRightRail';
import { WindowManager } from './components/WindowManager';
import { NPCLedgerModal } from './components/NPCLedgerModal';
import { CharacterLedgerModal } from './components/character/CharacterLedgerModal';
import { LocationLedgerModal } from './components/LocationLedgerModal';
import { FactionLedgerModal } from './components/FactionLedgerModal';
import { InventoryLedgerModal } from './components/InventoryLedgerModal';
import { BlockViewModal } from './components/block-view/BlockViewModal';
import { BackupModal } from './components/BackupModal';
import { LoreCheckModal } from './components/LoreCheckModal';
import { DivergenceReviewModal } from './components/DivergenceReviewModal';
import { CreateTroubleModal } from './components/CreateTroubleModal';
import { RenameNpcModal } from './components/RenameNpcModal';
import { PinnedMemoriesPanel } from './components/PinnedMemoriesPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { IndexingSpeedPrompt } from './components/IndexingSpeedPrompt';
import { VaultUnlockModal } from './components/VaultUnlockModal';
import { DemoOnboardingModal } from './components/demo/DemoOnboardingModal';
import { DemoSessionGuard } from './components/demo/DemoSessionGuard';
// import { MapPanel } from './components/map/MapPanel';
import { hydrateCampaign } from './store/campaignHydrator';
import { useRulesIndexer } from './hooks/useRulesIndexer';
import { loadBackground } from './services/background/backgroundManager';
import { refreshMods } from './services/mods/modBootstrap';
import { isLotmCampaign, shouldUseIllustratedShell } from './services/lotm/lotmSkin';
import { applyLotmExclusiveDocumentChrome, LOTM_EXCLUSIVE_UI } from './services/lotm/lotmExclusiveUi';
import { getCampaign } from './store/campaignStore';
import { IS_DEMO_MODE } from './config/demoMode';
import { useUiSounds } from './hooks/useUiSounds';

export default function App() {
  useUiSounds();
  const activeCampaignId = useAppStore((s) => s.activeCampaignId);
  const activeCampaignMeta = useAppStore((s) => s.activeCampaignMeta);
  useRulesIndexer();
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const vaultStatus = useAppStore((s) => s.vaultStatus);
  const checkVaultStatus = useAppStore((s) => s.checkVaultStatus);
  const unlockVaultWithRemembered = useAppStore((s) => s.unlockVaultWithRemembered);
  const unlockVault = useAppStore((s) => s.unlockVault);
  const resetVault = useAppStore((s) => s.resetVault);
  const pinnedMemoriesOpen = useAppStore((s) => s.pinnedMemoriesOpen);
  const closePinnedMemories = useAppStore((s) => s.closePinnedMemories);

  // True once campaign state has been hydrated into Zustand (or there's no campaign to hydrate)
  const [campaignLoaded, setCampaignLoaded] = useState(false);
  const [isCheckingVault, setIsCheckingVault] = useState(false);

  // Initial load: check vault status after settings load
  useEffect(() => {
    if (!settingsLoaded) return;
    
    const checkVault = async () => {
      setIsCheckingVault(true);
      await checkVaultStatus();
      setIsCheckingVault(false);
    };
    
    checkVault();
  }, [settingsLoaded, checkVaultStatus]);

  // Try to unlock with remembered key if vault exists and has remembered key
  useEffect(() => {
    if (vaultStatus?.exists && vaultStatus?.hasRemember && !vaultStatus?.unlocked && !isCheckingVault) {
      unlockVaultWithRemembered();
    }
  }, [vaultStatus, unlockVaultWithRemembered, isCheckingVault]);

  useEffect(() => {
    if (LOTM_EXCLUSIVE_UI) applyLotmExclusiveDocumentChrome();
    loadSettings();
  }, [loadSettings]);

  // Apply the persisted chat background image (if any) once on mount.
  useEffect(() => {
    loadBackground();
  }, []);

  // Project 2: register installed mods as prompt-contribution modules once on mount.
  // The Extensions screen refreshes this too, but a user who never opens that screen must
  // still get the mods they installed — without this, a mod would be listed but never reach
  // the prompt. `refreshMods` never throws; an unreachable endpoint is reported, not fatal.
  //
  // Gated on `settingsLoaded` because `refreshMods` READS `settings.moduleEnabled` — to
  // decide which mods reach the prompt and which get their `activate` hook fired. Firing it
  // in the same tick as `loadSettings()` meant it read an empty map and registered against
  // defaults: a mod the user had switched off still activated, and a switched-ON dev fixture
  // stayed filtered out, until something else happened to call `refreshMods` again.
  // `settingsLoaded` flips to true on every path through `loadSettings`, including the
  // failure and no-stored-settings paths, so this cannot strand the mod layer.
  useEffect(() => {
    if (!settingsLoaded) return;
    refreshMods();
  }, [settingsLoaded]);

  const theme = useAppStore((s) => s.settings?.theme);
  const illustrated = LOTM_EXCLUSIVE_UI || shouldUseIllustratedShell(activeCampaignMeta);

  useEffect(() => {
    if (LOTM_EXCLUSIVE_UI) {
      applyLotmExclusiveDocumentChrome();
      return;
    }
    if (illustrated) {
      document.documentElement.setAttribute('data-ui-skin', 'lotm-illustrated');
    } else {
      document.documentElement.removeAttribute('data-ui-skin');
    }
    return () => {
      document.documentElement.removeAttribute('data-ui-skin');
    };
  }, [illustrated, settingsLoaded, theme]);

  // After settings load, if we already have an activeCampaignId (restored from a previous
  // session), we MUST load the campaign's data before rendering ChatArea.
  // Without this guard, the empty Zustand defaults would race against any auto-save
  // and silently overwrite the real saved data into the DB.
  useEffect(() => {
    if (!settingsLoaded) return;

    if (!activeCampaignId) {
      // No campaign active — hub will be shown, nothing to hydrate
      // The state is only used by the campaign branch below; keep the existing
      // synchronous initialization explicit for the no-campaign path.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCampaignLoaded(true);
      return;
    }

    let cancelled = false;
    // Hydration owns this transition; the async cleanup below prevents stale
    // completion from marking a different campaign as ready.
    setCampaignLoaded(false);

    (async () => {
      if (LOTM_EXCLUSIVE_UI) {
        const meta = await getCampaign(activeCampaignId);
        if (cancelled) return;
        if (!isLotmCampaign(meta)) {
          useAppStore.getState().setActiveCampaign(null);
          setCampaignLoaded(true);
          return;
        }
      }
      await hydrateCampaign(activeCampaignId);
      if (cancelled) return;
      setCampaignLoaded(true);
      // Swipe Generation v1 — reconcile any pending commit left over from a
      // crash / renderer death mid-browse. Must come AFTER hydration so the
      // store has messages. Non-fatal: a failed reconcile just logs a warning
      // (the pendingCommit marker stays on the message; the next send will
      // still commit it).
      import('./services/turn/pendingCommit')
        .then(({ reconcilePendingCommitOnLaunch }) => reconcilePendingCommitOnLaunch())
        .catch(e => console.warn('[Reconcile] failed:', e));
    })();

    return () => { cancelled = true; };
    // Only re-run when the session first loads (settingsLoaded flips to true).
    // We don't re-run on activeCampaignId changes because CampaignHub.handleSelectCampaign
    // already handles hydration when the user picks a campaign manually.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  // Show loading while checking vault or settings
  if (!settingsLoaded || isCheckingVault) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">
        <div className="text-lg animate-pulse">Loading…</div>
      </div>
    );
  }

  // Show vault unlock if vault exists but is locked and no remembered key
  if (vaultStatus && vaultStatus.exists && !vaultStatus.unlocked && !vaultStatus.hasRemember) {
    return (
      <div className="min-h-screen bg-void">
        <VaultUnlockModal
          onUnlock={async (password, remember) => {
            return await unlockVault(password, remember);
          }}
          onUseMachineKey={async () => {
            // Machine key mode - unlock with null password
            return await unlockVault('', false);
          }}
          onResetVault={resetVault}
          hasRememberedKey={false}
        />
      </div>
    );
  }

  // If campaign is still loading (but vault is ready), show loading
  if (!campaignLoaded && activeCampaignId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">
        <div className="text-lg animate-pulse">Loading campaign…</div>
      </div>
    );
  }

  if (!activeCampaignId) {
    return (
      <ErrorBoundary>
        <CampaignHub />
        {!IS_DEMO_MODE && <SettingsModal />}
        {IS_DEMO_MODE && <DemoOnboardingModal />}
        {IS_DEMO_MODE && <DemoSessionGuard />}
        {LOTM_EXCLUSIVE_UI && <LotmGrimoire />}
        {!LOTM_EXCLUSIVE_UI && <BackupModal />}
        <ToastContainer />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ContextDrawer />
        {illustrated ? <LotmIllustratedShell /> : <ChatArea />}
        {!LOTM_EXCLUSIVE_UI && <ChatRightRail />}
      </div>
      {/* Phase 4.5 — `window.layer`. Renders null when no mod has opened a
          floating window (MOUNTS.md §2.8), so zero-mod DOM is byte-identical
          to pre-4.5. Sits beside the modals below; pointer-events-none layer
          so the chat underneath stays interactive. */}
      <WindowManager />
      {/* <MapPanel /> */}
      {!IS_DEMO_MODE && <SettingsModal />}
      {IS_DEMO_MODE && <DemoOnboardingModal />}
      {IS_DEMO_MODE && <DemoSessionGuard />}
      {LOTM_EXCLUSIVE_UI && <LotmGrimoire />}
      {LOTM_EXCLUSIVE_UI && <LotmPlayerGrimoire />}
      <NPCLedgerModal />
      <CharacterLedgerModal />
      <LocationLedgerModal />
      <FactionLedgerModal />
      <InventoryLedgerModal />
      <BlockViewModal />
      {!IS_DEMO_MODE && <BackupModal />}
      <LoreCheckModal />
      <DivergenceReviewModal />
      <CreateTroubleModal />
      <RenameNpcModal />
      <PinnedMemoriesPanel
        open={pinnedMemoriesOpen}
        onClose={closePinnedMemories}
      />
      <ToastContainer />
      {!IS_DEMO_MODE && <IndexingSpeedPrompt />}
    </ErrorBoundary>
  );
}
