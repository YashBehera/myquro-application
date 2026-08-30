import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  Search as SearchIcon,
  Mic,
  RotateCcw,
  X,
  ChevronRight,
  Star,
} from 'lucide-react-native';
import { useViewModel } from '../state/MainViewModel';
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
} from '../utils/responsive';

interface TopSearchSheetOverlayProps {
  visible: boolean;
  onClose: () => void;
  onSelectRestaurant?: (id: string) => void;
  onNavigateToSearchScreen?: (query: string) => void;
}

const DEFAULT_RECENT_SEARCHES = [
  'Ama Garden',
  'Biryani',
  'Pizza',
  'Burgers',
  'Apna Dhaba',
  'KFC',
  'Rolls',
];

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
  const { allRestaurants, foodItems, categories } = useViewModel();

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENT_SEARCHES);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const animY = useRef(new Animated.Value(-600)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
    
    if (!recentSearches.includes(cleanTerm)) {
      setRecentSearches([cleanTerm, ...recentSearches.filter(s => s.toLowerCase() !== cleanTerm.toLowerCase()).slice(0, 6)]);
    }

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
      }
    }
  };

  const handleSubmitSearch = () => {
    handleExecuteSearch(query);
  };

  // 1. Primary Top Suggestion Card (Requires minimum 3 letters)
  const firstSuggestion = React.useMemo(() => {
    if (query.trim().length < 3) return null;
    const q = query.toLowerCase().trim();

    // Check category match
    const cat = categories.find((c) => c.name.toLowerCase().includes(q));
    if (cat) {
      return {
        name: cat.name,
        type: 'Dish',
        image: cat.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
        isCategory: true,
      };
    }

    // Check dish match
    const food = foodItems.find((f) => f.name && f.name.toLowerCase().includes(q));
    if (food) {
      return {
        name: food.name,
        type: 'Dish',
        image: food.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
        isDish: true,
        foodObj: food,
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

    return {
      name: query.trim(),
      type: 'Dish',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=60',
    };
  }, [query, categories, foodItems, allRestaurants]);

  // 2. Restaurants Relevant Section (Requires minimum 3 letters)
  const relevantRestaurants = React.useMemo(() => {
    if (query.trim().length < 3) return [];
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

    return matches.slice(0, 6);
  }, [query, allRestaurants, foodItems]);

  // 3. More Results Matching Query (Dishes) (Requires minimum 3 letters)
  const moreResults = React.useMemo(() => {
    if (query.trim().length < 3) return [];
    const q = query.toLowerCase().trim();

    const matchedDishes = foodItems.filter(
      (food) => food.name && food.name.toLowerCase().includes(q)
    );

    // Filter out exact duplicate of first suggestion if it's identical
    const filtered = matchedDishes.filter(
      (food) => !(firstSuggestion?.name && firstSuggestion.name.toLowerCase() === food.name.toLowerCase())
    );

    return filtered.slice(0, 8);
  }, [query, foodItems, firstSuggestion]);

  if (!visible) return null;

  const isQueryActive = query.trim().length >= 3;

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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0A08' }}>
          
          {/* 1. TOP HEADER ROW WITH "MY QURO" LOGO */}
          <View style={styles.topHeaderRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            
            <View style={styles.logoTitleContainer}>
              <Text style={styles.myLogoText}>MY </Text>
              <Text style={styles.quroLogoText}>QURO</Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          {/* 2. SEARCH INPUT BOX WITH GOLDEN OUTLINE */}
          <View style={styles.inputCardWrapper}>
            <View style={styles.inputInnerRow}>
              {/* Search Icon */}
              <SearchIcon size={19} color="#9CA3AF" style={{ marginRight: 8 }} />
              
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search, Order, Enjoy, Repeat!"
                placeholderTextColor="#78716C"
                returnKeyType="search"
                onSubmitEditing={handleSubmitSearch}
                autoCorrect={false}
                selectionColor="#DEA430"
              />
              
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
                <TouchableOpacity style={styles.micBtn} activeOpacity={0.7} onPress={handleSubmitSearch}>
                  <Mic size={20} color="#DEA430" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. CONDITIONAL CONTENT: RECENTLY SEARCHED CHIPS VS SEARCH RESULTS */}
          {!isQueryActive ? (
            <View style={styles.recentlySearchedSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderText}>
                  RECENTLY SEARCHED RESTAURANTS
                </Text>
                <View style={styles.sectionHeaderLine} />
              </View>
              
              <View style={styles.chipsWrapContainer}>
                {recentSearches.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chipItem}
                    activeOpacity={0.75}
                    onPress={() => handleExecuteSearch(item)}
                  >
                    <RotateCcw size={12} color="#DEA430" strokeWidth={2.2} />
                    <Text style={styles.chipText} numberOfLines={1}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* 4. RESULTS MATCHING USER'S SCREENSHOT */
            <ScrollView
              style={styles.suggestionsScrollView}
              contentContainerStyle={styles.suggestionsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* TOP FEATURED RESULT CARD */}
              {firstSuggestion && (
                <TouchableOpacity
                  style={styles.featuredCard}
                  activeOpacity={0.85}
                  onPress={() => handleExecuteSearch(firstSuggestion.name)}
                >
                  <Image
                    source={{ uri: firstSuggestion.image }}
                    style={styles.featuredCardImage}
                  />
                  <View style={styles.featuredCardTextCol}>
                    <Text style={styles.featuredCardTitle} numberOfLines={1}>
                      {firstSuggestion.name}
                    </Text>
                    <Text style={styles.featuredCardSubtitle}>
                      {firstSuggestion.type}
                    </Text>
                  </View>
                  <View style={styles.featuredCardSearchBtn}>
                    <SearchIcon size={18} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                </TouchableOpacity>
              )}

              {/* SECTION 1: RESTAURANTS RELEVANT FOR QUERY */}
              {relevantRestaurants.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderText}>
                      Restaurants relevant for '{query}'
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
                        : '6.6K+';
                      const deliveryTimeStr = res.deliveryTime || '30–35 mins';
                      const areaStr = res.address || res.city || 'Patrapada';

                      return (
                        <TouchableOpacity
                          key={`rel_res_${res.id}_${index}`}
                          style={[
                            styles.restaurantRow,
                            index === relevantRestaurants.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleExecuteSearch(res.name)}
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
                              <Star size={12} color="#DEA430" fill="#DEA430" style={{ marginRight: 3 }} />
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

              {/* SECTION 2: MORE RESULTS MATCHING YOUR QUERY */}
              {moreResults.length > 0 && (
                <View style={styles.sectionContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeaderText}>
                      More results matching your query
                    </Text>
                    <View style={styles.sectionHeaderLine} />
                  </View>

                  <View style={styles.resultsListCard}>
                    {moreResults.map((dish: any, index: number) => (
                      <TouchableOpacity
                        key={`more_dish_${dish.id}_${index}`}
                        style={[
                          styles.dishRow,
                          index === moreResults.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleExecuteSearch(dish.name)}
                      >
                        <Image
                          source={{ uri: dish.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' }}
                          style={styles.dishThumb}
                        />

                        <View style={styles.dishInfoCol}>
                          {renderHighlightedText(dish.name, query)}
                          <Text style={styles.dishSubtitle}>Dish</Text>
                        </View>

                        <ChevronRight size={18} color="#DEA430" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Animated.View>
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
    ...StyleSheet.absoluteFillObject,
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
    paddingTop: Platform.OS === 'ios' ? 10 : 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myLogoText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  quroLogoText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
    color: '#DEA430',
    letterSpacing: 0.5,
  },
  inputCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12110E',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
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
  recentlySearchedSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chipsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#2E2920',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 10,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#E2DCD5',
    maxWidth: SCREEN_WIDTH * 0.42,
  },
  suggestionsScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  suggestionsContent: {
    paddingBottom: 40,
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
    width: 66,
    height: 66,
    borderRadius: 14,
    backgroundColor: '#26221A',
  },
  featuredCardTextCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    gap: 3,
  },
  featuredCardTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#DEA430',
  },
  featuredCardSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8A80',
  },
  featuredCardSearchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#CFCAC3',
    marginRight: 10,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#66552B',
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
    width: 56,
    height: 56,
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
    fontSize: 15.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restaurantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantRatingText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 3,
  },
  restaurantReviewsText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
  },
  metaDot: {
    fontSize: 12,
    color: '#555555',
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12,
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
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#26221A',
  },
  dishInfoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    gap: 3,
  },
  dishNameText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
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
  dishSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8A80',
  },
});
