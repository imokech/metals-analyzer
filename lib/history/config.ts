const intList = (v: string | undefined, d: number[]) =>
    v ? v.split(",").map((x) => Number(x.trim())).filter((x) => Number.isFinite(x)) : d;
const int = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);

export const historyConfig = {
    cats: intList(process.env.HISTORY_CATS, [1, 49, 97]),
    startJdate: process.env.HISTORY_START_JDATE ?? "1401/01/01",
    batchSize: int(process.env.HISTORY_BATCH_SIZE, 5),
    minDelayMs: int(process.env.HISTORY_MIN_DELAY_MS, 8_000),
    maxDelayMs: int(process.env.HISTORY_MAX_DELAY_MS, 25_000),
    maxConsecutiveFailures: int(process.env.HISTORY_MAX_CONSECUTIVE_FAILURES, 3),
    maxAttempts: int(process.env.HISTORY_MAX_ATTEMPTS, 8),
    refreshRecentWindows: int(process.env.HISTORY_REFRESH_RECENT, 2),
    refreshAfterHours: int(process.env.HISTORY_REFRESH_AFTER_HOURS, 12),
    cooldownMinutes: int(process.env.HISTORY_COOLDOWN_MINUTES, 30),
    spotCheckSize: int(process.env.HISTORY_SPOT_CHECK_SIZE, 5),
};