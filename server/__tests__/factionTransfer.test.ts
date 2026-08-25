import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';

let tmpDir: string;
let campaignsDir: string;

describe('faction transfer opt-in', () => {
    beforeEach(async () => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faction-transfer-'));
        vi.resetModules();
        vi.stubEnv('DATA_DIR', tmpDir);
        vi.doMock('../lib/embedder.js', () => ({
            embedText: vi.fn(),
            buildArchiveText: vi.fn(),
            buildLoreText: vi.fn(),
        }));
        vi.doMock('../lib/vectorStore.js', () => ({
            storeArchiveEmbedding: vi.fn(),
            storeLoreEmbedding: vi.fn(),
        }));

        const store = await import('../lib/fileStore.js');
        campaignsDir = store.CAMPAIGNS_DIR;
        fs.mkdirSync(campaignsDir, { recursive: true });

        const { serverTableRegistry } = await import('../lib/tableRegistry.js');
        const { registerFactionTable } = await import('../lib/factionTable.js');
        serverTableRegistry.clear();
        registerFactionTable(serverTableRegistry);
    });

    afterEach(async () => {
        const { serverTableRegistry } = await import('../lib/tableRegistry.js');
        serverTableRegistry.clear();
        vi.unstubAllEnvs();
        vi.doUnmock('../lib/embedder.js');
        vi.doUnmock('../lib/vectorStore.js');
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('round-trips factions after the descriptor opts into transfer', async () => {
        const id = 'faction-export';
        const expected = [{ id: 'fac-1', name: 'Tarot Club' }];
        fs.writeFileSync(path.join(campaignsDir, `${id}.json`), JSON.stringify({ id, name: 'Faction Export' }));
        fs.writeFileSync(path.join(campaignsDir, `${id}.factions.json`), JSON.stringify(expected));

        const { createTransferRouter } = await import('../routes/transfer.js');
        const app = express();
        app.use(express.json());
        app.use(createTransferRouter());

        const exported = await request(app)
            .get(`/api/campaigns/${id}/export`)
            .expect(200);

        expect(exported.body.factions).toEqual(expected);
        const imported = await request(app)
            .post('/api/campaigns/import')
            .send(exported.body)
            .expect(200);

        const importedPath = path.join(campaignsDir, `${imported.body.id}.factions.json`);
        expect(JSON.parse(fs.readFileSync(importedPath, 'utf-8'))).toEqual(expected);
    });
});
