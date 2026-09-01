import { API_BASE as API } from '../../lib/apiBase';
import { deleteCampaign, listCampaigns } from '../../store/campaignStore';
import { DEMO_SESSION_STORAGE_KEY, IS_DEMO_MODE } from '../../config/demoMode';

export function getDemoSessionId(): string {
    if (typeof sessionStorage === 'undefined') return 'demo-session';
    const existing = sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `demo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, id);
    return id;
}

export async function purgeDemoSessionCampaigns(sessionId = getDemoSessionId()): Promise<void> {
    if (!IS_DEMO_MODE) return;
    try {
        const res = await fetch(`${API}/demo/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
        if (res.ok) return;
    } catch {
        /* fall through to client-side delete */
    }
    try {
        const campaigns = await listCampaigns();
        const mine = campaigns.filter(c => c.demoSessionId === sessionId);
        await Promise.all(mine.map(c => deleteCampaign(c.id)));
    } catch (err) {
        console.warn('[demo] failed to purge session campaigns:', err);
    }
}
