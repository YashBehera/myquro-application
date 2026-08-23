ALTER TABLE "table_session" ADD COLUMN "extras_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "table_session" ADD COLUMN "frozen_extras_total" integer;