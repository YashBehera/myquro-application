import { db } from "./db/db";
import { restaurantRequests } from "./db/schema/restaurant-requests";
import { restaurants } from "./db/schema/restaurants";
import { users } from "./db/schema/users";
import { eq } from "drizzle-orm";

async function checkRequests() {
  console.log("🔍 Checking all restaurant requests...\n");
  
  // Get all requests
  const requests = await db.select().from(restaurantRequests);
  
  console.log(`Found ${requests.length} total requests\n`);
  
  for (const request of requests) {
    console.log("📋 Request Details:");
    console.log(`  ID: ${request.id}`);
    console.log(`  User ID: ${request.userId}`);
    console.log(`  Restaurant ID: ${request.restaurantId}`);
    console.log(`  Status: ${request.requestStatus}`);
    console.log(`  Requested At: ${request.requestedAt}`);
    console.log(`  Admin Remark: ${request.adminRemark || 'None'}\n`);
    
    // Get user details
    const userRows = await db.select().from(users).where(eq(users.id, request.userId));
    if (userRows[0]) {
      console.log(`  👤 User: ${userRows[0].email} (Role: ${userRows[0].role})`);
    }
    
    // Get restaurant details
    const restaurantRows = await db.select().from(restaurants).where(eq(restaurants.id, request.restaurantId));
    if (restaurantRows[0]) {
      console.log(`  🏪 Restaurant: ${restaurantRows[0].restaurantName}`);
      console.log(`  📍 Location: ${restaurantRows[0].city}, ${restaurantRows[0].state}`);
      console.log(`  📧 Email: ${restaurantRows[0].email}`);
      console.log(`  📞 Phone: ${restaurantRows[0].phoneNumber}`);
    } else {
      console.log(`  ❌ Restaurant not found for ID: ${request.restaurantId}`);
    }
    
    console.log("\n" + "=".repeat(80) + "\n");
  }
  
  if (requests.length === 0) {
    console.log("ℹ️  No restaurant requests found in the database");
  }
  
  process.exit(0);
}

checkRequests().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
