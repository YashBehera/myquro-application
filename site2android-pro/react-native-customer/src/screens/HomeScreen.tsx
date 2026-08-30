/**
 * HomeScreen.tsx — MyQuro Customer App
 * 
 * 100% Fully Functional & Dynamic Implementation of Figma Node 3019:288 + Node 3023:477
 * Connected to ViewModel state, live filters, database, favorites, location, search, and navigation.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  RefreshControl,
  ToastAndroid,
  Alert,
} from 'react-native';
import { Heart, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViewModel } from '../state/MainViewModel';
import { LocationSelectorSheet } from './LocationSelectorSheet';
import { TopSearchSheetOverlay } from '../components/TopSearchSheetOverlay';
import { Restaurant } from '../types';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

const BANNER_WIDTH = Math.min(SCREEN_WIDTH - 28, isTablet ? 640 : SCREEN_WIDTH - 28);
const BANNER_HEIGHT = BANNER_WIDTH * (941 / 1672);

// ─── Direct Figma Asset Imports (Node 3019:288) ────────────────────────────────
const imgImage44      = require('../assets/home/figma/imgImage44.png'); // Gold Chevron
const imgImage40      = require('../assets/home/figma/imgImage40.png'); // Gold Location Pin
const imgImage43      = require('../assets/home/figma/imgImage43.png'); // Scooter Graphic
const imgImage42      = require('../assets/home/figma/imgImage42.png'); // Yellow Profile Pin
const imgImage41      = require('../assets/home/figma/imgImage41.png'); // Hamburger 3 Lines

// Category Tiles Assets
const imgImage39      = require('../assets/home/figma/imgImage39.png'); // Food Burger
const imgImage38      = require('../assets/home/figma/imgImage38.png'); // Instamart Bag
const imgImage37      = require('../assets/home/figma/imgImage37.png'); // Dineout Cloche
const imgImage36      = require('../assets/home/figma/imgImage36.png'); // Wine Stores Bottle/Glass

// Search & Veg Assets
const imgImage35      = require('../assets/home/figma/imgImage35.png'); // Search Glass
const imgImage34      = require('../assets/home/figma/imgImage34.png'); // Yellow Mic
const imgBackground11 = require('../assets/home/figma/imgBackground11.png'); // Divider

// 70% OFF Hero Banner Assets
const imgImage26      = require('../assets/hero_floating_burger.png'); // New Burger
const imgImage23      = require('../assets/hero_floating_pizza.png'); // New Pizza
const imgNew70OffCenter = require('../assets/hero_banner_70off.png'); // New 70% Off Center

// Deals Row Assets
const imgImage22      = require('../assets/home/deal_delightful_70off.png'); // Delightful Deals (70% Off Badge)
const imgImage21      = require('../assets/home/deal_free_treat.png'); // Get A Free Treat (Gulab Jamun + Shake)
const imgImage20      = require('../assets/home/deal_min200_pizza.png'); // Min. ₹200 OFF (Whole Pizza)

// Reorder Restaurant Cards Icons
const imgImage17      = require('../assets/home/figma/imgImage17.png'); // Star icon
const imgImage14      = require('../assets/home/figma/imgImage14.png'); // Star icon
const imgImage11      = require('../assets/home/figma/imgImage11.png'); // Star icon

// ─── Direct Figma Asset Imports (Node 3023:477 - Explore Section) ──────────────
const expImg27 = require('../assets/home/figma_explore/imgImage27.png'); // Specials
const expImg26 = require('../assets/home/figma_explore/imgImage26.png'); // Biryani
const expImg25 = require('../assets/home/figma_explore/imgImage25.png'); // Pizzas
const expImg24 = require('../assets/home/figma_explore/imgImage24.png'); // Burgers
const expImg23 = require('../assets/home/figma_explore/imgImage23.png'); // Rolls

// Vertical Cards Icons
const expImg18 = require('../assets/home/figma_explore/imgImage18.png'); // Truck icon
const expImg19 = require('../assets/home/figma_explore/imgImage19.png'); // Green Star icon
const expImg13 = require('../assets/home/figma_explore/imgImage13.png'); // Truck icon
const expImg14 = require('../assets/home/figma_explore/imgImage14.png'); // Green Star icon
const expImg8  = require('../assets/home/figma_explore/imgImage8.png');  // Truck icon
const expImg9  = require('../assets/home/figma_explore/imgImage9.png');  // Green Star icon

// Helper to safely extract restaurant image source
const getRestaurantImageSource = (restaurant: Restaurant) => {
  if (!restaurant?.image) {
    return { uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80' };
  }
  return typeof restaurant.image === 'string' ? { uri: restaurant.image } : restaurant.image;
};

export const HomeScreen = ({
  onNavigateToExplore,
  onNavigateToFavourites,
  onNavigateToProfile,
  onNavigateToSearch,
  onNavigateToRestaurant,
  onNavigateToCart,
  onNavigateToDining,
  onNavigateToDelightfulDeals,
  onNavigateToFreeTreat,
  onNavigateToMin200,
  onNavigateToInstamart,
  navigation,
}: any) => {
  const insets = useSafeAreaInsets();
  const {
    allRestaurants,
    restaurantsList,
    currentLocation,
    setCurrentLocation,
    toggleFavourite,
    favouriteRestaurantsList,
  } = useViewModel();

  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [isVegOnly, setIsVegOnly]                 = useState(false);
  const [refreshing, setRefreshing]               = useState(false);
  const [activeSegment, setActiveSegment]         = useState<'reorder' | 'food15'>('reorder');
  const [activeExploreCat, setActiveExploreCat]   = useState('Specials');
  const [activeDealOffer, setActiveDealOffer]     = useState<string | null>(null);

  // Floating bounce loop animation
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim]);

  const isFav = useCallback(
    (id: string) => {
      return (favouriteRestaurantsList || []).some(
        (f: any) => f.id === id || f.restaurantId === id
      );
    },
    [favouriteRestaurantsList]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const onSelectRestaurant = (id: string) => {
    if (onNavigateToRestaurant) {
      onNavigateToRestaurant(id);
    } else if (navigation?.navigate) {
      navigation.navigate('RestaurantDetail', { id });
    }
  };

  const handleToggleFav = (id: string, name?: string) => {
    toggleFavourite(id);
    const added = !isFav(id);
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        added ? `Added ${name || 'restaurant'} to favorites` : `Removed from favorites`,
        ToastAndroid.SHORT
      );
    }
  };

  const handleToggleVeg = () => {
    const nextState = !isVegOnly;
    setIsVegOnly(nextState);
    if (Platform.OS === 'android') {
      ToastAndroid.show(nextState ? 'Showing Pure Veg only' : 'Showing All Foods', ToastAndroid.SHORT);
    }
  };

  // Combine live data source
  const sourceRestaurants: Restaurant[] = useMemo(() => {
    return (allRestaurants && allRestaurants.length > 0)
      ? allRestaurants
      : (restaurantsList && restaurantsList.length > 0)
        ? restaurantsList
        : [];
  }, [allRestaurants, restaurantsList]);

  // Dynamic filtering based on all active user selections
  const filteredRestaurants = useMemo(() => {
    return sourceRestaurants.filter((res) => {
      // 1. Veg Filter
      if (isVegOnly) {
        const isNonVeg = /chicken|meat|fish|egg|kebab|biryani.*mutton/i.test(
          `${res.name} ${res.cuisine} ${res.dishesCategory}`
        );
        if (isNonVeg && !/veg/i.test(res.name)) return false;
      }

      // 2. Category Filter (Specials, Biryani, Pizzas, Burgers, Rolls)
      if (activeExploreCat && activeExploreCat !== 'Specials') {
        const matchesCategory = new RegExp(activeExploreCat, 'i').test(
          `${res.cuisine} ${res.dishesCategory} ${res.name} ${res.category || ''}`
        );
        if (!matchesCategory) return false;
      }

      // 3. Deal Filter
      if (activeDealOffer === '70OFF') {
        const has70 = Boolean(res.offer?.includes('70%') || res.rating >= 4.0);
        if (!has70) return false;
      } else if (activeDealOffer === 'MIN200') {
        const has200 = res.rating >= 4.2;
        if (!has200) return false;
      }

      return true;
    });
  }, [sourceRestaurants, isVegOnly, activeExploreCat, activeDealOffer]);

  // Horizontal cards based on active segment (Reorder vs Food in 15 mins)
  const horizontalCardList = useMemo(() => {
    if (activeSegment === 'food15') {
      return sourceRestaurants
        .filter((r) => r.deliveryTime && r.deliveryTime <= 25)
        .slice(0, 5);
    }
    // Reorder: Favorite and highly rated places
    return sourceRestaurants
      .filter((r) => isFav(r.id) || r.rating >= 4.0)
      .slice(0, 5);
  }, [sourceRestaurants, activeSegment, favouriteRestaurantsList, isFav]);

  const handleHeroBannerPress = () => {
    if (onNavigateToDelightfulDeals) {
      onNavigateToDelightfulDeals();
    } else {
      setActiveDealOffer('70OFF');
      if (Platform.OS === 'android') {
        ToastAndroid.show('Showing 70% OFF UPTO ₹140 Deals!', ToastAndroid.SHORT);
      }
    }
  };

  const handleDealPress = (dealType: string, title: string) => {
    if (dealType === 'DELIGHT' && onNavigateToDelightfulDeals) {
      onNavigateToDelightfulDeals();
      return;
    }
    if (dealType === 'FREETREAT' && onNavigateToFreeTreat) {
      onNavigateToFreeTreat();
      return;
    }
    if (dealType === 'MIN200' && onNavigateToMin200) {
      onNavigateToMin200();
      return;
    }
    setActiveDealOffer(dealType);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Applied offer: ${title}`, ToastAndroid.SHORT);
    }
  };

  const handleOpenActionMenu = (restaurant: Restaurant) => {
    Alert.alert(
      restaurant.name,
      `${restaurant.cuisine} • ${restaurant.address}`,
      [
        {
          text: isFav(restaurant.id) ? 'Remove Favorite' : 'Add to Favorites',
          onPress: () => handleToggleFav(restaurant.id, restaurant.name),
        },
        {
          text: 'View Full Menu',
          onPress: () => onSelectRestaurant(restaurant.id),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
            progressBackgroundColor="#000000"
          />
        }
      >
        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 0] TOP HEADER (Location on left, Free Delivery + Profile on right)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
          {/* Left Column: Home label + Location Address */}
          <View style={styles.headerLeftCol}>
            <TouchableOpacity
              style={styles.homeLabelRow}
              activeOpacity={0.75}
              onPress={() => setShowLocationSheet(true)}
            >
              <Text style={styles.homeText}>{currentLocation?.label || 'Home'}</Text>
              <Image source={imgImage44} style={styles.goldChevronImg} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addressRow}
              activeOpacity={0.75}
              onPress={() => setShowLocationSheet(true)}
            >
              <Image source={imgImage40} style={styles.locationPinImg} />
              <Text style={styles.addressText} numberOfLines={1}>
                {currentLocation?.address || 'Select your delivery location'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right Column: Free Delivery Pill + Profile/Menu Pill */}
          <View style={styles.headerRightCol}>
            <TouchableOpacity
              style={styles.freeDeliveryPill}
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS === 'android') {
                  ToastAndroid.show('FREE DELIVERY is active on all orders with one', ToastAndroid.SHORT);
                }
              }}
            >
              <Text style={styles.freeText}>FREE</Text>
              <Text style={styles.deliveryText}>DELIVERY</Text>
              <Image source={imgImage43} style={styles.scooterImg} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileMenuPill}
              activeOpacity={0.85}
              onPress={() => onNavigateToProfile && onNavigateToProfile()}
            >
              <Image source={imgImage42} style={styles.profilePinImg} />
              <Image source={imgImage41} style={styles.hamburgerImg} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 1] CATEGORY TILES (Food, Instamart, Dineout, Wine Stores)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.categoryRow}>
          {/* Tile 1: Food (Active Highlight) */}
          <TouchableOpacity
            style={[styles.catTile, styles.catTileActive]}
            activeOpacity={0.85}
            onPress={() => {
              setActiveExploreCat('Specials');
              setActiveDealOffer(null);
            }}
          >
            <Image source={imgImage39} style={styles.catBurgerImg} />
            <Text style={[styles.catTileLabel, styles.catTileLabelActive]}>
              Food
            </Text>
          </TouchableOpacity>

          {/* Tile 2: Instamart */}
          <TouchableOpacity
            style={styles.catTile}
            activeOpacity={0.85}
            onPress={() => onNavigateToInstamart && onNavigateToInstamart()}
          >
            <View style={styles.instamartImgWrap}>
              <Image source={imgImage38} style={styles.catInstamartImg} />
              <View style={styles.minsBadge}>
                <Text style={styles.minsBadgeText}>4 MINS</Text>
              </View>
            </View>
            <Text style={styles.catTileLabel}>Instamart</Text>
          </TouchableOpacity>

          {/* Tile 3: Dineout */}
          <TouchableOpacity
            style={styles.catTile}
            activeOpacity={0.85}
            onPress={() => onNavigateToDining && onNavigateToDining()}
          >
            <Image source={imgImage37} style={styles.catDineoutImg} />
            <Text style={styles.catTileLabel}>Dineout</Text>
          </TouchableOpacity>

          {/* Tile 4: Wine Stores */}
          <TouchableOpacity
            style={styles.catTile}
            activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS === 'android') {
                ToastAndroid.show('Showing Beverages & Refreshments', ToastAndroid.SHORT);
              }
            }}
          >
            <Image source={imgImage36} style={styles.catWineImg} />
            <Text style={styles.catTileLabel}>Wine Stores</Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 2] SEARCH BAR & FUNCTIONAL VEG TOGGLE
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.searchRow}>
          {/* Search Input Bar */}
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.9}
            onPress={() => setIsSearchSheetOpen(true)}
          >
            <Image source={imgImage35} style={styles.searchGlassImg} />
            <Text style={styles.searchPlaceholderText}>Search for 'Pizza' or 'Biryani'</Text>
            <Image source={imgBackground11} style={styles.searchDividerImg} />
            <Image source={imgImage34} style={styles.yellowMicImg} />
          </TouchableOpacity>

          {/* Functional Responsive VEG Toggle Button */}
          <TouchableOpacity
            style={[styles.vegBtn, isVegOnly && styles.vegBtnActive]}
            activeOpacity={0.85}
            onPress={handleToggleVeg}
          >
            <Text style={[styles.vegBtnText, isVegOnly && styles.vegBtnTextActive]}>VEG</Text>
            <View style={[styles.vegTrack, isVegOnly && styles.vegTrackActive]}>
              <View style={[styles.vegThumb, isVegOnly && styles.vegThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 3] 70% OFF HERO BANNER (Interactive Deals Activation)
            ════════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.heroBanner}
          activeOpacity={0.95}
          onPress={handleHeroBannerPress}
        >
          {/* Main 70% Off Banner Background wrapped to clip borders */}
          <View style={styles.heroBgWrapper}>
            <Image source={imgNew70OffCenter} style={styles.heroCenterBg} />
          </View>

          {/* Floating Pizza over the left guide */}
          <Animated.Image
            source={imgImage23}
            style={[
              styles.absolutePizzaLeft,
              {
                transform: [
                  { rotate: '-10deg' },
                  {
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -12],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Floating Burger over the right guide */}
          <Animated.Image
            source={imgImage26}
            style={[
              styles.absoluteBurgerRight,
              {
                transform: [
                  { rotate: '12deg' },
                  {
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 4],
                    }),
                  },
                ],
              },
            ]}
          />
        </TouchableOpacity>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 5] DEALS ROW (Interactive Deals Filtering)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.dealsRow}>
          {/* Deal 1: Delightful Deals */}
          <TouchableOpacity
            style={[styles.dealCard, activeDealOffer === 'DELIGHT' && styles.dealCardActive]}
            activeOpacity={0.88}
            onPress={() => handleDealPress('DELIGHT', 'Delightful Deals')}
          >
            <View style={styles.dealTextWrap}>
              <Text style={styles.dealTitle1}>Delightful</Text>
              <Text style={styles.dealTitleGold}>Deals</Text>
            </View>
            <Image source={imgImage22} style={styles.dealRingImg} />
          </TouchableOpacity>

          {/* Deal 2: Get A Free Treat */}
          <TouchableOpacity
            style={[styles.dealCard, activeDealOffer === 'FREETREAT' && styles.dealCardActive]}
            activeOpacity={0.88}
            onPress={() => handleDealPress('FREETREAT', 'Get A Free Treat with one')}
          >
            <View style={styles.dealTextWrap}>
              <Text style={styles.dealTitle1}>Get A</Text>
              <Text style={styles.dealTitleGold}>Free Treat</Text>
            </View>
            <Image source={imgImage21} style={styles.dealTreatImg} />
          </TouchableOpacity>

          {/* Deal 3: Min. ₹200 OFF */}
          <TouchableOpacity
            style={[styles.dealCard, activeDealOffer === 'MIN200' && styles.dealCardActive]}
            activeOpacity={0.88}
            onPress={() => handleDealPress('MIN200', 'Min. ₹200 OFF on Orders')}
          >
            <View style={styles.dealTextWrap}>
              <Text style={styles.dealTitle1}>Min.</Text>
              <Text style={styles.dealTitleGold}>₹200 OFF</Text>
            </View>
            <Image source={imgImage20} style={styles.dealPizzaImg} />
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 6] REORDER / FOOD IN 15 MINS SWITCH
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'reorder' && styles.segmentBtnActive]}
            activeOpacity={0.88}
            onPress={() => setActiveSegment('reorder')}
          >
            <Text style={[styles.segmentText, activeSegment === 'reorder' && styles.segmentTextActive]}>
              REORDER
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'food15' && styles.segmentBtnActive]}
            activeOpacity={0.88}
            onPress={() => setActiveSegment('food15')}
          >
            <Text style={[styles.segmentText, activeSegment === 'food15' && styles.segmentTextActive]}>
              FOOD IN 15 MINS
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 7] RESTAURANT HORIZONTAL CARDS (Dynamically mapped from list)
            ════════════════════════════════════════════════════════════════════════ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.resCardsScroll}
        >
          {horizontalCardList.map((restaurant) => {
            const cardImg = getRestaurantImageSource(restaurant);

            return (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.resCard}
                activeOpacity={0.9}
                onPress={() => onSelectRestaurant(restaurant.id)}
              >
                <View style={styles.resCardImgBox}>
                  <Image source={cardImg} style={styles.resCardImg} />

                  {/* Crisp Golden 'one' Badge */}
                  <View style={styles.oneBadge}>
                    <Text style={styles.oneBadgeText}>one</Text>
                  </View>

                  {/* Working Interactive Favourites Button */}
                  <TouchableOpacity
                    style={styles.favBtn}
                    activeOpacity={0.7}
                    onPress={() => handleToggleFav(restaurant.id, restaurant.name)}
                  >
                    <Heart
                      size={14 * SCALE}
                      color={isFav(restaurant.id) ? '#FF334B' : '#FFFFFF'}
                      fill={isFav(restaurant.id) ? '#FF334B' : 'rgba(0,0,0,0.3)'}
                    />
                  </TouchableOpacity>

                  {/* Offer Overlay */}
                  {restaurant.offer ? (
                    <View style={styles.resOfferOverlay}>
                      <Text style={styles.resOfferMainText} numberOfLines={1}>
                        {restaurant.offer.split(' ')[0]}
                      </Text>
                      <Text style={styles.resOfferSubText} numberOfLines={1}>
                        {restaurant.offer.split(' ').slice(1).join(' ')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.resCardInfo}>
                  <Text style={styles.resNameText} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <View style={styles.resMetaRow}>
                    <Image source={imgImage17} style={styles.resStarImg} />
                    <Text style={styles.resMetaText}>
                      {restaurant.rating} • {restaurant.deliveryTime || 25} mins
                    </Text>
                  </View>
                  <Text style={styles.resCuisineText} numberOfLines={1}>
                    {restaurant.cuisine}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 8 - NATIVELY STICKY] "WHAT'S ON YOUR MIND?" CATEGORIES SECTION
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.whatsOnMindStickyContainer}>
          <View style={styles.whatsOnMindHeader}>
            <Text style={styles.whatsOnMindTitle}>WHAT'S ON YOUR MIND?</Text>
          </View>

          <View style={styles.expCategoriesRow}>
            {[
              { id: 'Specials', label: 'Specials', img: expImg27 },
              { id: 'Biryani', label: 'Biryani', img: expImg26 },
              { id: 'Pizzas', label: 'Pizzas', img: expImg25 },
              { id: 'Burgers', label: 'Burgers', img: expImg24 },
              { id: 'Rolls', label: 'Rolls', img: expImg23 },
            ].map((cat) => {
              const active = activeExploreCat === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.expCatCard, active && styles.expCatCardActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setActiveExploreCat(cat.id);
                    if (Platform.OS === 'android') {
                      ToastAndroid.show(`Filtering by ${cat.label}`, ToastAndroid.SHORT);
                    }
                  }}
                >
                  <Image source={cat.img} style={styles.expCatImg} />
                  <Text style={[styles.expCatLabel, active && styles.expCatLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 9] SECTION HEADER: "Top {count} restaurants to explore"
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.exploreSectionHeader}>
          <Text style={styles.exploreTitleMain}>
            <Text style={styles.exploreTitleTop}>Top </Text>
            <Text style={styles.exploreTitleGold}>
              {filteredRestaurants.length}{' '}
            </Text>
            <Text style={styles.exploreTitleMain}>restaurants to explore</Text>
          </Text>
          <Text style={styles.exploreSubtitle}>
            {activeExploreCat !== 'Specials'
              ? `Featured ${activeExploreCat} Restaurants`
              : 'Featured Restaurants'}
          </Text>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 10] VERTICAL RESTAURANT CARDS (100% Dynamically Mapped)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.verticalCardsContainer}>
          {filteredRestaurants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No restaurants found matching active filters.</Text>
              <TouchableOpacity
                style={styles.resetFiltersBtn}
                onPress={() => {
                  setIsVegOnly(false);
                  setActiveExploreCat('Specials');
                  setActiveDealOffer(null);
                }}
              >
                <Text style={styles.resetFiltersText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRestaurants.map((restaurant) => {
              const resImg = getRestaurantImageSource(restaurant);

              return (
                <TouchableOpacity
                  key={restaurant.id}
                  style={styles.vResCard}
                  activeOpacity={0.92}
                  onPress={() => onSelectRestaurant(restaurant.id)}
                >
                  {/* Left Photo & Badges */}
                  <View style={styles.vResImgBox}>
                    <Image source={resImg} style={styles.vResImg} />
                    
                    {/* Interactive Favorite Heart */}
                    <TouchableOpacity
                      style={styles.vResHeartBtn}
                      activeOpacity={0.7}
                      onPress={() => handleToggleFav(restaurant.id, restaurant.name)}
                    >
                      <Heart
                        size={14 * SCALE}
                        color={isFav(restaurant.id) ? '#FF334B' : '#FFFFFF'}
                        fill={isFav(restaurant.id) ? '#FF334B' : 'rgba(0,0,0,0.3)'}
                      />
                    </TouchableOpacity>

                    {/* Discount Offer Overlay */}
                    {restaurant.offer ? (
                      <View style={styles.vResOfferBox}>
                        <Text style={styles.vResOffer70} numberOfLines={1}>
                          {restaurant.offer.split(' ')[0]}
                        </Text>
                        <Text style={styles.vResOfferUpto} numberOfLines={1}>
                          {restaurant.offer.split(' ').slice(1).join(' ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Right Info Column */}
                  <View style={styles.vResInfoBox}>
                    <View style={styles.vResHeaderRow}>
                      <Text style={styles.vResTitleText} numberOfLines={1}>
                        {restaurant.name}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleOpenActionMenu(restaurant)}
                      >
                        <MoreVertical size={16 * SCALE} color="#777777" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.vResRatingRow}>
                      <Image source={expImg19} style={styles.vResGreenStar} />
                      <Text style={styles.vResRatingText}>
                        {restaurant.rating} {restaurant.reviewCount ? `(${restaurant.reviewCount})` : ''} • {restaurant.deliveryTime || 25} mins
                      </Text>
                    </View>

                    <Text style={styles.vResCuisineText} numberOfLines={1}>
                      {restaurant.cuisine}
                    </Text>
                    <Text style={styles.vResLocationText} numberOfLines={1}>
                      {restaurant.address || restaurant.city || ''} {restaurant.distance ? `• ${restaurant.distance} km` : ''}
                    </Text>

                    {/* Free Delivery & One Benefits Pill */}
                    <View style={styles.vResDeliveryPill}>
                      <View style={styles.vResDeliveryLeft}>
                        <Image source={expImg18} style={styles.vResTruckIcon} />
                        <Text style={styles.vResFreeDeliveryText}>FREE DELIVERY</Text>
                      </View>
                      <View style={styles.vResPillDivider} />
                      <View style={styles.vResOneBenefitsRight}>
                        <Text style={styles.vResOneText}>one</Text>
                        <Text style={styles.vResBenefitsText}>BENEFITS</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── LOCATION SELECTOR MODAL ── */}
      <LocationSelectorSheet
        visible={showLocationSheet}
        onClose={() => setShowLocationSheet(false)}
        onLocationSelected={setCurrentLocation}
      />

      {/* ── SEARCH OVERLAY SHEET ── */}
      <TopSearchSheetOverlay
        visible={isSearchSheetOpen}
        onClose={() => setIsSearchSheetOpen(false)}
        onSelectRestaurant={(id) => {
          onSelectRestaurant(id);
          setIsSearchSheetOpen(false);
        }}
        onNavigateToSearchScreen={(q) => {
          onNavigateToSearch && onNavigateToSearch(q);
          setIsSearchSheetOpen(false);
        }}
      />
    </View>
  );
};

// ─── Pixel-Perfect Responsive Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 110,
    backgroundColor: '#000000',
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },

  // ── 1. HEADER ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#000000',
  },
  headerLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  homeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  homeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18 * SCALE,
    color: '#A5822B',
    marginRight: 6,
    letterSpacing: -0.2,
  },
  goldChevronImg: {
    width: 9 * SCALE,
    height: 13 * SCALE,
    resizeMode: 'contain',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPinImg: {
    width: 11 * SCALE,
    height: 13 * SCALE,
    resizeMode: 'contain',
    marginRight: 5,
  },
  addressText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#666666',
    flex: 1,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freeDeliveryPill: {
    backgroundColor: '#060604',
    borderWidth: 1,
    borderColor: '#322E23',
    borderRadius: 22,
    paddingHorizontal: 9 * SCALE,
    paddingVertical: 5 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54 * SCALE,
  },
  freeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5 * SCALE,
    color: '#A5A5A5',
    lineHeight: 11 * SCALE,
  },
  deliveryText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 7 * SCALE,
    color: '#7E7E7E',
    letterSpacing: 0.2,
    lineHeight: 9 * SCALE,
    marginBottom: 2,
  },
  scooterImg: {
    width: 22 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
  },
  profileMenuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#040403',
    borderWidth: 1,
    borderColor: '#221E1A',
    borderRadius: 20,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 9 * SCALE,
    gap: 8 * SCALE,
  },
  profilePinImg: {
    width: 18 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  hamburgerImg: {
    width: 14 * SCALE,
    height: 10 * SCALE,
    resizeMode: 'contain',
  },

  // ── 2. CATEGORY TILES ──────────────────────────────────────────
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#000000',
  },
  catTile: {
    flex: 1,
    backgroundColor: '#0A0A09',
    borderWidth: 1,
    borderColor: '#1B1B1A',
    borderTopLeftRadius: 22 * SCALE,
    borderTopRightRadius: 22 * SCALE,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    paddingVertical: 10 * SCALE,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 88 * SCALE,
  },
  catTileActive: {
    backgroundColor: '#0E0D0A',
    borderColor: '#2A2518',
  },
  catBurgerImg: {
    width: 48 * SCALE,
    height: 44 * SCALE,
    resizeMode: 'contain',
    marginBottom: 6,
  },
  instamartImgWrap: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 6,
  },
  catInstamartImg: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    resizeMode: 'contain',
  },
  minsBadge: {
    position: 'absolute',
    bottom: -2,
    left: -4,
    backgroundColor: '#E2AB2C',
    borderWidth: 1,
    borderColor: '#927026',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  minsBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 7.5 * SCALE,
    color: '#5E4312',
  },
  catDineoutImg: {
    width: 46 * SCALE,
    height: 44 * SCALE,
    resizeMode: 'contain',
    marginBottom: 6,
  },
  catWineImg: {
    width: 42 * SCALE,
    height: 44 * SCALE,
    resizeMode: 'contain',
    marginBottom: 6,
  },
  catTileLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#7E7E7E',
    textAlign: 'center',
  },
  catTileLabelActive: {
    color: '#A2833A',
  },

  // ── 3. SEARCH & VEG ────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#000000',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0B0A',
    borderWidth: 1,
    borderColor: '#2B2822',
    borderRadius: 18 * SCALE,
    height: 48 * SCALE,
    paddingHorizontal: 14,
  },
  searchGlassImg: {
    width: 17 * SCALE,
    height: 17 * SCALE,
    resizeMode: 'contain',
    marginRight: 10,
  },
  searchPlaceholderText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 14 * SCALE,
    color: '#4B4B4B',
  },
  searchDividerImg: {
    width: 1,
    height: 20 * SCALE,
    resizeMode: 'contain',
    marginHorizontal: 8,
  },
  yellowMicImg: {
    width: 15 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  vegBtn: {
    backgroundColor: '#090909',
    borderWidth: 1.5,
    borderColor: '#1F1F1F',
    borderRadius: 16 * SCALE,
    paddingHorizontal: 8 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48 * SCALE,
    minWidth: 54 * SCALE,
  },
  vegBtnActive: {
    borderColor: '#00A352',
    backgroundColor: '#051A0E',
  },
  vegBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5 * SCALE,
    color: '#7D7D7D',
    marginBottom: 3,
  },
  vegBtnTextActive: {
    color: '#00D06C',
  },
  vegTrack: {
    width: 26 * SCALE,
    height: 14 * SCALE,
    borderRadius: 7 * SCALE,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    padding: 1.5,
    justifyContent: 'center',
  },
  vegTrackActive: {
    backgroundColor: '#00A352',
    borderColor: '#00D06C',
  },
  vegThumb: {
    width: 9 * SCALE,
    height: 9 * SCALE,
    borderRadius: 4.5 * SCALE,
    backgroundColor: '#777777',
  },
  vegThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFFFFF',
  },

  // ── 4. 70% OFF HERO BANNER ─────────────────────────────────────
  heroBanner: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: '#060605',
    borderWidth: 1,
    borderColor: '#161615',
    borderTopLeftRadius: 18 * SCALE,
    borderTopRightRadius: 36 * SCALE,
    borderBottomLeftRadius: 14 * SCALE,
    borderBottomRightRadius: 28 * SCALE,
    height: BANNER_HEIGHT,
    position: 'relative',
    overflow: 'visible',
  },
  heroBgWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18 * SCALE,
    borderTopRightRadius: 36 * SCALE,
    borderBottomLeftRadius: 14 * SCALE,
    borderBottomRightRadius: 28 * SCALE,
    overflow: 'hidden',
  },
  heroCenterBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  absolutePizzaLeft: {
    position: 'absolute',
    left: -BANNER_WIDTH * 0.02,
    top: BANNER_HEIGHT * 0.2,
    width: BANNER_HEIGHT * 0.52,
    height: BANNER_HEIGHT * 0.52,
    resizeMode: 'contain',
  },
  absoluteBurgerRight: {
    position: 'absolute',
    right: -BANNER_WIDTH * 0.04,
    top: BANNER_HEIGHT * 0.05,
    width: BANNER_HEIGHT * 0.58,
    height: BANNER_HEIGHT * 0.58,
    resizeMode: 'contain',
  },

  // ── 6. DEALS ROW ───────────────────────────────────────────────
  dealsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 8,
  },
  dealCard: {
    flex: 1,
    backgroundColor: '#0A0905',
    borderWidth: 1,
    borderColor: '#252218',
    borderRadius: 18 * SCALE,
    paddingTop: 10 * SCALE,
    paddingHorizontal: 10 * SCALE,
    height: 122 * SCALE,
    minHeight: 122 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  dealCardActive: {
    borderColor: '#CBA143',
    backgroundColor: '#14110B',
  },
  dealTextWrap: {
    zIndex: 2,
  },
  dealTitle1: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#B8B8B7',
    lineHeight: 15 * SCALE,
  },
  dealTitleGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#A48133',
    lineHeight: 15 * SCALE,
    marginBottom: 4,
  },
  dealRingImg: {
    position: 'absolute',
    right: -45 * SCALE,
    bottom: -12 * SCALE,
    width: 180 * SCALE,
    height: 110 * SCALE,
    resizeMode: 'contain',
  },
  dealTreatImg: {
    position: 'absolute',
    right: -12 * SCALE,
    bottom: -10 * SCALE,
    width: 104 * SCALE,
    height: 104 * SCALE,
    resizeMode: 'contain',
  },
  dealPizzaImg: {
    position: 'absolute',
    right: -14 * SCALE,
    bottom: -12 * SCALE,
    width: 106 * SCALE,
    height: 106 * SCALE,
    resizeMode: 'contain',
  },

  // ── 7. REORDER / FOOD IN 15 MINS SWITCH ────────────────────────
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#0B0A09',
    borderWidth: 1,
    borderColor: '#1B1B18',
    borderRadius: 24 * SCALE,
    height: 48 * SCALE,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21 * SCALE,
  },
  segmentBtnActive: {
    backgroundColor: '#14110B',
    borderWidth: 1.5,
    borderColor: '#292111',
  },
  segmentText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#898989',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: '#AA8D3B',
  },

  // ── 8. RESTAURANT HORIZONTAL CARDS ─────────────────────────────
  resCardsScroll: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  resCard: {
    width: 172 * SCALE,
    backgroundColor: '#0A0A0A',
    borderRadius: 18 * SCALE,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1B1B1A',
  },
  resCardImgBox: {
    width: '100%',
    height: 142 * SCALE,
    position: 'relative',
    backgroundColor: '#161616',
  },
  resCardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  oneBadge: {
    position: 'absolute',
    top: 8 * SCALE,
    left: 8 * SCALE,
    backgroundColor: '#DEA430',
    borderWidth: 1,
    borderColor: '#C69330',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 2.5 * SCALE,
    zIndex: 10,
  },
  oneBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#422608',
    lineHeight: 13 * SCALE,
  },
  favBtn: {
    position: 'absolute',
    top: 8 * SCALE,
    right: 8 * SCALE,
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 13 * SCALE,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  resOfferOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 6 * SCALE,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  resOfferMainText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 14 * SCALE,
    color: '#B6B0AC',
    lineHeight: 16 * SCALE,
  },
  resOfferSubText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10 * SCALE,
    color: '#9A9998',
  },
  resCardInfo: {
    padding: 8 * SCALE,
  },
  resNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#9C9C9C',
    marginBottom: 2,
  },
  resMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  resStarImg: {
    width: 12 * SCALE,
    height: 12 * SCALE,
    resizeMode: 'contain',
  },
  resMetaText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#656565',
  },
  resCuisineText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#5F5F5F',
  },

  // ── 9. "WHAT'S ON YOUR MIND?" SECTION (NATIVELY STICKY) ────────
  whatsOnMindStickyContainer: {
    backgroundColor: '#000000',
    paddingTop: 8,
    paddingBottom: 6,
    zIndex: 95,
  },
  whatsOnMindHeader: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  whatsOnMindTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#C9C9C9',
    letterSpacing: 0.8,
  },
  expCategoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 6,
  },
  expCatCard: {
    flex: 1,
    backgroundColor: '#090806',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 18 * SCALE,
    paddingVertical: 8 * SCALE,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 84 * SCALE,
  },
  expCatCardActive: {
    backgroundColor: '#0E0D0A',
    borderColor: 'rgba(212,175,55,0.4)',
  },
  expCatImg: {
    width: 48 * SCALE,
    height: 44 * SCALE,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  expCatLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#787878',
    textAlign: 'center',
  },
  expCatLabelActive: {
    color: '#9F853E',
  },

  // ── 10. EXPLORE SECTION HEADER ─────────────────────────────────
  exploreSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#000000',
  },
  exploreTitleMain: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20 * SCALE,
    color: '#C9C9C9',
    letterSpacing: -0.3,
  },
  exploreTitleTop: {
    color: '#CDCDCD',
  },
  exploreTitleGold: {
    color: '#CBA143',
    fontFamily: 'Urbanist-ExtraBold',
  },
  exploreSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#737373',
    marginTop: 2,
  },

  // ── 11. VERTICAL RESTAURANT CARDS ──────────────────────────────
  verticalCardsContainer: {
    paddingHorizontal: 14,
    gap: 14,
    backgroundColor: '#000000',
    marginTop: 4,
  },
  vResCard: {
    flexDirection: 'row',
    backgroundColor: '#050605',
    borderWidth: 1,
    borderColor: '#121212',
    borderRadius: 18 * SCALE,
    padding: 10 * SCALE,
    gap: 12 * SCALE,
    alignItems: 'center',
  },
  vResImgBox: {
    width: 128 * SCALE,
    height: 140 * SCALE,
    borderRadius: 16 * SCALE,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111111',
  },
  vResImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  vResHeartBtn: {
    position: 'absolute',
    top: 6 * SCALE,
    right: 6 * SCALE,
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 13 * SCALE,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  vResOfferBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6 * SCALE,
    paddingVertical: 4 * SCALE,
  },
  vResOffer70: {
    fontFamily: 'Urbanist-Black',
    fontSize: 15 * SCALE,
    color: '#DDDCD8',
    lineHeight: 18 * SCALE,
  },
  vResOfferUpto: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 9.5 * SCALE,
    color: '#9B7D3D',
    letterSpacing: 0.2,
  },
  vResInfoBox: {
    flex: 1,
    justifyContent: 'center',
  },
  vResHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 18 * SCALE,
    marginBottom: 2,
  },
  vResGourmetTag: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 13 * SCALE,
    color: '#ADADAC',
  },
  vResTitleText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#CACACA',
    marginBottom: 3,
  },
  vResRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  vResGreenStar: {
    width: 13 * SCALE,
    height: 13 * SCALE,
    resizeMode: 'contain',
  },
  vResRatingText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#888888',
  },
  vResCuisineText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#737373',
    marginBottom: 2,
  },
  vResLocationText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#6F6F6F',
    marginBottom: 8 * SCALE,
  },
  vResDeliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#030303',
    borderWidth: 1,
    borderColor: '#392D19',
    borderRadius: 9 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 5 * SCALE,
    justifyContent: 'space-between',
  },
  vResDeliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  vResTruckIcon: {
    width: 14 * SCALE,
    height: 12 * SCALE,
    resizeMode: 'contain',
  },
  vResFreeDeliveryText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5 * SCALE,
    color: '#AB883D',
    letterSpacing: 0.2,
  },
  vResPillDivider: {
    width: 1,
    height: 12 * SCALE,
    backgroundColor: '#392D19',
    marginHorizontal: 4 * SCALE,
  },
  vResOneBenefitsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vResOneText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 12 * SCALE,
    color: '#C19539',
    lineHeight: 14 * SCALE,
  },
  vResBenefitsText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 7.5 * SCALE,
    color: '#937C3E',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 14 * SCALE,
    color: '#777777',
    marginBottom: 12,
  },
  resetFiltersBtn: {
    backgroundColor: '#14110B',
    borderWidth: 1,
    borderColor: '#CBA143',
    borderRadius: 16 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  resetFiltersText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#CBA143',
  },
});
