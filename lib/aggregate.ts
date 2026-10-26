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
];

/**
 * Maps a raw IME goods name to its commodity group.
 * Returns "سایر" for items that don't map cleanly to a tracked group.
 */
export function getCommodityGroup(goodsName: string): string {
    for (const keyword of GROUP_KEYWORDS) {
        if (goodsName.includes(keyword)) return keyword;
    }
    if (goodsName.includes("ورق")) return "سایر";
    return goodsName.split(/[- ]/)[0] || "سایر";
}

export type SettlementKind = "cash" | "credit" | "other";

/**
 * Classifies the raw IME "Tasvieh" (settlement type) text as cash or credit.
 * IME's exact strings are not enumerated anywhere in this codebase (the
 * dashboard filter is populated from the data), so we match on stems that
 * avoid ی/ي and ک/ك spelling variants: "نقد" (نقدی) and "اعتبار" (اعتباری).
 * Anything else, or text containing both stems, is "other" and counts toward
 * neither percentage.
 */
export function classifySettlement(tasvieh: string | null | undefined): SettlementKind {
    const text = tasvieh ?? "";
    const isCash = text.includes("نقد");
    const isCredit = text.includes("اعتبار");
    if (isCash && !isCredit) return "cash";
    if (isCredit && !isCash) return "credit";
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
    const { tasvieh = [], groups = [], producers = [] } = filters;

    const filtered = data.filter((item) => {
        const groupName = getCommodityGroup(item.GoodsName);
        if (groupName === "سایر") return false;
        if (tasvieh.length > 0 && !tasvieh.includes(item.Tasvieh)) return false;
        if (groups.length > 0 && !groups.includes(groupName)) return false;
        if (producers.length > 0 && !producers.includes(item.ProducerName)) return false;
        return true;
    });

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
