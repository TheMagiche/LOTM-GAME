import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Landmark, Trash2, Search, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { FactionEntry, FactionRelationKind } from '../types';
import { FactionEditForm } from './faction-ledger/FactionEditForm';
import { filterFactions } from '../utils/ledgerFilters';
import { parseFactionsFromLore } from '../services/lore/loreFactionParser';
import { resolveFaction } from '../services/faction/resolveFaction';
import { newFactionId } from '../utils/factionIds';

const EMPTY_ENTRY: FactionEntry = {
    id: '',
    name: '',
    aliases: '',
    type: '',
    stance: '',
    keyMembers: '',
    region: '',
    pathways: '',
    description: '',
    status: '',
    relations: [],
    firstSeenScene: '',
    lastSeenScene: '',
    source: 'manual',
};

export function FactionLedgerModal() {
    const {
        factionLedger,
        factionLedgerOpen,
        toggleFactionLedger,
        addFaction,
        updateFaction,
        removeFaction,
        setFactionLedger,
    } = useAppStore();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [form, setForm] = useState<Partial<FactionEntry>>({ ...EMPTY_ENTRY });
    const [newRelationTo, setNewRelationTo] = useState('');
    const [newRelationKind, setNewRelationKind] = useState<FactionRelationKind>('allied');
    const [newRelationNote, setNewRelationNote] = useState('');

    const displayed = useMemo(() => filterFactions(factionLedger, searchQuery), [factionLedger, searchQuery]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && factionLedgerOpen) toggleFactionLedger();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [factionLedgerOpen, toggleFactionLedger]);

    if (!factionLedgerOpen) return null;

    const handleSelect = (fac: FactionEntry) => {
        setSelectedId(fac.id);
        setForm({ ...fac });
        setNewRelationTo('');
        setNewRelationKind('allied');
        setNewRelationNote('');
        setIsEditing(false);
    };

    const handleStartEditing = () => {
        if (!selectedId) return;
        const latest = factionLedger.find(f => f.id === selectedId);
        if (!latest) return;
        setForm({ ...latest });
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setSelectedId(null);
        setForm({ ...EMPTY_ENTRY });
        setNewRelationTo('');
        setNewRelationKind('allied');
        setNewRelationNote('');
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!form.name?.trim()) return;
        const payload: FactionEntry = {
            id: selectedId || form.id || newFactionId(),
            name: form.name.trim(),
            aliases: (form.aliases ?? '').trim(),
            type: (form.type ?? '').trim(),
            stance: (form.stance ?? '').trim(),
            keyMembers: (form.keyMembers ?? '').trim(),
            region: (form.region ?? '').trim(),
            pathways: (form.pathways ?? '').trim(),
            description: (form.description ?? '').trim(),
            status: (form.status ?? '').trim() || undefined,
            relations: form.relations ?? [],
            firstSeenScene: form.firstSeenScene || String(Date.now()),
            lastSeenScene: form.lastSeenScene || String(Date.now()),
            source: form.source ?? 'manual',
        };
        if (selectedId) {
            updateFaction(selectedId, payload);
        } else {
            addFaction(payload);
        }
        setSelectedId(payload.id);
        setForm(payload);
        setIsEditing(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this faction from the ledger?')) {
            removeFaction(id);
            if (selectedId === id) { setSelectedId(null); setIsEditing(false); }
        }
    };

    const handleSeedFromLore = () => {
        const chunks = useAppStore.getState().loreChunks || [];
        const parsed = parseFactionsFromLore(chunks);
        if (parsed.length === 0) { alert('No ## FACTIONS block found in the lore file.'); return; }

        const additions = parsed.filter(fac => !resolveFaction(fac.name, factionLedger));
        if (additions.length === 0) { alert('Every lore faction is already in the ledger.'); return; }

        setFactionLedger([...factionLedger, ...additions]);
        alert(`Seeded ${additions.length} faction(s) from lore.`);
    };

    const handleAddRelation = () => {
        if (!selectedId || !newRelationTo) return;
        const other = factionLedger.find(f => f.id === newRelationTo);
        if (!other || other.id === selectedId) return;
        const current = form.relations ?? [];
        if (current.some(r => r.toId === other.id)) return;
        const relation = {
            toId: other.id,
            kind: newRelationKind,
            note: newRelationNote.trim() || undefined,
        };
        setForm(prev => ({ ...prev, relations: [...current, relation] }));
        const reciprocalExists = other.relations.some(r => r.toId === selectedId);
        if (!reciprocalExists) {
            updateFaction(other.id, {
                relations: [...other.relations, { toId: selectedId, kind: newRelationKind, note: relation.note }],
            });
        }
        setNewRelationTo('');
        setNewRelationNote('');
    };

    const handleRemoveRelation = (toId: string) => {
        if (!selectedId) return;
        setForm(prev => ({ ...prev, relations: (prev.relations ?? []).filter(r => r.toId !== toId) }));
        const other = factionLedger.find(f => f.id === toId);
        if (other && other.relations.some(r => r.toId === selectedId)) {
            updateFaction(other.id, {
                relations: other.relations.filter(r => r.toId !== selectedId),
            });
        }
    };

    const handleCancelEdit = () => {
        if (selectedId) {
            const existing = factionLedger.find(f => f.id === selectedId);
            if (existing) handleSelect(existing);
        } else {
            setSelectedId(null);
        }
        setIsEditing(false);
    };

    const renderedForm = !isEditing && selectedId
        ? factionLedger.find(f => f.id === selectedId) ?? form
        : form;

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-void/95 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Faction Ledger"
            onClick={toggleFactionLedger}
        >
            <div
                className="bg-surface border border-border flex flex-col sm:flex-row w-full h-full overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-full sm:w-1/3 md:w-96 lg:w-[420px] border-b sm:border-b-0 sm:border-r border-border flex flex-col bg-void-lighter max-h-[40vh] sm:max-h-none shrink-0">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-void">
                        <div className="flex items-center gap-2 text-terminal font-bold uppercase tracking-widest text-sm">
                            <Landmark size={16} /> Faction Ledger
                        </div>
                        <button onClick={toggleFactionLedger} className="text-text-dim hover:text-text-primary p-1 sm:hidden shrink-0">
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
                                placeholder="Search name, alias, type, region..."
                                className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded text-xs text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-terminal transition-colors"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary transition-colors">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-3 border-b border-border bg-void-lighter shrink-0 space-y-2">
                        <button
                            onClick={handleCreateNew}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed rounded text-xs uppercase tracking-wider transition-colors ${!selectedId && isEditing ? 'border-terminal text-terminal bg-terminal/10' : 'border-border text-text-dim hover:text-terminal hover:border-terminal'}`}
                        >
                            <Plus size={14} /> New Faction
                        </button>
                        <button
                            onClick={handleSeedFromLore}
                            title="Add every faction in the world lore's FACTIONS section that isn't already here"
                            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-border rounded text-xs uppercase tracking-wider text-text-dim hover:text-terminal hover:border-terminal transition-colors"
                        >
                            <BookOpen size={14} /> Seed From Lore
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {displayed.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2 opacity-60">
                                <Landmark size={32} strokeWidth={1} className="opacity-50" />
                                <p className="text-text-dim text-xs uppercase tracking-widest font-bold">
                                    {searchQuery.trim() ? `No matches for "${searchQuery.trim()}".` : 'No factions recorded yet.'}
                                </p>
                                {!searchQuery.trim() && (
                                    <p className="text-text-dim/60 text-[10px] max-w-[260px] leading-relaxed normal-case tracking-normal">
                                        Use "New Faction" above, or Seed From Lore to import churches, orders, and houses.
                                    </p>
                                )}
                            </div>
                        )}
                        {displayed.length > 0 && displayed.map(fac => {
                            const isActive = selectedId === fac.id && !isEditing;
                            return (
                                <div
                                    key={fac.id}
                                    onClick={() => handleSelect(fac)}
                                    className={`flex items-center justify-between p-3 cursor-pointer border-l-2 transition-all group ${isActive ? 'border-terminal bg-terminal/5' : 'border-transparent hover:bg-surface'}`}
                                >
                                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                        <Landmark size={14} className={`shrink-0 ${isActive ? 'text-terminal' : 'text-text-dim'}`} />
                                        <div className="truncate min-w-0">
                                            <p className={`text-sm font-bold truncate ${isActive ? 'text-terminal glow-green-sm' : 'text-text-primary'}`}>
                                                {fac.name}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] mt-0.5 text-text-dim truncate">
                                                {fac.type && <span className="bg-terminal/10 text-terminal px-1 rounded uppercase">{fac.type}</span>}
                                                {fac.region && <span className="truncate">{fac.region}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={e => handleDelete(fac.id, e)}
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
                        onClick={toggleFactionLedger}
                        className="absolute top-4 right-4 text-text-dim hover:text-text-primary hidden sm:block p-1 bg-void rounded border border-border hover:border-terminal transition-colors z-10"
                    >
                        <X size={18} />
                    </button>

                    {!selectedId && !isEditing && (
                        <div className="flex-1 flex items-center justify-center p-8 text-text-dim text-sm">
                            <div className="text-center space-y-2">
                                <Landmark size={32} className="mx-auto opacity-30" />
                                <p>Select a faction or create a new one.</p>
                            </div>
                        </div>
                    )}

                    {(selectedId || isEditing) && (
                        <FactionEditForm
                            form={form}
                            setForm={setForm}
                            renderedForm={renderedForm}
                            isEditing={isEditing}
                            selectedId={selectedId}
                            newRelationTo={newRelationTo}
                            setNewRelationTo={setNewRelationTo}
                            newRelationKind={newRelationKind}
                            setNewRelationKind={setNewRelationKind}
                            newRelationNote={newRelationNote}
                            setNewRelationNote={setNewRelationNote}
                            factionLedger={factionLedger}
                            onStartEditing={handleStartEditing}
                            onCancel={handleCancelEdit}
                            onSave={handleSave}
                            onAddRelation={handleAddRelation}
                            onRemoveRelation={handleRemoveRelation}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
