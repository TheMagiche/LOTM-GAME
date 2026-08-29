import { useEffect, useRef, useState } from 'react';
import { X, Package, Sparkles, ShieldAlert, Sparkle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { LootTree, LootPickNode } from '../../types';
import { labelLotmLootCategory } from '../../worldpacks/lotmLootLabels';
import { LOTM_EXCLUSIVE_UI } from '../../services/lotm/lotmFlags';
import { isLotmCampaign } from '../../services/lotm/lotmSkin';

/**
 * Mystical Harvest & Spoils Modal (LOTM) / Loot Roll Modal (Generic).
 *
 * Configures and arms a deterministic loot drop before sending.
 * In Lord of the Mysteries mode, surfaces in-world category labels,
 * Convergence warnings, and authentic harvest phrasing.
 */
export function LootRollModal() {
    const open = useAppStore(s => s.lootRollModalOpen);
    const onClose = useAppStore(s => s.closeLootRollModal);
    const armLoot = useAppStore(s => s.armLoot);
    const context = useAppStore(s => s.context);
    const lotm = LOTM_EXCLUSIVE_UI || isLotmCampaign(useAppStore(s => s.activeCampaignMeta));

    const [rolls, setRolls] = useState(1);
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const openedAtRef = useRef(0);

    const lootTree: LootTree | undefined = context.lootTree;
    const rootPick: LootPickNode | null = (() => {
        if (!lootTree) return null;
        const root = lootTree.nodes[lootTree.root];
        return root && root.kind === 'pick' ? root : null;
    })();
    const options = rootPick ? Object.keys(rootPick.weights) : [];
    const axisLabel = rootPick?.axis ?? 'Options';

    useEffect(() => {
        if (open) {
            setRolls(1);
            setChecked({});
            openedAtRef.current = Date.now();
        }
    }, [open]);

    if (!open) return null;

    const handleBackdropClick = () => {
        if (Date.now() - openedAtRef.current < 350) return;
        onClose();
    };

    const confirm = () => {
        let reweight: Record<string, Record<string, number>> | undefined;
        const unchecked = options.filter(opt => checked[opt] === false);
        if (rootPick && unchecked.length > 0) {
            const zeroed: Record<string, number> = {};
            for (const opt of unchecked) zeroed[opt] = 0;
            reweight = { [lootTree!.root]: zeroed };
        }
        armLoot({ rolls, reweight });
        onClose();
    };

    const toggle = (opt: string) => setChecked(c => ({ ...c, [opt]: !c[opt] }));
    const isChecked = (opt: string) => checked[opt] !== false;

    return (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleBackdropClick}>
            <div className="bg-surface border border-border rounded-lg w-full max-w-md mx-4 flex flex-col shadow-2xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-void/50">
                    <h2 className="text-terminal text-sm font-bold tracking-[0.18em] uppercase flex items-center gap-2">
                        {lotm ? <Sparkles size={16} className="text-amber-400" /> : <Package size={16} />}
                        {lotm ? 'Mystical Harvest & Spoils' : 'Roll Loot'}
                    </h2>
                    <button onClick={onClose} className="text-text-dim hover:text-text-primary p-1 rounded hover:bg-void transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* LOTM Convergence Warning */}
                    {lotm && (
                        <div className="p-2.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                            <ShieldAlert size={15} className="shrink-0 mt-0.5 text-amber-400" />
                            <div>
                                <div className="font-semibold uppercase text-[10px] tracking-wider text-amber-400">
                                    Law of Beyonder Characteristics Convergence
                                </div>
                                <div className="text-[11px] opacity-90 mt-0.5">
                                    Precipitated characteristics and extraordinary items obey mystical attraction. High-grade spoils may draw church containment or rival cultists.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div>
                        <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1.5 font-semibold">
                            {lotm ? 'Harvest Quantity (Rolls)' : 'Quantity'}
                        </div>
                        <select
                            value={rolls}
                            onChange={e => setRolls(Number(e.target.value))}
                            className="w-full bg-void border border-border focus:border-terminal text-[13px] text-text-primary rounded px-2.5 py-1.5 outline-none"
                        >
                            {Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>
                                    {n} {n === 1 ? (lotm ? 'item / discovery' : 'item') : (lotm ? 'items / discoveries' : 'items')}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Eligible Categories */}
                    {rootPick && options.length > 0 && (
                        <div>
                            <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1.5 font-semibold">
                                {lotm ? 'Eligible Mystical Categories' : `Eligible ${axisLabel}`}
                            </div>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                {options.map(opt => {
                                    const active = isChecked(opt);
                                    return (
                                        <label
                                            key={opt}
                                            className={`flex items-center gap-2.5 px-3 py-2 text-[12px] rounded border cursor-pointer transition-colors ${
                                                active
                                                    ? 'bg-void border-border text-text-primary hover:border-terminal/70'
                                                    : 'bg-void/40 border-border/40 text-text-dim opacity-60'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={() => toggle(opt)}
                                                className="accent-terminal rounded"
                                            />
                                            <Sparkle size={12} className={active ? 'text-terminal' : 'text-text-dim'} />
                                            <span className="flex-1 font-medium">{labelLotmLootCategory(opt)}</span>
                                            <span className="text-[10px] font-mono text-text-dim/80 bg-surface/50 px-1.5 py-0.5 rounded">
                                                w{rootPick.weights[opt]}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-text-dim/70 mt-1.5">
                                Uncheck to exclude specific categories from this harvest.
                            </p>
                        </div>
                    )}

                    {!rootPick && (
                        <p className="text-[10px] text-text-dim/70 leading-relaxed">
                            The root node is fixed — the engine will walk its authored weights.
                        </p>
                    )}

                    <p className="text-[10px] text-text-dim/70 leading-relaxed border-t border-border/40 pt-2">
                        {lotm
                            ? 'Confirm to arm the harvest. On your next send, the engine walks the world loot tree and the GM narrates the discovery as fact.'
                            : 'Confirm to arm the drop. On your next send, the engine walks the loot tree and the GM narrates the find as fact.'}
                    </p>
                </div>

                {/* Footer buttons */}
                <div className="px-4 py-3 border-t border-border flex justify-end gap-2 bg-void/50">
                    <button onClick={onClose} className="px-3 py-1.5 text-xs text-text-dim hover:text-text-primary rounded transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={confirm}
                        className="px-4 py-1.5 text-xs font-semibold bg-terminal/20 text-terminal border border-terminal/30 rounded hover:bg-terminal/30 transition-colors"
                    >
                        {lotm ? 'Arm Mystical Harvest' : 'Arm Drop'}
                    </button>
                </div>
            </div>
        </div>
    );
}
