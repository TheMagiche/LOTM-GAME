import type { LocationEntry, NPCEntry } from '../../types';
import { PROPER_NOUN_STOP_WORDS } from '../../utils/stopWords';
import {
    LOTM_CG_ECHOES,
    LOTM_DEFAULT_BACKDROP,
    LOTM_PLACES,
    LOTM_PORTRAITS,
    normalizeAlias,
    type LotmCgEcho,
    type LotmPortraitVisual,
} from '../../worldpacks/lotmVisualManifest';

const WEAK_SINGLE_TOKENS = new Set([
    'the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'with', 'by',
    ...[...PROPER_NOUN_STOP_WORDS].map(w => w.toLowerCase()),
]);

function tokensOf(normalized: string): string[] {
    return normalized.split(/\s+/).filter(Boolean);
}

/** Single-word articles/stopwords are too common to use as visual aliases. */
export function isWeakAlias(normalized: string): boolean {
    const tokens = tokensOf(normalized);
    if (tokens.length === 0) return true;
    if (tokens.length >= 2) return false;
    const t = tokens[0];
    return t.length < 3 || WEAK_SINGLE_TOKENS.has(t);
}

/** True when `needle` appears as consecutive whole words in `hay`. */
export function phraseContained(hay: string, needle: string): boolean {
    const hayT = tokensOf(hay);
    const needleT = tokensOf(needle);
    if (!needleT.length || needleT.length > hayT.length) return false;
    for (let i = 0; i <= hayT.length - needleT.length; i++) {
        let ok = true;
        for (let j = 0; j < needleT.length; j++) {
            if (hayT[i + j] !== needleT[j]) { ok = false; break; }
        }
        if (ok) return true;
    }
    return false;
}

function longestMatchingAlias(aliases: string[], text: string): string | null {
    const hay = normalizeAlias(text);
    let best: string | null = null;
    for (const alias of aliases) {
        const a = normalizeAlias(alias);
        if (!a || isWeakAlias(a)) continue;
        if (phraseContained(hay, a) && a.length > (best?.length ?? 0)) best = a;
    }
    return best;
}

function isAutoLotmPortrait(src: string): boolean {
    return /\/assets\/lotm\//.test(src) || src.startsWith('image/characters/') || src.startsWith('image/vol_');
}

function manifestPortraitSrc(portrait: string): string {
    return portrait.startsWith('/') ? portrait : `/assets/lotm/${portrait}`;
}

/** Prefer a manifest hit over a previously auto-attached (and possibly wrong) LOTM asset. */
function resolvePortraitSrc(stored: string | undefined, hit: LotmPortraitVisual | null): string {
    if (hit) {
        const next = hit.portrait;
        if (!stored || isAutoLotmPortrait(stored)) return next;
    }
    return stored || '';
}

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

export function matchLotmBackdrop(placeName?: string | null, placeAliases?: string | null, gmText?: string | null): string {
    const text = haystack([placeName, placeAliases, gmText]);
    if (!text) return LOTM_DEFAULT_BACKDROP;
    let best: { id: string; backdrop: string; len: number } | null = null;
    for (const place of LOTM_PLACES) {
        for (const alias of place.aliases) {
            const a = normalizeAlias(alias);
            if (a && !isWeakAlias(a) && phraseContained(text, a) && a.length >= (best?.len ?? 0)) {
                best = { id: place.id, backdrop: place.backdrop, len: a.length };
            }
        }
    }
    return best?.backdrop ?? LOTM_DEFAULT_BACKDROP;
}

export function matchLotmPortraitEntry(name: string, spoilers: boolean): LotmPortraitVisual | null {
    const key = normalizeAlias(name);
    if (!key) return null;
    // A bare article ("The") must not pick "the hanged man" / "the sun".
    if (isWeakAlias(key) && tokensOf(key).length === 1) return null;
    let best: LotmPortraitVisual | null = null;
    let bestLen = 0;
    for (const entry of LOTM_PORTRAITS) {
        if (entry.spoiler && !spoilers) continue;
        for (const alias of entry.aliases) {
            const a = normalizeAlias(alias);
            if (!a || isWeakAlias(a)) continue;
            const hit = key === a
                || phraseContained(key, a)
                || (!isWeakAlias(key) && phraseContained(a, key));
            if (hit && a.length > bestLen) {
                best = entry;
                bestLen = a.length;
            }
        }
    }
    return best;
}

type RankedPortraitHit = LotmPortraitHit & { matchedAlias: string; locked?: boolean };

function suppressNestedAliasHits(hits: RankedPortraitHit[]): RankedPortraitHit[] {
    return hits.filter(h => h.locked || !hits.some(other =>
        other !== h
        && other.matchedAlias !== h.matchedAlias
        && phraseContained(other.matchedAlias, h.matchedAlias)
    ));
}

export function matchLotmPortraits(input: LotmMatchInput): LotmPortraitHit[] {
    const spoilers = !!input.spoilers;
    const ranked: RankedPortraitHit[] = [];
    const seen = new Set<string>();

    const push = (name: string, src: string, matchedAlias: string, opts?: { isPc?: boolean; locked?: boolean }) => {
        const key = normalizeAlias(name);
        if (!key || seen.has(key) || !src) return;
        seen.add(key);
        ranked.push({
            name, src, isPc: opts?.isPc, locked: opts?.locked,
            matchedAlias: normalizeAlias(matchedAlias) || key,
        });
    };

    const pc = input.playerCharacter;
    if (pc) {
        const fromManifest = matchLotmPortraitEntry(pc.name, spoilers);
        const src = resolvePortraitSrc(pc.portrait, fromManifest);
        if (src) push(pc.name, src, pc.name, { isPc: true, locked: true });
    }

    const ledger = input.npcLedger ?? [];
    const onStage = new Set(input.onStageNpcIds ?? []);
    const gm = input.latestGmText ?? '';

    for (const npc of ledger) {
        if (npc.archived) continue;
        const staged = onStage.has(npc.id);
        const namedAlias = gm
            ? longestMatchingAlias([npc.name, ...(npc.aliases ? npc.aliases.split(',') : [])], gm)
            : null;
        if (!staged && !namedAlias) continue;
        const fromManifest = matchLotmPortraitEntry(npc.name, spoilers)
            ?? (npc.aliases ? matchLotmPortraitEntry(npc.aliases.split(',')[0] ?? '', spoilers) : null);
        const src = resolvePortraitSrc(npc.portrait, fromManifest);
        if (src) push(npc.name, src, namedAlias || npc.name, { locked: staged });
    }

    if (gm) {
        for (const entry of LOTM_PORTRAITS) {
            if (entry.spoiler && !spoilers) continue;
            const matched = longestMatchingAlias(entry.aliases, gm);
            if (!matched) continue;
            const display = entry.aliases[0];
            push(display.replace(/\b\w/g, c => c.toUpperCase()), entry.portrait, matched);
        }
    }

    return suppressNestedAliasHits(ranked).slice(0, 3).map(({ matchedAlias: _a, locked: _l, ...hit }) => hit);
}

export function matchLotmCgEcho(input: LotmMatchInput, dismissed: ReadonlySet<string> = new Set()): LotmCgEcho | null {
    const spoilers = !!input.spoilers;
    const text = haystack([input.latestGmText]);
    if (!text) return null;
    let best: { echo: LotmCgEcho; len: number } | null = null;
    for (const echo of LOTM_CG_ECHOES) {
        if (echo.tag === 'spoiler' && !spoilers) continue;
        if (dismissed.has(echo.image)) continue;
        for (const alias of echo.aliases) {
            const a = normalizeAlias(alias);
            if (a && !isWeakAlias(a) && phraseContained(text, a) && a.length >= (best?.len ?? 0)) {
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
    mode: 'fill' | 'correct' = 'fill',
): T[] {
    return npcs.map(npc => {
        const hit = matchLotmPortraitEntry(npc.name, spoilers)
            ?? (npc.aliases ? matchLotmPortraitEntry(npc.aliases.split(',')[0] ?? '', spoilers) : null);
        if (!hit) return npc;
        const next = manifestPortraitSrc(hit.portrait);
        if (npc.portrait === next) return npc;
        if (npc.portrait && !isAutoLotmPortrait(npc.portrait)) return npc;
        if (!npc.portrait && mode === 'correct') return npc;
        return { ...npc, portrait: next };
    });
}

export function findTingenLocationId(locations: LocationEntry[]): string | null {
    const hit = locations.find(loc => {
        const text = haystack([loc.name, loc.aliases, loc.broadLocation]);
        return text.includes('tingen');
    });
    return hit?.id ?? null;
}
