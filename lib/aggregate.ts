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
        { totalQuantity: number; totalSupply: number; totalValue: number; totalBasePriceValue: number }
    >();

    filtered.forEach((item) => {
        const groupName = getCommodityGroup(item.GoodsName);
        const current = grouped.get(groupName) || {
            totalQuantity: 0,
            totalSupply: 0,
            totalValue: 0,
            totalBasePriceValue: 0,
        };
        current.totalQuantity += item.Quantity;
        current.totalSupply += item.arze;
        current.totalValue += item.TotalPrice;
        current.totalBasePriceValue += item.ArzeBasePrice * item.Quantity;
        grouped.set(groupName, current);
    });

    const result: AggregatedData[] = Array.from(grouped.entries()).map(([groupName, t]) => ({
        groupName,
        totalQuantity: t.totalQuantity,
        totalSupply: t.totalSupply,
        totalValue: t.totalValue,
        averagePrice: t.totalQuantity > 0 ? t.totalValue / t.totalQuantity : 0,
        volumeToSupplyRatio: t.totalSupply > 0 ? (t.totalQuantity / t.totalSupply) * 100 : 0,
        priceToBasePriceRatio:
            t.totalBasePriceValue > 0 ? (t.totalValue / t.totalBasePriceValue) * 100 - 100 : 0,
    }));

    result.sort((a, b) => b.totalValue - a.totalValue);
    return result;
}
