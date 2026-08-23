CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"reservation_time" timestamp NOT NULL,
	"number_of_guests" integer NOT NULL,
	"reserved_by" text NOT NULL,
	"reserved_at" timestamp DEFAULT now() NOT NULL,
	"special_requests" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_reserved_by_auth_users_id_fk" FOREIGN KEY ("reserved_by") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;