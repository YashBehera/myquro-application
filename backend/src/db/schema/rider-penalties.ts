import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { deliveryRiders } from "./delivery-riders.js";
import { orders } from "./orders.js";

export type RiderPenaltyType =
  | "post_accept_cancellation"
  | "arrived_store_cancellation"
  | "repeated_offer_timeout"
  | "pickup_delay"
  | "delivery_delay"
  | "order_damage_or_missing"
  | "undelivered_order_complaint";

export const riderPenalties = pgTable(
  "rider_penalties",
  {
    id: text("id").notNull().primaryKey(),
    riderId: text("rider_id")
      .notNull()
      .references(() => deliveryRiders.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    complaintId: text("complaint_id"),
    penaltyType: text("penalty_type").notNull().$type<RiderPenaltyType>(),
    amount: integer("amount").notNull(), // in paise (e.g. 2500 = ₹25)
    cooldownMinutes: integer("cooldown_minutes").default(0).notNull(),
    status: text("status")
      .notNull()
      .default("deducted")
      .$type<"pending" | "deducted" | "waived" | "disputed">(),
    reason: text("reason").notNull(),
    disputeNotes: text("dispute_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => ({
    idx_rider_penalties_rider: index("idx_rider_penalties_rider").on(table.riderId, table.createdAt),
    idx_rider_penalties_order: index("idx_rider_penalties_order").on(table.orderId),
  })
);
