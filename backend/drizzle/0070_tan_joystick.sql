ALTER TABLE "offers" DROP CONSTRAINT "offers_id_unique";--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "guest_name" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "guest_phone" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "guest_email" text;--> statement-breakpoint
CREATE INDEX "idx_tables_restaurant_status" ON "tables" USING btree ("restaurant_id","live_status");--> statement-breakpoint
CREATE INDEX "idx_sessions_restaurant_status" ON "table_session" USING btree ("restaurant_id","status");--> statement-breakpoint
CREATE INDEX "idx_sessions_table" ON "table_session" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_past" ON "table_session" USING btree ("restaurant_id","status","payment_status","billed_at");--> statement-breakpoint
CREATE INDEX "idx_reservations_restaurant_status" ON "reservations" USING btree ("restaurant_id","status");--> statement-breakpoint
CREATE INDEX "idx_reservations_user" ON "reservations" USING btree ("reserved_by");--> statement-breakpoint
CREATE INDEX "menu_categories_restaurant_idx" ON "menu_categories" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "menu_item_variants_menu_item_idx" ON "menu_item_variants" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "idx_orders_table" ON "orders" USING btree ("table_id");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_order_extras_item" ON "order_item_extras" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_payments_restaurant_date" ON "payments" USING btree ("restaurant_id","created_at");