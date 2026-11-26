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
import { cleanLocationLabel } from '../services/LocationService';
import {
  MAX_DELIVERY_RADIUS_KM,
  isValidCoordPair,
  computeHaversineKm,
  checkCustomerServiceability,
} from '../utils/serviceability';

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
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<AuthState>;
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
  isAddressesLoading: boolean;
  refreshSavedAddresses: () => Promise<void>;
  addSavedAddress: (addr: Omit<SavedAddress, 'id'>) => Promise<SavedAddress | null>;
  updateSavedAddress: (addr: SavedAddress) => Promise<boolean>;
  deleteSavedAddress: (id: string) => Promise<boolean>;
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
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global currentLocation state
  const [currentLocation, setCurrentLocation] = useState({
    label: "",
    address: "",
    latitude: 0,
    longitude: 0,
  });

  const updateCurrentLocation = async (loc: typeof currentLocation) => {
    const cleanLoc = {
      ...loc,
      label: cleanLocationLabel(loc.label),
    };
    setCurrentLocation(cleanLoc);
    try {
      await AsyncStorage.setItem('@current_location', JSON.stringify(cleanLoc));
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
          const parsed = JSON.parse(storedLoc);
          setCurrentLocation({
            ...parsed,
            label: cleanLocationLabel(parsed.label),
          });
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
      // Hydrate persisted orders from cache so past orders never disappear on startup/network fluctuation
      try {
        const storedOrders = await AsyncStorage.getItem('@myquro_persisted_user_orders');
        if (storedOrders) {
          const parsed = JSON.parse(storedOrders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUserOrders(parsed);
          }
        }
      } catch (err) {
        console.error("❌ [MainViewModel] Error loading cached user orders:", err);
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

  // Fetch user order history strictly from database
  const refreshUserOrders = async () => {
    try {
      let remoteOrders: any[] = [];
      let userId: string | null = null;
      let sessionToken: string | null = null;
      let userPhone: string | null = null;

      if (authState.type === 'Authenticated') {
        userId = (authState as any).userId || (authState as any).user?.id || (authState as any).id || null;
        sessionToken = authState.sessionToken || null;
        const rawEmail = (authState as any).email || (authState as any).user?.email || '';
        if (rawEmail.includes('@myquro.customer')) {
          userPhone = rawEmail.replace('@myquro.customer', '');
        } else if ((authState as any).phone || (authState as any).user?.phone) {
          userPhone = (authState as any).phone || (authState as any).user?.phone;
        }
      }

      if (!userId || !sessionToken || !userPhone) {
        try {
          const secToken = await SecureStorage.getSessionToken();
          if (secToken) sessionToken = sessionToken || secToken;
          const stored = await AsyncStorage.getItem('@auth_state');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.sessionToken) sessionToken = sessionToken || parsed.sessionToken;
            if (parsed?.userId || parsed?.user?.id || parsed?.id) {
              userId = userId || (parsed.userId || parsed.user?.id || parsed.id);
            }
            if (!userPhone) {
              const rawEmail = parsed?.email || parsed?.user?.email || '';
              if (rawEmail.includes('@myquro.customer')) {
                userPhone = rawEmail.replace('@myquro.customer', '');
              } else if (parsed?.phone || parsed?.user?.phone) {
                userPhone = parsed.phone || parsed.user?.phone;
              }
            }
          }
        } catch (e) {}
      }

      if (userId && sessionToken) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/orders/${userId}/user-orders`, {
            headers: { Authorization: `Bearer ${sessionToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.orders && Array.isArray(data.orders)) {
              remoteOrders = data.orders;
            } else if (Array.isArray(data)) {
              remoteOrders = data;
            }
          }
        } catch (e) {
          console.warn('[MainViewModel] Error fetching user orders from server:', e);
        }
      }

      // Parse delivery address and coordinates from notes if structured
      remoteOrders = remoteOrders.map((o: any) => {
        let deliveryAddress = o.deliveryAddress;
        let customerLatitude = o.customerLatitude || o.customer_latitude || o.latitude;
        let customerLongitude = o.customerLongitude || o.customer_longitude || o.longitude;
        if (o.notes && typeof o.notes === 'string') {
          try {
            if (o.notes.startsWith('{') && o.notes.endsWith('}')) {
              const parsed = JSON.parse(o.notes);
              if (!deliveryAddress && parsed.address) deliveryAddress = parsed.address;
              if (!customerLatitude && parsed.latitude) customerLatitude = Number(parsed.latitude);
              if (!customerLongitude && parsed.longitude) customerLongitude = Number(parsed.longitude);
            }
          } catch {}
        }
        return {
          ...o,
          deliveryAddress,
          customerLatitude: customerLatitude ? Number(customerLatitude) : undefined,
          customerLongitude: customerLongitude ? Number(customerLongitude) : undefined,
        };
      });

      // Persist orders reliably and guard against accidental clearing
      if (remoteOrders.length > 0) {
        setUserOrders(remoteOrders);
        try {
          await AsyncStorage.setItem('@myquro_persisted_user_orders', JSON.stringify(remoteOrders));
        } catch (e) {}
      } else {
        // If remote call returned empty or failed due to network latency, preserve cached orders
        try {
          const cached = await AsyncStorage.getItem('@myquro_persisted_user_orders');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setUserOrders(parsed);
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('[MainViewModel] Error in refreshUserOrders:', err);
    }
  };

  // Fetch addresses directly from PostgreSQL backend
  const fetchServerAddresses = async (token?: string): Promise<void> => {
    const activeToken = token || (await getActiveToken());
    if (!activeToken) {
      console.log(`ℹ️ [MainViewModel] No active token found, skipping server addresses fetch.`);
      return;
    }
    setIsAddressesLoading(true);
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
          console.log(`✅ [MainViewModel] Synced ${data.length} addresses from PostgreSQL database`);
          setSavedAddresses(data);
          await persistAddresses(data);
        }
      } else {
        console.warn(`⚠️ [MainViewModel] Server returned ${res.status} fetching addresses`);
      }
    } catch (err) {
      console.warn("⚠️ [MainViewModel] Failed to sync addresses from server:", err);
    } finally {
      setIsAddressesLoading(false);
    }
  };

  const refreshSavedAddresses = fetchServerAddresses;

  const addSavedAddress = async (addr: Omit<SavedAddress, 'id'>): Promise<SavedAddress | null> => {
    const token = await getActiveToken();
    if (!token) {
      console.warn("⚠️ [MainViewModel] No active user token found when saving address to DB");
      const tempId = `addr_${Date.now()}`;
      const localAddr: SavedAddress = { ...addr, id: tempId };
      const updated = [...savedAddresses, localAddr];
      setSavedAddresses(updated);
      await persistAddresses(updated);
      return localAddr;
    }

    try {
      console.log(`🌐 [MainViewModel] Saving new address directly to cloud database...`);
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
        const realId = resData.id || resData.address?.id;
        const savedAddr: SavedAddress = {
          ...addr,
          id: realId || `addr_${Date.now()}`,
          ...(resData.address || {}),
        };
        console.log(`✅ [MainViewModel] Address saved to DB with ID:`, savedAddr.id);
        const updated = [...savedAddresses, savedAddr];
        setSavedAddresses(updated);
        await persistAddresses(updated);
        return savedAddr;
      } else {
        const errText = await res.text();
        console.warn("⚠️ [MainViewModel] Server error saving address:", res.status, errText);
      }
    } catch (e) {
      console.warn("⚠️ [MainViewModel] Failed to save address to DB:", e);
    }

    const fallbackId = `addr_${Date.now()}`;
    const fallbackAddr: SavedAddress = { ...addr, id: fallbackId };
    const updated = [...savedAddresses, fallbackAddr];
    setSavedAddresses(updated);
    await persistAddresses(updated);
    return fallbackAddr;
  };

  const updateSavedAddress = async (addr: SavedAddress): Promise<boolean> => {
    const updated = savedAddresses.map(a => a.id === addr.id ? addr : a);
    setSavedAddresses(updated);
    await persistAddresses(updated);

    const token = await getActiveToken();
    if (token) {
      try {
        console.log(`🌐 [MainViewModel] Updating address in DB (${addr.id})...`);
        const res = await fetch(`${BACKEND_URL}/api/delivery/addresses/${addr.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addr),
        });
        if (res.ok) {
          console.log(`✅ [MainViewModel] Address updated in DB:`, addr.id);
          return true;
        } else {
          console.warn("⚠️ [MainViewModel] Failed to update address in DB, status:", res.status);
          return false;
        }
      } catch (e) {
        console.warn("⚠️ [MainViewModel] Failed to update address in DB:", e);
        return false;
      }
    }
    return true;
  };

  const deleteSavedAddress = async (id: string): Promise<boolean> => {
    const updated = savedAddresses.filter(a => a.id !== id);
    setSavedAddresses(updated);
    await persistAddresses(updated);

    const token = await getActiveToken();
    if (token) {
      try {
        console.log(`🌐 [MainViewModel] Deleting address in DB (${id})...`);
        const res = await fetch(`${BACKEND_URL}/api/delivery/addresses/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          console.log(`✅ [MainViewModel] Address deleted from DB:`, id);
          return true;
        } else {
          console.warn("⚠️ [MainViewModel] Failed to delete address from DB, status:", res.status);
          return false;
        }
      } catch (e) {
        console.warn("⚠️ [MainViewModel] Failed to delete address from DB:", e);
        return false;
      }
    }
    return true;
  };

  // Sync server data when authenticated
  useEffect(() => {
    if (authState.type === 'Authenticated' && authState.sessionToken) {
      fetchServerAddresses(authState.sessionToken);
      RestaurantDatabase.syncWithServer(authState.sessionToken);
    }
  }, [authState]);

  // Helper to map any raw restaurant record from backend or direct Neon DB query
  const formatRestaurantRecord = (r: any, favIds: Set<string>): Restaurant => {
    const rawType = (r.restaurantType || r.restaurant_type || '').trim();
    const rawName = (r.restaurantName || r.restaurant_name || 'Restaurant').trim();
    const rawCuisine = Array.isArray(r.cuisine)
      ? r.cuisine.join(', ')
      : typeof r.cuisine === 'string'
        ? r.cuisine
        : rawType || 'Indian, Chinese';

    // Explicit non-veg keywords that strictly prevent pure veg classification
    const hasNonVegKeywords = /non-?veg|chicken|mutton|fish|meat|beef|pork|prawn|seafood|kebab|biryani.*chicken/i.test(
      `${rawType} ${rawName} ${rawCuisine}`
    );

    // Pure veg qualification based on restaurant type and details
    const isPureVeg = !hasNonVegKeywords && (
      /pure\s*veg|vegetarian|100%\s*veg|jain/i.test(rawType) ||
      /pure\s*veg|vegetarian|100%\s*veg|jain/i.test(rawName) ||
      (r.isPureVeg === true) ||
      (r.category?.toLowerCase() === 'veg')
    );

    const isOpenFlag = r.isOpen !== undefined ? r.isOpen : r.is_open;
    const snoozedUntil = r.snoozedUntil ?? r.snoozed_until ?? null;
    const autoPausedUntil = r.autoPausedUntil ?? r.auto_paused_until ?? null;
    const restaurantStatus = r.restaurantStatus ?? r.restaurant_status ?? 'active';
    const isSnoozed = snoozedUntil ? new Date(snoozedUntil).getTime() > Date.now() : false;
    const isAutoPaused = autoPausedUntil ? new Date(autoPausedUntil).getTime() > Date.now() : false;
    const isClosed = !isOpenFlag || isSnoozed || isAutoPaused || String(restaurantStatus).toLowerCase() !== 'active';

    return {
      id: r.id,
      name: rawName,
      restaurantType: rawType,
      isPureVeg,
      description: r.description || 'An elegant culinary destination showcasing modern gastronomy and world-class service.',
      image: r.restaurantBanner || r.restaurant_banner || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&auto=format&fit=crop&q=60',
      rating: Number(r.rating || 0) > 0 ? Number(Number(r.rating).toFixed(1)) : 0,
      reviewCount: Number(r.ratingCount || r.rating_count || 0),
      cuisine: rawCuisine,
      category: (rawType || 'Overall').split(',')[0],
      dishesCategory: 'Specials',
      city: r.city || '',
      isFavourite: favIds.has(r.id),
      phone: r.phoneNumber || r.phone_number || '',
      email: r.email || '',
      address: r.restaurantAddress || r.restaurant_address || '',
      isOpen: Boolean(isOpenFlag),
      isClosed,
      closedReason: isClosed ? 'Currently offline • Should be back soon' : '',
      restaurantStatus,
      snoozedUntil,
      autoPausedUntil,
      isServiceable: typeof r.isServiceable === 'boolean' ? r.isServiceable : undefined,
      unserviceableReason: r.unserviceableReason ?? null,
      latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : undefined,
      longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : undefined,
    };
  };

  // Initialize and load restaurants data from backend API with instant Neon DB fallback
  const loadData = async () => {
    setIsLoading(true);
    let rawList: any[] = [];
    const favs = await RestaurantDatabase.getAllFavourites();
    const favIds = new Set(favs.map(f => f.id));

    // Stage 1: Try Primary Backend API with generous 12s timeout for Render cold starts
    try {
      const hasValidLoc = isValidCoordPair(currentLocation?.latitude, currentLocation?.longitude);
      const restUrl = hasValidLoc
        ? `${BACKEND_URL}/api/restaurants?lat=${encodeURIComponent(String(currentLocation.latitude))}&lng=${encodeURIComponent(String(currentLocation.longitude))}&includeAll=true`
        : `${BACKEND_URL}/api/restaurants`;
      console.log(`🌐 [MainViewModel] Fetching restaurants from backend: ${restUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(restUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.restaurants && Array.isArray(data.restaurants)) {
          rawList = data.restaurants.filter((r: any) => r.restaurantStatus === 'active');
        }
      }
    } catch (backendErr) {
      console.log("ℹ️ [MainViewModel] Primary backend slow/unreachable:", backendErr);
    }

    // Process and persist restaurants (relying cleanly on backend API + local cache)
    let liveRestaurants: Restaurant[] = [];
    if (rawList.length > 0) {
      liveRestaurants = rawList.map(r => formatRestaurantRecord(r, favIds));
      setAllRestaurants(liveRestaurants);
      await AsyncStorage.setItem('@all_restaurants', JSON.stringify(liveRestaurants));
    } else {
      // Use cached if available, else fallback to default verified seed
      const cached = await AsyncStorage.getItem('@all_restaurants');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            liveRestaurants = parsed;
            setAllRestaurants(liveRestaurants);
          }
        } catch {}
      }
      if (liveRestaurants.length === 0) {
        setAllRestaurants([]);
      }
    }

    // Stage 4: Background Menu Loading (Backend with Neon DB fallback)
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
        } catch {
          // Fall through to Neon DB menu query
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

    setIsLoading(false);
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
              refreshUserOrders();
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAllRestaurants(parsed);
          } else {
            setAllRestaurants([]);
          }
        } else {
          setAllRestaurants([]);
        }
        const cachedFoods = await AsyncStorage.getItem('@all_food_items');
        if (cachedFoods) {
          setFoodItems(JSON.parse(cachedFoods));
        }
      } catch (err) {
        console.warn("[MainViewModel] Error loading cached data:", err);
        setAllRestaurants([]);
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
    const hasValidUserCoords = isValidCoordPair(userLat, userLng);

    // Local Haversine distance & strict delivery radius / status serviceability (never invent fake distances)
    const calculatedList = allRestaurants.map((r) => {
      if (!hasValidUserCoords) {
        return {
          ...r,
          distance: undefined,
          deliveryTime: r.deliveryTime || undefined,
        };
      }

      if (!isValidCoordPair(r.latitude, r.longitude)) {
        return {
          ...r,
          distance: undefined,
          deliveryTime: undefined,
          isServiceable: false,
          unserviceableReason: 'Restaurant delivery coordinates missing',
        };
      }

      const dist = computeHaversineKm(userLat, userLng, Number(r.latitude), Number(r.longitude));
      const svc = checkCustomerServiceability(r, userLat, userLng, MAX_DELIVERY_RADIUS_KM);
      const eta = svc.estimatedDeliveryMinutes ?? Math.max(15, Math.min(60, Math.round(14 + dist * 3.5)));

      return {
        ...r,
        distance: dist,
        deliveryTime: eta,
        isServiceable: svc.isServiceable,
        unserviceableReason: svc.reason || null,
      };
    });

    setAllRestaurantsWithMetrics(calculatedList);
  }, [allRestaurants, currentLocation.latitude, currentLocation.longitude]);

  // Compute live combined flows for restaurants and favorites list (enforce delivery radius when GPS is known)
  useEffect(() => {
    const hasValidUserCoords = isValidCoordPair(currentLocation?.latitude, currentLocation?.longitude);

    const filtered = allRestaurantsWithMetrics.filter(res => {
      if (hasValidUserCoords) {
        if (!isValidCoordPair(res.latitude, res.longitude)) return false;
        if (typeof res.distance !== 'number' || res.distance > MAX_DELIVERY_RADIUS_KM) return false;
      }

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

    filtered.sort((a, b) => {
      const aAvail = a.isServiceable !== false && !a.isClosed;
      const bAvail = b.isServiceable !== false && !b.isClosed;
      if (aAvail !== bAvail) return aAvail ? -1 : 1;
      return (a.distance ?? Number.MAX_SAFE_INTEGER) - (b.distance ?? Number.MAX_SAFE_INTEGER);
    });

    setRestaurantsList(filtered);
    setFavouriteRestaurantsList(allRestaurantsWithMetrics.filter(res => res.isFavourite));
  }, [allRestaurantsWithMetrics, searchQuery, selectedCategoryTab, selectedDishCategory, foodItems, currentLocation.latitude, currentLocation.longitude]);

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
        fetchServerAddresses(token);
      }
      setAuthState(authenticatedState);
      await AsyncStorage.setItem('@auth_state', JSON.stringify(authenticatedState));
    } catch (error: any) {
      setAuthState({ type: 'Unauthenticated' });
      throw error;
    }
  };

  const sendOtp = async (phone: string) => {
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
      refreshUserOrders();
    }
    setAuthState(state);
    await AsyncStorage.setItem('@auth_state', JSON.stringify(state));
  };

  const verifyOtp = async (phone: string, otp: string): Promise<AuthState> => {
    setAuthState({ type: 'Loading' });
    try {
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

      const data = await response.json();
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
      await AsyncStorage.setItem('@auth_state', JSON.stringify(authenticatedState));
      return authenticatedState;
    } catch (error: any) {
      setAuthState({ type: 'Unauthenticated' });
      throw error;
    }
  };

  const logout = async () => {
    setAuthState({ type: 'Unauthenticated' });
    setSavedAddresses([]);
    try {
      await SecureStorage.purgeAllCredentials();
      await AsyncStorage.removeItem('@auth_state');
      await AsyncStorage.removeItem('@saved_addresses');
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
      const currentUserId = (authState as any)?.userId || (authState as any)?.user?.id || (authState as any)?.id || undefined;
      const currentPhone = (authState as any)?.email ? (authState as any).email.replace('@myquro.customer', '') : undefined;

      let parsedNotes: any = {};
      if (notes && typeof notes === 'string' && notes.trim().startsWith('{')) {
        try {
          parsedNotes = JSON.parse(notes);
        } catch {}
      }
      const deliveryLat = parsedNotes.latitude ?? currentLocation?.latitude;
      const deliveryLng = parsedNotes.longitude ?? currentLocation?.longitude;
      const deliveryAddress =
        parsedNotes.address ||
        parsedNotes.mapAddress ||
        currentLocation?.address ||
        '';

      const targetRestaurant = allRestaurants.find(
        (r) => String(r.id) === String(itemsToUse[0].restaurantId)
      );
      if (targetRestaurant) {
        const svc = checkCustomerServiceability(targetRestaurant, deliveryLat, deliveryLng, MAX_DELIVERY_RADIUS_KM);
        if (!svc.isServiceable) {
          throw new Error(svc.reason || 'This restaurant does not deliver to your selected address.');
        }
      } else if (!isValidCoordPair(deliveryLat, deliveryLng)) {
        throw new Error('Please select a valid delivery location with GPS before placing your order.');
      }

      const resolvedPaymentMethod = String(parsedNotes.paymentMethod || '').trim();
      if (!resolvedPaymentMethod) {
        throw new Error('Payment method is required before placing an order.');
      }

      const body = {
        userId: currentUserId,
        customerPhone: currentPhone,
        restaurantId: itemsToUse[0].restaurantId,
        latitude: Number(deliveryLat),
        longitude: Number(deliveryLng),
        deliveryAddress,
        paymentMethod: resolvedPaymentMethod,
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
      refreshUserOrders().catch(() => {});
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
        isAddressesLoading,
        refreshSavedAddresses,
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
