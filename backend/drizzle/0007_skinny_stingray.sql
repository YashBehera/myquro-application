ALTER TABLE "auth_sessions" ADD COLUMN "token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_token_unique" UNIQUE("token");