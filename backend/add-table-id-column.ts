import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function addTableIdColumn() {
  try {
    console.log("Adding table_id column to reservations table...");
    
    // Check if column already exists
    const checkResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'table_id'
    `;

    if (checkResult.length > 0) {
      console.log("✅ table_id column already exists");
      return;
    }

    // Add the column
    await sql`ALTER TABLE "reservations" ADD COLUMN "table_id" text`;
    
    console.log("✅ Successfully added table_id column to reservations table");
  } catch (error) {
    console.error("❌ Error adding column:", error);
    throw error;
  }
}

addTableIdColumn()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
