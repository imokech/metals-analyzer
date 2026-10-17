export interface ImeRow {
    id: number;
    weekLabel: string;
    fromDate: string;
    toDate: string;
    subCat: number;
    groupName: string;
    totalQuantity: number;
    totalSupply: number;
    totalValue: number;
    averagePrice: number;
    volumeToSupplyRatio: number;
    priceToBasePriceRatio: number;
    capturedAt: string;
}

export interface CurrencyRow {
    id: number;
    havaleh: number | null;
    azad: number | null;
    capturedAt: string;
}

export interface GlobalRow {
    id: number;
    slug: string;
    price: number | null;
    capturedAt: string;
}

/** Achromatic-plus-one palette that respects the Steep restraint. */
export const SERIES_COLORS = ["#5d2a1a", "#17191c", "#777b86", "#a3a6af", "#c9a08a"];

/** "هفته ۱ (…)" → "هفته ۱" for compact axis ticks. */
export function shortWeek(label: string): string {
    const idx = label.indexOf("(");
    return (idx > 0 ? label.slice(0, idx) : label).trim();
}

/** Compact Persian number for axis ticks (۱٫۲ م / ۳۴۰ هـ). */
export function faCompact(n: number): string {
    if (!isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000)
        return (n / 1_000_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + " میلیارد";
    if (abs >= 1_000_000)
        return (n / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + " م";
    if (abs >= 1_000)
        return (n / 1_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) + " هـ";
    return n.toLocaleString("fa-IR", { maximumFractionDigits: 0 });
}

export const METRICS = {
    averagePrice: "میانگین قیمت (ریال/تن)",
    totalValue: "ارزش معامله (ریال)",
    totalQuantity: "حجم قرارداد (تن)",
    volumeToSupplyRatio: "نسبت حجم به عرضه (٪)",
} as const;

export type MetricKey = keyof typeof METRICS;
