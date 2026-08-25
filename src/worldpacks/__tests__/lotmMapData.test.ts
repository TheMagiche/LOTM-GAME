import { describe, expect, it } from 'vitest';
import { INITIAL_LOCATIONS, LOTM_MAP_DIMENSIONS, LOTM_MAP_IMAGE, mapPinSearchNames } from '../lotmMapData';

describe('LOTM world map data', () => {
    it('pins canon places on the surveyed image', () => {
        expect(LOTM_MAP_IMAGE).toBe('image/Lotm_World_Map.webp');
        expect(LOTM_MAP_DIMENSIONS).toEqual({ width: 7400, height: 3800 });
        expect(INITIAL_LOCATIONS.map(pin => pin.name)).toEqual(expect.arrayContaining([
            'Loen Kingdom', 'Backlund', 'Tingen City', 'Trier', 'City of Generosity, Bayam', 'Sonia Sea',
        ]));
        expect(INITIAL_LOCATIONS.length).toBeGreaterThan(10);
    });

    it('maps atlas pin names onto ledger search names', () => {
        expect(mapPinSearchNames('Tingen City')).toEqual(['Tingen City', 'Tingen']);
        expect(mapPinSearchNames('City of Generosity, Bayam')).toEqual([
            'City of Generosity, Bayam',
            'Bayam',
            'City of Generosity',
        ]);
    });
});
