import { DEMO_SESSION_ID_RE, demoSessionMs } from './demoMode.js';

export const DEMO_OCCUPANCY_STALE_MS = 45 * 1000;

/** @typedef {{ sessionId: string, startedAt: number, expiresAt: number, lastSeenAt: number }} DemoOccupancyLock */

/** @type {DemoOccupancyLock | null} */
let lock = null;
let nowFn = () => Date.now();

export function setDemoOccupancyNow(fn) {
    nowFn = typeof fn === 'function' ? fn : () => Date.now();
}

export function resetDemoOccupancy() {
    lock = null;
    nowFn = () => Date.now();
}

function now() {
    return nowFn();
}

function snapshot(live, sessionId) {
    const remainingMs = Math.max(0, live.expiresAt - now());
    return {
        occupied: true,
        yours: !!sessionId && live.sessionId === sessionId,
        remainingMs,
        expiresAt: live.expiresAt,
    };
}

function emptyOccupancy() {
    return { occupied: false, yours: false, remainingMs: 0, expiresAt: null };
}

/**
 * Drop the lock if the hard cap elapsed or the holder went silent.
 * @returns {DemoOccupancyLock | null}
 */
export function liveDemoOccupancy() {
    if (!lock) return null;
    const t = now();
    if (t >= lock.expiresAt) {
        lock = null;
        return null;
    }
    if (t - lock.lastSeenAt >= DEMO_OCCUPANCY_STALE_MS) {
        lock = null;
        return null;
    }
    return lock;
}

export function getDemoOccupancy(sessionId) {
    const live = liveDemoOccupancy();
    if (!live) return emptyOccupancy();
    return snapshot(live, sessionId);
}

export function ownsDemoOccupancy(sessionId) {
    if (!sessionId || !DEMO_SESSION_ID_RE.test(sessionId)) return false;
    const live = liveDemoOccupancy();
    return !!live && live.sessionId === sessionId;
}

export function acquireDemoOccupancy(sessionId) {
    if (!sessionId || !DEMO_SESSION_ID_RE.test(sessionId)) {
        return { ok: false, status: 400, error: 'Invalid session id' };
    }
    const live = liveDemoOccupancy();
    const t = now();
    if (live && live.sessionId !== sessionId) {
        return { ok: false, status: 409, error: 'demo_occupied', occupancy: snapshot(live, sessionId) };
    }
    if (live && live.sessionId === sessionId) {
        live.lastSeenAt = t;
        return { ok: true, occupancy: snapshot(live, sessionId) };
    }
    const duration = demoSessionMs();
    lock = {
        sessionId,
        startedAt: t,
        expiresAt: t + duration,
        lastSeenAt: t,
    };
    return { ok: true, occupancy: snapshot(lock, sessionId) };
}

export function heartbeatDemoOccupancy(sessionId) {
    if (!sessionId || !DEMO_SESSION_ID_RE.test(sessionId)) {
        return { ok: false, status: 400, error: 'Invalid session id' };
    }
    const live = liveDemoOccupancy();
    if (!live) return { ok: false, status: 404, error: 'No active demo session' };
    if (live.sessionId !== sessionId) {
        return { ok: false, status: 409, error: 'demo_occupied', occupancy: snapshot(live, sessionId) };
    }
    live.lastSeenAt = now();
    return { ok: true, occupancy: snapshot(live, sessionId) };
}

export function releaseDemoOccupancy(sessionId) {
    if (lock && (!sessionId || lock.sessionId === sessionId)) {
        lock = null;
    }
    return { ok: true };
}
