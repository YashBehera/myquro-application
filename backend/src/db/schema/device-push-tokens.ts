import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";

export const devicePushTokens = pgTable(
  "device_push_tokens",
  {
    id: text("id").notNull().primaryKey(),
    token: text("token").notNull().unique(),
    appType: text("app_type")
      .notNull()
      .$type<"customer" | "merchant" | "rider">(),
    platform: text("platform").notNull().default("android"),
    userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id"),
    riderId: text("rider_id"),
    deviceId: text("device_id"),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_device_push_tokens_app_user").on(table.appType, table.userId),
    index("idx_device_push_tokens_app_restaurant").on(table.appType, table.restaurantId),
    index("idx_device_push_tokens_app_rider").on(table.appType, table.riderId),
  ]
);
