import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    DEMO_OCCUPANCY_STALE_MS,
    acquireDemoOccupancy,
    getDemoOccupancy,
    heartbeatDemoOccupancy,
    ownsDemoOccupancy,
    releaseDemoOccupancy,
    resetDemoOccupancy,
    setDemoOccupancyNow,
} from '../lib/demoOccupancy.js';

const A = 'demo_session_aaa';
const B = 'demo_session_bbb';

describe('demo occupancy lock', () => {
    let now = 1_000_000;
    const previousSessionMs = process.env.DEMO_SESSION_MS;

    beforeEach(() => {
        now = 1_000_000;
        process.env.DEMO_SESSION_MS = '300000';
        resetDemoOccupancy();
        setDemoOccupancyNow(() => now);
    });

    afterEach(() => {
        resetDemoOccupancy();
        if (previousSessionMs === undefined) delete process.env.DEMO_SESSION_MS;
        else process.env.DEMO_SESSION_MS = previousSessionMs;
    });

    it('is free until acquired', () => {
        expect(getDemoOccupancy(A)).toEqual({
            occupied: false,
            yours: false,
            remainingMs: 0,
            expiresAt: null,
        });
    });

    it('lets the first session acquire and rejects a second', () => {
        const first = acquireDemoOccupancy(A);
        expect(first.ok).toBe(true);
        expect(first.occupancy.yours).toBe(true);
        expect(first.occupancy.remainingMs).toBe(300000);
        expect(ownsDemoOccupancy(A)).toBe(true);

        const second = acquireDemoOccupancy(B);
        expect(second.ok).toBe(false);
        expect(second.status).toBe(409);
        expect(second.error).toBe('demo_occupied');
        expect(second.occupancy.yours).toBe(false);
        expect(ownsDemoOccupancy(B)).toBe(false);
    });

    it('re-acquires for the same session without resetting the hard cap', () => {
        acquireDemoOccupancy(A);
        now += 30_000;
        const again = acquireDemoOccupancy(A);
        expect(again.ok).toBe(true);
        expect(again.occupancy.remainingMs).toBe(270000);
    });

    it('heartbeat extends the stale window but not the hard cap', () => {
        acquireDemoOccupancy(A);
        now += DEMO_OCCUPANCY_STALE_MS - 5_000;
        const beat = heartbeatDemoOccupancy(A);
        expect(beat.ok).toBe(true);

        now += DEMO_OCCUPANCY_STALE_MS - 5_000;
        expect(getDemoOccupancy(B).occupied).toBe(true);

        now += 10_000;
        expect(getDemoOccupancy(B).occupied).toBe(false);
        expect(acquireDemoOccupancy(B).ok).toBe(true);
    });

    it('expires at the hard cap even with heartbeats', () => {
        acquireDemoOccupancy(A);
        for (let elapsed = 40_000; elapsed < 300_000; elapsed += 40_000) {
            now = 1_000_000 + elapsed;
            expect(heartbeatDemoOccupancy(A).ok).toBe(true);
        }
        now = 1_000_000 + 301_000;
        expect(getDemoOccupancy(A).occupied).toBe(false);
        expect(heartbeatDemoOccupancy(A).ok).toBe(false);
        expect(heartbeatDemoOccupancy(A).status).toBe(404);
    });

    it('releases on explicit delete so another session can start', () => {
        acquireDemoOccupancy(A);
        releaseDemoOccupancy(A);
        expect(getDemoOccupancy(B).occupied).toBe(false);
        expect(acquireDemoOccupancy(B).ok).toBe(true);
    });

    it('rejects invalid session ids', () => {
        expect(acquireDemoOccupancy('short').status).toBe(400);
        expect(heartbeatDemoOccupancy('').status).toBe(400);
    });
});
