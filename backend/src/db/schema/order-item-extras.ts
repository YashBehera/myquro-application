import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { orderItems } from "./order-items.js";
import { menuExtras } from "./menu-extras.js";

export const orderItemExtras = pgTable("order_item_extras", {
  id: text("id").notNull().primaryKey(),
  orderItemId: text("order_item_id")
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),

  extraId: text("extra_id")
    .notNull()
    .references(() => menuExtras.id, { onDelete: "cascade" }),

  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(), // Price at time of order
  totalPrice: integer("total_price").notNull(), // quantity * unitPrice

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    idx_order_extras_item: index("idx_order_extras_item").on(table.orderItemId),
  };
});