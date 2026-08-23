ALTER TABLE "orders" DROP CONSTRAINT "orders_id_unique";--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_id_unique";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
CREATE INDEX "idx_sessions_restaurant_billed" ON "table_session" USING btree ("restaurant_id","billed_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_status_payment" ON "table_session" USING btree ("status","payment_status");--> statement-breakpoint
CREATE INDEX "idx_reservations_restaurant_time" ON "reservations" USING btree ("restaurant_id","reservation_time");--> statement-breakpoint
CREATE INDEX "idx_orders_restaurant_status_created" ON "orders" USING btree ("restaurant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_session" ON "orders" USING btree ("table_session_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_session" ON "order_items" USING btree ("table_session_id");--> statement-breakpoint
CREATE INDEX "idx_payments_restaurant_status_created" ON "payments" USING btree ("restaurant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_payments_session" ON "payments" USING btree ("table_session_id");--> statement-breakpoint
CREATE INDEX "idx_payments_method" ON "payments" USING btree ("method");--> statement-breakpoint
CREATE INDEX "idx_notifications_restaurant_created" ON "notifications" USING btree ("restaurant_id","created_at");