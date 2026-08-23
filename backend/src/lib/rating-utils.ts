import { db } from "../db/db.js";
import { reviews } from "../db/schema/reviews.js";
import { restaurants } from "../db/schema/restaurants.js";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Updates the rating and rating count for a restaurant based on all its reviews
 * @param restaurantId - The ID of the restaurant to update
 */
export async function updateRestaurantRating(restaurantId: string): Promise<void> {
  try {
    // Calculate average rating and count from all reviews for this restaurant
    const ratingStats = await db
      .select({
        averageRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`,
        ratingCount: sql<number>`COUNT(${reviews.id})`
      })
      .from(reviews)
      .where(eq(reviews.restaurantId, restaurantId));

    const stats = ratingStats[0];

    // Update the restaurant with new rating stats
    await db
      .update(restaurants)
      .set({
        rating: (stats.averageRating || 0).toString(), // Default to 0 if no reviews
        ratingCount: stats.ratingCount,
        updatedAt: new Date()
      })
      .where(eq(restaurants.id, restaurantId));

    console.log(`📊 [RATING UPDATE] Restaurant ${restaurantId}: ${stats.ratingCount} reviews, avg rating ${stats.averageRating}`);

  } catch (error) {
    console.error(`❌ [RATING UPDATE ERROR] Failed to update rating for restaurant ${restaurantId}:`, error);
    throw error;
  }
}