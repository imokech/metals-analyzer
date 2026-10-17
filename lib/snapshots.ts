import jalaali from "jalaali-js";
import { db } from "@/db";
import {
    currencySnapshots,
    globalPriceSnapshots,
    imeTradeSnapshots,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { fetchCurrencyRates } from "@/lib/currency";
import { refetchAllGlobalPrices } from "@/lib/globalPrices";
import { fetchImeTradeData } from "@/lib/ime";
import { aggregate } from "@/lib/aggregate";
import { getWeeksOfYear, getCurrentJalaliYear, WeekOption } from "@/app/utils/dateUtils";

function todayJalaliString(): string {
    const t = new Date();
    const j = jalaali.toJalaali(t);
    return `${j.jy}/${j.jm.toString().padStart(2, "0")}/${j.jd.toString().padStart(2, "0")}`;
}

/** Weeks of the current Jalali year that have already started (up to today). */
function elapsedWeeks(): WeekOption[] {
    const today = todayJalaliString();
    return getWeeksOfYear(getCurrentJalaliYear()).filter((w) => w.fromDate <= today);
}

/** True if we already have IME rows stored for this week+subCat. */
async function hasImeWeek(weekLabel: string, subCat: number): Promise<boolean> {
    const rows = await db
        .select({ id: imeTradeSnapshots.id })
        .from(imeTradeSnapshots)
        .where(
            and(
                eq(imeTradeSnapshots.weekLabel, weekLabel),
                eq(imeTradeSnapshots.subCat, subCat)
            )
        )
        .limit(1);
    return rows.length > 0;
}

/**
 * Fetches, aggregates, and stores IME trade stats for a single week.
 * Idempotent: skips weeks already present unless `force` is set.
 */
async function snapshotWeek(week: WeekOption, subCat = 0, force = false): Promise<number> {
    if (!force && (await hasImeWeek(week.label, subCat))) return 0;

    const raw = await fetchImeTradeData(week.fromDate, week.toDate, subCat);
    const rows = aggregate(raw);
    if (rows.length === 0) return 0;

    await db.insert(imeTradeSnapshots).values(
        rows.map((r) => ({
            weekLabel: week.label,
            fromDate: week.fromDate,
            toDate: week.toDate,
            subCat,
            groupName: r.groupName,
            totalQuantity: r.totalQuantity,
            totalSupply: r.totalSupply,
            totalValue: r.totalValue,
            averagePrice: r.averagePrice,
            volumeToSupplyRatio: r.volumeToSupplyRatio,
            priceToBasePriceRatio: r.priceToBasePriceRatio,
        }))
    );
    return rows.length;
}

/**
 * Captures a full point-in-time snapshot: currency rates, global prices, and
 * the current week's IME trade aggregates. Runs on the daily cron schedule.
 */
export async function captureSnapshot(): Promise<void> {
    // Currency rates
    try {
        const rates = await fetchCurrencyRates();
        await db.insert(currencySnapshots).values({ havaleh: rates.havaleh, azad: rates.azad });
    } catch (err) {
        console.error("[snapshot] currency failed:", err);
    }

    // Global prices (re-scrape, then record a time-series point per slug)
    try {
        const prices = await refetchAllGlobalPrices();
        const points = prices
            .filter((p) => p.price !== null && p.price !== undefined)
            .map((p) => ({ slug: p.slug, price: p.price as number }));
        if (points.length > 0) {
            await db.insert(globalPriceSnapshots).values(points);
        }
    } catch (err) {
        console.error("[snapshot] global prices failed:", err);
    }

    // Current week IME trade aggregates (force refresh so the in-progress week updates)
    try {
        const weeks = elapsedWeeks();
        const current = weeks[weeks.length - 1];
        if (current) {
            // Remove the day's existing rows for the current week, then re-store.
            await db
                .delete(imeTradeSnapshots)
                .where(
                    and(
                        eq(imeTradeSnapshots.weekLabel, current.label),
                        eq(imeTradeSnapshots.subCat, 0)
                    )
                );
            await snapshotWeek(current, 0, true);
        }
    } catch (err) {
        console.error("[snapshot] IME current week failed:", err);
    }
}

/**
 * Backfills IME trade aggregates for the last `n` elapsed weeks of the current
 * Jalali year. Idempotent — skips weeks already stored. Runs once on first boot.
 */
export async function backfillWeeks(n = 12): Promise<number> {
    const weeks = elapsedWeeks().slice(-n);
    let inserted = 0;
    for (const week of weeks) {
        try {
            inserted += await snapshotWeek(week, 0);
        } catch (err) {
            console.error(`[backfill] week ${week.label} failed:`, err);
        }
    }
    return inserted;
}

/** Whether any IME snapshot exists yet (used to decide first-boot backfill). */
export async function hasAnyImeSnapshot(): Promise<boolean> {
    const rows = await db.select({ id: imeTradeSnapshots.id }).from(imeTradeSnapshots).limit(1);
    return rows.length > 0;
}
