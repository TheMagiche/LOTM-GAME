import type { PlayerCharacter } from '../../types';
import {
    formatLotmPathwayLabel,
    formatLotmSequenceName,
    getLotmPathway,
    getLotmSequence,
    resolveLotmPathway,
} from '../../worldpacks/lotmPathways';

/**
 * Replaces the 3-segment interview starter when a tarot PC is already seeded.
 * Rules MD still owns Spirituality / Acting / LoC — this only tells the GM
 * to start the scene from the player's first message.
 */
export const LOTM_PREBUILT_OPENING_STARTER = `# Opening Scene Protocol (pre-built character)

The player has already chosen their Beyonder. Their first message is the character background and the opening brief.

Do NOT run a character-creation interview. Do NOT re-ask name, pathway, Sequence, origin, or home port.

The chronicle begins at the first potion. The opening beat MUST be the player consuming their Sequence 9 potion of the chosen pathway — the cup, the taste, the catalog consumption backlash, the first flicker of Sequence abilities. Digestion starts at 0; do not promote Sequence. Do not skip to a later life, even if the background names later hooks; those wait after the drink.

Treat the brief as established fact. Set the scene in their haunt or home port with Fifth-Epoch texture: coal haze, telegraph clatter, newspaperboys, the wrongness that arrives only after you notice it.
`;

function firstPotionLines(pc: PlayerCharacter): string[] {
    const pathway = getLotmPathway(pc.signatureKit?.pathway)
        ?? resolveLotmPathway(pc.signatureKit?.pathway);
    const sequence = typeof pc.signatureKit?.sequence === 'number' ? pc.signatureKit.sequence : 9;
    const seq = getLotmSequence(pathway, sequence);
    const seqLabel = formatLotmSequenceName(pathway?.id, sequence) || `Sequence ${sequence}`;
    const pathwayName = pathway?.name || 'their pathway';
    const lines = [
        `Tonight I drink the ${seqLabel} potion of the ${pathwayName} — this is the first beat of the chronicle.`,
    ];
    const overview = (seq?.potionOverview ?? '').trim();
    if (overview) lines.push(overview);
    lines.push('Begin the scene with the cup at my lips. Narrate the drinking, the consumption backlash, the transformation, and the first flicker of these Sequence powers. Do not skip past the potion.');
    return lines;
}

function line(...parts: Array<string | undefined>): string {
    return parts.map(part => (part ?? '').trim()).filter(Boolean).join(' ');
}

/**
 * Player-facing first composer message for a seeded playable PC.
 * Empty string when there is no character to introduce.
 */
export function formatLotmOpeningPrompt(pc: PlayerCharacter | null | undefined): string {
    const name = (pc?.name ?? '').trim();
    if (!name) return '';

    const pathway = formatLotmPathwayLabel(pc?.signatureKit?.pathway, pc?.signatureKit?.sequence);
    const who = [name, pathway, pc?.faction].map(part => (part ?? '').trim()).filter(Boolean).join(' — ');
    const blocks: string[] = [
        `Begin the chronicle as ${name}.`,
        '',
        `I am ${who}.`,
    ];

    const appearance = (pc?.appearance ?? '').trim();
    if (appearance) blocks.push(appearance);

    const region = (pc?.region ?? '').trim();
    const haunt = (pc?.haunt ?? '').trim();
    if (region || haunt) {
        blocks.push(line(
            region ? `I live in ${region}.` : undefined,
            haunt ? `Haunt: ${haunt}.` : undefined,
        ));
    }

    const background = (pc?.storyRelevance ?? '').trim();
    if (background) {
        blocks.push('', background);
    }

    const goals = (pc?.goals ?? '').trim();
    if (goals) {
        blocks.push('', `What I want: ${goals}`);
    }

    const temperament = line(pc?.personality, pc?.disposition);
    if (temperament) {
        blocks.push('', temperament);
    }

    blocks.push('', ...firstPotionLines(pc), '', 'Do not interview me.');
    return blocks.join('\n');
}

export function openingPromptToAutoSend(
    messages: { length: number },
    pc: PlayerCharacter | null | undefined,
    opts?: { indexing?: boolean },
): string {
    if (opts?.indexing) return '';
    if (messages.length > 0) return '';
    return formatLotmOpeningPrompt(pc);
}

export function maybeInjectLotmOpeningPrompt(
    messages: { length: number },
    pc: PlayerCharacter | null | undefined,
    inject: (text: string) => void,
): boolean {
    const text = openingPromptToAutoSend(messages, pc);
    if (!text) return false;
    inject(text);
    return true;
}
