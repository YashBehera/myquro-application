import "dotenv/config";
import { db } from "./db/db.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🛠️ Starting manual delivery tables migration...");
  try {
    // 1. Create delivery_addresses table
    console.log("Creating delivery_addresses table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "delivery_addresses" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "auth_users"("id") ON DELETE CASCADE,
        "address_line" text NOT NULL,
        "city" text NOT NULL,
        "latitude" real NOT NULL,
        "longitude" real NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // 2. Create delivery_riders table
    console.log("Creating delivery_riders table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "delivery_riders" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "phone" text NOT NULL,
        "latitude" real NOT NULL,
        "longitude" real NOT NULL,
        "status" text DEFAULT 'available' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // 3. Create order_deliveries table
    console.log("Creating order_deliveries table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "order_deliveries" (
        "id" text PRIMARY KEY NOT NULL,
        "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "rider_id" text REFERENCES "delivery_riders"("id") ON DELETE SET NULL,
        "status" text DEFAULT 'assigned' NOT NULL,
        "eta_minutes" integer NOT NULL,
        "current_lat" real NOT NULL,
        "current_lng" real NOT NULL,
        "customer_lat" real NOT NULL,
        "customer_lng" real NOT NULL,
        "restaurant_lat" real NOT NULL,
        "restaurant_lng" real NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log("🎉 Delivery tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
