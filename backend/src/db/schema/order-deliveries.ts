import { pgTable, text, timestamp, real, integer } from "drizzle-orm/pg-core";
import { orders } from "./orders.js";
import { deliveryRiders } from "./delivery-riders.js";

export const orderDeliveries = pgTable("order_deliveries", {
  id: text("id").notNull().primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  riderId: text("rider_id")
    .references(() => deliveryRiders.id, { onDelete: "set null" }),
  status: text("status")
    .notNull()
    .default("offered")
    .$type<"offered" | "assigned" | "arrived_at_store" | "picked_up" | "out_for_delivery" | "delivered">(),
  etaMinutes: integer("eta_minutes").notNull(),
  distanceKm: real("distance_km").default(0),
  deliveryFee: real("delivery_fee").default(0),
  currentLat: real("current_lat").notNull(),
  currentLng: real("current_lng").notNull(),
  startLat: real("start_lat"),
  startLng: real("start_lng"),
  customerLat: real("customer_lat").notNull(),
  customerLng: real("customer_lng").notNull(),
  restaurantLat: real("restaurant_lat").notNull(),
  restaurantLng: real("restaurant_lng").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
