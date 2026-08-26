/**
 * Explore Screen.
 * Provides custom searching filters, category selection rows, and detailed expanded restaurant profile views.
 *
 * Original Java/Kotlin Path:
 * - /app/src/main/java/com/example/ui/screens/ExploreScreen.kt
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useViewModel } from '../state/MainViewModel';
import { THEME, COLORS } from '../theme/Theme';
import { Restaurant } from '../types';
import { getOptimizedImageUrl } from '../utils/imageUtils';
import { LazyImage } from '../components/LazyImage';
import { SkeletonLoader } from '../components/SkeletonLoader';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';
import {
  Search,
  X,
  MapPin,
  Star,
  Heart,
  Phone,
  Mail,
  Home,
  CheckCircle,
} from 'lucide-react-native';

interface ExploreScreenProps {
  onNavigateToDining?: (restaurantId: string) => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ onNavigateToDining }) => {
  const {
    isDarkMode,
    categories,
    searchQuery,
    updateSearchQuery,
    selectedCategoryTab,
    selectCategoryTab,
    selectedDishCategory,
    selectDishCategory,
    restaurantsList,
    toggleFavourite,
    isLoading,
  } = useViewModel();

  const theme = isDarkMode ? THEME.dark : THEME.light;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const tabs = ['Overall', 'Fine Dining', 'Cafe'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Banner Card */}
      <View style={styles.topCard}>
        <Text style={styles.topBadge}>Curated Fine Selections</Text>
        <Text style={styles.topTitle}>Find Your Next{"\n"}Favorite Spot</Text>
        <Text style={styles.topDesc}>
          Discover top-rated dining spots near you and experience flavors that you'll never forget. Reserve your table in seconds and enjoy seamless dining.
        </Text>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => Alert.alert('Main App', 'Browsing incredible menus below!')}
        >
          <Text style={styles.exploreBtnText}>Explore Restaurants</Text>
        </TouchableOpacity>
      </View>

      {/* Cravings Sections */}
      <View style={styles.cravingsSection}>
        <Text style={styles.cravingsTag}>TOP FOODS</Text>
        <Text style={[styles.cravingsTitle, { color: theme.text }]}>
          SATISFY YOUR CRAVINGS WITH{"\n"}
          <Text style={{ color: COLORS.quroRedPrimary }}>OUR CATEGORIES</Text>
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((cat, idx) => {
            const isSelected = selectedDishCategory === cat.name;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.categoryCircleContainer}
                onPress={() => selectDishCategory(cat.name)}
              >
                <View
                  style={[
                    styles.categoryImageContainer,
                    isSelected && { borderColor: COLORS.quroRedPrimary, borderWidth: 3 },
                  ]}
                >
                  <LazyImage source={{ uri: getOptimizedImageUrl(cat.imageUrl, 500) }} style={styles.categoryImage} />
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    { color: isSelected ? COLORS.quroRedPrimary : theme.text },
                    isSelected && { fontWeight: '800' },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Discover Layout */}
      <View style={styles.discoverSection}>
        <View style={styles.discoverHeader}>
          <View style={styles.onlineStatusRow}>
            <View style={styles.greenDot} />
            <Text style={styles.discoverSmallBadge}>Explore Restaurants</Text>
          </View>
          <Text style={[styles.discoverTitle, { color: theme.text }]}>Discover Amazing Restaurants</Text>
        </View>

        {/* Tab Selection Row */}
        <View style={styles.tabsRow}>
          {tabs.map((tab, idx) => {
            const isSelected = selectedCategoryTab === tab;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.tabPill,
                  { backgroundColor: isSelected ? COLORS.quroRedPrimary : theme.surface },
                ]}
                onPress={() => selectCategoryTab(tab)}
                accessibilityLabel={`tab_pill_${tab.toLowerCase()}`}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isSelected ? '#FFFFFF' : theme.textMuted },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search Input Box */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.borderColor }]}>
          <Search size={20} color={COLORS.quroRedPrimary} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={updateSearchQuery}
            placeholder="Search restaurants, cuisines, or cities..."
            placeholderTextColor={COLORS.quroTextSub}
            style={[styles.searchInput, { color: theme.text }]}
            accessibilityLabel="restaurant_search_input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => updateSearchQuery('')}>
              <X size={18} color={COLORS.quroTextSub} />
            </TouchableOpacity>
          )}
        </View>

        {/* Dynamic Restaurants List */}
        {isLoading ? (
          <View style={styles.restaurantsList}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <View
                key={`explore-skel-${idx}`}
                style={[styles.restaurantCard, { backgroundColor: theme.surface, borderColor: theme.borderColor, paddingBottom: 16 }]}
              >
                <SkeletonLoader width="100%" height={180} />
                <View style={{ padding: 12, gap: 8 }}>
                  <SkeletonLoader width={150} height={18} />
                  <SkeletonLoader width={100} height={12} />
                  <SkeletonLoader width="90%" height={14} style={{ marginTop: 8 }} />
                </View>
              </View>
            ))}
          </View>
        ) : restaurantsList.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No restaurants found matching results</Text>
          </View>
        ) : (
          <View style={styles.restaurantsList}>
            {restaurantsList.map((item, idx) => {
              const isExpanded = expandedId === item.id;
              return (
                <View
                  key={idx}
                  style={[styles.restaurantCard, { backgroundColor: theme.surface, borderColor: theme.borderColor }]}
                >
                  {/* Restaurant Image */}
                  <LazyImage source={{ uri: getOptimizedImageUrl(item.image, 500) }} style={styles.restaurantImage} />

                  {/* Rating Tag */}
                  <View style={styles.ratingTag}>
                    <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
                  </View>

                  {/* Bookmark Button */}
                  <TouchableOpacity
                    style={styles.favBtn}
                    onPress={() => toggleFavourite(item.id)}
                  >
                    <Heart
                      size={20}
                      color={item.isFavourite ? COLORS.quroRedPrimary : '#FFFFFF'}
                      fill={item.isFavourite ? COLORS.quroRedPrimary : 'rgba(0,0,0,0.3)'}
                    />
                  </TouchableOpacity>

                  {/* Card Info Body */}
                  <TouchableOpacity
                    style={styles.cardMainClick}
                    onPress={() => toggleExpand(item.id)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View>
                        <Text style={[styles.itemTitle, { color: theme.text }]}>{item.name}</Text>
                        <Text style={styles.itemCuisine}>{item.cuisine} • {item.category}</Text>
                      </View>
                    </View>

                    <Text style={styles.itemDetailsSub}>
                      {item.city} City • {item.reviewCount} Reviews
                    </Text>

                    <Text style={styles.itemDesc} numberOfLines={isExpanded ? undefined : 2}>
                      {item.description}
                    </Text>

                    {/* Collapsible details component */}
                    {isExpanded && (
                      <View style={[styles.expandedArea, { borderTopColor: theme.borderColor }]}>
                        <View style={styles.detailRow}>
                          <MapPin size={14} color={COLORS.quroRedPrimary} style={styles.detailIcon} />
                          <Text style={[styles.detailText, { color: theme.text }]}>{item.address}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Phone size={14} color={COLORS.quroRedPrimary} style={styles.detailIcon} />
                          <Text style={[styles.detailText, { color: theme.text }]}>{item.phone}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Mail size={14} color={COLORS.quroRedPrimary} style={styles.detailIcon} />
                          <Text style={[styles.detailText, { color: theme.text }]}>{item.email}</Text>
                        </View>

                        {/* Booking Reservation CTA */}
                        <TouchableOpacity
                          style={styles.reserveBtn}
                          onPress={() => {
                            if (onNavigateToDining) {
                              onNavigateToDining(item.id);
                            } else {
                              Alert.alert('Booking Action', `Confirming table reservation at ${item.name}!`);
                            }
                          }}
                        >
                          <Text style={styles.reserveBtnText}>Reserve Table Now</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },
  topCard: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#1E1E24',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  topBadge: {
    color: COLORS.quroGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
  },
  topDesc: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  exploreBtn: {
    marginTop: 16,
    backgroundColor: COLORS.quroRedPrimary,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cravingsSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  cravingsTag: {
    color: COLORS.quroAmberAccent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  cravingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  categoriesRow: {
    paddingHorizontal: 24,
    marginTop: 16,
    paddingBottom: 8,
  },
  categoryCircleContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
  },
  discoverSection: {
    paddingHorizontal: 24,
    marginTop: 24,
    paddingBottom: 40,
  },
  discoverHeader: {
    marginBottom: 16,
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  discoverSmallBadge: {
    color: COLORS.quroRedPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  discoverTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabText: {
    fontWeight: '700',
    fontSize: 13,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: COLORS.quroTextSub,
    fontWeight: '600',
    fontSize: 14,
  },
  restaurantsList: {
    gap: 20,
  },
  restaurantCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  ratingTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.quroRedPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingValue: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMainClick: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  itemCuisine: {
    color: COLORS.quroRedPrimary,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  itemDetailsSub: {
    color: COLORS.quroTextSub,
    fontSize: 12,
    marginTop: 4,
  },
  itemDesc: {
    color: COLORS.quroTextSub,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  expandedArea: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reserveBtn: {
    backgroundColor: COLORS.quroRedPrimary,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  reserveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
