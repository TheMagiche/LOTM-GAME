import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE as API } from '../../lib/apiBase';
import { exitLotmCampaign } from '../lotm/LotmPlayHeader';
import { DEMO_SESSION_WARN_MS, IS_DEMO_MODE } from '../../config/demoMode';
import { getDemoSessionId, heartbeatDemoOccupancy, purgeDemoSessionCampaigns } from '../../services/demo/demoSession';
import { useAppStore } from '../../store/useAppStore';
import { DemoIdleWarningModal } from './DemoIdleWarningModal';

export function DemoSessionGuard() {
    const [warningOpen, setWarningOpen] = useState(false);
    const [warningDismissed, setWarningDismissed] = useState(false);
    const loggingOut = useRef(false);
    const activeCampaignId = useAppStore(s => s.activeCampaignId);
    const demoExpiresAt = useAppStore(s => s.demoSessionExpiresAt);

    const logout = useCallback(async () => {
        if (loggingOut.current) return;
        loggingOut.current = true;
        setWarningOpen(false);
        useAppStore.getState().setDemoSessionExpiresAt(null);
        await exitLotmCampaign();
        await purgeDemoSessionCampaigns(getDemoSessionId());
        loggingOut.current = false;
    }, []);

    useEffect(() => {
        if (!IS_DEMO_MODE || !activeCampaignId) return;
        let cancelled = false;

        const beat = async () => {
            const result = await heartbeatDemoOccupancy(getDemoSessionId());
            if (cancelled) return;
            if (result.ok) {
                useAppStore.getState().setDemoSessionExpiresAt(result.occupancy.expiresAt);
                return;
            }
            if (result.lost) void logout();
        };

        void beat();
        const timer = window.setInterval(() => { void beat(); }, 15_000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [activeCampaignId, logout]);

    useEffect(() => {
        if (!IS_DEMO_MODE || !demoExpiresAt || !activeCampaignId) {
            setWarningOpen(false);
            setWarningDismissed(false);
            return;
        }

        const tick = () => {
            const remaining = demoExpiresAt - Date.now();
            if (remaining <= 0) {
                void logout();
                return;
            }
            if (remaining <= DEMO_SESSION_WARN_MS && !warningDismissed) {
                setWarningOpen(true);
            }
        };

        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }, [activeCampaignId, demoExpiresAt, logout, warningDismissed]);

    useEffect(() => {
        if (!IS_DEMO_MODE) return;
        const onPageHide = () => {
            const id = getDemoSessionId();
            try {
                void fetch(`${API}/demo/session/${encodeURIComponent(id)}`, {
                    method: 'DELETE',
                    keepalive: true,
                });
            } catch { /* unload */ }
            useAppStore.getState().setDemoSessionExpiresAt(null);
        };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, []);

    if (!IS_DEMO_MODE) return null;
    return (
        <DemoIdleWarningModal
            open={warningOpen}
            expiresAt={demoExpiresAt}
            remainingMs={demoExpiresAt ? Math.max(0, demoExpiresAt - Date.now()) : 0}
            onStay={() => {
                setWarningOpen(false);
                setWarningDismissed(true);
            }}
            onLeave={() => { void logout(); }}
        />
    );
}
