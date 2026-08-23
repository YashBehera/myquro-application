ALTER TABLE "tables" DROP CONSTRAINT "tables_table_number_unique";--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "phone_number" SET DATA TYPE text;--> statement-breakpoint
CREATE UNIQUE INDEX "tables_unique_restaurant_table_number" ON "tables" USING btree ("restaurant_id","table_number");