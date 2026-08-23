ALTER TABLE "table_session" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "table_session" ADD COLUMN "payment_status" text DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "table_session" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;