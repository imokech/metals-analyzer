import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { getCommodityGroup } from "@/lib/aggregate";
import { historyConfig } from "@/lib/history/config";
import { todayJdate } from "@/lib/history/sync";

export interface HistoryFilters {
    from: string;
    to: string;
    cat: number | null;
    subCat: number | null;
    groups: string[];
    producers: string[];
    tasvieh: string[];
    contracts: string[];
}

const JDATE = /^\d{4}\/\d{2}\/\d{2}$/;

/** خروجی string یعنی پیام خطا */
export function parseFilters(sp: URLSearchParams): HistoryFilters | string {
    const from = sp.get("from") ?? historyConfig.startJdate;
    const to = sp.get("to") ?? todayJdate();
    if (!JDATE.test(from) || !JDATE.test(to) || from > to) return "بازهٔ تاریخ نامعتبر است";

    const catRaw = sp.get("cat");
    const cat = catRaw ? Number(catRaw) : null;
    if (cat !== null && !historyConfig.cats.includes(cat)) return "cat نامعتبر است";

    const subRaw = sp.get("subCat");
    const subCat = subRaw ? Number(subRaw) : null;
    if (subCat !== null && !Number.isInteger(subCat)) return "subCat نامعتبر است";

    return {
        from,
        to,
        cat,
        subCat,
        groups: sp.getAll("group"),
        producers: sp.getAll("producer"),
        tasvieh: sp.getAll("tasvieh"),
        contracts: sp.getAll("contract"),
    };
}

const inList = (col: SQL, values: (string | number)[]): SQL =>
    sql`${col} in (${sql.join(values.map((v) => sql`${v}`), sql`, `)})`;

/** نام کالاهایی که گروهشان «سایر» نیست و با فیلتر گروه می‌خوانند (همان منطق داشبورد) */
async function allowedGoodsNames(f: HistoryFilters): Promise<string[]> {
    const catCond = f.cat === null ? sql`true` : sql`cat = ${f.cat}`;
    const res = await db.execute(sql`select goods_name from ime_trades where ${catCond} group by 1`);
    return (res.rows as { goods_name: string }[])
        .map((r) => r.goods_name)
        .filter((name) => {
            const g = getCommodityGroup(name);
            return g !== "سایر" && (f.groups.length === 0 || f.groups.includes(g));
        });
}

/** null یعنی هیچ کالایی با فیلتر نمی‌خواند (نتیجه خالی). جدول ime_trades با نام مستعار t */
export async function buildWhere(f: HistoryFilters): Promise<SQL | null> {
    const names = await allowedGoodsNames(f);
    if (names.length === 0) return null;

    const conds: SQL[] = [sql`t.jdate between ${f.from} and ${f.to}`, inList(sql`t.goods_name`, names)];
    if (f.cat !== null) conds.push(sql`t.cat = ${f.cat}`);
    if (f.subCat !== null) conds.push(sql`t.sub_cat = ${f.subCat}`);
    if (f.producers.length > 0) conds.push(inList(sql`t.producer_name`, f.producers));
    if (f.tasvieh.length > 0) conds.push(inList(sql`t.tasvieh`, f.tasvieh));
    if (f.contracts.length > 0) conds.push(inList(sql`t.contract_type`, f.contracts));
    return sql.join(conds, sql` and `);
}