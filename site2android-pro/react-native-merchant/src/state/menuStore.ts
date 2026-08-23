import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, Dish, MenuStats, Variant, CustomizationGroup, AddOn, DietaryType } from '../types/menu';
import { apiClient } from '../services/apiClient';

const STORAGE_KEY = '@myquro_restaurant_menu_v2';
const RESTAURANT_CACHE_KEY = '@myquro_active_restaurant_id';

export interface MenuStoreState {
  restaurantId: string | null;
  categories: Category[];
  dishes: Dish[];
  isLoading: boolean;
  searchQuery: string;
  selectedFilter: 'All' | 'Available' | 'Unavailable' | 'Veg' | 'Non-Veg' | 'With Variants' | 'With Add-ons';
  selectedDishIdsForBulk: string[];
  
  // Category Actions
  loadMenu: (forceRestaurantId?: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'displayOrder'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  toggleCategoryStatus: (id: string) => Promise<void>;

  // Dish Actions
  addDish: (dish: Omit<Dish, 'id' | 'createdAt' | 'displayOrder'>) => Promise<Dish>;
  updateDish: (id: string, updates: Partial<Dish>) => Promise<void>;
  deleteDish: (id: string) => Promise<void>;
  duplicateDish: (id: string) => Promise<Dish | null>;
  toggleDishAvailability: (id: string) => Promise<void>;
  reorderDishes: (categoryId: string, orderedIds: string[]) => Promise<void>;
  bulkUpdateDishStatus: (dishIds: string[], isAvailable: boolean) => Promise<void>;
  bulkDeleteDishes: (dishIds: string[]) => Promise<void>;

  // Selection & Filters
  setSearchQuery: (query: string) => void;
  setSelectedFilter: (filter: MenuStoreState['selectedFilter']) => void;
  toggleSelectDishForBulk: (dishId: string) => void;
  selectAllDishesForBulk: (dishIds: string[]) => void;
  clearBulkSelection: () => void;

  // Helpers
  getMenuStats: () => MenuStats;
  getDishesByCategory: (categoryId: string) => Dish[];
  getFilteredDishes: () => Dish[];
  isDishAvailableNow: (dish: Dish) => boolean;
  resetToDefaultMenu: () => Promise<void>;
}

// Helper to resolve active restaurantId
async function resolveRestaurantId(explicitId?: string): Promise<string | null> {
  if (explicitId) {
    await AsyncStorage.setItem(RESTAURANT_CACHE_KEY, explicitId);
    return explicitId;
  }

  try {
    const res = await apiClient.get('/restaurants/my-restaurant');
    if (res.data?.restaurant?.id) {
      const restId = res.data.restaurant.id;
      await AsyncStorage.setItem(RESTAURANT_CACHE_KEY, restId);
      return restId;
    }
  } catch (err) {
    console.warn('Could not resolve restaurant ID from API:', err);
  }

  const cached = await AsyncStorage.getItem(RESTAURANT_CACHE_KEY);
  return cached || null;
}

export const useMenuStore = create<MenuStoreState>((set, get) => ({
  restaurantId: null,
  categories: [],
  dishes: [],
  isLoading: true,
  searchQuery: '',
  selectedFilter: 'All',
  selectedDishIdsForBulk: [],

  loadMenu: async (forceRestaurantId?: string) => {
    set({ isLoading: true });

    // 1. Try loading cached data for instant display
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.categories) && Array.isArray(parsed.dishes)) {
          set({
            categories: parsed.categories,
            dishes: parsed.dishes,
            isLoading: false,
          });
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch live data from backend
    try {
      const restaurantId = await resolveRestaurantId(forceRestaurantId);
      if (!restaurantId) {
        set({ isLoading: false });
        return;
      }

      set({ restaurantId });

      const res = await apiClient.get(`/menus/${restaurantId}/menu`);
      const data = res.data;

      if (data && Array.isArray(data.categories)) {
        const liveCategories: Category[] = [];
        const liveDishes: Dish[] = [];

        data.categories.forEach((cat: any, catIndex: number) => {
          const categoryObj: Category = {
            id: cat.id,
            name: cat.name || cat.category || 'General',
            description: cat.description || '',
            icon: cat.icon || '🍽️',
            isActive: cat.isActive !== false,
            displayOrder: cat.displayOrder ?? catIndex,
            createdAt: cat.createdAt || new Date().toISOString(),
          };
          liveCategories.push(categoryObj);

          if (Array.isArray(cat.items)) {
            cat.items.forEach((item: any, itemIndex: number) => {
              const variantsList: Variant[] = (item.variants || []).map((v: any, vIdx: number) => ({
                id: v.id,
                name: v.variantName || v.name || 'Regular',
                price: typeof v.price === 'number' ? (v.price > 1000 ? Math.round(v.price / 100) : v.price) : 120,
                portion: v.portionSize || v.portion || '',
                description: v.description || '',
                isAvailable: v.isAvailable !== false && v.is_available !== false,
                displayOrder: v.displayOrder ?? vIdx,
              }));

              const lowestPrice =
                variantsList.length > 0
                  ? Math.min(...variantsList.map((v) => v.price))
                  : typeof item.price === 'number'
                  ? item.price > 1000
                    ? Math.round(item.price / 100)
                    : item.price
                  : 150;

              const isVeg = item.isVeg === true;
              const dietaryType: DietaryType = isVeg ? 'veg' : 'non-veg';

              const dishObj: Dish = {
                id: item.id,
                categoryId: cat.id,
                name: item.name,
                description: item.description || '',
                dietaryType,
                image: item.imageURL || item.image || undefined,
                basePrice: lowestPrice,
                hasVariants: variantsList.length > 1,
                variants: variantsList,
                customizationGroups: [],
                isAvailable: item.isAvailable !== false && item.is_available !== false,
                hasSchedule: false,
                displayOrder: item.displayOrder ?? itemIndex,
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: item.updatedAt || undefined,
              };

              liveDishes.push(dishObj);
            });
          }
        });

        set({
          categories: liveCategories,
          dishes: liveDishes,
          isLoading: false,
        });

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ categories: liveCategories, dishes: liveDishes })
        );
      } else {
        set({ categories: [], dishes: [], isLoading: false });
      }
    } catch (err) {
      console.warn('Failed to fetch live menu from backend:', err);
      set({ isLoading: false });
    }
  },

  // ---------------- Category Actions ----------------
  addCategory: async (catData) => {
    const categories = get().categories;
    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    let newId = `cat-${Date.now()}`;

    if (restaurantId) {
      try {
        const res = await apiClient.post(`/menus/${restaurantId}/menu/categories`, {
          name: catData.name,
          description: catData.description,
          display_order: categories.length,
        });
        if (res.data?.category?.id) {
          newId = res.data.category.id;
        }
      } catch (err) {
        console.warn('API error creating category:', err);
      }
    }

    const newCategory: Category = {
      ...catData,
      id: newId,
      displayOrder: categories.length,
      createdAt: new Date().toISOString(),
    };

    const updated = [...categories, newCategory];
    set({ categories: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: updated, dishes: get().dishes }));
    return newCategory;
  },

  updateCategory: async (id, updates) => {
    const updated = get().categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
    set({ categories: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: updated, dishes: get().dishes }));
  },

  deleteCategory: async (id) => {
    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    if (restaurantId) {
      try {
        await apiClient.delete(`/menus/${restaurantId}/menu/categories/${id}`);
      } catch (err) {
        console.warn('API error deleting category:', err);
      }
    }

    const updatedCats = get().categories.filter((c) => c.id !== id);
    const updatedDishes = get().dishes.filter((d) => d.categoryId !== id);
    set({ categories: updatedCats, dishes: updatedDishes });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: updatedCats, dishes: updatedDishes }));
  },

  reorderCategories: async (orderedIds) => {
    const categoriesMap = new Map(get().categories.map((c) => [c.id, c]));
    const reordered: Category[] = [];
    orderedIds.forEach((id, index) => {
      const cat = categoriesMap.get(id);
      if (cat) {
        reordered.push({ ...cat, displayOrder: index });
      }
    });
    set({ categories: reordered });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: reordered, dishes: get().dishes }));
  },

  toggleCategoryStatus: async (id) => {
    const target = get().categories.find((c) => c.id === id);
    if (!target) return;
    const newStatus = !target.isActive;

    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    if (restaurantId) {
      try {
        const endpoint = newStatus
          ? `/menus/${restaurantId}/menu/categories/${id}/activate`
          : `/menus/${restaurantId}/menu/categories/${id}/deactivate`;
        await apiClient.patch(endpoint);
      } catch (err) {
        console.warn('API error toggling category status:', err);
      }
    }

    const updated = get().categories.map((c) => (c.id === id ? { ...c, isActive: newStatus } : c));
    set({ categories: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: updated, dishes: get().dishes }));
  },

  // ---------------- Dish Actions ----------------
  addDish: async (dishData) => {
    const dishes = get().dishes;
    const categoryDishes = dishes.filter((d) => d.categoryId === dishData.categoryId);
    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    let newId = `dish-${Date.now()}`;

    if (restaurantId) {
      try {
        const res = await apiClient.post(`/menus/${restaurantId}/menu/items`, {
          name: dishData.name,
          description: dishData.description,
          categoryId: dishData.categoryId,
          isVeg: dishData.dietaryType === 'veg' || dishData.dietaryType === 'vegan',
          imageURL: dishData.image,
        });
        if (res.data?.item?.id || res.data?.id) {
          newId = res.data?.item?.id || res.data?.id;
        }
      } catch (err) {
        console.warn('API error adding dish:', err);
      }
    }

    const newDish: Dish = {
      ...dishData,
      id: newId,
      displayOrder: categoryDishes.length,
      createdAt: new Date().toISOString(),
    };

    const updated = [...dishes, newDish];
    set({ dishes: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));
    return newDish;
  },

  updateDish: async (id, updates) => {
    const updated = get().dishes.map((d) =>
      d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
    );
    set({ dishes: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));
  },

  deleteDish: async (id) => {
    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    if (restaurantId) {
      try {
        await apiClient.delete(`/menus/${restaurantId}/menu/items/${id}`);
      } catch (err) {
        console.warn('API error deleting dish:', err);
      }
    }

    const updated = get().dishes.filter((d) => d.id !== id);
    set({ dishes: updated, selectedDishIdsForBulk: get().selectedDishIdsForBulk.filter((bid) => bid !== id) });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));
  },

  duplicateDish: async (id) => {
    const original = get().dishes.find((d) => d.id === id);
    if (!original) return null;

    const clonedVariants: Variant[] = (original.variants || []).map((v, i) => ({
      ...v,
      id: `var-${Date.now()}-${i}`,
    }));

    const categoryDishes = get().dishes.filter((d) => d.categoryId === original.categoryId);
    const duplicatedDish: Dish = {
      ...original,
      id: `dish-${Date.now()}`,
      name: `${original.name} (Copy)`,
      variants: clonedVariants,
      customizationGroups: [],
      displayOrder: categoryDishes.length,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
    };

    const updated = [...get().dishes, duplicatedDish];
    set({ dishes: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));
    return duplicatedDish;
  },

  toggleDishAvailability: async (id) => {
    const target = get().dishes.find((d) => d.id === id);
    if (!target) return;
    const newStatus = !target.isAvailable;

    // Optimistic update
    const updated = get().dishes.map((d) => (d.id === id ? { ...d, isAvailable: newStatus } : d));
    set({ dishes: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));

    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    if (restaurantId) {
      try {
        await apiClient.patch(`/menus/${restaurantId}/menu/items/${id}`, {
          isAvailable: newStatus,
        });
      } catch (err) {
        console.warn('API error toggling dish availability:', err);
      }
    }
  },

  reorderDishes: async (categoryId, orderedIds) => {
    const nonCatDishes = get().dishes.filter((d) => d.categoryId !== categoryId);
    const catDishesMap = new Map(get().dishes.filter((d) => d.categoryId === categoryId).map((d) => [d.id, d]));

    const reorderedCatDishes: Dish[] = [];
    orderedIds.forEach((id, index) => {
      const dish = catDishesMap.get(id);
      if (dish) {
        reorderedCatDishes.push({ ...dish, displayOrder: index });
      }
    });

    const updated = [...nonCatDishes, ...reorderedCatDishes];
    set({ dishes: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));
  },

  bulkUpdateDishStatus: async (dishIds, isAvailable) => {
    const idSet = new Set(dishIds);
    const updated = get().dishes.map((d) => (idSet.has(d.id) ? { ...d, isAvailable } : d));
    set({ dishes: updated, selectedDishIdsForBulk: [] });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));

    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    if (restaurantId) {
      dishIds.forEach(async (id) => {
        try {
          await apiClient.patch(`/menus/${restaurantId}/menu/items/${id}`, { isAvailable });
        } catch {
          // ignore
        }
      });
    }
  },

  bulkDeleteDishes: async (dishIds) => {
    const idSet = new Set(dishIds);
    const updated = get().dishes.filter((d) => !idSet.has(d.id));
    set({ dishes: updated, selectedDishIdsForBulk: [] });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ categories: get().categories, dishes: updated }));

    const restaurantId = get().restaurantId || (await resolveRestaurantId());
    if (restaurantId) {
      dishIds.forEach(async (id) => {
        try {
          await apiClient.delete(`/menus/${restaurantId}/menu/items/${id}`);
        } catch {
          // ignore
        }
      });
    }
  },

  // ---------------- Selection & Filters ----------------
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedFilter: (filter) => set({ selectedFilter: filter }),

  toggleSelectDishForBulk: (dishId) => {
    const current = get().selectedDishIdsForBulk;
    if (current.includes(dishId)) {
      set({ selectedDishIdsForBulk: current.filter((id) => id !== dishId) });
    } else {
      set({ selectedDishIdsForBulk: [...current, dishId] });
    }
  },

  selectAllDishesForBulk: (dishIds) => {
    set({ selectedDishIdsForBulk: dishIds });
  },

  clearBulkSelection: () => {
    set({ selectedDishIdsForBulk: [] });
  },

  // ---------------- Helpers ----------------
  getMenuStats: () => {
    const categories = get().categories;
    const dishes = get().dishes;
    const isDishAvailableNow = get().isDishAvailableNow;

    const totalCategories = categories.length;
    const totalDishes = dishes.length;
    const activeDishes = dishes.filter((d) => d.isAvailable && isDishAvailableNow(d)).length;
    const inactiveDishes = dishes.filter((d) => !d.isAvailable).length;
    const unavailableToday = dishes.filter((d) => !d.isAvailable || !isDishAvailableNow(d)).length;

    return {
      totalCategories,
      totalDishes,
      activeDishes,
      inactiveDishes,
      unavailableToday,
    };
  },

  getDishesByCategory: (categoryId) => {
    return get()
      .dishes.filter((d) => d.categoryId === categoryId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  isDishAvailableNow: (dish: Dish) => {
    if (!dish.isAvailable) return false;
    if (!dish.hasSchedule || !dish.scheduleStartTime || !dish.scheduleEndTime) return true;

    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = dish.scheduleStartTime.split(':').map(Number);
      const [endHour, endMin] = dish.scheduleEndTime.split(':').map(Number);

      const startMinutes = startHour * 60 + (startMin || 0);
      const endMinutes = endHour * 60 + (endMin || 0);

      if (startMinutes <= endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch {
      return true;
    }
  },

  getFilteredDishes: () => {
    const { dishes, categories, searchQuery, selectedFilter } = get();
    const query = searchQuery.trim().toLowerCase();

    const categoryNameMap = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));

    return dishes.filter((dish) => {
      if (query) {
        const catName = categoryNameMap.get(dish.categoryId) || '';
        const matchName = dish.name.toLowerCase().includes(query);
        const matchCat = catName.includes(query);
        const matchDesc = dish.description ? dish.description.toLowerCase().includes(query) : false;
        if (!matchName && !matchCat && !matchDesc) return false;
      }

      switch (selectedFilter) {
        case 'Available':
          return dish.isAvailable;
        case 'Unavailable':
          return !dish.isAvailable;
        case 'Veg':
          return dish.dietaryType === 'veg' || dish.dietaryType === 'vegan';
        case 'Non-Veg':
          return dish.dietaryType === 'non-veg';
        case 'With Variants':
          return dish.hasVariants && dish.variants.length > 0;
        case 'With Add-ons':
          return dish.customizationGroups.some((g) => g.addOns.length > 0);
        case 'All':
        default:
          return true;
      }
    });
  },

  resetToDefaultMenu: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await get().loadMenu();
  },
}));
