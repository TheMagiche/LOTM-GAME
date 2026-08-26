export const itemTableDescriptor = {
    name: 'items',
    fileSuffix: '.items.json',
    recordShape: 'array',
    serverRoutes: { present: true, value: { get: true, put: true } },
    transfer: { present: true, value: { bundleKey: 'items' } },
};

export function registerItemTable(registry) {
    if (!registry.get(itemTableDescriptor.name)) {
        registry.register(itemTableDescriptor);
    }
}
