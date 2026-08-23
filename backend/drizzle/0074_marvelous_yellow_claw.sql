CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"owner_email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_company_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"invitation_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_company_invites" ADD CONSTRAINT "restaurant_company_invites_invitation_id_company_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."company_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_company_invites" ADD CONSTRAINT "restaurant_company_invites_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restaurant_invite_invitation_idx" ON "restaurant_company_invites" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "restaurant_invite_restaurant_idx" ON "restaurant_company_invites" USING btree ("restaurant_id");