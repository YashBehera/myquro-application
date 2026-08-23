ALTER TABLE "auth_accounts" ADD COLUMN "account_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_account_id_unique" UNIQUE("account_id");