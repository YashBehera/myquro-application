import { db } from "./src/db/db";
import { sql } from "drizzle-orm";

async function checkAllTables() {
  try {
    console.log("🔍 Checking all tables in database...\n");
    
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log("📋 Tables found:");
    result.rows.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });
    
    // Check reservations table specifically
    const resCount = await db.execute(sql`SELECT COUNT(*) as count FROM reservations`);
    console.log(`\n📊 Total rows in reservations table: ${resCount.rows[0].count}`);
    
    // Get a sample of data
    const sample = await db.execute(sql`SELECT * FROM reservations LIMIT 5`);
    console.log(`\n📋 Sample reservations (up to 5):`);
    sample.rows.forEach((row: any, i: number) => {
      console.log(`\n${i + 1}.`, JSON.stringify(row, null, 2));
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkAllTables();
