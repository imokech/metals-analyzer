import { fetchImeTradeData } from "../lib/ime";

type Row = { Quantity?: number; TotalPrice?: number; Category?: string; GoodsName?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function subOf(r: Row): string {
    const p = String(r.Category ?? "").split("-");
    return p[p.length - 1];
}

function summarize(rows: Row[]) {
    let qty = 0;
    let total = 0;
    const bySub: Record<string, { n: number; goods: Set<string> }> = {};
    for (const r of rows) {
        qty += Number(r.Quantity) || 0;
        total += Number(r.TotalPrice) || 0;
        const s = subOf(r);
        bySub[s] = bySub[s] || { n: 0, goods: new Set() };
        bySub[s].n += 1;
        bySub[s].goods.add(String(r.GoodsName ?? ""));
    }
    return { n: rows.length, qty, total, bySub };
}

async function run(from: string, to: string, cat: number, sub: number) {
    try {
        const rows = (await fetchImeTradeData(from, to, sub, cat)) as unknown as Row[];
        const s = summarize(rows);
        console.log(`cat ${cat} sub ${sub} ${from}..${to}: rows=${s.n} qty=${s.qty} total=${s.total}`);
        for (const [k, v] of Object.entries(s.bySub)) {
            console.log(`    sub ${k}: ${v.n} rows | ${[...v.goods].join(" / ")}`);
        }
        return s;
    } catch (e) {
        console.log(`cat ${cat} sub ${sub} ${from}..${to}: ERROR ${(e as Error).message}`);
        return null;
    }
}

async function main() {
    const [catArg, from, to, subsArg] = process.argv.slice(2);
    if (!catArg || !from || !to) {
        console.log("usage: check-cat.ts <cat> <from> <to> [sub1,sub2,...]");
        return;
    }
    const cat = Number(catArg);
    const subs = (subsArg ?? "").split(",").filter(Boolean).map(Number);
    const all = await run(from, to, cat, 0);
    let sumN = 0;
    let sumQty = 0;
    for (const sub of subs) {
        await sleep(8000);
        const s = await run(from, to, cat, sub);
        if (s) {
            sumN += s.n;
            sumQty += s.qty;
        }
    }
    if (all && subs.length) {
        console.log(`\nSubCat 0: rows=${all.n} qty=${all.qty}`);
        console.log(`مجموع زیردسته‌ها: rows=${sumN} qty=${sumQty}`);
        console.log(all.n === sumN && all.qty === sumQty ? "نتیجه: برابر ✅" : "نتیجه: نابرابر ❌");
    }
}

main();
