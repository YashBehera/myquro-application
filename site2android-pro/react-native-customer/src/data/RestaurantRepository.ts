/**
 * Restaurant and Food Category Data Repository.
 * Holds categories and dynamic restaurant interfaces.
 */

import { Restaurant, FoodCategory } from '../types';
import { RestaurantDatabase } from './RestaurantDatabase';

const STATIC_CATEGORIES: FoodCategory[] = [
  {
    name: 'Specials',
    description: "Chef's curated culinary creations and trending gastronomic highlights.",
    imageUrl: 'https://plus.unsplash.com/premium_photo-1673439304183-8840bd0dd1bf?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'Biryani',
    description: 'Fragrant basmati rice slow-cooked with aromatic spices, saffron, and tender cuts.',
    imageUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'Pizzas',
    description: 'Wood-fired crusts layered with San Marzano tomato sauce and fresh mozzarella.',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'Burgers',
    description: 'Juicy patties nestled between toasted brioche buns with gourmet house sauces.',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'Rolls',
    description: 'Golden grilled wraps loaded with savory fillings, onions, and zesty sauces.',
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400&auto=format&fit=crop&q=60',
  },
];

const STATIC_CUISINES: FoodCategory[] = [
  {
    name: 'North Indian',
    description: 'A rich culinary tradition featuring butter chicken, paneer tikka, and hot garlic naan.',
    imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'South Indian',
    description: 'Crispy rice crêpe dosas, soft idlis, and hot sambar bursting with curry leaves.',
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'Italian',
    description: 'Fresh wood-fired sourdough pizzas, creamy pasta alfredo, and rich basil marinara.',
    imageUrl: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'Chinese',
    description: 'Steaming hot dim sums, wok-tossed noodles, and savory stir-fries.',
    imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&auto=format&fit=crop&q=60',
  },
  {
    name: 'Biryani',
    description: 'Fragrant basmati rice layered with aromatic spices and saffron.',
    imageUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&auto=format&fit=crop&q=60',
  },
];

export class RestaurantRepository {
  static getFoodCategories(): FoodCategory[] {
    return STATIC_CATEGORIES;
  }

  static getCuisines(): FoodCategory[] {
    return STATIC_CUISINES;
  }

  static getRestaurantById(_id: string): Restaurant | undefined {
    return undefined;
  }

  static async getRestaurantsList(): Promise<Restaurant[]> {
    return [];
  }

  static async toggleFavourite(restaurant: Restaurant): Promise<boolean> {
    if (!restaurant) return false;

    const isFavNow = await RestaurantDatabase.isFavourite(restaurant.id);
    if (isFavNow) {
      await RestaurantDatabase.removeFavouriteById(restaurant.id);
      return false;
    } else {
      await RestaurantDatabase.addFavourite(restaurant);
      return true;
    }
  }

  static getMenuByRestaurantId(_id: string): any[] {
    return [];
  }
}
