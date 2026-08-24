import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';

export function LotmChapterCard() {
    const chapters = useAppStore(s => s.chapters);
    const [card, setCard] = useState<{ title: string; id: string } | null>(null);
    const seen = useRef<Set<string>>(new Set());
    const primed = useRef(false);

    useEffect(() => {
        const sealed = chapters.filter(c => c.sealedAt);
        if (!primed.current) {
            for (const c of sealed) seen.current.add(c.chapterId);
            primed.current = true;
            return;
        }
        const fresh = sealed.find(c => !seen.current.has(c.chapterId));
        if (!fresh) return;
        seen.current.add(fresh.chapterId);
        setCard({ title: fresh.title || fresh.chapterId, id: fresh.chapterId });
        const t = window.setTimeout(() => setCard(null), 4200);
        return () => window.clearTimeout(t);
    }, [chapters]);

    if (!card) return null;

    return (
        <button
            type="button"
            className="lotm-chapter-card"
            onClick={() => setCard(null)}
            aria-label={`Chapter sealed: ${card.title}`}
        >
            <img src={lotmAssetUrl('image/book/0001.webp')} alt="" />
            <div className="lotm-chapter-card-copy">
                <span className="lotm-chapter-card-kicker">{card.id}</span>
                <h2>{card.title}</h2>
                <p>The page turns.</p>
            </div>
        </button>
    );
}
