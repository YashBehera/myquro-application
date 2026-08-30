/**
 * DiningCategoryScreen.tsx — MyQuro Customer App
 * 
 * Pixel-by-pixel implementation of "What's on your mind?" category pages:
 * 1. CAFES & COFFEE ("The Art Of Slowing Down" — Fresh coffee paired with tasty bites)
 * 2. FAMILY FRIENDLY ("For All Ages, All Smiles" — Smiles guaranteed)
 * 3. BUDGET FRIENDLY ("More food, less math" — Comfort food that comforts your pocket)
 * 4. LUXURY DINING ("Indulge at the finest spots" — Discover the art of fine dining)
 * 5. ROOFTOP & OUTDOORS ("Under the Open Sky" — Breeze served on the side)
 * 6. PURE VEG ("100% Veg Goodness" — All veg, all heart)
 * 7. NIGHTLIFE & DRINKS ("Raise Your Spirits" — Where the night comes alive)
 * 8. BUFFETS ("Unlimited Delights" — Indulge. savour. cherish)
 * 
 * Features:
 * - Floating gold circular back and search buttons
 * - High-definition transparent 3D hero image with glowing lighting effects
 * - Horizontal filter pills (Filter, Sort By, Available Today, Available Tomorrow)
 * - Wide promo cards with yellow ribbon discount badges & circular gold arrow CTAs
 * - Detailed restaurant cards with rating stars, AD badges, table booking pills, and bank offers
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  Heart,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  MapPin,
  Calendar,
  Percent,
} from 'lucide-react-native';
import { useViewModel } from '../state/MainViewModel';
import { SCREEN_WIDTH } from '../utils/responsive';

// ── 8 Transparent Category Hero Images ──
const heroCafesImg     = require('../assets/dineout/cat_hero_cafes.png');
const heroFamilyImg    = require('../assets/dineout/cat_hero_family.png');
const heroBudgetImg    = require('../assets/dineout/cat_hero_budget.png');
const heroLuxuryImg    = require('../assets/dineout/cat_hero_luxury.png');
const heroRooftopImg   = require('../assets/dineout/cat_hero_rooftop.png');
const heroPureVegImg   = require('../assets/dineout/cat_hero_pureveg.png');
const heroNightlifeImg = require('../assets/dineout/cat_hero_nightlife.png');
const heroBuffetsImg   = require('../assets/dineout/cat_hero_buffets.png');

export type DiningMoodKey =
  | 'CAFE'
  | 'FAMILY'
  | 'BUDGET'
  | 'LUXURY'
  | 'ROOFTOP'
  | 'PURE_VEG'
  | 'NIGHTLIFE'
  | 'BUFFET'
  | 'ALL';

interface DiningCategoryScreenProps {
  moodKey: DiningMoodKey;
  onBack: () => void;
  onNavigateToRestaurant: (id: string) => void;
  onNavigateToSearch?: () => void;
  onBookTable?: (venue: any) => void;
}

interface DiningCardItem {
  id: string;
  name: string;
  location: string;
  image: any;
  cardType: 'wide-promo' | 'detailed';
  discountTag?: string;
  rating?: number;
  cuisines?: string;
  priceForTwo?: string;
  isAd?: boolean;
  tableBookingAvailable?: boolean;
  bankOffers?: string[];
}

interface CategoryConfig {
  title: string;
  heroImage: any;
  aspectRatio: number;
}

const CATEGORY_CONFIG: Record<DiningMoodKey, CategoryConfig> = {
  CAFE: {
    title: 'Cafes',
    heroImage: heroCafesImg,
    aspectRatio: 1.777,
  },
  FAMILY: {
    title: 'Family Friendly',
    heroImage: heroFamilyImg,
    aspectRatio: 1.5,
  },
  BUDGET: {
    title: 'Budget Friendly',
    heroImage: heroBudgetImg,
    aspectRatio: 1.5,
  },
  LUXURY: {
    title: 'Luxury Dining',
    heroImage: heroLuxuryImg,
    aspectRatio: 1.779,
  },
  ROOFTOP: {
    title: 'Rooftop Places',
    heroImage: heroRooftopImg,
    aspectRatio: 1.5,
  },
  PURE_VEG: {
    title: 'Pure Veg',
    heroImage: heroPureVegImg,
    aspectRatio: 1.5,
  },
  NIGHTLIFE: {
    title: 'Nightlife & Drinks',
    heroImage: heroNightlifeImg,
    aspectRatio: 1.5,
  },
  BUFFET: {
    title: 'Buffets',
    heroImage: heroBuffetsImg,
    aspectRatio: 1.5,
  },
  ALL: {
    title: 'Explore Restaurants',
    heroImage: heroBudgetImg,
    aspectRatio: 1.5,
  },
};

export const DiningCategoryScreen: React.FC<DiningCategoryScreenProps> = ({
  moodKey,
  onBack,
  onNavigateToRestaurant,
  onNavigateToSearch,
  onBookTable,
}) => {
  const insets = useSafeAreaInsets();
  const { allRestaurants, favouriteRestaurantsList, toggleFavourite } = useViewModel();

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [localFavIds, setLocalFavIds] = useState<Set<string>>(new Set());

  const config = CATEGORY_CONFIG[moodKey] || CATEGORY_CONFIG.ALL;

  // Dynamically compute real restaurants based on selected moodKey and active filters
  const dynamicRestaurants: DiningCardItem[] = React.useMemo(() => {
    if (!allRestaurants || allRestaurants.length === 0) {
      return [];
    }

    // Filter by moodKey
    let filtered = allRestaurants.filter((r) => {
      const cat = (r.category || '').toLowerCase();
      const cuisine = (r.cuisine || '').toLowerCase();
      const dishesCat = (r.dishesCategory || '').toLowerCase();
      const tags = (r.tags || []).map((t: string) => t.toLowerCase()).join(' ');
      const desc = (r.description || '').toLowerCase();
      const allText = `${cat} ${cuisine} ${dishesCat} ${tags} ${desc}`;

      switch (moodKey) {
        case 'CAFE':
          return (
            allText.includes('cafe') ||
            allText.includes('coffee') ||
            allText.includes('bakery') ||
            allText.includes('dessert') ||
            allText.includes('tea') ||
            allText.includes('beverage')
          );
        case 'FAMILY':
          return (
            allText.includes('family') ||
            allText.includes('north indian') ||
            allText.includes('thali') ||
            allText.includes('biryani') ||
            allText.includes('indian') ||
            allText.includes('multi')
          );
        case 'BUDGET':
          return (
            allText.includes('street') ||
            allText.includes('fast food') ||
            allText.includes('rolls') ||
            allText.includes('budget') ||
            (r.offer && (r.offer.includes('400') || r.offer.includes('500') || r.offer.includes('300') || r.offer.includes('200')))
          );
        case 'LUXURY':
          return (
            allText.includes('fine') ||
            allText.includes('luxury') ||
            allText.includes('lounge') ||
            (typeof r.rating === 'number' && r.rating >= 4.3)
          );
        case 'ROOFTOP':
          return (
            allText.includes('rooftop') ||
            allText.includes('sky') ||
            allText.includes('lounge') ||
            allText.includes('outdoor') ||
            allText.includes('terrace')
          );
        case 'PURE_VEG':
          return (
            r.category === 'Veg' ||
            allText.includes('pure veg') ||
            allText.includes('vegetarian') ||
            allText.includes('jain')
          );
        case 'NIGHTLIFE':
          return (
            allText.includes('nightlife') ||
            allText.includes('bar') ||
            allText.includes('pub') ||
            allText.includes('club') ||
            allText.includes('brewery') ||
            allText.includes('drinks')
          );
        case 'BUFFET':
          return (
            allText.includes('buffet') ||
            allText.includes('unlimited') ||
            allText.includes('barbeque') ||
            allText.includes('grill') ||
            allText.includes('bbq')
          );
        case 'ALL':
        default:
          return true;
      }
    });

    // If no specific match found for a niche category, show all active restaurants
    if (filtered.length === 0) {
      filtered = allRestaurants;
    }

    // Apply secondary filter
    if (selectedFilter === 'today' || selectedFilter === 'tomorrow') {
      filtered = filtered.filter((r) => !r.isClosed);
    } else if (selectedFilter === 'sort') {
      filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return filtered.map((r, index) => {
      const cardType: 'wide-promo' | 'detailed' = index % 3 === 0 ? 'wide-promo' : 'detailed';
      const imgUri =
        typeof r.image === 'string'
          ? r.image
          : (r.image as any)?.uri ||
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80';
      const distStr =
        typeof r.distance === 'number' && !isNaN(r.distance) ? `${r.distance.toFixed(1)} km` : '';
      const locStr = r.address ? `${r.address}${distStr ? `, ${distStr}` : ''}` : (r.city || 'Bhubaneswar');

      return {
        id: r.id,
        name: r.name,
        location: locStr,
        image: imgUri,
        cardType,
        discountTag: r.discount || (index % 2 === 0 ? 'UP TO 20% OFF' : 'FLAT 15% OFF'),
        rating: typeof r.rating === 'number' && r.rating > 0 ? r.rating : 4.5,
        cuisines: r.cuisine || r.category || 'Multi-Cuisine',
        priceForTwo: r.offer ? `₹${r.offer} for two` : '₹800 for two',
        isAd: index === 1,
        tableBookingAvailable: true,
        bankOffers: [
          'Up to 10% off with bank cards',
          'Get extra ₹75 off with UPI',
        ],
      };
    });
  }, [allRestaurants, moodKey, selectedFilter]);

  const isFavorite = useCallback(
    (id: string) => {
      if (localFavIds.has(id)) return true;
      return (favouriteRestaurantsList || []).some(
        (f: any) => f.id === id || f.restaurantId === id
      );
    },
    [favouriteRestaurantsList, localFavIds]
  );

  const handleToggleFav = (item: DiningCardItem) => {
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

  const handleRestaurantPress = (item: DiningCardItem) => {
    onNavigateToRestaurant(item.id);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={true} />

      {/* ── TOP FLOATING BACK & SEARCH BUTTONS OVERLAY ── */}
      <View style={[styles.floatingHeader, { top: Math.max(insets.top, 14) }]}>
        <TouchableOpacity
          style={styles.circleBtn}
          activeOpacity={0.8}
          onPress={onBack}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color="#DEA430" />
        </TouchableOpacity>

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
        {/* ── HIGH-DEFINITION TRANSPARENT 3D HERO IMAGE ── */}
        <View
          style={[
            styles.heroImageContainer,
            {
              paddingTop: Math.max(insets.top, 14) + 38,
              height: SCREEN_WIDTH / config.aspectRatio + Math.max(insets.top, 14) + 20,
            },
          ]}
        >
          <Image
            source={config.heroImage}
            style={styles.heroTransparentImage}
            resizeMode="contain"
          />
        </View>

        {/* ── HORIZONTAL FILTER PILLS ROW ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          <TouchableOpacity
            style={[styles.filterPillBtn, selectedFilter === 'filter' && styles.filterPillActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedFilter(selectedFilter === 'filter' ? 'all' : 'filter')}
          >
            <Text style={styles.filterPillText}>Filter</Text>
            <SlidersHorizontal size={13} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPillBtn, selectedFilter === 'sort' && styles.filterPillActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedFilter(selectedFilter === 'sort' ? 'all' : 'sort')}
          >
            <Text style={styles.filterPillText}>Sort By</Text>
            <ChevronDown size={13} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPillBtn, selectedFilter === 'today' && styles.filterPillActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedFilter(selectedFilter === 'today' ? 'all' : 'today')}
          >
            <Text style={styles.filterPillText}>Available Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPillBtn, selectedFilter === 'tomorrow' && styles.filterPillActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedFilter(selectedFilter === 'tomorrow' ? 'all' : 'tomorrow')}
          >
            <Text style={styles.filterPillText}>Available Tomorrow</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── RESTAURANT CARDS LIST ── */}
        <View style={styles.cardsContainer}>
          {dynamicRestaurants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Restaurants Found</Text>
              <Text style={styles.emptySubtitle}>
                No live restaurants currently match this dining mood.
              </Text>
            </View>
          ) : (
            dynamicRestaurants.map((item) => {
            const fav = isFavorite(item.id);

            // TYPE A: WIDE PROMO CARD (e.g. Zouk Restro Sky Lounge, Starlit, Kake Di Hatti)
            if (item.cardType === 'wide-promo') {
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.widePromoCard}
                  activeOpacity={0.92}
                  onPress={() => handleRestaurantPress(item)}
                >
                  <Image
                    source={typeof item.image === 'string' ? { uri: item.image } : item.image}
                    style={styles.widePromoImage}
                    resizeMode="cover"
                  />

                  {/* Top Yellow Ribbon Badge */}
                  {item.discountTag && (
                    <View style={styles.yellowRibbonBadge}>
                      <Percent size={11} color="#000000" style={{ marginRight: 4 }} />
                      <Text style={styles.yellowRibbonText}>{item.discountTag}</Text>
                    </View>
                  )}

                  {/* Favorite Heart Button */}
                  <TouchableOpacity
                    style={styles.wideHeartBtn}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFav(item);
                    }}
                  >
                    <Heart
                      size={18}
                      color={fav ? '#FF4343' : '#FFFFFF'}
                      fill={fav ? '#FF4343' : 'transparent'}
                    />
                  </TouchableOpacity>

                  {/* Bottom Dark Overlay Content */}
                  <View style={styles.wideBottomOverlay}>
                    <View style={styles.wideInfoLeft}>
                      <Text style={styles.wideRestName}>{item.name}</Text>
                      <View style={styles.wideLocationRow}>
                        <MapPin size={12} color="#DEA430" style={{ marginRight: 4 }} />
                        <Text style={styles.wideLocationText}>{item.location}</Text>
                      </View>
                    </View>

                    {/* Circular Gold Arrow CTA Button */}
                    <TouchableOpacity
                      style={styles.circleArrowCTA}
                      activeOpacity={0.8}
                      onPress={() => handleRestaurantPress(item)}
                    >
                      <ArrowRight size={16} color="#DEA430" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }

            // TYPE B: DETAILED CARD (e.g. Tea Pot – Mayfair Lagoon, Kebabs and Kurries, Barbeque Nation)
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.detailedCard}
                activeOpacity={0.92}
                onPress={() => handleRestaurantPress(item)}
              >
                {/* Top Image Box */}
                <View style={styles.detailedImageWrap}>
                  <Image
                    source={typeof item.image === 'string' ? { uri: item.image } : item.image}
                    style={styles.detailedImg}
                    resizeMode="cover"
                  />

                  {/* AD Badge */}
                  {item.isAd && (
                    <View style={styles.adBadgeWrap}>
                      <Text style={styles.adBadgeText}>AD</Text>
                    </View>
                  )}

                  {/* Favorite Heart Button */}
                  <TouchableOpacity
                    style={styles.detailedHeartBtn}
                    activeOpacity={0.8}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFav(item);
                    }}
                  >
                    <Heart
                      size={18}
                      color={fav ? '#FF4343' : '#FFFFFF'}
                      fill={fav ? '#FF4343' : 'transparent'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Bottom Details Section */}
                <View style={styles.detailedInfoBox}>
                  {/* Restaurant Title & Star Rating */}
                  <View style={styles.detailedTitleRow}>
                    <Text style={styles.detailedName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    {item.rating && (
                      <View style={styles.goldRatingPill}>
                        <Text style={styles.goldRatingStar}>★</Text>
                        <Text style={styles.goldRatingValue}>{item.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Location */}
                  <View style={styles.detailedLocRow}>
                    <MapPin size={12} color="#DEA430" style={{ marginRight: 4 }} />
                    <Text style={styles.detailedLocText}>{item.location}</Text>
                  </View>

                  {/* Cuisines & Price for Two */}
                  {item.cuisines && (
                    <Text style={styles.detailedCuisinesText} numberOfLines={1}>
                      {item.cuisines} {item.priceForTwo ? `• ${item.priceForTwo}` : ''}
                    </Text>
                  )}

                  {/* Table Booking Pill */}
                  {item.tableBookingAvailable && (
                    <TouchableOpacity
                      style={styles.tableBookingPill}
                      activeOpacity={0.85}
                      onPress={() => onBookTable && onBookTable(item)}
                    >
                      <Calendar size={13} color="#DEA430" style={{ marginRight: 6 }} />
                      <Text style={styles.tableBookingPillText}>Table booking</Text>
                    </TouchableOpacity>
                  )}

                  {/* Bank Offers */}
                  {item.bankOffers && item.bankOffers.length > 0 && (
                    <View style={styles.bankOffersWrap}>
                      {item.bankOffers.map((offer, idx) => (
                        <View key={idx} style={styles.bankOfferRow}>
                          <Text style={styles.bankOfferIcon}>🏷</Text>
                          <Text style={styles.bankOfferText}>{offer}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        </View>

        {/* Bottom spacer */}
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

  // ── FLOATING TOP HEADER ──
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
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
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ── 3D HERO TRANSPARENT IMAGE ──
  heroImageContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
  },
  heroTransparentImage: {
    width: '100%',
    height: '100%',
  },

  // ── FILTERS ROW ──
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 10,
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
  filterPillActive: {
    borderColor: '#DEA430',
    backgroundColor: '#1A160F',
  },
  filterPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ── CARDS CONTAINER ──
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 18,
  },

  // ── TYPE A: WIDE PROMO CARD ──
  widePromoCard: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#241F16',
  },
  widePromoImage: {
    width: '100%',
    height: '100%',
  },
  yellowRibbonBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEA430',
    borderBottomRightRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    zIndex: 5,
  },
  yellowRibbonText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 10.5,
    color: '#000000',
    letterSpacing: 0.4,
  },
  wideHeartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  wideBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wideInfoLeft: {
    flex: 1,
    paddingRight: 10,
  },
  wideRestName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  wideLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  wideLocationText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#BEBEBE',
  },
  circleArrowCTA: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181510',
    borderWidth: 1.2,
    borderColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── TYPE B: DETAILED CARD ──
  detailedCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0C0A07',
    borderWidth: 1,
    borderColor: '#241F16',
  },
  detailedImageWrap: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#161616',
  },
  detailedImg: {
    width: '100%',
    height: '100%',
  },
  adBadgeWrap: {
    position: 'absolute',
    top: 12,
    right: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    color: '#D0D0D0',
  },
  detailedHeartBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  detailedInfoBox: {
    padding: 14,
  },
  detailedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailedName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 8,
  },
  goldRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1912',
    borderWidth: 1,
    borderColor: '#382E18',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  goldRatingStar: {
    color: '#DEA430',
    fontSize: 11,
    marginRight: 3,
  },
  goldRatingValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  detailedLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailedLocText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#9E9E9E',
  },
  detailedCuisinesText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#7E7E7E',
    marginTop: 3,
  },
  tableBookingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#14110A',
    borderWidth: 1,
    borderColor: '#DEA430',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  tableBookingPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#DEA430',
  },
  bankOffersWrap: {
    marginTop: 10,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#1A1712',
    paddingTop: 8,
  },
  bankOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankOfferIcon: {
    fontSize: 11,
    marginRight: 6,
  },
  bankOfferText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11.5,
    color: '#BDBDBD',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    color: '#DEA430',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 14,
    color: '#8E8E8E',
    textAlign: 'center',
  },
});
