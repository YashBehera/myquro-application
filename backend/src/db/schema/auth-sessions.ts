import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";

export const authSessions = pgTable("auth_sessions", {
  id: text("id").primaryKey(),

  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),

  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
