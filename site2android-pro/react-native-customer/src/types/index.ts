/**
 * TypeScript definitions mapping Kotlin Domain Models & Authentication status.
 *
 * Original Java/Kotlin Paths:
 * - /app/src/main/java/com/example/data/model/Restaurant.kt
 * - /app/src/main/java/com/example/ui/MainViewModel.kt (AuthState definition)
 */

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  cuisine: string;
  category: string; // "Fine Dining", "Cafe", etc.
  dishesCategory: string; // "Pizza", "Broast", etc.
  city: string;
  isFavourite: boolean;
  phone: string;
  email: string;
  address: string;
  isClosed?: boolean;
  closedReason?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  deliveryTime?: number;
  discount?: string;
  offer?: string;
  tags?: string[];
}

export interface FoodCategory {
  name: string;
  description: string;
  imageUrl: string;
}

export type AuthState =
  | { type: 'Unauthenticated' }
  | { type: 'Loading' }
  | { type: 'Authenticated'; username: string; email: string; role: 'customer' | 'restaurant' | 'admin'; sessionToken?: string; userId?: string };

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  isVeg: boolean;
  description: string;
  restaurantId: string;
  restaurantName: string;
  variantId?: string | null;
  customization?: {
    size?: {
      name: string;
      price: number;
      id?: string;
    };
    sauce?: string;
    extras?: Array<{
      name: string;
      price: number;
      id?: string;
    }>;
  } | null;
}

