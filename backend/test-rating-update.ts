import { updateRestaurantRating } from "./src/lib/rating-utils.js";
import { db } from "./src/db/db.js";
import { restaurants } from "./src/db/schema/restaurants.js";
import { eq } from "drizzle-orm";

/**
 * Test script to verify the rating update functionality
 */
async function testRatingUpdate() {
  try {
    console.log("🧪 Testing rating update functionality...");

    // Get a restaurant to test with
    const testRestaurant = await db
      .select({ id: restaurants.id, rating: restaurants.rating, ratingCount: restaurants.ratingCount })
      .from(restaurants)
      .limit(1);

    if (testRestaurant.length === 0) {
      console.log("❌ No restaurants found to test with");
      return;
    }

    const restaurant = testRestaurant[0];
    console.log(`📊 Testing with restaurant: ${restaurant.id}`);
    console.log(`   Before: rating=${restaurant.rating}, count=${restaurant.ratingCount}`);

    // Update the rating
    await updateRestaurantRating(restaurant.id);

    // Check the updated values
    const updatedRestaurant = await db
      .select({ rating: restaurants.rating, ratingCount: restaurants.ratingCount })
      .from(restaurants)
      .where(eq(restaurants.id, restaurant.id))
      .limit(1);

    if (updatedRestaurant.length > 0) {
      const updated = updatedRestaurant[0];
      console.log(`   After:  rating=${updated.rating}, count=${updated.ratingCount}`);
      console.log("✅ Rating update test completed successfully!");
    } else {
      console.log("❌ Could not retrieve updated restaurant data");
    }

  } catch (error) {
    console.error("❌ Rating update test failed:", error);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRatingUpdate();
}

export { testRatingUpdate };