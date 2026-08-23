// used for managing restaurant managers and their roles

import {
  pgTable,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth-users.js";
import { restaurants } from "./restaurants.js";

export const restaurantManagers = pgTable(
  "restaurant_managers",
  {
    id: text("id").primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),

    // ✅ Restaurant-scoped permission (owner, manager, staff, kitchen)
    role: text("role").notNull().$type<"owner" | "manager" | "staff" | "kitchen">(),

    // ✅ Lifecycle control for staff & managers
    status: text("status")
      .notNull()
      .default("active")
      .$type<"active" | "invited" | "suspended">(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("restaurant_managers_user_idx").on(table.userId),
    index("restaurant_managers_restaurant_idx").on(table.restaurantId),
    index("restaurant_managers_role_idx").on(table.role),

    // Prevent duplicate assignments to same restaurant
    uniqueIndex("restaurant_managers_unique_user_restaurant").on(
      table.userId,
      table.restaurantId
    ),
  ]
);
