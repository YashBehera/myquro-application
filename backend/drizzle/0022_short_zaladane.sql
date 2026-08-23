CREATE TABLE "restaurant_managers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"request_status" text DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_admin_id" text,
	"admin_remark" text
);
--> statement-breakpoint
ALTER TABLE "restaurant_managers" ADD CONSTRAINT "restaurant_managers_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_managers" ADD CONSTRAINT "restaurant_managers_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_requests" ADD CONSTRAINT "restaurant_requests_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_requests" ADD CONSTRAINT "restaurant_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_requests" ADD CONSTRAINT "restaurant_requests_reviewed_by_admin_id_auth_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."auth_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restaurant_managers_user_idx" ON "restaurant_managers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "restaurant_managers_restaurant_idx" ON "restaurant_managers" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_managers_role_idx" ON "restaurant_managers" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_managers_unique_user_restaurant" ON "restaurant_managers" USING btree ("user_id","restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_requests_user_idx" ON "restaurant_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "restaurant_requests_restaurant_idx" ON "restaurant_requests" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_requests_status_idx" ON "restaurant_requests" USING btree ("request_status");--> statement-breakpoint
CREATE INDEX "restaurant_requests_unique_pending_idx" ON "restaurant_requests" USING btree ("user_id","request_status");