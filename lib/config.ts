/**
 * Central place for environment-driven server configuration.
 * Read lazily (via getters) so a missing variable fails at the call site with a
 * clear message rather than at import/build time.
 */

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function optional(name: string, fallback: string): string {
    return process.env[name] || fallback;
}

function optionalInt(name: string, fallback: number): number {
    const parsed = parseInt(process.env[name] ?? "", 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
    /** Outbound HTTP proxy used to reach Iranian upstreams (IME, ice.ir, dastyar). */
    get proxyUrl() {
        return required("PROXY_URL");
    },
    /** IME (Iran Mercantile Exchange) trade-statistics endpoint. */
    get imeApiUrl() {
        return optional(
            "IME_API_URL",
            "https://www.ime.co.ir/subsystems/ime/services/home/imedata.asmx/GetAmareMoamelatList"
        );
    },
    /** ice.ir latest-currency endpoint (تالار اول / havaleh USD rate). */
    get iceApiUrl() {
        return optional(
            "ICE_API_URL",
            "https://api.ice.ir/api/v1/markets/2/currencies/history/latest/?lang=fa"
        );
    },
    /** dastyar.io financial-items endpoint (free-market USD rate, in Toman). */
    get dastyarApiUrl() {
        return optional("DASTYAR_API_URL", "https://api.dastyar.io/express/financial-item");
    },
    /** node-cron expression for the daily snapshot job (server local time). */
    get snapshotCron() {
        return optional("SNAPSHOT_CRON", "0 6 * * *");
    },
    /** How many elapsed weeks to backfill on first boot / first manual refresh. */
    get backfillWeeks() {
        return optionalInt("BACKFILL_WEEKS", 12);
    },
};
