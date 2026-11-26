import { pgTable, text, timestamp, real, index } from "drizzle-orm/pg-core";
import { deliveryRiders } from "./delivery-riders.js";
import { orders } from "./orders.js";

export type RiderCashTxnType = "cod_collected" | "change_returned" | "company_deposit";

export const riderFloatingCashTxns = pgTable(
  "rider_floating_cash_txns",
  {
    id: text("id").notNull().primaryKey(),
    riderId: text("rider_id")
      .notNull()
      .references(() => deliveryRiders.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    txnType: text("txn_type").notNull().$type<RiderCashTxnType>(),
    amount: real("amount").notNull(), // in Rupees (positive magnitude)
    customerPhone: text("customer_phone"),
    method: text("method"), // e.g. 'cod', 'upi', 'razorpay_upi', 'cash_hub'
    referenceId: text("reference_id"),
    status: text("status")
      .notNull()
      .default("completed")
      .$type<"pending" | "completed" | "failed">(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    idx_rider_cash_txns_rider: index("idx_rider_cash_txns_rider").on(table.riderId, table.createdAt),
    idx_rider_cash_txns_order: index("idx_rider_cash_txns_order").on(table.orderId),
  })
);
