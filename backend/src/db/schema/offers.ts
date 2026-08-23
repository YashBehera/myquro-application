import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { restaurants } from "./restaurants.js";
import { authUsers } from "./auth-users.js";

export const offers = pgTable("offers", {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    discountPercentage: integer("discount_percentage"), // deprecated, use discountValue Instead
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(true), // deprecated, we dynamically calculate based on dates
    code: text("code").notNull(),
    restaurantId: text("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: text("created_by").references(() => authUsers.id, { onDelete: "cascade" }),

    // Offer Details
    offerType: text("offer_type").default("percentage").notNull(), // 'percentage', 'flat_discount', 'buy_1_get_1', 'category_discount'
    discountValue: integer("discount_value").default(0), // numerical discount value (either percentage amount or flat amount in paise)
    applicableCategoryId: text("applicable_category_id"), // mapping to menu_categories.id for 'category_discount'

    // Advanced loyalty-related fields
    targetAudience: text("target_audience").default("all").notNull(), // 'all', 'bronze', 'silver', 'gold', 'platinum', 'new_customers', 'repeat_customers'
    minLoyaltyTier: text("min_loyalty_tier"), // minimum tier required: 'bronze', 'silver', 'gold', 'platinum'
    pointsCost: integer("points_cost").default(0), // points required to redeem (0 = free offer)
    maxRedemptionsPerUser: integer("max_redemptions_per_user").default(1), // how many times one user can use this
    totalRedemptionsAllowed: integer("total_redemptions_allowed"), // total uses across all users (null = unlimited)
    currentRedemptionsCount: integer("current_redemptions_count").default(0), // track total uses
    showInCheckout: boolean("show_in_checkout").default(true), // show in session checkout
    minOrderValue: integer("min_order_value").default(0), // minimum order value in paise
    maxDiscountAmount: integer("max_discount_amount"), // max discount cap in paise
    freeItemId: text("free_item_id"), // menu item ID for free item offers

    // Super Admin / Company-wide Targeting
    scope: text("scope").default("restaurant").notNull(), // 'restaurant', 'company'
    targetType: text("target_type").default("specific").notNull(), // 'all', 'category', 'specific'
    targetCategory: text("target_category"), // matches restaurantType (e.g., 'cafe', 'restaurant')
    targetRestaurantIds: text("target_restaurant_ids").array().notNull().default(sql`'{}'::text[]`),
});