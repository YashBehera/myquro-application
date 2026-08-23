import { pgTable, text, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";

export const operatingCities = pgTable("operating_cities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  state: text("state"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const operatingZones = pgTable("operating_zones", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  cityId: text("city_id").notNull().references(() => operatingCities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  distance: text("distance"),
  minGuarantee: text("min_guarantee"),
  weeklyEarnings: text("weekly_earnings"),
  isBestZone: boolean("is_best_zone").default(false),
  isOpen: boolean("is_open").default(true),
  noOpeningReason: text("no_opening_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
