import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";
import { tables } from "./tables.js";

export const tableQR = pgTable("table_qr", {
  id: text("id").notNull().primaryKey(),
  tableId: text("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  qrToken: text("qr_token").notNull().unique(),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
