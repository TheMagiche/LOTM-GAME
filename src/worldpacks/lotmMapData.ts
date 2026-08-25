import continents from './lotm-map-geo/continents_realms.json';
import nations from './lotm-map-geo/nations.json';
import seas from './lotm-map-geo/seas_and_oceans.json';

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

export type LotmMapPath = {
    id: string;
    name: string;
    color?: string;
    dashArray?: string;
    coordinates: [number, number][];
};

export type LotmMapLayerKey = 'kingdoms' | 'cities' | 'seas' | 'paths';

type LoreItem = { name: string; type?: string; description?: string };
type RegionNode = {
    region_coordinates?: [number, number];
    marked_items?: Array<{ name: string; type: string; coordinates: [number, number] }>;
    [key: string]: unknown;
};

/** Coordinates are [lat, lng] = [-y, x] in Lotm_World_Map pixels (7400 x 3800). */
export const LOTM_REGIONS: Record<string, RegionNode> = {
    'Northern Continent': {
        'Loen Kingdom': {
            region_coordinates: [-1100, 3900],
            marked_items: [
                { name: 'Backlund', type: 'City', coordinates: [-1100, 3900] },
                { name: 'Pritz Harbor', type: 'Harbor', coordinates: [-1200, 4000] },
                { name: 'Tingen City', type: 'City', coordinates: [-1150, 3850] },
                { name: 'Enmat Harbor', type: 'Harbor', coordinates: [-1250, 4050] },
                { name: 'Conis City', type: 'City', coordinates: [-1300, 3950] },
                { name: 'Desi Bay', type: 'Landmark', coordinates: [-1350, 3900] },
            ],
        },
        'Intis Republic': {
            region_coordinates: [-1000, 3300],
            marked_items: [
                { name: 'Trier', type: 'City', coordinates: [-1000, 3300] },
            ],
        },
        'Feynapotter Kingdom': {
            region_coordinates: [-1350, 3300],
            marked_items: [
                { name: 'Feynapotter City', type: 'City', coordinates: [-1350, 3300] },
            ],
        },
        Lenburg: {
            region_coordinates: [-1200, 3600],
            marked_items: [],
        },
        Midseashore: {
            region_coordinates: [-1250, 3700],
            marked_items: [],
        },
    },
    'Southern Continent': {
        'Balam Empire': {
            region_coordinates: [-2200, 4100],
            marked_items: [
                { name: 'West Balam', type: 'Region', coordinates: [-2200, 3900] },
                { name: 'East Balam', type: 'Region', coordinates: [-2300, 4300] },
            ],
        },
        'Highlands Kingdom': {
            region_coordinates: [-2300, 4200],
            marked_items: [],
        },
        'Paz Valley': {
            region_coordinates: [-2500, 4100],
            marked_items: [],
        },
    },
    'Forsaken Land of the Gods': {
        region_coordinates: [-1500, 6500],
        marked_items: [
            { name: 'City of Silver', type: 'City', coordinates: [-1200, 6200] },
            { name: 'Moon City', type: 'City', coordinates: [-1400, 6400] },
            { name: 'Afternoon Town', type: 'City', coordinates: [-1300, 6300] },
            { name: "Giant King's Court", type: 'Landmark', coordinates: [-1100, 6000] },
        ],
    },
    'Islands and Archipelagos': {
        'Rorsted Archipelago': {
            region_coordinates: [-1600, 4500],
            marked_items: [
                { name: 'City of Generosity, Bayam', type: 'City/Harbor', coordinates: [-1650, 4550] },
            ],
        },
        'Sonia Island': {
            region_coordinates: [-800, 4400],
            marked_items: [
                { name: 'Sonia City', type: 'City', coordinates: [-850, 4450] },
            ],
        },
        'Gargas Archipelago': {
            region_coordinates: [-1100, 5100],
            marked_items: [
                { name: 'Nas', type: 'City/Harbor', coordinates: [-1150, 5150] },
            ],
        },
        'Oravi Island': {
            region_coordinates: [-1700, 4900],
            marked_items: [],
        },
        'Safe Sea Route Markers': {
            region_coordinates: [-1500, 4300],
            marked_items: [
                { name: 'Damir Harbor', type: 'Harbor', coordinates: [-1450, 4200] },
                { name: 'Bansy Harbor', type: 'Harbor', coordinates: [-1500, 4300] },
                { name: 'Toskar', type: 'Harbor', coordinates: [-1800, 4600] },
            ],
        },
    },
};

function loreList(file: Record<string, { list?: LoreItem[] } | unknown>): LoreItem[] {
    for (const value of Object.values(file)) {
        if (value && typeof value === 'object' && Array.isArray((value as { list?: LoreItem[] }).list)) {
            return (value as { list: LoreItem[] }).list;
        }
    }
    return [];
}

const loreByName = new Map(
    [
        ...loreList(continents as Record<string, unknown>),
        ...loreList(nations as Record<string, unknown>),
        ...loreList(seas as Record<string, unknown>),
    ].map(item => [item.name, item]),
);

const loreAliases: Record<string, string> = {
    'Forsaken Land of the Gods': 'Eastern Continent (Forsaken Land of the Gods)',
    'Tingen City': 'Tingen',
    'City of Generosity, Bayam': 'Bayam',
};

function loreFor(name: string): LoreItem | undefined {
    return loreByName.get(name) || loreByName.get(loreAliases[name]);
}

export function mapPinSearchNames(name: string): string[] {
    const names = [name];
    const aliased = loreAliases[name];
    if (aliased) names.push(aliased);
    const withoutCity = name.replace(/\s+City$/i, '').trim();
    if (withoutCity && withoutCity !== name) names.push(withoutCity);
    const beforeComma = name.split(',')[0]?.trim();
    if (beforeComma && beforeComma !== name) names.push(beforeComma);
    return [...new Set(names)];
}

function pin(args: {
    id: string;
    name: string;
    type: LotmMapPinType;
    category: string;
    coordinates: [number, number];
    details?: string;
}): LotmMapPin {
    const lore = loreFor(args.name);
    return {
        id: args.id,
        name: args.name,
        type: args.type,
        category: args.category,
        coordinates: args.coordinates,
        description: lore?.description ?? '',
        details: lore?.type ?? args.details ?? args.type,
    };
}

const MARKED_ITEM_TYPES: Record<string, LotmMapPinType> = {
    City: 'city',
    Harbor: 'harbor',
    'City/Harbor': 'harbor',
    Landmark: 'landmark',
    Region: 'region',
};

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function isNation(name: string): boolean {
    return loreFor(name)?.type === 'Nation' || /kingdom|empire|republic/i.test(name);
}

function childRegions(node: RegionNode): Array<[string, RegionNode]> {
    return Object.entries(node).filter(([key, value]) =>
        key !== 'region_coordinates' &&
        key !== 'marked_items' &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value),
    ) as Array<[string, RegionNode]>;
}

function centroidOf(children: Array<[string, RegionNode]>): [number, number] | null {
    const coords = children.map(([, child]) => child.region_coordinates).filter((c): c is [number, number] => !!c);
    if (coords.length === 0) return null;
    const [lat, lng] = coords.reduce(
        (acc, [childLat, childLng]) => [acc[0] + childLat, acc[1] + childLng],
        [0, 0],
    );
    return [Math.round(lat / coords.length), Math.round(lng / coords.length)];
}

function collectRegionPins(name: string, node: RegionNode, depth: number, pins: LotmMapPin[]): void {
    const children = childRegions(node);
    const coordinates = node.region_coordinates ?? centroidOf(children);

    if (coordinates) {
        pins.push(pin({
            id: slugify(name),
            name,
            type: depth > 0 && isNation(name) ? 'nation' : 'region',
            category: 'Kingdoms',
            coordinates,
        }));
    }

    for (const item of node.marked_items ?? []) {
        pins.push(pin({
            id: slugify(item.name),
            name: item.name,
            type: MARKED_ITEM_TYPES[item.type] ?? 'landmark',
            category: 'Cities',
            coordinates: item.coordinates,
            details: item.type,
        }));
    }

    for (const [childName, childNode] of children) {
        collectRegionPins(childName, childNode, depth + 1, pins);
    }
}

function buildLocationPins(regions: Record<string, RegionNode>): LotmMapPin[] {
    const pins: LotmMapPin[] = [];
    for (const [name, node] of Object.entries(regions)) {
        collectRegionPins(name, node, 0, pins);
    }
    return pins;
}

const SEA_PINS: LotmMapPin[] = [
    pin({ id: 'sonia-sea', name: 'Sonia Sea', type: 'sea', category: 'Seas', coordinates: [-1150, 4800] }),
    pin({ id: 'fog-sea', name: 'Fog Sea', type: 'sea', category: 'Seas', coordinates: [-1650, 2100] }),
    pin({ id: 'berserk-sea', name: 'Berserk Sea', type: 'sea', category: 'Seas', coordinates: [-1780, 3480] }),
];

export const INITIAL_LOCATIONS: LotmMapPin[] = [...buildLocationPins(LOTM_REGIONS), ...SEA_PINS];

export const EXPLORATION_PATHS: LotmMapPath[] = [
    {
        id: 'klein-journey',
        name: 'Exploration Path (Backlund → Southern Seas → Forsaken Land)',
        color: '#38bdf8',
        dashArray: '5, 10',
        coordinates: [
            [-1100, 3900],
            [-1780, 3480],
            [-2200, 4100],
            [-1600, 4500],
            [-1500, 6500],
        ],
    },
];
