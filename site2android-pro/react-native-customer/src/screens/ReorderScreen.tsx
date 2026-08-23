import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
  ToastAndroid,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config';
import {
  X,
  Plus,
  Minus,
  Heart,
} from 'lucide-react-native';

import { useViewModel } from '../state/MainViewModel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_WIDTH / 390, 0.88), 1.15);

// ─── Direct Figma Assets from Node 3043:106 ─────────────────────────────────
const figmaBackArrow    = require('../assets/reorder/figma_back_arrow.png');
const figmaSearchLens   = require('../assets/reorder/figma_search_lens.png');
const figmaMicGold      = require('../assets/reorder/figma_mic_gold.png');
const figmaStarGold     = require('../assets/reorder/figma_star_gold.png');
const figmaMaharajaImg  = require('../assets/reorder/figma_maharaja_img.png');
const figmaDominosImg   = require('../assets/reorder/figma_dominos_img.png');
const figmaKfcImg       = require('../assets/reorder/figma_kfc_img.png');
const figmaTagDiscount  = require('../assets/reorder/figma_tag_discount.png');
const figmaClockYellow  = require('../assets/reorder/figma_clock_yellow.png');
const figmaVegIcon      = require('../assets/reorder/figma_veg_icon.png');
const figmaNonVegIcon   = require('../assets/reorder/figma_nonveg_icon.png');
const figmaPlusBtn      = require('../assets/reorder/figma_plus_btn.png');

interface ReorderScreenProps {
  onNavigateToRestaurant: (id: string, orderId?: string | null, openCheckout?: boolean) => void;
  onNavigateToCheckout?: (cartItems?: any[], restaurantId?: string) => void;
  onNavigateToHome?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSearch?: () => void;
}

interface DishItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  isVeg: boolean;
  available: boolean;
}

interface RestaurantReorderCard {
  id: string;
  restaurantId: string;
  name: string;
  deliveryTime: string;
  discountPromo: string;
  hasOneBenefits: boolean;
  image: any;
  isFavorite: boolean;
  available: boolean;
  unavailableReason?: string;
  dishes: DishItem[];
}

export const ReorderScreen: React.FC<ReorderScreenProps> = ({
  onNavigateToRestaurant,
  onNavigateToCheckout,
  onNavigateToHome,
}) => {
  const { syncCartItems, authState, allRestaurants = [], foodItems = [] } = useViewModel();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FAVOURITES' | 'PRICE_149_300' | 'PRICE_ABOVE_300'>('ALL');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  useEffect(() => {
    const fetchUserOrders = async () => {
      setIsLoading(true);
      try {
        let remoteOrders: any[] = [];
        const userId = authState.type === 'Authenticated' ? ((authState as any).userId || (authState as any).user?.id) : null;
        const sessionToken = authState.type === 'Authenticated' ? authState.sessionToken : '';

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
            console.warn('[ReorderScreen] Error fetching user orders:', e);
          }
        }

        let localOrders: any[] = [];
        try {
          const localData = await AsyncStorage.getItem('@placed_orders_history');
          if (localData) {
            localOrders = JSON.parse(localData);
          }
        } catch (e) {}

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

        setOrders(combined);
      } catch (err) {
        console.warn('[ReorderScreen] Error loading past orders:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserOrders();
  }, [authState]);

  const reorderRestaurants: RestaurantReorderCard[] = useMemo(() => {
    if (orders.length === 0) {
      // Dynamic fallback based on real menu items from foodItems when there is no order history yet
      return allRestaurants.slice(0, 3).map((r: any) => {
        const restDishes = foodItems.filter(f => f.restaurantId === r.id).slice(0, 3).map(f => ({
          id: f.id,
          name: f.name,
          price: f.price,
          isVeg: f.isVeg !== false,
          available: true,
        }));
        
        const fallbackDishes = restDishes.length > 0 ? restDishes : [
          {
            id: 'item_seed_1',
            name: 'Chicken Dum Biryani',
            price: 199,
            isVeg: false,
            available: true,
          }
        ];

        return {
          id: `seed_${r.id}`,
          restaurantId: r.id,
          name: r.name,
          deliveryTime: r.deliveryTime ? `${r.deliveryTime} mins` : '20–25 mins',
          discountPromo: 'Flat 20% OFF',
          hasOneBenefits: true,
          image: r.image ? { uri: r.image } : figmaMaharajaImg,
          isFavorite: !!favorites[`seed_${r.id}`],
          available: !r.isClosed,
          dishes: fallbackDishes,
        };
      });
    }

    return orders.map((o: any, idx: number) => {
      const restId = o.restaurantId || 'D2nCXr-XW_De3z7yBYeVc';
      const matchingRest = allRestaurants.find(r => r.id === restId);
      
      const dishesList = (o.items || []).map((item: any) => {
        const dishId = item.id || item.menuItemId || 'item_1';
        const dishPrice = typeof item.price === 'number' ? (item.price > 1000 ? Math.round(item.price / 100) : item.price) : (typeof item.unitPrice === 'number' ? Math.round(item.unitPrice / 100) : 150);
        return {
          id: dishId,
          name: item.name || item.menuItemName || 'Special Item',
          price: dishPrice,
          isVeg: item.isVeg !== undefined ? item.isVeg : true,
          available: true,
        };
      });

      return {
        id: o.id || `ord_${idx}`,
        restaurantId: restId,
        name: o.restaurantName || matchingRest?.name || 'Hotel Mayfair',
        deliveryTime: '20–30 mins',
        discountPromo: '70% off upto ₹140 +',
        hasOneBenefits: true,
        image: matchingRest?.image ? { uri: matchingRest.image } : figmaMaharajaImg,
        isFavorite: !!favorites[o.id || `ord_${idx}`],
        available: matchingRest ? !matchingRest.isClosed : true,
        dishes: dishesList,
      };
    });
  }, [orders, allRestaurants, foodItems, favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = !prev[id];
      showToast(next ? 'Added to Favourites' : 'Removed from Favourites');
      return { ...prev, [id]: next };
    });
  };

  const handleAddItem = (dish: DishItem, rest: RestaurantReorderCard) => {
    const newQty = (itemQuantities[dish.id] || 0) + 1;
    setItemQuantities((prev) => ({ ...prev, [dish.id]: newQty }));

    const simItem = {
      id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity: newQty,
      restaurantId: rest.restaurantId,
    };

    syncCartItems([simItem as any]);
    showToast(`Added "${dish.name}" to cart`);
  };

  const handleRemoveItem = (dish: DishItem) => {
    const currentQty = itemQuantities[dish.id] || 0;
    if (currentQty <= 1) {
      setItemQuantities((prev) => {
        const copy = { ...prev };
        delete copy[dish.id];
        return copy;
      });
      showToast(`Removed "${dish.name}" from cart`);
    } else {
      setItemQuantities((prev) => ({ ...prev, [dish.id]: currentQty - 1 }));
    }
  };

  // Filter List
  const filteredList = reorderRestaurants.filter((rest) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      rest.name.toLowerCase().includes(q) ||
      rest.dishes.some((d) => d.name.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeFilter === 'FAVOURITES') {
      return favorites[rest.id];
    }
    if (activeFilter === 'PRICE_149_300') {
      return rest.dishes.some((d) => d.price >= 149 && d.price <= 300);
    }
    if (activeFilter === 'PRICE_ABOVE_300') {
      return rest.dishes.some((d) => d.price > 300 || (d.originalPrice && d.originalPrice > 300));
    }
    return true;
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ─── [1] TOP HEADER ─── (node 3043:202) */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => {
            if (onNavigateToHome) onNavigateToHome();
          }}
        >
          <Image source={figmaBackArrow} style={styles.backArrowImg} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>REORDER</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* ─── [2 - STICKY] SEARCH & FILTER PILLS ─── (node 3043:184, 3043:196) */}
        <View style={styles.stickySearchAndFiltersWrapper}>
          {/* Search Box (node 3043:196) */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Image source={figmaSearchLens} style={styles.searchLensImg} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by restaurant or dish"
                placeholderTextColor="#717171"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <X size={16 * SCALE} color="#8E8E8E" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity activeOpacity={0.7} onPress={() => showToast('Listening...')}>
                  <Image source={figmaMicGold} style={styles.micGoldImg} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Pills (node 3043:184) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollRow}
          >
            {/* Favourites Pill */}
            <TouchableOpacity
              style={[
                styles.filterPillFav,
                activeFilter === 'FAVOURITES' && styles.filterPillFavActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setActiveFilter(activeFilter === 'FAVOURITES' ? 'ALL' : 'FAVOURITES')}
            >
              <Image source={figmaStarGold} style={styles.starGoldImg} />
              <Text
                style={[
                  styles.filterPillFavText,
                  activeFilter === 'FAVOURITES' && styles.filterPillFavTextActive,
                ]}
              >
                Favourites
              </Text>
            </TouchableOpacity>

            {/* Price ₹149 - ₹300 Pill */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === 'PRICE_149_300' && styles.filterPillActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setActiveFilter(activeFilter === 'PRICE_149_300' ? 'ALL' : 'PRICE_149_300')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'PRICE_149_300' && styles.filterPillTextActive,
                ]}
              >
                Price ₹149 - ₹300
              </Text>
            </TouchableOpacity>

            {/* Price > ₹300 Pill */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeFilter === 'PRICE_ABOVE_300' && styles.filterPillActive,
              ]}
              activeOpacity={0.8}
              onPress={() => setActiveFilter(activeFilter === 'PRICE_ABOVE_300' ? 'ALL' : 'PRICE_ABOVE_300')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'PRICE_ABOVE_300' && styles.filterPillTextActive,
                ]}
              >
                Price&gt;₹300
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ─── [3] CARDS FEED ─── (node 3043:110) */}
        <View style={styles.cardsFeedContainer}>
          {filteredList.map((rest) => {
            const isFav = !!favorites[rest.id];

            return (
              <View key={rest.id} style={styles.restCard}>
                {/* Top Restaurant Header Area */}
                <TouchableOpacity
                  style={styles.restCardHeader}
                  activeOpacity={0.85}
                  onPress={() => onNavigateToRestaurant(rest.restaurantId)}
                >
                  <Image source={rest.image} style={styles.restBannerImg} />

                  <View style={styles.restInfoWrap}>
                    <View style={styles.restNameRow}>
                      <Text style={styles.restName} numberOfLines={1}>
                        {rest.name}
                      </Text>
                      <Text style={styles.restDeliveryTime}> • {rest.deliveryTime}</Text>
                    </View>

                    {/* Promo & ONE Benefits Row */}
                    <View style={styles.promoRow}>
                      <Image source={figmaTagDiscount} style={styles.tagDiscountImg} />
                      <Text style={styles.discountText}>{rest.discountPromo}</Text>

                      {rest.hasOneBenefits && (
                        <View style={styles.oneBenefitsWrap}>
                          <View style={styles.onePill}>
                            <Text style={styles.onePillText}>ONE</Text>
                          </View>
                          <Text style={styles.benefitsText}>benefits</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Heart Icon Button */}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    activeOpacity={0.7}
                    onPress={() => toggleFavorite(rest.id)}
                  >
                    <Heart
                      size={20 * SCALE}
                      color={isFav ? '#D4AF37' : '#777777'}
                      fill={isFav ? '#D4AF37' : 'transparent'}
                      strokeWidth={1.8}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Divider Line */}
                <View style={styles.cardDivider} />

                {/* Unavailable notice if venue inactive */}
                {!rest.available && (
                  <View style={styles.unavailableNoticeRow}>
                    <Image source={figmaClockYellow} style={styles.clockYellowImg} />
                    <Text style={styles.unavailableText}>
                      {rest.unavailableReason || 'Not available at the moment'}
                    </Text>
                  </View>
                )}

                {/* Dish Rows */}
                <View style={styles.dishesWrap}>
                  {rest.dishes.map((dish, idx) => {
                    const isLast = idx === rest.dishes.length - 1;
                    const qty = itemQuantities[dish.id] || 0;

                    return (
                      <View key={dish.id}>
                        <View style={styles.dishRow}>
                          {/* Veg / Non-Veg Icon */}
                          <Image
                            source={dish.isVeg ? figmaVegIcon : figmaNonVegIcon}
                            style={styles.vegNonVegImg}
                          />

                          {/* Dish Name & Price */}
                          <View style={styles.dishInfoCol}>
                            <Text
                              style={[
                                styles.dishName,
                                !dish.available && styles.dishNameDisabled,
                              ]}
                              numberOfLines={1}
                            >
                              {dish.name}
                            </Text>

                            <View style={styles.priceRow}>
                              <Text
                                style={[
                                  styles.dishPrice,
                                  !dish.available && styles.dishPriceDisabled,
                                ]}
                              >
                                ₹{dish.price}
                              </Text>

                              {dish.originalPrice && (
                                <Text style={styles.dishOriginalPrice}>
                                  {dish.originalPrice}
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Right Action Button (+ / Quantity Selector) */}
                          {dish.available && (
                            <View style={styles.dishActionCol}>
                              {qty > 0 ? (
                                <View style={styles.qtyControlBox}>
                                  <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => handleRemoveItem(dish)}
                                  >
                                    <Minus size={13 * SCALE} color="#D4AF37" strokeWidth={2.5} />
                                  </TouchableOpacity>
                                  <Text style={styles.qtyText}>{qty}</Text>
                                  <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => handleAddItem(dish, rest)}
                                  >
                                    <Plus size={13 * SCALE} color="#D4AF37" strokeWidth={2.5} />
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  activeOpacity={0.85}
                                  onPress={() => handleAddItem(dish, rest)}
                                >
                                  <Image source={figmaPlusBtn} style={styles.plusBtnImg} />
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>

                        {!isLast && <View style={styles.dishDivider} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#010101',
  },
  scrollContent: {
    paddingBottom: 110,
    backgroundColor: '#010101',
  },

  // ─── [1] TOP HEADER ─── (node 3043:202)
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 2 : 4,
    paddingBottom: 10,
    backgroundColor: '#010101',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowImg: {
    width: 24 * SCALE,
    height: 16 * SCALE,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18 * SCALE,
    color: '#D1D1D1',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerRightSpacer: {
    width: 28 * SCALE,
  },

  // ─── [2] STICKY SEARCH & FILTERS ─── (node 3043:184, 3043:196)
  stickySearchAndFiltersWrapper: {
    backgroundColor: '#010101',
    paddingTop: 4,
    paddingBottom: 8,
    zIndex: 20,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#121212',
  },
  searchContainer: {
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 20 * SCALE,
    height: 48 * SCALE,
    paddingHorizontal: 16,
  },
  searchLensImg: {
    width: 17 * SCALE,
    height: 17 * SCALE,
    resizeMode: 'contain',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Urbanist-Medium',
    fontSize: 14 * SCALE,
    color: '#D1D1D1',
    paddingVertical: 0,
  },
  micGoldImg: {
    width: 17 * SCALE,
    height: 20 * SCALE,
    resizeMode: 'contain',
    marginLeft: 6,
  },

  // Filter Pills (node 3043:184)
  filterScrollRow: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterPillFav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0904',
    borderWidth: 1,
    borderColor: '#604B23',
    borderRadius: 22 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 7 * SCALE,
  },
  filterPillFavActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  starGoldImg: {
    width: 15 * SCALE,
    height: 15 * SCALE,
    resizeMode: 'contain',
    marginRight: 6,
  },
  filterPillFavText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#997F3E',
  },
  filterPillFavTextActive: {
    color: '#000000',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070808',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 22 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 7 * SCALE,
  },
  filterPillActive: {
    backgroundColor: '#1E1E1E',
    borderColor: '#D4AF37',
  },
  filterPillText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#8A8A8A',
  },
  filterPillTextActive: {
    color: '#D4AF37',
    fontFamily: 'Urbanist-Bold',
  },

  // ─── [3] CARDS FEED ─── (node 3043:110)
  cardsFeedContainer: {
    paddingTop: 12,
    paddingHorizontal: 14,
    gap: 14,
  },
  restCard: {
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#272525',
    borderRadius: 22 * SCALE,
    padding: 14 * SCALE,
    overflow: 'hidden',
  },
  restCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restBannerImg: {
    width: 50 * SCALE,
    height: 50 * SCALE,
    borderRadius: 12 * SCALE,
    marginRight: 12,
    backgroundColor: '#1A1A1A',
  },
  restInfoWrap: {
    flex: 1,
    paddingRight: 6,
  },
  restNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  restName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5 * SCALE,
    color: '#C0C0C0',
    maxWidth: '70%',
  },
  restDeliveryTime: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12 * SCALE,
    color: '#727272',
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagDiscountImg: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
    marginRight: 2,
  },
  discountText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#666666',
  },
  oneBenefitsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
  },
  onePill: {
    backgroundColor: '#9F1818',
    borderWidth: 1,
    borderColor: '#501010',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 4,
  },
  onePillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5 * SCALE,
    color: '#E1A9A9',
  },
  benefitsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#686868',
  },
  heartBtn: {
    padding: 6,
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#202020',
    marginVertical: 12,
  },

  // Unavailable notice (node 3043:170)
  unavailableNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 2,
  },
  clockYellowImg: {
    width: 15 * SCALE,
    height: 15 * SCALE,
    resizeMode: 'contain',
    marginRight: 6,
  },
  unavailableText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#907739',
  },

  // Dishes Section
  dishesWrap: {
    gap: 10,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  vegNonVegImg: {
    width: 16 * SCALE,
    height: 16 * SCALE,
    resizeMode: 'contain',
    marginRight: 10,
  },
  dishInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  dishName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#AEAEAE',
    marginBottom: 2,
  },
  dishNameDisabled: {
    color: '#6B6B6B',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#6B6B6B',
  },
  dishPriceDisabled: {
    color: '#4B4B4B',
  },
  dishOriginalPrice: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#5C5C5C',
    textDecorationLine: 'line-through',
  },
  dishActionCol: {
    marginLeft: 8,
  },
  plusBtnImg: {
    width: 32 * SCALE,
    height: 32 * SCALE,
    resizeMode: 'contain',
  },
  qtyControlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12110D',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 6,
  },
  qtyBtn: {
    padding: 3,
  },
  qtyText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#D4AF37',
    minWidth: 14,
    textAlign: 'center',
  },
  dishDivider: {
    height: 1,
    backgroundColor: '#181818',
    marginTop: 8,
  },
});
