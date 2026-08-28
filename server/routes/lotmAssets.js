import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { LOTM_ASSETS_DIR } from '../lib/fileStore.js';
import { wrapAsync } from '../lib/asyncHandler.js';

function listWebp(relDir) {
    const abs = path.join(LOTM_ASSETS_DIR, relDir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
    return fs.readdirSync(abs)
        .filter(f => f.toLowerCase().endsWith('.webp'))
        .sort()
        .map(f => `${relDir.replace(/\\/g, '/')}/${f}`);
}

function listWebpRecursive(relDir) {
    const abs = path.join(LOTM_ASSETS_DIR, relDir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
    const out = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = `${relDir}/${entry.name}`.replace(/\\/g, '/');
        if (entry.isDirectory()) out.push(...listWebpRecursive(rel));
        else if (entry.name.toLowerCase().endsWith('.webp')) out.push(rel);
    }
    return out.sort();
}

export function createLotmAssetsRouter() {
    const router = Router();

    router.get('/api/lotm/index', wrapAsync((_req, res) => {
        if (!fs.existsSync(LOTM_ASSETS_DIR)) {
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

        // image/book and image/vol_* were removed from gamedata; these stay empty.
        const volumes = {};
        for (let i = 1; i <= 8; i++) {
            volumes[`vol_${i}`] = listWebpRecursive(`image/vol_${i}`);
        }

        res.json({
            backgrounds: listWebp('image/backgrounds'),
            characters: listWebp('image/characters'),
            book: listWebp('image/book'),
            volumes,
            pathways: listWebpRecursive('assets/data/pathways').filter(p =>
                /Symbol2\.webp$/i.test(p) || /potion/i.test(p) || /Pinnacle/i.test(p)
            ),
            emblems: listWebp('assets/data/churches/Emblems'),
            cover: fs.existsSync(path.join(LOTM_ASSETS_DIR, 'image/cover.webp'))
                ? 'image/cover.webp'
                : null,
        });
    }));

    return router;
}
