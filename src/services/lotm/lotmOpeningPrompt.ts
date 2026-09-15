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

The chronicle opens on their ordinary life and the path that puts the Sequence 9 potion in their hands: the formula, the inheritance, the broker, the church, whoever supplied it. Play that stretch as scene, not summary, in their haunt or home port with Fifth-Epoch texture: coal haze, telegraph clatter, newspaperboys, the wrongness that arrives only after you notice it. Do not start at the cup.

The same first reply MUST then reach the drink: they acquire the potion, then consume it — the cup, the taste, the catalog consumption backlash, the first flicker of Sequence abilities. Digestion starts at 0; do not promote Sequence.

Treat the brief as established fact. Do not skip to a later life, even if the background names later hooks (inspectors, strangers who already know a title, deaths that no longer add up); those wait after the drink.
`;

function firstPotionLines(pc: PlayerCharacter): string[] {
    const pathway = getLotmPathway(pc.signatureKit?.pathway)
        ?? resolveLotmPathway(pc.signatureKit?.pathway);
    const sequence = typeof pc.signatureKit?.sequence === 'number' ? pc.signatureKit.sequence : 9;
    const seq = getLotmSequence(pathway, sequence);
    const seqLabel = formatLotmSequenceName(pathway?.id, sequence) || `Sequence ${sequence}`;
    const pathwayName = pathway?.name || 'their pathway';
    const lines = [
        `This is the opening of the chronicle: my life up to the moment I acquire the ${seqLabel} potion of the ${pathwayName}, then I drink it.`,
    ];
    const overview = (seq?.potionOverview ?? '').trim();
    if (overview) lines.push(overview);
    lines.push('Narrate the background through acquiring the potion — how it came to me — then the drinking, the consumption backlash, the transformation, and the first flicker of these Sequence powers. Do not start at the cup. Do not skip past the potion. Do not skip to the life after the drink.');
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
