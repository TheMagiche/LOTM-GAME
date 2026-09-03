import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { BACKUPS_DIR, CAMPAIGNS_DIR, campaignFiles, ensureDirs, readJson } from '../lib/fileStore.js';
import { isCampaignMetaFile } from '../lib/tableRegistry.js';
import { deleteCampaignEmbeddings } from '../lib/vectorStore.js';
import { wrapAsync } from '../lib/asyncHandler.js';
import { DEMO_SESSION_ID_RE, demoMaxCampaignAgeMs, isDemoMode } from '../lib/demoMode.js';
import {
    acquireDemoOccupancy,
    getDemoOccupancy,
    heartbeatDemoOccupancy,
    releaseDemoOccupancy,
} from '../lib/demoOccupancy.js';

function listCampaignMetas() {
    ensureDirs();
    return fs.readdirSync(CAMPAIGNS_DIR)
        .filter(f => isCampaignMetaFile(f))
        .map(f => readJson(path.join(CAMPAIGNS_DIR, f)))
        .filter(c => c && c.id && c.name && c.id !== 'undefined' && c.id !== 'null');
}

function deleteCampaignTree(id) {
    const files = campaignFiles(id);
    for (const f of files) {
        try { fs.unlinkSync(path.join(CAMPAIGNS_DIR, f)); } catch { /* already gone */ }
    }
    try { deleteCampaignEmbeddings(id); } catch { /* embeddings optional */ }
    const backupDir = path.join(BACKUPS_DIR, id);
    if (fs.existsSync(backupDir)) {
        fs.rmSync(backupDir, { recursive: true, force: true });
    }
}

export function purgeDemoCampaigns({ sessionId, olderThanMs } = {}) {
    const maxAge = olderThanMs ?? demoMaxCampaignAgeMs();
    const now = Date.now();
    const campaigns = listCampaignMetas();
    const deleted = [];
    for (const campaign of campaigns) {
        const matchSession = sessionId && campaign.demoSessionId === sessionId;
        const age = now - (Number(campaign.lastPlayedAt) || Number(campaign.createdAt) || 0);
        const matchAge = !sessionId && age >= maxAge;
        if (!matchSession && !matchAge) continue;
        deleteCampaignTree(campaign.id);
        deleted.push(campaign.id);
    }
    return deleted;
}

export function pruneStaleDemoCampaigns() {
    if (!isDemoMode()) return [];
    const deleted = purgeDemoCampaigns({ olderThanMs: demoMaxCampaignAgeMs() });
    if (deleted.length > 0) {
        console.log(`[demo] pruned ${deleted.length} stale campaign(s): ${deleted.join(', ')}`);
    }
    return deleted;
}

export function createDemoSessionRouter() {
    const router = Router();

    router.get('/api/demo/occupancy', wrapAsync((req, res) => {
        if (!isDemoMode()) {
            return res.status(404).json({ error: 'Not found' });
        }
        const sessionId = String(req.query.sessionId || '');
        res.json(getDemoOccupancy(DEMO_SESSION_ID_RE.test(sessionId) ? sessionId : ''));
    }));

    router.post('/api/demo/occupancy', wrapAsync((req, res) => {
        if (!isDemoMode()) {
            return res.status(404).json({ error: 'Not found' });
        }
        const sessionId = String(req.body?.sessionId || '');
        const result = acquireDemoOccupancy(sessionId);
        if (!result.ok) {
            return res.status(result.status).json({
                error: result.error,
                ...(result.occupancy ?? {}),
            });
        }
        res.json({ ok: true, ...result.occupancy });
    }));

    router.post('/api/demo/occupancy/heartbeat', wrapAsync((req, res) => {
        if (!isDemoMode()) {
            return res.status(404).json({ error: 'Not found' });
        }
        const sessionId = String(req.body?.sessionId || '');
        const result = heartbeatDemoOccupancy(sessionId);
        if (!result.ok) {
            return res.status(result.status).json({
                error: result.error,
                ...(result.occupancy ?? {}),
            });
        }
        res.json({ ok: true, ...result.occupancy });
    }));

    router.delete('/api/demo/session/:id', wrapAsync((req, res) => {
        if (!isDemoMode()) {
            return res.status(404).json({ error: 'Not found' });
        }
        const sessionId = String(req.params.id || '');
        if (!DEMO_SESSION_ID_RE.test(sessionId)) {
            return res.status(400).json({ error: 'Invalid session id' });
        }
        releaseDemoOccupancy(sessionId);
        const deleted = purgeDemoCampaigns({ sessionId });
        res.json({ ok: true, deleted });
    }));

    return router;
}
