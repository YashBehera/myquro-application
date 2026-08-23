import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

import { tableSession } from "./table-session.js";
import { restaurants } from "./restaurants.js";
import { authUsers } from "./auth-users.js";


export const payments = pgTable("payments", {
  id: text("id").notNull().primaryKey(),

  // ✅ ALWAYS FK TO table_session PRIMARY KEY
  tableSessionId: text("table_session_id")
    .notNull()
    .references(() => tableSession.id, { onDelete: "cascade" }),

  // ✅ FK DIRECTLY TO restaurants PRIMARY KEY (NOT via table_session)
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  // ✅ SAFE MONEY (Rupees with exact precision)
  amount: integer("amount").notNull(),

  // ✅ DISCOUNT SUPPORT
  originalAmount: integer("original_amount"),
  discountType: text("discount_type").$type<"percentage" | "fixed">(),
  discountValue: integer("discount_value"),

  // ✅ FINAL AMOUNT AFTER DISCOUNT
  finalAmount: integer("final_amount"),

  // ✅ CONTROLLED PAYMENT METHOD
  method: text("method")
    .notNull()
    .$type<"cash" | "upi" | "card" | "bank" | "gateway">(),

  // ✅ PAYMENT STATE (NOT A BOOLEAN)
  status: text("status")
    .notNull()
    .$type<"pending" | "success" | "failed" | "refunded">(),

  // ✅ UPI / Gateway / Manual Reference
  referenceNumber: text("reference_number"),

  paidByUserId: text("paid_by_user_id").references(() => authUsers.id),

  // ✅ REFUND SUPPORT FOR LATER
  isRefund: boolean("is_refund").default(false),

  // ✅ PROPER TIME TRACKING
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    idx_payments_restaurant_status_created: index("idx_payments_restaurant_status_created").on(table.restaurantId, table.status, table.createdAt),
    idx_payments_session: index("idx_payments_session").on(table.tableSessionId),
    idx_payments_method: index("idx_payments_method").on(table.method),
    idx_payments_restaurant_date: index("idx_payments_restaurant_date").on(table.restaurantId, table.createdAt),
  };
});
