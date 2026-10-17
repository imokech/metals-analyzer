import { config } from "@/lib/config";

interface IceApiCurrency {
    id: number;
    slug: string;
    name: string;
    sell_price: string;
    buy_price: string;
    date: string;
}

interface DastyarApiItem {
    key: string;
    price: string;
    title: string;
}

export interface CurrencyRates {
    havaleh: number | null; // دلار تالار اول (Rial)
    azad: number | null; // دلار بازار آزاد (Rial)
}

function proxyGet(url: string) {
    return fetch(config.proxyUrl + "?url=" + encodeURIComponent(url));
}

/**
 * Fetches current USD rates in Rial. Shared by the /api/currency-rates route
 * and the snapshot job. Each source is fetched independently so a failure in
 * one still yields the other.
 */
export async function fetchCurrencyRates(): Promise<CurrencyRates> {
    const rates: CurrencyRates = { havaleh: null, azad: null };

    // تالار اول (havaleh) — market 2 on ice.ir
    try {
        const res = await proxyGet(config.iceApiUrl);
        if (res.ok) {
            const data: IceApiCurrency[] = await res.json();
            const usd = data.find((item) => item.slug === "USD");
            if (usd) rates.havaleh = parseInt(usd.sell_price);
        }
    } catch (err) {
        console.error("Error fetching havaleh:", err);
    }

    // بازار آزاد (azad) — dastyar returns Toman, convert to Rial
    try {
        const res = await proxyGet(config.dastyarApiUrl);
        if (res.ok) {
            const data: DastyarApiItem[] = await res.json();
            const usd = data.find((item) => item.key === "usd");
            if (usd) rates.azad = parseInt(usd.price) * 10;
        }
    } catch (err) {
        console.error("Error fetching azad:", err);
    }

    return rates;
}
