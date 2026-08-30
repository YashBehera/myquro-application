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
  RotateCcw,
} from 'lucide-react-native';

import { useViewModel } from '../state/MainViewModel';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

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
const quroBadgeImg      = require('../assets/images/quro_badge.png');

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
  const {
    addToCart,
    removeFromCart,
    updateCartQuantity,
    cartItems,
    authState,
    allRestaurants = [],
    foodItems = [],
    userOrders = [],
    refreshUserOrders,
  } = useViewModel();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FAVOURITES' | 'PRICE_149_300' | 'PRICE_ABOVE_300'>('ALL');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<any[]>(userOrders);
  const [isLoading, setIsLoading] = useState(userOrders.length === 0);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  // Sync itemQuantities with cartItems
  useEffect(() => {
    const qtyMap: Record<string, number> = {};
    cartItems.forEach(ci => {
      qtyMap[ci.id] = ci.quantity;
    });
    setItemQuantities(qtyMap);
  }, [cartItems]);

  // Synchronize orders instantly whenever userOrders updates in memory
  useEffect(() => {
    if (userOrders && userOrders.length > 0) {
      setOrders(userOrders);
      setIsLoading(false);
    }
  }, [userOrders]);

  // Background refresh on mount without blocking initial UI
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        if (refreshUserOrders) {
          await refreshUserOrders();
        }
      } catch (err) {
        console.warn('[ReorderScreen] Error refreshing past orders:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const reorderRestaurants: RestaurantReorderCard[] = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }

    const normalizePrice = (raw: any): number => {
      let num = typeof raw === 'number' ? raw : (parseFloat(String(raw || 0).replace(/[^0-9.]/g, '')) || 0);
      if (isNaN(num) || num <= 0) return 0;
      if (num >= 1000 && num % 100 === 0) {
        num = num / 100;
      } else if (num >= 2000) {
        num = num / 100;
      }
      return Math.round(num);
    };

    return orders.map((o: any, idx: number) => {
      const restId = o.restaurantId || '';
      const matchingRest = allRestaurants.find(r => r.id === restId);
      
      let rawItems: any[] = [];
      if (Array.isArray(o.items)) {
        rawItems = o.items;
      } else if (typeof o.items === 'string') {
        try {
          const parsed = JSON.parse(o.items);
          if (Array.isArray(parsed)) rawItems = parsed;
        } catch (e) {}
      }

      const dishesList = rawItems.map((item: any, itIdx: number) => {
        const dishId = item.id || item.menuItemId || item._id || `item_${itIdx}`;
        let dishPrice = normalizePrice(item.price ?? item.unitPrice ?? item.basePrice ?? item.itemPrice);
        if (dishPrice <= 0) {
          const matchFood = foodItems.find(f => f.id === dishId || f.name === (item.name || item.menuItemName));
          if (matchFood && typeof matchFood.price === 'number') {
            dishPrice = normalizePrice(matchFood.price);
          }
        }

        return {
          id: dishId,
          name: item.name || item.menuItemName || item.itemName || 'Food Item',
          price: dishPrice,
          isVeg: item.isVeg !== undefined ? item.isVeg : (item.is_veg !== undefined ? item.is_veg : true),
          available: matchingRest ? !matchingRest.isClosed : true,
        };
      });

      const restName = o.restaurantName || matchingRest?.name || 'Restaurant';
      const restImg = matchingRest?.image 
        ? { uri: matchingRest.image } 
        : (o.restaurantImage ? { uri: o.restaurantImage } : { uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80' });

      const deliveryTimeStr = matchingRest?.deliveryTime 
        ? `${matchingRest.deliveryTime} mins` 
        : ((matchingRest as any)?.eta || '25–30 mins');

      const discountTag = (matchingRest as any)?.discountTag || matchingRest?.discount || (matchingRest as any)?.offerText || o.discountTag || '';

      return {
        id: o.id || o.orderId || `ord_${idx}`,
        restaurantId: restId,
        name: restName,
        deliveryTime: deliveryTimeStr,
        discountPromo: discountTag,
        hasOneBenefits: (matchingRest as any)?.hasOneBenefits ?? true,
        image: restImg,
        isFavorite: !!favorites[o.id || o.orderId || `ord_${idx}`],
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
    addToCart({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      quantity: 1,
      restaurantId: rest.restaurantId,
      restaurantName: rest.name,
      isVeg: dish.isVeg,
    });
    showToast(`Added "${dish.name}" to cart`);
  };

  const handleRemoveItem = (dish: DishItem) => {
    const currentQty = itemQuantities[dish.id] || 0;
    if (currentQty <= 1) {
      removeFromCart(dish.id);
      showToast(`Removed "${dish.name}" from cart`);
    } else {
      updateCartQuantity(dish.id, currentQty - 1);
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
          {isLoading && orders.length === 0 ? (
            <View style={{ gap: 14 * SCALE, marginTop: 10 * SCALE }}>
              {[1, 2].map((k) => (
                <View key={`skel_${k}`} style={[styles.restCard, { opacity: 0.6, borderColor: '#1A1A1A' }]}>
                  <View style={[styles.restCardHeader, { opacity: 0.7 }]}>
                    <View style={[styles.restBannerImg, { backgroundColor: '#181818' }]} />
                    <View style={styles.restInfoWrap}>
                      <View style={{ width: 140 * SCALE, height: 14 * SCALE, backgroundColor: '#222', borderRadius: 4, marginBottom: 8 }} />
                      <View style={{ width: 90 * SCALE, height: 10 * SCALE, backgroundColor: '#1A1A1A', borderRadius: 4 }} />
                    </View>
                  </View>
                  <View style={styles.cardDivider} />
                  <View style={{ padding: 12 * SCALE, gap: 10 * SCALE }}>
                    <View style={{ width: '80%', height: 12 * SCALE, backgroundColor: '#1C1C1C', borderRadius: 4 }} />
                    <View style={{ width: '60%', height: 12 * SCALE, backgroundColor: '#181818', borderRadius: 4 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <RotateCcw size={28 * SCALE} color="#D4AF37" strokeWidth={2} />
              </View>
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'No matching dishes found' : 'No Past Orders Yet'}
              </Text>
              <Text style={styles.emptyStateSub}>
                {searchQuery
                  ? `We couldn't find any dishes or restaurants matching "${searchQuery}".`
                  : 'Once you place orders with MyQuro, your favourite restaurants and past dishes will appear here for 1-tap reordering.'}
              </Text>
              {onNavigateToHome && !searchQuery && (
                <TouchableOpacity
                  style={styles.emptyStateBtn}
                  activeOpacity={0.85}
                  onPress={onNavigateToHome}
                >
                  <Text style={styles.emptyStateBtnText}>Browse Restaurants</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredList.map((rest) => {
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
                        <Text style={styles.discountText}>{rest.discountPromo || 'Special Offers Available'}</Text>

                        {rest.hasOneBenefits && (
                          <View style={styles.oneBenefitsWrap}>
                            <Image source={quroBadgeImg} style={styles.quroReorderBadgeImg} resizeMode="contain" />
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
            })
          )}
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
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
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
  quroReorderBadgeImg: {
    width: 36 * SCALE,
    height: 12 * SCALE,
    marginRight: 4 * SCALE,
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

  // ─── EMPTY STATE ───
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60 * SCALE,
    paddingHorizontal: 28 * SCALE,
    backgroundColor: '#090909',
    borderRadius: 20 * SCALE,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    marginTop: 20 * SCALE,
  },
  emptyIconCircle: {
    width: 68 * SCALE,
    height: 68 * SCALE,
    borderRadius: 34 * SCALE,
    backgroundColor: '#1C180B',
    borderWidth: 1,
    borderColor: '#3D3114',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16 * SCALE,
  },
  emptyStateTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18 * SCALE,
    color: '#E8E8E8',
    textAlign: 'center',
    marginBottom: 8 * SCALE,
  },
  emptyStateSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5 * SCALE,
    color: '#7F7F7F',
    textAlign: 'center',
    lineHeight: 20 * SCALE,
    marginBottom: 24 * SCALE,
  },
  emptyStateBtn: {
    backgroundColor: '#D4AF37',
    paddingVertical: 12 * SCALE,
    paddingHorizontal: 24 * SCALE,
    borderRadius: 25 * SCALE,
  },
  emptyStateBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#000000',
    letterSpacing: 0.2,
  },
});
