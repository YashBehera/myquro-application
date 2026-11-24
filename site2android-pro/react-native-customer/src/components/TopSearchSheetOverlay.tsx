import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  type TextInputInstance,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  Search as SearchIcon,
  Mic,
  RotateCcw,
  X,
  ChevronRight,
  Star,
  Flame,
  Clock,
  Volume2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViewModel } from '../state/MainViewModel';
import {
  getStoredRecentSearches,
  addStoredRecentSearch,
  removeStoredRecentSearch,
  clearStoredRecentSearches,
  DEFAULT_RECENT_SEARCHES,
} from '../utils/recentSearches';
import { Restaurant } from '../types';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  MAX_CONTENT_WIDTH,
  getSafeTopPadding,
  getSafeBottomPadding,
} from '../utils/responsive';

interface TopSearchSheetOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelectRestaurant?: (id: string, targetDishName?: string) => void;
  onNavigateToSearchScreen?: (query: string) => void;
}

const TRENDING_SEARCHES = [
  { label: 'Dum Biryani', subtitle: 'Most ordered', tag: '🔥 Trending' },
  { label: 'Farmhouse Pizza', subtitle: 'Woodfired', tag: '🍕 Popular' },
  { label: 'Crispy Burger', subtitle: 'Bestseller', tag: '✨ Craving' },
  { label: 'Butter Chicken', subtitle: 'North Indian', tag: '🍛 Best Rated' },
  { label: 'Steamed Momos', subtitle: 'Hot & Spicy', tag: '🥟 Quick Bite' },
  { label: 'Cold Brew Coffee', subtitle: 'Refreshing', tag: '☕ Drinks' },
  { label: 'Kathi Rolls', subtitle: 'Street Food', tag: '🌯 Popular' },
  { label: 'Pasta Alfredo', subtitle: 'Creamy & Rich', tag: '🍝 Italian' },
];

const PLACEHOLDERS = [
  "Search 'Hyderabadi Dum Biryani'...",
  "Search 'Truffle Mushroom Pizza'...",
  "Search 'Crispy Chicken Burger'...",
  "Search 'Paneer Butter Masala'...",
  "Search 'Cold Brew & Desserts'...",
  "Search 'Steamed Dimsums & Momos'...",
];

const favQuroImg = require('../assets/favorite_quro.png');

// Helper function to render text with matching query highlighted in bold gold
const renderHighlightedText = (text: string, currentQuery: string) => {
  if (!currentQuery.trim()) {
    return <Text style={styles.dishNameText}>{text}</Text>;
  }

  const regex = new RegExp(`(${currentQuery.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={styles.dishNameText} numberOfLines={1}>
      {parts.map((part, idx) => {
        const isMatch = part.toLowerCase() === currentQuery.toLowerCase().trim();
        return (
          <Text
            key={idx}
            style={isMatch ? styles.highlightGoldText : styles.normalWhiteText}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

export const TopSearchSheetOverlay: React.FC<TopSearchSheetOverlayProps> = ({
  visible,
  onClose,
  onSelectRestaurant,
  onNavigateToSearchScreen,
}) => {
  const insets = useSafeAreaInsets();
  const { allRestaurants, foodItems, categories } = useViewModel();

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENT_SEARCHES);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);

  const inputRef = useRef<TextInputInstance>(null);

  // Animation values
  const animY = useRef(new Animated.Value(-600)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;
  const placeholderFade = useRef(new Animated.Value(1)).current;

  // Voice Wave Animations
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.6)).current;
  const wave3 = useRef(new Animated.Value(0.4)).current;
  const wave4 = useRef(new Animated.Value(0.8)).current;
  const wave5 = useRef(new Animated.Value(0.5)).current;

  // Rotating placeholder loop
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(placeholderFade, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(placeholderFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [visible]);

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

  useEffect(() => {
    getStoredRecentSearches().then(setRecentSearches);
  }, []);

  useEffect(() => {
    if (visible) {
      getStoredRecentSearches().then(setRecentSearches);
      setQuery('');
      Animated.parallel([
        Animated.spring(animY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      });
    } else {
      Animated.parallel([
        Animated.timing(animY, {
          toValue: -600,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(animY, {
        toValue: -600,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleExecuteSearch = (searchTerm: string) => {
    const cleanTerm = searchTerm.trim();
    if (!cleanTerm) return;
    
    addStoredRecentSearch(cleanTerm).then(setRecentSearches);

    if (onNavigateToSearchScreen) {
      onClose();
      onNavigateToSearchScreen(cleanTerm);
    } else if (onSelectRestaurant) {
      const matchedRes = allRestaurants.find(
        (r) => r.name.toLowerCase() === cleanTerm.toLowerCase()
      );
      if (matchedRes) {
        onClose();
        onSelectRestaurant(matchedRes.id);
      } else {
        onClose();
      }
    }
  };

  const handleRemoveRecent = (termToRemove: string) => {
    removeStoredRecentSearch(termToRemove).then(setRecentSearches);
  };

  const handleClearAllRecent = () => {
    clearStoredRecentSearches().then(setRecentSearches);
  };

  const navigateToDishRestaurant = (dish: any) => {
    const dishName = dish.name;
    const targetRest = allRestaurants.find(
      (r) =>
        String(r.id) === String(dish.restaurantId) ||
        (dish.restaurantName && r.name.toLowerCase() === dish.restaurantName.toLowerCase()) ||
        (dish.restaurantName && r.name.toLowerCase().includes(dish.restaurantName.toLowerCase())) ||
        (dish.restaurantName && dish.restaurantName.toLowerCase().includes(r.name.toLowerCase()))
    );
    const targetRestId = targetRest ? targetRest.id : dish.restaurantId;

    if (targetRestId && onSelectRestaurant) {
      addStoredRecentSearch(dishName).then(setRecentSearches);
      onClose();
      onSelectRestaurant(String(targetRestId), dishName);
    } else {
      handleExecuteSearch(dishName);
    }
  };

  const handleSubmitSearch = () => {
    handleExecuteSearch(query);
  };

  // 1. Primary Top Suggestion Card (Instant starting at 1 character!)
  const firstSuggestion = useMemo(() => {
    if (query.trim().length < 1) return null;
    const q = query.toLowerCase().trim();

    // Check category match
    const cat = categories.find((c) => c.name.toLowerCase().includes(q));
    if (cat) {
      return {
        name: cat.name,
        type: 'Cuisine',
        image: cat.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
        isCategory: true,
      };
    }

    // Check restaurant match
    const res = allRestaurants.find((r) => r.name.toLowerCase().includes(q));
    if (res) {
      return {
        name: res.name,
        type: 'Restaurant',
        image: res.image,
        isRestaurant: true,
        resObj: res,
      };
    }

    // Check dish match
    const food = foodItems.find((f) => f.name && f.name.toLowerCase().includes(q));
    if (food) {
      return {
        name: food.name,
        type: 'Dish',
        price: food.price,
        isVeg: food.isVeg,
        image: food.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
        isDish: true,
        foodObj: food,
      };
    }

    return {
      name: query.trim(),
      type: 'Search',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
    };
  }, [query, categories, foodItems, allRestaurants]);

  // 2. Restaurants Relevant Section (Instant starting at 1 character!)
  const relevantRestaurants = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();

    const matches = allRestaurants.filter((res) => {
      const cuisineStr = Array.isArray(res.cuisine)
        ? res.cuisine.join(', ')
        : typeof res.cuisine === 'string'
          ? res.cuisine
          : '';
      const nameMatch = res.name.toLowerCase().includes(q) || cuisineStr.toLowerCase().includes(q);
      const dishMatch = foodItems.some(
        (food) =>
          (String(food.restaurantId) === String(res.id) ||
           (food.restaurantName && food.restaurantName.toLowerCase() === res.name.toLowerCase())) &&
          food.name &&
          food.name.toLowerCase().includes(q)
      );
      return nameMatch || dishMatch;
    });

    return matches.slice(0, 5);
  }, [query, allRestaurants, foodItems]);

  // 3. Dishes Matching Query (Instant starting at 1 character!)
  const moreResults = useMemo(() => {
    if (query.trim().length < 1) return [];
    const q = query.toLowerCase().trim();

    const matchedDishes = foodItems.filter(
      (food) => food.name && food.name.toLowerCase().includes(q)
    );

    const filtered = matchedDishes.filter(
      (food) => !(firstSuggestion?.name && firstSuggestion.name.toLowerCase() === food.name.toLowerCase())
    );

    return filtered.slice(0, 8);
  }, [query, foodItems, firstSuggestion]);

  if (!visible) return null;

  const isQueryActive = query.trim().length >= 1;

  return (
    <View style={styles.modalOverlayContainer}>
      {/* Backdrop Scrim */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[styles.backdropScrim, { opacity: animOpacity }]}
        />
      </TouchableWithoutFeedback>

      {/* Top Animated Card / Sheet */}
      <Animated.View
        style={[
          styles.floatingTopCard,
          isQueryActive ? styles.fullScreenCard : styles.compactCard,
          { transform: [{ translateY: animY }] },
        ]}
      >
        <View style={{ flex: 1, backgroundColor: '#0B0A08' }}>
          
          {/* 1. TOP HEADER ROW WITH LOGO */}
          <View style={[styles.topHeaderRow, { paddingTop: getSafeTopPadding(insets.top, 8) }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            
            <View style={styles.logoTitleContainer}>
              <Text style={styles.favLogoMy}>My</Text>
              <View style={styles.favQuroCropContainer}>
                <Image source={favQuroImg} style={styles.favQuroCropImage} resizeMode="stretch" />
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setIsVoiceModalVisible(true)}
              style={styles.voiceTopBtn}
              activeOpacity={0.7}
            >
              <Mic size={18} color="#DEA430" />
            </TouchableOpacity>
          </View>

          {/* 2. SEARCH INPUT BOX WITH SLEEK DARK BORDER */}
          <View style={styles.inputCardWrapper}>
            <View style={styles.inputInnerRow}>
              {/* Search Icon */}
              <SearchIcon size={19} color="#DEA430" style={{ marginRight: 8 }} />
              
              <View style={styles.inputStack}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={query.length === 0 ? PLACEHOLDERS[placeholderIndex] : ''}
                  placeholderTextColor="#78716C"
                  returnKeyType="search"
                  onSubmitEditing={handleSubmitSearch}
                  autoCorrect={false}
                  selectionColor="#DEA430"
                />
              </View>
              
              {query.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  style={styles.clearBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#9CA3AF" strokeWidth={2.2} />
                </TouchableOpacity>
              ) : null}

              <View style={styles.micSection}>
                <View style={styles.micDivider} />
                <TouchableOpacity 
                  style={styles.micBtn} 
                  activeOpacity={0.7} 
                  onPress={() => setIsVoiceModalVisible(true)}
                >
                  <Mic size={20} color="#DEA430" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. CONDITIONAL CONTENT: RECENT & TRENDING VS INSTANT AUTOCOMPLETE */}
          {!isQueryActive ? (
            <ScrollView
              style={styles.defaultScrollView}
              contentContainerStyle={styles.defaultScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* RECENT SEARCHES */}
              {recentSearches.length > 0 && (
                <View style={styles.sectionWrap}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderLeft}>
                      <Clock size={13} color="#DEA430" />
                      <Text style={styles.sectionHeaderText}>RECENT SEARCHES</Text>
                    </View>
                    <TouchableOpacity onPress={handleClearAllRecent} activeOpacity={0.7}>
                      <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.chipsWrapContainer}>
                    {recentSearches.map((item, idx) => (
                      <View key={idx} style={styles.chipItem}>
                        <TouchableOpacity
                          style={styles.chipTouchPart}
                          activeOpacity={0.75}
                          onPress={() => handleExecuteSearch(item)}
                        >
                          <RotateCcw size={11} color="#DEA430" strokeWidth={2.2} />
                          <Text style={styles.chipText} numberOfLines={1}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveRecent(item)}
                          style={styles.chipDeleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                        >
                          <X size={11} color="#8E8A80" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 🔥 TRENDING SEARCHES */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderLeft}>
                    <Flame size={14} color="#F97316" />
                    <Text style={styles.sectionHeaderText}>TRENDING CRAVINGS</Text>
                  </View>
                </View>

                <View style={styles.trendingGridWrap}>
                  {TRENDING_SEARCHES.map((t, idx) => (
                    <TouchableOpacity
                      key={`trend_${idx}`}
                      style={styles.trendingSearchCard}
                      activeOpacity={0.75}
                      onPress={() => handleExecuteSearch(t.label)}
                    >
                      <View style={styles.trendingIconWrap}>
                        <Flame size={13} color="#F97316" />
                      </View>
                      <View style={styles.trendingTextCol}>
                        <Text style={styles.trendingDishTitle} numberOfLines={1}>
                          {t.label}
                        </Text>
                        <Text style={styles.trendingSubtitle} numberOfLines={1}>
                          {t.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </ScrollView>
          ) : (
            /* 4. INSTANT SEARCH RESULTS */
            <View style={{ flex: 1 }}>
              <ScrollView
                style={styles.suggestionsScrollView}
                contentContainerStyle={styles.suggestionsContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* TOP FEATURED MATCH CARD */}
                {firstSuggestion && (
                  <TouchableOpacity
                    style={styles.featuredCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (firstSuggestion.isRestaurant && firstSuggestion.resObj) {
                        onClose();
                        onSelectRestaurant?.(firstSuggestion.resObj.id);
                      } else if (firstSuggestion.isDish && firstSuggestion.foodObj) {
                        navigateToDishRestaurant(firstSuggestion.foodObj);
                      } else {
                        handleExecuteSearch(firstSuggestion.name);
                      }
                    }}
                  >
                    <Image
                      source={{ uri: firstSuggestion.image }}
                      style={styles.featuredCardImage}
                    />
                    <View style={styles.featuredCardTextCol}>
                      <View style={styles.featuredTypeBadge}>
                        <Text style={styles.featuredTypeBadgeText}>{firstSuggestion.type}</Text>
                      </View>
                      <Text style={styles.featuredCardTitle} numberOfLines={1}>
                        {firstSuggestion.name}
                      </Text>
                      {firstSuggestion.isDish && firstSuggestion.price && (
                        <Text style={styles.featuredPriceText}>₹{firstSuggestion.price}</Text>
                      )}
                    </View>
                    <View style={styles.featuredCardSearchBtn}>
                      <SearchIcon size={16} color="#DEA430" strokeWidth={2.4} />
                    </View>
                  </TouchableOpacity>
                )}

                {/* SECTION 1: RESTAURANTS RELEVANT FOR QUERY */}
                {relevantRestaurants.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionHeaderText}>
                        Restaurants matching '{query}'
                      </Text>
                      <View style={styles.sectionHeaderLine} />
                    </View>

                    <View style={styles.resultsListCard}>
                      {relevantRestaurants.map((res: Restaurant, index: number) => {
                        const ratingVal = res.rating || '4.5';
                        const countStr = res.reviewCount
                          ? res.reviewCount >= 1000
                            ? `${(res.reviewCount / 1000).toFixed(1)}K+`
                            : `${res.reviewCount}+`
                          : '5K+';
                        const deliveryTimeStr = typeof res.deliveryTime === 'number' ? `${res.deliveryTime} mins` : res.deliveryTime || '30 mins';
                        const areaStr = res.address || res.city || '';

                        return (
                          <TouchableOpacity
                            key={`rel_res_${res.id}_${index}`}
                            style={[
                              styles.restaurantRow,
                              index === relevantRestaurants.length - 1 && { borderBottomWidth: 0 },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => {
                              onClose();
                              onSelectRestaurant?.(res.id);
                            }}
                          >
                            <Image
                              source={{ uri: res.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400' }}
                              style={styles.restaurantThumb}
                            />

                            <View style={styles.restaurantInfoCol}>
                              <Text style={styles.restaurantName} numberOfLines={1}>
                                {res.name}
                              </Text>
                              <View style={styles.restaurantMetaRow}>
                                <Star size={11} color="#DEA430" fill="#DEA430" style={{ marginRight: 3 }} />
                                <Text style={styles.restaurantRatingText}>{ratingVal}</Text>
                                <Text style={styles.restaurantReviewsText}>({countStr})</Text>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.metaText}>{deliveryTimeStr}</Text>
                                <Text style={styles.metaDot}>•</Text>
                                <Text style={styles.metaText} numberOfLines={1}>{areaStr}</Text>
                              </View>
                            </View>

                            <ChevronRight size={18} color="#DEA430" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* SECTION 2: MATCHING DISHES */}
                {moreResults.length > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionHeaderText}>
                        Dishes matching '{query}'
                      </Text>
                      <View style={styles.sectionHeaderLine} />
                    </View>

                    <View style={styles.resultsListCard}>
                      {moreResults.map((dish: any, index: number) => {
                        const restName = dish.restaurantName || 'Nearby Restaurant';

                        return (
                          <TouchableOpacity
                            key={`more_dish_${dish.id}_${index}`}
                            style={[
                              styles.dishRow,
                              index === moreResults.length - 1 && { borderBottomWidth: 0 },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => navigateToDishRestaurant(dish)}
                          >
                            <Image
                              source={{ uri: dish.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' }}
                              style={styles.dishThumb}
                            />

                            <View style={styles.dishInfoCol}>
                              <View style={styles.dishTopIndicatorRow}>
                                <View style={[styles.vegSquareSmall, { borderColor: dish.isVeg ? '#16A34A' : '#DC2626' }]}>
                                  <View style={[styles.vegCircleSmall, { backgroundColor: dish.isVeg ? '#16A34A' : '#DC2626' }]} />
                                </View>
                                {renderHighlightedText(dish.name, query)}
                              </View>
                              <Text style={styles.dishMetaSubtitle}>
                                ₹{dish.price || 199} • in {restName}
                              </Text>
                            </View>

                            <View style={styles.dishActionRow}>
                              <ChevronRight size={18} color="#DEA430" />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* STICKY "VIEW ALL RESULTS" ACTION FOOTER */}
              <TouchableOpacity
                style={[styles.viewAllFooterBtn, { paddingBottom: Math.max(insets.bottom, 12) }]}
                activeOpacity={0.88}
                onPress={() => handleExecuteSearch(query)}
              >
                <Text style={styles.viewAllFooterText}>
                  See all results for "{query}"
                </Text>
                <ChevronRight size={18} color="#000000" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          )}

        </View>
      </Animated.View>

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
                        handleExecuteSearch(phrase);
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
  modalOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  },
  backdropScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  floatingTopCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxWidth: isTablet ? 680 : undefined,
    alignSelf: 'center',
    backgroundColor: '#0B0A08',
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  compactCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  fullScreenCard: {
    height: SCREEN_HEIGHT,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  logoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favLogoMy: {
    fontSize: 38,
    color: '#deb853',
    fontFamily: 'Fasthand-Regular',
    letterSpacing: -1.2,
    height: 45,
    lineHeight: 52,
  },
  favQuroCropContainer: {
    width: 80,
    height: 45,
    overflow: 'hidden',
    marginLeft: 0,
  },
  favQuroCropImage: {
    width: 125,
    height: 68,
    marginLeft: -49,
    bottom: 15,
  },
  inputCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12110E',
    borderWidth: 1,
    borderColor: '#2B2822',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 14,
  },
  inputStack: {
    flex: 1,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15.5,
    fontFamily: 'Urbanist-Medium',
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
    height: 22,
    backgroundColor: '#383228',
    marginRight: 10,
    marginLeft: 6,
  },
  micBtn: {
    padding: 4,
  },
  defaultScrollView: {
    flex: 1,
  },
  defaultScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 20,
  },
  sectionWrap: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#DEA430',
    letterSpacing: 0.8,
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    color: '#8E8A80',
  },
  chipsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#2E2920',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  chipTouchPart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#E2DCD5',
    maxWidth: SCREEN_WIDTH * 0.38,
  },
  chipDeleteBtn: {
    padding: 4,
    marginLeft: 4,
  },
  trendingGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  trendingSearchCard: {
    width: isTablet ? '31.8%' : '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#2E2920',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  trendingIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  trendingDishTitle: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  trendingSubtitle: {
    fontSize: 10.5,
    fontFamily: 'Urbanist-Medium',
    color: '#F97316',
    marginTop: 1,
  },
  suggestionsScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  suggestionsContent: {
    paddingBottom: 80,
    gap: 16,
  },
  
  // Featured Top Match Card
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171614',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 18,
    padding: 12,
  },
  featuredCardImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#26221A',
  },
  featuredCardTextCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    gap: 2,
  },
  featuredTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(222, 164, 48, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  featuredTypeBadgeText: {
    fontSize: 10.5,
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  featuredCardTitle: {
    fontSize: 16.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  featuredPriceText: {
    fontSize: 13.5,
    fontFamily: 'Urbanist-Bold',
    color: '#E8C547',
  },
  featuredCardSearchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1A17',
    borderWidth: 1,
    borderColor: '#3D3627',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  sectionContainer: {
    gap: 10,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2E2920',
    marginLeft: 10,
  },
  resultsListCard: {
    backgroundColor: '#171614',
    borderWidth: 1,
    borderColor: '#26221A',
    borderRadius: 18,
    overflow: 'hidden',
  },

  // Restaurant Row
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242018',
  },
  restaurantThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#26221A',
  },
  restaurantInfoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    gap: 4,
  },
  restaurantName: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restaurantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantRatingText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    marginRight: 3,
  },
  restaurantReviewsText: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
  },
  metaDot: {
    fontSize: 12,
    color: '#555555',
    marginHorizontal: 5,
  },
  metaText: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Medium',
    color: '#9E9A90',
  },

  // Dish Row
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242018',
  },
  dishThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#26221A',
  },
  dishInfoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    gap: 3,
  },
  dishTopIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vegSquareSmall: {
    width: 12,
    height: 12,
    borderWidth: 1.2,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegCircleSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dishNameText: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Medium',
    flex: 1,
  },
  highlightGoldText: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#DEA430',
  },
  normalWhiteText: {
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
  },
  dishMetaSubtitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
  },
  dishActionRow: {
    paddingLeft: 6,
  },

  // View All Sticky Button
  viewAllFooterBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#DEA430',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  viewAllFooterText: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
    letterSpacing: 0.2,
  },

  // Voice Search Modal
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
