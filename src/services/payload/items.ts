import type { ChatMessage, ItemLedgerEntry } from '../../types';
import { ITEM_GRADE_LABELS, ITEM_KIND_LABELS } from '../../types';

const ITEM_BLOCK_CHAR_CAP = 700;
const ITEM_BLOCK_MAX = 8;
const NAME_STOP = new Set(['the', 'of', 'and', 'a', 'an', 'item', 'artifact', 'sealed']);

function mentionedIn(scan: string, item: ItemLedgerEntry): boolean {
    const hay = scan.toLowerCase();
    const keys = [
        item.name,
        item.code,
        ...item.aliases.split(/[,;/]/),
    ].map(s => s.trim()).filter(s => s.length >= 4);
    if (keys.some(key => hay.includes(key.toLowerCase()))) return true;
    const tokens = item.name
        .split(/\s+/)
        .map(word => word.replace(/[^a-zA-Z]/g, ''))
        .filter(word => word.length >= 8 && !NAME_STOP.has(word.toLowerCase()));
    return tokens.some(token => hay.includes(token.toLowerCase()));
}

function itemLine(item: ItemLedgerEntry): string {
    const kindLabel = item.kind === 'sealed-artefact' && item.grade
        ? `${ITEM_KIND_LABELS[item.kind]} ${ITEM_GRADE_LABELS[item.grade as Exclude<typeof item.grade, ''>] ?? item.grade}`
        : ITEM_KIND_LABELS[item.kind];
    const meta = [
        item.code,
        kindLabel,
        item.possessed ? (item.holder ? `held by ${item.holder}` : 'in party possession') : item.holder,
        item.status,
    ].filter(Boolean);
    let line = meta.length > 0 ? `${item.name} (${meta.join('; ')})` : item.name;
    if (item.function) {
        const effect = item.function.length > 140 ? `${item.function.slice(0, 139)}…` : item.function;
        line += ` — ${effect}`;
    }
    if (item.downside) {
        const cost = item.downside.length > 80 ? `${item.downside.slice(0, 79)}…` : item.downside;
        line += ` COST: ${cost}`;
    }
    return line;
}

/**
 * Compact [ITEMS] block for possessed artefacts plus anything named in the
 * recent transcript. Empty ledger → empty string (zero regression).
 */
export function buildItemLedgerBlock(opts: {
    ledger: ItemLedgerEntry[];
    history: ChatMessage[];
    userMessage: string;
}): string {
    const ledger = opts.ledger;
    if (!ledger.length) return '';

    const scan = `${opts.history.slice(-10).map(m => m.content || '').join(' ')} ${opts.userMessage}`;
    const selected: ItemLedgerEntry[] = [];
    const seen = new Set<string>();

    const take = (item: ItemLedgerEntry) => {
        if (seen.has(item.id) || selected.length >= ITEM_BLOCK_MAX) return;
        seen.add(item.id);
        selected.push(item);
    };

    for (const item of ledger) {
        if (item.possessed) take(item);
    }
    for (const item of ledger) {
        if (mentionedIn(scan, item)) take(item);
    }
    if (selected.length === 0) return '';

    const assemble = (entries: ItemLedgerEntry[]) =>
        `[ITEMS]\n${entries.map(itemLine).join('\n')}`;

    let entries = selected;
    let block = assemble(entries);
    while (block.length > ITEM_BLOCK_CHAR_CAP && entries.length > 1) {
        entries = entries.slice(0, -1);
        block = assemble(entries);
    }
    if (block.length > ITEM_BLOCK_CHAR_CAP) {
        return block.slice(0, ITEM_BLOCK_CHAR_CAP);
    }
    return block;
}
