import type { LoreChunk, FactionEntry, FactionRelation, FactionRelationKind } from '../../types';
import { resolveFaction } from '../faction/resolveFaction';
import { trimToSentences } from './loreLocationParser';
import { newFactionId } from '../../utils/factionIds';

const MAX_RELATIONS = 8;
const DESCRIPTION_CHAR_CAP = 480;

/**
 * Split a faction chunk header into a display name.
 *   `[CHUNK: FACTION] Church of the Evernight Goddess`
 *   `FACTION -- Church of the Evernight Goddess`
 *   `FACTION — Tarot Club`
 */
export function parseFactionHeaderName(header: string): string {
    let name = header.replace(/\[CHUNK:\s*[A-Z_]+[—\-\s]*\]/i, '').trim();
    const doubleDash = name.match(/^[A-Z][A-Z_\s]*--\s*(.+)/);
    if (doubleDash) {
        name = doubleDash[1].trim();
    } else {
        const emDash = name.match(/^[A-Z][A-Z_\s]*[—–]\s*(.+)/);
        if (emDash) name = emDash[1].trim();
    }
    return name;
}

/**
 * Parse world-lore `category: 'faction'` chunks into ledger entries.
 *
 * Expected bullets (LOTM and the generic template):
 *   **Type:** Orthodox Church …
 *   **Key Members:** Dunn Smith, Leonard Mitchell
 *   **Stance:** Lawful establishment in the Loen Kingdom.
 *   **Region:** / **Headquarters:** Winter County
 *   **Pathways:** / **Pathway:** Darkness pathway complete
 *   **AlliedWith:** / **Allies:** [Church of X]
 *   **OpposedTo:** / **Rivals:** [Church of Y]
 *   **Status:** …
 *   **Aliases:** Nighthawks, Church of Evernight
 */
export function parseFactionsFromLore(chunks: LoreChunk[]): FactionEntry[] {
    const factions: FactionEntry[] = [];
    const seenNames = new Set<string>();
    const pendingAllies = new Map<number, string[]>();
    const pendingOpposed = new Map<number, string[]>();

    for (const chunk of chunks.filter(c => c.category === 'faction')) {
        const name = parseFactionHeaderName(chunk.header);
        if (!name) continue;
        const nameKey = name.toLowerCase();
        if (seenNames.has(nameKey)) continue;
        seenNames.add(nameKey);

        const body = chunk.content;
        const get = (field: string): string => {
            const m = body.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, 'i'));
            return m ? m[1].trim() : '';
        };
        const getAny = (fields: string[]): string => {
            for (const field of fields) {
                const value = get(field);
                if (value) return value;
            }
            return '';
        };
        const getList = (fields: string[]): string[] => {
            const raw = getAny(fields);
            if (!raw) return [];
            const stripped = raw.replace(/[[\]]/g, '').trim();
            if (!stripped) return [];
            return stripped.split(/[,;]|\s{2,}|\|/).map(s => s.trim()).filter(Boolean);
        };

        const prose = body
            .split('\n')
            .filter(line => !/^\s*\*\*[^*]+:\*\*/.test(line))
            .join(' ')
            .trim();

        const typeRaw = get('Type');
        const typeParen = typeRaw.match(/^(.*?)\s*\((.+)\)\s*$/);
        const type = (typeParen ? typeParen[1] : typeRaw).trim();
        const pathwaysFromType = typeParen ? typeParen[2].trim() : '';
        const explicitDescription = getAny(['Description', 'Summary']);
        const rawDescription = explicitDescription || prose;
        const withType = type && rawDescription && !rawDescription.toLowerCase().startsWith(type.toLowerCase())
            ? `${type.replace(/[.\s]+$/, '')}. ${rawDescription}`
            : rawDescription || type;

        const index = factions.length;
        const allies = getList(['AlliedWith', 'Allied With', 'Allies']);
        const opposed = getList(['OpposedTo', 'Opposed To', 'Rivals', 'Enemies']);
        if (allies.length > 0) pendingAllies.set(index, allies);
        if (opposed.length > 0) pendingOpposed.set(index, opposed);

        const aliases = getAny(['Aliases', 'Alias']);
        factions.push({
            id: newFactionId(),
            name,
            aliases,
            type,
            stance: get('Stance'),
            keyMembers: getAny(['Key Members', 'KeyMembers', 'Members']),
            region: getAny(['Region', 'Headquarters', 'Seat', 'Strongest In']),
            pathways: getAny(['Pathways', 'Pathway', 'BeyonderPathway']) || pathwaysFromType,
            description: trimToSentences(withType, DESCRIPTION_CHAR_CAP),
            status: get('Status') || undefined,
            relations: [],
            firstSeenScene: '',
            lastSeenScene: '',
            source: 'manual',
        });
    }

    const addRelation = (from: FactionEntry, to: FactionEntry, kind: FactionRelationKind) => {
        if (from.id === to.id) return;
        if (from.relations.length >= MAX_RELATIONS) return;
        if (from.relations.some((r: FactionRelation) => r.toId === to.id && r.kind === kind)) return;
        from.relations.push({ toId: to.id, kind });
    };

    for (const [fromIndex, names] of pendingAllies) {
        const from = factions[fromIndex];
        for (const rawName of names) {
            const to = resolveFaction(rawName, factions);
            if (!to) continue;
            addRelation(from, to, 'allied');
            addRelation(to, from, 'allied');
        }
    }
    for (const [fromIndex, names] of pendingOpposed) {
        const from = factions[fromIndex];
        for (const rawName of names) {
            const to = resolveFaction(rawName, factions);
            if (!to) continue;
            addRelation(from, to, 'opposed');
            addRelation(to, from, 'opposed');
        }
    }

    return factions;
}
