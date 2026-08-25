import { Link2, Trash2, X } from 'lucide-react';
import { useMemo } from 'react';
import type { FactionEntry, FactionRelationKind } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { allegianceMatchesFaction } from '../../services/faction/resolveFaction';

const RELATION_KINDS: FactionRelationKind[] = ['allied', 'opposed', 'neutral'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-dim mb-1">{label}</label>
            {children}
        </div>
    );
}

function inputClass(enabled: boolean): string {
    return `w-full bg-void border border-border rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-terminal transition-colors ${enabled ? '' : 'opacity-80 cursor-default'}`;
}

type Props = {
    form: Partial<FactionEntry>;
    setForm: React.Dispatch<React.SetStateAction<Partial<FactionEntry>>>;
    renderedForm: Partial<FactionEntry>;
    isEditing: boolean;
    selectedId: string | null;
    newRelationTo: string;
    setNewRelationTo: React.Dispatch<React.SetStateAction<string>>;
    newRelationKind: FactionRelationKind;
    setNewRelationKind: React.Dispatch<React.SetStateAction<FactionRelationKind>>;
    newRelationNote: string;
    setNewRelationNote: React.Dispatch<React.SetStateAction<string>>;
    factionLedger: FactionEntry[];
    onStartEditing: () => void;
    onCancel: () => void;
    onSave: () => void;
    onAddRelation: () => void;
    onRemoveRelation: (toId: string) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
};

export function FactionEditForm({
    setForm, renderedForm, isEditing, selectedId,
    newRelationTo, setNewRelationTo,
    newRelationKind, setNewRelationKind,
    newRelationNote, setNewRelationNote,
    factionLedger,
    onStartEditing, onCancel, onSave,
    onAddRelation, onRemoveRelation, onDelete,
}: Props) {
    const npcLedger = useAppStore(s => s.npcLedger);
    const playerCharacter = useAppStore(s => s.playerCharacter);

    const knownMembers = useMemo(() => {
        const probe: FactionEntry = {
            id: renderedForm.id ?? '',
            name: renderedForm.name ?? '',
            aliases: renderedForm.aliases ?? '',
            type: renderedForm.type ?? '',
            stance: renderedForm.stance ?? '',
            keyMembers: renderedForm.keyMembers ?? '',
            region: renderedForm.region ?? '',
            pathways: renderedForm.pathways ?? '',
            description: renderedForm.description ?? '',
            relations: renderedForm.relations ?? [],
            firstSeenScene: renderedForm.firstSeenScene ?? '',
            lastSeenScene: renderedForm.lastSeenScene ?? '',
            source: renderedForm.source ?? 'manual',
        };
        if (!probe.name.trim()) return [];
        const members: Array<{ name: string; kind: 'PC' | 'NPC' }> = [];
        if (playerCharacter && allegianceMatchesFaction(playerCharacter.faction, probe)) {
            members.push({ name: playerCharacter.name || 'Player character', kind: 'PC' });
        }
        for (const npc of npcLedger) {
            if (allegianceMatchesFaction(npc.faction, probe)) {
                members.push({ name: npc.name, kind: 'NPC' });
            }
        }
        return members;
    }, [renderedForm, npcLedger, playerCharacter]);

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pr-8">
                <h2 className="text-terminal text-base font-bold tracking-widest uppercase">
                    {isEditing ? (selectedId ? 'Edit Faction' : 'New Faction') : 'Faction Details'}
                </h2>
                <div className="flex gap-2">
                    {!isEditing && selectedId && (
                        <button
                            onClick={onStartEditing}
                            className="px-3 py-1.5 border border-border rounded text-[10px] uppercase tracking-wider text-text-dim hover:text-terminal hover:border-terminal transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button
                                onClick={onCancel}
                                className="px-3 py-1.5 border border-border rounded text-[10px] uppercase tracking-wider text-text-dim hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSave}
                                className="px-3 py-1.5 border border-terminal bg-terminal/10 rounded text-[10px] uppercase tracking-wider text-terminal hover:bg-terminal/20 transition-colors"
                            >
                                Save
                            </button>
                        </>
                    )}
                </div>
            </div>

            <Field label="Name">
                <input
                    type="text"
                    value={renderedForm.name ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Church of the Evernight Goddess"
                    className={inputClass(isEditing)}
                />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Aliases (comma-separated)">
                    <input
                        type="text"
                        value={renderedForm.aliases ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, aliases: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Nighthawks, Church of Evernight"
                        className={inputClass(isEditing)}
                    />
                </Field>
                <Field label="Type">
                    <input
                        type="text"
                        value={renderedForm.type ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Orthodox Church"
                        className={inputClass(isEditing)}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Stance">
                    <input
                        type="text"
                        value={renderedForm.stance ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, stance: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Lawful establishment in Loen"
                        className={inputClass(isEditing)}
                    />
                </Field>
                <Field label="Status (optional)">
                    <input
                        type="text"
                        value={renderedForm.status ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="active, fractured, underground"
                        className={inputClass(isEditing)}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Region / Seat">
                    <input
                        type="text"
                        value={renderedForm.region ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, region: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Winter County"
                        className={inputClass(isEditing)}
                    />
                </Field>
                <Field label="Pathways">
                    <input
                        type="text"
                        value={renderedForm.pathways ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, pathways: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Darkness pathway complete"
                        className={inputClass(isEditing)}
                    />
                </Field>
            </div>

            <Field label="Key Members">
                <input
                    type="text"
                    value={renderedForm.keyMembers ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, keyMembers: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="Dunn Smith, Leonard Mitchell"
                    className={inputClass(isEditing)}
                />
            </Field>

            <Field label="Description">
                <textarea
                    value={renderedForm.description ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="1-2 sentences of texture."
                    className={`${inputClass(isEditing)} resize-none`}
                />
            </Field>

            {knownMembers.length > 0 && (
                <Field label="Known members (from character ledgers)">
                    <div className="flex flex-wrap gap-1">
                        {knownMembers.map(member => (
                            <span key={`${member.kind}-${member.name}`} className="text-[10px] bg-terminal/10 text-terminal px-1.5 py-0.5 rounded">
                                {member.name}
                                <span className="text-text-dim ml-1 uppercase">{member.kind}</span>
                            </span>
                        ))}
                    </div>
                </Field>
            )}

            <Field label="Relations">
                <div className="space-y-2">
                    {(renderedForm.relations ?? []).length > 0 ? (
                        <div className="space-y-1">
                            {(renderedForm.relations ?? []).map(relation => {
                                const other = factionLedger.find(f => f.id === relation.toId);
                                return (
                                    <div key={`${relation.toId}-${relation.kind}`} className="flex items-center gap-2 text-xs bg-void border border-border rounded px-2 py-1">
                                        <Link2 size={11} className="text-text-dim shrink-0" />
                                        <span className="flex-1 truncate">
                                            {other?.name ?? relation.toId}
                                            <span className="text-text-dim text-[10px] ml-1">({relation.kind})</span>
                                            {relation.note && <span className="text-text-dim text-[10px] ml-1">— {relation.note}</span>}
                                        </span>
                                        {isEditing && (
                                            <button
                                                onClick={() => onRemoveRelation(relation.toId)}
                                                aria-label={`Remove relation to ${other?.name ?? relation.toId}`}
                                                className="text-text-dim hover:text-danger shrink-0"
                                            >
                                                <X size={11} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : !isEditing ? (
                        <p className="text-[10px] text-text-dim/60 italic">
                            No relations recorded.
                        </p>
                    ) : null}
                    {isEditing && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select
                                value={newRelationTo}
                                onChange={e => setNewRelationTo(e.target.value)}
                                className="flex-1 bg-void border border-border rounded px-2 py-1.5 text-xs text-text-primary"
                            >
                                <option value="">Select faction...</option>
                                {factionLedger
                                    .filter(f => f.id !== selectedId)
                                    .map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                            </select>
                            <select
                                value={newRelationKind}
                                onChange={e => setNewRelationKind(e.target.value as FactionRelationKind)}
                                className="bg-void border border-border rounded px-2 py-1.5 text-xs text-text-primary"
                            >
                                {RELATION_KINDS.map(kind => (
                                    <option key={kind} value={kind}>{kind}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={newRelationNote}
                                onChange={e => setNewRelationNote(e.target.value)}
                                placeholder="note (optional)"
                                className="flex-1 bg-void border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-text-dim/50"
                            />
                            <button
                                onClick={onAddRelation}
                                disabled={!newRelationTo}
                                className="px-3 py-1.5 border border-terminal/30 rounded text-[10px] uppercase tracking-wider text-terminal disabled:opacity-30"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>
            </Field>

            <div className="grid grid-cols-2 gap-4 text-[10px] text-text-dim">
                <div>First seen: <span className="text-text-primary">{renderedForm.firstSeenScene || '—'}</span></div>
                <div>Last seen: <span className="text-text-primary">{renderedForm.lastSeenScene || '—'}</span></div>
                <div>Source: <span className="text-text-primary">{renderedForm.source ?? 'manual'}</span></div>
            </div>

            {isEditing && selectedId && (
                <button
                    onClick={e => onDelete(selectedId, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-danger/30 text-danger text-[10px] uppercase tracking-wider rounded hover:bg-danger/10 transition-colors"
                >
                    <Trash2 size={11} /> Delete Faction
                </button>
            )}
        </div>
    );
}
