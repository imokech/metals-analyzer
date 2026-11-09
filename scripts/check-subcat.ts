import { fetchImeTradeData } from "@/lib/ime";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main() {
    const from = "1405/08/02";
    const to = "1405/08/08";
    const all = await fetchImeTradeData(from, to, 0, 1);

    const subs = new Map<number, number>();
    for (const r of all) {
        const sub = Number(String(r.Category ?? "").split("-").pop());
        subs.set(sub, (subs.get(sub) ?? 0) + 1);
    }
    console.log("SubCat 0:", all.length, "ردیف،", subs.size, "زیرگروه");

    let sum = 0;
    for (const [sub, expected] of subs) {
        await sleep(5000);
        const rows = await fetchImeTradeData(from, to, sub, 1);
        sum += rows.length;
        console.log(`sub ${sub}: ${rows.length} (در SubCat 0: ${expected})${rows.length === expected ? "" : "  ← تفاوت"}`);
    }
    console.log(sum === all.length ? "OK: جمع زیرگروه‌ها برابر است" : `تفاوت: ${sum} در برابر ${all.length}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
