import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";
import { orders } from "./orders.js";

export const merchantPenalties = pgTable("merchant_penalties", {
  id: text("id").notNull().primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  orderId: text("order_id")
    .references(() => orders.id, { onDelete: "set null" }),
  penaltyType: text("penalty_type")
    .notNull()
    .$type<"unresponsive_cancellation" | "rider_wait_delay" | "late_merchant_cancellation" | "out_of_stock_cancellation" | "rush_cancellation">(),
  amount: integer("amount").notNull(), // amount in paise / cents (e.g. 5000 = ₹50)
  riderCompensationAmount: integer("rider_compensation_amount").default(0).notNull(),
  customerVoucherAmount: integer("customer_voucher_amount").default(0).notNull(),
  status: text("status")
    .notNull()
    .default("pending")
    .$type<"pending" | "deducted" | "waived" | "disputed">(),
  reason: text("reason").notNull(),
  disputeNotes: text("dispute_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => {
  return {
    idx_merchant_penalties_restaurant: index("idx_merchant_penalties_restaurant").on(table.restaurantId, table.createdAt),
    idx_merchant_penalties_order: index("idx_merchant_penalties_order").on(table.orderId),
  };
});
