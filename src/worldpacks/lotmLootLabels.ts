/** Player-facing labels for LOTM loot tree category keys. Engine keys stay stable. */
const LOTM_LOOT_CATEGORY_LABELS: Record<string, string> = {
    currency: 'Currency (pence / soli / pounds)',
    ordinary: 'Ordinary goods',
    medicine: 'Medicine',
    mystical: 'Mystical items & Beyonder weapons',
    characteristics: 'Ingredients & characteristics',
    artifact: 'Sealed Artifacts',
    bounty: 'Hunt contracts',
    formula: 'Potion formulas',
};

export function labelLotmLootCategory(key: string): string {
    return LOTM_LOOT_CATEGORY_LABELS[key] ?? key.replace(/[-_]/g, ' ');
}
