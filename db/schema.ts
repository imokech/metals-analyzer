import {
    pgTable, serial, varchar, real, timestamp, boolean, text, integer,
    smallint, bigserial, doublePrecision, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
/* ------------------------------------------------------------------ */
/* Better-auth core tables                                             */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Domain tables                                                       */
/* ------------------------------------------------------------------ */

export const globalPrices = pgTable("global_prices", {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    globalName: varchar("global_name", { length: 100 }).notNull(),
    localLabel: varchar("local_label", { length: 100 }).notNull(),
    price: real("price"),
    sourceUrl: varchar("source_url", { length: 255 }).notNull(),
    lastFetchedAt: timestamp("last_fetched_at"),
    manuallyUpdated: boolean("manually_updated").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type GlobalPrice = typeof globalPrices.$inferSelect;
export type NewGlobalPrice = typeof globalPrices.$inferInsert;

/* ------------------------------------------------------------------ */
/* Historical snapshots (fed by the node-cron job + backfill)          */
/* ------------------------------------------------------------------ */

// USD rates over time (havaleh = تالار اول, azad = بازار آزاد), in Rial.
export const currencySnapshots = pgTable("currency_snapshots", {
    id: serial("id").primaryKey(),
    havaleh: real("havaleh"),
    azad: real("azad"),
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

// Global metal price per slug over time (USD/mt).
export const globalPriceSnapshots = pgTable("global_price_snapshots", {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 50 }).notNull(),
    price: real("price"),
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

// Aggregated IME trade stats, one row per commodity group per week.
export const imeTradeSnapshots = pgTable("ime_trade_snapshots", {
    id: serial("id").primaryKey(),
    weekLabel: varchar("week_label", { length: 120 }).notNull(),
    fromDate: varchar("from_date", { length: 10 }).notNull(),
    toDate: varchar("to_date", { length: 10 }).notNull(),
    subCat: integer("sub_cat").default(0).notNull(),
    groupName: varchar("group_name", { length: 100 }).notNull(),
    totalQuantity: real("total_quantity").default(0).notNull(),
    totalSupply: real("total_supply").default(0).notNull(),
    totalValue: real("total_value").default(0).notNull(),
    averagePrice: real("average_price").default(0).notNull(),
    volumeToSupplyRatio: real("volume_to_supply_ratio").default(0).notNull(),
    priceToBasePriceRatio: real("price_to_base_price_ratio").default(0).notNull(),
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

export type CurrencySnapshot = typeof currencySnapshots.$inferSelect;
export type GlobalPriceSnapshot = typeof globalPriceSnapshots.$inferSelect;
export type ImeTradeSnapshot = typeof imeTradeSnapshots.$inferSelect;

/* ------------------------------------------------------------------ */
/* Raw IME trade history (fed by scripts/history-sync.ts)              */
/* ------------------------------------------------------------------ */

// One row per (cat, 7-day block). Doubles as the sync work queue.
export const imeSyncWindows = pgTable(
    "ime_sync_windows",
    {
        id: serial("id").primaryKey(),
        cat: smallint("cat").notNull(),
        fromJdate: varchar("from_jdate", { length: 10 }).notNull(),
        toJdate: varchar("to_jdate", { length: 10 }).notNull(),
        status: varchar("status", { length: 10 }).default("pending").notNull(), // pending | ok | empty | failed
        attempts: integer("attempts").default(0).notNull(),
        nextTryAt: timestamp("next_try_at"),
        lastError: text("last_error"),
        rowCount: integer("row_count"),
        sumQuantity: doublePrecision("sum_quantity"),
        sumTotalPrice: doublePrecision("sum_total_price"),
        checksum: varchar("checksum", { length: 64 }),
        fetchedAt: timestamp("fetched_at"),
    },
    (t) => ({
        uq: uniqueIndex("ime_sync_windows_uq").on(t.cat, t.fromJdate, t.toJdate),
    })
);

// Every raw row returned by IME, unaggregated. `raw` keeps the full original object.
export const imeTrades = pgTable(
    "ime_trades",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        windowId: integer("window_id")
            .notNull()
            .references(() => imeSyncWindows.id, { onDelete: "cascade" }),
        cat: smallint("cat").notNull(),
        subCat: integer("sub_cat"),
        jdate: varchar("jdate", { length: 10 }).notNull(),
        jmonth: varchar("jmonth", { length: 7 }).notNull(),
        goodsName: text("goods_name").notNull(),
        producerName: text("producer_name"),
        contractType: text("contract_type"),
        tasvieh: text("tasvieh"),
        packetName: text("packet_name"),
        broker: text("broker"),
        basePrice: doublePrecision("base_price"),
        price: doublePrecision("price"),
        minPrice: doublePrecision("min_price"),
        maxPrice: doublePrecision("max_price"),
        arze: doublePrecision("arze"),
        taghaza: doublePrecision("taghaza"),
        quantity: doublePrecision("quantity").notNull(),
        totalPrice: doublePrecision("total_price").notNull(),
        arzehPk: text("arzeh_pk"),
        talarPk: integer("talar_pk"),
        raw: jsonb("raw").notNull(),
    },
    (t) => ({
        dateIdx: index("ime_trades_date_idx").on(t.cat, t.jdate),
        goodsIdx: index("ime_trades_goods_idx").on(t.cat, t.goodsName, t.jdate),
        windowIdx: index("ime_trades_window_idx").on(t.windowId),
    })
);

export type ImeSyncWindow = typeof imeSyncWindows.$inferSelect;
export type ImeTrade = typeof imeTrades.$inferSelect;