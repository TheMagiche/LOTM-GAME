import type { CharacterProfile, CharacterProfileState, PlayerCharacter } from '../../types';
import { formatLotmPathwayLabel } from '../../worldpacks/lotmPathways';
import { formatLotmBountyLine } from '../../worldpacks/lotmPurse';

function nonEmptyList(value: string[] | undefined): string[] | undefined {
    return value && value.length > 0 ? value : undefined;
}

function nonEmptyStats(value: Record<string, number> | undefined): Record<string, number> | undefined {
    return value && Object.keys(value).length > 0 ? value : undefined;
}

/**
 * Build the Stats-tab `characterProfileData` sheet from a seeded PC.
 * Prefers an authored `characterProfile` block on the JSON, then kit / pcMeta,
 * then whatever is already on the campaign context.
 */
export function characterProfileFromPlayerCharacter(
    pc: PlayerCharacter,
    existing: CharacterProfile,
): CharacterProfile {
    const sheet = pc.characterProfile;
    const pathwayLabel = formatLotmPathwayLabel(pc.signatureKit?.pathway, pc.signatureKit?.sequence);
    const sequence = typeof pc.signatureKit?.sequence === 'number'
        ? pc.signatureKit.sequence
        : (typeof pc.skillRung === 'number' ? Math.max(0, 9 - pc.skillRung) : undefined);

    return {
        ...existing,
        name: sheet?.name || pc.name || existing.name,
        race: sheet?.race || pc.visualProfile?.race || existing.race,
        class: sheet?.class || pathwayLabel || pc.pcMeta?.archetype || pc.signatureKit?.element || existing.class,
        level: sheet?.level ?? sequence ?? existing.level,
        hp: sheet?.hp ?? existing.hp,
        mp: sheet?.mp ?? existing.mp,
        stats: nonEmptyStats(sheet?.stats) ?? nonEmptyStats(pc.pcMeta?.stats) ?? existing.stats,
        bounty: sheet?.bounty || formatLotmBountyLine(pc.pcMeta?.bounty) || existing.bounty,
        skills: nonEmptyList(sheet?.skills) ?? existing.skills,
        abilities: nonEmptyList(sheet?.abilities)
            ?? nonEmptyList(pc.signatureKit?.abilities)
            ?? existing.abilities,
        traits: nonEmptyList(sheet?.traits) ?? nonEmptyList(pc.traits) ?? existing.traits,
        notes: sheet?.notes || existing.notes,
    };
}

export function characterIdentityFromPlayerCharacter(
    pc: PlayerCharacter,
    profile: CharacterProfile,
): CharacterProfileState['identity'] {
    return {
        name: profile.name,
        race: profile.race,
        class: profile.class,
        archetype: pc.pcMeta?.archetype || profile.class,
        level: profile.level,
    };
}
