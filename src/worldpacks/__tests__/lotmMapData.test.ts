import { describe, expect, it } from 'vitest';
import {
    INITIAL_LOCATIONS,
    LOTM_MAP_DIMENSIONS,
    LOTM_MAP_IMAGE,
    exportPinsToJson,
    exportPinsToTypeScript,
    mapPinSearchNames,
} from '../lotmMapData';

describe('LOTM world map data', () => {
    it('pins canon places on the surveyed image', () => {
        expect(LOTM_MAP_IMAGE).toBe('image/Lotm_World_Map.webp');
        expect(LOTM_MAP_DIMENSIONS).toEqual({ width: 7400, height: 3800 });
        expect(INITIAL_LOCATIONS.map(pin => pin.name)).toEqual(expect.arrayContaining([
            'Loen Kingdom', 'Backlund', 'Tingen City', 'Trier', 'City of Generosity, Bayam', 'Sonia Sea',
            'Feysac Empire', 'St. Millom', 'Cordu Village', 'Feynapotter City', 'City of Silver',
            'Sonia Island', 'Sonia City', 'Gargas Archipelago', 'Nas', 'Oravi Island',
            'Damir Harbor', 'Bansy Harbor', 'Toskar',
        ]));
        expect(INITIAL_LOCATIONS.length).toBeGreaterThan(15);
    });

    it('ensures all pins have coordinates within map bounds', () => {
        for (const pin of INITIAL_LOCATIONS) {
            const [lat, lng] = pin.coordinates;
            expect(lat).toBeLessThanOrEqual(0);
            expect(lat).toBeGreaterThanOrEqual(-LOTM_MAP_DIMENSIONS.height);
            expect(lng).toBeGreaterThanOrEqual(0);
            expect(lng).toBeLessThanOrEqual(LOTM_MAP_DIMENSIONS.width);
        }
    });

    it('maps atlas pin names onto ledger search names', () => {
        expect(mapPinSearchNames('Tingen City')).toEqual(['Tingen City', 'Tingen']);
        expect(mapPinSearchNames('City of Generosity, Bayam')).toEqual([
            'City of Generosity, Bayam',
            'Bayam',
            'City of Generosity',
        ]);
        expect(mapPinSearchNames('Port Pritz')).toEqual(['Port Pritz', 'Pritz Harbor']);
    });

    it('exports pin definitions to valid JSON and TypeScript', () => {
        const jsonStr = exportPinsToJson(INITIAL_LOCATIONS);
        const parsed = JSON.parse(jsonStr);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(INITIAL_LOCATIONS.length);

        const tsStr = exportPinsToTypeScript(INITIAL_LOCATIONS);
        expect(tsStr).toContain('export const EXPORTED_MAP_PINS: LotmMapPin[]');
        expect(tsStr).toContain('Backlund');
    });
});
