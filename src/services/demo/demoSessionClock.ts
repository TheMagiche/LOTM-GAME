import { useEffect, useState } from 'react';

export function useDemoRemainingMs(expiresAt: number | null | undefined): number | null {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!expiresAt) return;
        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [expiresAt]);

    if (!expiresAt) return null;
    return Math.max(0, expiresAt - now);
}
