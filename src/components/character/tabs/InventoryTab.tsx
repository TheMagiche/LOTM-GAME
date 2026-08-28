import { useState, useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { scanInventory } from '../../../services/inventoryParser';
import { toast } from '../../Toast';
import type { EndpointConfig, ProviderConfig, InventoryItemCategory, InventoryItem, ItemLedgerGrade } from '../../../types';
import { ITEM_GRADE_LABELS, normalizeInventoryItem } from '../../../types';
import { isLotmCampaign } from '../../../services/lotm/lotmSkin';
import { LOTM_EXCLUSIVE_UI } from '../../../services/lotm/lotmFlags';
import { formatLotmPurseLine } from '../../../worldpacks/lotmPurse';
import { inventoryItemMatchesTab } from '../../../worldpacks/lotmItemKinds';

const GENERIC_CATS: (InventoryItemCategory | 'all' | 'equipped')[] = ['all', 'equipped', 'weapon', 'armor', 'consumable', 'currency', 'key', 'misc'];
const LOTM_CATS: (InventoryItemCategory | 'all' | 'equipped')[] = ['all', 'equipped', 'beyonder-weapon', 'medicine', 'mystical-item', 'sealed-artefact', 'currency', 'misc'];
const SEALED_GRADES: Array<ItemLedgerGrade | 'all'> = ['all', '0', '1', '2', '3', 'unique'];
const DISPLAY_LABEL: Record<string, string> = {
    all: 'All',
    equipped: 'Equipped',
    weapon: 'Weapon',
    armor: 'Armor',
    consumable: 'Consumable',
    'beyonder-weapon': 'Weapons',
    medicine: 'Medicines',
    'mystical-item': 'Mystical',
    'sealed-artefact': 'Sealed',
    currency: 'Currency',
    key: 'Key',
    misc: 'Misc',
};
const LOTM_ROW_CATS: InventoryItemCategory[] = ['beyonder-weapon', 'medicine', 'mystical-item', 'sealed-artefact', 'currency', 'misc', 'key'];
const GENERIC_ROW_CATS: InventoryItemCategory[] = ['weapon', 'armor', 'consumable', 'currency', 'key', 'misc'];
const ROW_CAT_LABEL: Record<string, string> = {
    'beyonder-weapon': 'Weapon',
    medicine: 'Medicine',
    'mystical-item': 'Mystical',
    'sealed-artefact': 'Sealed',
    currency: 'Currency',
    misc: 'Misc',
    key: 'Key',
    weapon: 'Weapon',
    armor: 'Armor',
    consumable: 'Consumable',
};

function SceneTag({ lastScene }: { lastScene: string }) {
    if (!lastScene || lastScene === 'Never') {
        return <span className="text-text-dim/40">Never updated</span>;
    }
    return <span className="text-terminal/70">Last updated: Scene #{lastScene}</span>;
}

function InventoryRow({
    it,
    lotm,
    onUpdate,
    onRemove,
}: {
    it: InventoryItem;
    lotm: boolean;
    onUpdate: (id: string, patch: Partial<InventoryItem>) => void;
    onRemove: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const cats = lotm ? LOTM_ROW_CATS : GENERIC_ROW_CATS;
    const selectCats = cats.includes(it.category) ? cats : [it.category, ...cats];
    return (
        <div className="border border-border/30 rounded hover:border-border/60 transition-colors">
            <div className="flex items-center gap-2 px-2 py-1 text-[10px]">
                <input
                    type="checkbox"
                    checked={it.equipped}
                    onChange={(e) => onUpdate(it.id, { equipped: e.target.checked, locationTag: e.target.checked ? 'inventory' : it.locationTag })}
                    title="Equipped"
                />
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-text-dim/40 hover:text-text-primary w-3 text-center"
                >
                    {expanded ? '▼' : '▶'}
                </button>
                <input
                    className="flex-1 bg-transparent outline-none text-text-primary px-1 min-w-[0]"
                    value={it.name}
                    onChange={(e) => onUpdate(it.id, { name: e.target.value })}
                />
                <span className="text-[8px] px-1 rounded bg-void border border-border/40 text-text-dim/70 shrink-0 max-w-[80px] truncate" title={`Location: ${it.locationTag || 'inventory'}`}>
                    {it.locationTag || 'inventory'}
                </span>
                <input
                    className="w-8 bg-transparent outline-none text-text-primary text-center"
                    type="number"
                    value={it.qty}
                    min={1}
                    onChange={(e) => onUpdate(it.id, { qty: Math.max(1, Number(e.target.value)) })}
                />
                <select
                    className="bg-void border border-border/50 rounded text-[9px] outline-none focus:border-terminal"
                    value={it.category}
                    onChange={(e) => onUpdate(it.id, { category: e.target.value as InventoryItemCategory })}
                >
                    {selectCats.map((c) => (
                        <option key={c} value={c}>{ROW_CAT_LABEL[c] ?? c}</option>
                    ))}
                </select>
                <button onClick={() => onRemove(it.id)} className="text-ember/60 hover:text-ember px-1">×</button>
            </div>
            {expanded && (
                <div className="px-2 pb-2 space-y-1 border-t border-border/20 pt-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-text-dim/50 w-14">Location Tag</span>
                        <input
                            className="flex-1 bg-void border border-border/30 rounded text-[10px] px-1 outline-none focus:border-terminal"
                            placeholder="Tag location (e.g. inventory, player base, mom's house)"
                            value={it.locationTag || 'inventory'}
                            onChange={(e) => onUpdate(it.id, { locationTag: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-text-dim/50 w-14">Keywords</span>
                        <input
                            className="flex-1 bg-void border border-border/30 rounded text-[10px] px-1 outline-none focus:border-terminal"
                            value={it.keywords.join(', ')}
                            onChange={(e) => onUpdate(it.id, { keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-text-dim/50 w-14">Notes</span>
                        <input
                            className="flex-1 bg-void border border-border/30 rounded text-[10px] px-1 outline-none focus:border-terminal"
                            value={it.notes}
                            onChange={(e) => onUpdate(it.id, { notes: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-text-dim/50 w-14">Importance</span>
                        <input
                            className="w-12 bg-void border border-border/30 rounded text-[10px] px-1 outline-none focus:border-terminal"
                            type="number"
                            value={it.importance}
                            min={1}
                            max={10}
                            onChange={(e) => onUpdate(it.id, { importance: Math.max(1, Math.min(10, Number(e.target.value))) })}
                        />
                    </div>
                    {lotm && it.category === 'sealed-artefact' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-text-dim/50 w-14">Grade</span>
                            <select
                                className="bg-void border border-border/30 rounded text-[10px] px-1 outline-none focus:border-terminal"
                                value={it.grade || ''}
                                onChange={(e) => onUpdate(it.id, { grade: (e.target.value || undefined) as ItemLedgerGrade | undefined })}
                            >
                                <option value="">—</option>
                                {(['0', '1', '2', '3', 'unique'] as ItemLedgerGrade[]).map(g => (
                                    <option key={g} value={g}>{ITEM_GRADE_LABELS[g as Exclude<ItemLedgerGrade, ''>]}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Character Ledger — Inventory tab.
 *
 * Owner: engine scans, user edits. The inventory grid (+ search, category
 * tabs, raw-edit, `Check Inventory` button), moved verbatim from the upper
 * half of the old ContextDrawer `book` tab (BookkeepingTab.tsx).
 */
export function InventoryTab() {
    const context = useAppStore((s) => s.context);
    const updateContext = useAppStore((s) => s.updateContext);
    const messages = useAppStore((s) => s.messages);
    const archiveIndex = useAppStore((s) => s.archiveIndex);

    const inventoryItems = useAppStore((s) => s.inventoryItems ?? s.context.inventoryItems ?? []);
    const setInventoryItems = useAppStore((s) => s.setInventoryItems);
    const getActiveStoryEndpoint = useAppStore((s) => s.getActiveStoryEndpoint);
    const lotm = LOTM_EXCLUSIVE_UI || isLotmCampaign(useAppStore(s => s.activeCampaignMeta));
    const purseLine = lotm ? formatLotmPurseLine(inventoryItems) : '';

    const [activeTab, setActiveTab] = useState<InventoryItemCategory | 'all' | 'equipped'>('all');
    const [gradeFilter, setGradeFilter] = useState<ItemLedgerGrade | 'all'>('all');
    const [search, setSearch] = useState('');
    const [rawEdit, setRawEdit] = useState(false);
    const [isScanningInventory, setIsScanningInventory] = useState(false);

    const getCurrentSceneId = (): string => {
        if (archiveIndex.length === 0) return '1';
        return archiveIndex[archiveIndex.length - 1].sceneId;
    };

    const handleCheckInventory = async () => {
        if (isScanningInventory) return;
        setIsScanningInventory(true);
        try {
            const provider = getActiveStoryEndpoint();
            if (!provider) return;
            const newItems = await scanInventory(provider as ProviderConfig | EndpointConfig, messages, inventoryItems);
            setInventoryItems(newItems);
            updateContext({ inventoryLastScene: getCurrentSceneId() });
        } catch (e) {
            console.error('Failed to scan inventory:', e);
            toast.error('Inventory scan failed');
        } finally {
            setIsScanningInventory(false);
        }
    };

    const updateItem = (id: string, patch: Partial<InventoryItem>) => {
        const target = inventoryItems.find((it) => it.id === id);
        if (!target) return;
        const merged = normalizeInventoryItem({ ...target, ...patch });
        setInventoryItems(inventoryItems.map((it) => it.id === id ? merged : it));
    };
    const addItem = (cat?: InventoryItemCategory) => {
        const newItem: InventoryItem = normalizeInventoryItem({
            id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: 'New Item',
            qty: 1,
            category: cat || 'misc',
            keywords: [],
            equipped: false,
            lastUsedScene: '000',
            importance: 5,
            notes: '',
            locationTag: 'inventory',
            grade: cat === 'sealed-artefact' && gradeFilter !== 'all' ? gradeFilter : undefined,
        });
        setInventoryItems([...inventoryItems, newItem]);
    };
    const removeItem = (id: string) => {
        setInventoryItems(inventoryItems.filter((it) => it.id !== id));
    };

    const tabSet = lotm ? LOTM_CATS : GENERIC_CATS;

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { all: inventoryItems.length };
        for (const cat of tabSet) {
            if (cat === 'all') continue;
            counts[cat] = inventoryItems.filter(it => inventoryItemMatchesTab(it, cat)).length;
        }
        return counts;
    }, [inventoryItems, tabSet]);

    const filteredItems = useMemo(() => {
        let list = inventoryItems.filter(it =>
            inventoryItemMatchesTab(it, activeTab, lotm && activeTab === 'sealed-artefact' ? gradeFilter : 'all'),
        );
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((it) =>
                it.name.toLowerCase().includes(q) ||
                (it.locationTag && it.locationTag.toLowerCase().includes(q)) ||
                it.keywords.some((k) => k.toLowerCase().includes(q))
            );
        }
        return list.slice().sort((a, b) => a.name.localeCompare(b.name));
    }, [inventoryItems, activeTab, search, lotm, gradeFilter]);

    return (
        <div className="px-4 py-4 space-y-4">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setRawEdit(!rawEdit)}
                    className="px-3 py-1.5 text-[10px] uppercase tracking-wider rounded transition-colors border bg-void border-border text-text-dim hover:border-text-primary"
                >
                    {rawEdit ? 'Grid View' : 'Raw Edit'}
                </button>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-ice flex items-center gap-2">
                        Player Inventory <span className="text-[9px] text-text-dim/40">({inventoryItems.length} items)</span>
                    </h3>
                    <button
                        onClick={() => addItem(activeTab !== 'all' && activeTab !== 'equipped' ? (activeTab as InventoryItemCategory) : undefined)}
                        className="text-[9px] uppercase tracking-wider text-terminal border border-dashed border-terminal/30 rounded px-2 py-0.5 hover:border-terminal transition-colors"
                    >
                        + Add
                    </button>
                </div>
                {purseLine && (
                    <p className="text-[11px] text-amber-200/80 mb-2" aria-label="Loen purse">
                        Purse · {purseLine}
                    </p>
                )}

                {rawEdit ? (
                    <textarea
                        className="w-full bg-void border border-border rounded text-text-primary text-[11px] px-2 py-1 focus:border-terminal outline-none font-mono"
                        rows={12}
                        value={JSON.stringify(inventoryItems, null, 2)}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                if (Array.isArray(parsed)) setInventoryItems(parsed.map(normalizeInventoryItem));
                            } catch { /* ignore */ }
                        }}
                    />
                ) : (
                    <>
                        {/* Search */}
                        <input
                            className="w-full bg-void border border-border/50 rounded text-[11px] px-2 py-1 mb-2 outline-none focus:border-terminal text-text-primary"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        {/* Tabs */}
                        <div className="flex flex-wrap gap-1 mb-2">
                            {tabSet.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-2 py-0.5 text-[9px] uppercase tracking-wider rounded border transition-colors ${
                                        activeTab === cat
                                            ? 'bg-terminal/10 border-terminal text-terminal'
                                            : 'bg-void border-border/50 text-text-dim/60 hover:text-text-dim hover:border-border'
                                    }`}
                                >
                                    {DISPLAY_LABEL[cat]} ({tabCounts[cat] || 0})
                                </button>
                            ))}
                        </div>
                        {lotm && activeTab === 'sealed-artefact' && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {SEALED_GRADES.map(grade => (
                                    <button
                                        key={grade}
                                        onClick={() => setGradeFilter(grade)}
                                        className={`px-2 py-0.5 text-[9px] uppercase tracking-wider rounded border transition-colors ${
                                            gradeFilter === grade
                                                ? 'bg-terminal/10 border-terminal text-terminal'
                                                : 'bg-void border-border/50 text-text-dim/60 hover:text-text-dim hover:border-border'
                                        }`}
                                    >
                                        {grade === 'all' ? 'All grades' : ITEM_GRADE_LABELS[grade as Exclude<ItemLedgerGrade, ''>]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* List */}
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredItems.map((it) => (
                                <InventoryRow
                                    key={it.id}
                                    it={it}
                                    lotm={lotm}
                                    onUpdate={updateItem}
                                    onRemove={removeItem}
                                />
                            ))}
                            {filteredItems.length === 0 && (
                                <div className="text-[10px] text-text-dim/40 text-center py-4">No items in this category.</div>
                            )}
                        </div>
                    </>
                )}

                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px]"><SceneTag lastScene={context.inventoryLastScene} /></span>
                    <button
                        onClick={handleCheckInventory}
                        disabled={isScanningInventory}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-void border border-border hover:border-terminal text-text-primary text-[10px] uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                    >
                        {isScanningInventory ? 'Scanning...' : 'Check Inventory'}
                    </button>
                </div>
            </div>
        </div>
    );
}