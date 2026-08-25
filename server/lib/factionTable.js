export const factionTableDescriptor = {
    name: 'factions',
    fileSuffix: '.factions.json',
    recordShape: 'array',
    serverRoutes: { present: true, value: { get: true, put: true } },
    transfer: { present: true, value: { bundleKey: 'factions' } },
};

export function registerFactionTable(registry) {
    if (!registry.get(factionTableDescriptor.name)) {
        registry.register(factionTableDescriptor);
    }
}
