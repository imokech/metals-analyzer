/**
 * Node-only instrumentation body. Imported dynamically from instrumentation.ts
 * exclusively inside the `NEXT_RUNTIME === 'nodejs'` branch so it is never
 * bundled for the edge runtime.
 *
 * Starts the in-app node-cron scheduler: a daily market snapshot plus a
 * one-time backfill of recent weeks on first boot.
 */
export async function start() {
    // Avoid double-scheduling across HMR / repeated register calls.
    const g = globalThis as unknown as { __metalsCronStarted?: boolean };
    if (g.__metalsCronStarted) return;
    g.__metalsCronStarted = true;

    const cron = (await import("node-cron")).default;
    const { captureSnapshot, backfillWeeks, hasAnyImeSnapshot } = await import("@/lib/snapshots");
    const { config } = await import("@/lib/config");

    // Default: daily at 06:00 server time (override with SNAPSHOT_CRON).
    cron.schedule(config.snapshotCron, async () => {
        console.log("[cron] capturing daily market snapshot…");
        try {
            await captureSnapshot();
            console.log("[cron] snapshot complete");
        } catch (err) {
            console.error("[cron] snapshot failed:", err);
        }
    });

    // First-boot backfill, deferred so it doesn't block server startup.
    setTimeout(async () => {
        try {
            if (!(await hasAnyImeSnapshot())) {
                console.log("[cron] no history found — backfilling recent weeks…");
                const inserted = await backfillWeeks(config.backfillWeeks);
                console.log(`[cron] backfill inserted ${inserted} rows`);
            }
        } catch (err) {
            console.error("[cron] backfill check failed:", err);
        }
    }, 8000);

    console.log("[cron] scheduler started");
}
