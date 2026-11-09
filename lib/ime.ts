import type { RawDataItem } from "@/types";
import { config } from "@/lib/config";

const IME_TIMEOUT_MS = 30_000;

/**
 * Fetches raw IME (Iran Mercantile Exchange) trade rows for a date range.
 *
 * NOTE: dates are Jalali strings (YYYY/MM/DD). The IME field is named
 * `GregorianFromDate`, but the endpoint accepts Jalali values (the dashboard
 * depends on this), so they are passed through unchanged. Do not convert them.
 *
 * Shared by the /api/fetch-data route and the history sync job.
 */
export async function fetchImeTradeData(
    fromDate: string,
    toDate: string,
    subCat: number = 0,
    cat: number = 1 // 1 = فولاد, 49 = سنگ آهن, 97 = آهن اسفنجی
): Promise<RawDataItem[]> {
    const payload = {
        Language: 8,
        fari: false,
        GregorianFromDate: fromDate,
        GregorianToDate: toDate,
        MainCat: 1, // Metals and Minerals
        Cat: cat,
        SubCat: subCat,
        Producer: 0,
    };

    const response = await fetch(config.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: config.imeApiUrl, data: payload }),
        signal: AbortSignal.timeout(IME_TIMEOUT_MS),
    });

    // کد وضعیت را حتماً در پیام بگذارید؛ statusText در HTTP/2 خالی است
    if (!response.ok) {
        const body = await response.text().catch(() => "");
	throw new Error(`خطا در ارتباط با سرور: HTTP ${response.status} ${body.slice(0, 150)}`);
    }

    const text = await response.text();
    let envelope: { d?: unknown };
    try {
        envelope = JSON.parse(text);
    } catch {
        throw new Error(`پاسخ پروکسی JSON نیست: ${text.slice(0, 120)}`);
    }

    if (typeof envelope.d !== "string" || envelope.d.length === 0) {
        throw new Error("فرمت پاسخ دریافت شده نامعتبر است.");
    }

    try {
        return JSON.parse(envelope.d) as RawDataItem[];
    } catch {
        throw new Error(`داده IME قابل تجزیه نیست: ${envelope.d.slice(0, 120)}`);
    }
}
