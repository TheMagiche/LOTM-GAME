import { Cpu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { saveCampaignState } from '../../store/campaignStore';
import type { AiTier } from '../../types/llm';

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

    return (
        <header className="lotm-play-header">
            <button
                type="button"
                className="lotm-play-header-menu"
                onClick={toggleDrawer}
                disabled={indexing}
                title={indexing ? 'Indexing the world' : drawerOpen ? 'Close menu' : 'Open menu'}
                aria-label={indexing ? 'Open menu unavailable while indexing' : drawerOpen ? 'Close menu' : 'Open menu'}
            >
                {drawerOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
            <div className="lotm-play-header-titles">
                <p className="lotm-play-header-kicker">Lord of the Mysteries</p>
                {campaignName && <h1>{campaignName}</h1>}
            </div>
            <div className="lotm-play-header-actions">
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
            </div>
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
    if (activeCampaignId) {
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
    useAppStore.getState().endLotmWorldIndex();
    useAppStore.getState().setLotmChronicleOpen(false);
    setActiveCampaign(null);
}
