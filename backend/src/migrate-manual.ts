import "dotenv/config";
import { db } from "./db/db.js";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Adding new fields to reservations table...");
    try {
        // Add new fields to offers table
        await db.execute(sql`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "discount_value" integer DEFAULT 0;`);
        await db.execute(sql`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "applicable_category_id" text;`);

        // Copy existing discount percentage values to the new discount_value column for backward compatibility
        await db.execute(sql`UPDATE "offers" SET "discount_value" = "discount_percentage" WHERE "discount_value" = 0 AND "discount_percentage" IS NOT NULL;`);

        // Ensure offerType is set correctly
        await db.execute(sql`ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "offer_type" text DEFAULT 'percentage' NOT NULL;`);

        console.log("Migration successful!");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

main();
