import churchesJson from '../../gamedata/assets/data/churches/orthodox_churches.json';
import type { FactionEntry } from '../types';
import { resolveFaction } from '../services/faction/resolveFaction';
import { newFactionId } from '../utils/factionIds';
import { trimToSentences } from '../services/lore/loreLocationParser';

type RawChurch = {
    name?: string;
    also_called?: string;
    god_worshiped?: string;
    pathways?: string[];
    domain?: string;
    beyonder_teams?: string[];
    hierarchy?: {
        leader?: string;
        headquarters?: string;
        upper_echelon?: string;
        clergy_attire?: string;
    };
    extra_details?: string;
};

function asChurches(raw: unknown): RawChurch[] {
    if (!raw || typeof raw !== 'object') return [];
    const list = (raw as { churches?: RawChurch[] }).churches;
    return Array.isArray(list) ? list : [];
}

export function loadLotmChurches(): FactionEntry[] {
    return asChurches(churchesJson).map(church => {
        const teams = (church.beyonder_teams ?? []).map(t => String(t).trim()).filter(Boolean);
        const aliases = [church.also_called, ...teams]
            .map(s => (s ?? '').trim())
            .filter(Boolean)
            .join(', ');
        const headquarters = church.hierarchy?.headquarters?.trim() ?? '';
        const details = [
            church.god_worshiped ? `Worships ${church.god_worshiped}.` : '',
            teams.length ? `Teams: ${teams.join(', ')}.` : '',
            church.hierarchy?.leader ? `Leader: ${church.hierarchy.leader}.` : '',
            church.extra_details ?? '',
        ].filter(Boolean).join(' ');
        return {
            id: newFactionId(),
            name: (church.name ?? '').trim(),
            aliases,
            type: 'Orthodox Church',
            stance: church.domain ? `Established in ${church.domain}` : '',
            keyMembers: church.hierarchy?.upper_echelon ?? '',
            region: headquarters || (church.domain ?? ''),
            pathways: (church.pathways ?? []).join('; '),
            description: trimToSentences(details, 480),
            relations: [],
            firstSeenScene: '',
            lastSeenScene: '',
            source: 'manual' as const,
        };
    }).filter(f => f.name);
}

/** Append gamedata churches that the lore ledger does not already cover. */
export function mergeLotmChurches(existing: FactionEntry[]): FactionEntry[] {
    const additions = loadLotmChurches().filter(church => !resolveFaction(church.name, existing));
    if (additions.length === 0) return existing;
    return [...existing, ...additions];
}
