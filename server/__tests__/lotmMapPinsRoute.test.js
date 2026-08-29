import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import supertest from 'supertest';
import { createLotmAssetsRouter } from '../routes/lotmAssets.js';

let dir;
let request;

const mount = (assetsDir) => {
    const app = express();
    app.use(express.json());
    app.use(createLotmAssetsRouter({ assetsDir }));
    return supertest(app);
};

beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lotm-assets-test-'));
    request = mount(dir);
});

afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
});

describe('LOTM Map Pins Route API', () => {
    it('GET /api/lotm/map-pins returns empty array when file does not exist', async () => {
        const res = await request.get('/api/lotm/map-pins');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ pins: [] });
    });

    it('PUT /api/lotm/map-pins writes pins to lotm_map_pins.json and GET retrieves them', async () => {
        const samplePins = [
            {
                id: 'backlund',
                name: 'Backlund',
                type: 'city',
                category: 'Cities',
                coordinates: [-1100, 3900],
                description: 'Capital of Loen',
            },
            {
                id: 'tingen',
                name: 'Tingen City',
                type: 'city',
                category: 'Cities',
                coordinates: [-1150, 3850],
                description: 'University town',
            },
        ];

        const putRes = await request
            .put('/api/lotm/map-pins')
            .send({ pins: samplePins });

        expect(putRes.status).toBe(200);
        expect(putRes.body).toEqual({ success: true, count: 2 });

        const getRes = await request.get('/api/lotm/map-pins');
        expect(getRes.status).toBe(200);
        expect(getRes.body.pins).toHaveLength(2);
        expect(getRes.body.pins[0].name).toBe('Backlund');
        expect(getRes.body.pins[1].name).toBe('Tingen City');

        // Verify disk file
        const filePath = path.join(dir, 'assets/data/world/Geography/lotm_map_pins.json');
        expect(fs.existsSync(filePath)).toBe(true);
        const parsedDisk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(parsedDisk).toEqual(samplePins);
    });

    it('rejects invalid pin format with 400 Bad Request', async () => {
        const badPayload = {
            pins: [
                { id: 'bad-pin', name: 'No Coordinates' },
            ],
        };

        const res = await request
            .put('/api/lotm/map-pins')
            .send(badPayload);

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid pin entry');
    });
});
