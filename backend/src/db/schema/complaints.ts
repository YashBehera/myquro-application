import { pgTable, text, timestamp, integer, numeric, jsonb, index } from "drizzle-orm/pg-core";

export const complaints = pgTable("complaints", {
  id: text("id").notNull().primaryKey(),
  ticketType: text("ticket_type").notNull().default("order_complaint"), // 'order_complaint' | 'rider_issue' | 'merchant_issue'
  orderId: text("order_id"),
  orderNumber: text("order_number"),
  customerId: text("customer_id"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerAvatar: text("customer_avatar"),
  outletId: text("outlet_id"),
  outletName: text("outlet_name"),
  riderId: text("rider_id"),
  orderDate: timestamp("order_date", { withTimezone: true }),
  category: text("category").notNull(),
  categoryLabel: text("category_label"),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  relatedItem: text("related_item"),
  orderAmount: numeric("order_amount").default("0"),
  priority: text("priority").notNull().default("MEDIUM"),
  status: text("status").notNull().default("OPEN"),
  evidence: jsonb("evidence").default([]),
  messages: jsonb("messages").default([]),
  resolution: jsonb("resolution"),
  refundStatus: text("refund_status").default("NOT_REQUESTED"),
  auditLogs: jsonb("audit_logs").default([]),
  responseSlaMinutes: integer("response_sla_minutes").default(30),
  metadata: jsonb("metadata").default({}),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    idx_complaints_outlet_id: index("idx_complaints_outlet_id").on(table.outletId),
    idx_complaints_customer_id: index("idx_complaints_customer_id").on(table.customerId),
    idx_complaints_rider_id: index("idx_complaints_rider_id").on(table.riderId),
    idx_complaints_order_id: index("idx_complaints_order_id").on(table.orderId),
    idx_complaints_status: index("idx_complaints_status").on(table.status),
  };
});
