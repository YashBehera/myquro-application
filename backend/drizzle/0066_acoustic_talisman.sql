ALTER TABLE "table_session" ADD COLUMN "final_amount" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "original_amount" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "discount_type" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "discount_value" integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "final_amount" integer;