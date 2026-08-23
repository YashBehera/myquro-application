CREATE TABLE "table_session" (
	"id" text PRIMARY KEY NOT NULL,
	"table_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"qr_token" text NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_qr_token_table_qr_qr_token_fk" FOREIGN KEY ("qr_token") REFERENCES "public"."table_qr"("qr_token") ON DELETE cascade ON UPDATE no action;