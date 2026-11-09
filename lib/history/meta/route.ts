import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCommodityGroup } from "@/lib/aggregate";
import { CAT_NAMES, subCatLabel } from "@/lib/history/labels";
import { historyConfig } from "@/lib/history/config";
import { todayJdate } from "@/lib/history/sync";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const [cov, last, subs, goods, prod, tas, con] = await Promise.all([
            db.execute(sql`select cat, status, count(*)::int as n from ime_sync_windows group by 1,2 order by 1,2`),
            db.execute(sql`select max(fetched_at) as last_fetch from ime_sync_windows`),
            db.execute(sql`select cat, sub_cat from ime_trades where sub_cat is not null group by 1,2 order by 1,2`),
            db.execute(sql`select cat, goods_name from ime_trades group by 1,2`),
            db.execute(sql`select cat, producer_name from ime_trades where producer_name is not null group by 1,2 order by 2`),
            db.execute(sql`select tasvieh from ime_trades where tasvieh is not null group by 1 order by 1`),
            db.execute(sql`select contract_type from ime_trades where contract_type is not null group by 1 order by 1`),
        ]);

        const groupSet = new Map<string, { cat: number; name: string }>();
        for (const r of goods.rows as { cat: number; goods_name: string }[]) {
            const name = getCommodityGroup(r.goods_name);
            if (name !== "سایر") groupSet.set(`${r.cat}|${name}`, { cat: r.cat, name });
        }

        return NextResponse.json({
            startJdate: historyConfig.startJdate,
            today: todayJdate(),
            cats: historyConfig.cats.map((code) => ({ code, name: CAT_NAMES[code] ?? `گروه ${code}` })),
            coverage: cov.rows,
            lastFetch: (last.rows[0] as { last_fetch: string | null } | undefined)?.last_fetch ?? null,
            subCats: (subs.rows as { cat: number; sub_cat: number }[]).map((r) => ({
                cat: r.cat,
                subCat: r.sub_cat,
                label: subCatLabel(r.sub_cat),
            })),
            groups: Array.from(groupSet.values()),
            producers: (prod.rows as { cat: number; producer_name: string }[]).map((r) => ({
                cat: r.cat,
                name: r.producer_name,
            })),
            tasvieh: (tas.rows as { tasvieh: string }[]).map((r) => r.tasvieh),
            contracts: (con.rows as { contract_type: string }[]).map((r) => r.contract_type),
        });
    } catch (error) {
        console.error("history/meta error:", error);
        return NextResponse.json({ error: "خطا در خواندن وضعیت تاریخچه" }, { status: 500 });
    }
}