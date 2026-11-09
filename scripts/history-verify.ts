import { historyConfig as cfg } from "@/lib/history/config";
import { createDrizzleStore } from "@/lib/history/drizzle-store";
import { fetchTrades } from "@/lib/history/fetcher";
import { planWindows, spotCheck, todayJdate, verifyStore } from "@/lib/history/sync";

// تعداد ردیف‌های «گرد» می‌تواند نشانهٔ سقف (truncate) در پاسخ IME باشد
const ROUND_COUNTS = new Set([100, 200, 250, 500, 1000, 2000, 5000, 10000]);

async function main() {
    const args = new Set(process.argv.slice(2));
    const store = createDrizzleStore(cfg);
    const expected = planWindows(cfg.cats, cfg.startJdate, todayJdate());

    const issues = await verifyStore(store, expected);
    if (args.has("--spot")) {
        issues.push(...(await spotCheck(store, fetchTrades, cfg.spotCheckSize, cfg.maxDelayMs)));
    }

    const windows = await store.listWindows();
    const done = windows.filter((w) => w.summary && (w.status === "ok" || w.status === "empty")).length;
    const empties = issues.filter((i) => i.kind === "empty");
    const pending = issues.filter((i) => i.kind === "pending");
    const missing = issues.filter((i) => i.kind === "missing");
    const problems = issues.filter((i) => !["empty", "pending", "missing"].includes(i.kind));
    const failed = problems.filter((i) => i.kind === "failed").length;
    const mismatched = problems.length - failed;
    const suspicious = windows.filter(
        (w) => w.summary && w.status === "ok" && ROUND_COUNTS.has(w.summary.rowCount)
    );

    console.log(`پنجره‌های کامل: ${done} از ${expected.length}`);
    console.log(`در انتظار همگام‌سازی: ${pending.length}`);
    console.log(`هنوز ساخته نشده (sync بعدی می‌سازد): ${missing.length}`);
    console.log(`پنجره‌های خالی (احتمالاً تعطیلات یا گروه کم‌معامله): ${empties.length}`);

    if (suspicious.length > 0) {
        console.warn(
            `هشدار: تعداد ردیف گرد (احتمال سقف پاسخ): ${suspicious
                .map((w) => `cat ${w.cat} ${w.fromJdate}=${w.summary?.rowCount}`)
                .join("، ")}`
        );
    }

    if (problems.length === 0) {
        console.log("مشکلی پیدا نشد.");
    } else {
        for (const p of problems) console.error(`[${p.kind}] ${p.detail}`);
    }

    if (args.has("--fix")) {
        const ids = new Set(
            problems
                .filter((p) => (p.kind === "mismatch" || p.kind === "failed") && p.windowId !== undefined)
                .map((p) => p.windowId as number)
        );
        for (const id of ids) await store.requeue(id, "requeue توسط history-verify --fix");
        console.log(`${ids.size} پنجره دوباره در صف قرار گرفت.`);
    }

    console.log(
        `کامل: ${done} | در انتظار: ${pending.length} | ناموفق: ${failed} | ناسازگار/مشکل دیگر: ${mismatched}`
    );
    process.exitCode = problems.length > 0 ? 1 : 0;
}

main()
    .then(() => process.exit())
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
