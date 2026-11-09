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

// HISTORY_EXCLUDE_SUBCATS="97:2706,49:198,49:489"  ← فرمت cat:subCat با کاما
const DEFAULT_EXCLUDED = "97:2706,49:198,49:489";

function parseExcluded(raw: string | undefined): Map<number, Set<number>> {
    const map = new Map<number, Set<number>>();
    for (const part of (raw ?? DEFAULT_EXCLUDED).split(",").map((s) => s.trim()).filter(Boolean)) {
        const [c, s] = part.split(":").map(Number);
        if (!Number.isFinite(c) || !Number.isFinite(s)) continue;
        if (!map.has(c)) map.set(c, new Set());
        map.get(c)!.add(s);
    }
    return map;
}

const excluded = parseExcluded(process.env.HISTORY_EXCLUDE_SUBCATS);

export function isExcludedSubCat(cat: number, subCat: number): boolean {
    return excluded.get(cat)?.has(subCat) ?? false;
}

/** زیرگروه از فیلد Category مثل "1-49-464" (آخرین بخش) */
export function subCatOfRow(row: object): number | null {
    const category = (row as unknown as { Category?: unknown }).Category;
    const last = String(category ?? "").split("-").pop();
    if (!last) return null;
    const n = Number(last);
    return Number.isFinite(n) ? n : null;
}

export function dropExcludedRows<T extends object>(rows: T[], cat: number): T[] {
    return rows.filter((row) => {
        const sub = subCatOfRow(row);
        return sub === null || !isExcludedSubCat(cat, sub);
    });
}