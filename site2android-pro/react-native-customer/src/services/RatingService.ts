import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config';

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

        const isFoodSubmitted = Boolean(foodRating && foodRating > 0);
        const isDeliverySubmitted = Boolean(deliveryRating && deliveryRating > 0);

        const newFoodLocked = isFoodSubmitted ? true : Boolean(existing.foodLocked || (existing.food && existing.food > 0));
        const newDeliveryLocked = isDeliverySubmitted ? true : Boolean(existing.deliveryLocked || (existing.delivery && existing.delivery > 0));

        const merged = {
          ...existing,
          food: foodRating || existing.food || 0,
          delivery: deliveryRating || existing.delivery || 0,
          foodLocked: newFoodLocked,
          deliveryLocked: newDeliveryLocked,
          isLocked: Boolean(newFoodLocked && newDeliveryLocked),
          foodLockedAt: isFoodSubmitted ? new Date().toISOString() : existing.foodLockedAt,
          deliveryLockedAt: isDeliverySubmitted ? new Date().toISOString() : existing.deliveryLockedAt,
          compliments: Array.from(new Set([...(existing.compliments || []), ...compliments])),
          reviewText: reviewText || existing.reviewText || '',
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(storedKey, JSON.stringify(merged));
      } catch (storageErr) {
        console.warn('⚠️ [RatingService] Failed to cache rating locally:', storageErr);
      }
    }

    let backendSuccess = false;

    // Submit order rating via backend API (handles restaurant, menu items, and rider ratings server-side)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

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
      } else {
        const errText = await res.text().catch(() => '');
        console.warn('⚠️ [RatingService] Backend rating request failed:', res.status, errText);
      }
    } catch (apiErr) {
      console.warn('⚠️ [RatingService] Backend rating request error:', apiErr);
    }

    return { success: backendSuccess };
  }

  /**
   * Get cached rating for an order if user has rated it
   */
  static async getOrderRating(orderId: string): Promise<{
    food: number;
    delivery: number;
    foodLocked: boolean;
    deliveryLocked: boolean;
    isLocked: boolean;
    compliments: string[];
    reviewText?: string;
    lockedAt?: string;
  } | null> {
    try {
      const raw = await AsyncStorage.getItem(`@order_rating_${orderId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure foodLocked & deliveryLocked are accurately derived even for older records
        const foodLocked = Boolean(parsed.foodLocked || (parsed.food && parsed.food > 0));
        const deliveryLocked = Boolean(parsed.deliveryLocked || (parsed.delivery && parsed.delivery > 0));
        return {
          ...parsed,
          food: parsed.food || 0,
          delivery: parsed.delivery || 0,
          foodLocked,
          deliveryLocked,
          isLocked: Boolean(foodLocked && deliveryLocked),
          compliments: parsed.compliments || [],
        };
      }
    } catch (e) {}
    return null;
  }
}
