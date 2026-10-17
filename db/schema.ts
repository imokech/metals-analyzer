import { pgTable, serial, varchar, real, timestamp, boolean, text, integer } from "drizzle-orm/pg-core";

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
