export function newItemId(): string {
    return `itm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
