import { createHash } from "crypto";

/* ───────────── انواع ───────────── */

export interface RawTrade {
    GoodsName: string;
    date: string;
    Quantity: number;
    TotalPrice: number;
    Category?: string;
    [key: string]: unknown;
}

export interface WindowSpec {
    cat: number;
    fromJdate: string;
    toJdate: string;
}

export interface WindowRow extends WindowSpec {
    id: number;
    attempts: number;
}

export interface Totals {
    rowCount: number;
    sumQuantity: number;
    sumTotalPrice: number;
}

export interface WindowSummary extends Totals {
    checksum: string;
}

export interface StoredWindow extends WindowRow {
    status: "pending" | "ok" | "empty" | "failed";
    summary: WindowSummary | null;
}


const DAY_MS = 86_400_000;
const JDATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;

export function jdateOf(d: Date): string {
    const parts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Tehran",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const s = `${get("year")}/${get("month")}/${get("day")}`;
    if (!JDATE_RE.test(s)) throw new Error(`خروجی تقویم شمسی غیرمنتظره: ${s}`);
    return s;
}



/**
 * لایهٔ دیتابیس. پیاده‌سازی باید:
 * - claimWindows: pending، و failed هایی که next_try_at آن‌ها رسیده و attempts < سقف،
 *   و نیز دو پنجرهٔ آخر هر cat که fetched_at آن‌ها بیش از ۱۲ ساعت پیش است.
 *   ترتیب: جدیدترین اول. با قفل (FOR UPDATE SKIP LOCKED یا advisory lock)
 *   تا دو اجرای هم‌زمان یک پنجره را برندارند.
 * - saveWindow: در یک تراکنش، معاملات قبلی پنجره را حذف و جدیدها را درج کند و
 *   status/summary/fetched_at را به‌روز کند (status = empty اگر rowCount = 0).
 */
export interface TradeStore {
    ensureWindows(specs: WindowSpec[]): Promise<void>;
    claimWindows(limit: number, now: Date): Promise<WindowRow[]>;
    saveWindow(w: WindowRow, rows: RawTrade[], summary: WindowSummary): Promise<void>;
    markFailed(id: number, error: string, retryAfterMinutes: number): Promise<void>;
    requeue(id: number, reason: string): Promise<void>;
    listWindows(): Promise<StoredWindow[]>;
    loadWindowRaw(id: number): Promise<RawTrade[]>;
    columnTotals(id: number): Promise<Totals>;
}

export type FetchTrades = (fromJdate: string, toJdate: string, cat: number) => Promise<unknown>;

/* ───────────── ابزارها ───────────── */

function stableStringify(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
    if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        const body = Object.keys(o)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
            .join(",");
        return `{${body}}`;
    }
    return JSON.stringify(v);
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function totalsOf(rows: RawTrade[]): Totals {
    return {
        rowCount: rows.length,
        sumQuantity: rows.reduce((s, r) => s + n(r.Quantity), 0),
        sumTotalPrice: rows.reduce((s, r) => s + n(r.TotalPrice), 0),
    };
}

export function summarize(rows: RawTrade[]): WindowSummary {
    const lines = rows.map(stableStringify).sort();
    const checksum = createHash("sha256").update(lines.join("\n")).digest("hex");
    return { ...totalsOf(rows), checksum };
}

/** زیرگروه از فیلد Category مثل "1-1-9" */
export function subCatOf(category: unknown): number | null {
    const last = String(category ?? "").split("-").pop();
    const v = Number(last);
    return last && Number.isFinite(v) ? v : null;
}

export const todayJdate = () => jdateOf(new Date());

/* ───────────── برنامه‌ریزی پنجره‌ها ───────────── */

/** بلوک‌های ثابت ۷روزه از startJdate تا امروز؛ بدون هم‌پوشانی و بدون شکاف. */
export function planWindows(cats: number[], startJdate: string, today: string): WindowSpec[] {
    if (!JDATE_RE.test(startJdate)) throw new Error(`تاریخ شروع نامعتبر: ${startJdate}`);

    // روز میلادی متناظر با startJdate: از ۱ ژانویهٔ (سال شمسی + ۶۲۱) جلو می‌رویم
    let cursor = Date.UTC(Number(startJdate.slice(0, 4)) + 621, 0, 1, 12);
    let steps = 0;
    while (jdateOf(new Date(cursor)) !== startJdate) {
        cursor += DAY_MS;
        if (++steps > 800) throw new Error(`تاریخ شروع پیدا نشد: ${startJdate}`);
    }

    const specs: WindowSpec[] = [];
    while (jdateOf(new Date(cursor)) <= today) {
        const fromJdate = jdateOf(new Date(cursor));
        const toJdate = jdateOf(new Date(cursor + 6 * DAY_MS));
        for (const cat of cats) specs.push({ cat, fromJdate, toJdate });
        cursor += 7 * DAY_MS;
    }
    return specs;
}

/* ───────────── اعتبارسنجی پاسخ ───────────── */

export function validateResponse(data: unknown, w: WindowSpec): RawTrade[] {
    if (!Array.isArray(data)) throw new Error("پاسخ IME آرایه نیست");
    for (const r of data as RawTrade[]) {
        if (!r || typeof r !== "object" || !r.GoodsName || !r.date) {
            throw new Error("ردیف ناقص در پاسخ IME");
        }
        const d = String(r.date).slice(0, 10);
        if (d < w.fromJdate || d > w.toJdate) {
            throw new Error(`تاریخ ${d} بیرون از بازهٔ ${w.fromJdate}..${w.toJdate}`);
        }
    }
    return data as RawTrade[];
}

/* ───────────── اجرای یک دسته ───────────── */

export interface SyncOptions {
    batchSize: number;
    minDelayMs: number;
    maxDelayMs: number;
    maxConsecutiveFailures: number;
}

export interface SyncResult {
    processed: number;
    ok: number;
    empty: number;
    failed: number;
    stoppedEarly: string | null;
}

const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const BLOCKED = /HTTP (429|403)|too many|blocked|forbidden/i;
const backoffMinutes = (attempts: number) => Math.min(24 * 60, 10 * 2 ** Math.max(0, attempts - 1));

export async function runSyncBatch(
    store: TradeStore,
    fetchTrades: FetchTrades,
    opts: SyncOptions
): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, ok: 0, empty: 0, failed: 0, stoppedEarly: null };
    const windows = await store.claimWindows(opts.batchSize, new Date());
    let consecutive = 0;

    for (let i = 0; i < windows.length; i++) {
        const w = windows[i];
        if (i > 0) {
            await sleepMs(opts.minDelayMs + Math.random() * (opts.maxDelayMs - opts.minDelayMs));
        }
        result.processed++;
        try {
            const rows = validateResponse(await fetchTrades(w.fromJdate, w.toJdate, w.cat), w);
            await store.saveWindow(w, rows, summarize(rows));
            consecutive = 0;
            if (rows.length === 0) result.empty++;
            else result.ok++;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await store.markFailed(w.id, msg, backoffMinutes(w.attempts + 1));
            result.failed++;
            consecutive++;
            if (BLOCKED.test(msg)) {
                result.stoppedEarly = `احتمال بلاک/محدودیت: ${msg}`;
                break;
            }
            if (consecutive >= opts.maxConsecutiveFailures) {
                result.stoppedEarly = `${consecutive} خطای پشت‌سرهم: ${msg}`;
                break;
            }
        }
    }
    return result;
}

/* ───────────── صحت‌سنجی ───────────── */

export interface VerifyIssue {
    kind: "missing" | "pending" | "failed" | "mismatch" | "empty";
    windowId?: number;
    detail: string;
}

const differs = (a: number, b: number) => Math.abs(a - b) > 0.01;

export async function verifyStore(store: TradeStore, expected: WindowSpec[]): Promise<VerifyIssue[]> {
    const issues: VerifyIssue[] = [];
    const stored = await store.listWindows();
    const key = (w: WindowSpec) => `${w.cat}|${w.fromJdate}|${w.toJdate}`;
    const byKey = new Map(stored.map((w) => [key(w), w]));

    for (const spec of expected) {
        const w = byKey.get(key(spec));
        const label = `cat ${spec.cat} · ${spec.fromJdate}..${spec.toJdate}`;
        if (!w) {
            issues.push({ kind: "missing", detail: label });
        } else if (w.status === "pending") {
            issues.push({ kind: "pending", windowId: w.id, detail: label });
        } else if (w.status === "failed") {
            issues.push({ kind: "failed", windowId: w.id, detail: label });
        } else if (w.status === "empty") {
            // ممکن است تعطیلات باشد؛ فقط برای بررسی دستی گزارش می‌شود
            issues.push({ kind: "empty", windowId: w.id, detail: label });
        }
    }

    for (const w of stored) {
        if ((w.status !== "ok" && w.status !== "empty") || !w.summary) continue;
        const fromRaw = summarize(await store.loadWindowRaw(w.id));
        const fromCols = await store.columnTotals(w.id);
        const problems: string[] = [];
        if (fromRaw.checksum !== w.summary.checksum) problems.push("checksum JSON خام");
        if (fromRaw.rowCount !== w.summary.rowCount) problems.push("تعداد ردیف JSON");
        if (fromCols.rowCount !== w.summary.rowCount) problems.push("تعداد ردیف ستون‌ها");
        if (differs(fromCols.sumQuantity, w.summary.sumQuantity)) problems.push("جمع حجم");
        if (differs(fromCols.sumTotalPrice, w.summary.sumTotalPrice)) problems.push("جمع ارزش");
        if (problems.length > 0) {
            issues.push({
                kind: "mismatch",
                windowId: w.id,
                detail: `cat ${w.cat} · ${w.fromJdate}..${w.toJdate}: ${problems.join("، ")}`,
            });
        }
    }
    return issues;
}

/** چند پنجرهٔ تصادفی را دوباره از IME می‌گیرد و اگر فرق کرد، به صف برمی‌گرداند. */
export async function spotCheck(
    store: TradeStore,
    fetchTrades: FetchTrades,
    sampleSize: number,
    delayMs: number
): Promise<VerifyIssue[]> {
    const okWindows = (await store.listWindows()).filter((w) => w.status === "ok" && w.summary);
    const sample = okWindows.sort(() => Math.random() - 0.5).slice(0, sampleSize);
    const issues: VerifyIssue[] = [];

    for (let i = 0; i < sample.length; i++) {
        const w = sample[i];
        if (i > 0) await sleepMs(delayMs);
        try {
            const rows = validateResponse(await fetchTrades(w.fromJdate, w.toJdate, w.cat), w);
            if (summarize(rows).checksum !== w.summary?.checksum) {
                await store.requeue(w.id, "تغییر داده در IME نسبت به نسخهٔ ذخیره‌شده");
                issues.push({
                    kind: "mismatch",
                    windowId: w.id,
                    detail: `cat ${w.cat} · ${w.fromJdate}..${w.toJdate}: دادهٔ IME تغییر کرده؛ دوباره در صف قرار گرفت`,
                });
            }
        } catch {
            // خطای شبکه در اسپات‌چک مشکل داده نیست
        }
    }
    return issues;
}


