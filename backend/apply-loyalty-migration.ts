import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function applyMigration() {
  try {
    const migrationSQL = fs.readFileSync(
      join(__dirname, "drizzle/0064_fair_madelyne_pryor.sql"),
      "utf8"
    );

    console.log("Applying loyalty system migration...");
    
    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL.split("--> statement-breakpoint");
    
    for (const statement of statements) {
      const cleanStatement = statement.trim();
      if (cleanStatement) {
        console.log(`Executing: ${cleanStatement.substring(0, 50)}...`);
        // Use unsafe to execute raw SQL without parameters
        await sql.unsafe(cleanStatement);
      }
    }

    console.log("✅ Migration applied successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

applyMigration();
