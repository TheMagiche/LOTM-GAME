import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { LOTM_ASSETS_DIR, readJson, writeJson } from '../lib/fileStore.js';
import { wrapAsync } from '../lib/asyncHandler.js';

function listWebp(assetsDir, relDir) {
    const abs = path.join(assetsDir, relDir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
    return fs.readdirSync(abs)
        .filter(f => f.toLowerCase().endsWith('.webp'))
        .sort()
        .map(f => `${relDir.replace(/\\/g, '/')}/${f}`);
}

function listWebpRecursive(assetsDir, relDir) {
    const abs = path.join(assetsDir, relDir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
    const out = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = `${relDir}/${entry.name}`.replace(/\\/g, '/');
        if (entry.isDirectory()) out.push(...listWebpRecursive(assetsDir, rel));
        else if (entry.name.toLowerCase().endsWith('.webp')) out.push(rel);
    }
    return out.sort();
}

export function createLotmAssetsRouter(options = {}) {
    const router = Router();
    const assetsDir = options.assetsDir || LOTM_ASSETS_DIR;

    router.get('/api/lotm/index', wrapAsync((_req, res) => {
        if (!fs.existsSync(assetsDir)) {
            return res.json({
                backgrounds: [],
                characters: [],
                spoilerCharacters: [],
                book: [],
                volumes: {},
                pathways: [],
                emblems: [],
            });
        }

        const volumes = {};
        for (let i = 1; i <= 8; i++) {
            volumes[`vol_${i}`] = listWebpRecursive(assetsDir, `image/vol_${i}`);
        }

        res.json({
            backgrounds: listWebp(assetsDir, 'image/backgrounds'),
            characters: listWebp(assetsDir, 'image/characters'),
            book: listWebp(assetsDir, 'image/book'),
            volumes,
            pathways: listWebpRecursive(assetsDir, 'assets/data/pathways').filter(p =>
                /Symbol2\.webp$/i.test(p) || /potion/i.test(p) || /Pinnacle/i.test(p)
            ),
            emblems: listWebp(assetsDir, 'assets/data/churches/Emblems'),
            cover: fs.existsSync(path.join(assetsDir, 'image/cover.webp'))
                ? 'image/cover.webp'
                : null,
        });
    }));

    router.get('/api/lotm/map-pins', wrapAsync((_req, res) => {
        const pinsPath = path.join(assetsDir, 'assets/data/world/Geography/lotm_map_pins.json');
        const pins = readJson(pinsPath, []);
        res.json({ pins: Array.isArray(pins) ? pins : [] });
    }));

    const handleSavePins = wrapAsync((req, res) => {
        const pins = req.body?.pins ?? req.body;
        if (!Array.isArray(pins)) {
            return res.status(400).json({ error: 'Expected an array of map pins or { pins: [...] }' });
        }

        for (const pin of pins) {
            if (
                !pin ||
                typeof pin !== 'object' ||
                typeof pin.id !== 'string' ||
                typeof pin.name !== 'string' ||
                !Array.isArray(pin.coordinates) ||
                pin.coordinates.length < 2
            ) {
                return res.status(400).json({ error: 'Invalid pin entry: must contain id, name, and [lat, lng] coordinates' });
            }
        }

        const pinsPath = path.join(assetsDir, 'assets/data/world/Geography/lotm_map_pins.json');
        const targetDir = path.dirname(pinsPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        writeJson(pinsPath, pins);
        res.json({ success: true, count: pins.length });
    });

    router.put('/api/lotm/map-pins', handleSavePins);
    router.post('/api/lotm/map-pins', handleSavePins);

    return router;
}
