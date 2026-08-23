ALTER TABLE "table_session" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "table_session" ADD COLUMN "taxable_base" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "table_session" ADD COLUMN "gst_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "table_session" ADD COLUMN "gst_amount" integer DEFAULT 0 NOT NULL;