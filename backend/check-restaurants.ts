import { db } from "./src/db/db";
import { restaurants, restaurantManagers } from "./src/db/schema";
import { eq, or } from "drizzle-orm";

async function checkRestaurants() {
  try {
    const userId = "WEWp4PLUYcGzDY1ByOYRyg9V2IcG104i";
    
    console.log(`🔍 Checking restaurants for user: ${userId}\n`);
    
    // Get all restaurants where user is owner
    const ownedRestaurants = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerId, userId));
    
    console.log(`📊 Owned restaurants: ${ownedRestaurants.length}`);
    ownedRestaurants.forEach(r => {
      console.log(`   - ${r.name} (ID: ${r.id})`);
    });
    
    // Get all restaurants where user is manager
    const managerRecords = await db
      .select()
      .from(restaurantManagers)
      .where(eq(restaurantManagers.userId, userId));
    
    console.log(`\n📊 Manager relationships: ${managerRecords.length}`);
    for (const mgr of managerRecords) {
      const restaurant = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, mgr.restaurantId))
        .limit(1);
      
      if (restaurant.length > 0) {
        console.log(`   - ${restaurant[0].name} (ID: ${restaurant[0].id}) - Role: ${mgr.role}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkRestaurants();
