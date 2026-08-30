import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
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
} from 'lucide-react-native';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { LazyImage } from '../components/LazyImage';
import { SCREEN_WIDTH } from '../utils/responsive';

interface SearchScreenProps {
  onBack: () => void;
  onNavigateToRestaurant: (id: string) => void;
  initialQuery?: string;
}

const DEFAULT_RECENT_SEARCHES = [
  'Biryani',
  'Pizzas',
  'Burgers',
  'Rolls',
  'Momos',
  'North Indian',
  'Chinese',
  'South Indian',
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

export const SearchScreen: React.FC<SearchScreenProps> = ({ onBack, onNavigateToRestaurant, initialQuery = '' }) => {
  const { allRestaurants, foodItems, categories, addToCart, cartItems } = useViewModel();

  const [query, setQuery] = useState(initialQuery);
  const [isSubmitted, setIsSubmitted] = useState(!!initialQuery);
  const [activeTab, setActiveTab] = useState<'Restaurants' | 'Dishes'>('Restaurants');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedSubPill, setSelectedSubPill] = useState<string | null>(null);
  const [is99Store, setIs99Store] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENT_SEARCHES);
  const [savedHearts, setSavedHearts] = useState<{ [key: string]: boolean }>({});

  const toggleHeart = (id: string) => {
    setSavedHearts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  React.useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0) {
      const cleanQ = initialQuery.trim();
      setQuery(cleanQ);
      setIsSubmitted(true);
      setIsLoadingResults(true);

      const qLower = cleanQ.toLowerCase();
      const isRestMatch = allRestaurants.some(r => r.name.toLowerCase().includes(qLower));
      const isDishMatch = foodItems.some(f => 
        (f.name && f.name.toLowerCase().includes(qLower)) || 
        (f.categoryName && f.categoryName.toLowerCase().includes(qLower)) ||
        (f.category && f.category.toLowerCase().includes(qLower))
      );

      if (isRestMatch && !isDishMatch) {
        setActiveTab('Restaurants');
      } else {
        setActiveTab('Restaurants');
      }

      const timer = setTimeout(() => {
        setIsLoadingResults(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [initialQuery, allRestaurants, foodItems]);

  // ─── AUTOCOMPLETE SUGGESTIONS LOGIC (Requires minimum 3 letters) ───
  const firstSuggestion = useMemo(() => {
    if (query.trim().length < 3) return null;
    const q = query.toLowerCase().trim();
    
    const cat = categories.find(c => c.name.toLowerCase().includes(q));
    if (cat) {
      return {
        name: cat.name,
        type: 'Dish',
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

  // Restaurants relevant for query
  const relevantRestaurants = useMemo(() => {
    if (query.trim().length < 3) return [];
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

  // More results matching query (dishes)
  const moreResults = useMemo(() => {
    if (query.trim().length < 3) return [];
    const q = query.toLowerCase().trim();
    
    const matchedDishes = foodItems.filter((food: any) =>
      food.name && food.name.toLowerCase().includes(q)
    );

    return matchedDishes.slice(0, 8);
  }, [query, foodItems]);

  // ─── DYNAMIC SEARCH MATCHING LOGIC ───
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
      
      const hasMatchingDish = foodItems.some(
        (food: any) => {
          const fRestId = String(food.restaurantId || food.restaurant_id || '');
          const isSameRest = fRestId === String(res.id) || (food.restaurantName && food.restaurantName.toLowerCase() === res.name.toLowerCase());
          return isSameRest && (
            (food.name && food.name.toLowerCase().includes(lowerQuery)) ||
            (food.categoryName && food.categoryName.toLowerCase().includes(lowerQuery)) ||
            (food.category && food.category.toLowerCase().includes(lowerQuery)) ||
            (food.description && food.description.toLowerCase().includes(lowerQuery))
          );
        }
      );

      return nameMatch || hasMatchingDish;
    });
  }, [query, allRestaurants, foodItems]);

  // Primary matched restaurant card
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

  // Dynamic promo banners derived from actual restaurants
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

  // Dishes matching query or from primary restaurant
  const searchMatchedDishes = useMemo(() => {
    if (!query.trim()) return foodItems;
    const lowerQuery = query.toLowerCase().trim();
    
    return foodItems.filter((food: any) => {
      if (vegOnly && !food.isVeg) return false;
      if (nonVegOnly && food.isVeg) return false;
      if (is99Store && food.price > 99) return false;
      const nameMatch = food.name && food.name.toLowerCase().includes(lowerQuery);
      const descMatch = food.description && food.description.toLowerCase().includes(lowerQuery);
      const catMatch = (food.categoryName && food.categoryName.toLowerCase().includes(lowerQuery)) ||
                       (food.category && food.category.toLowerCase().includes(lowerQuery));
      const restMatch = primaryRestaurant && (String(food.restaurantId) === String(primaryRestaurant.id) || (food.restaurantName && food.restaurantName.toLowerCase() === primaryRestaurant.name.toLowerCase()));
      return nameMatch || descMatch || catMatch || restMatch;
    });
  }, [query, foodItems, vegOnly, nonVegOnly, is99Store, primaryRestaurant]);

  // Related dishes for the horizontal carousel in primary card
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

  // Dynamic Subcategory Pills derived from categories
  const dynamicSubCategoryPills = useMemo(() => {
    const pillNames = categories.map(c => c.name).filter(Boolean);
    if (pillNames.length > 0) return pillNames;
    return ['Burgers', 'Pizzas', 'Biryani', 'Rolls', 'Momos', 'Chinese', 'Desserts'];
  }, [categories]);

  // ─── DISHES TAB GROUPING BY REAL RESTAURANTS ───
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

    // If matching dishes couldn't be grouped, associate from real restaurants
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

    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== cleanQ.toLowerCase());
      return [cleanQ, ...filtered].slice(0, 8);
    });

    const qLower = cleanQ.toLowerCase();
    const isRestMatch = allRestaurants.some(r => r.name.toLowerCase().includes(qLower));
    const isDishMatch = foodItems.some(f => 
      (f.name && f.name.toLowerCase().includes(qLower)) || 
      (f.categoryName && f.categoryName.toLowerCase().includes(qLower))
    );

    if (isRestMatch && !isDishMatch) {
      setActiveTab('Restaurants');
    } else {
      setActiveTab('Restaurants');
    }

    setTimeout(() => {
      setIsLoadingResults(false);
    }, 200);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedSubPill(null);
    setIsSubmitted(false);
  };

  return (
    <View style={styles.container}>
      
      {/* ─── TOP HEADER INPUT BLOCK (Fixed downward shift & Title) ─── */}
      <View style={styles.headerContainer}>
        
        {/* 1. TOP HEADER TITLE ROW */}
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#DEA430" strokeWidth={2.4} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            Search for dishes & restaurants
          </Text>

          <View style={{ width: 36 }} />
        </View>

        {/* 2. SEARCH BAR & VEG TOGGLE ROW */}
        <View style={styles.searchBarRow}>
          {/* Gold Outline Input Box */}
          <View style={styles.inputInnerRow}>
            <TextInput
              style={styles.textInput}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setIsSubmitted(false);
              }}
              placeholder="Search for dishes & restaurants"
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
                onPress={() => Alert.alert('Voice Search', 'Speak now...')}
                activeOpacity={0.7}
              >
                <Mic size={20} color="#DEA430" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* VEG Toggle Button */}
          <TouchableOpacity 
            style={[styles.vegToggleCard, vegOnly && styles.vegToggleCardActive]} 
            onPress={() => setVegOnly(!vegOnly)}
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
                Restaurants
              </Text>
              {activeTab === 'Restaurants' && <View style={styles.tabActiveIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('Dishes')}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'Dishes' ? styles.tabTextActive : styles.tabTextInactive]}>
                Dishes
              </Text>
              {activeTab === 'Dishes' && <View style={styles.tabActiveIndicator} />}
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* ─── BODY VIEWPORT ─── */}
      <ScrollView 
        contentContainerStyle={styles.bodyContent} 
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
      >
        
        {/* 0. INITIAL DEFAULT VIEW (When query < 3 chars and not submitted) */}
        {!isSubmitted && query.trim().length < 3 && (
          <View style={styles.initialContainer}>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.initialSection}>
                <View style={styles.initialSectionHeaderRow}>
                  <Text style={styles.initialSectionTitle}>Recent Searches</Text>
                  <TouchableOpacity onPress={() => setRecentSearches([])}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentChipsWrap}>
                  {recentSearches.map((term, idx) => (
                    <TouchableOpacity
                      key={`recent_${idx}_${term}`}
                      style={styles.recentChip}
                      activeOpacity={0.75}
                      onPress={() => triggerSearch(term)}
                    >
                      <RotateCcw size={12} color="#DEA430" strokeWidth={2.2} />
                      <Text style={styles.recentChipText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Cuisines / Categories */}
            {categories.length > 0 && (
              <View style={styles.initialSection}>
                <Text style={styles.initialSectionTitle}>Popular Cuisines</Text>
                <View style={styles.cuisineGrid}>
                  {categories.slice(0, 8).map((cat, idx) => (
                    <TouchableOpacity
                      key={`cat_${cat.name}_${idx}`}
                      style={styles.cuisineCard}
                      activeOpacity={0.8}
                      onPress={() => triggerSearch(cat.name)}
                    >
                      <LazyImage source={{ uri: cat.imageUrl }} style={styles.cuisineCardImg} />
                      <View style={styles.cuisineCardOverlay} />
                      <Text style={styles.cuisineCardText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 1. AUTOCOMPLETE SUGGESTIONS VIEW (typing, min 3 chars, not submitted) */}
        {!isSubmitted && query.trim().length >= 3 && (
          <View style={styles.suggestionsContainer}>
            {firstSuggestion && (
              <TouchableOpacity
                onPress={() => {
                  if (firstSuggestion.isRestaurant && firstSuggestion.resObj) {
                    onNavigateToRestaurant(firstSuggestion.resObj.id);
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
                  <Text style={styles.suggestionType}>{firstSuggestion.type}</Text>
                </View>
                <SearchIcon size={18} color="#DEA430" />
              </TouchableOpacity>
            )}

            {relevantRestaurants.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderText}>Restaurants relevant for '{query}'</Text>
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
                        ★ {res.rating || '4.5'} • {typeof res.deliveryTime === 'number' ? `${res.deliveryTime} mins` : res.deliveryTime || '30 mins'} • {res.city || 'Patrapada'}
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
                  <Text style={styles.sectionHeaderText}>More results matching your query</Text>
                  <View style={styles.sectionHeaderLine} />
                </View>
                {moreResults.map((food: any) => (
                  <TouchableOpacity
                    key={food.id}
                    onPress={() => triggerSearch(food.name)}
                    style={styles.suggestionItem}
                    activeOpacity={0.8}
                  >
                    <LazyImage source={{ uri: getOptimizedImageUrl(food.image, 400) }} style={styles.suggestionCircularImg} />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      {renderBoldedText(food.name, query)}
                      <Text style={styles.suggestionType}>Dish</Text>
                    </View>
                    <ChevronRight size={18} color="#DEA430" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 2. SUBMITTED SEARCH RESULTS */}
        {isSubmitted && query.trim().length > 0 && (
          isLoadingResults ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DEA430" style={{ marginTop: 40 }} />
              <Text style={styles.loadingText}>Searching for "{query}"...</Text>
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
                          {primaryRestaurant.address || primaryRestaurant.city || 'Patrapada'} • {typeof primaryRestaurant.distance === 'number' ? `${primaryRestaurant.distance.toFixed(1)} km` : '3.5 km'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* 3. "BECAUSE YOU SEARCHED FOR ..." DISHES CAROUSEL */}
                  {relatedDishes.length > 0 && (
                    <View style={styles.becauseSearchedSection}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeaderText}>
                          BECAUSE YOU SEARCHED FOR "{query.toUpperCase()}"
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
                          const isAdded = cartItems.some(i => i.id === food.id);
                          return (
                            <View key={`dish_card_${food.id}`} style={styles.dishMiniCard}>
                              <View style={styles.dishMiniImageWrap}>
                                <LazyImage source={{ uri: getOptimizedImageUrl(food.image, 400) }} style={styles.dishMiniImage} />
                                <TouchableOpacity
                                  style={[styles.dishMiniAddBtn, isAdded && styles.dishMiniAddBtnActive]}
                                  onPress={() => addToCart(food)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[styles.dishMiniAddPlus, isAdded && styles.dishMiniAddPlusActive]}>
                                    {isAdded ? '✓' : '+'}
                                  </Text>
                                </TouchableOpacity>
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

                  {/* 4. "MORE RESULTS LIKE THIS" / "FEATURED RESTAURANTS" SECTION */}
                  {secondaryRestaurants.length > 0 && (
                    <View style={styles.moreResultsLikeThisSection}>
                      <Text style={styles.moreResultsHeading}>More results like this</Text>
                      
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeaderText}>FEATURED RESTAURANTS</Text>
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
                                <View style={styles.featuredBadgeRow}>
                                  <Text style={styles.featuredBadgeText}>
                                    {index === 0 ? '🏅 Best Rated' : '⚡ Bolt Delivery'}
                                  </Text>
                                </View>

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
                                  {res.address || res.city || 'Patrapada'} • {typeof res.distance === 'number' ? `${res.distance.toFixed(1)} km` : '4.0 km'}
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
                  
                  {/* 1. FILTER PILLS: TWO ROWS */}
                  <View style={styles.dishesFiltersWrapper}>
                    {/* Row 1: Sort By, 99 store, Veg Dishes, Non-Veg */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filtersRowScroll}
                      contentContainerStyle={styles.filtersRowContent}
                    >
                      <TouchableOpacity 
                        style={styles.filterChip}
                        onPress={() => Alert.alert('Sort By', 'Options: Popularity, Rating, Delivery Time, Price')}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.filterChipText}>Sort By</Text>
                        <ChevronDown size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.filterChip, is99Store && styles.filterChipActive]}
                        onPress={() => setIs99Store(!is99Store)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.store99Badge}>
                          <Text style={styles.store99BadgeText}>99</Text>
                        </View>
                        <Text style={[styles.filterChipText, { color: '#DEA430', fontWeight: '800' }]}>store</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.filterChip, vegOnly && styles.filterChipActive]}
                        onPress={() => {
                          setVegOnly(!vegOnly);
                          if (!vegOnly) setNonVegOnly(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.filterChipText, vegOnly && styles.filterChipTextActive]}>Veg Dishes</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.filterChip, nonVegOnly && styles.filterChipActive]}
                        onPress={() => {
                          setNonVegOnly(!nonVegOnly);
                          if (!nonVegOnly) setVegOnly(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.filterChipText, nonVegOnly && styles.filterChipTextActive]}>Non-Veg</Text>
                      </TouchableOpacity>
                    </ScrollView>

                    {/* Row 2: Sub-category chips derived dynamically */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filtersRowScroll}
                      contentContainerStyle={styles.filtersRowContent}
                    >
                      {dynamicSubCategoryPills.map((subCategory) => {
                        const isSubActive = selectedSubPill === subCategory;
                        return (
                          <TouchableOpacity
                            key={`sub_${subCategory}`}
                            style={[
                              styles.filterChip,
                              isSubActive && styles.subCategoryChipActive,
                            ]}
                            onPress={() => setSelectedSubPill(isSubActive ? null : subCategory)}
                            activeOpacity={0.75}
                          >
                            <Text style={[
                              styles.filterChipText,
                              isSubActive ? styles.subCategoryChipTextActive : styles.filterChipText,
                            ]}>
                              {subCategory}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* 2. HORIZONTAL PROMO BANNERS */}
                  {dynamicPromoBanners.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.promoBannersScroll}
                      contentContainerStyle={styles.promoBannersContent}
                    >
                      {dynamicPromoBanners.map((banner) => (
                        <TouchableOpacity
                          key={`dish_banner_${banner.id}`}
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

                  {/* 3. FEATURED RESTAURANTS TITLE WITH TRAILING GOLD LINE */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderText}>FEATURED RESTAURANTS</Text>
                    <View style={styles.sectionHeaderLine} />
                  </View>

                  {/* 4. RESTAURANT GROUPS WITH HORIZONTAL DISH CAROUSEL */}
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
                                {res.reviewCount ? (
                                  <Text style={styles.restaurantGroupReviewCount}>
                                    ({res.reviewCount >= 1000 ? `${(res.reviewCount / 1000).toFixed(1)}K+` : `${res.reviewCount}+`})
                                  </Text>
                                ) : null}
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.metaText}>{typeof res.deliveryTime === 'number' ? `${res.deliveryTime} mins` : res.deliveryTime || '30 mins'}</Text>
                              </View>

                              {res.offer && (
                                <View style={styles.restaurantGroupOfferRow}>
                                  <Tag size={12} color="#F97316" style={{ marginRight: 4 }} />
                                  <Text style={styles.restaurantGroupOfferText}>
                                    {res.offer}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <ChevronRight size={22} color="#DEA430" />
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
                              const isAdded = cartItems.some(i => i.id === food.id);

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

                                  {/* Bottom Row: Price & ADD Button */}
                                  <View style={styles.dishCardBottomRow}>
                                    <View style={styles.dishPriceWrap}>
                                      <Text style={styles.dishCurrentPrice}>₹{food.price}</Text>
                                      <Text style={styles.dishOriginalPrice}>₹{originalPrice}</Text>
                                    </View>

                                    <TouchableOpacity
                                      style={[
                                        styles.dishAddBtn,
                                        isAdded && styles.dishAddBtnActive,
                                      ]}
                                      onPress={() => addToCart(food)}
                                      activeOpacity={0.8}
                                    >
                                      <Text style={[
                                        styles.dishAddBtnText,
                                        isAdded && styles.dishAddBtnTextActive,
                                      ]}>
                                        {isAdded ? 'ADDED' : 'ADD'}
                                      </Text>
                                    </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0A08',
  },
  headerContainer: {
    backgroundColor: '#0B0A08',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1C16',
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputInnerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12110E',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
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
    marginRight: 10,
    marginLeft: 6,
  },
  micBtn: {
    padding: 4,
  },
  vegToggleCard: {
    borderWidth: 1.2,
    borderColor: '#2E2920',
    borderRadius: 14,
    backgroundColor: '#12110E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    gap: 3,
  },
  vegToggleCardActive: {
    borderColor: '#16A34A',
  },
  vegToggleLabel: {
    fontSize: 9.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vegSwitchTrack: {
    width: 28,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#26221A',
    padding: 1.5,
    justifyContent: 'center',
  },
  vegSwitchTrackActive: {
    backgroundColor: '#16A34A',
  },
  vegSwitchThumb: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#FFFFFF',
  },
  vegSwitchThumbActive: {
    alignSelf: 'flex-end',
  },

  // Tabs Row
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1814',
    gap: 24,
  },
  tabButton: {
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 15.5,
    fontFamily: 'Urbanist-Bold',
  },
  tabTextActive: {
    color: '#DEA430',
    fontWeight: '700',
  },
  tabTextInactive: {
    color: '#8E8A80',
    fontWeight: '500',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#DEA430',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // Body content
  bodyContent: {
    paddingBottom: 60,
  },

  // Initial Empty View
  initialContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 24,
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
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFB',
  },
  clearAllText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#DEA430',
  },
  recentChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#2E2920',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
    gap: 6,
  },
  recentChipText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#E0E0E0',
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  cuisineCard: {
    width: '23%',
    aspectRatio: 0.85,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cuisineCardImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cuisineCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cuisineCardText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFB',
    textAlign: 'center',
    paddingHorizontal: 2,
  },

  // Autocomplete Suggestions
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151412',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242018',
  },
  suggestionCircularImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#26221A',
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

  // Loading
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    color: '#CFCAC3',
  },

  // Results Container
  resultsContainer: {
    paddingTop: 14,
  },
  restaurantsTabWrapper: {
    gap: 16,
  },

  // 1. Promo Banners Carousel
  promoBannersScroll: {
    paddingLeft: 16,
  },
  promoBannersContent: {
    paddingRight: 24,
    gap: 12,
  },
  promoBannerCard: {
    width: SCREEN_WIDTH * 0.72,
    height: 175,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#181714',
    borderWidth: 1,
    borderColor: '#26221A',
  },
  promoBannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  promoBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  promoBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    alignItems: 'flex-start',
  },
  promoDealBadge: {
    backgroundColor: '#DEA430',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoDealBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  promoAdBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promoAdBadgeText: {
    color: '#CCCCCC',
    fontSize: 9.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  promoBannerBottomDetails: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  promoBannerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  promoBannerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  promoBannerRating: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  promoBannerTime: {
    color: '#DDDDDD',
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
  },

  // 2. Primary Restaurant Card
  primaryRestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151412',
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#26221A',
  },
  primaryRestImageWrap: {
    width: 82,
    height: 82,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#26221A',
  },
  primaryRestImage: {
    width: '100%',
    height: '100%',
  },
  primaryRestDealBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 2.5,
    alignItems: 'center',
  },
  primaryRestDealText: {
    color: '#DEA430',
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
  },
  primaryRestDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    gap: 3,
  },
  primaryRestBestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryRestBestText: {
    color: '#DEA430',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  primaryRestName: {
    fontSize: 19,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryRestRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryRestRatingVal: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 3,
  },
  primaryRestReviewCount: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
  },
  primaryRestLocText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8A80',
  },

  // 3. "BECAUSE YOU SEARCHED FOR ..." Carousel
  becauseSearchedSection: {
    marginTop: 6,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#DEA430',
    letterSpacing: 0.5,
    marginRight: 10,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#66552B',
  },
  becauseDishesScroll: {
    paddingLeft: 16,
  },
  becauseDishesContent: {
    paddingRight: 24,
    gap: 10,
  },
  dishMiniCard: {
    width: 145,
    backgroundColor: '#151412',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#26221A',
    overflow: 'hidden',
  },
  dishMiniImageWrap: {
    width: '100%',
    height: 115,
    position: 'relative',
    backgroundColor: '#26221A',
  },
  dishMiniImage: {
    width: '100%',
    height: '100%',
  },
  dishMiniAddBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 1,
    borderColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishMiniAddBtnActive: {
    backgroundColor: '#DEA430',
  },
  dishMiniAddPlus: {
    color: '#DEA430',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    lineHeight: 18,
  },
  dishMiniAddPlusActive: {
    color: '#000000',
  },
  dishMiniDetails: {
    padding: 10,
    gap: 4,
  },
  dishVegRow: {
    marginBottom: 2,
  },
  vegSquare: {
    width: 13,
    height: 13,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  vegCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dishMiniName: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '600',
    lineHeight: 16,
  },
  dishMiniPrice: {
    color: '#DEA430',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginTop: 2,
  },

  // 4. "MORE RESULTS LIKE THIS"
  moreResultsLikeThisSection: {
    marginTop: 10,
    gap: 12,
  },
  moreResultsHeading: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    paddingHorizontal: 16,
  },
  featuredRestList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  featuredRestaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#151412',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#26221A',
  },
  featuredCardImageWrap: {
    width: 105,
    height: 105,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#26221A',
  },
  featuredCardImage: {
    width: '100%',
    height: '100%',
  },
  featuredCardHeartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 12,
  },
  featuredCardDealOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  featuredCardDealPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
  },
  featuredCardDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    gap: 3,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBadgeText: {
    color: '#DEA430',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  featuredCardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginTop: 1,
  },
  featuredCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  greenStarRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  greenStarRatingVal: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  featuredCardReviewCount: {
    color: '#8E8A80',
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    marginLeft: 4,
  },
  featuredCardCuisines: {
    color: '#8E8A80',
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    marginTop: 1,
  },
  featuredCardLoc: {
    color: '#8E8A80',
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
  },

  // ─── DISHES TAB STYLING ───
  dishesTabWrapper: {
    gap: 16,
  },
  dishesFiltersWrapper: {
    gap: 8,
  },
  filtersRowScroll: {
    paddingLeft: 16,
  },
  filtersRowContent: {
    paddingRight: 24,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151412',
    borderWidth: 1,
    borderColor: '#2A261F',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: '#DEA430',
    backgroundColor: 'rgba(222, 164, 48, 0.1)',
  },
  filterChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#DEA430',
    fontWeight: '700',
  },
  subCategoryChipActive: {
    borderWidth: 1.5,
    borderColor: '#DEA430',
    backgroundColor: '#151412',
  },
  subCategoryChipTextActive: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  store99Badge: {
    backgroundColor: '#DEA430',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  store99BadgeText: {
    color: '#000000',
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
  },

  // Dishes Grouped by Restaurant
  dishesGroupedList: {
    paddingHorizontal: 16,
    gap: 20,
  },
  dishGroupBlock: {
    gap: 12,
  },
  restaurantGroupHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151412',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#26221A',
  },
  restaurantGroupLogoWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#26221A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantGroupLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  restaurantGroupDetails: {
    flex: 1,
    marginLeft: 14,
    gap: 2,
  },
  restaurantGroupName: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  restaurantGroupRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantGroupRatingVal: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 3,
  },
  restaurantGroupReviewCount: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
  },
  restaurantGroupOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  restaurantGroupOfferText: {
    color: '#F97316',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // Grouped Dishes Scroll
  groupedDishesScroll: {
    marginHorizontal: -16,
    paddingLeft: 16,
  },
  groupedDishesContent: {
    paddingRight: 24,
    gap: 12,
  },
  dishHorizontalCard: {
    width: 255,
    backgroundColor: '#151412',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#26221A',
    justifyContent: 'space-between',
    height: 190,
  },
  dishCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bestsellerTag: {
    color: '#DEA430',
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dishCardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  dishCardTextCol: {
    flex: 1,
    paddingRight: 10,
    gap: 6,
  },
  dishCardTitle: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    lineHeight: 20,
  },
  dishGreenRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dishGreenRatingText: {
    color: '#4ADE80',
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dishCardImageWrap: {
    width: 95,
    height: 75,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#26221A',
  },
  dishCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dishCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dishPriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishCurrentPrice: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  dishOriginalPrice: {
    color: '#8E8A80',
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    textDecorationLine: 'line-through',
  },
  dishAddBtn: {
    backgroundColor: '#12110E',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 7,
  },
  dishAddBtnActive: {
    backgroundColor: 'rgba(222, 164, 48, 0.15)',
  },
  dishAddBtnText: {
    color: '#DEA430',
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  dishAddBtnTextActive: {
    color: '#4ADE80',
  },

  // Common
  metaDot: {
    fontSize: 12,
    color: '#555555',
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8A80',
  },
});
