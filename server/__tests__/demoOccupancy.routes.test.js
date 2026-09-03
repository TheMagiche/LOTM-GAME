import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const A = 'demo_session_aaa';
const B = 'demo_session_bbb';

describe('demo occupancy routes', () => {
    let app;
    let tmpDir;
    let originalDataDir;
    let originalDemoMode;
    let originalSessionMs;
    let resetDemoOccupancy;

    beforeEach(async () => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lotm-demo-occ-'));
        originalDataDir = process.env.DATA_DIR;
        originalDemoMode = process.env.DEMO_MODE;
        originalSessionMs = process.env.DEMO_SESSION_MS;
        process.env.DATA_DIR = tmpDir;
        process.env.DEMO_MODE = '1';
        process.env.DEMO_SESSION_MS = '300000';
        vi.resetModules();

        const occupancy = await import('../lib/demoOccupancy.js');
        resetDemoOccupancy = occupancy.resetDemoOccupancy;
        occupancy.resetDemoOccupancy();

        const { createDemoSessionRouter } = await import('../routes/demoSession.js');
        const { createCampaignsRouter } = await import('../routes/campaigns.js');
        app = express();
        app.use(express.json());
        app.use(createDemoSessionRouter());
        app.use(createCampaignsRouter());
    });

    afterEach(() => {
        resetDemoOccupancy?.();
        if (originalDataDir === undefined) delete process.env.DATA_DIR;
        else process.env.DATA_DIR = originalDataDir;
        if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
        else process.env.DEMO_MODE = originalDemoMode;
        if (originalSessionMs === undefined) delete process.env.DEMO_SESSION_MS;
        else process.env.DEMO_SESSION_MS = originalSessionMs;
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('GET occupancy is empty until acquired', async () => {
        const res = await request(app).get(`/api/demo/occupancy?sessionId=${A}`);
        expect(res.status).toBe(200);
        expect(res.body.occupied).toBe(false);
    });

    it('POST occupancy grants the first session and 409s the second', async () => {
        const first = await request(app).post('/api/demo/occupancy').send({ sessionId: A });
        expect(first.status).toBe(200);
        expect(first.body.yours).toBe(true);
        expect(first.body.expiresAt).toBeGreaterThan(Date.now());

        const second = await request(app).post('/api/demo/occupancy').send({ sessionId: B });
        expect(second.status).toBe(409);
        expect(second.body.error).toBe('demo_occupied');
        expect(second.body.occupied).toBe(true);
        expect(second.body.yours).toBe(false);
    });

    it('heartbeat succeeds for the holder and 409s for a stranger', async () => {
        await request(app).post('/api/demo/occupancy').send({ sessionId: A }).expect(200);
        await request(app).post('/api/demo/occupancy/heartbeat').send({ sessionId: A }).expect(200);
        const stranger = await request(app).post('/api/demo/occupancy/heartbeat').send({ sessionId: B });
        expect(stranger.status).toBe(409);
    });

    it('DELETE session releases the lock', async () => {
        await request(app).post('/api/demo/occupancy').send({ sessionId: A }).expect(200);
        await request(app).delete(`/api/demo/session/${A}`).expect(200);
        const next = await request(app).post('/api/demo/occupancy').send({ sessionId: B });
        expect(next.status).toBe(200);
        expect(next.body.yours).toBe(true);
    });

    it('rejects demo campaign creates without the occupancy lock', async () => {
        const res = await request(app)
            .put('/api/campaigns/camp_demo_1')
            .send({ id: 'camp_demo_1', name: 'Tingen', demoSessionId: A });
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('demo_occupied');
    });

    it('allows demo campaign create after the caller acquires the lock', async () => {
        await request(app).post('/api/demo/occupancy').send({ sessionId: A }).expect(200);
        const res = await request(app)
            .put('/api/campaigns/camp_demo_2')
            .send({ id: 'camp_demo_2', name: 'Tingen', demoSessionId: A });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});
