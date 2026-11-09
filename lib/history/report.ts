import { classifySettlement, getCommodityGroup } from "@/lib/aggregate";

export interface DbAggRow {
    period: string;
    goods_name: string;
    tasvieh: string | null;
    trades: number;
    quantity: number;
    supply: number;
    value: number;
    base_value: number;
    first_date: string;
    last_date: string;
}

interface Acc {
    period: string;
    group: string;
    trades: number;
    quantity: number;
    supply: number;
    value: number;
    baseValue: number;
    cashQty: number;
    creditQty: number;
    firstDate: string;
    lastDate: string;
}

function getAcc(map: Map<string, Acc>, key: string, period: string, group: string): Acc {
    let acc = map.get(key);
    if (!acc) {
        acc = {
            period,
            group,
            trades: 0,
            quantity: 0,
            supply: 0,
            value: 0,
            baseValue: 0,
            cashQty: 0,
            creditQty: 0,
            firstDate: "9999/99/99",
            lastDate: "",
        };
        map.set(key, acc);
    }
    return acc;
}

function finish(a: Acc) {
    return {
        period: a.period,
        group: a.group,
        trades: a.trades,
        quantity: a.quantity,
        supply: a.supply,
        value: a.value,
        firstDate: a.firstDate,
        lastDate: a.lastDate,
        averagePrice: a.quantity > 0 ? a.value / a.quantity : 0,
        averageBasePrice: a.quantity > 0 ? a.baseValue / a.quantity : 0,
        volumeToSupplyRatio: a.supply > 0 ? (a.quantity / a.supply) * 100 : 0,
        priceToBasePriceRatio: a.baseValue > 0 ? (a.value / a.baseValue) * 100 - 100 : 0,
        cashPercent: a.quantity > 0 ? (a.cashQty / a.quantity) * 100 : 0,
        creditPercent: a.quantity > 0 ? (a.creditQty / a.quantity) * 100 : 0,
    };
}

export function buildReport(rows: DbAggRow[]) {
    const series = new Map<string, Acc>();
    const totals = new Map<string, Acc>();

    for (const r of rows) {
        const group = getCommodityGroup(r.goods_name);
        if (group === "سایر") continue;
        const kind = classifySettlement(r.tasvieh);
        const quantity = Number(r.quantity);

        for (const a of [
            getAcc(series, `${r.period}|${group}`, r.period, group),
            getAcc(totals, group, "", group),
        ]) {
            a.trades += Number(r.trades);
            a.quantity += quantity;
            a.supply += Number(r.supply);
            a.value += Number(r.value);
            a.baseValue += Number(r.base_value);
            if (kind === "cash") a.cashQty += quantity;
            else if (kind === "credit") a.creditQty += quantity;
            if (r.first_date < a.firstDate) a.firstDate = r.first_date;
            if (r.last_date > a.lastDate) a.lastDate = r.last_date;
        }
    }

    return {
        series: Array.from(series.values())
            .map(finish)
            .sort((x, y) => x.period.localeCompare(y.period) || x.group.localeCompare(y.group, "fa")),
        totals: Array.from(totals.values())
            .map(finish)
            .sort((x, y) => y.value - x.value),
    };
}