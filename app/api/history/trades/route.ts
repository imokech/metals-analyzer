import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { buildWhere, parseFilters } from "@/lib/history/query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const sp = request.nextUrl.searchParams;
        const filters = parseFilters(sp);
        if (typeof filters === "string") return NextResponse.json({ error: filters }, { status: 400 });

        const page = Math.max(1, Math.floor(Number(sp.get("page")) || 1));
        const pageSize = Math.min(200, Math.max(10, Math.floor(Number(sp.get("pageSize")) || 50)));
        const tradedOnly = sp.get("traded") === "1";

        const base = await buildWhere(filters);
        if (!base) return NextResponse.json({ rows: [], total: 0, page, pageSize });
        const where = tradedOnly ? sql`${base} and t.quantity > 0` : base;

        const [countRes, rowsRes] = await Promise.all([
            db.execute(sql`select count(*)::int as n from ime_trades t where ${where}`),
            db.execute(sql`
                select t.id, t.jdate, t.cat, t.sub_cat, t.goods_name, t.producer_name, t.contract_type,
                       t.tasvieh, t.base_price, t.price, t.quantity, t.total_price, t.arze
                from ime_trades t
                where ${where}
                order by t.jdate desc, t.id desc
                limit ${pageSize} offset ${(page - 1) * pageSize}
            `),
        ]);

        return NextResponse.json({
            rows: rowsRes.rows,
            total: (countRes.rows[0] as { n: number }).n,
            page,
            pageSize,
        });
    } catch (error) {
        console.error("history/trades error:", error);
        return NextResponse.json({ error: "خطا در خواندن معاملات" }, { status: 500 });
    }
}