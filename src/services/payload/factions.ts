import type { ChatMessage, FactionEntry, LoreChunk, NPCEntry } from '../../types';
import { allegianceMatchesFaction } from '../faction/resolveFaction';

const FACTION_BLOCK_CHAR_CAP = 400;
const FACTION_BLOCK_MAX = 6;
const NAME_STOP = new Set([
    'church', 'order', 'house', 'secret', 'school', 'thought', 'the', 'and',
    'god', 'goddess', 'lord', 'eternal', 'ancient', 'family', 'families',
    'royal', 'imperial', 'republic', 'club', 'sect',
]);

function loreCoversName(name: string, loreHeaders: string[]): boolean {
    const needle = name.trim().toLowerCase();
    if (!needle) return false;
    return loreHeaders.some(header => header.includes(needle));
}

function mentionedIn(scan: string, faction: FactionEntry): boolean {
    const hay = scan.toLowerCase();
    const keys = [
        faction.name,
        ...faction.aliases.split(/[,;/]/),
    ].map(s => s.trim()).filter(s => s.length >= 4);
    if (keys.some(key => hay.includes(key.toLowerCase()))) return true;
    const tokens = faction.name
        .split(/\s+/)
        .map(word => word.replace(/[^a-zA-Z]/g, ''))
        .filter(word => word.length >= 8 && !NAME_STOP.has(word.toLowerCase()));
    return tokens.some(token => hay.includes(token.toLowerCase()));
}

function factionLine(faction: FactionEntry, ledger: FactionEntry[]): string {
    const meta = [faction.type, faction.stance, faction.status, faction.region].filter(Boolean);
    let line = meta.length > 0 ? `${faction.name} (${meta.join('; ')})` : faction.name;
    if (faction.pathways) line += ` PATHWAY: ${faction.pathways}`;
    if (faction.description) {
        const desc = faction.description.length > 120
            ? `${faction.description.slice(0, 119)}…`
            : faction.description;
        line += ` — ${desc}`;
    }
    const rels = (faction.relations ?? []).slice(0, 3).map(relation => {
        const other = ledger.find(entry => entry.id === relation.toId);
        return other ? `${relation.kind} ${other.name}` : '';
    }).filter(Boolean);
    if (rels.length > 0) line += ` | ${rels.join(', ')}`;
    return line;
}

/**
 * Compact [FACTIONS] block for mentioned / on-stage factions.
 * Returns '' when the ledger is empty so the payload stays byte-identical.
 */
export function buildFactionBlock(opts: {
    ledger: FactionEntry[];
    history: ChatMessage[];
    userMessage: string;
    relevantLore?: LoreChunk[];
    npcLedger?: NPCEntry[];
    onStageNpcIds?: string[];
    playerFaction?: string;
}): string {
    const ledger = opts.ledger;
    if (!ledger.length) return '';

    const loreHeaders = (opts.relevantLore ?? [])
        .map(chunk => chunk.header?.toLowerCase() ?? '')
        .filter(Boolean);
    const scan = `${opts.history.slice(-10).map(m => m.content || '').join(' ')} ${opts.userMessage}`;
    const onStage = new Set(opts.onStageNpcIds ?? []);
    const onStageNpcs = (opts.npcLedger ?? []).filter(npc => onStage.has(npc.id));

    const selected: FactionEntry[] = [];
    for (const faction of ledger) {
        if (loreCoversName(faction.name, loreHeaders)) continue;
        const fromText = mentionedIn(scan, faction);
        const fromCast = onStageNpcs.some(npc => allegianceMatchesFaction(npc.faction, faction));
        const fromPc = allegianceMatchesFaction(opts.playerFaction, faction);
        if (fromText || fromCast || fromPc) selected.push(faction);
        if (selected.length >= FACTION_BLOCK_MAX) break;
    }
    if (selected.length === 0) return '';

    const assemble = (entries: FactionEntry[]) =>
        `[FACTIONS]\n${entries.map(entry => factionLine(entry, ledger)).join('\n')}`;

    let entries = selected;
    let block = assemble(entries);
    while (block.length > FACTION_BLOCK_CHAR_CAP && entries.length > 1) {
        entries = entries.slice(0, -1);
        block = assemble(entries);
    }
    if (block.length > FACTION_BLOCK_CHAR_CAP) {
        return block.slice(0, FACTION_BLOCK_CHAR_CAP);
    }
    return block;
}
