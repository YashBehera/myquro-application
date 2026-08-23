ALTER TABLE "offers" ALTER COLUMN "discount_percentage" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "discount_value" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "applicable_category_id" text;