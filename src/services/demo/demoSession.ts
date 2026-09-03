import { API_BASE as API } from '../../lib/apiBase';
import { deleteCampaign, listCampaigns } from '../../store/campaignStore';
import { DEMO_SESSION_STORAGE_KEY, IS_DEMO_MODE } from '../../config/demoMode';

export type DemoOccupancy = {
    occupied: boolean;
    yours: boolean;
    remainingMs: number;
    expiresAt: number | null;
};

export class DemoOccupiedError extends Error {
    remainingMs: number;
    expiresAt: number | null;

    constructor(remainingMs = 0, expiresAt: number | null = null) {
        super('demo_occupied');
        this.name = 'DemoOccupiedError';
        this.remainingMs = remainingMs;
        this.expiresAt = expiresAt;
    }
}

const EMPTY_OCCUPANCY: DemoOccupancy = {
    occupied: false,
    yours: false,
    remainingMs: 0,
    expiresAt: null,
};

function normalizeOccupancy(raw: unknown): DemoOccupancy {
    if (!raw || typeof raw !== 'object') return EMPTY_OCCUPANCY;
    const body = raw as Record<string, unknown>;
    const expiresAt = Number(body.expiresAt);
    return {
        occupied: body.occupied === true,
        yours: body.yours === true,
        remainingMs: Math.max(0, Number(body.remainingMs) || 0),
        expiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null,
    };
}

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

export async function getDemoOccupancy(sessionId = getDemoSessionId()): Promise<DemoOccupancy> {
    if (!IS_DEMO_MODE) return EMPTY_OCCUPANCY;
    try {
        const res = await fetch(`${API}/demo/occupancy?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return EMPTY_OCCUPANCY;
        return normalizeOccupancy(await res.json());
    } catch {
        return EMPTY_OCCUPANCY;
    }
}

export async function acquireDemoOccupancy(sessionId = getDemoSessionId()): Promise<DemoOccupancy> {
    const res = await fetch(`${API}/demo/occupancy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
    });
    const body = await res.json().catch(() => ({}));
    const occupancy = normalizeOccupancy(body);
    if (res.status === 409) {
        throw new DemoOccupiedError(occupancy.remainingMs, occupancy.expiresAt);
    }
    if (!res.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Failed to start demo session');
    }
    return occupancy;
}

export type DemoHeartbeatResult =
    | { ok: true; occupancy: DemoOccupancy }
    | { ok: false; lost: boolean };

export async function heartbeatDemoOccupancy(sessionId = getDemoSessionId()): Promise<DemoHeartbeatResult> {
    try {
        const res = await fetch(`${API}/demo/occupancy/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });
        if (res.status === 404 || res.status === 409) return { ok: false, lost: true };
        if (!res.ok) return { ok: false, lost: false };
        return { ok: true, occupancy: normalizeOccupancy(await res.json()) };
    } catch {
        return { ok: false, lost: false };
    }
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
