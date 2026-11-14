import type { RawDataItem, AggregatedData } from "@/types";

const GROUP_KEYWORDS = [
    "ورق گرم",
    "ورق سرد",
    "تیرآهن بال پهن",
    "ورق گالوانیزه",
    "میلگرد",
    "تختال",
    "تیرآهن",
    "شمش",
    "کاتد",
    "گندله",
    "کنسانتره",
    "سنگ آهن",
    "بریکت",
    "آهن اسفنجی",
];

function normalizeFa(s: string): string {
    return s.replace(/ي/g, "ی").replace(/ك/g, "ک");
}

/**
 * Maps a raw IME goods name to its commodity group.
 * Returns "سایر" for items that don't map cleanly to a tracked group.
 */
export function getCommodityGroup(goodsName: string): string {
    const name = normalizeFa(goodsName);
    for (const keyword of GROUP_KEYWORDS) {
        if (name.includes(keyword)) return keyword;
    }
    if (name.includes("ورق")) return "سایر";
    return name.split(/[- ]/)[0] || "سایر";
}

export function filterRawData(
    data: RawDataItem[],
    filters: AggregateFilters = {}
): RawDataItem[] {
    const { tasvieh = [], groups = [], producers = [] } = filters;
    return data.filter((item) => {
        const groupName = getCommodityGroup(item.GoodsName);
        if (groupName === "سایر") return false;
        if (tasvieh.length > 0 && !tasvieh.includes(item.Tasvieh)) return false;
        if (groups.length > 0 && !groups.includes(groupName)) return false;
        if (producers.length > 0 && !producers.includes(item.ProducerName)) return false;
        return true;
    });
}

export type SettlementKind = "cash" | "credit" | "other";

/**
 * Classifies the raw IME "Tasvieh" (settlement type) column.
 * Rule: "نقدی" is a cash trade; anything mentioning "اعتبار"
 * (e.g. "نقدی/اعتباری") is a credit trade. Because the credit value also
 * contains the word "نقد", the credit check must come first.
 * Any other value is "other" and counts toward neither percentage.
 */
export function classifySettlement(tasvieh: string | null | undefined): SettlementKind {
    const text = normalizeFa(tasvieh ?? "");
    if (text.includes("اعتبار")) return "credit";
    if (text.includes("نقد")) return "cash";
    return "other";
}

export interface AggregateFilters {
    tasvieh?: string[];
    groups?: string[];
    producers?: string[];
}

/**
 * Groups raw IME rows into per-commodity aggregates. Rows that map to "سایر"
 * are excluded. Optional filters mirror the dashboard UI selectors.
 * Lifted from the original inline logic in app/page.tsx so the cron job,
 * backfill, and dashboard all share one implementation.
 *
 * Besides totals it derives, per group: averageBasePrice (weighted by traded
 * quantity, so averagePrice / averageBasePrice - 1 equals priceToBasePriceRatio)
 * and cashPercent / creditPercent (share of traded quantity by settlement type).
 */
export function aggregate(
    data: RawDataItem[],
    filters: AggregateFilters = {}
): AggregatedData[] {
    const filtered = filterRawData(data, filters);

    const grouped = new Map<
        string,
        {
            totalQuantity: number;
            totalSupply: number;
            totalValue: number;
            totalBasePriceValue: number;
            cashQuantity: number;
            creditQuantity: number;
        }
    >();

    filtered.forEach((item) => {
        const groupName = getCommodityGroup(item.GoodsName);
        const current = grouped.get(groupName) || {
            totalQuantity: 0,
            totalSupply: 0,
            totalValue: 0,
            totalBasePriceValue: 0,
            cashQuantity: 0,
            creditQuantity: 0,
        };
        current.totalQuantity += item.Quantity;
        current.totalSupply += item.arze;
        current.totalValue += item.TotalPrice;
        current.totalBasePriceValue += item.ArzeBasePrice * item.Quantity;
        const settlement = classifySettlement(item.Tasvieh);
        if (settlement === "cash") current.cashQuantity += item.Quantity;
        else if (settlement === "credit") current.creditQuantity += item.Quantity;
        grouped.set(groupName, current);
    });

    const result: AggregatedData[] = Array.from(grouped.entries()).map(([groupName, t]) => ({
        groupName,
        totalQuantity: t.totalQuantity,
        totalSupply: t.totalSupply,
        totalValue: t.totalValue,
        averagePrice: t.totalQuantity > 0 ? t.totalValue / t.totalQuantity : 0,
        averageBasePrice: t.totalQuantity > 0 ? t.totalBasePriceValue / t.totalQuantity : 0,
        volumeToSupplyRatio: t.totalSupply > 0 ? (t.totalQuantity / t.totalSupply) * 100 : 0,
        priceToBasePriceRatio:
            t.totalBasePriceValue > 0 ? (t.totalValue / t.totalBasePriceValue) * 100 - 100 : 0,
        cashPercent: t.totalQuantity > 0 ? (t.cashQuantity / t.totalQuantity) * 100 : 0,
        creditPercent: t.totalQuantity > 0 ? (t.creditQuantity / t.totalQuantity) * 100 : 0,
    }));

    result.sort((a, b) => b.totalValue - a.totalValue);
    return result;
}
