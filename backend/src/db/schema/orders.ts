import { pgTable, integer, text, timestamp, index } from "drizzle-orm/pg-core";

import { restaurants } from "./restaurants.js";
import { tableSession } from "./table-session.js";
import { tables } from "./tables.js";
import { authUsers } from "./auth-users.js";


export const orders = pgTable("orders", {
  id: text("id").notNull().primaryKey(),
  tableSessionId: text("table_session_id")
    .references(() => tableSession.id, { onDelete: "set null" }),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  tableId: text("table_id").references(() => tables.id, { onDelete: "set null" }),
  placedByUserId: text("placed_by_user_id").references(() => authUsers.id),
  notes: text("notes"),
  status: text("status")
    .notNull()
    .default("placed")
    .$type<"placed" | "preparing" | "ready" | "served" | "cancelled">(),
  subtotal: integer("subtotal"),
  discount: integer("discount"),
  gst: integer("gst"),
  grandTotal: integer("grand_total"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    idx_orders_restaurant_status_created: index("idx_orders_restaurant_status_created").on(table.restaurantId, table.status, table.createdAt),
    idx_orders_session: index("idx_orders_session").on(table.tableSessionId),
    idx_orders_table: index("idx_orders_table").on(table.tableId),
    idx_orders_created_at: index("idx_orders_created_at").on(table.createdAt),
  };
});
