CREATE TABLE "staff_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"user_id" text,
	"invited_by_manager_id" text NOT NULL,
	"invited_email" text NOT NULL,
	"role" text NOT NULL,
	"invite_token" text NOT NULL,
	"invite_status" text DEFAULT 'PENDING' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "staff_invites_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_invited_by_manager_id_restaurant_managers_id_fk" FOREIGN KEY ("invited_by_manager_id") REFERENCES "public"."restaurant_managers"("id") ON DELETE cascade ON UPDATE no action;