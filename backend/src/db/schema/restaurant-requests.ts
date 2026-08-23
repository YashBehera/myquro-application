// used for managing restaurant access requests by users

import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

import { authUsers } from "./auth-users.js";
import { restaurants } from "./restaurants.js";

export const restaurantRequests = pgTable(
  "restaurant_requests",
  {
    id: text("id").primaryKey(),

    // Who applied
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    // Which restaurant they applied for
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),

    // Request lifecycle
    requestStatus: text("request_status")
      .notNull()
      .default("PENDING")
      .$type<"PENDING" | "APPROVED" | "REJECTED">(),

    // Timestamps
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at"),

    // Admin who reviewed it
    reviewedByAdminId: text("reviewed_by_admin_id").references(
      () => authUsers.id
    ),

    // Admin notes on rejection / approval
    adminRemark: text("admin_remark"),
  },
  (table) => [
    // Fast lookups for admin panels
    index("restaurant_requests_user_idx").on(table.userId),
    index("restaurant_requests_restaurant_idx").on(table.restaurantId),
    index("restaurant_requests_status_idx").on(table.requestStatus),

    // Prevent multiple PENDING requests for same user
    index("restaurant_requests_unique_pending_idx").on(
      table.userId,
      table.requestStatus
    ),
  ]
);
