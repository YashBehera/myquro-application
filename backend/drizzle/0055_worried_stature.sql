ALTER TABLE "table_session" ALTER COLUMN "table_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "table_session" ALTER COLUMN "qr_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "table_id" DROP NOT NULL;