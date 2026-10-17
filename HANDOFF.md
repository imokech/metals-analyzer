# Handoff — Metali (metals-analysier)

_Written 2026-10-17 from a read-through of the codebase at commit `235c213` plus the config refactor described below. Nothing here was verified against the live production deployment._

## TL;DR

A working Persian-language dashboard for IME steel trading. Core features are built: live IME aggregation, global prices (scraped),
USD rates, premium tracker, auth, and a historical-analysis page fed by a daily cron job. The project is functional but **has no tests, a broken
lint setup, and several security / hygiene issues** (top of the list below) that should be handled before treating it as production-hardened.

## Do these first

1. **Rotate secrets — `.env` is tracked in git.** `.env` is listed in `.gitignore` but is committed (3 commits touch it), so `DATABASE_URL`,
   `FIRECRAWL_API_KEY` and `BETTER_AUTH_SECRET` are in history. Rotate all three, then `git rm --cached .env` and keep real values only in
   `.env.local` / the Liara dashboard. (I did not do this — it changes the index/history and needs your decision.)
2. **Add `PROXY_URL` to every environment** (local `.env.local`, Liara). It is now **required**; the app throws `Missing required environment variable: PROXY_URL` on the first IME/currency call without it.
3. **Decide who may sign up.** `/signup` is public and `emailAndPassword` is enabled, so anyone who finds the URL can create an account and see the dashboard. The code comment calls it an "internal analytics tool". Options: disable sign-up after creating the team's accounts, add an allow-list/invite, or set better-auth `disableSignUp`.
4. **API routes are only guarded by the cookie-presence middleware.** Handlers never validate the session, and `PATCH /api/global-prices/[slug]` and `POST /api/history` mutate data. Add `auth.api.getSession()` checks (or a shared helper) in the mutating routes.

## Current state

### Done
- IME fetch → aggregate by commodity group → table, filters, pair comparison, Excel export, manual/market price switch, sub-category filter.
- Global prices: seed from static mappings, Firecrawl scrape, manual override, refetch per slug.
- Currency rates (Havaleh + free market) and the premium tracker.
- Persistence: `currency_snapshots`, `global_price_snapshots`, `ime_trade_snapshots` + `/history` page with charts and a manual "refresh now".
- Auth (better-auth) with login-forced middleware.
- Daily cron + first-boot backfill via `instrumentation.ts` → `instrumentation-node.ts`.
- **This session:** README rewritten; AGENTS.md and this file added; hardcoded config moved to env (below).

### Config extraction done this session
Previously hardcoded in source, now read via [lib/config.ts](lib/config.ts):

| Was hardcoded in | Value | Now |
|---|---|---|
| `lib/ime.ts`, `lib/currency.ts` | proxy `https://dastyar-prx11.darkube.ir/proxy` | `PROXY_URL` (**required**, no default) |
| `lib/ime.ts` | IME `GetAmareMoamelatList` URL | `IME_API_URL` (default kept) |
| `lib/currency.ts` | ice.ir latest-currency URL | `ICE_API_URL` (default kept) |
| `lib/currency.ts` | dastyar.io financial-item URL | `DASTYAR_API_URL` (default kept) |
| `instrumentation-node.ts` | `"0 6 * * *"` | `SNAPSHOT_CRON` |
| `instrumentation-node.ts`, `app/api/history/route.ts` | backfill `12` weeks | `BACKFILL_WEEKS` |

`PROXY_URL` was appended to the local `.env` (so the app keeps running as before) and documented in `.env.local.example`.
`npx tsc --noEmit` passes after the change. I did **not** run the app against the live upstreams, so the proxy path is untested end-to-end.

Deliberately left in code: the metal.com source URLs in `lib/globalPricesMappings.ts` (seed data, stored in the DB after first seed), IME `SubCat` ids in `app/page.tsx`, price sanity bounds (100–10 000) in `lib/firecrawl.ts`, and the billet multipliers (1.07 / 1.16).

## Known issues & tech debt

**Correctness / robustness**
- `captureSnapshot()` deletes the current week's IME rows *before* re-fetching; if the fetch fails, that week's data is lost until the next successful run. Fetch first, then replace in a transaction.
- `POST /api/history` (manual refresh) appends a new `currency_snapshots` / `global_price_snapshots` row every click — no dedupe, no rate limit. It also triggers a full Firecrawl re-scrape of every price (credit cost).
- `elapsedWeeks()` / backfill only look at the **current Jalali year**; right after Nowruz the backfill has almost nothing to fetch and the previous year's tail is never captured.
- Cron runs in-process: more than one running instance = duplicate snapshots. Server local time determines "06:00" (check Liara's timezone).
- `lib/firecrawl.ts` price extraction is regex-heuristic with a last-resort "any 3–4 digit number" fallback that can return a wrong price silently. `refetchAllGlobalPrices` swallows per-row errors and keeps the old price with no staleness indicator beyond `lastFetchedAt`.
- No indexes on the snapshot tables (`captured_at`, `slug`, `week_label`); `/api/history` returns **all** rows unpaginated. Fine now, will grow.
- `dateUtils.getWeeksOfYear` has no tests and a `weekNumber > 60` guard — week-boundary logic (week 1 ends on the first Friday) is easy to break.

**Duplication**
- `AZAD_GROUPS` and the billet-derived multipliers exist in both `app/components/DataTable.tsx` and `app/components/charts/PremiumTracker.tsx`. Extract to `lib/`.
- `GlobalPrice` / `CurrencyRates` interfaces are redeclared in `app/page.tsx`, `DataTable.tsx` and others; `db/schema.ts` already exports `GlobalPrice` and `lib/currency.ts` exports `CurrencyRates`.
- Mixed code style (4-space/double quotes in `lib`, 2-space/single in much of `app`) and relative vs `@/` imports.

**Tooling**
- `pnpm lint` fails (`Converting circular structure to JSON` from the legacy `.eslintrc.json`): `eslint@9`, `eslint-config-next@16.1.1` and `next@15.1.11` are mismatched. Fix by aligning versions and moving to flat `eslint.config.mjs`.
- No tests of any kind. Highest-value first targets: `lib/aggregate.ts`, `app/utils/dateUtils.ts`, `extractPrice` in `lib/firecrawl.ts`.
- `tsconfig.tsbuildinfo` is tracked in git (and rewritten by `tsc`) — add to `.gitignore` and untrack.
- Leftovers from the AI Studio template: `metadata.json`, package name `precious-metals-analysis`, `@types/xlsx` (deprecated stub). `xlsx@0.18.5` has known advisories; consider the maintained distribution or `exceljs`.
- `.claude/DESIGN.md` is the design reference; there's a mismatch worth knowing: it describes Signifier/Söhne, but the app substitutes Vazirmatn + Noto Naskh Arabic (see `app/layout.tsx`).

## Operations

- **Hosting:** Liara, app `metali`, Next.js platform, port 3000, build location `iran` (`liara.json`).
- **DB:** Neon Postgres. Migrations in `drizzle/` (`0000`, `0001`) — run `pnpm db:migrate` on deploy.
- **Why a proxy:** all IME / ice.ir / dastyar.io traffic goes through `PROXY_URL`. The reason isn't documented in the repo (likely network/geo restrictions); confirm with the previous owner who operates that proxy, since the app has a hard dependency on it and no fallback. The old hardcoded value was `https://dastyar-prx11.darkube.ir/proxy` (now only in the local `.env`); who owns/operates it isn't recorded in the repo.
- **Seeding:** `global_prices` is seeded lazily from `GLOBAL_PRICE_MAPPINGS` on first `GET`/`POST` of the Global Prices component or the first cron run.
- **Logs to watch:** `[cron] …`, `[snapshot] … failed`, `[backfill] week … failed`.

## Suggested next steps (rough priority)

1. Secrets rotation + untrack `.env` (above).
2. Lock down sign-up and add server-side session checks on mutating routes.
3. Make `captureSnapshot` safe (fetch → transaction replace) and rate-limit/dedupe manual refresh.
4. Fix lint, add a minimal test setup (Vitest) with tests for aggregation, Jalali weeks and price extraction.
5. Extract duplicated price/dollar logic into `lib/pricing.ts`.
6. Add indexes + date-range params to `/api/history`.
7. Extend backfill across the Jalali year boundary.

## Where to look first

| If you need to… | Start at |
|---|---|
| Change what's fetched from IME | `lib/ime.ts`, `app/api/fetch-data/route.ts` |
| Add/rename a commodity group | `GROUP_KEYWORDS` in `lib/aggregate.ts` (and `GLOBAL_PRICE_MAPPINGS` if it has a global price) |
| Add a global price source | `lib/globalPricesMappings.ts` (note: existing DB rows aren't re-seeded — insert or migrate manually) |
| Change the schedule or what a snapshot stores | `.env` `SNAPSHOT_CRON`, `lib/snapshots.ts` |
| Add an env-driven setting | `lib/config.ts` + `.env.local.example` + README |
| Touch the UI style | `.claude/DESIGN.md`, `tailwind.config.ts`, `app/globals.css` |
