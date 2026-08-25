// ─── Faction Ledger Types ─────────────────────────────────────────────
// Organization-analogue of the Location Ledger. Structured entries for
// churches, secret orders, houses, and other groups the story tracks.
// Seeded from lore (`parseFactionsFromLore`) and editable in FactionLedgerModal.

export type FactionRelationKind = 'allied' | 'opposed' | 'neutral';

export type FactionRelation = {
    toId: string;
    kind: FactionRelationKind;
    note?: string;
};

export type FactionEntry = {
    id: string;
    name: string;
    aliases: string;
    type: string;
    stance: string;
    keyMembers: string;
    region: string;
    pathways: string;
    description: string;
    status?: string;
    relations: FactionRelation[];
    firstSeenScene: string;
    lastSeenScene: string;
    source: 'llm' | 'manual';
};
