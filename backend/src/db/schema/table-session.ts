import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";
import { authUsers } from "./auth-users.js";
import { tables } from "./tables.js";
import { tableQR } from "./table-qr.js";

export const tableSession = pgTable("table_session", {
  id: text("id").notNull().primaryKey(),

  tableId: text("table_id").references(() => tables.id, { onDelete: "set null" }),

  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  qrToken: text("qr_token").references(() => tableQR.qrToken, { onDelete: "set null" }),

  // ---------------------------------------
  // SESSION STATUS
  // ---------------------------------------
  status: text("status")
    .notNull()
    .default("active")
    .$type<"active" | "closed" | "cancelled" | "payment_pending">(),

  paymentStatus: text("payment_status")
    .notNull()
    .default("unpaid")
    .$type<"unpaid" | "paid" | "partial" | "payment_pending">(),

  createdByUserId: text("created_by_user_id").references(() => authUsers.id),

  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),

  // ---------------------------------------
  // DISCOUNT (ALL VALUES IN PAISE LOGIC)
  // ---------------------------------------
  discountPercentage: integer("discount_percentage").default(0), // 0–100%
  discountReason: text("discount_reason"),
  discountApprovedByUserId: text("discount_approved_by_user_id").references(
    () => authUsers.id
  ),
  discountApprovedAt: timestamp("discount_approved_at"),

  // ---------------------------------------
  // MONEY FIELDS (ALL VALUES IN PAISE)
  // ---------------------------------------
  subtotal: integer("subtotal").notNull().default(0), // paise - includes base items + extras
  extrasTotal: integer("extras_total").notNull().default(0), // paise - total extras cost
  discountAmount: integer("discount_amount").notNull().default(0), // paise
  taxableBase: integer("taxable_base").notNull().default(0), // paise - subtotal - discount
  gstRate: integer("gst_rate").notNull().default(0), // integer percent (fetched from restaurant.defaultGstPercentage)
  gstAmount: integer("gst_amount").notNull().default(0), // paise - calculated as taxableBase * gstRate / 100
  grandTotal: integer("grand_total").notNull().default(0), // paise - taxableBase + gstAmount

  // ---------------------------------------
  // FROZEN BILL SNAPSHOT (PAISE) - Created ONLY when bill is frozen
  // ---------------------------------------

  frozenSubtotal: integer("frozen_subtotal"), // paise
  frozenExtrasTotal: integer("frozen_extras_total"), // paise
  frozenDiscountAmount: integer("frozen_discount_amount"), // paise
  frozenTaxableAmount: integer("frozen_taxable_amount"), // paise
  frozenGstRate: integer("frozen_gst_rate"), // integer percent
  frozenGstAmount: integer("frozen_gst_amount"), // paise

  finalBillAmount: integer("final_bill_amount"), // paise (grand total)
  finalAmount: integer("final_amount"), // paise (final amount after discount)
  billedAt: timestamp("billed_at"), // timestamp of freeze

  invoiceNumber: text("invoice_number"),
}, (table) => {
  return {
    idx_sessions_restaurant_billed: index("idx_sessions_restaurant_billed").on(table.restaurantId, table.billedAt),
    idx_sessions_status_payment: index("idx_sessions_status_payment").on(table.status, table.paymentStatus),
    idx_sessions_restaurant_status: index("idx_sessions_restaurant_status").on(table.restaurantId, table.status),
    idx_sessions_table: index("idx_sessions_table").on(table.tableId),
    // Optimization for past-sessions query
    idx_sessions_past: index("idx_sessions_past").on(table.restaurantId, table.status, table.paymentStatus, table.billedAt),
  };
});
