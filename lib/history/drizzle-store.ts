import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { imeSyncWindows, imeTrades } from "@/db/schema";
import { subCatOf } from "./sync";
import type {
    RawTrade,
    StoredWindow,
    Totals,
    TradeStore,
    WindowRow,
    WindowSpec,
    WindowSummary,
} from "./sync";

interface StoreConfig {
    maxAttempts: number;
    refreshRecentWindows: number;
    refreshAfterHours: number;
}

type TradeInsert = typeof imeTrades.$inferInsert;

const CHUNK = 500;

const nn = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
};
const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

function toTradeRow(w: WindowRow, r: RawTrade): TradeInsert {
    const jdate = String(r.date).slice(0, 10);
    return {
        windowId: w.id,
        cat: w.cat,
        subCat: subCatOf(r.Category),
        jdate,
        jmonth: jdate.slice(0, 7),
        goodsName: r.GoodsName,
        producerName: str(r.ProducerName),
        contractType: str(r.ContractType),
        tasvieh: str(r.Tasvieh),
        packetName: str(r.PacketName),
        broker: str(r.cBrokerSpcName),
        basePrice: nn(r.ArzeBasePrice),
        price: nn(r.Price),
        minPrice: nn(r.MinPrice),
        maxPrice: nn(r.MaxPrice),
        arze: nn(r.arze),
        taghaza: nn(r.taghaza),
        quantity: nn(r.Quantity) ?? 0,
        totalPrice: nn(r.TotalPrice) ?? 0,
        arzehPk: str(r.arzehPk),
        talarPk: nn(r.xTalarReportPK),
        raw: r,
    };
}

export function createDrizzleStore(cfg: StoreConfig): TradeStore {
    return {
        async ensureWindows(specs: WindowSpec[]) {
            for (let i = 0; i < specs.length; i += CHUNK) {
                await db
                    .insert(imeSyncWindows)
                    .values(specs.slice(i, i + CHUNK))
                    .onConflictDoNothing();
            }
        },

        // هم‌زمانی با قفل advisory در خود اسکریپت مدیریت می‌شود
        async claimWindows(limit: number, now: Date): Promise<WindowRow[]> {
            const all = await db.select().from(imeSyncWindows);

            const byCat = new Map<number, typeof all>();
            for (const w of all) {
                const list = byCat.get(w.cat) ?? [];
                list.push(w);
                byCat.set(w.cat, list);
            }
            const recentIds = new Set<number>();
            for (const list of byCat.values()) {
                list
                    .sort((a, b) => b.fromJdate.localeCompare(a.fromJdate))
                    .slice(0, cfg.refreshRecentWindows)
                    .forEach((w) => recentIds.add(w.id));
            }

            const staleMs = cfg.refreshAfterHours * 3_600_000;
            const due = all.filter((w) => {
                if (w.status === "pending") return true;
                if (w.status === "failed") {
                    return w.attempts < cfg.maxAttempts && (!w.nextTryAt || w.nextTryAt <= now);
                }
                return (
                    recentIds.has(w.id) &&
                    (!w.fetchedAt || now.getTime() - w.fetchedAt.getTime() > staleMs)
                );
            });

            return due
                .sort((a, b) => b.fromJdate.localeCompare(a.fromJdate))
                .slice(0, limit)
                .map((w) => ({
                    id: w.id,
                    cat: w.cat,
                    fromJdate: w.fromJdate,
                    toJdate: w.toJdate,
                    attempts: w.attempts,
                }));
        },

        async saveWindow(w: WindowRow, rows: RawTrade[], summary: WindowSummary) {
            await db.transaction(async (tx) => {
                await tx.delete(imeTrades).where(eq(imeTrades.windowId, w.id));
                const mapped = rows.map((r) => toTradeRow(w, r));
                for (let i = 0; i < mapped.length; i += CHUNK) {
                    await tx.insert(imeTrades).values(mapped.slice(i, i + CHUNK));
                }
                await tx
                    .update(imeSyncWindows)
                    .set({
                        status: rows.length === 0 ? "empty" : "ok",
                        attempts: 0,
                        nextTryAt: null,
                        lastError: null,
                        rowCount: summary.rowCount,
                        sumQuantity: summary.sumQuantity,
                        sumTotalPrice: summary.sumTotalPrice,
                        checksum: summary.checksum,
                        fetchedAt: new Date(),
                    })
                    .where(eq(imeSyncWindows.id, w.id));
            });
        },

        async markFailed(id: number, error: string, retryAfterMinutes: number) {
            await db
                .update(imeSyncWindows)
                .set({
                    status: "failed",
                    attempts: sql`${imeSyncWindows.attempts} + 1`,
                    lastError: error.slice(0, 500),
                    nextTryAt: new Date(Date.now() + retryAfterMinutes * 60_000),
                })
                .where(eq(imeSyncWindows.id, id));
        },

        async requeue(id: number, reason: string) {
            await db
                .update(imeSyncWindows)
                .set({ status: "pending", attempts: 0, nextTryAt: null, lastError: reason.slice(0, 500) })
                .where(eq(imeSyncWindows.id, id));
        },

        async listWindows(): Promise<StoredWindow[]> {
            const rows = await db.select().from(imeSyncWindows);
            return rows.map((w) => ({
                id: w.id,
                cat: w.cat,
                fromJdate: w.fromJdate,
                toJdate: w.toJdate,
                attempts: w.attempts,
                status: w.status as StoredWindow["status"],
                summary:
                    w.checksum !== null && w.rowCount !== null
                        ? {
                              rowCount: w.rowCount,
                              sumQuantity: w.sumQuantity ?? 0,
                              sumTotalPrice: w.sumTotalPrice ?? 0,
                              checksum: w.checksum,
                          }
                        : null,
            }));
        },

        async loadWindowRaw(id: number): Promise<RawTrade[]> {
            const rows = await db
                .select({ raw: imeTrades.raw })
                .from(imeTrades)
                .where(eq(imeTrades.windowId, id));
            return rows.map((r) => r.raw as RawTrade);
        },

        async columnTotals(id: number): Promise<Totals> {
            const [r] = await db
                .select({
                    c: sql<number>`count(*)::int`,
                    q: sql<number>`coalesce(sum(${imeTrades.quantity}), 0)::float8`,
                    t: sql<number>`coalesce(sum(${imeTrades.totalPrice}), 0)::float8`,
                })
                .from(imeTrades)
                .where(eq(imeTrades.windowId, id));
            return { rowCount: r.c, sumQuantity: r.q, sumTotalPrice: r.t };
        },
    };
}