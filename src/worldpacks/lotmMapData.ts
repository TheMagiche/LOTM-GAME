import rawPins from '../../gamedata/assets/data/world/Geography/lotm_map_pins.json';

export const LOTM_MAP_IMAGE = 'image/Lotm_World_Map.webp';

export const LOTM_MAP_DIMENSIONS = {
    width: 7400,
    height: 3800,
};

export type LotmMapPinType = 'region' | 'nation' | 'city' | 'village' | 'harbor' | 'landmark' | 'sea';

export type LotmMapPin = {
    id: string;
    name: string;
    type: LotmMapPinType;
    category: string;
    coordinates: [number, number];
    description: string;
    details?: string;
};

export type LotmMapLayerKey = 'kingdoms' | 'cities' | 'seas';

export const INITIAL_LOCATIONS: LotmMapPin[] = (rawPins as unknown as LotmMapPin[]).map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    category: p.category,
    coordinates: [p.coordinates[0], p.coordinates[1]] as [number, number],
    description: p.description ?? '',
    details: p.details,
}));

const loreAliases: Record<string, string> = {
    'Forsaken Land of the Gods': 'Eastern Continent (Forsaken Land of the Gods)',
    'Tingen City': 'Tingen',
    'City of Generosity, Bayam': 'Bayam',
    'Port Pritz': 'Pritz Harbor',
    'Port Enmat': 'Enmat Harbor',
    'Midseashire': 'Midseashore',
};

export function mapPinSearchNames(name: string): string[] {
    const names = [name];
    const aliased = loreAliases[name];
    if (aliased) names.push(aliased);
    const withoutCity = name.replace(/\s+City$/i, '').trim();
    if (withoutCity && withoutCity !== name) names.push(withoutCity);
    const beforeComma = name.split(',')[0]?.trim();
    if (beforeComma && beforeComma !== name) names.push(beforeComma);
    const afterComma = name.split(',')[1]?.trim();
    if (afterComma && afterComma !== name) names.push(afterComma);
    return [...new Set(names)];
}

/**
 * Serializes map pins into a formatted JSON string for download or clipboard copy.
 */
export function exportPinsToJson(pins: LotmMapPin[]): string {
    return JSON.stringify(pins, null, 2);
}

/**
 * Formats map pins into TypeScript code suitable for worldpack files.
 */
export function exportPinsToTypeScript(pins: LotmMapPin[]): string {
    return `// Exported LOTM Map Pins (${pins.length} locations)\nexport const EXPORTED_MAP_PINS: LotmMapPin[] = ${JSON.stringify(pins, null, 4)};\n`;
}
