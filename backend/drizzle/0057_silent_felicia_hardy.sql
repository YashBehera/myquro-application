ALTER TABLE "orders" ALTER COLUMN "table_session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "table_session_id" DROP NOT NULL;