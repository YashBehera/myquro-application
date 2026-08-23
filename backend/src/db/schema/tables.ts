import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";
import { reservations } from "./reservations.js";

export const tables = pgTable("tables", {
  id: text("id").notNull().primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  tableNumber: text("table_number").notNull(),
  capacity: integer("capacity").notNull(),

  liveStatus: text("live_status")
    .notNull()
    .default("available")
    .$type<"available" | "occupied" | "reserved">(),
  isActive: boolean("is_active").notNull().default(true),

  isReserved: boolean("is_reserved").notNull().default(false),
  reservationId: text("reservation_id")
    .references(() => reservations.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Make tableNumber unique per restaurant, not globally
  uniqueIndex("tables_unique_restaurant_table_number").on(
    table.restaurantId,
    table.tableNumber
  ),
  index("idx_tables_restaurant_status").on(table.restaurantId, table.liveStatus),
]);
