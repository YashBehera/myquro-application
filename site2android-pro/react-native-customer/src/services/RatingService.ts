import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL, NEON_SQL_ENDPOINT, NEON_CONN_STRING } from '../config';

export interface OrderRatingPayload {
  orderId?: string;
  restaurantId?: string;
  foodRating?: number; // 1 to 5
  deliveryRating?: number; // 1 to 5
  riderId?: string;
  reviewText?: string;
  compliments?: string[];
  items?: Array<{ id?: string; menuItemId?: string; name?: string; rating?: number }>;
  userId?: string;
}

export class RatingService {
  /**
   * Submit ratings for restaurant, all food items in the order, and delivery rider
   */
  static async submitRating(payload: OrderRatingPayload): Promise<{ success: boolean; message?: string }> {
    const {
      orderId,
      restaurantId,
      foodRating,
      deliveryRating,
      riderId,
      reviewText,
      compliments = [],
      items = [],
      userId = 'customer_user',
    } = payload;

    console.log('🌟 [RatingService] Submitting rating:', payload);

    // Save locally first for instant UI response and persistence
    if (orderId) {
      try {
        const storedKey = `@order_rating_${orderId}`;
        const existingRaw = await AsyncStorage.getItem(storedKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const merged = {
          ...existing,
          food: foodRating || existing.food || 0,
          delivery: deliveryRating || existing.delivery || 0,
          compliments: Array.from(new Set([...(existing.compliments || []), ...compliments])),
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(storedKey, JSON.stringify(merged));
      } catch (storageErr) {
        console.warn('⚠️ [RatingService] Failed to cache rating locally:', storageErr);
      }
    }

    let backendSuccess = false;

    // 1. Try Backend API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${BACKEND_URL}/api/reviews/rate-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        backendSuccess = true;
        console.log('✅ [RatingService] Successfully submitted to backend API');
      }
    } catch (apiErr) {
      console.warn('ℹ️ [RatingService] Backend slow or offline, using direct Neon DB sync:', apiErr);
    }

    // 2. Direct Neon DB SQL Sync (ensures 100% reliability even if Render server sleeps)
    try {
      const sqlQueries: string[] = [];

      // A. Rate restaurant and create review record
      if (restaurantId && foodRating && foodRating >= 1 && foodRating <= 5) {
        const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const fullReview = reviewText
          ? (compliments.length > 0 ? `${reviewText} [${compliments.join(', ')}]` : reviewText)
          : (compliments.length > 0 ? compliments.join(', ') : '');

        sqlQueries.push(`
          INSERT INTO reviews (id, order_id, user_id, restaurant_id, rating, review_text, created_at, updated_at)
          VALUES ('${reviewId}', ${orderId ? `'${orderId}'` : 'NULL'}, '${userId}', '${restaurantId}', ${Math.round(foodRating)}, ${fullReview ? `'${fullReview.replace(/'/g, "''")}'` : 'NULL'}, NOW(), NOW());
        `);

        sqlQueries.push(`
          UPDATE restaurants
          SET 
            rating = ROUND(((COALESCE(rating, 0.0) * COALESCE(rating_count, 0) + ${foodRating}) / (COALESCE(rating_count, 0) + 1))::numeric, 1),
            rating_count = COALESCE(rating_count, 0) + 1,
            updated_at = NOW()
          WHERE id = '${restaurantId}';
        `);
      }

      // B. Rate all individual food items in the order
      if (foodRating && foodRating >= 1 && foodRating <= 5) {
        if (items.length > 0) {
          for (const item of items) {
            const mId = item.menuItemId || item.id;
            if (mId && !mId.startsWith('reorder_')) {
              const iRating = item.rating || foodRating;
              sqlQueries.push(`
                UPDATE menu_items
                SET
                  rating = ROUND(((COALESCE(rating, 0.0) * COALESCE(rating_count, 0) + ${iRating}) / (COALESCE(rating_count, 0) + 1))::numeric, 1),
                  rating_count = COALESCE(rating_count, 0) + 1,
                  updated_at = NOW()
                WHERE id = '${mId}';
              `);
            }
          }
        } else if (orderId) {
          // If items list not provided directly, update all menu_items linked via order_items
          sqlQueries.push(`
            UPDATE menu_items
            SET
              rating = ROUND(((COALESCE(rating, 0.0) * COALESCE(rating_count, 0) + ${foodRating}) / (COALESCE(rating_count, 0) + 1))::numeric, 1),
              rating_count = COALESCE(rating_count, 0) + 1,
              updated_at = NOW()
            WHERE id IN (SELECT menu_item_id FROM order_items WHERE order_id = '${orderId}');
          `);
        }
      }

      // C. Rate delivery rider
      if (deliveryRating && deliveryRating >= 1 && deliveryRating <= 5) {
        if (riderId) {
          sqlQueries.push(`
            UPDATE delivery_riders
            SET
              rating = ROUND(((COALESCE(rating, 0.0) * COALESCE(total_ratings, 0) + ${deliveryRating}) / (COALESCE(total_ratings, 0) + 1))::numeric, 1),
              total_ratings = COALESCE(total_ratings, 0) + 1,
              updated_at = NOW()
            WHERE id = '${riderId}';
          `);
        } else if (orderId) {
          // Update rider assigned via order_deliveries
          sqlQueries.push(`
            UPDATE delivery_riders
            SET
              rating = ROUND(((COALESCE(rating, 0.0) * COALESCE(total_ratings, 0) + ${deliveryRating}) / (COALESCE(total_ratings, 0) + 1))::numeric, 1),
              total_ratings = COALESCE(total_ratings, 0) + 1,
              updated_at = NOW()
            WHERE id IN (SELECT rider_id FROM order_deliveries WHERE order_id = '${orderId}' AND rider_id IS NOT NULL);
          `);
        }
      }

      // Execute each query sequentially on Neon
      for (const query of sqlQueries) {
        await fetch(NEON_SQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Neon-Connection-String': NEON_CONN_STRING,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: query.trim() }),
        });
      }

      console.log(`✅ [RatingService] Executed ${sqlQueries.length} direct Neon DB updates`);
      return { success: true };
    } catch (neonErr) {
      console.warn('⚠️ [RatingService] Neon direct sync encountered an issue:', neonErr);
      return { success: backendSuccess };
    }
  }

  /**
   * Get cached rating for an order if user has rated it
   */
  static async getOrderRating(orderId: string): Promise<{ food: number; delivery: number; compliments: string[] } | null> {
    try {
      const raw = await AsyncStorage.getItem(`@order_rating_${orderId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }
}
