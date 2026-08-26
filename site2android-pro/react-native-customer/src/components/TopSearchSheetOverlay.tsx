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
} from 'lucide-react-native';
import { useViewModel } from '../state/MainViewModel';
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
  'Krishna Florist',
  'FNP Flowers',
  'Ornate- The Flower',
  'Capital Flowers',
  'Apna Dhaba',
];

// Helper function to render text with matching query highlighted in bold gold
const renderBoldedText = (text: string, query: string) => {
  if (!query.trim()) {
    return <Text style={styles.boldTextMatch}>{text}</Text>;
  }

  const regex = new RegExp(`(${query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={styles.boldTextContainer}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase().trim();
        return (
          <Text
            key={index}
            style={isMatch ? styles.matchHighlightText : styles.normalPartText}
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

  const handleChipPress = (item: string) => {
    setQuery(item);
    const matchedRes = allRestaurants.find(
      (r) => r.name.toLowerCase() === item.toLowerCase()
    );
    if (matchedRes && onSelectRestaurant) {
      onClose();
      onSelectRestaurant(matchedRes.id);
    } else if (onNavigateToSearchScreen) {
      onClose();
      onNavigateToSearchScreen(item);
    }
  };

  const handleSubmitSearch = () => {
    if (!query.trim()) return;
    if (!recentSearches.includes(query.trim())) {
      setRecentSearches([query.trim(), ...recentSearches.slice(0, 5)]);
    }
    const matchedRes = allRestaurants.find(
      (r) => r.name.toLowerCase() === query.trim().toLowerCase()
    );
    if (matchedRes && onSelectRestaurant) {
      onClose();
      onSelectRestaurant(matchedRes.id);
    } else if (onNavigateToSearchScreen) {
      onClose();
      onNavigateToSearchScreen(query.trim());
    }
  };

  // Autocomplete suggestions mapping matching dishes, categories, and restaurants
  const autocompleteSuggestions = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const matches: Array<{
      id: string;
      name: string;
      subtitle: string;
      image: string;
      type: 'restaurant' | 'dish' | 'category';
      obj?: any;
    }> = [];

    // Food items matching query
    foodItems.forEach((food) => {
      if (food.name.toLowerCase().includes(q)) {
        matches.push({
          id: `food_${food.id}`,
          name: food.name,
          subtitle: food.category?.toLowerCase().includes('meat') ? 'Now delivering Fresh Meat!' : 'Dish',
          image: food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=60',
          type: 'dish',
          obj: food,
        });
      }
    });

    // Restaurant matches
    allRestaurants.forEach((res) => {
      if (res.name.toLowerCase().includes(q)) {
        matches.push({
          id: `res_${res.id}`,
          name: res.name,
          subtitle: `Restaurant · ${res.cuisine || 'Multi-Cuisine'}`,
          image: res.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=150&auto=format&fit=crop&q=60',
          type: 'restaurant',
          obj: res,
        });
      }
    });

    // Category matches
    categories.forEach((cat, idx) => {
      if (cat.name.toLowerCase().includes(q)) {
        matches.push({
          id: `cat_${idx}_${cat.name}`,
          name: cat.name,
          subtitle: 'Category',
          image: cat.imageUrl || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&auto=format&fit=crop&q=60',
          type: 'category',
        });
      }
    });

    return matches.slice(0, 10);
  }, [query, categories, allRestaurants, foodItems]);

  if (!visible) return null;

  const isQueryActive = query.trim().length > 0;

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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0D0B' }}>
          {/* 1. TOP HEADER ROW */}
          <View style={styles.topHeaderRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#DEA430" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Search for dishes & restaurants
            </Text>
          </View>

          {/* 2. SEARCH INPUT BOX */}
          <View style={styles.inputCardWrapper}>
            <View style={styles.inputInnerRow}>
              {/* Gold Search Icon */}
              <SearchIcon size={18} color="#DEA430" style={{ marginRight: 8 }} />
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search for 'Pizza' or 'Biryani'"
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
                  <View style={styles.clearBtnCircle}>
                    <X size={12} color="#D1D5DB" strokeWidth={2.4} />
                  </View>
                </TouchableOpacity>
              ) : null}

              <View style={styles.micSection}>
                <View style={styles.micDivider} />
                <TouchableOpacity style={styles.micBtn} activeOpacity={0.7}>
                  <Mic size={18} color="#DEA430" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. CONDITIONAL CONTENT: RECENTLY SEARCHED CHIPS VS FULL AUTOCOMPLETE LIST */}
          {!isQueryActive ? (
            <View style={styles.recentlySearchedSection}>
              <Text style={styles.recentlySearchedLabel}>
                RECENTLY SEARCHED RESTAURANTS
              </Text>
              <View style={styles.chipsWrapContainer}>
                {recentSearches.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chipItem}
                    activeOpacity={0.75}
                    onPress={() => handleChipPress(item)}
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
            /* 4. AUTOCOMPLETE SUGGESTIONS FULL-SCREEN TRANSITION */
            <ScrollView
              style={styles.suggestionsScrollView}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {autocompleteSuggestions.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.suggestionRowItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (s.type === 'restaurant' && s.obj && onSelectRestaurant) {
                      onClose();
                      onSelectRestaurant(s.obj.id);
                    } else {
                      handleChipPress(s.name);
                    }
                  }}
                >
                  {/* Circular Image Avatar */}
                  <Image
                    source={{ uri: s.image }}
                    style={styles.suggestionImageAvatar}
                  />

                  {/* Text Details with Bold Query Matches */}
                  <View style={styles.suggestionTextColumn}>
                    {renderBoldedText(s.name, query)}
                    <Text style={styles.suggestionSubtitle}>{s.subtitle}</Text>
                  </View>

                  <ChevronRight size={16} color="#524C42" />
                </TouchableOpacity>
              ))}
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  floatingTopCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxWidth: isTablet ? 680 : undefined,
    alignSelf: 'center',
    backgroundColor: '#0E0D0B',
    borderBottomWidth: 1,
    borderBottomColor: '#26221A',
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181613',
    borderWidth: 1,
    borderColor: '#2E2920',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    flex: 1,
  },
  inputCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181613',
    borderWidth: 1.2,
    borderColor: '#2E2920',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 6,
    marginRight: 2,
  },
  clearBtnCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2A2620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#2E2920',
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
  recentlySearchedLabel: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#C49530',
    letterSpacing: 1,
    marginBottom: 12,
  },
  chipsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  suggestionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1815',
  },
  suggestionImageAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1C1A17',
    borderWidth: 1,
    borderColor: '#2E2920',
  },
  suggestionTextColumn: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  suggestionSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8A80',
    marginTop: 2,
  },
  boldTextMatch: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
  },
  boldTextContainer: {
    fontSize: 15,
    color: '#9CA3AF',
    fontFamily: 'Urbanist-Medium',
  },
  matchHighlightText: {
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
    fontWeight: '800',
  },
  normalPartText: {
    fontFamily: 'Urbanist-Medium',
    color: '#D1D5DB',
  },
});

