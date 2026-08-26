import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useViewModel } from '../state/MainViewModel';
import { COLORS } from '../theme/Theme';
import { Restaurant } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Mic,
  Heart,
  Star,
  Percent,
  Gift,
  ArrowRight,
  ArrowLeft,
  X,
  Truck,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react-native';
import Svg, { Circle, Line, Polyline, Path, Rect } from 'react-native-svg';

import { getOptimizedImageUrl } from '../utils/imageUtils';
import { LazyImage } from '../components/LazyImage';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

interface SearchScreenProps {
  onBack: () => void;
  onNavigateToRestaurant: (id: string) => void;
  initialQuery?: string;
}

// Custom Svg Icons matching the screenshots
const SearchIcon = ({ color = '#999', size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="11" cy="11" r="8" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);

const BackArrow = ({ color = '#1A1A1A' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const VegBadge = ({ isVeg }: { isVeg: boolean }) => (
  <View style={[styles.vegBadgeOuter, { borderColor: isVeg ? '#16A34A' : '#DC2626' }]}>
    <View style={[styles.vegBadgeDot, { backgroundColor: isVeg ? '#16A34A' : '#DC2626' }]} />
  </View>
);

const PizzaHutHat = () => (
  <Svg width={44} height={28} viewBox="0 0 44 28" fill="none">
    <Path d="M4 20 Q22 2 40 20" fill="#ffffff" stroke="#ffffff" strokeWidth={1} />
    <Rect x={8} y={19} width={28} height={6} rx={3} fill="#ffffff" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={10} height={11} viewBox="0 0 12 14" fill="none">
    <Rect x={1} y={4} width={10} height={9} rx={1.5} stroke="#e8174b" strokeWidth={1.3} />
    <Path d="M4 4V3a2 2 0 1 1 4 0v1" stroke="#e8174b" strokeWidth={1.3} strokeLinecap="round" />
  </Svg>
);

// Helper function to render text with matching query highlighted in bold
const renderBoldedText = (text: string, query: string, isDarkMode: boolean = true) => {
  if (!query.trim()) return <Text style={{ color: '#eae1d4', fontSize: 14.5, fontFamily: 'Urbanist-Bold' }}>{text}</Text>;
  
  const regex = new RegExp(`(${query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <Text style={{ color: '#8a8a8a', fontSize: 14.5, fontFamily: 'Urbanist-Medium' }}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase().trim();
        return (
          <Text
            key={index}
            style={{
              fontFamily: isMatch ? 'Urbanist-Bold' : 'Urbanist-Medium',
              color: isMatch ? '#f2ca50' : '#8a8a8a',
            }}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

export const SearchScreen: React.FC<SearchScreenProps> = ({ onBack, onNavigateToRestaurant, initialQuery = '' }) => {
  const { allRestaurants, foodItems, categories, addToCart, cartItems } = useViewModel();
  const isDarkMode = true; // Force Black & Gold Theme matching Profile Screen

  const [query, setQuery] = useState(initialQuery);
  const [isSubmitted, setIsSubmitted] = useState(!!initialQuery);
  const [activeTab, setActiveTab] = useState<'Restaurants' | 'Dishes'>('Dishes');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedSubPill, setSelectedSubPill] = useState<string | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  React.useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setIsSubmitted(true);
      setActiveTab('Dishes');
      setIsLoadingResults(true);
      const timer = setTimeout(() => {
        setIsLoadingResults(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [initialQuery]);

  const [heroSaved, setHeroSaved] = useState(false);
  const [featSaved, setFeatSaved] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  const themeTextColor = isDarkMode ? '#FFFFFB' : '#1e293b';

  // ─── AUTOCOMPLETE SUGGESTIONS LOGIC ───
  
  // First item match: category, restaurant, or dish match
  const firstSuggestion = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    
    // 1. Check exact or prefix category match
    const cat = categories.find(c => c.name.toLowerCase().includes(q));
    if (cat) {
      return {
        name: cat.name,
        type: 'Dish',
        image: cat.imageUrl,
        isCategory: true,
      };
    }
    
    // 2. Check exact or prefix restaurant name match
    const res = allRestaurants.find(r => r.name.toLowerCase().includes(q));
    if (res) {
      return {
        name: res.name,
        type: 'Restaurant',
        image: res.image,
        isRestaurant: true,
      };
    }
    
    // 3. Check exact or prefix dish match
    const food = foodItems.find(f => f.name.toLowerCase().includes(q));
    if (food) {
      return {
        name: food.name,
        type: 'Dish',
        image: food.image,
        isDish: true,
      };
    }
    
    // Fallback to searching the query itself
    return {
      name: query.trim(),
      type: 'Dish',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=60',
    };
  }, [query, categories, allRestaurants, foodItems]);

  // Restaurants relevant for query (top 1 match)
  const relevantRestaurants = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    
    const matches = allRestaurants.filter((res: Restaurant) => {
      const cuisineStr = Array.isArray(res.cuisine)
        ? (res.cuisine as string[]).join(', ')
        : typeof res.cuisine === 'string'
          ? res.cuisine
          : '';
      return res.name.toLowerCase().includes(q) || cuisineStr.toLowerCase().includes(q);
    });
    
    // Exclude the first suggestion if it's the exact same restaurant
    const filtered = matches.filter((res: Restaurant) => {
      if (firstSuggestion?.isRestaurant && firstSuggestion.name === res.name) return false;
      return true;
    });
    
    return filtered.slice(0, 1); // Only show top 1 match as "relevant restaurant" (like Mom's Pizzateria in the reference image)
  }, [query, allRestaurants, firstSuggestion]);

  // More results matching your query: remaining restaurants and matching dishes
  const moreResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    
    // Remaining matching restaurants
    const matchedRes = allRestaurants.filter((res: Restaurant) => {
      const cuisineStr = Array.isArray(res.cuisine)
        ? (res.cuisine as string[]).join(', ')
        : typeof res.cuisine === 'string'
          ? res.cuisine
          : '';
      return res.name.toLowerCase().includes(q) || cuisineStr.toLowerCase().includes(q);
    });
    const secondaryRes = matchedRes.filter((res: Restaurant) => {
      if (firstSuggestion?.isRestaurant && firstSuggestion.name === res.name) return false;
      if (relevantRestaurants.some((r: Restaurant) => r.id === res.id)) return false;
      return true;
    });

    // Dishes matching query
    const matchedDishes = foodItems.filter((food: any) =>
      food.name.toLowerCase().includes(q)
    );

    // Combine them
    const items: any[] = [];
    
    // Add dishes
    matchedDishes.forEach((food: any) => {
      items.push({
        id: `dish_${food.id}`,
        name: food.name,
        type: 'Dish',
        image: food.image,
        foodObj: food,
      });
    });

    // Add secondary restaurants
    secondaryRes.forEach((res: Restaurant) => {
      items.push({
        id: `res_${res.id}`,
        name: res.name,
        type: 'Restaurant',
        image: res.image,
        resObj: res,
      });
    });

    return items;
  }, [query, allRestaurants, foodItems, firstSuggestion, relevantRestaurants]);

  // ─── SUBMITTED SEARCH RESULTS LOGIC ───

  // Filtered matching restaurants for the Restaurants Tab
  const searchMatchedRestaurants = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase().trim();

    return allRestaurants.filter((res: Restaurant) => {
      const cuisineStr = Array.isArray(res.cuisine)
        ? (res.cuisine as string[]).join(', ')
        : typeof res.cuisine === 'string'
          ? res.cuisine
          : '';
      const nameMatch = res.name.toLowerCase().includes(lowerQuery) || cuisineStr.toLowerCase().includes(lowerQuery);
      
      // Check if any of its menu items match the query
      const hasMatchingDish = foodItems.some(
        (food: any) => food.restaurantId === res.id && food.name.toLowerCase().includes(lowerQuery)
      );

      return nameMatch || hasMatchingDish;
    });
  }, [query, allRestaurants, foodItems]);

  // Primary matched restaurant card (e.g. KFC or direct match)
  const primaryRestaurant = useMemo(() => {
    if (searchMatchedRestaurants.length === 0) return null;
    const directMatch = searchMatchedRestaurants.find(
      (res: Restaurant) => res.name.toLowerCase() === query.toLowerCase().trim()
    );
    return directMatch || searchMatchedRestaurants[0];
  }, [searchMatchedRestaurants, query]);

  // Remaining restaurants in results
  const secondaryRestaurants = useMemo(() => {
    if (searchMatchedRestaurants.length === 0) return [];
    if (!primaryRestaurant) return searchMatchedRestaurants;
    return searchMatchedRestaurants.filter((res: Restaurant) => res.id !== primaryRestaurant.id);
  }, [searchMatchedRestaurants, primaryRestaurant]);

  // Filtered matching dishes for the Dishes Tab
  const searchMatchedDishes = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase().trim();
    return foodItems.filter((food: any) => {
      if (vegOnly && !food.isVeg) return false;
      return food.name.toLowerCase().includes(lowerQuery) ||
             (food.description && food.description.toLowerCase().includes(lowerQuery)) ||
             (food.categoryName && food.categoryName.toLowerCase().includes(lowerQuery));
    });
  }, [query, foodItems, vegOnly]);

  // Dynamic dynamic pills/categories for sub-filtering
  const subCategoryPills = useMemo(() => {
    if (searchMatchedDishes.length === 0) return [];
    const pillsSet = new Set<string>();
    
    searchMatchedDishes.forEach((food: any) => {
      if (food.categoryName) {
        pillsSet.add(food.categoryName);
      }
      const name = food.name.toLowerCase();
      if (name.includes('chicken')) pillsSet.add('Chicken');
      if (name.includes('margherita')) pillsSet.add('Margherita');
      if (name.includes('tikka')) pillsSet.add('Tikka');
      if (name.includes('tandoori')) pillsSet.add('Tandoori');
      if (name.includes('corn')) pillsSet.add('Corn');
      if (name.includes('veg')) pillsSet.add('Veg');
      if (name.includes('cheese') || name.includes('paneer')) pillsSet.add('Paneer');
    });

    return Array.from(pillsSet).slice(0, 8);
  }, [searchMatchedDishes]);

  // Filter dishes by the sub-category pill
  const filteredDishes = useMemo(() => {
    let dishes = searchMatchedDishes;
    if (selectedSubPill) {
      const pillLower = selectedSubPill.toLowerCase();
      dishes = dishes.filter((food: any) => 
        (food.categoryName && food.categoryName.toLowerCase() === pillLower) ||
        food.name.toLowerCase().includes(pillLower) ||
        (food.description && food.description.toLowerCase().includes(pillLower))
      );
    }
    return dishes;
  }, [searchMatchedDishes, selectedSubPill]);

  // Group foods by restaurant ID
  const featuredRestaurantsData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredDishes.forEach((food: any) => {
      if (!groups[food.restaurantId]) {
        groups[food.restaurantId] = [];
      }
      groups[food.restaurantId].push(food);
    });

    return Object.keys(groups).map((restId: string) => {
      const res = allRestaurants.find((r: Restaurant) => r.id === restId);
      return {
        restaurant: res,
        dishes: groups[restId],
      };
    }).filter((item): item is { restaurant: Restaurant; dishes: any[] } => item.restaurant !== undefined);
  }, [filteredDishes, allRestaurants]);

  // Horizontal restaurant banners at the top of Dishes tab
  const horizontalBanners = useMemo(() => {
    return featuredRestaurantsData.map(item => item.restaurant).filter(Boolean);
  }, [featuredRestaurantsData]);

  // Perform search submission
  const triggerSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setIsSubmitted(true);
    setIsLoadingResults(true);
    setTimeout(() => {
      setIsLoadingResults(false);
    }, 400);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedSubPill(null);
    setIsSubmitted(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F4F6F8' }]}>
      
      {/* ─── SEARCH HEADER INPUT BLOCK (Identical to TopSearchSheetOverlay) ─── */}
      <View style={[styles.headerContainer, isDarkMode && styles.headerContainerDark]}>
        <SafeAreaView style={{ backgroundColor: 'transparent' }}>
          {/* 1. TOP HEADER ROW */}
          <View style={styles.topHeaderRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color={isDarkMode ? '#FFFFFB' : '#1E293B'} strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isDarkMode && styles.textWhite]}>
              Search for dishes & restaurants
            </Text>
          </View>

          {/* 2. SEARCH INPUT BOX */}
          <View style={styles.inputCardWrapper}>
            <View style={[styles.inputInnerRow, isDarkMode && styles.inputInnerRowDark]}>
              <View style={styles.activeCursorLine} />
              <TextInput
                style={[styles.textInput, isDarkMode && styles.textWhite]}
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setIsSubmitted(false);
                }}
                placeholder="Search, Order, Enjoy, Repeat!"
                placeholderTextColor="#94A3B8"
                returnKeyType="search"
                onSubmitEditing={() => triggerSearch(query)}
                autoCorrect={false}
              />
              {query.length > 0 ? (
                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                  <X size={18} color={isDarkMode ? '#A1A1AA' : '#64748B'} />
                </TouchableOpacity>
              ) : null}

              <View style={styles.micSection}>
                <View style={styles.micDivider} />
                <TouchableOpacity style={styles.micBtn} onPress={() => Alert.alert('Voice Search', 'Speak now...')}>
                  <Mic size={18} color="#F97316" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* TABS ROW (only visible when search is submitted) */}
          {isSubmitted && query.trim().length > 0 && (
            <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('Restaurants')}
              style={[styles.tabButton, activeTab === 'Restaurants' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, activeTab === 'Restaurants' && styles.tabTextActive, isDarkMode && styles.textWhite]}>
                Restaurants
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('Dishes')}
              style={[styles.tabButton, activeTab === 'Dishes' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, activeTab === 'Dishes' && styles.tabTextActive, isDarkMode && styles.textWhite]}>
                Dishes
              </Text>
            </TouchableOpacity>
          </View>
        )}
        </SafeAreaView>
      </View>

      {/* ─── BODY VIEWPORT ─── */}
      <ScrollView contentContainerStyle={styles.bodyContent} nestedScrollEnabled={true}>
        
        {/* 1. AUTOCOMPLETE SUGGESTIONS VIEW (typing, not submitted) */}
        {!isSubmitted && query.trim().length > 0 && (
          <View style={styles.suggestionsContainer}>
            {/* 1. First Suggestion Item (exact/best match) */}
            {firstSuggestion && (
              <TouchableOpacity
                onPress={() => {
                  if (firstSuggestion.isRestaurant) {
                    const res = allRestaurants.find(r => r.name === firstSuggestion.name);
                    if (res) onNavigateToRestaurant(res.id);
                  } else {
                    triggerSearch(firstSuggestion.name);
                  }
                }}
                style={[styles.suggestionItem, isDarkMode && styles.suggestionItemDark]}
              >
                <LazyImage source={{ uri: getOptimizedImageUrl(firstSuggestion.image, 500) }} style={styles.suggestionCircularImg} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  {renderBoldedText(firstSuggestion.name, query, isDarkMode)}
                  <Text style={styles.suggestionType}>{firstSuggestion.type}</Text>
                </View>
                <SearchIcon size={16} />
              </TouchableOpacity>
            )}

            {/* 2. Restaurants Relevant Section */}
            {relevantRestaurants.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>Restaurants relevant for '{query}'</Text>
                {relevantRestaurants.map((res: Restaurant) => (
                  <TouchableOpacity
                    key={res.id}
                    onPress={() => onNavigateToRestaurant(res.id)}
                    style={[styles.suggestionItem, isDarkMode && styles.suggestionItemDark]}
                  >
                    <LazyImage source={{ uri: getOptimizedImageUrl(res.image, 500) }} style={styles.suggestionCircularImg} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      {renderBoldedText(res.name, query, isDarkMode)}
                      <Text style={styles.suggestionType}>
                        ★ {res.rating} ({res.reviewCount}+) • 45 mins • {res.city}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 3. More results matching query (combined dishes & other restaurants) */}
            {moreResults.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>More results matching your query</Text>
                {moreResults.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (item.type === 'Restaurant') {
                        onNavigateToRestaurant(item.resObj.id);
                      } else {
                        triggerSearch(item.name);
                      }
                    }}
                    style={[styles.suggestionItem, isDarkMode && styles.suggestionItemDark]}
                  >
                    <LazyImage source={{ uri: getOptimizedImageUrl(item.image, 500) }} style={styles.suggestionCircularImg} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      {renderBoldedText(item.name, query, isDarkMode)}
                      <Text style={styles.suggestionType}>
                        {item.type === 'Restaurant'
                          ? `★ ${item.resObj.rating} (${item.resObj.reviewCount}+) • 45-55 mins • ${item.resObj.city}`
                          : 'Dish'}
                      </Text>
                    </View>
                    {item.type === 'Dish' && <SearchIcon size={16} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        {/* 2. SUBMITTED RESULTS VIEW */}
        {isSubmitted && query.trim().length > 0 && (
          isLoadingResults ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#e8174b" style={{ marginTop: 30 }} />
              <Text style={[styles.loadingText, isDarkMode && styles.textWhite]}>
                Searching for "{query}"...
              </Text>
              
              <View style={styles.skeletonWrapper}>
                {[1, 2, 3, 4].map((key) => (
                  <View key={key} style={[styles.skeletonCard, isDarkMode && styles.skeletonCardDark]}>
                    <View style={[styles.skeletonImage, isDarkMode && styles.skeletonImageDark]} />
                    <View style={styles.skeletonLines}>
                      <View style={[styles.skeletonLineTitle, isDarkMode && styles.skeletonLineDark]} />
                      <View style={[styles.skeletonLineSub, isDarkMode && styles.skeletonLineDark]} />
                      <View style={[styles.skeletonLinePrice, isDarkMode && styles.skeletonLineDark]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.resultsContainer}>
            
            {/* RESTAURANTS TAB ACTIVE */}
            {activeTab === 'Restaurants' && (
              <View style={styles.restaurantsTabContainer}>
                {primaryRestaurant ? (
                  <View>
                    {/* 1. HERO RESTAURANT CARD */}
                    <View style={[styles.heroCardContainer, isDarkMode && styles.heroCardContainerDark]}>
                      <View style={styles.heroCardMedia}>
                        <LazyImage source={{ uri: getOptimizedImageUrl(primaryRestaurant.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500', 500) }} style={styles.heroCardImage}
                        />
                        <View style={styles.heroCardOverlay} />
                        
                        {/* Top controls row */}
                        <View style={styles.heroCardTopRow}>
                          <View style={styles.heroCardTopLeft}>
                            <View style={styles.oneBadgeHero}>
                              <Text style={styles.oneBadgeTextHero}>one</Text>
                            </View>
                            <View style={styles.bestBadgeHero}>
                              <Text style={styles.bestBadgeTextHero}>🏆 Best in Pizza</Text>
                            </View>
                          </View>
                          
                          <TouchableOpacity 
                            style={styles.favIconWrapper}
                            onPress={() => setHeroSaved(!heroSaved)}
                          >
                            <Heart 
                              size={18} 
                              color={heroSaved ? '#E8174B' : '#FFFFFF'} 
                              fill={heroSaved ? '#E8174B' : 'transparent'} 
                            />
                          </TouchableOpacity>
                        </View>
                        
                        {/* Title and details block absolute bottom */}
                        <View style={styles.heroCardDetailsBlock}>
                          <Text style={styles.heroRestaurantName}>
                            {primaryRestaurant.name}
                          </Text>
                          
                          <View style={styles.heroMetaRow}>
                            <View style={styles.heroRatingBg}>
                              <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                              <Text style={styles.heroRatingVal}>{primaryRestaurant.rating}</Text>
                            </View>
                            <Text style={styles.heroRatingCount}>({primaryRestaurant.reviewCount || 100}+)</Text>
                            <Text style={styles.heroMetaDot}>•</Text>
                            <Text style={styles.heroMetaTime}>35–45 mins</Text>
                          </View>
                          
                          <Text style={styles.heroCuisineText}>
                            {Array.isArray(primaryRestaurant.cuisine) ? (primaryRestaurant.cuisine as string[]).join(', ') : primaryRestaurant.cuisine} • {primaryRestaurant.city} • 2.7 km
                          </Text>
                          
                          {/* Sub badges */}
                          <View style={styles.heroSubBadgesRow}>
                            <View style={styles.heroPriceBadge}>
                              <Text style={styles.heroPriceBadgeLabel}>ITEMS AT</Text>
                              <Text style={styles.heroPriceBadgeValue}>₹74</Text>
                            </View>
                            <View style={styles.heroDeliveryBadge}>
                              <Text style={styles.heroDeliveryBadgeLabel}>FREE DELIVERY</Text>
                              <Text style={styles.heroDeliveryBadgeValue}>ABOVE ₹199</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      
                      {/* Grid row below hero image */}
                      <View style={styles.heroInfoGrid}>
                        <View style={[styles.heroGridCol, styles.heroGridColBorder]}>
                          <View style={styles.heroGridIconCircle}>
                            <Truck size={16} color="#f2ca50" strokeWidth={2.2} />
                          </View>
                          <View>
                            <Text style={[styles.heroGridColTitle, isDarkMode && styles.textWhite]}>Delivery</Text>
                            <Text style={styles.heroGridColSub}>35–45 mins</Text>
                          </View>
                        </View>
                        
                        <View style={[styles.heroGridCol, styles.heroGridColBorder]}>
                          <View style={styles.heroGridIconCircle}>
                            <Percent size={15} color="#f2ca50" strokeWidth={2.2} />
                          </View>
                          <View>
                            <Text style={[styles.heroGridColTitle, isDarkMode && styles.textWhite]}>Offers</Text>
                            <Text style={styles.heroGridColSub}>6 Available</Text>
                          </View>
                        </View>
                        
                        <View style={styles.heroGridCol}>
                          <View style={styles.heroGridIconCircle}>
                            <ShieldCheck size={16} color="#39D98A" strokeWidth={2.2} />
                          </View>
                          <View>
                            <Text style={[styles.heroGridColTitle, isDarkMode && styles.textWhite]}>Hygiene</Text>
                            <Text style={styles.heroGridColSub}>Safety assured</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* 2. RECOMMENDED MENU SECTION */}
                    {foodItems.filter((f: any) => f.restaurantId === primaryRestaurant.id).length > 0 && (
                      <View style={[styles.recommendedSection, isDarkMode && styles.recommendedSectionDark]}>
                        <View style={styles.recommendedHeader}>
                          <Text style={[styles.recommendedSectionTitle, isDarkMode && styles.textWhite]}>
                            Recommended in this menu
                          </Text>
                          <TouchableOpacity 
                            style={styles.viewFullMenuBtn}
                            onPress={() => onNavigateToRestaurant(primaryRestaurant.id)}
                          >
                            <Text style={styles.viewFullMenuText}>View full menu</Text>
                            <ChevronRight size={14} color="#f2ca50" />
                          </TouchableOpacity>
                        </View>
                        
                        <ScrollView 
                          horizontal={true} 
                          showsHorizontalScrollIndicator={false}
                          style={styles.recommendedHorizontalScroll}
                          contentContainerStyle={styles.recommendedScrollContent}
                          nestedScrollEnabled={true}
                        >
                          {foodItems
                            .filter((f: any) => f.restaurantId === primaryRestaurant.id)
                            .slice(0, 5)
                            .map((food: any) => (
                              <View key={`rec_dish_${food.id}`} style={[styles.productCard, isDarkMode && styles.productCardDark]}>
                                <View style={styles.productCardImageArea}>
                                  <LazyImage source={{ uri: getOptimizedImageUrl(food.image, 500) }} style={styles.productCardImage} />
                                  <View style={{ position: 'absolute', top: 7, left: 7, zIndex: 10, backgroundColor: '#FFFFFF', padding: 2, borderRadius: 2 }}>
                                    <VegBadge isVeg={food.isVeg} />
                                  </View>
                                  
                                  {/* Plus Button to add to cart */}
                                  <TouchableOpacity 
                                    style={[
                                      styles.productCardPlusBtn,
                                      cartItems.some(i => i.id === food.id) && styles.productCardPlusBtnActive
                                    ]}
                                    onPress={() => addToCart(food)}
                                  >
                                    <Text style={[
                                      styles.productCardPlusText,
                                      cartItems.some(i => i.id === food.id) && styles.productCardPlusTextActive
                                    ]}>
                                      {cartItems.some(i => i.id === food.id) ? '✓' : '+'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                                
                                <View style={styles.productCardDetails}>
                                  <Text style={[styles.productCardName, isDarkMode && styles.textWhite]} numberOfLines={2}>
                                    {food.name}
                                  </Text>
                                  <View style={styles.productCardRatingRow}>
                                    <Star size={10} color="#279E48" fill="#279E48" />
                                    <Text style={styles.productCardRatingVal}>{food.rating}</Text>
                                    <Text style={styles.productCardReviewCount}>({Math.floor(10 + Math.random() * 50)})</Text>
                                  </View>
                                  
                                  <View style={styles.productCardPriceRow}>
                                    <Text style={[styles.productCardPriceText, isDarkMode && styles.textWhite]}>₹{food.price}</Text>
                                    <Text style={styles.productCardOriginalPrice}>₹{Math.round(food.price * 1.5)}</Text>
                                  </View>
                                  
                                  <View style={styles.productCardDiscountRow}>
                                    <ShoppingBag size={10} color="#f2ca50" />
                                    <Text style={styles.productCardDiscountPrice}>₹{Math.round(food.price * 0.9)}</Text>
                                    <Text style={styles.productCardMinOrderText} numberOfLines={1}>Above ₹1200</Text>
                                  </View>
                                </View>
                              </View>
                            ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* 3. PROMOTIONAL OFFER BANNER */}
                    <View style={styles.promoOfferBannerContainer}>
                      <View style={styles.promoOfferBanner}>
                        <View style={styles.promoOfferIconCircle}>
                          <Gift size={20} color="#f2ca50" />
                        </View>
                        <View style={styles.promoOfferTexts}>
                          <Text style={styles.promoOfferMainText}>
                            Add items worth <Text style={styles.promoOfferBoldHighlight}>₹100 more</Text> to get extra <Text style={styles.promoOfferBoldHighlight}>10% OFF</Text>
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.promoOfferExploreBtn}
                          onPress={() => onNavigateToRestaurant(primaryRestaurant.id)}
                        >
                          <Text style={styles.promoOfferExploreText}>Explore Menu</Text>
                          <ArrowRight size={12} color="#000000" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 4. FEATURED RESTAURANT SECTION / MORE RESULTS */}
                    {secondaryRestaurants.length > 0 && (
                      <View style={styles.featuredSection}>
                        <Text style={[styles.featuredHeading, isDarkMode && styles.textWhite]}>More results like this</Text>
                        <View style={styles.featuredSubheadingRow}>
                          <Text style={styles.featuredSubheadingText}>FEATURED RESTAURANTS</Text>
                          <TouchableOpacity onPress={() => Alert.alert('All Restaurants', 'Redirecting to full results...')}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.seeAllText}>See all</Text>
                              <ChevronRight size={13} color="#f2ca50" />
                            </View>
                          </TouchableOpacity>
                        </View>
                        
                        {secondaryRestaurants.slice(0, 3).map((res: Restaurant, index: number) => {
                          return (
                            <TouchableOpacity
                              key={`sec_restro_${res.id}`}
                              activeOpacity={0.9}
                              onPress={() => onNavigateToRestaurant(res.id)}
                              style={[styles.featuredRestaurantCard, isDarkMode && styles.featuredRestaurantCardDark]}
                            >
                              {/* Brand Tile (e.g. Pizza Hut Brand Tile style) */}
                              <View style={[
                                styles.brandTile, 
                                { backgroundColor: index % 2 === 0 ? '#8B1A1A' : '#1A365D' }
                              ]}>
                                <PizzaHutHat />
                                <Text style={styles.brandTileInitials} numberOfLines={1}>{res.name}</Text>
                                <View style={styles.brandTileBadge}>
                                  <Text style={styles.brandTileBadgeText}>ZERO PACKAGING</Text>
                                </View>
                                <View style={styles.brandTileBadge}>
                                  <Text style={styles.brandTileBadgeText}>CHARGE</Text>
                                </View>
                              </View>
                              
                              {/* Details side */}
                              <View style={styles.featuredCardDetails}>
                                <View style={styles.featuredCardHeaderRow}>
                                  <View style={{ flex: 1, minWidth: 0 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                      <Text style={{ fontSize: 11 }}>🏅</Text>
                                      <Text style={styles.featuredCardBestCuisineText} numberOfLines={1}>Best in Pizza</Text>
                                    </View>
                                    <Text style={[styles.featuredCardNameText, isDarkMode && styles.textWhite]} numberOfLines={1}>
                                      {res.name}
                                    </Text>
                                    
                                    <View style={styles.featuredCardMetaRow}>
                                      <View style={styles.featuredCardRatingBg}>
                                        <Star size={9} color="#FFFFFF" fill="#FFFFFF" />
                                        <Text style={styles.featuredCardRatingVal}>{res.rating}</Text>
                                      </View>
                                      <Text style={styles.featuredCardRatingCount}>({res.reviewCount || 120}+)</Text>
                                      <Text style={styles.featuredCardMetaDot}>•</Text>
                                      <Text style={styles.featuredCardMetaTime}>25–30 mins</Text>
                                    </View>
                                    <Text style={styles.featuredCardLocText} numberOfLines={1}>
                                      {res.city} • 3.1 km • ₹200 for two
                                    </Text>
                                  </View>
                                  
                                  {/* Right side heart & discount info */}
                                  <View style={styles.featuredCardRightColumn}>
                                    <TouchableOpacity 
                                      style={styles.featHeartBtn}
                                      onPress={() => setFeatSaved(!featSaved)}
                                    >
                                      <Heart 
                                        size={16} 
                                        color={featSaved ? '#E8174B' : '#aaa'} 
                                        fill={featSaved ? '#E8174B' : 'transparent'} 
                                      />
                                    </TouchableOpacity>
                                    
                                    <View style={styles.featuredCardDiscountContainer}>
                                      <Text style={styles.featuredCardDiscountText}>50% OFF</Text>
                                      <Text style={styles.featuredCardDiscountSubtext}>UPTO ₹120</Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                        
                        {/* Page Indicator dots */}
                        <View style={styles.indicatorsContainer}>
                          {[0, 1, 2, 3].map((i) => (
                            <TouchableOpacity 
                              key={`dot_${i}`}
                              onPress={() => setActiveDot(i)}
                              style={[
                                styles.indicatorDot,
                                i === activeDot && styles.indicatorDotActive
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, isDarkMode && styles.textWhite]}>
                      No matching restaurants found
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* DISHES TAB ACTIVE */}
            {activeTab === 'Dishes' && (
              <View style={styles.dishesTabContainer}>
                
                {/* 1. TOP FILTERS ROW */}
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersScrollContent} nestedScrollEnabled={true}>
                  <TouchableOpacity style={styles.filterPill} onPress={() => Alert.alert('Sort By', 'Sort by Relevance, Rating, Cost...')}>
                    <Text style={[styles.filterText, isDarkMode && styles.textWhite]}>Sort By</Text>
                    <ChevronRight size={12} color={isDarkMode ? '#FFF' : '#6B7280'} style={{ transform: [{ rotate: '90deg' }], marginLeft: 2 }} />
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.filterPill, styles.storePill]} onPress={() => Alert.alert('99 Store', 'Items under ₹99!')}>
                    <Text style={styles.storePillText}>99 store</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.filterPill} onPress={() => Alert.alert('Bolt', 'Delivery within 15 mins!')}>
                    <Text style={styles.boltPillText}>Bolt⚡ 15 mins</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.filterPill} onPress={() => Alert.alert('Swiggy One', 'Free delivery & extra benefits!')}>
                    <Text style={styles.onePillOrange}>one</Text>
                    <Text style={styles.onePillGrey}> BENEFITS</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* 2. SUB-CATEGORY PILLS ROW */}
                {subCategoryPills.length > 0 && (
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.subPillsScroll} contentContainerStyle={styles.subPillsScrollContent} nestedScrollEnabled={true}>
                    {subCategoryPills.map((pill: string) => {
                      const isActive = selectedSubPill === pill;
                      const pillColor = isActive ? '#f2ca50' : '#8a8a8a';
                      const pillBorder = isActive ? '#d4af37' : '#2a2a2a';
                      const pillBg = isActive ? 'rgba(212, 175, 55, 0.18)' : '#0f0f0f';
                      
                      return (
                        <TouchableOpacity
                          key={pill}
                          onPress={() => setSelectedSubPill(isActive ? null : pill)}
                          style={[
                            styles.subPill,
                            { borderColor: pillBorder, backgroundColor: pillBg }
                          ]}
                        >
                          <Text style={[styles.subPillText, { color: pillColor, fontFamily: isActive ? 'Urbanist-Bold' : 'Urbanist-Medium' }]}>
                            {pill}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* 3. HORIZONTAL RESTAURANT BANNERS */}
                {horizontalBanners.length > 0 && (
                  <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.bannersScroll} contentContainerStyle={styles.bannersScrollContent} nestedScrollEnabled={true}>
                    {horizontalBanners.map((res: any) => (
                      <TouchableOpacity
                        key={`banner_${res.id}`}
                        onPress={() => onNavigateToRestaurant(res.id)}
                        style={styles.bannerCard}
                        activeOpacity={0.9}
                      >
                        <LazyImage source={{ uri: getOptimizedImageUrl(res.image, 500) }} style={styles.bannerImg} />
                        {/* Orange discount badge */}
                        <View style={styles.bannerDiscountBadge}>
                          <Text style={styles.bannerDiscountText}>GET 50% OFF</Text>
                        </View>
                        {/* Gradient overlay for text */}
                        <View style={styles.bannerOverlay}>
                          <Text style={styles.bannerTitle}>{res.name}</Text>
                          <Text style={styles.bannerSubtitle}>★ {res.rating} • 30-35 mins</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* 4. FEATURED RESTAURANTS LIST */}
                {featuredRestaurantsData.length > 0 ? (
                  <View style={styles.featuredContainer}>
                    <View style={styles.featuredHeaderRow}>
                      <Text style={styles.featuredLabel}>FEATURED RESTAURANTS</Text>
                      <View style={styles.featuredLine} />
                    </View>

                    {featuredRestaurantsData.map(({ restaurant, dishes }) => (
                      <View key={`featured_${restaurant.id}`} style={[styles.featuredRestCard, isDarkMode && styles.featuredRestCardDark]}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => onNavigateToRestaurant(restaurant.id)}
                          style={styles.featuredRestHeader}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.featuredRestName, isDarkMode && styles.textWhite]}>
                              {restaurant.name}
                            </Text>
                            <View style={styles.featuredRestSubRow}>
                              <Star size={13} color="#39D98A" fill="#39D98A" />
                              <Text style={[styles.featuredRatingText, isDarkMode && styles.textWhite]}>
                                {restaurant.rating} ({restaurant.reviewCount}+) • 25-30 mins
                              </Text>
                            </View>
                          </View>
                          <ChevronRight size={18} color="#f2ca50" />
                        </TouchableOpacity>

                        {/* Offers row */}
                        <View style={styles.offersBlock}>
                          <View style={styles.offerItem}>
                            <Percent size={10} color="#f2ca50" />
                            <Text style={styles.offerItemText}>Items at ₹99</Text>
                          </View>
                          <View style={[styles.offerItem, { justifyContent: 'space-between', flex: 1 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Percent size={10} color="#f2ca50" />
                              <Text style={styles.offerItemText}>10% Extra Off + Free Delivery</Text>
                            </View>
                            <View style={styles.smallOneBadge}>
                              <Text style={styles.smallOneBadgeText}>one BENEFITS</Text>
                            </View>
                          </View>
                        </View>

                        {/* Horizontal nested scroll of matching dishes */}
                        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.nestedDishesScroll} contentContainerStyle={styles.nestedDishesContent} nestedScrollEnabled={true}>
                          {dishes.map((food: any) => (
                            <View key={`dish_card_${food.id}`} style={[styles.dishSubCard, isDarkMode && styles.dishSubCardDark]}>
                              <View style={styles.dishSubDetailsCol}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <VegBadge isVeg={food.isVeg} />
                                  <Text style={styles.dishBestsellerTag}>★ Bestseller</Text>
                                </View>
                                <Text style={[styles.dishSubName, isDarkMode && styles.textWhite]} numberOfLines={2}>
                                  {food.name}
                                </Text>
                                <View style={styles.dishSubRatingRow}>
                                  <Star size={10} color="#39D98A" fill="#39D98A" />
                                  <Text style={styles.dishSubRatingText}>{food.rating} ({Math.floor(100 + Math.random() * 200)})</Text>
                                </View>
                                <Text style={[styles.dishSubPrice, isDarkMode && styles.textWhite]}>
                                  ₹{food.price}
                                </Text>
                                <View style={styles.lockPromoRow}>
                                  <Text style={styles.lockPromoText}>🔒 ₹{food.price - 15} Order above ₹1200</Text>
                                </View>
                              </View>

                              <View style={styles.dishSubImgCol}>
                                <LazyImage source={{ uri: getOptimizedImageUrl(food.image, 500) }} style={styles.dishSubImg} />
                                <TouchableOpacity
                                  style={styles.addBtnSub}
                                  onPress={() => addToCart(food)}
                                >
                                  <Text style={styles.addBtnSubText}>ADD</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, isDarkMode && styles.textWhite]}>
                      No matching dishes found
                    </Text>
                  </View>
                )}
              </View>
            )}

          </View>
        )
      )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#070707',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    elevation: 2,
  },
  headerContainerDark: {
    backgroundColor: '#070707',
    borderBottomColor: '#2a2a2a',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    color: '#eae1d4',
    flex: 1,
  },
  inputCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBarRowWithVeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 14,
  },
  inputInnerRowDark: {
    backgroundColor: '#0f0f0f',
    borderColor: '#2a2a2a',
  },
  activeCursorLine: {
    width: 2,
    height: 18,
    backgroundColor: '#f2ca50',
    marginRight: 8,
    borderRadius: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    color: '#eae1d4',
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 6,
    marginRight: 4,
  },
  micSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  micBtn: {
    padding: 4,
  },
  vegToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 48,
    marginLeft: 10,
    backgroundColor: '#FFF',
  },
  vegToggleActive: {
    borderColor: '#16A34A',
  },
  vegText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    marginRight: 6,
  },
  vegTextActive: {
    color: '#16A34A',
  },
  vegSwitchTrack: {
    width: 24,
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    padding: 1,
  },
  vegTrackActive: {
    backgroundColor: '#16A34A',
  },
  vegSwitchDot: {
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
  },
  vegDotActive: {
    alignSelf: 'flex-end',
  },
  tabsRow: {
    flexDirection: 'row',
    marginTop: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#2a2a2a',
    paddingHorizontal: 16,
  },
  tabButton: {
    paddingBottom: 8,
    marginRight: 24,
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#d4af37',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#8a8a8a',
  },
  tabTextActive: {
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  bodyContent: {
    paddingBottom: 40,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionItemDark: {
    borderBottomColor: '#2a2a2a',
  },
  suggestionCircularImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1a1a1a',
  },
  suggestionName: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Bold',
    color: '#eae1d4',
  },
  suggestionType: {
    fontSize: 12,
    color: '#8a8a8a',
    marginTop: 2,
    fontFamily: 'Urbanist-Medium',
  },
  sectionBlock: {
    marginTop: 18,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  resultsContainer: {
    paddingTop: 16,
  },
  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 16,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  primaryCardDark: {
    backgroundColor: '#0f0f0f',
    borderColor: '#2a2a2a',
  },
  primaryCardHeader: {
    flexDirection: 'row',
  },
  primaryImgWrapper: {
    width: 104,
    height: 104,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    position: 'relative',
  },
  primaryCardImg: {
    width: '100%',
    height: '100%',
  },
  heartOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  primaryCardDetails: {
    flex: 1,
    marginLeft: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  primaryCardBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ea580c',
    marginLeft: 4,
  },
  primaryCardName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingTextVal: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#1F2937',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  primaryCardCuisine: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  primaryCardLoc: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  primaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  primaryDividerDark: {
    backgroundColor: '#2C2C2E',
  },
  opensTodayText: {
    fontSize: 12.5,
    color: '#4B5563',
    fontWeight: '600',
  },
  primaryCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  outletsLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  moreResultsHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1A1A1A',
    marginHorizontal: 16,
    marginBottom: 14,
  },
  secondaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  secondaryCardDark: {
    backgroundColor: '#0f0f0f',
    borderColor: '#2a2a2a',
  },
  secondaryCardImgWrapper: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    position: 'relative',
  },
  secondaryCardImg: {
    width: '100%',
    height: '100%',
  },
  itemTagOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  itemTagOverlayText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  secondaryCardDetails: {
    flex: 1,
    marginLeft: 14,
  },
  gourmetLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  secondaryCardName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  secondaryCardCuisines: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  secondaryCardLoc: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freeDelBadge: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeDelText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  oneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  oneBadgeOrange: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ea580c',
  },
  oneBadgeGrey: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
  },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  dishCardDark: {
    backgroundColor: '#0f0f0f',
    borderBottomColor: '#2a2a2a',
  },
  dishDetailsCol: {
    flex: 1,
    paddingRight: 14,
  },
  vegBadgeOuter: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
  vegBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dishBestSeller: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ea580c',
    marginLeft: 6,
  },
  dishName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
  },
  dishPrice: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  dishRatingTextVal: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ea580c',
    marginLeft: 4,
  },
  dishDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 6,
    fontWeight: '500',
  },
  dishRestTag: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 8,
  },
  dishImageCol: {
    width: 96,
    alignItems: 'center',
  },
  dishImg: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  addBtn: {
    width: 76,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  addBtnText: {
    color: '#16A34A',
    fontWeight: '900',
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  textWhite: {
    color: '#FFFFFB',
  },
  dishesTabContainer: {
    paddingTop: 8,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    marginBottom: 10,
    maxHeight: 44,
  },
  filtersScrollContent: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 32,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  storePill: {
    backgroundColor: '#FEF08A',
    borderColor: '#FDE047',
  },
  storePillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#854D0E',
  },
  boltPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  onePillOrange: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ea580c',
  },
  onePillGrey: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  subPillsScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
    maxHeight: 38,
  },
  subPillsScrollContent: {
    gap: 8,
    alignItems: 'center',
    paddingRight: 32,
  },
  subPill: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  subPillText: {
    fontSize: 12,
  },
  bannersScroll: {
    paddingHorizontal: 16,
    marginBottom: 20,
    maxHeight: 180,
  },
  bannersScrollContent: {
    gap: 12,
    paddingRight: 32,
  },
  bannerCard: {
    width: 260,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerDiscountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerDiscountText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 10,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '900',
  },
  bannerSubtitle: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  featuredContainer: {
    marginTop: 8,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  featuredLabel: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#828282',
    letterSpacing: 1,
  },
  featuredLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 12,
  },
  featuredRestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 18,
    elevation: 2,
  },
  featuredRestCardDark: {
    backgroundColor: '#0f0f0f',
    borderColor: '#2a2a2a',
  },
  featuredRestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  featuredRestName: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#1E293B',
  },
  featuredRestSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  featuredRatingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  offersBlock: {
    backgroundColor: '#FFF8F6',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginBottom: 14,
  },
  offerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offerItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  smallOneBadge: {
    backgroundColor: '#FFF1EB',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  smallOneBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ea580c',
  },
  nestedDishesScroll: {
    marginTop: 4,
  },
  nestedDishesContent: {
    gap: 12,
    paddingRight: 16,
  },
  dishSubCard: {
    width: 240,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 14,
    padding: 10,
  },
  dishSubCardDark: {
    backgroundColor: '#141414',
    borderColor: '#2a2a2a',
  },
  dishSubDetailsCol: {
    flex: 1,
    paddingRight: 6,
  },
  dishBestsellerTag: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#EF4444',
  },
  dishSubName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 4,
  },
  dishSubRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  dishSubRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  dishSubPrice: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  lockPromoRow: {
    marginTop: 6,
    backgroundColor: '#FFF7ED',
    borderRadius: 4,
    padding: 2,
  },
  lockPromoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C2410C',
  },
  dishSubImgCol: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishSubImg: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  addBtnSub: {
    width: 60,
    height: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  addBtnSubText: {
    color: '#16A34A',
    fontWeight: '900',
    fontSize: 11,
  },
  // Restaurants page styling adaptation
  restaurantsTabContainer: {
    paddingBottom: 24,
  },
  heroCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginTop: 14,
  },
  heroCardContainerDark: {
    backgroundColor: '#1E1E24',
    borderColor: '#2C2C2E',
  },
  heroCardMedia: {
    height: 210,
    backgroundColor: '#1a1008',
    position: 'relative',
    overflow: 'hidden',
  },
  heroCardImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroCardOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroCardTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  heroCardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oneBadgeHero: {
    backgroundColor: 'rgba(212, 175, 55, 0.25)',
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  oneBadgeTextHero: {
    color: '#f2ca50',
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
  },
  bestBadgeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bestBadgeTextHero: {
    color: '#f2ca50',
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
  },
  favIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardDetailsBlock: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    zIndex: 10,
  },
  heroRestaurantName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroRatingBg: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#279E48',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  heroRatingVal: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  heroRatingCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroMetaDot: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  heroMetaTime: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroCuisineText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  heroSubBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  heroPriceBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  heroPriceBadgeLabel: {
    color: '#f2ca50',
    fontSize: 7.5,
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.5,
  },
  heroPriceBadgeValue: {
    color: '#eae1d4',
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    lineHeight: 11,
  },
  heroDeliveryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  heroDeliveryBadgeLabel: {
    color: '#f2ca50',
    fontSize: 7.5,
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.5,
  },
  heroDeliveryBadgeValue: {
    color: '#eae1d4',
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    lineHeight: 11,
  },
  heroInfoGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    backgroundColor: '#0f0f0f',
  },
  heroGridCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  heroGridColBorder: {
    borderRightWidth: 1,
    borderRightColor: '#2a2a2a',
  },
  heroGridIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGridColTitle: {
    fontSize: 9.5,
    fontFamily: 'Urbanist-Bold',
    color: '#eae1d4',
  },
  heroGridColSub: {
    fontSize: 8.5,
    color: '#8a8a8a',
    fontFamily: 'Urbanist-Medium',
  },
  recommendedSection: {
    backgroundColor: '#121212',
    paddingVertical: 14,
    marginTop: 14,
  },
  recommendedSectionDark: {
    backgroundColor: '#121212',
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  recommendedSectionTitle: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Bold',
    color: '#eae1d4',
  },
  viewFullMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewFullMenuText: {
    color: '#f2ca50',
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
  },
  recommendedHorizontalScroll: {
    paddingLeft: 14,
  },
  recommendedScrollContent: {
    paddingRight: 28,
    gap: 10,
  },
  productCard: {
    width: 130,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#0f0f0f',
    overflow: 'hidden',
  },
  productCardDark: {
    backgroundColor: '#0f0f0f',
    borderColor: '#2a2a2a',
  },
  productCardImageArea: {
    height: 108,
    position: 'relative',
  },
  productCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productCardPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#d4af37',
    backgroundColor: '#f2ca50',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 7,
    right: 7,
    zIndex: 10,
  },
  productCardPlusBtnActive: {
    backgroundColor: '#d4af37',
    borderColor: '#f2ca50',
  },
  productCardPlusText: {
    fontSize: 16,
    fontFamily: 'Urbanist-ExtraBold',
    color: '#000000',
    lineHeight: 18,
  },
  productCardPlusTextActive: {
    color: '#000000',
    fontFamily: 'Urbanist-ExtraBold',
  },
  productCardDetails: {
    padding: 8,
  },
  productCardName: {
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    color: '#eae1d4',
    lineHeight: 13,
    marginBottom: 3,
    height: 26,
  },
  productCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  productCardRatingVal: {
    fontSize: 10.5,
    color: '#39D98A',
    fontFamily: 'Urbanist-Bold',
  },
  productCardReviewCount: {
    fontSize: 10,
    color: '#8a8a8a',
  },
  productCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  productCardPriceText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    color: '#eae1d4',
  },
  productCardOriginalPrice: {
    fontSize: 10,
    color: '#8a8a8a',
    textDecorationLine: 'line-through',
  },
  productCardDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'wrap',
  },
  productCardDiscountPrice: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    color: '#f2ca50',
  },
  productCardMinOrderText: {
    fontSize: 8.5,
    color: '#f2ca50',
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    fontFamily: 'Urbanist-Bold',
  },
  promoOfferBannerContainer: {
    paddingHorizontal: 14,
    marginTop: 14,
  },
  promoOfferBanner: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoOfferIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoOfferTexts: {
    flex: 1,
  },
  promoOfferMainText: {
    fontSize: 12,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Medium',
    lineHeight: 16,
    textAlign: 'left',
  },
  promoOfferBoldHighlight: {
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  promoOfferExploreBtn: {
    backgroundColor: '#d4af37',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoOfferExploreText: {
    color: '#000000',
    fontSize: 11.5,
    fontFamily: 'Urbanist-Bold',
  },
  featuredSection: {
    backgroundColor: '#121212',
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  featuredHeading: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    color: '#eae1d4',
    marginBottom: 4,
  },
  featuredSubheadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredSubheadingText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    color: '#d4af37',
    letterSpacing: 0.5,
  },
  seeAllText: {
    color: '#f2ca50',
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    marginRight: 2,
  },
  featuredRestaurantCard: {
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  featuredRestaurantCardDark: {
    backgroundColor: '#1E1E24',
    borderColor: '#2C2C2E',
  },
  brandTile: {
    width: 106,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  brandTileInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },
  brandTileBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 1,
  },
  brandTileBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#8B1A1A',
  },
  featuredCardDetails: {
    flex: 1,
    padding: 12,
  },
  featuredCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuredCardBestCuisineText: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '700',
  },
  featuredCardNameText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111111',
    marginBottom: 4,
  },
  featuredCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  featuredCardRatingBg: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#279E48',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    gap: 2,
  },
  featuredCardRatingVal: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  featuredCardRatingCount: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
  },
  featuredCardMetaDot: {
    color: '#CCCCCC',
    fontSize: 11,
  },
  featuredCardMetaTime: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '600',
  },
  featuredCardLocText: {
    fontSize: 9.5,
    color: '#888888',
    fontWeight: '600',
  },
  featuredCardRightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 4,
  },
  featHeartBtn: {
    padding: 4,
  },
  featuredCardDiscountContainer: {
    alignItems: 'flex-end',
  },
  featuredCardDiscountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#e8174b',
    lineHeight: 14,
  },
  featuredCardDiscountSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e8174b',
    lineHeight: 11,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  indicatorDotActive: {
    backgroundColor: '#e8174b',
  },
  loadingContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#64748B',
    marginTop: 10,
    marginBottom: 20,
  },
  skeletonWrapper: {
    width: '100%',
    gap: 14,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  skeletonCardDark: {
    backgroundColor: '#0f0f0f',
    borderColor: '#2a2a2a',
  },
  skeletonImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  skeletonImageDark: {
    backgroundColor: '#1a1a1a',
  },
  skeletonLines: {
    flex: 1,
    marginLeft: 14,
    gap: 8,
  },
  skeletonLineTitle: {
    width: '65%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonLineSub: {
    width: '45%',
    height: 11,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  skeletonLinePrice: {
    width: '30%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonLineDark: {
    backgroundColor: '#1a1a1a',
  },
});
