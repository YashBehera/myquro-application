ALTER TABLE "menu_item_variants" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item_variants" DROP COLUMN "createdAt";