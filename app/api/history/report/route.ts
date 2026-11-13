import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { buildWhere, parseFilters } from "@/lib/history/query";
import { buildProducerSeries, buildReport, type DbAggRow, type DbProducerAggRow } from "@/lib/history/report";

export const dynamic = "force-dynamic";

// مقدارها ثابت و از فهرست سفید هستند، پس sql.raw امن است
const PERIODS = { day: "t.jdate", week: "w.from_jdate", month: "t.jmonth" } as const;

export async function GET(request: NextRequest) {
    try {
        const sp = request.nextUrl.searchParams;
        const filters = parseFilters(sp);
        if (typeof filters === "string") return NextResponse.json({ error: filters }, { status: 400 });

        const periodKey = (sp.get("period") ?? "month") as keyof typeof PERIODS;
        if (!(periodKey in PERIODS)) return NextResponse.json({ error: "period نامعتبر است" }, { status: 400 });

        const where = await buildWhere(filters);
        if (!where) return NextResponse.json({ series: [], totals: [], producerSeries: [] });

        const period = sql.raw(PERIODS[periodKey]);

        const res = await db.execute(sql`
            select
                ${period} as period,
                t.goods_name,
                t.tasvieh,
                count(*)::int as trades,
                coalesce(sum(t.quantity), 0) as quantity,
                coalesce(sum(t.arze), 0) as supply,
                coalesce(sum(t.total_price), 0) as value,
                coalesce(sum(coalesce(t.base_price, 0) * t.quantity), 0) as base_value,
                min(t.jdate) as first_date,
                max(t.jdate) as last_date
            from ime_trades t
            join ime_sync_windows w on w.id = t.window_id
            where ${where}
            group by 1, 2, 3
        `);

        let producerSeries: ReturnType<typeof buildProducerSeries> = [];
        if (filters.producers.length > 0) {
            const pres = await db.execute(sql`
                select
                    ${period} as period,
                    t.producer_name,
                    t.goods_name,
                    t.tasvieh,
                    count(*)::int as trades,
                    coalesce(sum(t.quantity), 0) as quantity,
                    coalesce(sum(t.arze), 0) as supply,
                    coalesce(sum(t.total_price), 0) as value,
                    coalesce(sum(coalesce(t.base_price, 0) * t.quantity), 0) as base_value,
                    min(t.jdate) as first_date,
                    max(t.jdate) as last_date
                from ime_trades t
                join ime_sync_windows w on w.id = t.window_id
                where ${where}
                group by 1, 2, 3, 4
            `);
            producerSeries = buildProducerSeries(pres.rows as unknown as DbProducerAggRow[]);
        }

        return NextResponse.json({
            ...buildReport(res.rows as unknown as DbAggRow[]),
            producerSeries,
        });
    } catch (error) {
        console.error("history/report error:", error);
        return NextResponse.json({ error: "خطا در ساخت گزارش" }, { status: 500 });
    }
}