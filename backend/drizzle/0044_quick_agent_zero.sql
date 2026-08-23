CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"details" text,
	CONSTRAINT "admin_audit_logs_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_auth_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;