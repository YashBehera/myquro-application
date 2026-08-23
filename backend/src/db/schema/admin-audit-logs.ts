import { pgTable, text, timestamp, jsonb, check } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";
import { sql } from "drizzle-orm";

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey().notNull(),
    adminUserId: text("admin_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    action: text("action")
      .notNull()
      .$type<
        | "SUSPEND_RESTAURANT"
        | "UNSUSPEND_RESTAURANT"
        | "VIEW_RESTAURANTS"
        | "SUSPEND_USER"
        | "UNSUSPEND_USER"
        | "VIEW_FLAGGED_SUBSCRIPTIONS"
        | "UPDATE_RESTAURANT"
        | "APPROVE_RESTAURANT"
        | "REJECT_RESTAURANT"
      >(),

    targetType: text("target_type").notNull(),
    targetId: text("target_id"),

    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    timestamp: timestamp("timestamp").notNull().defaultNow(),

    details: text("details"),
  },
  (table) => [
    check(
      "admin_audit_action_check",
      sql`${table.action} IN (
        'SUSPEND_RESTAURANT',
        'UNSUSPEND_RESTAURANT',
        'VIEW_RESTAURANTS',
        'SUSPEND_USER',
        'UNSUSPEND_USER',
        'VIEW_FLAGGED_SUBSCRIPTIONS',
        'UPDATE_RESTAURANT',
        'APPROVE_RESTAURANT',
        'REJECT_RESTAURANT'
      )`
    ),
  ]
);
