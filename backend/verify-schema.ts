import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function verifyColumn() {
  try {
    console.log("Verifying reservations table schema...");
    
    // Check columns in reservations table
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `;

    console.log("\nReservations table columns:");
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Try to select from reservations with table_id
    const testQuery = await sql`
      SELECT id, table_id 
      FROM reservations 
      LIMIT 1
    `;
    
    console.log("\n✅ Successfully queried table_id column");
    console.log("Sample data:", testQuery);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

verifyColumn()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
