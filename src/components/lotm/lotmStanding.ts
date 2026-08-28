import type { NPCEntry } from '../../types';
import { relationBand } from '../../services/npc/agency/agencyBands';

/** Standing word for an on-stage NPC. Never returns a number. */
export function standingWordForName(
    name: string | null | undefined,
    npcLedger: NPCEntry[] | undefined,
    onStageNpcIds: string[] | undefined,
    playerName?: string | null,
): string | null {
    const speaker = (name ?? '').trim();
    if (!speaker || speaker === 'Narration') return null;
    if (playerName && speaker === playerName.trim()) return null;
    const onStage = new Set(onStageNpcIds ?? []);
    if (onStage.size === 0) return null;
    const npc = (npcLedger ?? []).find(entry =>
        !entry.archived
        && !entry.isPC
        && onStage.has(entry.id)
        && entry.name === speaker
        && typeof entry.pcRelation === 'number'
    );
    return npc ? relationBand(npc.pcRelation as number) : null;
}

export function standingWordForNpc(npc: NPCEntry | undefined): string | null {
    if (!npc || npc.isPC || typeof npc.pcRelation !== 'number') return null;
    return relationBand(npc.pcRelation);
}
