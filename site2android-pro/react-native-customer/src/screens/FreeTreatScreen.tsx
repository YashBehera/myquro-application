/**
 * FreeTreatScreen.tsx — MyQuro Customer App
 * 
 * Pixel-by-pixel implementation of "GET A FREE TREAT" deals page:
 * - Circular gold-bordered header buttons (Back & Search)
 * - "GET A FREE TREAT" hero typography with sparkle accents & floating graphics
 * - Delicious Gulab Jamun bowl & Berry Milkshake hero visual
 * - "Buy One, Get One" gold-bordered banner card with twin gourmet burgers
 * - "Restaurants to explore" section
 * - Interactive filter pills (Filter, Sort By, Bolt, Veg)
 * - Detailed restaurant cards with gold rating badges, tags, cuisines, and favorite toggles
 */

import React, { useState, useCallback } from 'react';
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
import {
  ArrowLeft,
  Search,
  Heart,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  MoreVertical,
  Sparkles,
} from 'lucide-react-native';
import { useViewModel } from '../state/MainViewModel';
import { SCREEN_WIDTH, isTablet } from '../utils/responsive';

// Local assets
const freeTreatFullBannerImg = require('../assets/home/free_treat_full_banner.png');
const bogoTwinBurgersImg = require('../assets/home/bogo_twin_burgers.png');

interface FreeTreatScreenProps {
  onBack: () => void;
  onNavigateToRestaurant?: (id: string) => void;
  onNavigateToSearch?: () => void;
}

interface ExploreRestaurantItem {
  id: string;
  name: string;
  image: string;
  rating: number;
  ratingCount: string;
  time: string;
  cuisines: string;
  location: string;
  distance: string;
  discount: string;
  subDiscount: string;
  tag?: string;
}

const EXPLORE_RESTAURANTS: ExploreRestaurantItem[] = [
  {
    id: 'deal-bbq-nation-explore',
    name: 'Barbeque Nation',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    rating: 4.1,
    ratingCount: '2.4K+',
    time: '45–55 mins',
    cuisines: 'North Indian, Barbecue, Kebabs',
    location: 'Patrapada',
    distance: '5.0 km',
    discount: '70% OFF',
    subDiscount: 'UPTO ₹140',
  },
  {
    id: 'deal-asia-seven',
    name: 'Asia Seven – Sizzling Chinese',
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=600&auto=format&fit=crop&q=80',
    rating: 4.4,
    ratingCount: '8.3K+',
    time: '40–45 mins',
    cuisines: 'Chinese, Asian, Pan-Asian',
    location: 'Patrapada',
    distance: '5.0 km',
    discount: '70% OFF',
    subDiscount: 'UPTO ₹140',
    tag: 'Best in Chinese',
  },
];

interface GourmetOptionItem {
  id: string;
  name: string;
  image: string;
  rating: number;
  time: string;
  cuisines: string;
  discount: string;
  subDiscount: string;
  badgeTag?: string;
}

interface FlatDealRestaurantItem {
  id: string;
  name: string;
  image: string;
  rating: number;
  ratingCount: string;
  time: string;
  cuisines: string;
  location: string;
  distance: string;
  flatDealText?: string;
  flatDealDiscount?: string;
  flatDealSub?: string;
  eatRight?: boolean;
}

const TOP_GOURMET_DATA: GourmetOptionItem[] = [
  {
    id: 'gourmet-punjab-grill',
    name: 'Street Foods By...',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80',
    rating: 4.3,
    time: '40–45 mins',
    cuisines: 'Kebabs, Biryani, Mugh...',
    discount: '70% OFF',
    subDiscount: 'UPTO ₹140 | AD',
  },
  {
    id: 'gourmet-behrouz-biryani',
    name: 'Behrouz Biryani',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80',
    rating: 4.3,
    time: '30–35 mins',
    cuisines: 'Biryani, Mughlai, Luck...',
    discount: '65% OFF',
    subDiscount: 'UPTO ₹125',
    badgeTag: 'Dum pukht in\nNawabi Andaaz',
  },
  {
    id: 'gourmet-bocca-cafe',
    name: 'Bocca Cafe',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format&fit=crop&q=80',
    rating: 4.5,
    time: '35–45 mins',
    cuisines: 'Cafe, Italian, Pizza',
    discount: '60% OFF',
    subDiscount: 'UPTO ₹120',
  },
];

const FLAT_DEAL_RESTAURANTS: FlatDealRestaurantItem[] = [
  {
    id: 'deal-subway',
    name: 'Subway',
    image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80',
    rating: 4.4,
    ratingCount: '2.9K+',
    time: '25–30 mins',
    cuisines: 'sandwich, Salads, wrap',
    location: 'IRC Colony',
    distance: '7.1 km',
    flatDealText: 'FLAT DEAL',
    flatDealDiscount: '₹150 OFF',
    flatDealSub: 'ABOVE ₹299',
    eatRight: true,
  },
  {
    id: 'deal-begum-biryani',
    name: 'Begum Noor Jahan Biry...',
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80',
    rating: 4.2,
    ratingCount: '1.6K+',
    time: '40–50 mins',
    cuisines: 'Biryani, Kebabs',
    location: 'Patrapada',
    distance: '5.0 km',
    flatDealText: 'FLAT DEAL',
    flatDealDiscount: '50% OFF',
  },
  {
    id: 'deal-dominos',
    name: "Domino's Pizza",
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    rating: 4.3,
    ratingCount: '3.8K+',
    time: '30–40 mins',
    cuisines: 'Pizza, Italian',
    location: 'Patrapada',
    distance: '4.2 km',
  },
  {
    id: 'deal-bbq-nation',
    name: 'Barbeque Nation',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    rating: 4.1,
    ratingCount: '2.4K+',
    time: '45–55 mins',
    cuisines: 'North Indian, Barbecue, Kebabs',
    location: 'Patrapada',
    distance: '5.0 km',
    flatDealText: 'FLAT DEAL',
    flatDealDiscount: '40% OFF',
    flatDealSub: 'ABOVE ₹499',
  },
];

export const FreeTreatScreen: React.FC<FreeTreatScreenProps> = ({
  onBack,
  onNavigateToRestaurant,
  onNavigateToSearch,
}) => {
  const insets = useSafeAreaInsets();
  const { allRestaurants, favouriteRestaurantsList, toggleFavourite } = useViewModel();

  const [localFavIds, setLocalFavIds] = useState<Set<string>>(new Set());

  const isFavorite = useCallback(
    (id: string) => {
      if (localFavIds.has(id)) return true;
      return (favouriteRestaurantsList || []).some(
        (f: any) => f.id === id || f.restaurantId === id
      );
    },
    [favouriteRestaurantsList, localFavIds]
  );

  const handleToggleFav = (item: { id: string; name: string }) => {
    setLocalFavIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });

    const matchingRest = allRestaurants.find(
      r => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase()
    );
    if (matchingRest) {
      toggleFavourite(matchingRest.id);
    } else {
      toggleFavourite(item.id);
    }
  };

  const handleCardPress = (item: { id: string; name: string }) => {
    if (onNavigateToRestaurant) {
      const matchingRest = allRestaurants.find(
        r => r.id === item.id || r.name.toLowerCase() === item.name.toLowerCase()
      );
      if (matchingRest) {
        onNavigateToRestaurant(matchingRest.id);
      } else if (allRestaurants.length > 0) {
        onNavigateToRestaurant(allRestaurants[0].id);
      } else {
        onNavigateToRestaurant(item.id);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── TOP FLOATING HEADER ── */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerLeftWrap}>
          {/* Gold Border Circular Back Button */}
          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.8}
            onPress={onBack}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#DEA430" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Get Free Treat</Text>
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
        {/* ── HERO BANNER: GET A FREE TREAT ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageWrapper}>
            <Image
              source={freeTreatFullBannerImg}
              style={styles.heroFullBannerImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── BUY ONE, GET ONE BANNER CARD ── */}
        <View style={styles.bogoCard}>
          <Text style={styles.bogoCardSparkleTop}>✦</Text>
          <Text style={styles.bogoCardSparkleBottom}>✦</Text>

          <View style={styles.bogoLeftCol}>
            <Text style={styles.bogoTitle}>Buy One, Get One</Text>
            <Text style={styles.bogoSubtitle}>Enjoy double the delights!</Text>

            <TouchableOpacity
              style={styles.bogoArrowBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (EXPLORE_RESTAURANTS.length > 0 && onNavigateToRestaurant) {
                  handleCardPress(EXPLORE_RESTAURANTS[0]);
                }
              }}
            >
              <ArrowRight size={14} color="#DEA430" />
            </TouchableOpacity>
          </View>

          <View style={styles.bogoRightCol}>
            <Image
              source={bogoTwinBurgersImg}
              style={styles.bogoBurgersImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── SECTION: RESTAURANTS TO EXPLORE ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Restaurants to explore</Text>
        </View>

        {/* ── FILTERS & SORT BY ROW ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          <TouchableOpacity style={styles.filterPillBtn} activeOpacity={0.8}>
            <SlidersHorizontal size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.filterPillText}>Filter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterPillBtn} activeOpacity={0.8}>
            <Text style={styles.filterPillText}>Sort By</Text>
            <ChevronDown size={12} color="#8E8E8E" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterPillBtn} activeOpacity={0.8}>
            <Text style={styles.filterPillText}>Bolt ⚡ Food in 15 mins</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterPillBtn} activeOpacity={0.8}>
            <Text style={styles.filterPillText}>Veg</Text>
            <ChevronDown size={12} color="#8E8E8E" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </ScrollView>

        {/* ── RESTAURANTS TO EXPLORE LIST ── */}
        <View style={styles.restaurantsListContainer}>
          {EXPLORE_RESTAURANTS.map((item) => {
            const fav = isFavorite(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.restaurantCard}
                activeOpacity={0.92}
                onPress={() => handleCardPress(item)}
              >
                {/* Left Thumbnail with Badge Overlay */}
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: item.image }} style={styles.thumbImg} />

                  {/* Favorite Heart Button */}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFav(item);
                    }}
                  >
                    <Heart
                      size={15}
                      color={fav ? '#FF4343' : '#DEA430'}
                      fill={fav ? '#FF4343' : 'transparent'}
                    />
                  </TouchableOpacity>

                  {/* Bottom Discount Overlay */}
                  <View style={styles.discountBadgeOverlay}>
                    <Text style={styles.discountBadgeTitle}>{item.discount}</Text>
                    <Text style={styles.discountBadgeSub}>{item.subDiscount} | AD</Text>
                  </View>
                </View>

                {/* Right Information Details */}
                <View style={styles.infoCol}>
                  {/* Optional Medal Tag */}
                  {item.tag && (
                    <View style={styles.medalTagRow}>
                      <Text style={styles.medalIcon}>🎖️</Text>
                      <Text style={styles.medalTagText}>{item.tag}</Text>
                    </View>
                  )}

                  <View style={styles.restTitleRow}>
                    <Text style={styles.restName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity style={styles.menuMoreBtn} activeOpacity={0.8}>
                      <MoreVertical size={16} color="#8E8E8E" />
                    </TouchableOpacity>
                  </View>

                  {/* Rating with Gold Star Circle */}
                  <View style={styles.ratingRow}>
                    <View style={styles.goldStarCircle}>
                      <Text style={styles.starText}>★</Text>
                    </View>
                    <Text style={styles.ratingValueText}>
                      {item.rating} ({item.ratingCount})
                    </Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>

                  {/* Cuisines */}
                  <Text style={styles.cuisinesText} numberOfLines={1}>
                    {item.cuisines}
                  </Text>

                  {/* Location & Distance */}
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location} • {item.distance}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── SECTION 1: TOP GOURMET OPTIONS ── */}
        <View style={styles.gourmetSection}>
          <Text style={styles.sectionTitleCaps}>TOP GOURMET OPTIONS</Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gourmetScroll}
          >
            {TOP_GOURMET_DATA.map((item) => {
              const fav = isFavorite(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gourmetCard}
                  activeOpacity={0.9}
                  onPress={() => handleCardPress(item)}
                >
                  <View style={styles.gourmetImageWrap}>
                    <Image source={{ uri: item.image }} style={styles.gourmetImg} />

                    {/* Optional Tag badge */}
                    {item.badgeTag && (
                      <View style={styles.gourmetTopTag}>
                        <Text style={styles.gourmetTopTagTitle}>Dum pukht in</Text>
                        <Text style={styles.gourmetTopTagSub}>Nawabi Andaaz</Text>
                      </View>
                    )}

                    {/* Favorite Heart Button */}
                    <TouchableOpacity
                      style={styles.gourmetHeartBtn}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleFav(item);
                      }}
                    >
                      <Heart
                        size={13}
                        color={fav ? '#FF4343' : '#DEA430'}
                        fill={fav ? '#FF4343' : 'transparent'}
                      />
                    </TouchableOpacity>

                    {/* Bottom Discount Overlay */}
                    <View style={styles.gourmetBadgeOverlay}>
                      <Text style={styles.gourmetDiscountTitle}>{item.discount}</Text>
                      <Text style={styles.gourmetSubDiscount}>{item.subDiscount}</Text>
                    </View>
                  </View>

                  <Text style={styles.gourmetName} numberOfLines={1}>
                    {item.name}
                  </Text>

                  <View style={styles.gourmetMetaRow}>
                    <Text style={styles.gourmetStar}>★</Text>
                    <Text style={styles.gourmetMetaText}>
                      {item.rating} • {item.time}
                    </Text>
                  </View>

                  <Text style={styles.gourmetCuisines} numberOfLines={1}>
                    {item.cuisines}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Pagination Slider Indicator */}
          <View style={styles.paginationRow}>
            <View style={styles.paginationActiveBar} />
            <View style={styles.paginationInactiveBar} />
          </View>
        </View>

        {/* ── SECTION 2: FLAT DEAL / FEATURED RESTAURANTS LIST ── */}
        <View style={styles.flatDealsContainer}>
          {FLAT_DEAL_RESTAURANTS.map((item) => {
            const fav = isFavorite(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.restaurantCard}
                activeOpacity={0.92}
                onPress={() => handleCardPress(item)}
              >
                {/* Left Thumbnail with Badge Overlay */}
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: item.image }} style={styles.thumbImg} />

                  {/* Favorite Heart Button */}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFav(item);
                    }}
                  >
                    <Heart
                      size={15}
                      color={fav ? '#FF4343' : '#DEA430'}
                      fill={fav ? '#FF4343' : 'transparent'}
                    />
                  </TouchableOpacity>

                  {/* Bottom Discount Overlay if present */}
                  {item.flatDealDiscount && (
                    <View style={styles.flatDealBadgeOverlay}>
                      {item.flatDealText && (
                        <Text style={styles.flatDealTagText}>{item.flatDealText}</Text>
                      )}
                      <Text style={styles.flatDealDiscountAmount}>{item.flatDealDiscount}</Text>
                      {item.flatDealSub && (
                        <Text style={styles.flatDealSubText}>{item.flatDealSub}</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Right Information Details */}
                <View style={styles.infoCol}>
                  {/* EatRight or other Tag */}
                  {item.eatRight && (
                    <View style={styles.eatRightRow}>
                      <Text style={styles.purpleHeart}>💜</Text>
                      <Text style={styles.eatRightText}>EatRight</Text>
                    </View>
                  )}

                  <View style={styles.restTitleRow}>
                    <Text style={styles.restName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity style={styles.menuMoreBtn} activeOpacity={0.8}>
                      <MoreVertical size={16} color="#8E8E8E" />
                    </TouchableOpacity>
                  </View>

                  {/* Rating with Gold Star Circle */}
                  <View style={styles.ratingRow}>
                    <View style={styles.goldStarCircle}>
                      <Text style={styles.starText}>★</Text>
                    </View>
                    <Text style={styles.ratingValueText}>
                      {item.rating} ({item.ratingCount})
                    </Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>

                  {/* Cuisines */}
                  <Text style={styles.cuisinesText} numberOfLines={1}>
                    {item.cuisines}
                  </Text>

                  {/* Location & Distance */}
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location} • {item.distance}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
    paddingBottom: 4,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  headerLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    color: '#FFFFFF',
    marginLeft: 14,
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
    marginTop: -8,
    position: 'relative',
    overflow: 'visible',
  },
  heroImageWrapper: {
    width: SCREEN_WIDTH - 12,
    maxWidth: 440,
    height: (SCREEN_WIDTH - 12) * 0.70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFullBannerImage: {
    width: '100%',
    height: '100%',
  },

  // ── BUY ONE, GET ONE BANNER ──
  bogoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    backgroundColor: '#0C0A06',
    borderWidth: 1.2,
    borderColor: '#DEA430',
    borderRadius: 20,
    padding: 16,
    marginTop: -38,
    zIndex: 10,
    position: 'relative',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  bogoCardSparkleTop: {
    position: 'absolute',
    top: 10,
    right: 14,
    color: '#DEA430',
    fontSize: 14,
  },
  bogoCardSparkleBottom: {
    position: 'absolute',
    bottom: 12,
    left: '48%',
    color: '#DEA430',
    fontSize: 12,
  },
  bogoLeftCol: {
    flex: 1,
    paddingRight: 8,
  },
  bogoTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18.5,
    color: '#FFFFFF',
  },
  bogoSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#9E9E9E',
    marginTop: 4,
  },
  bogoArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161410',
    borderWidth: 1,
    borderColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  bogoRightCol: {
    width: 150,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bogoBurgersImg: {
    width: '100%',
    height: '100%',
  },

  // ── SECTION: RESTAURANTS TO EXPLORE ──
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── FILTERS ROW ──
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
    height: 38,
  },
  filterPillBtn: {
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
  filterPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  // ── RESTAURANTS LIST CONTAINER ──
  restaurantsListContainer: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 8,
  },

  // ── SECTION 1: TOP GOURMET OPTIONS ──
  gourmetSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitleCaps: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    color: '#FFFFFF',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  gourmetScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  gourmetCard: {
    width: 145,
  },
  gourmetImageWrap: {
    width: 145,
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  gourmetImg: {
    width: '100%',
    height: '100%',
  },
  gourmetTopTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  gourmetTopTagTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    color: '#DEA430',
  },
  gourmetTopTagSub: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 8.5,
    color: '#DEA430',
  },
  gourmetHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  gourmetBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gourmetDiscountTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  gourmetSubDiscount: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  gourmetName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
    marginTop: 8,
  },
  gourmetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  gourmetStar: {
    color: '#DEA430',
    fontSize: 11,
    marginRight: 4,
  },
  gourmetMetaText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11,
    color: '#B0B0B0',
  },
  gourmetCuisines: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#7A7A7A',
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  paginationActiveBar: {
    width: 28,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#DEA430',
  },
  paginationInactiveBar: {
    width: 28,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#262626',
  },

  // ── SECTION 2: FLAT DEAL LIST ──
  flatDealsContainer: {
    paddingHorizontal: 16,
    gap: 16,
    marginTop: 12,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#0C0C0C',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#191919',
  },
  thumbWrap: {
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  flatDealBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  flatDealTagText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9,
    color: '#DEA430',
    letterSpacing: 0.5,
  },
  flatDealDiscountAmount: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 18,
    marginTop: 1,
  },
  flatDealSubText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8.5,
    color: '#DEA430',
    marginTop: 1,
  },

  discountBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 6,
    paddingVertical: 3.5,
  },
  discountBadgeTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 10.5,
    color: '#DEA430',
  },
  discountBadgeSub: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8,
    color: '#FFFFFF',
  },

  // Info Column
  infoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  medalTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  medalIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  medalTagText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#DEA430',
  },
  eatRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  purpleHeart: {
    fontSize: 12,
    marginRight: 4,
  },
  eatRightText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  restTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 6,
  },
  menuMoreBtn: {
    padding: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  goldStarCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  starText: {
    color: '#000000',
    fontSize: 8.5,
    fontWeight: 'bold',
    marginTop: -1,
  },
  ratingValueText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11,
    color: '#D0D0D0',
  },
  dotSeparator: {
    fontSize: 9,
    color: '#6E6E6E',
    marginHorizontal: 3,
  },
  timeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#9E9E9E',
  },
  cuisinesText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 3,
  },
  locationText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 2,
  },
});
