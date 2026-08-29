import { API_BASE } from '../../lib/apiBase';
import type { LotmMapPin } from '../../worldpacks/lotmMapData';

export async function fetchLotmMapPins(): Promise<LotmMapPin[]> {
    try {
        const res = await fetch(`${API_BASE}/lotm/map-pins`);
        if (!res.ok) {
            throw new Error(`Failed to fetch map pins: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        return Array.isArray(data?.pins) ? data.pins : [];
    } catch (err) {
        console.warn('[lotmMapPinsClient] fetchLotmMapPins error:', err);
        return [];
    }
}

export async function saveLotmMapPins(pins: LotmMapPin[]): Promise<{ success: boolean; count: number }> {
    const res = await fetch(`${API_BASE}/lotm/map-pins`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pins }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save map pins (${res.status}): ${errorText}`);
    }

    return res.json();
}
