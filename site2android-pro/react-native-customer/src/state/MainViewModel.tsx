/**
 * Application State Manager Context & Custom Hooks (ViewModel).
 *
 * Original Java/Kotlin Path:
 * - /app/src/main/java/com/example/ui/MainViewModel.kt
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant, FoodCategory, AuthState, CartItem } from '../types';
import { RestaurantRepository } from '../data/RestaurantRepository';
import { RestaurantDatabase } from '../data/RestaurantDatabase';
import { BACKEND_URL } from '../config';
import { SecureStorage } from '../utils/secureStorage';
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp, isFirebaseConfigured } from '../services/firebaseAuth';

export interface SavedAddress {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  houseNo: string;
  landmark: string;
  area: string;
  city: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  instructions?: string;
  receiverName?: string;
  receiverPhone?: string;
}

interface ViewModelContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isBiometricsEnabled: boolean;
  toggleBiometrics: () => void;
  authState: AuthState;
  login: (email: string, name: string, password?: string, isLogin?: boolean) => Promise<void>;
  sendOtp: (phone: string, recaptchaToken?: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string, directIdToken?: string) => Promise<AuthState>;
  setAuthenticatedState: (state: AuthState) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  updateProfile: (name: string, email: string) => void;
  categories: FoodCategory[];
  cuisines: FoodCategory[];
  searchQuery: string;
  updateSearchQuery: (query: string) => void;
  selectedCategoryTab: string;
  selectCategoryTab: (tab: string) => void;
  selectedDishCategory: string | null;
  selectDishCategory: (dish: string | null) => void;
  restaurantsList: Restaurant[];
  allRestaurants: Restaurant[];
  favouriteRestaurantsList: Restaurant[];
  toggleFavourite: (id: string) => Promise<void>;
  qrResult: string | null;
  scannedRestaurant: Restaurant | null;
  showInvoiceDialog: boolean;
  scanQrCode: (scannedContent: string) => void;
  clearQrResult: () => void;
  profileImageUri: string | null;
  uploadProfileAvatar: (uri: string) => void;
  foodItems: any[];
  cartItems: CartItem[];
  addToCart: (item: any) => void;
  addMultipleToCart: (items: any[]) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  syncCartItems: (items: CartItem[]) => void;
  checkoutCart: (notes?: string, customItems?: any[]) => Promise<any>;
  savedAddresses: SavedAddress[];
  addSavedAddress: (addr: Omit<SavedAddress, 'id'>) => void;
  updateSavedAddress: (addr: SavedAddress) => void;
  deleteSavedAddress: (id: string) => void;
  isLoading: boolean;
  currentLocation: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  setCurrentLocation: (loc: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  userOrders: any[];
  refreshUserOrders: () => Promise<void>;
}

const ViewModelContext = createContext<ViewModelContextType | undefined>(undefined);

export const ViewModelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(true);
  const [authState, setAuthState] = useState<AuthState>({ type: 'Loading' });

  const categories = RestaurantRepository.getFoodCategories();
  const cuisines = RestaurantRepository.getCuisines();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('Overall');
  const [selectedDishCategory, setSelectedDishCategory] = useState<string | null>(null);

  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [allRestaurantsWithMetrics, setAllRestaurantsWithMetrics] = useState<Restaurant[]>([]);
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([]);
  const [favouriteRestaurantsList, setFavouriteRestaurantsList] = useState<Restaurant[]>([]);

  const [qrResult, setQrResult] = useState<string | null>(null);
  const [scannedRestaurant, setScannedRestaurant] = useState<Restaurant | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseSessionInfo, setFirebaseSessionInfo] = useState<string | null>(null);

  // Global currentLocation state
  const [currentLocation, setCurrentLocation] = useState({
    label: "Home",
    address: "",
    latitude: 20.2508,
    longitude: 85.7886,
  });

  const updateCurrentLocation = async (loc: typeof currentLocation) => {
    setCurrentLocation(loc);
    try {
      await AsyncStorage.setItem('@current_location', JSON.stringify(loc));
    } catch (e) {
      console.error("❌ [MainViewModel] Error saving current location:", e);
    }
  };

  // Load stored cart items and addresses
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const stored = await AsyncStorage.getItem('@cart_items');
        if (stored) {
          setCartItems(JSON.parse(stored));
        }
      } catch (err) {
        console.error("❌ [MainViewModel] Error loading stored cart items:", err);
      }
      try {
        const storedLoc = await AsyncStorage.getItem('@current_location');
        if (storedLoc) {
          setCurrentLocation(JSON.parse(storedLoc));
        }
      } catch (err) {
        console.error("❌ [MainViewModel] Error loading stored location:", err);
      }
      try {
        const storedAddresses = await AsyncStorage.getItem('@saved_addresses');
        if (storedAddresses) {
          const parsed = JSON.parse(storedAddresses);
          // Purge any legacy dummy/mock addresses
          const cleanAddresses = Array.isArray(parsed)
            ? parsed.filter(a => a.id !== '1' && a.id !== '2' && a.houseNo !== 'B-128' && !a.address?.includes('Bokaro Steel City') && !a.address?.includes('DLF Phase 3'))
            : [];
          setSavedAddresses(cleanAddresses);
          await AsyncStorage.setItem('@saved_addresses', JSON.stringify(cleanAddresses));
        } else {
          setSavedAddresses([]);
        }
      } catch (err) {
        console.error("❌ [MainViewModel] Error loading stored addresses:", err);
      }
      try {
        const storedOrders = await AsyncStorage.getItem('@placed_orders_history');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          if (Array.isArray(parsed)) {
            setUserOrders(parsed);
          }
        }
      } catch (err) {
        console.error("❌ [MainViewModel] Error loading stored orders:", err);
      }
    };
    loadStoredData();
  }, []);

  // Save cart items helper
  const saveCartItems = async (items: CartItem[]) => {
    try {
      await AsyncStorage.setItem('@cart_items', JSON.stringify(items));
    } catch (err) {
      console.error("❌ [MainViewModel] Error saving cart items:", err);
    }
  };

  // Save addresses helper (local cache)
  const persistAddresses = async (addrs: SavedAddress[]) => {
    try {
      await AsyncStorage.setItem('@saved_addresses', JSON.stringify(addrs));
    } catch (err) {
      console.error("❌ [MainViewModel] Error saving addresses:", err);
    }
  };

  // Get active session token securely from hardware storage or state
  const getActiveToken = async (): Promise<string | undefined> => {
    if (authState.type === 'Authenticated' && authState.sessionToken) {
      return authState.sessionToken;
    }
    try {
      const secToken = await SecureStorage.getSessionToken();
      if (secToken) return secToken;
      const stored = await AsyncStorage.getItem('@auth_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.sessionToken) {
          return parsed.sessionToken;
        }
      }
    } catch {}
    return undefined;
  };

  // Fetch user order history
  const refreshUserOrders = async () => {
    try {
      let localOrders: any[] = [];
      const localData = await AsyncStorage.getItem('@placed_orders_history');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) localOrders = parsed;
        } catch (e) {}
      }

      let remoteOrders: any[] = [];
      const userId = authState.type === 'Authenticated' ? ((authState as any).userId || (authState as any).user?.id) : null;
      const sessionToken = await getActiveToken();

      if (userId && sessionToken) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/orders/${userId}/user-orders`, {
            headers: { Authorization: `Bearer ${sessionToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.orders && Array.isArray(data.orders)) {
              remoteOrders = data.orders;
            }
          }
        } catch (e) {
          console.warn('[MainViewModel] Error fetching user orders:', e);
        }
      }

      const mergedMap = new Map<string, any>();
      localOrders.forEach(o => {
        if (o && (o.id || o.orderId)) mergedMap.set(o.id || o.orderId, o);
      });
      remoteOrders.forEach(o => {
        if (o && (o.id || o.orderId)) mergedMap.set(o.id || o.orderId, o);
      });

      const combined = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
        return timeB - timeA;
      });

      setUserOrders(combined);
      await AsyncStorage.setItem('@placed_orders_history', JSON.stringify(combined));
    } catch (err) {
      console.warn('[MainViewModel] Error in refreshUserOrders:', err);
    }
  };

  // Fetch addresses from PostgreSQL backend
  const fetchServerAddresses = async (token?: string) => {
    const activeToken = token || (await getActiveToken());
    if (!activeToken) return;
    try {
      console.log(`🌐 [MainViewModel] Fetching addresses from server: ${BACKEND_URL}/api/delivery/addresses`);
      const res = await fetch(`${BACKEND_URL}/api/delivery/addresses`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log(`✅ [MainViewModel] Synced ${data.length} addresses from server`);
          setSavedAddresses(data);
          await persistAddresses(data);
        }
      }
    } catch (err) {
      console.warn("⚠️ [MainViewModel] Failed to sync addresses from server:", err);
    }
  };

  const addSavedAddress = async (addr: Omit<SavedAddress, 'id'>) => {
    const tempId = `addr_${Date.now()}`;
    const newAddr: SavedAddress = { ...addr, id: tempId };
    const updated = [...savedAddresses, newAddr];
    setSavedAddresses(updated);
    persistAddresses(updated);

    const token = await getActiveToken();
    if (token) {
      try {
        console.log(`🌐 [MainViewModel] Saving new address to cloud database...`);
        const res = await fetch(`${BACKEND_URL}/api/delivery/addresses`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addr),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.id) {
            console.log(`✅ [MainViewModel] Address saved to DB with ID:`, resData.id);
            const synced = updated.map(a => a.id === tempId ? { ...a, id: resData.id } : a);
            setSavedAddresses(synced);
            persistAddresses(synced);
          }
        }
      } catch (e) {
        console.warn("⚠️ [MainViewModel] Failed to save address to DB:", e);
      }
    } else {
      console.warn("⚠️ [MainViewModel] No active user token found when saving address");
    }
  };

  const updateSavedAddress = async (addr: SavedAddress) => {
    const updated = savedAddresses.map(a => a.id === addr.id ? addr : a);
    setSavedAddresses(updated);
    persistAddresses(updated);

    const token = await getActiveToken();
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/delivery/addresses/${addr.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addr),
        });
      } catch (e) {
        console.warn("⚠️ [MainViewModel] Failed to update address in DB:", e);
      }
    }
  };

  const deleteSavedAddress = async (id: string) => {
    const updated = savedAddresses.filter(a => a.id !== id);
    setSavedAddresses(updated);
    persistAddresses(updated);

    const token = await getActiveToken();
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/delivery/addresses/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (e) {
        console.warn("⚠️ [MainViewModel] Failed to delete address from DB:", e);
      }
    }
  };

  // Sync server data when authenticated
  useEffect(() => {
    if (authState.type === 'Authenticated' && authState.sessionToken) {
      fetchServerAddresses(authState.sessionToken);
      RestaurantDatabase.syncWithServer(authState.sessionToken);
    }
  }, [authState]);

  // Initialize and load restaurants data from backend API
  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log(`🌐 [MainViewModel] Fetching restaurants from backend: ${BACKEND_URL}/api/restaurants`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${BACKEND_URL}/api/restaurants`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Failed to fetch restaurants");
      const data = await res.json();

      // Retrieve all favorited restaurant models (cached or synced)
      const favs = await RestaurantDatabase.getAllFavourites();
      const favIds = new Set(favs.map(f => f.id));

      const liveRestaurants = (data.restaurants || [])
        .filter((r: any) => r.restaurantStatus === 'active')
        .map((r: any) => ({
          id: r.id,
          name: r.restaurantName,
          description: r.description || 'An elegant culinary destination showcasing modern gastronomy and world-class service.',
          image: r.restaurantBanner || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=60',
          rating: Number(r.rating || 0) > 0 ? Number(r.rating) : 4.2,
          reviewCount: r.ratingCount || 45,
          cuisine: Array.isArray(r.cuisine)
            ? r.cuisine.join(', ')
            : typeof r.cuisine === 'string'
              ? r.cuisine
              : r.restaurantType || 'Indian, Chinese',
          category: r.restaurantType?.split(',')[0] || 'Overall',
          dishesCategory: 'Specials',
          city: r.city || 'Bhubaneswar',
          isFavourite: favIds.has(r.id),
          phone: r.phoneNumber || '+91 70619 03429',
          email: r.email || 'info.myquro@gmail.com',
          address: r.restaurantAddress || 'Bhubaneswar, Odisha, India',
          isClosed: !r.isOpen,
          closedReason: r.isOpen ? '' : 'Kitchen offline',
          latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : undefined,
          longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : undefined,
        }));

      setAllRestaurants(liveRestaurants);
      await AsyncStorage.setItem('@all_restaurants', JSON.stringify(liveRestaurants));

      // Fetch menus for active restaurants asynchronously in the background
      Promise.all(
        liveRestaurants.map(async (restro: any) => {
          try {
            const menuRes = await fetch(`${BACKEND_URL}/api/menus/${restro.id}/menu`);
            if (menuRes.ok) {
              const menuData = await menuRes.json();
              const items: any[] = [];
              if (menuData.categories) {
                menuData.categories.forEach((cat: any) => {
                  if (cat.items) {
                    cat.items.forEach((item: any) => {
                      const variant = item.variants && item.variants[0];
                      const pricePaise = variant ? variant.price : 20000;
                      items.push({
                        id: item.id,
                        name: item.name,
                        restaurantId: restro.id,
                        restaurantName: restro.name,
                        price: Math.round(pricePaise / 100),
                        rating: (4 + Math.random() * 0.9).toFixed(1),
                        isVeg: item.isVeg !== undefined ? item.isVeg : true,
                        image: item.imageURL || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=60',
                        description: item.description || "A delicious freshly-prepared choice from our chef's selection.",
                        categoryName: cat.name || '',
                        variantId: variant ? variant.id : null,
                      });
                    });
                  }
                });
              }
              await AsyncStorage.setItem(`@menu_${restro.id}`, JSON.stringify(menuData));
              return items;
            }
          } catch (err) {
            // Background menu fetch
          }
          return [];
        })
      ).then(async (results) => {
        const flatFoods = results.flat();
        if (flatFoods.length > 0) {
          setFoodItems(flatFoods);
          await AsyncStorage.setItem('@all_food_items', JSON.stringify(flatFoods));
        }
      });
    } catch (error) {
      console.log("ℹ️ [MainViewModel] Backend not reachable:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadStoredAuthAndData = async () => {
      try {
        const secToken = await SecureStorage.getSessionToken();
        const stored = await AsyncStorage.getItem('@auth_state');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.type === 'Authenticated') {
            const tokenToUse = secToken || parsed.sessionToken || '';
            const restoredAuth: AuthState = {
              ...parsed,
              sessionToken: tokenToUse,
            };
            setAuthState(restoredAuth);
            if (tokenToUse) {
              fetchServerAddresses(tokenToUse);
            }
          } else {
            setAuthState({ type: 'Unauthenticated' });
          }
        } else {
          setAuthState({ type: 'Unauthenticated' });
        }
      } catch (err) {
        console.warn("[MainViewModel] Error loading persisted auth:", err);
        setAuthState({ type: 'Unauthenticated' });
      }
      try {
        const cachedRes = await AsyncStorage.getItem('@all_restaurants');
        if (cachedRes) {
          const parsed = JSON.parse(cachedRes);
          if (Array.isArray(parsed)) {
            setAllRestaurants(parsed);
          }
        }
        const cachedFoods = await AsyncStorage.getItem('@all_food_items');
        if (cachedFoods) {
          setFoodItems(JSON.parse(cachedFoods));
        }
      } catch (err) {
        console.warn("[MainViewModel] Error loading cached data:", err);
      }
      await loadData();
    };
    loadStoredAuthAndData();
  }, []);

  // Automatically clean up cart items for deleted/inactive restaurants
  useEffect(() => {
    if (isLoading) return;

    if (allRestaurants.length > 0) {
      const validCartItems = cartItems.filter(item =>
        allRestaurants.some(r => r.id === item.restaurantId)
      );
      if (validCartItems.length !== cartItems.length) {
        setCartItems(validCartItems);
        saveCartItems(validCartItems);
      }
    } else {
      if (cartItems.length > 0) {
        setCartItems([]);
        saveCartItems([]);
      }
    }
  }, [allRestaurants, isLoading, cartItems]);

  // Dynamically calculate distance and deliveryTime metrics for all restaurants relative to currentLocation
  useEffect(() => {
    if (allRestaurants.length === 0) {
      setAllRestaurantsWithMetrics([]);
      return;
    }

    const userLat = currentLocation.latitude;
    const userLng = currentLocation.longitude;

    // Fast, lightweight 0ms local Haversine distance and delivery ETA
    const calculatedList = allRestaurants.map(r => {
      if (!r.latitude || !r.longitude) {
        return { ...r, distance: 1.2, deliveryTime: 30 };
      }
      
      const dLat = (r.latitude - userLat) * Math.PI / 180;
      const dLon = (r.longitude - userLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLat * Math.PI / 180) * Math.cos(r.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = 6371 * c;
      const eta = Math.round(15 + dist * 3); // 15m kitchen prep + 3m per km transit
      
      return {
        ...r,
        distance: Number(dist.toFixed(1)),
        deliveryTime: eta
      };
    });

    setAllRestaurantsWithMetrics(calculatedList);
  }, [allRestaurants, currentLocation.latitude, currentLocation.longitude]);

  // Compute live combined flows for restaurants and favorites list (mimicking Kotlin Flow structure)
  useEffect(() => {
    const filtered = allRestaurantsWithMetrics.filter(res => {
      const cuisineStr = Array.isArray(res.cuisine)
        ? (res.cuisine as string[]).join(', ')
        : typeof res.cuisine === 'string'
          ? res.cuisine
          : '';

      const matchesQuery =
        searchQuery === '' ||
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cuisineStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTab =
        selectedCategoryTab === 'Overall' ||
        res.category.toLowerCase() === selectedCategoryTab.toLowerCase();

      const matchesDish =
        selectedDishCategory === null ||
        foodItems.some(food =>
          food.restaurantId === res.id && (
            food.name.toLowerCase().includes(selectedDishCategory.toLowerCase()) ||
            (food.description && food.description.toLowerCase().includes(selectedDishCategory.toLowerCase())) ||
            (food.categoryName && food.categoryName.toLowerCase().includes(selectedDishCategory.toLowerCase()))
          )
        ) ||
        cuisineStr.toLowerCase().includes(selectedDishCategory.toLowerCase());

      return matchesQuery && matchesTab && matchesDish;
    });

    setRestaurantsList(filtered);
    setFavouriteRestaurantsList(allRestaurantsWithMetrics.filter(res => res.isFavourite));
  }, [allRestaurantsWithMetrics, searchQuery, selectedCategoryTab, selectedDishCategory, foodItems]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const toggleBiometrics = () => setIsBiometricsEnabled(prev => !prev);

  const updateSearchQuery = (query: string) => setSearchQuery(query);
  const selectCategoryTab = (tab: string) => setSelectedCategoryTab(tab);

  const selectDishCategory = (dish: string | null) => {
    if (selectedDishCategory === dish) {
      setSelectedDishCategory(null);
    } else {
      setSelectedDishCategory(dish);
    }
  };

  const toggleFavourite = async (id: string) => {
    const restaurant = allRestaurants.find(r => r.id === id);
    if (restaurant) {
      await RestaurantRepository.toggleFavourite(restaurant);
      await loadData(); // refresh lists
    } else {
      console.warn(`[MainViewModel] Restaurant with id ${id} not found.`);
    }
  };

  const login = async (email: string, name: string, password?: string, isLogin?: boolean) => {
    setAuthState({ type: 'Loading' });
    try {
      const endpoint = isLogin ? '/api/auth/sign-in/email' : '/api/auth/sign-up/email';
      const body = isLogin ? { email, password } : { email, password, name };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Authentication failed');
      }

      const data = await response.json();
      const userRole = data?.user?.role || 'customer';
      const userName = data?.user?.name || name;
      const token = data?.token || data?.session?.token || '';

      const authenticatedState: AuthState = {
        type: 'Authenticated',
        username: userName,
        email: email,
        role: userRole as any,
        sessionToken: token,
        userId: data?.user?.id,
      };

      if (token) {
        await SecureStorage.setSessionToken(token);
      }
      setAuthState(authenticatedState);
      const safeAuthState = { ...authenticatedState, sessionToken: '' };
      await AsyncStorage.setItem('@auth_state', JSON.stringify(safeAuthState));
    } catch (error: any) {
      setAuthState({ type: 'Unauthenticated' });
      throw error;
    }
  };

  const sendOtp = async (phone: string, recaptchaToken?: string) => {
    // If Firebase is configured with valid API keys, use real-time Firebase SMS
    if (isFirebaseConfigured()) {
      try {
        const { sessionInfo } = await sendFirebasePhoneOtp(phone, recaptchaToken);
        if (sessionInfo) {
          setFirebaseSessionInfo(sessionInfo);
          return;
        }
      } catch (err: any) {
        console.warn("⚠️ [MainViewModel] Firebase Phone OTP failed, trying backend fallback:", err.message);
        throw err;
      }
    }

    // Fallback to Backend OTP route
    const response = await fetch(`${BACKEND_URL}/api/customer/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to send OTP. Please check the number and try again.');
    }
  };

  const setAuthenticatedState = async (state: AuthState) => {
    if (state.type === 'Authenticated' && state.sessionToken) {
      await SecureStorage.setSessionToken(state.sessionToken);
      fetchServerAddresses(state.sessionToken);
    }
    setAuthState(state);
    const safeAuthState = state.type === 'Authenticated' ? { ...state, sessionToken: '' } : state;
    await AsyncStorage.setItem('@auth_state', JSON.stringify(safeAuthState));
  };

  const verifyOtp = async (phone: string, otp: string, directIdToken?: string): Promise<AuthState> => {
    setAuthState({ type: 'Loading' });
    try {
      let data: any = null;

      // 1. Direct verified Firebase ID Token from webview bridge
      if (directIdToken) {
        try {
          const tokenResponse = await fetch(`${BACKEND_URL}/api/customer/auth/verify-firebase-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: directIdToken, phone }),
          });
          if (tokenResponse.ok) {
            data = await tokenResponse.json();
          }
        } catch (err: any) {
          console.warn("⚠️ [MainViewModel] verify-firebase-token failed:", err.message);
        }
      }

      // 2. If we have an active Firebase session, verify with Firebase first
      if (!data && firebaseSessionInfo && isFirebaseConfigured()) {
        try {
          const { idToken } = await verifyFirebasePhoneOtp(firebaseSessionInfo, otp);
          if (idToken) {
            // Send verified Firebase ID token to backend
            const tokenResponse = await fetch(`${BACKEND_URL}/api/customer/auth/verify-firebase-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken, phone }),
            });
            if (tokenResponse.ok) {
              data = await tokenResponse.json();
            }
          }
        } catch (firebaseErr: any) {
          console.warn("⚠️ [MainViewModel] Firebase verify failed, trying backend direct OTP:", firebaseErr.message);
        }
      }

      // 2. Direct backend verify fallback
      if (!data) {
        const response = await fetch(`${BACKEND_URL}/api/customer/auth/verify-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone, otp }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Invalid or expired OTP. Please try again.');
        }
        data = await response.json();
      }

      const userName = data?.user?.name || 'Customer';
      const userEmail = data?.user?.email || `${phone}@myquro.customer`;
      const userRole = data?.user?.role || 'customer';
      const token = data?.token || '';

      const authenticatedState: AuthState = {
        type: 'Authenticated',
        username: userName,
        email: userEmail,
        role: userRole as any,
        sessionToken: token,
        userId: data?.user?.id,
      };

      if (token) {
        await SecureStorage.setSessionToken(token);
        fetchServerAddresses(token);
      }
      setAuthState(authenticatedState);
      const safeAuthState = { ...authenticatedState, sessionToken: '' };
      await AsyncStorage.setItem('@auth_state', JSON.stringify(safeAuthState));
      return authenticatedState;
    } catch (error: any) {
      setAuthState({ type: 'Unauthenticated' });
      throw error;
    }
  };

  const logout = async () => {
    setAuthState({ type: 'Unauthenticated' });
    try {
      await SecureStorage.purgeAllCredentials();
      await AsyncStorage.removeItem('@auth_state');
    } catch (err) {
      console.warn("[MainViewModel] Error clearing persisted auth:", err);
    }
  };

  const deleteAccount = async (): Promise<void> => {
    const token = await getActiveToken();
    if (token) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/users/me`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok && res.status !== 404) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to delete account on server. Please try again later.');
        }
      } catch (e: any) {
        console.warn('[MainViewModel] Account deletion backend request notice:', e);
      }
    }
    await logout();
  };

  const updateProfile = (name: string, email: string) => {
    if (authState.type === 'Authenticated') {
      const updatedState: AuthState = {
        ...authState,
        username: name,
        email: email,
      };
      setAuthState(updatedState);
      AsyncStorage.setItem('@auth_state', JSON.stringify(updatedState)).catch(err => {
        console.error("❌ [MainViewModel] Error saving updated profile auth:", err);
      });
    }
  };

  const scanQrCode = (scannedContent: string) => {
    setQrResult(scannedContent);
    const lowercaseContent = scannedContent.toLowerCase();

    const matchedRes = allRestaurants.find(r => 
      r.id === scannedContent || 
      r.name.toLowerCase().includes(lowercaseContent) ||
      (r as any).slug === scannedContent
    ) || allRestaurants[0];

    setScannedRestaurant(matchedRes || null);
    setShowInvoiceDialog(true);
  };

  const clearQrResult = () => {
    setQrResult(null);
    setScannedRestaurant(null);
    setShowInvoiceDialog(false);
  };

  const uploadProfileAvatar = (uri: string) => {
    setProfileImageUri(uri);
  };

  const normalizeRupeePrice = (raw: any): number => {
    let num = typeof raw === 'number' ? raw : (parseFloat(String(raw || 0)) || 0);
    if (isNaN(num) || num <= 0) return 0;
    if (num >= 1000 && num % 100 === 0) {
      num = num / 100;
    } else if (num >= 2000) {
      num = num / 100;
    }
    return Math.round(num);
  };

  const addToCart = (item: any) => {
    const qtyToAdd = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
    const resolvedPrice = normalizeRupeePrice(item.price);

    if (cartItems.length > 0 && cartItems[0].restaurantId !== item.restaurantId) {
      const currentRestro = cartItems[0].restaurantName || 'another restaurant';
      Alert.alert(
        "Replace cart items?",
        `Your cart contains items from ${currentRestro}. Do you want to discard them and add items from ${item.restaurantName || 'this restaurant'}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            onPress: () => {
              const newItem: CartItem = {
                id: item.id,
                name: item.name,
                price: resolvedPrice,
                quantity: qtyToAdd,
                image: item.image,
                isVeg: item.isVeg ?? false,
                description: item.description || '',
                restaurantId: item.restaurantId,
                restaurantName: item.restaurantName || '',
                variantId: item.variantId || null,
                customization: item.customization || undefined,
              };
              setCartItems([newItem]);
              saveCartItems([newItem]);
            }
          }
        ]
      );
    } else {
      const existingIndex = cartItems.findIndex(i => i.id === item.id);
      let updated: CartItem[];
      if (existingIndex > -1) {
        updated = [...cartItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          price: resolvedPrice > 0 ? resolvedPrice : updated[existingIndex].price,
          quantity: updated[existingIndex].quantity + qtyToAdd,
        };
      } else {
        const newItem: CartItem = {
          id: item.id,
          name: item.name,
          price: resolvedPrice,
          quantity: qtyToAdd,
          image: item.image,
          isVeg: item.isVeg ?? false,
          description: item.description || '',
          restaurantId: item.restaurantId,
          restaurantName: item.restaurantName || '',
          variantId: item.variantId || null,
          customization: item.customization || undefined,
        };
        updated = [...cartItems, newItem];
      }
      setCartItems(updated);
      saveCartItems(updated);
    }
  };

  const addMultipleToCart = (items: any[]) => {
    if (!items || items.length === 0) return;
    const restId = items[0].restaurantId;
    const restName = items[0].restaurantName || '';

    const formattedNewItems: CartItem[] = items.map(it => {
      const resolvedPrice = normalizeRupeePrice(it.price);
      const qty = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1;
      return {
        id: it.id,
        name: it.name,
        price: resolvedPrice,
        quantity: qty,
        image: it.image,
        isVeg: it.isVeg ?? false,
        description: it.description || '',
        restaurantId: restId,
        restaurantName: restName,
        variantId: it.variantId || null,
        customization: it.customization || undefined,
      };
    });

    if (cartItems.length > 0 && cartItems[0].restaurantId !== restId) {
      const currentRestro = cartItems[0].restaurantName || 'another restaurant';
      Alert.alert(
        "Replace cart items?",
        `Your cart contains items from ${currentRestro}. Do you want to discard them and add ${formattedNewItems.length} item(s) from ${restName || 'this restaurant'}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            onPress: () => {
              setCartItems(formattedNewItems);
              saveCartItems(formattedNewItems);
            }
          }
        ]
      );
      return;
    }

    // Merge atomically with existing cart items
    const updated = [...cartItems];
    formattedNewItems.forEach(newItem => {
      const existingIdx = updated.findIndex(i => i.id === newItem.id);
      if (existingIdx > -1) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + newItem.quantity,
        };
      } else {
        updated.push(newItem);
      }
    });

    setCartItems(updated);
    saveCartItems(updated);
  };

  const removeFromCart = (itemId: string) => {
    const updated = cartItems.filter(i => i.id !== itemId);
    setCartItems(updated);
    saveCartItems(updated);
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      const updated = cartItems.map(i => {
        if (i.id === itemId) {
          return { ...i, quantity };
        }
        return i;
      });
      setCartItems(updated);
      saveCartItems(updated);
    }
  };

  const clearCart = () => {
    setCartItems([]);
    saveCartItems([]);
  };

  const syncCartItems = (items: CartItem[]) => {
    setCartItems(items);
    saveCartItems(items);
  };

  const checkoutCart = async (notes?: string, customItems?: any[]) => {
    const itemsToUse = customItems || cartItems;
    if (itemsToUse.length === 0) {
      throw new Error("Cart is empty");
    }
    try {
      const token = authState.type === 'Authenticated' ? authState.sessionToken : null;
      const body = {
        restaurantId: itemsToUse[0].restaurantId,
        notes: notes || "",
        items: itemsToUse.map(item => ({
          menuItemId: item.id,
          menuItemVariantId: item.variantId || "",
          quantity: item.quantity,
          extras: (item.customization?.extras || []).map((e: any) => ({
            extraId: e.id || e.extraId,
            name: e.name,
            price: e.price,
            quantity: 1,
          })),
          itemNotes: (item.customization?.extras && item.customization.extras.length > 0)
            ? `Add-ons: ${item.customization.extras.map((e: any) => e.name).join(', ')}`
            : undefined,
        })),
        status: "placed"
      };
      const response = await fetch(`${BACKEND_URL}/api/orders/make-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to place order");
      }
      const resData = await response.json();
      setCartItems([]);
      await AsyncStorage.removeItem('@cart_items');
      return resData;
    } catch (err) {
      console.error("❌ [MainViewModel] Error during checkout:", err);
      throw err;
    }
  };

  return (
    <ViewModelContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        isBiometricsEnabled,
        toggleBiometrics,
        authState,
        login,
        sendOtp,
        verifyOtp,
        setAuthenticatedState,
        logout,
        deleteAccount,
        categories,
        cuisines,
        searchQuery,
        updateSearchQuery,
        selectedCategoryTab,
        selectCategoryTab,
        selectedDishCategory,
        selectDishCategory,
        restaurantsList,
        allRestaurants: allRestaurantsWithMetrics,
        favouriteRestaurantsList,
        toggleFavourite,
        qrResult,
        scannedRestaurant,
        showInvoiceDialog,
        scanQrCode,
        clearQrResult,
        profileImageUri,
        uploadProfileAvatar,
        foodItems,
        updateProfile,
        cartItems,
        addToCart,
        addMultipleToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        syncCartItems,
        checkoutCart,
        savedAddresses,
        addSavedAddress,
        updateSavedAddress,
        deleteSavedAddress,
        isLoading,
        currentLocation,
        setCurrentLocation: updateCurrentLocation,
        userOrders,
        refreshUserOrders,
      }}
    >
      {children}
    </ViewModelContext.Provider>
  );
};

export const useViewModel = (): ViewModelContextType => {
  const context = useContext(ViewModelContext);
  if (!context) {
    throw new Error('useViewModel must be used within a ViewModelProvider');
  }
  return context;
};
