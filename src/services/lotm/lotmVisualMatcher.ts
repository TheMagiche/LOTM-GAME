import type { LocationEntry, NPCEntry } from '../../types';
import {
    LOTM_CG_ECHOES,
    LOTM_DEFAULT_BACKDROP,
    LOTM_PLACES,
    LOTM_PORTRAITS,
    normalizeAlias,
    type LotmCgEcho,
    type LotmPortraitVisual,
} from '../../worldpacks/lotmVisualManifest';

export type LotmMatchInput = {
    placeName?: string | null;
    placeAliases?: string | null;
    latestGmText?: string | null;
    npcLedger?: NPCEntry[];
    onStageNpcIds?: string[];
    playerCharacter?: NPCEntry | null;
    spoilers?: boolean;
};

export type LotmPortraitHit = {
    name: string;
    src: string;
    isPc?: boolean;
};

export type LotmVisualMatch = {
    backdrop: string;
    portraits: LotmPortraitHit[];
    cgEcho: LotmCgEcho | null;
    speakerName: string;
};

function haystack(parts: Array<string | null | undefined>): string {
    return normalizeAlias(parts.filter(Boolean).join(' '));
}

function aliasHits(aliases: string[], text: string): boolean {
    const hay = normalizeAlias(text);
    return aliases.some(alias => {
        const a = normalizeAlias(alias);
        if (!a) return false;
        return hay.includes(a);
    });
}

export function matchLotmBackdrop(placeName?: string | null, placeAliases?: string | null, gmText?: string | null): string {
    const text = haystack([placeName, placeAliases, gmText]);
    if (!text) return LOTM_DEFAULT_BACKDROP;
    let best: { id: string; backdrop: string; len: number } | null = null;
    for (const place of LOTM_PLACES) {
        for (const alias of place.aliases) {
            const a = normalizeAlias(alias);
            if (a && text.includes(a) && a.length >= (best?.len ?? 0)) {
                best = { id: place.id, backdrop: place.backdrop, len: a.length };
            }
        }
    }
    return best?.backdrop ?? LOTM_DEFAULT_BACKDROP;
}

export function matchLotmPortraitEntry(name: string, spoilers: boolean): LotmPortraitVisual | null {
    const key = normalizeAlias(name);
    if (!key) return null;
    let best: LotmPortraitVisual | null = null;
    let bestLen = 0;
    for (const entry of LOTM_PORTRAITS) {
        if (entry.spoiler && !spoilers) continue;
        for (const alias of entry.aliases) {
            const a = normalizeAlias(alias);
            if (a && (key === a || key.includes(a) || a.includes(key)) && a.length > bestLen) {
                best = entry;
                bestLen = a.length;
            }
        }
    }
    return best;
}

export function matchLotmPortraits(input: LotmMatchInput): LotmPortraitHit[] {
    const spoilers = !!input.spoilers;
    const hits: LotmPortraitHit[] = [];
    const seen = new Set<string>();

    const push = (name: string, src: string, isPc?: boolean) => {
        const key = normalizeAlias(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        hits.push({ name, src, isPc });
    };

    const pc = input.playerCharacter;
    if (pc) {
        const fromManifest = matchLotmPortraitEntry(pc.name, spoilers);
        const src = pc.portrait || fromManifest?.portrait || '';
        if (src) push(pc.name, src, true);
    }

    const ledger = input.npcLedger ?? [];
    const onStage = new Set(input.onStageNpcIds ?? []);
    const gm = input.latestGmText ?? '';

    for (const npc of ledger) {
        if (npc.archived) continue;
        const staged = onStage.has(npc.id);
        const named = aliasHits([npc.name, ...(npc.aliases ? npc.aliases.split(',') : [])], gm);
        if (!staged && !named) continue;
        const fromManifest = matchLotmPortraitEntry(npc.name, spoilers);
        const src = npc.portrait || fromManifest?.portrait || '';
        if (src) push(npc.name, src);
    }

    if (gm) {
        for (const entry of LOTM_PORTRAITS) {
            if (entry.spoiler && !spoilers) continue;
            if (aliasHits(entry.aliases, gm)) {
                const display = entry.aliases[0];
                push(display.replace(/\b\w/g, c => c.toUpperCase()), entry.portrait);
            }
        }
    }

    return hits.slice(0, 3);
}

export function matchLotmCgEcho(input: LotmMatchInput, dismissed: ReadonlySet<string> = new Set()): LotmCgEcho | null {
    const spoilers = !!input.spoilers;
    const text = haystack([
        input.placeName,
        input.placeAliases,
        input.latestGmText,
        ...(input.npcLedger ?? []).filter(n => (input.onStageNpcIds ?? []).includes(n.id)).map(n => n.name),
    ]);
    if (!text) return null;
    let best: { echo: LotmCgEcho; len: number } | null = null;
    for (const echo of LOTM_CG_ECHOES) {
        if (echo.tag === 'spoiler' && !spoilers) continue;
        if (dismissed.has(echo.image)) continue;
        for (const alias of echo.aliases) {
            const a = normalizeAlias(alias);
            if (a && text.includes(a) && a.length >= (best?.len ?? 0)) {
                best = { echo, len: a.length };
            }
        }
    }
    return best?.echo ?? null;
}

export function inferSpeakerName(gmText: string | null | undefined, portraits: LotmPortraitHit[]): string {
    const text = gmText ?? '';
    const bracket = text.match(/\[\*{0,2}\s*([A-Za-z][A-Za-z0-9 _.'-]{1,40})\s*\*{0,2}\]/);
    if (bracket?.[1] && !bracket[1].includes(':')) return bracket[1].trim();
    const bold = text.match(/\*\*([A-Za-z][A-Za-z0-9 _.'-]{1,40})\*\*/);
    if (bold?.[1]) return bold[1].trim();
    if (portraits.length === 1 && !portraits[0].isPc) return portraits[0].name;
    return 'Narration';
}

export function matchLotmVisuals(input: LotmMatchInput, dismissedCgs: ReadonlySet<string> = new Set()): LotmVisualMatch {
    const portraits = matchLotmPortraits(input);
    return {
        backdrop: matchLotmBackdrop(input.placeName, input.placeAliases, input.latestGmText),
        portraits,
        cgEcho: matchLotmCgEcho(input, dismissedCgs),
        speakerName: inferSpeakerName(input.latestGmText, portraits),
    };
}

export function attachLotmPortraitsToNpcs<T extends { name: string; aliases?: string; portrait?: string }>(
    npcs: T[],
    spoilers = false,
): T[] {
    return npcs.map(npc => {
        if (npc.portrait) return npc;
        const hit = matchLotmPortraitEntry(npc.name, spoilers)
            ?? (npc.aliases ? matchLotmPortraitEntry(npc.aliases.split(',')[0] ?? '', spoilers) : null);
        if (!hit) return npc;
        return { ...npc, portrait: `/assets/lotm/${hit.portrait}` };
    });
}

export function findTingenLocationId(locations: LocationEntry[]): string | null {
    const hit = locations.find(loc => {
        const text = haystack([loc.name, loc.aliases, loc.broadLocation]);
        return text.includes('tingen');
    });
    return hit?.id ?? null;
}
