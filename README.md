# Metali — Precious / Steel Metals Market Analyzer

**متال — تحلیلگر بازار فلزات.** A Persian (RTL) web dashboard that tracks steel-product trading on the
[Iran Mercantile Exchange (IME)](https://www.ime.co.ir), compares local prices with global prices and USD rates,
and keeps a daily history so trends can be analysed over time.

> The package is still named `precious-metals-analysis` and `metadata.json` carries the original description;
> in practice the data covers the IME **steel** category (rebar, beams, hot/cold/galvanized sheet, slab, billet, cathode).

## What it does

- **Dashboard (`/`)** — pick a Jalali week (or a manual date range) and an IME sub-category, fetch trade rows, and see them
  aggregated per commodity group: contract volume, supply, trade value, average price, volume/supply %, and
  price-vs-base-price %. Filter by settlement type, group and producer; compare two groups; export to Excel.
  A *market / manual* switch lets you override the average price per group.
- **Global prices** — USD/mt reference prices for rebar, HRC, CRC, galvanized, slab and billet, scraped from
  metal.com with Firecrawl. They can be re-fetched or overridden by hand. Missing long-product prices (I-beam, angle, channel)
  are derived from billet (×1.07 / ×1.07 / ×1.16).
- **Currency rates** — USD in Rial from two sources: *Havaleh / تالار اول* (ice.ir) and the *free market / آزاد* (dastyar.io).
- **Premium tracker** — implied USD rate (`local avg price ÷ global price × 1000`) vs the actual rate, per group.
- **Historical analysis (`/history`)** — weekly IME aggregates, currency history and global price history, charted with Recharts.
  Fed by a daily in-process cron job plus a first-boot backfill; a "refresh now" button triggers the same job manually.
- **Auth** — email + password sign-in (better-auth). Every page and API route except `/login`, `/signup` and `/api/auth/*`
  requires a session cookie.

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5.8 |
| Styling | Tailwind CSS 3 — "Steep" editorial design (see [.claude/DESIGN.md](.claude/DESIGN.md)); Vazirmatn + Noto Naskh Arabic fonts |
| Database | PostgreSQL (Neon) via Drizzle ORM + `pg` |
| Auth | better-auth (Drizzle adapter, email/password) |
| Scraping | Firecrawl (`@mendable/firecrawl-js`) |
| Scheduling | `node-cron`, started from the Next.js instrumentation hook |
| Charts / export | Recharts, `xlsx` |
| Dates | `jalaali-js` (Jalali ↔ Gregorian) |
| Hosting | [Liara](https://liara.ir) (Node server, `next start`) — see `liara.json` |
| Package manager | **pnpm** (`pnpm-lock.yaml`) |

## Getting started

**Prerequisites:** Node.js 22+, pnpm, a PostgreSQL database (e.g. [Neon](https://neon.tech)), a [Firecrawl](https://firecrawl.dev) API key,
and a working outbound proxy URL (see below).

```bash
pnpm install
cp .env.local.example .env.local      # then fill in the values
pnpm db:migrate                       # apply the migrations in ./drizzle
pnpm dev                              # http://localhost:3000
```

Open `/signup` to create the first account. On first boot the server waits ~8 s, and if there are no IME snapshots it
backfills the last 12 elapsed weeks of the current Jalali year.

### Environment variables

Copy [.env.local.example](.env.local.example). All server-side configuration is read through [lib/config.ts](lib/config.ts).

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `FIRECRAWL_API_KEY` | yes | Scraping global prices |
| `BETTER_AUTH_SECRET` | yes | Session signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | yes | Public base URL of the app (auth callbacks) |
| `PROXY_URL` | yes | HTTP proxy used for every call to IME, ice.ir and dastyar.io. Must accept `POST {url, data}` and `GET ?url=<encoded>` |
| `IME_API_URL` | no | Override the IME `GetAmareMoamelatList` endpoint |
| `ICE_API_URL` | no | Override the ice.ir Havaleh USD endpoint |
| `DASTYAR_API_URL` | no | Override the dastyar.io free-market USD endpoint |
| `SNAPSHOT_CRON` | no | Daily snapshot schedule, default `0 6 * * *` (server local time) |
| `BACKFILL_WEEKS` | no | Weeks to backfill on first boot / first manual refresh, default `12` |

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js dev server / production build / production server |
| `pnpm db:generate` | Generate a migration from `db/schema.ts` changes |
| `pnpm db:migrate` | Apply migrations in `./drizzle` |
| `pnpm db:push` | Push the schema directly (dev only, skips migration files) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm lint` | `next lint` — **currently broken**, see [HANDOFF.md](HANDOFF.md) |

## Project structure

```
app/
  page.tsx                  Dashboard (client component: week/range pickers, filters, export)
  history/page.tsx          Historical analysis page
  login/, signup/           Auth screens
  layout.tsx                RTL root layout, fonts, <Nav/>
  api/
    fetch-data/             POST  IME trade rows for a date range
    currency-rates/         GET   live USD rates (Havaleh + free market)
    global-prices/          GET list · POST seed from mappings
    global-prices/[slug]/   PATCH manual price override
    global-prices/[slug]/refetch/  POST re-scrape one price via Firecrawl
    history/                GET ?type=ime|currency|global · POST refresh now
    auth/[...all]/          better-auth handler
  components/               DataTable, GlobalPrices, CurrencyRates, PairComparison, MultiSelect, Nav, ...
  components/charts/        HistoricalTrends, PremiumTracker, CurrencyHistoryChart, RatioGauge, Sparkline
  utils/dateUtils.ts        Jalali week generation (Sat–Fri weeks)
lib/
  config.ts                 Env-driven configuration (proxy + upstream URLs, cron, backfill)
  ime.ts                    IME fetch via proxy
  currency.ts               ice.ir + dastyar USD rates via proxy
  firecrawl.ts              Scrape + price-extraction heuristics
  aggregate.ts              Group raw IME rows into commodity-group aggregates
  globalPrices.ts           Seed + refetch-all for global prices
  globalPricesMappings.ts   Static slug → source URL → Persian label map
  snapshots.ts              captureSnapshot() / backfillWeeks() for the history tables
  auth.ts, auth-client.ts   better-auth server / browser clients
db/                         Drizzle client (index.ts) and schema (schema.ts)
drizzle/                    Generated SQL migrations
instrumentation*.ts         Boots the cron scheduler when the Node server starts
middleware.ts               Cookie-based login guard
types.ts                    RawDataItem / AggregatedData
```

## How data flows

```
Browser ──► /api/fetch-data ──► lib/ime ──► PROXY_URL ──► ime.co.ir        (live, per request)
Browser ──► /api/currency-rates ─► lib/currency ─► PROXY_URL ─► ice.ir + dastyar.io
Browser ──► /api/global-prices ──► Postgres (global_prices)  ◄── Firecrawl ◄── metal.com

node-cron (SNAPSHOT_CRON) ──► lib/snapshots.captureSnapshot()
        ├─ currency_snapshots
        ├─ global_price_snapshots   (after re-scraping every global price)
        └─ ime_trade_snapshots      (current week, delete + re-insert)
Browser ──► /api/history ──► snapshot tables ──► /history charts
```

Database tables: better-auth (`user`, `session`, `account`, `verification`), `global_prices`, `currency_snapshots`,
`global_price_snapshots`, `ime_trade_snapshots`.

## Deployment (Liara)

`liara.json` targets a Next.js app named `metali` on port 3000, built in Iran. The cron scheduler runs **inside the
Node process**, so deploy as a long-lived server (not serverless/edge) and run a **single instance**, otherwise snapshots
are taken once per instance. Set all required env vars in the Liara dashboard and run `pnpm db:migrate` against the production DB.

## More documentation

- [HANDOFF.md](HANDOFF.md) — current status, known issues and suggested next steps
- [AGENTS.md](AGENTS.md) — conventions and guardrails for AI coding agents working in this repo
