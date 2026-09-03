import { BookOpen, Clock, Cpu, PanelLeftClose, PanelLeftOpen, Save, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { deleteCampaign, saveCampaignState } from '../../store/campaignStore';
import { useChatPersistence } from '../../hooks/useChatPersistence';
import type { AiTier } from '../../types/llm';
import { DEMO_SESSION_WARN_MS, IS_DEMO_MODE, formatDemoCountdown } from '../../config/demoMode';
import { useDemoRemainingMs } from '../../services/demo/demoSessionClock';
import { getDemoSessionId, purgeDemoSessionCampaigns } from '../../services/demo/demoSession';

const TIER_CYCLE: Record<AiTier, AiTier> = { lite: 'pro', pro: 'max', max: 'lite' };

export function LotmPlayHeader() {
    const drawerOpen = useAppStore(s => s.drawerOpen);
    const toggleDrawer = useAppStore(s => s.toggleDrawer);
    const campaignName = useAppStore(s => s.activeCampaignMeta?.name);
    const indexing = useAppStore(s => !!s.lotmWorldIndexLock?.campaignId);
    const chronicleOpen = useAppStore(s => s.lotmChronicleOpen);
    const setLotmChronicleOpen = useAppStore(s => s.setLotmChronicleOpen);
    const aiTier = (useAppStore(s => s.settings?.aiTier) ?? 'pro') as AiTier;
    const updateSettings = useAppStore(s => s.updateSettings);
    const { isSaving, handleForceSave } = useChatPersistence();
    const demoExpiresAt = useAppStore(s => s.demoSessionExpiresAt);
    const demoRemainingMs = useDemoRemainingMs(IS_DEMO_MODE ? demoExpiresAt : null);
    const demoClock = demoRemainingMs !== null ? formatDemoCountdown(demoRemainingMs) : null;
    const demoWarning = demoRemainingMs !== null && demoRemainingMs <= DEMO_SESSION_WARN_MS;

    return (
        <header className="lotm-play-header">
            {!indexing && (
                <button
                    type="button"
                    className="lotm-play-header-menu"
                    onClick={toggleDrawer}
                    title={drawerOpen ? 'Close menu' : 'Open menu'}
                    aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
                >
                    {drawerOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
                </button>
            )}
            <div className="lotm-play-header-titles">
                <p className="lotm-play-header-kicker">Lord of the Mysteries</p>
                {campaignName && <h1>{campaignName}</h1>}
            </div>
            {!indexing && (
                <div className="lotm-play-header-actions">
                    {IS_DEMO_MODE && demoClock && (
                        <p
                            className={`lotm-play-header-demo-clock${demoWarning ? ' is-warning' : ''}`}
                            aria-live="polite"
                            title={`Demo session remaining ${demoClock}`}
                        >
                            <Clock size={13} />
                            <span>Demo {demoClock}</span>
                        </p>
                    )}
                    {!IS_DEMO_MODE && (
                    <button
                        type="button"
                        className="lotm-play-header-save"
                        onClick={handleForceSave}
                        disabled={isSaving}
                        title={isSaving ? 'Saving campaign' : 'Save campaign'}
                        aria-label={isSaving ? 'Saving campaign' : 'Save campaign'}
                    >
                        <Save size={13} />
                        <span>{isSaving ? 'Saving' : 'Save'}</span>
                    </button>
                    )}
                    <button
                        type="button"
                        className="lotm-play-header-grimoire"
                        onClick={() => useAppStore.getState().openPlayerGrimoire()}
                        title="Open Player Grimoire"
                        aria-label="Open Player Grimoire"
                    >
                        <BookOpen size={13} />
                        <span>Grimoire</span>
                    </button>
                    <button
                        type="button"
                        className="lotm-play-header-askgm"
                        onClick={() => useAppStore.getState().openAskGm()}
                        title="Ask GM"
                        aria-label="Ask GM"
                    >
                        <Sparkles size={13} />
                        <span>Ask GM</span>
                    </button>
                    {!IS_DEMO_MODE && (
                    <div className="lotm-play-header-view" role="group" aria-label="Play view">
                        <button
                            type="button"
                            className={!chronicleOpen ? 'is-active' : undefined}
                            aria-pressed={!chronicleOpen}
                            onClick={() => setLotmChronicleOpen(false)}
                        >
                            Illustrated
                        </button>
                        <button
                            type="button"
                            className={chronicleOpen ? 'is-active' : undefined}
                            aria-pressed={chronicleOpen}
                            onClick={() => setLotmChronicleOpen(true)}
                        >
                            Chronicle
                        </button>
                    </div>
                    )}
                    {!IS_DEMO_MODE && (
                    <button
                        type="button"
                        className="lotm-play-header-tier"
                        onClick={() => updateSettings({ aiTier: TIER_CYCLE[aiTier] })}
                        title={`AI Tier: ${aiTier.toUpperCase()} (click to cycle Lite → Pro → Max)`}
                        aria-label={`AI Tier: ${aiTier}, click to cycle`}
                    >
                        <Cpu size={13} />
                        <span>{aiTier}</span>
                    </button>
                    )}
                </div>
            )}
        </header>
    );
}

export async function exitLotmCampaign(): Promise<void> {
    const {
        activeCampaignId,
        context,
        messages,
        condenser,
        pinnedExcerpts,
        divergenceRegister,
        setActiveCampaign,
    } = useAppStore.getState();
    if (activeCampaignId && !IS_DEMO_MODE) {
        await saveCampaignState(activeCampaignId, { context, messages, condenser, pinnedExcerpts });
        if (divergenceRegister && (divergenceRegister.entries.length > 0 || (divergenceRegister.prunedLog ?? []).length > 0)) {
            try {
                const { saveDivergenceRegister } = await import('../../store/campaignStore');
                await saveDivergenceRegister(activeCampaignId, divergenceRegister);
            } catch (e) {
                console.warn('[LotmPlayHeader] saveDivergenceRegister failed:', e);
            }
        }
    }
    const departingId = activeCampaignId;
    useAppStore.getState().endLotmWorldIndex();
    useAppStore.getState().setLotmChronicleOpen(false);
    useAppStore.getState().closeGrimoire();
    useAppStore.getState().closePlayerGrimoire();
    setActiveCampaign(null);
    if (IS_DEMO_MODE) {
        useAppStore.getState().setDemoSessionExpiresAt(null);
        if (departingId) {
            try {
                await deleteCampaign(departingId);
            } catch (e) {
                console.warn('[LotmPlayHeader] demo deleteCampaign failed:', e);
            }
        }
        try {
            await purgeDemoSessionCampaigns(getDemoSessionId());
        } catch (e) {
            console.warn('[LotmPlayHeader] demo session purge failed:', e);
        }
    }
}
