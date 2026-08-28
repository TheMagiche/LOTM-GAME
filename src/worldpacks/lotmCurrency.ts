import currencyJson from '../../gamedata/assets/data/world/Currency/lotm_currency.json';

export type LotmCurrencyUnit = {
    region: string;
    primary: string;
    notes: string;
    toPounds?: number;
};

type RawCurrencyBlock = {
    region?: string;
    primary_unit?: string;
    notes?: string;
    conversion_rates?: Record<string, number>;
};

function asCurrencies(raw: unknown): Record<string, RawCurrencyBlock> {
    if (!raw || typeof raw !== 'object') return {};
    const block = (raw as { currencies?: Record<string, RawCurrencyBlock> }).currencies;
    return block && typeof block === 'object' ? block : {};
}

let cached: LotmCurrencyUnit[] | null = null;

export function loadLotmCurrencyUnits(): LotmCurrencyUnit[] {
    if (cached) return cached;
    const currencies = asCurrencies(currencyJson);
    cached = Object.values(currencies).map(entry => ({
        region: String(entry.region ?? '').trim(),
        primary: String(entry.primary_unit ?? '').replace(/_/g, ' ').trim(),
        notes: String(entry.notes ?? '').trim(),
        toPounds: typeof entry.conversion_rates?.to_loen_gold_pound === 'number'
            ? entry.conversion_rates.to_loen_gold_pound
            : (typeof entry.conversion_rates?.to_intis_verl_dor === 'number' && entry.primary_unit === 'gold_pound'
                ? 1
                : undefined),
    })).filter(u => u.region && u.primary);
    return cached;
}

/** Compact economy reminder for the GM — Loen purse stays the engine-owned CR: line. */
export function formatLotmCurrencyBlock(): string {
    const units = loadLotmCurrencyUnits();
    if (units.length === 0) return '';
    const loen = units.find(u => /loen/i.test(u.region));
    const others = units.filter(u => u !== loen).slice(0, 4);
    const lines = [
        '1 gold pound = 20 soli = 240 pence. Name prices in pounds / soli / pence.',
        loen?.notes,
        ...others.map(u => `${u.region}: ${u.primary}${u.notes ? ` — ${u.notes}` : ''}`),
    ].filter(Boolean);
    return `[CURRENCY]\n${lines.join('\n')}`;
}
