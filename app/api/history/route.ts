import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
    currencySnapshots,
    globalPriceSnapshots,
    imeTradeSnapshots,
} from "@/db/schema";
import { asc } from "drizzle-orm";
import { config } from "@/lib/config";
import { captureSnapshot, backfillWeeks, hasAnyImeSnapshot } from "@/lib/snapshots";

/**
 * GET /api/history?type=currency|global|ime
 * Returns time-series rows for the historical-analysis UI.
 */
export async function GET(request: NextRequest) {
    try {
        const type = request.nextUrl.searchParams.get("type") || "ime";

        if (type === "currency") {
            const rows = await db
                .select()
                .from(currencySnapshots)
                .orderBy(asc(currencySnapshots.capturedAt));
            return NextResponse.json({ data: rows });
        }

        if (type === "global") {
            const rows = await db
                .select()
                .from(globalPriceSnapshots)
                .orderBy(asc(globalPriceSnapshots.capturedAt));
            return NextResponse.json({ data: rows });
        }

        // Default: IME trade aggregates, chronological by week.
        const rows = await db
            .select()
            .from(imeTradeSnapshots)
            .orderBy(asc(imeTradeSnapshots.fromDate));
        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error("Error fetching history:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch history" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/history — manual "refresh now" trigger for signed-in users.
 * Captures a fresh snapshot and, if no history exists yet, runs the backfill.
 * Protected by the login-forced middleware (unauthenticated callers are
 * redirected to /login before reaching this handler).
 */
export async function POST() {
    try {
        let backfilled = 0;
        if (!(await hasAnyImeSnapshot())) {
            backfilled = await backfillWeeks(config.backfillWeeks);
        }
        await captureSnapshot();

        return NextResponse.json({ ok: true, backfilled });
    } catch (error) {
        console.error("Error refreshing history:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to refresh history" },
            { status: 500 }
        );
    }
}
