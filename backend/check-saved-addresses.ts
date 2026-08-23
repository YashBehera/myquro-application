import { db } from "./src/db/db.js";
import { deliveryAddresses } from "./src/db/schema/delivery-addresses.js";
import { authUsers } from "./src/db/schema/auth-users.js";
import { ilike, or, eq } from "drizzle-orm";

async function main() {
  try {
    console.log("🔍 Querying all saved delivery addresses containing 'khandagiri' or 'G-123'...");
    
    const allAddresses = await db
      .select({
        id: deliveryAddresses.id,
        userId: deliveryAddresses.userId,
        userEmail: authUsers.email,
        userName: authUsers.name,
        addressLine: deliveryAddresses.addressLine,
        city: deliveryAddresses.city,
        latitude: deliveryAddresses.latitude,
        longitude: deliveryAddresses.longitude,
      })
      .from(deliveryAddresses)
      .leftJoin(authUsers, eq(deliveryAddresses.userId, authUsers.id));

    console.log(`\n📊 Total addresses in DB: ${allAddresses.length}`);
    
    let found = false;
    allAddresses.forEach(a => {
      const matchText = `${a.addressLine} ${a.city}`.toLowerCase();
      if (matchText.includes("khandagiri") || matchText.includes("g-123")) {
        found = true;
        console.log(`\n✅ MATCH FOUND:`);
        console.log(`   - ID: ${a.id}`);
        console.log(`   - User: ${a.userName} (${a.userEmail})`);
        console.log(`   - Address Line: ${a.addressLine}`);
        console.log(`   - City: ${a.city}`);
        console.log(`   - Latitude: ${a.latitude}`);
        console.log(`   - Longitude: ${a.longitude}`);
      }
    });

    if (!found) {
      console.log("❌ No matching addresses found for 'khandagiri' or 'G-123' in the database.");
      console.log("\nHere are all addresses in the database:");
      allAddresses.forEach(a => {
        console.log(`- ID: ${a.id} | User: ${a.userEmail} | Line: ${a.addressLine} | City: ${a.city} | Lat/Lng: ${a.latitude}, ${a.longitude}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error running address check:", error);
    process.exit(1);
  }
}

main();
