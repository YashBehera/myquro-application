ALTER TABLE "offers" ADD COLUMN "target_audience" text DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "min_loyalty_tier" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "points_cost" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "max_redemptions_per_user" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "total_redemptions_allowed" integer;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "current_redemptions_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "show_in_checkout" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "min_order_value" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "max_discount_amount" integer;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "offer_type" text DEFAULT 'percentage' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "free_item_id" text;