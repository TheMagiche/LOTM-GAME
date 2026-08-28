import nationsJson from '../../gamedata/assets/data/world/Geography/nations.json';
import continentsJson from '../../gamedata/assets/data/world/Geography/continents_realms.json';
import seasJson from '../../gamedata/assets/data/world/Geography/seas_and_oceans.json';
import type { LocationEntry } from '../types';
import { resolvePlace } from '../services/locationParser';
import { newLocationId } from '../utils/locationIds';
import { trimToSentences } from '../services/lore/loreLocationParser';

type GeoItem = { name?: string; type?: string; description?: string };

function listFrom(raw: unknown, key: string): GeoItem[] {
    if (!raw || typeof raw !== 'object') return [];
    const block = (raw as Record<string, { list?: GeoItem[] }>)[key];
    return Array.isArray(block?.list) ? block.list : [];
}

function toLocation(item: GeoItem, broadLocation: string): LocationEntry | null {
    const name = (item.name ?? '').trim();
    if (!name) return null;
    return {
        id: newLocationId(),
        name,
        aliases: item.type ?? '',
        broadLocation,
        features: [],
        connections: [],
        description: trimToSentences(item.description ?? '', 240),
        firstSeenScene: '',
        lastSeenScene: '',
        source: 'manual',
    };
}

export function loadLotmGeography(): LocationEntry[] {
    const nations = listFrom(nationsJson, 'major_nations_and_cities')
        .map(item => toLocation(item, item.type === 'City' || item.type === 'Village' ? '' : (item.name ?? item.type ?? '')));
    const continents = listFrom(continentsJson, 'continents_and_realms')
        .map(item => toLocation(item, item.type ?? 'Realm'));
    const seas = listFrom(seasJson, 'seas_and_oceans')
        .map(item => toLocation(item, 'Sea'));
    return [...nations, ...continents, ...seas].filter((row): row is LocationEntry => row !== null);
}

export function mergeLotmGeography(existing: LocationEntry[]): LocationEntry[] {
    const additions = loadLotmGeography().filter(loc => !resolvePlace(loc.name, existing));
    if (additions.length === 0) return existing;
    return [...existing, ...additions];
}
