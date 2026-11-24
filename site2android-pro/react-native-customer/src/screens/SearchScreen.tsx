import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useViewModel } from '../state/MainViewModel';
import { Restaurant } from '../types';
import {
  ArrowLeft,
  Search as SearchIcon,
  Mic,
  X,
  Heart,
  Star,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Tag,
  Flame,
  Clock,
  Sparkles,
  Zap,
  Plus,
  Minus,
  Volume2,
  ShoppingBag,
} from 'lucide-react-native';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { LazyImage } from '../components/LazyImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_WIDTH, isTablet, getSafeTopPadding, getSafeBottomPadding } from '../utils/responsive';
import {
  getStoredRecentSearches,
  addStoredRecentSearch,
  removeStoredRecentSearch,
  clearStoredRecentSearches,
  DEFAULT_RECENT_SEARCHES,
} from '../utils/recentSearches';

interface SearchScreenProps {
  onBack: () => void;
  onNavigateToRestaurant: (id: string, targetDishName?: string) => void;
  onNavigateToCart?: () => void;
  initialQuery?: string;
}

const TRENDING_SEARCHES = [
  { label: 'Hyderabadi Biryani', tag: '🔥 Trending' },
  { label: 'Farmhouse Pizza', tag: '🔥 Popular' },
  { label: 'Crispy Smash Burger', tag: '✨ Craving' },
  { label: 'Butter Naan & Dal', tag: '🍛 Best Rated' },
  { label: 'Steamed Momos', tag: '🥟 Quick Bite' },
  { label: 'Cold Brew Coffee', tag: '☕ Drinks' },
];

const POPULAR_CUISINES = [
  { name: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300' },
  { name: 'Pizzas', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300' },
  { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300' },
  { name: 'Rolls', image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=300' },
  { name: 'Chinese', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300' },
  { name: 'Desserts', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300' },
];

const PLACEHOLDERS = [
  "Search 'Hyderabadi Dum Biryani'...",
  "Search 'Truffle Mushroom Pizza'...",
  "Search 'Crispy Chicken Burger'...",
  "Search 'Paneer Butter Masala'...",
  "Search 'Cold Brew & Desserts'...",
  "Search 'Steamed Dimsums & Momos'...",
];

// Helper function to render text with matching query highlighted in bold gold
const renderBoldedText = (text: string, query: string) => {
  if (!query.trim()) return <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontFamily: 'Urbanist-Bold' }}>{text}</Text>;
  
  const regex = new RegExp(`(${query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <Text style={{ color: '#9CA3AF', fontSize: 14.5, fontFamily: 'Urbanist-Medium' }}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase().trim();
        return (
          <Text
            key={index}
            style={{
              fontFamily: isMatch ? 'Urbanist-Bold' : 'Urbanist-Medium',
              color: isMatch ? '#DEA430' : '#FFFFFF',
              fontWeight: isMatch ? '800' : '500',
            }}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onBack,
  onNavigateToRestaurant,
  onNavigateToCart,
  initialQuery = '',
}) => {
  const insets = useSafeAreaInsets();
  const { allRestaurants, foodItems, categories, addToCart, updateCartQuantity, cartItems } = useViewModel();

  const [query, setQuery] = useState(initialQuery);
  const [isSubmitted, setIsSubmitted] = useState(!!initialQuery);
  const [activeTab, setActiveTab] = useState<'Restaurants' | 'Dishes'>('Restaurants');
  
  // Filter States
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [ratingFilter, setRatingFilter] = useState(false);
  const [fastDeliveryFilter, setFastDeliveryFilter] = useState(false);
  const [under199Filter, setUnder199Filter] = useState(false);
  const [offersOnlyFilter, setOffersOnlyFilter] = useState(false);
  const [selectedSubPill, setSelectedSubPill] = useState<string | null>(null);

  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENT_SEARCHES);
  const [savedHearts, setSavedHearts] = useState<{ [key: string]: boolean }>({});
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);

  // Voice Wave Animations
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.6)).current;
  const wave3 = useRef(new Animated.Value(0.4)).current;
  const wave4 = useRef(new Animated.Value(0.8)).current;
  const wave5 = useRef(new Animated.Value(0.5)).current;

  // Placeholder rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Voice wave loop animation
  useEffect(() => {
    if (isVoiceModalVisible) {
      const animateWave = (anim: Animated.Value, to: number, dur: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: to,
              duration: dur,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: dur,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const w1 = animateWave(wave1, 1, 400);
      const w2 = animateWave(wave2, 0.9, 320);
      const w3 = animateWave(wave3, 1.1, 480);
      const w4 = animateWave(wave4, 0.85, 360);
      const w5 = animateWave(wave5, 1, 420);

      w1.start();
      w2.start();
      w3.start();
      w4.start();
      w5.start();

      return () => {
        w1.stop();
        w2.stop();
        w3.stop();
        w4.stop();
        w5.stop();
      };
    }
  }, [isVoiceModalVisible]);

  const toggleHeart = (id: string) => {
    setSavedHearts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    getStoredRecentSearches().then(setRecentSearches);
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0) {
      triggerSearch(initialQuery.trim());
    }
  }, [initialQuery]);

  // ─── INSTANT AUTOCOMPLETE (Starts at 1 character!) ───
  const firstSuggestion = useMemo(() => {
    if (query.trim().length < 1) return null;
    const q = query.toLowerCase().trim();
    
    const cat = categories.find(c => c.name.toLowerCase().includes(q));
    if (cat) {
      return {
        name: cat.name,
        type: 'Cuisine',
        image: cat.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        isCategory: true,
      };
    }
    
    const res = allRestaurants.find(r => r.name.toLowerCase().includes(q));
    if (res) {
      return {
        name: res.name,
        type: 'Restaurant',
        image: res.image,
        isRestaurant: true,
        resObj: res,
      };
    }
    
    const food = foodItems.find(f => f.name && f.name.toLowerCase().includes(q));
    if (food) {
      return {
        name: food.name,
        type: 'Dish',
        price: food.price,
        image: food.image,
        isDish: true,
        foodObj: food,
      };
    }
    
    return {
      name: query.trim(),
      type: 'Dish',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150',
    };
  }, [query, categories, allRestaurants, foodItems]);

  // Matching Restaurants for suggestions
  const relevantRestaurants = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    
    const matches = allRestaurants.filter((res: Restaurant) => {
      const cuisineStr = Array.isArray(res.cuisine)
        ? (res.cuisine as string[]).join(', ')
        : typeof res.cuisine === 'string'
          ? res.cuisine
          : '';
      return res.name.toLowerCase().includes(q) || cuisineStr.toLowerCase().includes(q);
    });
    
    const filtered = matches.filter((res: Restaurant) => {
      if (firstSuggestion?.isRestaurant && firstSuggestion.name === res.name) return false;
      return true;
    });
    
    return filtered.slice(0, 5);
  }, [query, allRestaurants, firstSuggestion]);

  // Matching Dishes for suggestions
  const moreResults = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();
    
    const matchedDishes = foodItems.filter((food: any) =>
      food.name && food.name.toLowerCase().includes(q)
    );

    return matchedDishes.slice(0, 8);
  }, [query, foodItems]);

  // ─── FILTERED SEARCH RESULTS (When submitted or browsing) ───
  const searchMatchedRestaurants = useMemo(() => {
    if (!query.trim()) return allRestaurants;
    const lowerQuery = query.toLowerCase().trim();

    return allRestaurants.filter((res: Restaurant) => {
      const cuisineStr = Array.isArray(res.cuisine)
        ? (res.cuisine as string[]).join(', ')
        : typeof res.cuisine === 'string'
          ? res.cuisine
          : '';
      const nameMatch = res.name.toLowerCase().includes(lowerQuery) || cuisineStr.toLowerCase().includes(lowerQuery);
      
      const hasMatchingDish = foodItems.some((food: any) => {
        const fRestId = String(food.restaurantId || food.restaurant_id || '');
        const isSameRest = fRestId === String(res.id) || (food.restaurantName && food.restaurantName.toLowerCase() === res.name.toLowerCase());
        return isSameRest && (
          (food.name && food.name.toLowerCase().includes(lowerQuery)) ||
          (food.categoryName && food.categoryName.toLowerCase().includes(lowerQuery)) ||
          (food.category && food.category.toLowerCase().includes(lowerQuery)) ||
          (food.description && food.description.toLowerCase().includes(lowerQuery))
        );
      });

      if (!nameMatch && !hasMatchingDish) return false;

      // Apply Filters
      if (ratingFilter && (Number(res.rating) || 0) < 4.0) return false;
      if (offersOnlyFilter && !res.offer) return false;
      if (fastDeliveryFilter) {
        const timeVal = typeof res.deliveryTime === 'number' ? res.deliveryTime : parseInt(String(res.deliveryTime || '40'), 10);
        if (timeVal > 30) return false;
      }

      return true;
    });
  }, [query, allRestaurants, foodItems, ratingFilter, offersOnlyFilter, fastDeliveryFilter]);

  // Primary restaurant
  const primaryRestaurant = useMemo(() => {
    if (searchMatchedRestaurants.length === 0) return allRestaurants[0] || null;
    const directMatch = searchMatchedRestaurants.find(
      (res: Restaurant) => res.name.toLowerCase().includes(query.toLowerCase().trim())
    );
    return directMatch || searchMatchedRestaurants[0];
  }, [searchMatchedRestaurants, allRestaurants, query]);

  // Secondary featured restaurants
  const secondaryRestaurants = useMemo(() => {
    if (!primaryRestaurant) return searchMatchedRestaurants;
    const restList = searchMatchedRestaurants.filter((res: Restaurant) => res.id !== primaryRestaurant.id);
    if (restList.length === 0) {
      return allRestaurants.filter(r => r.id !== primaryRestaurant.id);
    }
    return restList;
  }, [searchMatchedRestaurants, allRestaurants, primaryRestaurant]);

  // Dynamic promo banners
  const dynamicPromoBanners = useMemo(() => {
    return allRestaurants.slice(0, 4).map((res, idx) => ({
      id: res.id,
      name: res.name,
      image: res.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
      deal: res.offer || (idx === 0 ? 'Items @49' : idx === 1 ? 'BUY 1 GET 1' : '50% OFF'),
      ad: idx === 0,
      rating: String(res.rating || '4.5'),
      deliveryTime: res.deliveryTime ? (typeof res.deliveryTime === 'number' ? `${res.deliveryTime} mins` : String(res.deliveryTime)) : '20–25 mins',
    }));
  }, [allRestaurants]);

  // Dishes matching query & all active filters
  const searchMatchedDishes = useMemo(() => {
    if (!query.trim()) return foodItems;
    const lowerQuery = query.toLowerCase().trim();
    
    return foodItems.filter((food: any) => {
      if (vegOnly && !food.isVeg) return false;
      if (nonVegOnly && food.isVeg) return false;
      if (under199Filter && (Number(food.price) || 0) > 199) return false;

      const nameMatch = food.name && food.name.toLowerCase().includes(lowerQuery);
      const descMatch = food.description && food.description.toLowerCase().includes(lowerQuery);
      const catMatch = (food.categoryName && food.categoryName.toLowerCase().includes(lowerQuery)) ||
                       (food.category && food.category.toLowerCase().includes(lowerQuery));
      const restMatch = primaryRestaurant && (String(food.restaurantId) === String(primaryRestaurant.id) || (food.restaurantName && food.restaurantName.toLowerCase() === primaryRestaurant.name.toLowerCase()));
      
      return nameMatch || descMatch || catMatch || restMatch;
    });
  }, [query, foodItems, vegOnly, nonVegOnly, under199Filter, primaryRestaurant]);

  // Related dishes for primary carousel
  const relatedDishes = useMemo(() => {
    let dishes = searchMatchedDishes;
    if (primaryRestaurant) {
      const restDishes = foodItems.filter(f => String(f.restaurantId) === String(primaryRestaurant.id) || (f.restaurantName && f.restaurantName.toLowerCase() === primaryRestaurant.name.toLowerCase()));
      if (restDishes.length > 0) {
        dishes = restDishes;
      }
    }
    return dishes.slice(0, 8);
  }, [searchMatchedDishes, foodItems, primaryRestaurant]);

  // Dishes grouped by restaurant
  const dishesGroupedByRestaurant = useMemo(() => {
    let dishes = searchMatchedDishes;
    if (selectedSubPill) {
      const pillLower = selectedSubPill.toLowerCase();
      const filtered = dishes.filter((f: any) => 
        (f.categoryName && f.categoryName.toLowerCase().includes(pillLower)) ||
        (f.name && f.name.toLowerCase().includes(pillLower)) ||
        (f.category && f.category.toLowerCase().includes(pillLower))
      );
      if (filtered.length > 0) {
        dishes = filtered;
      }
    }

    const groups: { [key: string]: { restaurant: Restaurant; dishes: any[] } } = {};

    dishes.forEach((food: any) => {
      const restId = String(food.restaurantId || food.restaurant_id || '');
      let res = allRestaurants.find(r => String(r.id) === restId);
      if (!res && food.restaurantName) {
        res = allRestaurants.find(r => r.name.toLowerCase() === food.restaurantName.toLowerCase());
      }
      if (!res) return;

      const key = res.id;
      if (!groups[key]) {
        groups[key] = {
          restaurant: res,
          dishes: [],
        };
      }
      groups[key].dishes.push(food);
    });

    if (Object.keys(groups).length === 0 && allRestaurants.length > 0) {
      allRestaurants.slice(0, 3).forEach((res) => {
        const sampleDishes = foodItems.filter(f => String(f.restaurantId) === String(res.id)).slice(0, 5);
        if (sampleDishes.length > 0) {
          groups[res.id] = { restaurant: res, dishes: sampleDishes };
        }
      });
    }

    return Object.values(groups);
  }, [searchMatchedDishes, selectedSubPill, allRestaurants, foodItems]);

  const triggerSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const cleanQ = searchQuery.trim();
    setQuery(cleanQ);
    setIsSubmitted(true);
    setIsLoadingResults(true);

    addStoredRecentSearch(cleanQ).then(setRecentSearches);

    setTimeout(() => {
      setIsLoadingResults(false);
    }, 200);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedSubPill(null);
    setIsSubmitted(false);
  };

  const handleRemoveRecent = (term: string) => {
    removeStoredRecentSearch(term).then(setRecentSearches);
  };

  const handleClearAllRecent = () => {
    clearStoredRecentSearches().then(setRecentSearches);
  };

  // Cart summary for floating mini cart bar
  const totalCartQty = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [cartItems]);

  const totalCartPrice = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
  }, [cartItems]);

  return (
    <View style={styles.container}>
      
      {/* ─── TOP HEADER INPUT BLOCK ─── */}
      <View style={[styles.headerContainer, { paddingTop: getSafeTopPadding(insets.top, 4) }]}>
        
        {/* 1. TOP HEADER TITLE ROW */}
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color="#DEA430" strokeWidth={2.4} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            Search for dishes & restaurants
          </Text>

          <TouchableOpacity
            onPress={() => setIsVoiceModalVisible(true)}
            style={styles.voiceTopBtn}
            activeOpacity={0.7}
          >
            <Mic size={18} color="#DEA430" />
          </TouchableOpacity>
        </View>

        {/* 2. SEARCH BAR & VEG TOGGLE ROW */}
        <View style={styles.searchBarRow}>
          {/* Search Input Box */}
          <View style={styles.inputInnerRow}>
            <SearchIcon size={18} color="#DEA430" style={{ marginRight: 8 }} />
            
            <TextInput
              style={styles.textInput}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setIsSubmitted(false);
              }}
              placeholder={query.length === 0 ? PLACEHOLDERS[placeholderIndex] : ''}
              placeholderTextColor="#78716C"
              returnKeyType="search"
              onSubmitEditing={() => triggerSearch(query)}
              autoCorrect={false}
              selectionColor="#DEA430"
            />
            
            {query.length > 0 ? (
              <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
                <X size={18} color="#9CA3AF" strokeWidth={2.2} />
              </TouchableOpacity>
            ) : null}

            <View style={styles.micSection}>
              <View style={styles.micDivider} />
              <TouchableOpacity 
                style={styles.micBtn} 
                onPress={() => setIsVoiceModalVisible(true)}
                activeOpacity={0.7}
              >
                <Mic size={20} color="#DEA430" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* VEG Toggle Button */}
          <TouchableOpacity 
            style={[styles.vegToggleCard, vegOnly && styles.vegToggleCardActive]} 
            onPress={() => {
              setVegOnly(!vegOnly);
              if (!vegOnly) setNonVegOnly(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.vegToggleLabel}>VEG</Text>
            <View style={[styles.vegSwitchTrack, vegOnly && styles.vegSwitchTrackActive]}>
              <View style={[styles.vegSwitchThumb, vegOnly && styles.vegSwitchThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. TABS ROW (Restaurants | Dishes) */}
        {isSubmitted && query.trim().length > 0 && (
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('Restaurants')}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'Restaurants' ? styles.tabTextActive : styles.tabTextInactive]}>
                Restaurants ({searchMatchedRestaurants.length})
              </Text>
              {activeTab === 'Restaurants' && <View style={styles.tabActiveIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('Dishes')}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'Dishes' ? styles.tabTextActive : styles.tabTextInactive]}>
                Dishes ({searchMatchedDishes.length})
              </Text>
              {activeTab === 'Dishes' && <View style={styles.tabActiveIndicator} />}
            </TouchableOpacity>
          </View>
        )}

        {/* 4. QUICK FILTER PILLS ROW (When search results are shown) */}
        {isSubmitted && query.trim().length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterPillsScroll}
            contentContainerStyle={styles.filterPillsContent}
          >
            <TouchableOpacity
              style={[styles.filterPill, ratingFilter && styles.filterPillActive]}
              onPress={() => setRatingFilter(!ratingFilter)}
              activeOpacity={0.75}
            >
              <Star size={12} color={ratingFilter ? '#000000' : '#DEA430'} fill={ratingFilter ? '#000000' : '#DEA430'} style={{ marginRight: 4 }} />
              <Text style={[styles.filterPillText, ratingFilter && styles.filterPillTextActive]}>Rating 4.0+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, fastDeliveryFilter && styles.filterPillActive]}
              onPress={() => setFastDeliveryFilter(!fastDeliveryFilter)}
              activeOpacity={0.75}
            >
              <Zap size={12} color={fastDeliveryFilter ? '#000000' : '#F97316'} style={{ marginRight: 4 }} />
              <Text style={[styles.filterPillText, fastDeliveryFilter && styles.filterPillTextActive]}>Fast Delivery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, nonVegOnly && styles.filterPillActive]}
              onPress={() => {
                setNonVegOnly(!nonVegOnly);
                if (!nonVegOnly) setVegOnly(false);
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.nonVegDot, nonVegOnly && { backgroundColor: '#000000' }]} />
              <Text style={[styles.filterPillText, nonVegOnly && styles.filterPillTextActive]}>Non-Veg</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, under199Filter && styles.filterPillActive]}
              onPress={() => setUnder199Filter(!under199Filter)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterPillText, under199Filter && styles.filterPillTextActive]}>Under ₹199</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, offersOnlyFilter && styles.filterPillActive]}
              onPress={() => setOffersOnlyFilter(!offersOnlyFilter)}
              activeOpacity={0.75}
            >
              <Tag size={12} color={offersOnlyFilter ? '#000000' : '#DEA430'} style={{ marginRight: 4 }} />
              <Text style={[styles.filterPillText, offersOnlyFilter && styles.filterPillTextActive]}>Offers</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

      </View>

      {/* ─── BODY VIEWPORT ─── */}
      <ScrollView 
        contentContainerStyle={[styles.bodyContent, { paddingBottom: getSafeBottomPadding(insets.bottom, 80) }]} 
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
      >
        
        {/* 0. INITIAL DEFAULT VIEW (When query is empty and not submitted) */}
        {!isSubmitted && query.trim().length === 0 && (
          <View style={styles.initialContainer}>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.initialSection}>
                <View style={styles.initialSectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} color="#DEA430" />
                    <Text style={styles.initialSectionTitle}>Recent Searches</Text>
                  </View>
                  <TouchableOpacity onPress={handleClearAllRecent} activeOpacity={0.7}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentChipsWrap}>
                  {recentSearches.map((term, idx) => (
                    <View key={`recent_${idx}_${term}`} style={styles.recentChip}>
                      <TouchableOpacity
                        style={styles.recentChipTouchPart}
                        activeOpacity={0.75}
                        onPress={() => triggerSearch(term)}
                      >
                        <RotateCcw size={11} color="#DEA430" strokeWidth={2.2} />
                        <Text style={styles.recentChipText}>{term}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveRecent(term)}
                        style={styles.recentDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                      >
                        <X size={11} color="#8E8A80" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 🔥 Trending Searches */}
            <View style={styles.initialSection}>
              <View style={styles.initialSectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Flame size={14} color="#F97316" />
                  <Text style={styles.initialSectionTitle}>Trending Cravings</Text>
                </View>
              </View>
              <View style={styles.recentChipsWrap}>
                {TRENDING_SEARCHES.map((item, idx) => (
                  <TouchableOpacity
                    key={`trending_${idx}`}
                    style={styles.trendingSearchChip}
                    activeOpacity={0.8}
                    onPress={() => triggerSearch(item.label)}
                  >
                    <Text style={styles.trendingSearchChipText}>{item.label}</Text>
                    <Text style={styles.trendingTag}>{item.tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 🍽️ Popular Cuisines Visual Discovery */}
            <View style={styles.initialSection}>
              <View style={styles.initialSectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} color="#DEA430" />
                  <Text style={styles.initialSectionTitle}>Explore by Cuisine</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cuisineRowContent}
              >
                {POPULAR_CUISINES.map((c, idx) => (
                  <TouchableOpacity
                    key={`cui_main_${idx}`}
                    style={styles.cuisineColCard}
                    activeOpacity={0.8}
                    onPress={() => triggerSearch(c.name)}
                  >
                    <LazyImage source={{ uri: c.image }} style={styles.cuisineColImg} />
                    <Text style={styles.cuisineColLabel} numberOfLines={1}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* 1. AUTOCOMPLETE SUGGESTIONS VIEW (When typing, instant >= 1 char!) */}
        {!isSubmitted && query.trim().length >= 1 && (
          <View style={styles.suggestionsContainer}>
            {firstSuggestion && (
              <TouchableOpacity
                onPress={() => {
                  if (firstSuggestion.isRestaurant && firstSuggestion.resObj) {
                    onNavigateToRestaurant(firstSuggestion.resObj.id);
                  } else if (firstSuggestion.isDish && firstSuggestion.foodObj) {
                    const food = firstSuggestion.foodObj;
                    const targetRest = allRestaurants.find(
                      (r) =>
                        String(r.id) === String(food.restaurantId) ||
                        (food.restaurantName && r.name.toLowerCase() === food.restaurantName.toLowerCase()) ||
                        (food.restaurantName && r.name.toLowerCase().includes(food.restaurantName.toLowerCase()))
                    );
                    const targetRestId = targetRest ? targetRest.id : food.restaurantId;
                    if (targetRestId) {
                      addStoredRecentSearch(firstSuggestion.name).then(setRecentSearches);
                      onNavigateToRestaurant(String(targetRestId), firstSuggestion.name);
                    } else {
                      triggerSearch(firstSuggestion.name);
                    }
                  } else {
                    triggerSearch(firstSuggestion.name);
                  }
                }}
                style={styles.suggestionItem}
                activeOpacity={0.8}
              >
                <LazyImage source={{ uri: getOptimizedImageUrl(firstSuggestion.image, 400) }} style={styles.suggestionCircularImg} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  {renderBoldedText(firstSuggestion.name, query)}
                  <Text style={styles.suggestionType}>
                    {firstSuggestion.type} {firstSuggestion.isDish && firstSuggestion.price ? `• ₹${firstSuggestion.price}` : ''}
                  </Text>
                </View>
                <SearchIcon size={18} color="#DEA430" />
              </TouchableOpacity>
            )}

            {relevantRestaurants.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderText}>Restaurants matching '{query}'</Text>
                  <View style={styles.sectionHeaderLine} />
                </View>
                {relevantRestaurants.map((res: Restaurant) => (
                  <TouchableOpacity
                    key={res.id}
                    onPress={() => onNavigateToRestaurant(res.id)}
                    style={styles.suggestionItem}
                    activeOpacity={0.8}
                  >
                    <LazyImage source={{ uri: getOptimizedImageUrl(res.image, 400) }} style={styles.suggestionCircularImg} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      {renderBoldedText(res.name, query)}
                      <Text style={styles.suggestionType}>
                        ★ {res.rating || '4.5'} • {typeof res.deliveryTime === 'number' ? `${res.deliveryTime} mins` : res.deliveryTime || '30 mins'}{res.city ? ` • ${res.city}` : ''}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#DEA430" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {moreResults.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderText}>Dishes matching '{query}'</Text>
                  <View style={styles.sectionHeaderLine} />
                </View>
                {moreResults.map((food: any) => (
                  <TouchableOpacity
                    key={food.id}
                    onPress={() => {
                      const targetRest = allRestaurants.find(
                        (r) =>
                          String(r.id) === String(food.restaurantId) ||
                          (food.restaurantName && r.name.toLowerCase() === food.restaurantName.toLowerCase()) ||
                          (food.restaurantName && r.name.toLowerCase().includes(food.restaurantName.toLowerCase()))
                      );
                      const targetRestId = targetRest ? targetRest.id : food.restaurantId;
                      if (targetRestId) {
                        addStoredRecentSearch(food.name).then(setRecentSearches);
                        onNavigateToRestaurant(String(targetRestId), food.name);
                      } else {
                        triggerSearch(food.name);
                      }
                    }}
                    style={styles.suggestionItem}
                    activeOpacity={0.8}
                  >
                    <LazyImage source={{ uri: getOptimizedImageUrl(food.image, 400) }} style={styles.suggestionCircularImg} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.vegSquareSmall, { borderColor: food.isVeg ? '#16A34A' : '#DC2626' }]}>
                          <View style={[styles.vegCircleSmall, { backgroundColor: food.isVeg ? '#16A34A' : '#DC2626' }]} />
                        </View>
                        {renderBoldedText(food.name, query)}
                      </View>
                      <Text style={styles.suggestionType}>
                        ₹{food.price} {food.restaurantName ? `• in ${food.restaurantName}` : ''}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#DEA430" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tap to execute full search button */}
            <TouchableOpacity
              style={styles.seeAllSuggestionsBtn}
              onPress={() => triggerSearch(query)}
              activeOpacity={0.85}
            >
              <Text style={styles.seeAllSuggestionsText}>See all results for "{query}"</Text>
              <ChevronRight size={18} color="#000000" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        )}

        {/* 2. SUBMITTED SEARCH RESULTS */}
        {isSubmitted && query.trim().length > 0 && (
          isLoadingResults ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DEA430" style={{ marginTop: 40 }} />
              <Text style={styles.loadingText}>Searching for "{query}"...</Text>
            </View>
          ) : searchMatchedRestaurants.length === 0 && searchMatchedDishes.length === 0 ? (
            /* ─── ZERO RESULTS FALLBACK (BETTER THAN SWIGGY) ─── */
            <View style={styles.zeroResultsContainer}>
              <View style={styles.zeroIconWrap}>
                <SearchIcon size={38} color="#DEA430" />
              </View>
              <Text style={styles.zeroTitle}>No matches found for "{query}"</Text>
              <Text style={styles.zeroSubtitle}>
                We couldn't find any dishes or restaurants. Try checking the spelling or explore popular cravings:
              </Text>

              <View style={styles.zeroChipsWrap}>
                {['Biryani', 'Pizza', 'Burgers', 'Momos', 'Desserts', 'Rolls'].map((term) => (
                  <TouchableOpacity
                    key={term}
                    style={styles.zeroChip}
                    onPress={() => triggerSearch(term)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.zeroChipText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.zeroResetBtn} onPress={handleClear} activeOpacity={0.8}>
                <Text style={styles.zeroResetBtnText}>Reset Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultsContainer}>
              
              {/* ─── RESTAURANTS TAB ACTIVE ─── */}
              {activeTab === 'Restaurants' && (
                <View style={styles.restaurantsTabWrapper}>
                  
                  {/* 1. HORIZONTAL PROMOTIONAL BANNERS */}
                  {dynamicPromoBanners.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.promoBannersScroll}
                      contentContainerStyle={styles.promoBannersContent}
                    >
                      {dynamicPromoBanners.map((banner) => (
                        <TouchableOpacity
                          key={banner.id}
                          style={styles.promoBannerCard}
                          activeOpacity={0.9}
                          onPress={() => onNavigateToRestaurant(banner.id)}
                        >
                          <LazyImage source={{ uri: banner.image }} style={styles.promoBannerImage} />
                          <View style={styles.promoBannerOverlay} />
                          
                          <View style={styles.promoBannerTopRow}>
                            <View style={styles.promoDealBadge}>
                              <Text style={styles.promoDealBadgeText}>{banner.deal}</Text>
                            </View>
                            {banner.ad && (
                              <View style={styles.promoAdBadge}>
                                <Text style={styles.promoAdBadgeText}>AD</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.promoBannerBottomDetails}>
                            <Text style={styles.promoBannerName} numberOfLines={1}>{banner.name}</Text>
                            <View style={styles.promoBannerMetaRow}>
                              <Star size={11} color="#DEA430" fill="#DEA430" style={{ marginRight: 3 }} />
                              <Text style={styles.promoBannerRating}>{banner.rating}</Text>
                              <Text style={styles.metaDot}>•</Text>
                              <Text style={styles.promoBannerTime}>{banner.deliveryTime}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* 2. PRIMARY RESTAURANT CARD */}
                  {primaryRestaurant && (
                    <TouchableOpacity
                      style={styles.primaryRestCard}
                      activeOpacity={0.88}
                      onPress={() => onNavigateToRestaurant(primaryRestaurant.id)}
                    >
                      <View style={styles.primaryRestImageWrap}>
                        <LazyImage
                          source={{ uri: getOptimizedImageUrl(primaryRestaurant.image, 500) }}
                          style={styles.primaryRestImage}
                        />
                        {primaryRestaurant.offer && (
                          <View style={styles.primaryRestDealBadge}>
                            <Text style={styles.primaryRestDealText}>{primaryRestaurant.offer}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.primaryRestDetails}>
                        <View style={styles.primaryRestBestRow}>
                          <Text style={styles.primaryRestBestText}>🏆 Best in {Array.isArray(primaryRestaurant.cuisine) ? primaryRestaurant.cuisine[0] : primaryRestaurant.cuisine || 'Fast Food'}</Text>
                        </View>
                        <Text style={styles.primaryRestName} numberOfLines={1}>
                          {primaryRestaurant.name}
                        </Text>
                        <View style={styles.primaryRestRatingRow}>
                          <Star size={12} color="#DEA430" fill="#DEA430" style={{ marginRight: 3 }} />
                          <Text style={styles.primaryRestRatingVal}>{primaryRestaurant.rating || '4.5'}</Text>
                          {primaryRestaurant.reviewCount ? (
                            <Text style={styles.primaryRestReviewCount}>
                              ({primaryRestaurant.reviewCount >= 1000 ? `${(primaryRestaurant.reviewCount / 1000).toFixed(1)}K+` : `${primaryRestaurant.reviewCount}+`})
                            </Text>
                          ) : null}
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.metaText}>{typeof primaryRestaurant.deliveryTime === 'number' ? `${primaryRestaurant.deliveryTime} mins` : primaryRestaurant.deliveryTime || '30–35 mins'}</Text>
                        </View>
                        <Text style={styles.primaryRestLocText} numberOfLines={1}>
                          {primaryRestaurant.address || primaryRestaurant.city || ''}{typeof primaryRestaurant.distance === 'number' ? ` • ${primaryRestaurant.distance.toFixed(1)} km` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* 3. DISHES CAROUSEL WITH STEPPER */}
                  {relatedDishes.length > 0 && (
                    <View style={styles.becauseSearchedSection}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeaderText}>
                          POPULAR DISHES MATCHING "{query.toUpperCase()}"
                        </Text>
                        <View style={styles.sectionHeaderLine} />
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.becauseDishesScroll}
                        contentContainerStyle={styles.becauseDishesContent}
                      >
                        {relatedDishes.map((food: any) => {
                          const cartItem = cartItems.find((i: any) => String(i.id) === String(food.id));
                          const qty = cartItem ? cartItem.quantity : 0;

                          return (
                            <View key={`dish_card_${food.id}`} style={styles.dishMiniCard}>
                              <View style={styles.dishMiniImageWrap}>
                                <LazyImage source={{ uri: getOptimizedImageUrl(food.image, 400) }} style={styles.dishMiniImage} />
                                
                                {/* Stepper or Add button right on the card! */}
                                {qty > 0 ? (
                                  <View style={styles.dishMiniStepperWrap}>
                                    <TouchableOpacity
                                      style={styles.miniStepperBtn}
                                      onPress={() => updateCartQuantity(food.id, qty - 1)}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                      <Minus size={11} color="#000000" strokeWidth={3} />
                                    </TouchableOpacity>
                                    <Text style={styles.miniStepperQty}>{qty}</Text>
                                    <TouchableOpacity
                                      style={styles.miniStepperBtn}
                                      onPress={() => updateCartQuantity(food.id, qty + 1)}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                      <Plus size={11} color="#000000" strokeWidth={3} />
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.dishMiniAddBtn}
                                    onPress={() => addToCart(food)}
                                    activeOpacity={0.8}
                                  >
                                    <Text style={styles.dishMiniAddPlus}>+</Text>
                                  </TouchableOpacity>
                                )}
                              </View>

                              <View style={styles.dishMiniDetails}>
                                <View style={styles.dishVegRow}>
                                  <View style={[styles.vegSquare, { borderColor: food.isVeg ? '#16A34A' : '#DC2626' }]}>
                                    <View style={[styles.vegCircle, { backgroundColor: food.isVeg ? '#16A34A' : '#DC2626' }]} />
                                  </View>
                                </View>
                                <Text style={styles.dishMiniName} numberOfLines={2}>{food.name}</Text>
                                <Text style={styles.dishMiniPrice}>₹{food.price}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* 4. MORE RESTAURANTS */}
                  {secondaryRestaurants.length > 0 && (
                    <View style={styles.moreResultsLikeThisSection}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeaderText}>ALL MATCHING RESTAURANTS</Text>
                        <View style={styles.sectionHeaderLine} />
                      </View>

                      <View style={styles.featuredRestList}>
                        {secondaryRestaurants.map((res: Restaurant, index: number) => {
                          const isHeartActive = savedHearts[res.id];
                          const cuisineLabel = Array.isArray(res.cuisine) ? res.cuisine.join(', ') : res.cuisine || 'Fast Food, Rolls';

                          return (
                            <TouchableOpacity
                              key={`sec_res_${res.id}_${index}`}
                              style={styles.featuredRestaurantCard}
                              activeOpacity={0.88}
                              onPress={() => onNavigateToRestaurant(res.id)}
                            >
                              <View style={styles.featuredCardImageWrap}>
                                <LazyImage
                                  source={{ uri: getOptimizedImageUrl(res.image, 500) }}
                                  style={styles.featuredCardImage}
                                />
                                <TouchableOpacity
                                  style={styles.featuredCardHeartBtn}
                                  onPress={() => toggleHeart(res.id)}
                                  activeOpacity={0.7}
                                >
                                  <Heart
                                    size={16}
                                    color={isHeartActive ? '#E8174B' : '#DEA430'}
                                    fill={isHeartActive ? '#E8174B' : 'transparent'}
                                  />
                                </TouchableOpacity>

                                {res.offer && (
                                  <View style={styles.featuredCardDealOverlay}>
                                    <Text style={styles.featuredCardDealPrimary}>
                                      {res.offer}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <View style={styles.featuredCardDetails}>
                                <Text style={styles.featuredCardName} numberOfLines={1}>
                                  {res.name}
                                </Text>

                                <View style={styles.featuredCardRatingRow}>
                                  <View style={styles.greenStarRatingBadge}>
                                    <Star size={10} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 2 }} />
                                    <Text style={styles.greenStarRatingVal}>{res.rating || '4.4'}</Text>
                                  </View>
                                  {res.reviewCount ? (
                                    <Text style={styles.featuredCardReviewCount}>
                                      ({res.reviewCount >= 1000 ? `${(res.reviewCount / 1000).toFixed(1)}K+` : `${res.reviewCount}+`})
                                    </Text>
                                  ) : null}
                                  <Text style={styles.metaDot}>•</Text>
                                  <Text style={styles.metaText}>{typeof res.deliveryTime === 'number' ? `${res.deliveryTime} mins` : res.deliveryTime || '35 mins'}</Text>
                                </View>

                                <Text style={styles.featuredCardCuisines} numberOfLines={1}>
                                  {cuisineLabel}
                                </Text>

                                <Text style={styles.featuredCardLoc} numberOfLines={1}>
                                  {res.address || res.city || ''}{typeof res.distance === 'number' ? ` • ${res.distance.toFixed(1)} km` : ''}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                </View>
              )}

              {/* ─── DISHES TAB ACTIVE ─── */}
              {activeTab === 'Dishes' && (
                <View style={styles.dishesTabWrapper}>
                  <View style={styles.dishesGroupedList}>
                    {dishesGroupedByRestaurant.map((group, groupIdx) => {
                      const res = group.restaurant;
                      const resDishes = group.dishes;

                      return (
                        <View key={`dish_group_${res.id}_${groupIdx}`} style={styles.dishGroupBlock}>
                          
                          {/* Restaurant Header Card */}
                          <TouchableOpacity
                            style={styles.restaurantGroupHeaderCard}
                            activeOpacity={0.88}
                            onPress={() => onNavigateToRestaurant(res.id)}
                          >
                            <View style={styles.restaurantGroupLogoWrap}>
                              <LazyImage
                                source={{ uri: getOptimizedImageUrl(res.image, 400) }}
                                style={styles.restaurantGroupLogo}
                              />
                            </View>

                            <View style={styles.restaurantGroupDetails}>
                              <Text style={styles.restaurantGroupName} numberOfLines={1}>
                                {res.name}
                              </Text>

                              <View style={styles.restaurantGroupRatingRow}>
                                <Star size={12} color="#DEA430" fill="#DEA430" style={{ marginRight: 3 }} />
                                <Text style={styles.restaurantGroupRatingVal}>{res.rating || '4.5'}</Text>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.metaText}>{typeof res.deliveryTime === 'number' ? `${res.deliveryTime} mins` : res.deliveryTime || '30 mins'}</Text>
                              </View>
                            </View>

                            <ChevronRight size={20} color="#DEA430" />
                          </TouchableOpacity>

                          {/* Horizontal Dishes Scroll for this restaurant */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.groupedDishesScroll}
                            contentContainerStyle={styles.groupedDishesContent}
                          >
                            {resDishes.map((food: any, foodIdx: number) => {
                              const originalPrice = Math.round(food.price * 1.25);
                              const cartItem = cartItems.find((i: any) => String(i.id) === String(food.id));
                              const qty = cartItem ? cartItem.quantity : 0;

                              return (
                                <View key={`dish_card_res_${food.id}_${foodIdx}`} style={styles.dishHorizontalCard}>
                                  
                                  {/* Top Row: Veg Indicator + Bestseller */}
                                  <View style={styles.dishCardTopRow}>
                                    <View style={styles.dishVegRow}>
                                      <View style={[styles.vegSquare, { borderColor: food.isVeg ? '#16A34A' : '#DC2626' }]}>
                                        <View style={[styles.vegCircle, { backgroundColor: food.isVeg ? '#16A34A' : '#DC2626' }]} />
                                      </View>
                                    </View>
                                    <Text style={styles.bestsellerTag}>☆ Bestseller</Text>
                                  </View>

                                  {/* Middle Content: Title, Rating, Image */}
                                  <View style={styles.dishCardMiddleRow}>
                                    <View style={styles.dishCardTextCol}>
                                      <Text style={styles.dishCardTitle} numberOfLines={2}>
                                        {food.name}
                                      </Text>

                                      <View style={styles.dishGreenRatingBadge}>
                                        <Star size={9} color="#4ADE80" fill="#4ADE80" style={{ marginRight: 2 }} />
                                        <Text style={styles.dishGreenRatingText}>
                                          {food.rating || '4.4'}
                                        </Text>
                                      </View>
                                    </View>

                                    <View style={styles.dishCardImageWrap}>
                                      <LazyImage
                                        source={{ uri: getOptimizedImageUrl(food.image, 400) }}
                                        style={styles.dishCardImage}
                                      />
                                    </View>
                                  </View>

                                  {/* Bottom Row: Price & ADD Button / Stepper */}
                                  <View style={styles.dishCardBottomRow}>
                                    <View style={styles.dishPriceWrap}>
                                      <Text style={styles.dishCurrentPrice}>₹{food.price}</Text>
                                      <Text style={styles.dishOriginalPrice}>₹{originalPrice}</Text>
                                    </View>

                                    {qty > 0 ? (
                                      <View style={styles.dishCardStepperBox}>
                                        <TouchableOpacity
                                          style={styles.stepperActionBtn}
                                          onPress={() => updateCartQuantity(food.id, qty - 1)}
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                          <Minus size={13} color="#000000" strokeWidth={3} />
                                        </TouchableOpacity>
                                        <Text style={styles.stepperQtyText}>{qty}</Text>
                                        <TouchableOpacity
                                          style={styles.stepperActionBtn}
                                          onPress={() => updateCartQuantity(food.id, qty + 1)}
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                          <Plus size={13} color="#000000" strokeWidth={3} />
                                        </TouchableOpacity>
                                      </View>
                                    ) : (
                                      <TouchableOpacity
                                        style={styles.dishAddBtn}
                                        onPress={() => addToCart(food)}
                                        activeOpacity={0.8}
                                      >
                                        <Text style={styles.dishAddBtnText}>ADD +</Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>

                                </View>
                              );
                            })}
                          </ScrollView>

                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

            </View>
          )
        )}

      </ScrollView>

      {/* ─── FLOATING MINI-CART PILL (Better than Swiggy) ─── */}
      {totalCartQty > 0 && (
        <TouchableOpacity
          style={[styles.floatingCartBar, { bottom: Math.max(insets.bottom, 12) + 8 }]}
          activeOpacity={0.9}
          onPress={() => {
            if (onNavigateToCart) {
              onNavigateToCart();
            } else {
              onBack();
            }
          }}
        >
          <View style={styles.floatingCartLeft}>
            <View style={styles.floatingCartIcon}>
              <ShoppingBag size={17} color="#000000" strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.floatingCartCountText}>{totalCartQty} {totalCartQty === 1 ? 'item' : 'items'} added</Text>
              <Text style={styles.floatingCartPriceText}>₹{totalCartPrice} plus taxes</Text>
            </View>
          </View>
          
          <View style={styles.floatingCartRight}>
            <Text style={styles.floatingCartCtaText}>View Cart</Text>
            <ChevronRight size={18} color="#000000" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      )}

      {/* ─── INTERACTIVE VOICE SEARCH MODAL ─── */}
      <Modal
        visible={isVoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVoiceModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsVoiceModalVisible(false)}>
          <View style={styles.voiceModalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.voiceCard}>
                <TouchableOpacity
                  style={styles.voiceCloseBtn}
                  onPress={() => setIsVoiceModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color="#8E8A80" />
                </TouchableOpacity>

                <View style={styles.voiceIconRing}>
                  <Volume2 size={32} color="#DEA430" />
                </View>

                <Text style={styles.voiceListeningTitle}>Listening...</Text>
                <Text style={styles.voiceSubtitle}>Speak dishes, restaurants, or cuisines</Text>

                {/* Animated Sound Wave Bars */}
                <View style={styles.soundWaveRow}>
                  <Animated.View style={[styles.soundWaveBar, { transform: [{ scaleY: wave1 }] }]} />
                  <Animated.View style={[styles.soundWaveBar, { transform: [{ scaleY: wave2 }] }]} />
                  <Animated.View style={[styles.soundWaveBar, { transform: [{ scaleY: wave3 }] }]} />
                  <Animated.View style={[styles.soundWaveBar, { transform: [{ scaleY: wave4 }] }]} />
                  <Animated.View style={[styles.soundWaveBar, { transform: [{ scaleY: wave5 }] }]} />
                </View>

                {/* Quick Voice Chips */}
                <Text style={styles.quickVoiceLabel}>Tap to simulate voice prompt:</Text>
                <View style={styles.voicePromptsRow}>
                  {['Hyderabadi Biryani', 'Margherita Pizza', 'Truffle Burger'].map((phrase, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.voicePromptChip}
                      activeOpacity={0.7}
                      onPress={() => {
                        setIsVoiceModalVisible(false);
                        triggerSearch(phrase);
                      }}
                    >
                      <Text style={styles.voicePromptChipText}>{phrase}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1814',
    paddingBottom: 4,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181613',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E2920',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  inputInnerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12110E',
    borderWidth: 1,
    borderColor: '#2B2822',
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: 'Urbanist-SemiBold',
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 6,
    marginRight: 2,
  },
  micSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#383228',
    marginRight: 8,
    marginLeft: 4,
  },
  micBtn: {
    padding: 4,
  },
  vegToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#12110E',
    borderWidth: 1,
    borderColor: '#2B2822',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
  },
  vegToggleCardActive: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
  },
  vegToggleLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-ExtraBold',
    color: '#16A34A',
    fontWeight: '900',
  },
  vegSwitchTrack: {
    width: 24,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2A261F',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  vegSwitchTrackActive: {
    backgroundColor: '#16A34A',
  },
  vegSwitchThumb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8E8A80',
  },
  vegSwitchThumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1814',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
  },
  tabTextActive: {
    color: '#DEA430',
  },
  tabTextInactive: {
    color: '#71717A',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 2.5,
    backgroundColor: '#DEA430',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // Filter Pills
  filterPillsScroll: {
    marginTop: 6,
    marginBottom: 4,
  },
  filterPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141310',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: '#DEA430',
    borderColor: '#DEA430',
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    color: '#CFCAC3',
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  nonVegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginRight: 5,
  },

  // Body
  bodyContent: {
    paddingTop: 8,
  },
  initialContainer: {
    paddingHorizontal: 16,
    gap: 22,
  },
  initialSection: {
    gap: 12,
  },
  initialSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  initialSectionTitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#DEA430',
    letterSpacing: 0.5,
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    color: '#8E8A80',
  },
  recentChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141310',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  recentChipTouchPart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentChipText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    color: '#E2DCD5',
  },
  recentDeleteBtn: {
    padding: 4,
    marginLeft: 4,
  },
  trendingSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#141310',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  trendingSearchChipText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-SemiBold',
    color: '#FFFFFF',
  },
  trendingTag: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    color: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cuisineRowContent: {
    gap: 14,
  },
  cuisineColCard: {
    alignItems: 'center',
    width: 66,
    gap: 6,
  },
  cuisineColImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#181613',
    borderWidth: 1.5,
    borderColor: '#2E2920',
  },
  cuisineColLabel: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Medium',
    color: '#CFCAC3',
    textAlign: 'center',
  },

  // Autocomplete Suggestions
  suggestionsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12110E',
    borderWidth: 1,
    borderColor: '#242018',
    borderRadius: 16,
    padding: 10,
  },
  suggestionCircularImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1C1A17',
  },
  suggestionType: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
    marginTop: 2,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
    letterSpacing: 0.5,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#26221A',
    marginLeft: 10,
  },
  seeAllSuggestionsBtn: {
    backgroundColor: '#DEA430',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  seeAllSuggestionsText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },

  // Zero Results View
  zeroResultsContainer: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 48,
    gap: 12,
  },
  zeroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(222, 164, 48, 0.1)',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  zeroTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  zeroSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  zeroChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  zeroChip: {
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#2E2920',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  zeroChipText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-SemiBold',
    color: '#DEA430',
  },
  zeroResetBtn: {
    backgroundColor: '#1E1B15',
    borderWidth: 1,
    borderColor: '#383228',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  zeroResetBtnText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },

  // Promo Banners
  promoBannersScroll: {
    marginBottom: 16,
  },
  promoBannersContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  promoBannerCard: {
    width: 220,
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#171614',
    borderWidth: 1,
    borderColor: '#26221A',
  },
  promoBannerImage: {
    width: '100%',
    height: '100%',
  },
  promoBannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  promoBannerTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoDealBadge: {
    backgroundColor: '#DEA430',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoDealBadgeText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  promoAdBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promoAdBadgeText: {
    fontSize: 9,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  promoBannerBottomDetails: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  promoBannerName: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  promoBannerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  promoBannerRating: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  promoBannerTime: {
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    color: '#FFFFFF',
  },
  metaDot: {
    fontSize: 11,
    color: '#8E8A80',
    marginHorizontal: 4,
  },

  // Primary Rest Card
  primaryRestCard: {
    backgroundColor: '#141310',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 18,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  primaryRestImageWrap: {
    height: 140,
    position: 'relative',
    backgroundColor: '#1E1B15',
  },
  primaryRestImage: {
    width: '100%',
    height: '100%',
  },
  primaryRestDealBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#DEA430',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryRestDealText: {
    fontSize: 11,
    fontFamily: 'Urbanist-ExtraBold',
    color: '#000000',
  },
  primaryRestDetails: {
    padding: 14,
    gap: 4,
  },
  primaryRestBestRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(222, 164, 48, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  primaryRestBestText: {
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  primaryRestName: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  primaryRestRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryRestRatingVal: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  primaryRestReviewCount: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
    marginLeft: 3,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#9E9A90',
  },
  primaryRestLocText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
    marginTop: 2,
  },

  // Because you searched section
  becauseSearchedSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  becauseDishesScroll: {
    marginHorizontal: -16,
  },
  becauseDishesContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  dishMiniCard: {
    width: 140,
    backgroundColor: '#141310',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dishMiniImageWrap: {
    width: '100%',
    height: 100,
    position: 'relative',
    backgroundColor: '#1E1B15',
  },
  dishMiniImage: {
    width: '100%',
    height: '100%',
  },
  dishMiniAddBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#DEA430',
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dishMiniAddPlus: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
    color: '#000000',
    lineHeight: 20,
  },
  dishMiniStepperWrap: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 4,
  },
  miniStepperBtn: {
    padding: 2,
  },
  miniStepperQty: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
    fontWeight: '800',
  },
  dishMiniDetails: {
    padding: 10,
    gap: 3,
  },
  dishVegRow: {
    marginBottom: 2,
  },
  vegSquare: {
    width: 12,
    height: 12,
    borderWidth: 1.2,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vegSquareSmall: {
    width: 11,
    height: 11,
    borderWidth: 1.2,
    borderRadius: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegCircleSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dishMiniName: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-SemiBold',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  dishMiniPrice: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
    marginTop: 2,
  },

  // Featured Restaurants List
  moreResultsLikeThisSection: {
    paddingHorizontal: 16,
    gap: 14,
  },
  featuredRestList: {
    gap: 14,
  },
  featuredRestaurantCard: {
    backgroundColor: '#141310',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 18,
    overflow: 'hidden',
  },
  featuredCardImageWrap: {
    height: 130,
    position: 'relative',
    backgroundColor: '#1E1B15',
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
  },
  featuredCardHeartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredCardDealOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#DEA430',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredCardDealPrimary: {
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },
  featuredCardDetails: {
    padding: 12,
    gap: 3,
  },
  featuredCardName: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  featuredCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenStarRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginRight: 4,
  },
  greenStarRatingVal: {
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  featuredCardReviewCount: {
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
  },
  featuredCardCuisines: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#A1A1AA',
  },
  featuredCardLoc: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Regular',
    color: '#71717A',
  },

  // Dishes Tab
  dishesTabWrapper: {
    paddingHorizontal: 16,
    gap: 16,
  },
  dishesGroupedList: {
    gap: 16,
  },
  dishGroupBlock: {
    backgroundColor: '#12110E',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 18,
    overflow: 'hidden',
    paddingBottom: 14,
  },
  restaurantGroupHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1C16',
  },
  restaurantGroupLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1C1A17',
  },
  restaurantGroupLogo: {
    width: '100%',
    height: '100%',
  },
  restaurantGroupDetails: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  restaurantGroupName: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  restaurantGroupRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantGroupRatingVal: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  groupedDishesScroll: {
    marginTop: 12,
  },
  groupedDishesContent: {
    paddingHorizontal: 14,
    gap: 12,
  },
  dishHorizontalCard: {
    width: 220,
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  dishCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestsellerTag: {
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  dishCardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dishCardTextCol: {
    flex: 1,
    gap: 4,
  },
  dishCardTitle: {
    fontSize: 13.5,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  dishGreenRatingBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  dishGreenRatingText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    color: '#4ADE80',
  },
  dishCardImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E1B15',
  },
  dishCardImage: {
    width: '100%',
    height: '100%',
  },
  dishCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dishPriceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  dishCurrentPrice: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  dishOriginalPrice: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#71717A',
    textDecorationLine: 'line-through',
  },
  dishAddBtn: {
    backgroundColor: '#DEA430',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dishAddBtnText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  dishCardStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 6,
  },
  stepperActionBtn: {
    padding: 2,
  },
  stepperQtyText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
    color: '#000000',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8A80',
  },
  resultsContainer: {
    gap: 16,
  },
  restaurantsTabWrapper: {
    gap: 16,
  },

  // Floating Mini Cart Bar
  floatingCartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: isTablet ? 600 : undefined,
    alignSelf: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 9999,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingCartIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartCountText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  floatingCartPriceText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Medium',
    color: 'rgba(0, 0, 0, 0.75)',
  },
  floatingCartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingCartCtaText: {
    fontSize: 13.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },

  // Voice Search Modal
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  voiceCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#141310',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#2E2920',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  voiceCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  voiceIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E1B15',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  voiceListeningTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  voiceSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8A80',
    marginBottom: 20,
  },
  soundWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: 8,
    marginBottom: 24,
  },
  soundWaveBar: {
    width: 5,
    height: 36,
    borderRadius: 3,
    backgroundColor: '#DEA430',
  },
  quickVoiceLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    color: '#CFCAC3',
    marginBottom: 10,
  },
  voicePromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  voicePromptChip: {
    backgroundColor: '#1E1B15',
    borderWidth: 1,
    borderColor: '#383228',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  voicePromptChipText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    color: '#DEA430',
  },
});
