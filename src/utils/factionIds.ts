export function newFactionId(): string {
    return `fac_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
