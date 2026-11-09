import { fetchImeTradeData } from "@/lib/ime";

async function main() {
    const rows = await fetchImeTradeData("1405/08/02", "1405/08/08", 0, 1);
    console.log("rows:", rows.length);
    console.log("first:", rows[0]?.GoodsName, rows[0]?.date, rows[0]?.Category);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
