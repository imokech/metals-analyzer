import { fetchImeTradeData } from "@/lib/ime";

async function main() {
    const [from, to, cat] = process.argv.slice(2);
    if (!from || !to || !cat) throw new Error("usage: try-window.ts <from> <to> <cat>");
    try {
        const rows = await fetchImeTradeData(from, to, 0, Number(cat));
        const q = rows.reduce((s, r) => s + Number(r.Quantity || 0), 0);
        const t = rows.reduce((s, r) => s + Number(r.TotalPrice || 0), 0);
        console.log(`cat ${cat} ${from}..${to}: rows=${rows.length} qty=${q} total=${t}`);
    } catch (err) {
        console.error(`cat ${cat} ${from}..${to}: ERROR`, err instanceof Error ? err.message : err);
    }
}

main();
