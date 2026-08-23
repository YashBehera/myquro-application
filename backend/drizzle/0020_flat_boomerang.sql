ALTER TABLE "auth_users" ALTER COLUMN "role" SET DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE "restaurants" DROP COLUMN "request_status";--> statement-breakpoint
ALTER TABLE "restaurants" DROP COLUMN "approved_at";--> statement-breakpoint
ALTER TABLE "restaurants" DROP COLUMN "rejected_at";