import type { FactionEntry } from '../../types';
import { normalizeFaction, parseFactions } from '../campaign-state/knowledgeScope';

export function resolveFaction(name: string, ledger: FactionEntry[]): FactionEntry | undefined {
    const target = normalizeFaction(name);
    if (!target) return undefined;
    let hit = ledger.find(e => normalizeFaction(e.name) === target);
    if (hit) return hit;
    hit = ledger.find(e =>
        e.aliases.split(/[,;/]/).map(a => normalizeFaction(a)).filter(Boolean).includes(target)
    );
    return hit;
}

/** True when an NPC/PC allegiance string names this faction. */
export function allegianceMatchesFaction(allegiance: string | undefined, faction: FactionEntry): boolean {
    const owned = parseFactions(allegiance);
    if (owned.length === 0) return false;
    const keys = [
        normalizeFaction(faction.name),
        ...faction.aliases.split(/[,;/]/).map(a => normalizeFaction(a)).filter(Boolean),
    ];
    return owned.some(part => keys.some(key => part === key || part.includes(key) || key.includes(part)));
}
