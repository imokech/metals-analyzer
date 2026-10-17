import type { RawDataItem } from "@/types";
import { config } from "@/lib/config";

/**
 * Fetches raw IME (Iran Mercantile Exchange) trade rows for a date range.
 * Dates are Gregorian strings in the format the IME endpoint expects.
 * Shared by the /api/fetch-data route and the snapshot/backfill job.
 */
export async function fetchImeTradeData(
    fromDate: string,
    toDate: string,
    subCat: number = 0
): Promise<RawDataItem[]> {
    const payload = {
        Language: 8,
        fari: false,
        GregorianFromDate: fromDate,
        GregorianToDate: toDate,
        MainCat: 1, // Metals and Minerals
        Cat: 1, // Steel
        SubCat: subCat,
        Producer: 0,
    };

    const response = await fetch(config.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: config.imeApiUrl, data: payload }),
    });

    if (!response.ok) {
        throw new Error(`خطا در ارتباط با سرور: ${response.statusText}`);
    }

    const jsonResponse = await response.json();

    if (!jsonResponse.d) {
        throw new Error("فرمت پاسخ دریافت شده نامعتبر است.");
    }

    return JSON.parse(jsonResponse.d) as RawDataItem[];
}
