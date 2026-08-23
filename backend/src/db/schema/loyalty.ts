import { pgTable, text, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";
import { restaurants } from "./restaurants.js";
import { tableSession } from "./table-session.js";

// Customer Loyalty Tracking
export const customerLoyalty = pgTable("customer_loyalty", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  points: integer("points").default(0).notNull(),
  totalVisits: integer("total_visits").default(0).notNull(),
  totalSpent: integer("total_spent").default(0).notNull(), // in paise
  tier: text("tier").default("bronze").notNull(), // bronze, silver, gold, platinum
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userRestaurantUnique: unique("customer_loyalty_user_restaurant_unique").on(table.userId, table.restaurantId)
}));

// Customer Vouchers/Rewards
export const customerVouchers = pgTable("customer_vouchers", {
  id: text("id").primaryKey().notNull(),
  code: text("code").notNull().unique(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  voucherType: text("voucher_type").notNull(), // 'percentage', 'fixed_amount', 'free_item'
  discountValue: integer("discount_value").notNull(), // percentage (0-100) or amount in paise
  minOrderValue: integer("min_order_value").default(0), // minimum order value in paise
  maxDiscount: integer("max_discount"), // max discount cap in paise (for percentage vouchers)
  freeItemId: text("free_item_id"), // menu item ID for free item vouchers
  status: text("status").default("active").notNull(), // active, used, expired
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  usedInSessionId: text("used_in_session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Session Discounts (track all discounts applied to a session)
export const sessionDiscounts = pgTable("session_discounts", {
  id: text("id").primaryKey().notNull(),
  sessionId: text("session_id").notNull().references(() => tableSession.id, { onDelete: "cascade" }),
  discountType: text("discount_type").notNull(), // 'offer', 'voucher', 'manual', 'loyalty'
  discountSourceId: text("discount_source_id"), // offer_id or voucher_id
  discountName: text("discount_name").notNull(),
  discountValue: integer("discount_value").notNull(), // actual discount applied in paise
  appliedByUserId: text("applied_by_user_id"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});
