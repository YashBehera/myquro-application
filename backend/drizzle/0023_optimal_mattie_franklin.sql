ALTER TABLE "restaurants" RENAME COLUMN "status" TO "restaurant_status";--> statement-breakpoint
ALTER TABLE "restaurants" DROP CONSTRAINT "restaurants_status_check";--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_status_check" CHECK ("restaurants"."restaurant_status" IN ('active', 'inactive', 'suspended'));