import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Gem, Plus, Search, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ItemLedgerEntry, ItemLedgerGrade, ItemLedgerKind } from '../types';
import { EMPTY_ITEM_ENTRY, ITEM_GRADE_LABELS, ITEM_KIND_LABELS, normalizeInventoryItem, normalizeItemLedgerEntry } from '../types';
import { ItemEditForm } from './inventory-ledger/ItemEditForm';
import { filterItems, itemLedgerFilterLabel, ITEM_LEDGER_FILTERS, type ItemLedgerFilter } from '../utils/ledgerFilters';
import { newItemId } from '../utils/itemIds';
import { loadLotmItemCatalog } from '../worldpacks/lotmItemCatalog';
import {
    catalogAlreadySeeded,
    inventoryKeywordsFromLedger,
    inventoryNotesFromLedger,
    ledgerKindToInventoryCategory,
} from '../worldpacks/lotmItemKinds';
import { toast } from './Toast';

function kindBadge(item: ItemLedgerEntry): string {
    if (item.kind === 'sealed-artefact' && item.grade) {
        return ITEM_GRADE_LABELS[item.grade] ?? 'Sealed Artifact';
    }
    return ITEM_KIND_LABELS[item.kind];
}

function newItemFromFilter(filter: ItemLedgerFilter): Partial<ItemLedgerEntry> {
    if (filter === 'grade-0' || filter === 'grade-1' || filter === 'grade-2' || filter === 'grade-3' || filter === 'grade-unique') {
        const grade = (filter === 'grade-unique' ? 'unique' : filter.replace('grade-', '')) as ItemLedgerGrade;
        return { ...EMPTY_ITEM_ENTRY, kind: 'sealed-artefact', grade };
    }
    if (filter !== 'all' && filter !== 'possessed' && filter !== 'other') {
        return { ...EMPTY_ITEM_ENTRY, kind: filter as ItemLedgerKind };
    }
    return { ...EMPTY_ITEM_ENTRY, kind: 'other' };
}

function ledgerFilterCount(items: ItemLedgerEntry[], filter: ItemLedgerFilter): number {
    if (filter === 'all') return items.length;
    return filterItems(items, '', filter).length;
}

export function InventoryLedgerModal() {
    const {
        itemLedger,
        itemLedgerOpen,
        toggleItemLedger,
        addLedgerItem,
        updateLedgerItem,
        removeLedgerItem,
        setItemLedger,
        inventoryItems,
        setInventoryItems,
        playerCharacter,
    } = useAppStore();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [kindFilter, setKindFilter] = useState<ItemLedgerFilter>('all');
    const [form, setForm] = useState<Partial<ItemLedgerEntry>>({ ...EMPTY_ITEM_ENTRY });

    const displayed = useMemo(
        () => filterItems(itemLedger, searchQuery, kindFilter),
        [itemLedger, searchQuery, kindFilter],
    );

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const filter of ITEM_LEDGER_FILTERS) {
            counts[filter] = ledgerFilterCount(itemLedger, filter);
        }
        return counts;
    }, [itemLedger]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && itemLedgerOpen) toggleItemLedger();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [itemLedgerOpen, toggleItemLedger]);

    if (!itemLedgerOpen) return null;

    const handleSelect = (item: ItemLedgerEntry) => {
        setSelectedId(item.id);
        setForm({ ...item });
        setIsEditing(false);
    };

    const handleStartEditing = () => {
        if (!selectedId) return;
        const latest = itemLedger.find(item => item.id === selectedId);
        if (!latest) return;
        setForm({ ...latest });
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setSelectedId(null);
        setForm(newItemFromFilter(kindFilter));
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!form.name?.trim()) return;
        const payload = normalizeItemLedgerEntry({
            ...EMPTY_ITEM_ENTRY,
            ...form,
            id: selectedId || form.id || newItemId(),
            name: form.name.trim(),
            firstSeenScene: form.firstSeenScene || String(Date.now()),
            lastSeenScene: form.lastSeenScene || String(Date.now()),
            source: form.source ?? 'manual',
        });
        if (selectedId) {
            updateLedgerItem(selectedId, payload);
        } else {
            addLedgerItem(payload);
        }
        setSelectedId(payload.id);
        setForm(payload);
        setIsEditing(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this item from the ledger?')) {
            removeLedgerItem(id);
            if (selectedId === id) { setSelectedId(null); setIsEditing(false); }
        }
    };

    const handleSeedCatalog = () => {
        const catalog = loadLotmItemCatalog();
        if (catalog.length === 0) {
            toast.error('Canon catalog is empty.');
            return;
        }
        const additions = catalog.filter(item => !catalogAlreadySeeded(item, itemLedger));
        if (additions.length === 0) {
            toast.success('Every catalog item is already in the ledger.');
            return;
        }
        setItemLedger([...itemLedger, ...additions]);
        toast.success(`Seeded ${additions.length} item(s) from the canon catalog.`);
    };

    const handleGrantToCharacter = () => {
        if (!selectedId) return;
        const latest = itemLedger.find(item => item.id === selectedId) ?? normalizeItemLedgerEntry(form);
        const holder = playerCharacter?.name?.trim() || latest.holder || 'Player';
        const patched = normalizeItemLedgerEntry({
            ...latest,
            possessed: true,
            holder,
            locationTag: latest.locationTag || 'inventory',
        });
        updateLedgerItem(patched.id, patched);
        setForm(patched);

        const alreadyCarried = inventoryItems.some(it =>
            it.name.trim().toLowerCase() === patched.name.trim().toLowerCase()
        );
        if (!alreadyCarried) {
            const keywords = inventoryKeywordsFromLedger(patched);
            setInventoryItems([
                ...inventoryItems,
                normalizeInventoryItem({
                    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    name: patched.name,
                    qty: 1,
                    category: ledgerKindToInventoryCategory(patched.kind),
                    keywords,
                    equipped: false,
                    lastUsedScene: '000',
                    importance: patched.kind === 'sealed-artefact' ? 9 : 6,
                    notes: inventoryNotesFromLedger(patched),
                    locationTag: 'inventory',
                    grade: patched.kind === 'sealed-artefact' ? patched.grade : undefined,
                }),
            ]);
        }
        toast.success(`Granted "${patched.name}" to character inventory.`);
    };

    const handleCancelEdit = () => {
        if (selectedId) {
            const existing = itemLedger.find(item => item.id === selectedId);
            if (existing) handleSelect(existing);
        } else {
            setSelectedId(null);
        }
        setIsEditing(false);
    };

    const renderedForm = !isEditing && selectedId
        ? itemLedger.find(item => item.id === selectedId) ?? form
        : form;

    const filterLabel = (filter: ItemLedgerFilter) => itemLedgerFilterLabel(filter);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-void/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Inventory Ledger"
            onClick={toggleItemLedger}
        >
            <div
                className="bg-surface border border-border flex flex-col sm:flex-row w-full h-full overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-full sm:w-1/3 md:w-96 lg:w-[420px] border-b sm:border-b-0 sm:border-r border-border flex flex-col bg-void-lighter max-h-[40vh] sm:max-h-none shrink-0">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-void">
                        <div className="flex items-center gap-2 text-terminal font-bold uppercase tracking-widest text-sm">
                            <Gem size={16} /> Inventory Ledger
                        </div>
                        <button onClick={toggleItemLedger} className="text-text-dim hover:text-text-primary p-1 sm:hidden shrink-0">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-3 py-2 border-b border-border bg-void-lighter shrink-0">
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search name, code, holder, status..."
                                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-terminal transition-colors"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary transition-colors">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {ITEM_LEDGER_FILTERS.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setKindFilter(filter)}
                                    className={`px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded border transition-colors ${
                                        kindFilter === filter
                                            ? 'bg-terminal/10 border-terminal text-terminal'
                                            : 'bg-void border-border/50 text-text-dim/60 hover:text-text-dim hover:border-border'
                                    }`}
                                >
                                    {filterLabel(filter)} ({tabCounts[filter] || 0})
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 border-b border-border bg-void-lighter shrink-0 space-y-2">
                        <button
                            onClick={handleCreateNew}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed rounded text-xs uppercase tracking-wider transition-colors ${!selectedId && isEditing ? 'border-terminal text-terminal bg-terminal/10' : 'border-border text-text-dim hover:text-terminal hover:border-terminal'}`}
                        >
                            <Plus size={14} /> New Item
                        </button>
                        <button
                            onClick={handleSeedCatalog}
                            title="Add every canon Sealed Artifact, mystical item, weapon, and medicine that isn't already here"
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-border rounded text-xs uppercase tracking-wider text-text-dim hover:text-terminal hover:border-terminal transition-colors"
                        >
                            <BookOpen size={14} /> Seed Canon Catalog
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {displayed.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2 opacity-60">
                                <Gem size={32} strokeWidth={1} className="opacity-50" />
                                <p className="text-text-dim text-xs uppercase tracking-widest font-bold">
                                    {searchQuery.trim() ? `No matches for "${searchQuery.trim()}".` : 'No items recorded yet.'}
                                </p>
                                {!searchQuery.trim() && (
                                    <p className="text-text-dim/60 text-[10px] max-w-[260px] leading-relaxed normal-case tracking-normal">
                                        Use New Item, or Seed Canon Catalog to import Sealed Artifacts, medicines, and Beyonder weapons.
                                    </p>
                                )}
                            </div>
                        )}
                        {displayed.length > 0 && displayed.map(item => {
                            const isActive = selectedId === item.id && !isEditing;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    className={`flex items-center justify-between p-3 cursor-pointer border-l-2 transition-all group ${isActive ? 'border-terminal bg-terminal/5' : 'border-transparent hover:bg-surface'}`}
                                >
                                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                        <Gem size={14} className={`shrink-0 ${isActive ? 'text-terminal' : 'text-text-dim'}`} />
                                        <div className="truncate min-w-0">
                                            <p className={`text-sm font-bold truncate ${isActive ? 'text-terminal glow-green-sm' : 'text-text-primary'}`}>
                                                {item.name}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] mt-0.5 text-text-dim truncate">
                                                <span className="bg-terminal/10 text-terminal px-1 rounded uppercase shrink-0">{kindBadge(item)}</span>
                                                {item.code && <span className="font-mono shrink-0">{item.code}</span>}
                                                {item.possessed && <span className="text-ice shrink-0">held</span>}
                                                {item.status && <span className="truncate">{item.status}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={e => handleDelete(item.id, e)}
                                        className="p-1.5 text-text-dim hover:text-danger hover:bg-danger/10 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-surface overflow-hidden relative">
                    <button
                        onClick={toggleItemLedger}
                        className="absolute top-4 right-4 text-text-dim hover:text-text-primary hidden sm:block p-1 bg-void rounded border border-border hover:border-terminal transition-colors z-10"
                    >
                        <X size={18} />
                    </button>

                    {!selectedId && !isEditing && (
                        <div className="flex-1 flex items-center justify-center p-8 text-text-dim text-sm">
                            <div className="text-center space-y-2">
                                <Gem size={32} className="mx-auto opacity-30" />
                                <p>Select an item or create a new one.</p>
                            </div>
                        </div>
                    )}

                    {(selectedId || isEditing) && (
                        <ItemEditForm
                            renderedForm={renderedForm}
                            isEditing={isEditing}
                            selectedId={selectedId}
                            setForm={setForm}
                            onStartEditing={handleStartEditing}
                            onCancel={handleCancelEdit}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onGrantToCharacter={handleGrantToCharacter}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
