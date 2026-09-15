/** Author-source filenames under mechanics/.../Lord of the Mysteries/lore/. */
export const LOTM_LORE_PART_FILES = [
    'overview.md',
    'factions.md',
    'locations.md',
    'characters_gameplay.md',
    'power_economy_events.md',
    'engine_seeds.md',
] as const;

/** Join lore author sources into the single markdown string the RAG chunker expects. */
export function concatenateLotmLore(parts: readonly string[]): string {
    return parts
        .map(part => String(part).replace(/\s+$/g, ''))
        .filter(part => part.length > 0)
        .join('\n\n') + '\n';
}
