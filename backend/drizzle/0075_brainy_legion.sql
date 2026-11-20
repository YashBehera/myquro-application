CREATE TABLE "favourites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address_line" text NOT NULL,
	"city" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_riders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"wallet_balance" real DEFAULT 0,
	"pending_settlement" real DEFAULT 0,
	"total_earnings" real DEFAULT 0,
	"rating" real DEFAULT 0,
	"total_ratings" integer DEFAULT 0,
	"total_deliveries" integer DEFAULT 0,
	"acceptance_count" integer DEFAULT 0,
	"rejection_count" integer DEFAULT 0,
	"kyc_status" text DEFAULT 'pending',
	"bank_account_status" text DEFAULT 'pending',
	"city_id" text,
	"zone_id" text,
	"vehicle_type" text,
	"vehicle_number" text,
	"order_type" text,
	"selfie_url" text,
	"aadhaar_number" text,
	"pan_number" text,
	"bank_account" text,
	"bank_ifsc" text,
	"bank_holder_name" text,
	"bank_name" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relationship" text,
	"joining_fee_paid" boolean DEFAULT false,
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"rider_id" text,
	"status" text DEFAULT 'offered' NOT NULL,
	"eta_minutes" integer NOT NULL,
	"distance_km" real DEFAULT 0,
	"delivery_fee" real DEFAULT 0,
	"current_lat" real NOT NULL,
	"current_lng" real NOT NULL,
	"start_lat" real,
	"start_lng" real,
	"customer_lat" real NOT NULL,
	"customer_lng" real NOT NULL,
	"restaurant_lat" real NOT NULL,
	"restaurant_lng" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"sender" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operating_cities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operating_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"city_id" text NOT NULL,
	"name" text NOT NULL,
	"distance" text,
	"min_guarantee" text,
	"weekly_earnings" text,
	"is_best_zone" boolean DEFAULT false,
	"is_open" boolean DEFAULT true,
	"no_opening_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_penalties" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"order_id" text,
	"penalty_type" text NOT NULL,
	"amount" integer NOT NULL,
	"rider_compensation_amount" integer DEFAULT 0 NOT NULL,
	"customer_voucher_amount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"dispute_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "table_session" DROP CONSTRAINT "table_session_table_id_tables_id_fk";
--> statement-breakpoint
ALTER TABLE "table_session" DROP CONSTRAINT "table_session_qr_token_table_qr_qr_token_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_table_session_id_table_session_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_table_id_tables_id_fk";
--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "auto_accept_orders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "auto_paused_until" timestamp;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "strike_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "is_busy_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "snoozed_until" timestamp;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "snooze_reason" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "last_heartbeat_at" timestamp;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "default_prep_time_minutes" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "paused_until" timestamp;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "pause_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "acknowledged_by_merchant" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "acknowledged_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "prep_time_minutes" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "extended_prep_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "handover_otp" text;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD COLUMN "generated_password" text;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_addresses" ADD CONSTRAINT "delivery_addresses_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_deliveries" ADD CONSTRAINT "order_deliveries_rider_id_delivery_riders_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."delivery_riders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operating_zones" ADD CONSTRAINT "operating_zones_city_id_operating_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."operating_cities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_penalties" ADD CONSTRAINT "merchant_penalties_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_penalties" ADD CONSTRAINT "merchant_penalties_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_messages_order_created" ON "chat_messages" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_merchant_penalties_restaurant" ON "merchant_penalties" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_merchant_penalties_order" ON "merchant_penalties" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_qr_token_table_qr_qr_token_fk" FOREIGN KEY ("qr_token") REFERENCES "public"."table_qr"("qr_token") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_session_id_table_session_id_fk" FOREIGN KEY ("table_session_id") REFERENCES "public"."table_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;