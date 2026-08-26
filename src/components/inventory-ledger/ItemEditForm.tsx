import { Trash2 } from 'lucide-react';
import type { ItemLedgerEntry, ItemLedgerGrade, ItemLedgerKind } from '../../types';
import { ITEM_GRADE_LABELS, ITEM_KIND_LABELS, ITEM_KINDS } from '../../types';

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
    renderedForm: Partial<ItemLedgerEntry>;
    isEditing: boolean;
    selectedId: string | null;
    setForm: React.Dispatch<React.SetStateAction<Partial<ItemLedgerEntry>>>;
    onStartEditing: () => void;
    onCancel: () => void;
    onSave: () => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onGrantToCharacter: () => void;
};

const GRADES: ItemLedgerGrade[] = ['', '3', '2', '1', '0', 'unique'];

export function ItemEditForm({
    renderedForm, isEditing, selectedId, setForm,
    onStartEditing, onCancel, onSave, onDelete, onGrantToCharacter,
}: Props) {
    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pr-8">
                <h2 className="text-terminal text-base font-bold tracking-widest uppercase">
                    {isEditing ? (selectedId ? 'Edit Item' : 'New Item') : 'Item Details'}
                </h2>
                <div className="flex gap-2 flex-wrap justify-end">
                    {!isEditing && selectedId && (
                        <>
                            <button
                                onClick={onGrantToCharacter}
                                className="px-3 py-1.5 border border-border rounded text-[10px] uppercase tracking-wider text-text-dim hover:text-terminal hover:border-terminal transition-colors"
                            >
                                {renderedForm.possessed ? 'Copy to Inventory' : 'Grant to Character'}
                            </button>
                            <button
                                onClick={onStartEditing}
                                className="px-3 py-1.5 border border-border rounded text-[10px] uppercase tracking-wider text-text-dim hover:text-terminal hover:border-terminal transition-colors"
                            >
                                Edit
                            </button>
                        </>
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
                    placeholder="Eye of Crystal"
                    className={inputClass(isEditing)}
                />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Kind">
                    <select
                        value={renderedForm.kind ?? 'other'}
                        onChange={e => setForm(prev => ({ ...prev, kind: e.target.value as ItemLedgerKind }))}
                        disabled={!isEditing}
                        className={inputClass(isEditing)}
                    >
                        {ITEM_KINDS.map(kind => (
                            <option key={kind} value={kind}>{ITEM_KIND_LABELS[kind]}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Grade">
                    <select
                        value={renderedForm.grade ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, grade: e.target.value as ItemLedgerGrade }))}
                        disabled={!isEditing}
                        className={inputClass(isEditing)}
                    >
                        {GRADES.map(grade => (
                            <option key={grade || 'none'} value={grade}>
                                {grade ? ITEM_GRADE_LABELS[grade] : '—'}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Registry code">
                    <input
                        type="text"
                        value={renderedForm.code ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="3-1328"
                        className={inputClass(isEditing)}
                    />
                </Field>
                <Field label="Aliases (comma-separated)">
                    <input
                        type="text"
                        value={renderedForm.aliases ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, aliases: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Crystal Eye, monocle"
                        className={inputClass(isEditing)}
                    />
                </Field>
            </div>

            <Field label="Appearance">
                <textarea
                    value={renderedForm.appearance ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, appearance: e.target.value }))}
                    disabled={!isEditing}
                    rows={2}
                    placeholder="A monocle."
                    className={inputClass(isEditing)}
                />
            </Field>

            <Field label="Function / effect">
                <textarea
                    value={renderedForm.function ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, function: e.target.value }))}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="What it does when used or worn."
                    className={inputClass(isEditing)}
                />
            </Field>

            <Field label="Downside / cost">
                <textarea
                    value={renderedForm.downside ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, downside: e.target.value }))}
                    disabled={!isEditing}
                    rows={2}
                    placeholder="Negative effects, Acting Method drift, or sealing cost."
                    className={inputClass(isEditing)}
                />
            </Field>

            {(renderedForm.kind === 'medicine' || renderedForm.kind === 'ingredient' || (renderedForm.ingredients ?? '').trim()) && (
                <Field label="Ingredients / preparation">
                    <textarea
                        value={renderedForm.ingredients ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, ingredients: e.target.value }))}
                        disabled={!isEditing}
                        rows={2}
                        className={inputClass(isEditing)}
                    />
                </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Status">
                    <input
                        type="text"
                        value={renderedForm.status ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Sealed, Lost, Destroyed, Active…"
                        className={inputClass(isEditing)}
                    />
                </Field>
                <Field label="Pathway">
                    <input
                        type="text"
                        value={renderedForm.pathway ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, pathway: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Fool Pathway"
                        className={inputClass(isEditing)}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Holder">
                    <input
                        type="text"
                        value={renderedForm.holder ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, holder: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Who currently has it"
                        className={inputClass(isEditing)}
                    />
                </Field>
                <Field label="Location">
                    <input
                        type="text"
                        value={renderedForm.locationTag ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, locationTag: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="inventory, church vault, Tingen…"
                        className={inputClass(isEditing)}
                    />
                </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-text-dim">
                <input
                    type="checkbox"
                    checked={renderedForm.possessed === true}
                    onChange={e => setForm(prev => ({ ...prev, possessed: e.target.checked }))}
                    disabled={!isEditing}
                />
                Party currently possesses this
            </label>

            <Field label="Notes">
                <textarea
                    value={renderedForm.notes ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    disabled={!isEditing}
                    rows={2}
                    className={inputClass(isEditing)}
                />
            </Field>

            {selectedId && !isEditing && (
                <button
                    onClick={e => onDelete(selectedId, e)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-danger/70 hover:text-danger transition-colors"
                >
                    <Trash2 size={12} /> Delete from ledger
                </button>
            )}
        </div>
    );
}
