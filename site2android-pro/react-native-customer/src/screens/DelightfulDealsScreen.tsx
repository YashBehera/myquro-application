/**
 * DelightfulDealsScreen.tsx — MyQuro Customer App
 * 
 * Pixel-by-pixel implementation of Pay Day / Delightful Deals screen:
 * - Circular gold-bordered top action buttons (Back & Search)
 * - "PAY DAY" hero banner with sunburst rays, faint rupee symbols & Kathi roll platter
 * - "Deals On Your Favs" section header
 * - Horizontal interactive filter pills (70% OFF, ITEMS STARTING AT 49, UPTO 60% OFF, etc.)
 * - 3-Column Grid of restaurant deal cards with discount badges, ratings, times, cuisines & favorites
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Heart, ChevronRight, ArrowRight, SlidersHorizontal, ChevronDown, MoreVertical } from 'lucide-react-native';
import { useViewModel } from '../state/MainViewModel';
import { SCREEN_WIDTH, isTablet } from '../utils/responsive';

// Hero Platter Local Asset (Transparent PNG without background)
const heroRollImg = require('../assets/home/payday_hero_rolls.png');

interface DelightfulDealsScreenProps {
  onBack: () => void;
  onNavigateToRestaurant?: (id: string) => void;
  onNavigateToSearch?: () => void;
}

interface DealCardItem {
  id: string;
  name: string;
  image: string;
  rating: number;
  time: string;
  cuisine: string;
  discount: string;
  subDiscount: string;
  isAd?: boolean;
  category: string;
}

const FILTER_TABS = [
  '70% OFF',
  'ITEMS STARTING AT 49',
  'UPTO 60% OFF',
  'FLAT ₹150 OFF',
  'FREE DELIVERY',
];

const CRAVINGS_DATA = [
  { label: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80' },
  { label: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&q=80' },
  { label: 'Burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80' },
  { label: 'Nuggets', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=200&q=80' },
];

export const DelightfulDealsScreen: React.FC<DelightfulDealsScreenProps> = ({
  onBack,
  onNavigateToRestaurant,
  onNavigateToSearch,
}) => {
  const insets = useSafeAreaInsets();
  const { allRestaurants, favouriteRestaurantsList, toggleFavourite } = useViewModel();

  const [activeTab, setActiveTab] = useState<string>('70% OFF');
  const [localFavIds, setLocalFavIds] = useState<Set<string>>(new Set());

  // Dynamically build deals list from real allRestaurants
  const combinedDeals: DealCardItem[] = useMemo(() => {
    if (!allRestaurants || allRestaurants.length === 0) return [];

    return allRestaurants.map((r, idx) => {
      const discount =
        idx % 3 === 0
          ? '70% OFF'
          : idx % 3 === 1
          ? 'ITEMS STARTING AT 49'
          : 'UPTO 60% OFF';
      const subDiscount =
        idx % 3 === 0 ? 'UPTO ₹140' : idx % 3 === 1 ? 'FROM ₹49' : 'UPTO ₹120';
      const imgUri =
        typeof r.image === 'string'
          ? r.image
          : (r.image as any)?.uri ||
            'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80';

      return {
        id: r.id,
        name: r.name,
        image: imgUri,
        rating: typeof r.rating === 'number' && r.rating > 0 ? r.rating : 4.3,
        time: '30-40 mins',
        cuisine: r.cuisine || r.category || 'Multi-cuisine',
        discount: r.discount || discount,
        subDiscount,
        isAd: idx === 0,
        category: discount,
      };
    });
  }, [allRestaurants]);

  // Filter based on active tab
  const filteredDeals = useMemo(() => {
    if (activeTab === '70% OFF') {
      const res = combinedDeals.filter(
        (item) => item.discount.includes('70%') || item.category === '70% OFF'
      );
      return res.length > 0 ? res : combinedDeals;
    } else if (activeTab === 'ITEMS STARTING AT 49') {
      const res = combinedDeals.filter(
        (item) => item.discount.includes('49') || item.category === 'ITEMS STARTING AT 49'
      );
      return res.length > 0 ? res : combinedDeals;
    } else if (activeTab === 'UPTO 60% OFF') {
      const res = combinedDeals.filter(
        (item) => item.discount.includes('60%') || item.category === 'UPTO 60% OFF'
      );
      return res.length > 0 ? res : combinedDeals;
    } else if (activeTab === 'FLAT ₹150 OFF') {
      const res = combinedDeals.filter(
        (item) => item.discount.includes('150') || item.subDiscount.includes('140')
      );
      return res.length > 0 ? res : combinedDeals;
    }
    return combinedDeals;
  }, [combinedDeals, activeTab]);

  // Dynamically build explore list from real allRestaurants
  const exploreRestaurantsList = useMemo(() => {
    if (!allRestaurants || allRestaurants.length === 0) return [];
    return allRestaurants.map((r, idx) => {
      const imgUri =
        typeof r.image === 'string'
          ? r.image
          : (r.image as any)?.uri ||
            'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80';
      const distStr =
        typeof r.distance === 'number' && !isNaN(r.distance) ? `${r.distance.toFixed(1)} km` : '4.5 km';

      return {
        id: r.id,
        name: r.name,
        image: imgUri,
        rating: typeof r.rating === 'number' && r.rating > 0 ? r.rating : 4.2,
        ratingCount: r.reviewCount ? `${r.reviewCount}+` : '1.5K+',
        time: '35-45 mins',
        cuisines: r.cuisine || r.category || 'Multi-cuisine',
        location: r.address || r.city || 'Bhubaneswar',
        distance: distStr,
        discount: r.discount || (idx % 2 === 0 ? '70% OFF' : 'FLAT ₹150 OFF'),
        subDiscount: idx % 2 === 0 ? 'UPTO ₹140' : 'ABOVE ₹399',
      };
    });
  }, [allRestaurants]);

  const isFavorite = useCallback(
    (id: string) => {
      if (localFavIds.has(id)) return true;
      return (favouriteRestaurantsList || []).some(
        (f: any) => f.id === id || f.restaurantId === id
      );
    },
    [favouriteRestaurantsList, localFavIds]
  );

  const handleToggleFav = (item: { id: string; name?: string }) => {
    setLocalFavIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });

    toggleFavourite(item.id);
  };

  const handleCardPress = (item: { id: string; name?: string }) => {
    if (onNavigateToRestaurant) {
      onNavigateToRestaurant(item.id);
    }
  };

  // Card dimensions for 3-column layout
  const numColumns = isTablet ? 5 : 3;
  const horizontalPadding = 14;
  const cardGap = 10;
  const availableWidth = SCREEN_WIDTH - (horizontalPadding * 2) - (cardGap * (numColumns - 1));
  const cardWidth = Math.floor(availableWidth / numColumns);
  const imageHeight = Math.floor(cardWidth * 1.04);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── TOP FLOATING HEADER ── */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Gold Border Circular Back Button */}
          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.8}
            onPress={onBack}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#DEA430" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{activeTab}</Text>
        </View>

        {/* Gold Border Circular Search Button */}
        <TouchableOpacity
          style={styles.circleBtn}
          activeOpacity={0.8}
          onPress={onNavigateToSearch}
          accessibilityLabel="Search"
        >
          <Search size={20} color="#DEA430" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO BANNER: PAY DAY ── */}
        <View style={styles.heroSection}>
          {/* Subtle Currency Glyphs in background */}
          <Text style={[styles.bgRupee, { top: 15, left: 18 }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 48, left: 32, opacity: 0.08 }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 85, left: 12, opacity: 0.1 }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 18, right: 20 }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 52, right: 35, opacity: 0.08 }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 90, right: 14, opacity: 0.12 }]}>₹</Text>
          
          {/* Rupee symbols positioned specifically around and behind the dish area */}
          <Text style={[styles.bgRupee, { top: 130, left: 24, opacity: 0.11, transform: [{ rotate: '15deg' }, { scale: 0.9 }] }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 140, right: 28, opacity: 0.13, transform: [{ rotate: '-25deg' }, { scale: 1.1 }] }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 185, left: 36, opacity: 0.08, transform: [{ rotate: '-12deg' }, { scale: 0.85 }] }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 195, right: 40, opacity: 0.12, transform: [{ rotate: '20deg' }, { scale: 1.05 }] }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 155, left: '50%', marginLeft: -130, opacity: 0.07, transform: [{ rotate: '-8deg' }] }]}>₹</Text>
          <Text style={[styles.bgRupee, { top: 165, left: '50%', marginLeft: 110, opacity: 0.06, transform: [{ rotate: '18deg' }] }]}>₹</Text>

          {/* Large Gold "PAY DAY" Title */}
          <Text style={styles.payDayTitle}>PAY DAY</Text>

          {/* Subtitle: "GET 70% OFF & MORE" */}
          <View style={styles.subTitleRow}>
            <Text style={styles.subTitleWhite}>GET </Text>
            <Text style={styles.subTitleGold}>70% OFF</Text>
            <Text style={styles.subTitleWhite}> & MORE</Text>
          </View>

          {/* Kathi Roll / Frankie Platter Image (Seamless floating image without background) */}
          <View style={styles.heroImageWrapper}>
            <Image
              source={heroRollImg}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── SECTION TITLE: Deals On Your Favs ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Deals On Your Favs</Text>
        </View>

        {/* ── CATEGORY FILTER PILLS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 3-COLUMN RESTAURANT DEALS GRID ── */}
        <View style={styles.gridContainer}>
          {combinedDeals.map((item) => {
            const fav = isFavorite(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.dealCard, { width: cardWidth }]}
                activeOpacity={0.88}
                onPress={() => handleCardPress(item)}
              >
                {/* Thumbnail Container with Discount Scrim */}
                <View style={[styles.thumbnailWrap, { height: imageHeight }]}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />

                  {/* Favorite Heart Button in Top-Right */}
                  <TouchableOpacity
                    style={styles.cardHeartBtn}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFav(item);
                    }}
                  >
                    <Heart
                      size={15}
                      color={fav ? '#FF4343' : '#FFFFFF'}
                      fill={fav ? '#FF4343' : 'transparent'}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>

                  {/* Bottom Scrim with Discount Text */}
                  <View style={styles.scrimOverlay}>
                    <Text style={styles.scrimDiscountTitle}>{item.discount}</Text>
                    <View style={styles.scrimSubRow}>
                      <Text style={styles.scrimSubText}>{item.subDiscount}</Text>
                      {item.isAd && (
                        <Text style={styles.scrimAdBadge}> | AD</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Details Below Thumbnail */}
                <View style={styles.cardDetails}>
                  <Text
                    style={styles.restaurantName}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  {/* Rating and Delivery Time Row */}
                  <View style={styles.ratingTimeRow}>
                    <View style={styles.ratingStarCircle}>
                      <Text style={styles.ratingStarIcon}>★</Text>
                    </View>
                    <Text style={styles.ratingValueText}>{item.rating}</Text>
                    <Text style={styles.ratingDot}>•</Text>
                    <Text style={styles.deliveryTimeText}>{item.time}</Text>
                  </View>

                  {/* Cuisine / Category */}
                  <Text style={styles.cuisineText} numberOfLines={1}>
                    {item.cuisine}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── See More Restaurants Banner ── */}
        <TouchableOpacity style={styles.seeMoreBanner} activeOpacity={0.88}>
          <Text style={styles.seeMoreText}>See More Restaurants</Text>
          <ChevronRight size={15} color="#DEA430" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* ── Dishes Picked For Your Cravings ── */}
        <View style={styles.cravingsSection}>
          <Text style={styles.sectionTitle}>Dishes Picked For Your Cravings</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cravingsScroll}
          >
            {CRAVINGS_DATA.map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.cravingItem} activeOpacity={0.8}>
                <View style={styles.cravingCircle}>
                  <Image source={{ uri: item.image }} style={styles.cravingImage} />
                </View>
                <Text style={styles.cravingLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Your Flavours, Our Deals ── */}
        <View style={styles.flavoursSection}>
          <Text style={styles.sectionTitle}>Your Flavours, Our Deals</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH - 32}
            decelerationRate="fast"
            contentContainerStyle={styles.flavoursScroll}
          >
            {/* Card 1: Sweet Truth */}
            <View style={styles.flavourCard}>
              <View style={styles.flavourLeft}>
                <Text style={styles.flavourMainTitle}>Get 70% OFF</Text>
                <Text style={styles.flavourSub}>
                  Order fantastic delights from <Text style={styles.flavourGold}>Sweet Truth</Text>
                </Text>
                <TouchableOpacity style={styles.flavourArrowBtn} activeOpacity={0.8}>
                  <ArrowRight size={13} color="#DEA430" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.flavourRight}>
                <Image source={require('../assets/home/sweet_truth_cake.jpg')} style={styles.flavourCakeImg} />
                <View style={styles.brandBadge}>
                  <Text style={styles.brandBadgeText}>Sweet Truth</Text>
                </View>
              </View>
            </View>

            {/* Card 2: KFC alternative deal */}
            <View style={[styles.flavourCard, { backgroundColor: '#1A0C0B' }]}>
              <View style={styles.flavourLeft}>
                <Text style={styles.flavourMainTitle}>Get 70% OFF</Text>
                <Text style={styles.flavourSub}>
                  Savor hot fried chicken bucket from <Text style={styles.flavourGold}>KFC</Text>
                </Text>
                <TouchableOpacity style={styles.flavourArrowBtn} activeOpacity={0.8}>
                  <ArrowRight size={13} color="#DEA430" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.flavourRight}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?w=400&q=80' }} style={styles.flavourCakeImg} />
                <View style={styles.brandBadge}>
                  <Text style={styles.brandBadgeText}>KFC</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* ── Filters & Sort By Row ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.exploreFiltersScroll}
        >
          <TouchableOpacity style={styles.exploreFilterBtn} activeOpacity={0.8}>
            <SlidersHorizontal size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.exploreFilterText}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exploreFilterBtn} activeOpacity={0.8}>
            <Text style={styles.exploreFilterText}>Sort By</Text>
            <ChevronDown size={12} color="#8E8E8E" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.exploreFilterBtn} activeOpacity={0.8}>
            <Text style={styles.exploreFilterText}>Bolt ⚡ Food in 15 mins</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exploreFilterBtn} activeOpacity={0.8}>
            <Text style={styles.exploreFilterText}>Veg</Text>
            <ChevronDown size={12} color="#8E8E8E" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </ScrollView>

        {/* ── Explore More Restaurants Vertical List ── */}
        <View style={styles.exploreSection}>
          <Text style={styles.sectionTitle}>Explore More Restaurants</Text>
          <View style={styles.exploreList}>
            {exploreRestaurantsList.map((item) => {
              const fav = isFavorite(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.exploreCard}
                  activeOpacity={0.92}
                  onPress={() => handleCardPress(item as any)}
                >
                  {/* Left: Thumbnail Image */}
                  <View style={styles.exploreThumbWrap}>
                    <Image source={{ uri: item.image }} style={styles.exploreThumbImg} />
                    
                    <TouchableOpacity
                      style={styles.exploreHeartBtn}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleFav(item as any);
                      }}
                    >
                      <Heart
                        size={14}
                        color={fav ? '#FF4343' : '#FFFFFF'}
                        fill={fav ? '#FF4343' : 'transparent'}
                      />
                    </TouchableOpacity>

                    <View style={styles.exploreBadgeOverlay}>
                      <Text style={styles.exploreDiscountTitle}>{item.discount}</Text>
                      <Text style={styles.exploreSubDiscount}>{item.subDiscount} | AD</Text>
                    </View>
                  </View>

                  {/* Right Details */}
                  <View style={styles.exploreInfoCol}>
                    <View style={styles.exploreTitleRow}>
                      <View style={styles.gourmetTagContainer}>
                        <Text style={styles.gourmetTag}>gourmet</Text>
                        <View style={styles.gourmetUnderline} />
                      </View>
                      <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
                        <MoreVertical size={16} color="#8E8E8E" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.exploreRestName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <View style={styles.exploreRatingRow}>
                      <View style={styles.exploreStarBadge}>
                        <Text style={styles.exploreStarIcon}>★</Text>
                      </View>
                      <Text style={styles.exploreRatingText}>
                        {item.rating} ({item.ratingCount}) • {item.time}
                      </Text>
                    </View>

                    <Text style={styles.exploreCuisines} numberOfLines={1}>
                      {item.cuisines}
                    </Text>

                    <Text style={styles.exploreLocation} numberOfLines={1}>
                      {item.location} • {item.distance}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: Math.max(insets.bottom, 24) + 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#000000',
    zIndex: 20,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(20, 16, 10, 0.88)',
    borderWidth: 1.2,
    borderColor: '#C69B34',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ── HERO SECTION ──
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  bgRupee: {
    position: 'absolute',
    fontFamily: 'Urbanist-Bold',
    fontSize: 22,
    color: '#DEA430',
    opacity: 0.14,
  },
  payDayTitle: {
    fontFamily: 'BebasNeue-Regular',
    fontSize: 70,
    lineHeight: 72,
    color: '#DEA430',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 6,
    textShadowColor: 'rgba(222, 164, 48, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 14,
  },
  subTitleWhite: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 2.2,
  },
  subTitleGold: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 17,
    color: '#DEA430',
    letterSpacing: 2.2,
  },
  heroImageWrapper: {
    width: SCREEN_WIDTH - 60,
    maxWidth: 330,
    height: (SCREEN_WIDTH - 60) * 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  // ── SECTION HEADER ──
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── FILTER TABS ──
  filterTabsContainer: {
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 18,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: '#18140B',
    borderWidth: 1.4,
    borderColor: '#DEA430',
  },
  filterPillInactive: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#242424',
  },
  filterPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  filterPillTextActive: {
    color: '#DEA430',
  },
  filterPillTextInactive: {
    color: '#8A8A8A',
  },

  // ── 3-COLUMN GRID ──
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
    justifyContent: 'flex-start',
  },
  dealCard: {
    marginBottom: 14,
  },
  thumbnailWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrimOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 6,
    paddingVertical: 4.5,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  scrimDiscountTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 11,
    color: '#DEA430',
    lineHeight: 13,
  },
  scrimSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0.5,
  },
  scrimSubText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8.5,
    color: '#FFFFFF',
  },
  scrimAdBadge: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 7.5,
    color: 'rgba(255, 255, 255, 0.65)',
  },

  // Details
  cardDetails: {
    marginTop: 6,
    paddingHorizontal: 1,
  },
  restaurantName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 15,
  },
  ratingTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingStarCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#24963F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  ratingStarIcon: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: 'bold',
    marginTop: -1,
  },
  ratingValueText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 10.5,
    color: '#E0E0E0',
  },
  ratingDot: {
    fontSize: 9,
    color: '#6E6E6E',
    marginHorizontal: 3,
  },
  deliveryTimeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#9E9E9E',
  },
  cuisineText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#7A7A7A',
    marginTop: 2,
  },

  // ── NEW CONTINUATION STYLES ──
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginLeft: 14,
  },
  seeMoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    height: 50,
    backgroundColor: '#0C0C0C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(218, 164, 48, 0.22)',
    marginTop: 18,
    marginBottom: 24,
  },
  seeMoreText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#DEA430',
  },
  
  // Cravings
  cravingsSection: {
    marginBottom: 24,
  },
  cravingsScroll: {
    paddingHorizontal: 16,
    gap: 16,
    marginTop: 8,
  },
  cravingItem: {
    alignItems: 'center',
    width: 80,
  },
  cravingCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: '#DEA430',
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  cravingImage: {
    width: '100%',
    height: '100%',
  },
  cravingLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },

  // Flavours (Sweet Truth Deals)
  flavoursSection: {
    marginBottom: 24,
  },
  flavoursScroll: {
    paddingHorizontal: 16,
    gap: 14,
    marginTop: 10,
  },
  flavourCard: {
    flexDirection: 'row',
    width: SCREEN_WIDTH - 44,
    height: 140,
    backgroundColor: '#081D33',
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  flavourLeft: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  flavourMainTitle: {
    fontFamily: 'Urbanist-Black',
    fontSize: 22,
    color: '#FFFFFF',
  },
  flavourSub: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
    marginTop: 4,
  },
  flavourGold: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
  },
  flavourArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  flavourRight: {
    width: 110,
    height: '100%',
    position: 'relative',
  },
  flavourCakeImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  brandBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderWidth: 1,
    borderColor: '#DEA430',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  brandBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8.5,
    color: '#DEA430',
  },

  // Explore Filters Scroll
  exploreFiltersScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
    height: 38,
  },
  exploreFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    height: 34,
  },
  exploreFilterText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  // Explore List Section
  exploreSection: {
    paddingHorizontal: 16,
  },
  exploreList: {
    gap: 16,
    marginTop: 12,
  },
  exploreCard: {
    flexDirection: 'row',
    backgroundColor: '#0C0C0C',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#191919',
  },
  exploreThumbWrap: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  exploreThumbImg: {
    width: '100%',
    height: '100%',
  },
  exploreHeartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  exploreBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  exploreDiscountTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 10.5,
    color: '#DEA430',
  },
  exploreSubDiscount: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8,
    color: '#FFFFFF',
  },

  // Info Column
  exploreInfoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  exploreTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gourmetTagContainer: {
    alignSelf: 'flex-start',
  },
  gourmetTag: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10,
    color: '#DEA430',
    fontStyle: 'italic',
  },
  gourmetUnderline: {
    height: 1,
    backgroundColor: '#DEA430',
    width: '100%',
    marginTop: 0.5,
  },
  moreBtn: {
    padding: 4,
  },
  exploreRestName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#FFFFFF',
    marginTop: 4,
  },
  exploreRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  exploreStarBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#24963F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  exploreStarIcon: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: 'bold',
    marginTop: -1,
  },
  exploreRatingText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11,
    color: '#B0B0B0',
  },
  exploreCuisines: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 3,
  },
  exploreLocation: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 2,
  },
});
