import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { authUsers } from "./auth-users.js";
import { restaurantManagers } from "./restaurant-managers.js";
import { restaurants } from "./restaurants.js";

import { sql } from "drizzle-orm";

export const staffInvites = pgTable("staff_invites", {
  id: text("id").notNull().primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  user_id: text("user_id").references(() => authUsers.id, {
    onDelete: "cascade",
  }),

  invitedByManagerId: text("invited_by_manager_id")
    .notNull()
    .references(() => restaurantManagers.id, { onDelete: "cascade" }),

  invitedEmail: text("invited_email").notNull(),
  role: text("role").notNull(),
  inviteToken: text("invite_token").notNull().unique(),

  inviteStatus: text("invite_status")
    .notNull()
    .default("PENDING")
    .$type<"PENDING" | "ACCEPTED" | "REJECTED">(),

  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at").notNull(),
});
