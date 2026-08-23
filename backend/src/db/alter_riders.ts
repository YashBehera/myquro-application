import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  console.log("Connecting to Neon DB...");
  const sql = neon(url);

  try {
    console.log("Adding aadhaar_number column...");
    await sql`ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS aadhaar_number text;`;
    
    console.log("Adding pan_number column...");
    await sql`ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS pan_number text;`;
    
    console.log("Adding joining_fee_paid column...");
    await sql`ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS joining_fee_paid boolean DEFAULT false;`;

    console.log("✅ Columns added successfully!");
  } catch (error) {
    console.error("❌ Error altering table:", error);
  }
}

run();
