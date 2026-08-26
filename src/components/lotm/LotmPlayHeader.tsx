import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { saveCampaignState } from '../../store/campaignStore';

export function LotmPlayHeader() {
    const drawerOpen = useAppStore(s => s.drawerOpen);
    const toggleDrawer = useAppStore(s => s.toggleDrawer);
    const campaignName = useAppStore(s => s.activeCampaignMeta?.name);

    return (
        <header className="lotm-play-header">
            <button
                type="button"
                className="lotm-play-header-menu"
                onClick={toggleDrawer}
                title={drawerOpen ? 'Close menu' : 'Open menu'}
                aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            >
                {drawerOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
            <div className="lotm-play-header-titles">
                <p className="lotm-play-header-kicker">Lord of the Mysteries</p>
                {campaignName && <h1>{campaignName}</h1>}
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
    setActiveCampaign(null);
}
