import { useCallback, useEffect, useState } from 'react';
import { API_BASE as API } from '../../lib/apiBase';
import { exitLotmCampaign } from '../lotm/LotmPlayHeader';
import { DEMO_IDLE_MS, DEMO_IDLE_WARN_MS, IS_DEMO_MODE } from '../../config/demoMode';
import { getDemoSessionId, purgeDemoSessionCampaigns } from '../../services/demo/demoSession';
import { DemoIdleWarningModal } from './DemoIdleWarningModal';

export function DemoSessionGuard() {
    const [warningOpen, setWarningOpen] = useState(false);

    const logout = useCallback(async () => {
        setWarningOpen(false);
        await exitLotmCampaign();
        await purgeDemoSessionCampaigns(getDemoSessionId());
    }, []);

    useEffect(() => {
        if (!IS_DEMO_MODE) return;
        getDemoSessionId();

        let lastActivity = Date.now();
        const onActivity = () => {
            lastActivity = Date.now();
            setWarningOpen(false);
        };
        const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'mousemove', 'touchstart'];
        for (const event of events) window.addEventListener(event, onActivity, { passive: true });
        const onVisibility = () => {
            if (document.visibilityState === 'visible') onActivity();
        };
        document.addEventListener('visibilitychange', onVisibility);

        const timer = window.setInterval(() => {
            const idle = Date.now() - lastActivity;
            if (idle >= DEMO_IDLE_MS) {
                void logout();
                return;
            }
            if (idle >= DEMO_IDLE_MS - DEMO_IDLE_WARN_MS) {
                setWarningOpen(true);
            }
        }, 15_000);

        return () => {
            window.clearInterval(timer);
            for (const event of events) window.removeEventListener(event, onActivity);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [logout]);

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
        };
        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, []);

    if (!IS_DEMO_MODE) return null;
    return (
        <DemoIdleWarningModal
            open={warningOpen}
            onStay={() => setWarningOpen(false)}
            onLeave={() => { void logout(); }}
        />
    );
}
