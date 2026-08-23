CREATE TABLE "customer_loyalty" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"total_visits" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"tier" text DEFAULT 'bronze' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_loyalty_user_restaurant_unique" UNIQUE("user_id","restaurant_id")
);
--> statement-breakpoint
CREATE TABLE "customer_vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"voucher_type" text NOT NULL,
	"discount_value" integer NOT NULL,
	"min_order_value" integer DEFAULT 0,
	"max_discount" integer,
	"free_item_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"used_at" timestamp,
	"used_in_session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "session_discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_source_id" text,
	"discount_name" text NOT NULL,
	"discount_value" integer NOT NULL,
	"applied_by_user_id" text,
	"applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_loyalty" ADD CONSTRAINT "customer_loyalty_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_vouchers" ADD CONSTRAINT "customer_vouchers_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_vouchers" ADD CONSTRAINT "customer_vouchers_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_discounts" ADD CONSTRAINT "session_discounts_session_id_table_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_session"("id") ON DELETE cascade ON UPDATE no action;