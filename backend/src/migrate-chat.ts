import "dotenv/config";
import { db } from "./db/db.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🛠️ Starting manual chat messages table migration...");
  try {
    console.log("Creating chat_messages table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" text PRIMARY KEY NOT NULL,
        "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
        "sender" text NOT NULL,
        "text" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("Creating index idx_chat_messages_order_created...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_order_created" ON "chat_messages"("order_id", "created_at");
    `);

    console.log("🎉 Chat migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
