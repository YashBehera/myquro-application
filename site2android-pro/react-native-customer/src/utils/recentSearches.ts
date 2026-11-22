import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_STORAGE_KEY = '@myquro_recent_food_searches';
const MAX_RECENT_ITEMS = 10;

export const DEFAULT_RECENT_SEARCHES: string[] = [
  'Dum Biryani',
  'Truffle Burger',
  'Woodfired Pizza',
  'Butter Chicken',
  'KFC',
  'Kathi Rolls',
  'Steamed Momos',
];

/**
 * Loads recent searches from AsyncStorage.
 * Falls back to DEFAULT_RECENT_SEARCHES on first run if nothing has been searched.
 */
export const getStoredRecentSearches = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[RecentSearches] Failed to load from storage:', error);
  }
  return DEFAULT_RECENT_SEARCHES;
};

/**
 * Adds a new search query to the front of the list and persists to AsyncStorage.
 */
export const addStoredRecentSearch = async (query: string): Promise<string[]> => {
  const cleanTerm = query.trim();
  if (!cleanTerm) {
    return await getStoredRecentSearches();
  }

  try {
    const current = await getStoredRecentSearches();
    const filtered = current.filter(
      (item) => item.toLowerCase() !== cleanTerm.toLowerCase()
    );
    const updated = [cleanTerm, ...filtered].slice(0, MAX_RECENT_ITEMS);
    await AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[RecentSearches] Failed to save search:', error);
    return [];
  }
};

/**
 * Removes an individual search term from AsyncStorage.
 */
export const removeStoredRecentSearch = async (queryToRemove: string): Promise<string[]> => {
  try {
    const current = await getStoredRecentSearches();
    const updated = current.filter(
      (item) => item.toLowerCase() !== queryToRemove.toLowerCase().trim()
    );
    await AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.warn('[RecentSearches] Failed to remove search:', error);
    return [];
  }
};

/**
 * Clears all recent searches from AsyncStorage.
 */
export const clearStoredRecentSearches = async (): Promise<string[]> => {
  try {
    await AsyncStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify([]));
  } catch (error) {
    console.warn('[RecentSearches] Failed to clear searches:', error);
  }
  return [];
};
