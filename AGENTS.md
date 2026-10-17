# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see [README.md](README.md) and [HANDOFF.md](HANDOFF.md).

## Project in one paragraph

Next.js 15 (App Router) + TypeScript dashboard, in Persian/RTL, that analyses Iran Mercantile Exchange (IME) steel trades against
global prices and USD rates, with a daily-snapshot history. Postgres (Neon) via Drizzle; auth via better-auth; scraping via Firecrawl;
scheduling via `node-cron` started from the instrumentation hook. Deployed on Liara as a single long-lived Node server.

## Commands

Use **pnpm** (not npm/yarn).

```bash
pnpm install
pnpm dev                    # dev server on :3000
pnpm build && pnpm start    # production
pnpm db:generate            # after editing db/schema.ts — creates a SQL migration in ./drizzle
pnpm db:migrate             # apply migrations
npx tsc --noEmit            # typecheck — this is the reliable check today
```

- There are **no tests**.
- `pnpm lint` is currently **broken** (legacy `.eslintrc.json` vs `eslint@9` / `eslint-config-next@16` vs `next@15`). Don't treat its failure as caused by your change; use `npx tsc --noEmit`.
- Running `tsc` rewrites the tracked `tsconfig.tsbuildinfo`; run `git checkout tsconfig.tsbuildinfo` before committing.

## Layout (where things go)

- `app/` — pages, components, route handlers. Pages under `app/` are mostly `'use client'`.
- `app/api/**/route.ts` — thin handlers. Put logic in `lib/`, not in the route.
- `lib/` — server-side logic shared by routes, the cron job and the UI (`aggregate.ts` is also imported by client code).
- `lib/config.ts` — **the only place that reads upstream/proxy/cron env vars.**
- `db/schema.ts` — single Drizzle schema; migrations are generated into `drizzle/` (commit them).
- `types.ts` — IME row types (`RawDataItem`, `AggregatedData`).
- `.claude/DESIGN.md` — the "Steep" visual system; follow it for any UI work (Tailwind tokens in `tailwind.config.ts`, utility classes like `field`, `artifact` in `app/globals.css`).

## Rules

1. **No hardcoded configuration.** URLs, proxy endpoints, schedules, keys and tunables go through `lib/config.ts` (`required()` / `optional()` helpers) and are documented in `.env.local.example` and the README env table. Static domain data (e.g. `lib/globalPricesMappings.ts`, commodity keywords in `lib/aggregate.ts`) is fine in code.
2. **Never read, print, commit or paste secret values** from `.env` / `.env.local`. When you need to show it, print key names only.
3. **All outbound calls to IME / ice.ir / dastyar.io must go through `config.proxyUrl`** (see `lib/ime.ts`, `lib/currency.ts`). Do not call those hosts directly.
4. **Schema changes:** edit `db/schema.ts` → `pnpm db:generate` → review the SQL → commit both. Don't use `db:push` against production.
5. **Persian is the UI language.** Keep user-facing strings in Persian, the page `dir="rtl"`, and dates Jalali (`jalaali-js`; weeks run Saturday→Friday, formatted `YYYY/MM/DD`). IME endpoints take the Jalali-formatted strings produced by `app/utils/dateUtils.ts`. Error messages in `lib/ime.ts` are Persian by design.
6. **Keep cron/server-only code out of the edge bundle.** `instrumentation.ts` must only dynamically import `instrumentation-node.ts` inside the `NEXT_RUNTIME === "nodejs"` branch. `pg` and `node-cron` are in `serverExternalPackages`.
7. **Snapshot jobs must stay failure-isolated:** each source in `captureSnapshot()` is wrapped in its own try/catch so one failing upstream doesn't block the others. Preserve that.
8. **Reuse, don't duplicate.** Aggregation logic lives in `lib/aggregate.ts` and is shared by the dashboard, cron and backfill. (Known duplication to fix rather than extend: see HANDOFF.md.)
9. **Auth:** `middleware.ts` only checks for the session *cookie* (edge-safe, no DB). If you add a sensitive route, validate the session server-side with `auth.api.getSession({ headers })` — don't rely on the middleware alone.
10. Match existing style: 4-space indent and double quotes in `lib/`, `db/` and API routes; 2-space and single quotes in most of `app/`. Follow the file you're editing.

## Domain notes (non-obvious)

- Commodity groups are derived by **keyword matching** on the Persian `GoodsName` (`GROUP_KEYWORDS` in `lib/aggregate.ts`; order matters — "تیرآهن بال پهن" must precede "تیرآهن"). Rows that fall into `"سایر"` are dropped.
- Money units: IME values are in **Rial**; dastyar.io returns **Toman** (multiplied ×10 in `lib/currency.ts`); global prices are **USD/mt**. Implied USD rate = `avgPrice(Rial/ton) ÷ globalPrice(USD/mt) × 1000`.
- Sheets (HRC/CRC/galvanized) are priced against the **free-market** dollar; everything else against the **Havaleh** (تالار اول) dollar. This mapping is duplicated in `DataTable.tsx` and `PremiumTracker.tsx`.
- `captureSnapshot()` replaces the current week's `ime_trade_snapshots` rows (delete → re-insert); completed weeks are written once and skipped thereafter.
- `SubCat` ids in the dashboard `<select>` are IME's own ids (0 = all). They are hardcoded in `app/page.tsx`.

## Before you finish a change

- `npx tsc --noEmit` passes (then `git checkout tsconfig.tsbuildinfo`).
- New env var? → `lib/config.ts`, `.env.local.example`, README table.
- New migration? → committed in `drizzle/`.
- Updated behaviour that a new developer would trip over? → add a line to HANDOFF.md.
