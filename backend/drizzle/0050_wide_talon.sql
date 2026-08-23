CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"restaurant_id" text,
	"created_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;