import type { TableDescriptor } from '@narrative/engine';
import type { ItemLedgerEntry } from '../../types';
import { genericGet } from './genericAccessor';

export const itemTableDescriptor = {
    name: 'items',
    fileSuffix: '.items.json',
    recordShape: 'array',
    serverRoutes: { present: true, value: { get: true, put: true } },
    storeAccessor: { present: true, value: { read: true, write: true } },
    hydrator: { present: true, value: loadItemTable },
    slice: { present: true, value: { field: 'itemLedger' } },
} satisfies TableDescriptor;

export async function loadItemTable(campaignId: string): Promise<ItemLedgerEntry[]> {
    const raw = await genericGet(itemTableDescriptor as never, campaignId);
    return Array.isArray(raw) ? raw as ItemLedgerEntry[] : [];
}
