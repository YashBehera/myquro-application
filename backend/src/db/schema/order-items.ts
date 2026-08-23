import { pgTable, text, timestamp, integer, real, index } from "drizzle-orm/pg-core";

import { orders } from "./orders.js";
import { menuItems } from "./menu-items.js";
import { menuItemVariants } from "./menu-item-variants.js";
import { tableSession } from "./table-session.js";
import { restaurants } from "./restaurants.js";


export const orderItems = pgTable("order_items", {
  id: text("id").notNull().primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: text("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  menuItemVariantId: text("menu_item_variant_id")
    .notNull()
    .references(() => menuItemVariants.id, { onDelete: "cascade" }),

  tableSessionId: text("table_session_id")
    .references(() => tableSession.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  notes: text("notes"),
  status: text("status")
    .notNull()
    .default("placed")
    .$type<"placed" | "preparing" | "served" | "cancelled">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    idx_order_items_order: index("idx_order_items_order").on(table.orderId),
    idx_order_items_session: index("idx_order_items_session").on(table.tableSessionId),
  };
});
