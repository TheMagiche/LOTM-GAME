import type { NPCSignatureKit } from '../../types';
import {
    LOTM_PATHWAYS,
    abilitiesForLotmSequence,
    getLotmPathway,
    getLotmSequence,
    kitFromLotmPathway,
    nextLotmSequence,
    resolveLotmPathway,
} from '../../worldpacks/lotmPathways';

type Props = {
    kit: NPCSignatureKit | undefined;
    isEditing: boolean;
    onChange: (kit: NPCSignatureKit) => void;
};

export function LotmPathwayKitFields({ kit, isEditing, onChange }: Props) {
    const pathway = getLotmPathway(kit?.pathway) ?? resolveLotmPathway(kit?.pathway);
    const sequence = typeof kit?.sequence === 'number' ? kit.sequence : 9;
    const current = getLotmSequence(pathway, sequence);
    const nextSeq = nextLotmSequence(sequence);
    const next = getLotmSequence(pathway, nextSeq);
    const nextAbilities = abilitiesForLotmSequence(pathway?.id, nextSeq, 8);

    const setPathway = (id: string) => {
        if (!id) {
            onChange({ equipment: kit?.equipment ?? [], abilities: kit?.abilities ?? [] });
            return;
        }
        onChange(kitFromLotmPathway(id, sequence, kit));
    };

    const setSequence = (seq: number) => {
        if (!pathway) {
            onChange({ ...(kit ?? { equipment: [], abilities: [] }), sequence: seq });
            return;
        }
        onChange(kitFromLotmPathway(pathway.id, seq, kit));
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-amber-300 text-[10px] uppercase tracking-wider mb-1">Pathway</label>
                    <select
                        value={pathway?.id ?? ''}
                        disabled={!isEditing}
                        onChange={e => setPathway(e.target.value)}
                        className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary disabled:opacity-70 disabled:bg-void disabled:border-transparent outline-none focus:border-amber-300"
                    >
                        <option value="">No pathway</option>
                        {LOTM_PATHWAYS.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-amber-300 text-[10px] uppercase tracking-wider mb-1">Sequence</label>
                    <select
                        value={pathway ? String(sequence) : ''}
                        disabled={!isEditing || !pathway}
                        onChange={e => setSequence(Number(e.target.value))}
                        className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary disabled:opacity-70 disabled:bg-void disabled:border-transparent outline-none focus:border-amber-300"
                    >
                        {!pathway && <option value="">—</option>}
                        {pathway?.sequences.map(s => (
                            <option key={s.sequence} value={s.sequence}>
                                Seq {s.sequence} · {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {current && (
                <p className="text-[10px] text-text-dim/70 italic">
                    Current potion: <span className="text-text-primary not-italic">{current.name}</span>.
                    Abilities below are this Sequence&apos;s powers; prior Sequences stay digested.
                </p>
            )}
            {next && nextAbilities.length > 0 && (
                <div className="bg-void-dark/40 border border-amber-300/20 rounded px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">
                        To advance · Seq {next.sequence} {next.name}
                    </p>
                    <p className="text-[11px] text-text-dim leading-relaxed">
                        {nextAbilities.join(' · ')}
                    </p>
                </div>
            )}
        </div>
    );
}
