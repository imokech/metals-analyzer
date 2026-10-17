import { db } from "@/db";
import { globalPrices } from "@/db/schema";
import { GLOBAL_PRICE_MAPPINGS } from "@/lib/globalPricesMappings";
import { scrapePrice } from "@/lib/firecrawl";
import { eq } from "drizzle-orm";

/**
 * Ensures the global_prices table is seeded from the static mappings.
 * Returns the current rows.
 */
export async function ensureGlobalPricesSeeded() {
    const existing = await db.select().from(globalPrices);
    if (existing.length > 0) return existing;

    return db
        .insert(globalPrices)
        .values(
            GLOBAL_PRICE_MAPPINGS.map((m) => ({
                slug: m.slug,
                globalName: m.globalName,
                localLabel: m.localLabel,
                sourceUrl: m.sourceUrl,
                price: null,
                lastFetchedAt: null,
                manuallyUpdated: false,
            }))
        )
        .returning();
}

/**
 * Re-scrapes every global price via Firecrawl and persists the results.
 * Used by the snapshot job. Failures per-row are swallowed so one bad page
 * doesn't abort the whole refresh. Returns the updated rows.
 */
export async function refetchAllGlobalPrices() {
    const rows = await ensureGlobalPricesSeeded();

    for (const row of rows) {
        try {
            const { price } = await scrapePrice(row.sourceUrl);
            if (price !== null) {
                await db
                    .update(globalPrices)
                    .set({
                        price,
                        lastFetchedAt: new Date(),
                        manuallyUpdated: false,
                        updatedAt: new Date(),
                    })
                    .where(eq(globalPrices.slug, row.slug));
            }
        } catch (err) {
            console.error(`Failed to refetch global price for ${row.slug}:`, err);
        }
    }

    return db.select().from(globalPrices);
}
