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
  Modal,
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
  Utensils,
} from 'lucide-react-native';
import { useViewModel } from '../state/MainViewModel';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Helper function to render text with matching query highlighted in bold
const renderBoldedText = (text: string, query: string) => {
  if (!query.trim()) {
    return <Text style={{ color: '#0F172A', fontSize: 15.5, fontFamily: 'Urbanist-Bold' }}>{text}</Text>;
  }

  const regex = new RegExp(`(${query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={{ fontSize: 15.5, color: '#475569', fontFamily: 'Urbanist-Medium' }}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === query.toLowerCase().trim();
        return (
          <Text
            key={index}
            style={{
              fontFamily: isMatch ? 'Urbanist-Bold' : 'Urbanist-Medium',
              color: isMatch ? '#0F172A' : '#64748B',
              fontWeight: isMatch ? '800' : '400',
            }}
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
        Animated.timing(animY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 280,
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
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 220,
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* 1. TOP HEADER ROW */}
          <View style={styles.topHeaderRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#1E293B" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Search for dishes & restaurants
            </Text>
          </View>

          {/* 2. SEARCH INPUT BOX */}
          <View style={styles.inputCardWrapper}>
            <View style={styles.inputInnerRow}>
              {/* Active Cursor Accent */}
              <View style={styles.activeCursorLine} />
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search, Order, Enjoy, Repeat!"
                placeholderTextColor="#94A3B8"
                returnKeyType="search"
                onSubmitEditing={handleSubmitSearch}
                autoCorrect={false}
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  style={styles.clearBtn}
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              ) : null}

              <View style={styles.micSection}>
                <View style={styles.micDivider} />
                <TouchableOpacity style={styles.micBtn}>
                  <Mic size={18} color="#F97316" strokeWidth={2.2} />
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
                    activeOpacity={0.8}
                    onPress={() => handleChipPress(item)}
                  >
                    <RotateCcw size={13} color="#64748B" strokeWidth={2} />
                    <Text style={styles.chipText} numberOfLines={1}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* 4. SWIGGY-STYLE AUTOCOMPLETE SUGGESTIONS FULL-SCREEN TRANSITION */
            <ScrollView
              style={styles.suggestionsScrollView}
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  floatingTopCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  compactCard: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    color: '#1E293B',
    flex: 1,
  },
  inputCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 14,
  },
  activeCursorLine: {
    width: 2,
    height: 18,
    backgroundColor: '#F97316',
    marginRight: 8,
    borderRadius: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    color: '#0F172A',
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
  recentlySearchedSection: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  recentlySearchedLabel: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#475569',
    letterSpacing: 0.8,
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#334155',
    maxWidth: SCREEN_WIDTH * 0.42,
  },
  suggestionsScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  suggestionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionImageAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
  },
  suggestionTextColumn: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  suggestionSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    color: '#64748B',
    marginTop: 3,
  },
});
