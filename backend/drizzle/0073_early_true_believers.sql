ALTER TABLE "offers" ADD COLUMN "scope" text DEFAULT 'restaurant' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "target_type" text DEFAULT 'specific' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "target_category" text;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "target_restaurant_ids" text[] DEFAULT '{}'::text[] NOT NULL;