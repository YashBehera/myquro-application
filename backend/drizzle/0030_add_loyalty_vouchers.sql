-- Loyalty System Tables
-- Tracks customer loyalty points, visits, and tier status

CREATE TABLE IF NOT EXISTS "customer_loyalty" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "points" INTEGER DEFAULT 0 NOT NULL,
  "total_visits" INTEGER DEFAULT 0 NOT NULL,
  "total_spent" INTEGER DEFAULT 0 NOT NULL, -- in paise
  "tier" TEXT DEFAULT 'bronze' NOT NULL, -- bronze, silver, gold, platinum
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT "customer_loyalty_user_restaurant_unique" UNIQUE("user_id", "restaurant_id")
);

-- Vouchers/Rewards that customers earn
CREATE TABLE IF NOT EXISTS "customer_vouchers" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "user_id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "voucher_type" TEXT NOT NULL, -- 'percentage', 'fixed_amount', 'free_item'
  "discount_value" INTEGER NOT NULL, -- percentage (0-100) or amount in paise
  "min_order_value" INTEGER DEFAULT 0, -- minimum order value in paise
  "max_discount" INTEGER, -- max discount cap in paise (for percentage vouchers)
  "free_item_id" TEXT, -- menu item ID for free item vouchers
  "status" TEXT DEFAULT 'active' NOT NULL, -- active, used, expired
  "issued_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "expires_at" TIMESTAMP,
  "used_at" TIMESTAMP,
  "used_in_session_id" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Track offer/voucher redemptions in sessions
CREATE TABLE IF NOT EXISTS "session_discounts" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "session_id" TEXT NOT NULL,
  "discount_type" TEXT NOT NULL, -- 'offer', 'voucher', 'manual', 'loyalty'
  "discount_source_id" TEXT, -- offer_id or voucher_id
  "discount_name" TEXT NOT NULL,
  "discount_value" INTEGER NOT NULL, -- actual discount applied in paise
  "applied_by_user_id" TEXT,
  "applied_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Enhanced offers table (add new columns to existing offers)
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "target_audience" TEXT DEFAULT 'all'; -- all, new_customers, loyalty_tier
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "min_loyalty_tier" TEXT; -- bronze, silver, gold, platinum
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "points_cost" INTEGER DEFAULT 0; -- loyalty points required to redeem
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "max_redemptions_per_user" INTEGER; -- limit per customer
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "show_in_checkout" BOOLEAN DEFAULT TRUE; -- show during checkout

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_customer_loyalty_user" ON "customer_loyalty"("user_id");
CREATE INDEX IF NOT EXISTS "idx_customer_loyalty_restaurant" ON "customer_loyalty"("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_vouchers_user" ON "customer_vouchers"("user_id");
CREATE INDEX IF NOT EXISTS "idx_vouchers_restaurant" ON "customer_vouchers"("restaurant_id");
CREATE INDEX IF NOT EXISTS "idx_vouchers_code" ON "customer_vouchers"("code");
CREATE INDEX IF NOT EXISTS "idx_vouchers_status" ON "customer_vouchers"("status");
CREATE INDEX IF NOT EXISTS "idx_session_discounts_session" ON "session_discounts"("session_id");

-- Foreign key constraints
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_user_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_restaurant_fkey" 
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;

ALTER TABLE "customer_vouchers" ADD CONSTRAINT "customer_vouchers_user_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "customer_vouchers" ADD CONSTRAINT "customer_vouchers_restaurant_fkey" 
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE;

ALTER TABLE "session_discounts" ADD CONSTRAINT "session_discounts_session_fkey" 
  FOREIGN KEY ("session_id") REFERENCES "table_session"("id") ON DELETE CASCADE;
