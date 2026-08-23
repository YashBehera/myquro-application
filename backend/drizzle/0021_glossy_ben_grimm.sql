ALTER TABLE "restaurants" ALTER COLUMN "rating" SET DATA TYPE numeric(2, 1);--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "rating" SET DEFAULT 0.00;--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "rating" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "is_open" boolean DEFAULT false NOT NULL;