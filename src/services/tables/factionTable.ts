import type { TableDescriptor } from '@narrative/engine';
import type { FactionEntry } from '../../types';
import { genericGet } from './genericAccessor';

export const factionTableDescriptor = {
    name: 'factions',
    fileSuffix: '.factions.json',
    recordShape: 'array',
    serverRoutes: { present: true, value: { get: true, put: true } },
    storeAccessor: { present: true, value: { read: true, write: true } },
    hydrator: { present: true, value: loadFactionTable },
    slice: { present: true, value: { field: 'factionLedger' } },
} satisfies TableDescriptor;

export async function loadFactionTable(campaignId: string): Promise<FactionEntry[]> {
    const raw = await genericGet(factionTableDescriptor as never, campaignId);
    return Array.isArray(raw) ? raw as FactionEntry[] : [];
}
