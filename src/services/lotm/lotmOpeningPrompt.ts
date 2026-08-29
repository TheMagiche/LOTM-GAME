import type { PlayerCharacter } from '../../types';
import { formatLotmPathwayLabel } from '../../worldpacks/lotmPathways';

/**
 * Replaces the 3-segment interview starter when a tarot PC is already seeded.
 * Rules MD still owns Spirituality / Acting / LoC — this only tells the GM
 * to start the scene from the player's first message.
 */
export const LOTM_PREBUILT_OPENING_STARTER = `# Opening Scene Protocol (pre-built character)

The player has already chosen their Beyonder. Their first message is the character background and opening brief.

Do NOT run a character-creation interview. Do NOT re-ask name, pathway, Sequence, origin, or home port.

Treat the brief as established fact. Begin the opening scene immediately in their home port with Fifth-Epoch texture: coal haze, telegraph clatter, newspaperboys, the wrongness that arrives only after you notice it.
`;

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

    blocks.push('', 'Begin the opening scene from this established life. Do not interview me.');
    return blocks.join('\n');
}

export function maybeInjectLotmOpeningPrompt(
    messages: { length: number },
    pc: PlayerCharacter | null | undefined,
    inject: (text: string) => void,
): boolean {
    if (messages.length > 0) return false;
    const text = formatLotmOpeningPrompt(pc);
    if (!text) return false;
    inject(text);
    return true;
}
