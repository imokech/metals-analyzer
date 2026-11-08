import { existsSync, readFileSync, writeFileSync } from "fs";
import { Client } from "pg";
import { historyConfig as cfg } from "@/lib/history/config";
import { createDrizzleStore } from "@/lib/history/drizzle-store";
import { fetchTrades } from "@/lib/history/fetcher";
import { planWindows, runSyncBatch, todayJdate } from "@/lib/history/sync";

const LOCK_KEY = 74_110_001;
const COOLDOWN_FILE = process.env.HISTORY_COOLDOWN_FILE ?? ".history-cooldown";

function cooldownLeftMs(): number {
    if (!existsSync(COOLDOWN_FILE)) return 0;
    const until = Number(readFileSync(COOLDOWN_FILE, "utf8"));
    return Number.isFinite(until) ? Math.max(0, until - Date.now()) : 0;
}

async function main() {
    const left = cooldownLeftMs();
    if (left > 0) {
        console.log(`[history-sync] در حالت استراحت؛ ${Math.ceil(left / 60_000)} دقیقهٔ دیگر`);
        return;
    }

    // قفل روی یک اتصال جدا، تا پایان اسکریپت نگه داشته می‌شود
    const lock = new Client({ connectionString: process.env.DATABASE_URL });
    await lock.connect();
    try {
        const { rows } = await lock.query("select pg_try_advisory_lock($1) as ok", [LOCK_KEY]);
        if (!rows[0].ok) {
            console.log("[history-sync] اجرای قبلی هنوز در حال کار است");
            return;
        }

        const store = createDrizzleStore(cfg);
        const specs = planWindows(cfg.cats, cfg.startJdate, todayJdate());
        await store.ensureWindows(specs);
        console.log(
            `[history-sync] ${specs.length} پنجره برنامه‌ریزی شد (${specs[0].fromJdate} تا ${specs[specs.length - 1].toJdate})`
        );

        const result = await runSyncBatch(store, fetchTrades, cfg);
        console.log("[history-sync]", JSON.stringify(result));

        if (result.stoppedEarly) {
            writeFileSync(COOLDOWN_FILE, String(Date.now() + cfg.cooldownMinutes * 60_000));
            console.warn(`[history-sync] توقف زودهنگام؛ ${cfg.cooldownMinutes} دقیقه استراحت`);
        }
    } finally {
        await lock.end();
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("[history-sync] خطا:", err);
        process.exit(1);
    });