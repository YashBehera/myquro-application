/**
 * Production-ready Database & Cache Provider for User Favourites
 * Syncs with PostgreSQL backend (/api/favourites) when authenticated,
 * and maintains AsyncStorage for instant 0ms offline access.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../types';
import { BACKEND_URL } from '../config';

const FAVOURITES_KEY = '@my_quro_favourites';

export class RestaurantDatabase {
  private static async getAuthToken(): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem('@auth_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.type === 'Authenticated' && parsed?.sessionToken) {
          return parsed.sessionToken;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Retrieves all favorited restaurant models saved locally.
   */
  static async getAllFavourites(): Promise<Restaurant[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(FAVOURITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Failed to retrieve favourites from local storage', e);
      return [];
    }
  }

  /**
   * Syncs favourites with the backend PostgreSQL database.
   */
  static async syncWithServer(explicitToken?: string): Promise<Restaurant[]> {
    try {
      const token = explicitToken || (await this.getAuthToken());
      if (!token) return await this.getAllFavourites();

      const res = await fetch(`${BACKEND_URL}/api/favourites`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.favourites)) {
          const remoteFavs: Restaurant[] = data.favourites.map((f: any) => ({
            id: f.id,
            name: f.name || 'Restaurant',
            description: f.description || '',
            image: f.image || '/favourites/tray.png',
            rating: Number(f.rating) || 4.5,
            reviewCount: parseInt(f.reviews) || 50,
            cuisine: Array.isArray(f.cuisines) ? f.cuisines.join(', ') : (f.cuisines || 'Multi-Cuisine'),
            category: f.category || 'Top Rated',
            dishesCategory: 'General',
            city: f.location || 'City',
            isFavourite: true,
            phone: '',
            email: '',
            address: f.location || '',
          }));

          await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(remoteFavs));
          return remoteFavs;
        }
      }
    } catch (err) {
      console.warn('⚠️ [RestaurantDatabase] Failed to sync favourites with server:', err);
    }
    return await this.getAllFavourites();
  }

  /**
   * Stores a new restaurant model as a favourite in DB & local cache.
   */
  static async addFavourite(restaurant: Restaurant, explicitToken?: string): Promise<void> {
    try {
      const currentFavs = await this.getAllFavourites();
      if (!currentFavs.some(item => item.id === restaurant.id)) {
        const updatedFavs = [...currentFavs, { ...restaurant, isFavourite: true }];
        await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(updatedFavs));
      }

      const token = explicitToken || (await this.getAuthToken());
      if (token) {
        fetch(`${BACKEND_URL}/api/favourites`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ restaurantId: restaurant.id }),
        }).catch(err => console.warn('⚠️ [RestaurantDatabase] Server add favourite error:', err));
      }
    } catch (e) {
      console.error('Failed to add favourite restaurant', e);
    }
  }

  /**
   * Removes a restaurant model from favourites by ID in DB & local cache.
   */
  static async removeFavouriteById(id: string, explicitToken?: string): Promise<void> {
    try {
      const currentFavs = await this.getAllFavourites();
      const updatedFavs = currentFavs.filter(item => item.id !== id);
      await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(updatedFavs));

      const token = explicitToken || (await this.getAuthToken());
      if (token) {
        fetch(`${BACKEND_URL}/api/favourites/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(err => console.warn('⚠️ [RestaurantDatabase] Server remove favourite error:', err));
      }
    } catch (e) {
      console.error('Failed to remove favourite restaurant', e);
    }
  }

  /**
   * Checks if a specific restaurant ID is favorited.
   */
  static async isFavourite(id: string): Promise<boolean> {
    try {
      const currentFavs = await this.getAllFavourites();
      return currentFavs.some(item => item.id === id);
    } catch (e) {
      console.error('Failed to check favourite status', e);
      return false;
    }
  }
}
