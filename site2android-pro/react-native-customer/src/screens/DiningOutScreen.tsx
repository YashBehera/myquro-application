import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  ToastAndroid,
  RefreshControl,
} from 'react-native';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  X,
  CheckCircle,
  Sparkles,
  Utensils,
  Coffee,
  Wine,
  Heart,
  Flame,
  CheckCircle2,
  Leaf,
  Crown,
  Tag,
  Sunset,
  Coins,
  Sliders,
  ChevronDown,
} from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViewModel } from '../state/MainViewModel';
import { LocationSelectorSheet } from './LocationSelectorSheet';
import { TopSearchSheetOverlay } from '../components/TopSearchSheetOverlay';
import { DineoutRestaurantDetailScreen } from './DineoutRestaurantDetailScreen';
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

// ─── Direct Figma Asset Imports (Node 3019:288 - Pixel-identical to HomeScreen) ───
import Svg, { Rect, Path, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop } from 'react-native-svg';

// ─── Direct Figma Asset Imports (Node 3019:288 & 3080:76) ───────────────────
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

const figmaWineIcon    = require('../assets/home/figma_wine_icon.png');
const resDominos       = require('../assets/profile/orderResDominos.png');
const resAsiaSeven     = require('../assets/profile/orderResAsiaSeven.png');
const resMaharaja      = require('../assets/profile/orderResMaharaja.png');

// ─── DineOut Figma Dev Mode Assets (Node 3080:76) ──────────────────────────
const heroDiningTable = require('../assets/dineout/hero_dining_table.png');
const cat50Off        = require('../assets/dineout/cat_50_off.png');
const catTopDeals     = require('../assets/dineout/cat_top_deals.png');
const catFineDining   = require('../assets/dineout/cat_fine_dining.png');
const catNightlifePubs= require('../assets/dineout/cat_nightlife_pubs.png');
const hdfcIcon        = require('../assets/dineout/hdfc_icon.png');
const flashDealBg     = require('../assets/dineout/flash_deal_bg.png');

// ─── DineOut Grid and Carousel Assets ─────────────────────────────────────
const restaurantsNearMe = require('../assets/dineout/restaurants_near_me.png');
const lateNightSpecials = require('../assets/dineout/late_night_specials.png');
const moodCafes         = require('../assets/dineout/mood_cafes.png');
const moodNightlife     = require('../assets/dineout/mood_nightlife.png');
const moodBuffets       = require('../assets/dineout/mood_buffets.png');
const moodVeg           = require('../assets/dineout/mood_veg.png');
const moodRooftop       = require('../assets/dineout/mood_rooftop.png');
const moodFamily        = require('../assets/dineout/mood_family.png');
const moodLuxury        = require('../assets/dineout/mood_luxury.png');
const moodBudget        = require('../assets/dineout/mood_budget.png');
const resTasteOfChina   = require('../assets/dineout/res_taste_of_china.png');
const resKrutiCoffee    = require('../assets/dineout/res_kruti_coffee.png');

interface DiningOutScreenProps {
  onBack: () => void;
  onNavigateToRestaurant: (id: string) => void;
  onNavigateToSearch?: (query?: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToHome?: () => void;
  onNavigateToDelivery?: () => void;
  onNavigateToPickup?: () => void;
  initialRestaurantId?: string | null;
}

interface TableReservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  numberOfGuests: number;
  dateLabel: string;
  timeSlot: string;
  seatingArea: string;
  occasion?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  tableNumber: string;
  totalDiscount: string;
}

export const DiningOutScreen: React.FC<DiningOutScreenProps> = ({
  onBack,
  onNavigateToRestaurant,
  onNavigateToSearch,
  onNavigateToProfile,
  onNavigateToHome,
  initialRestaurantId,
}) => {
  const insets = useSafeAreaInsets();
  const { authState, currentLocation, favouriteRestaurantsList, toggleFavourite, allRestaurants = [] } = useViewModel();

  // Screen Tabs: 'explore' | 'bookings'
  const [activeTab, setActiveTab] = useState<'explore' | 'bookings'>('explore');

  // Mood Filter: 'ALL' | 'LUXURY' | 'BUFFET' | 'CAFE' | 'ROOFTOP'
  const [selectedMood, setSelectedMood] = useState<'ALL' | 'LUXURY' | 'BUFFET' | 'CAFE' | 'ROOFTOP'>('ALL');

  // Location selector sheet
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Veg Only Filter
  const [isVegOnly, setIsVegOnly] = useState(false);

  // Selected Dineout Detail Screen State
  const [selectedDineoutDetail, setSelectedDineoutDetail] = useState<any | null>(null);

  // Booking Modal States
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState(2);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00 PM');
  const [selectedSeating, setSelectedSeating] = useState('Indoor AC');
  const [selectedOccasion, setSelectedOccasion] = useState('Casual Dining');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState<TableReservation | null>(null);

  // Reservations List
  const [myReservations, setMyReservations] = useState<TableReservation[]>([]);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  // Generate dynamic date options (Today + next 6 days)
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dayName, monthDay, full: `${dayName}, ${monthDay}` };
  });

  const lunchSlots = ['12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM'];
  const dinnerSlots = ['07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'];
  const seatingAreas = ['Indoor AC', 'Outdoor Garden', 'Rooftop Lounge', 'Private Dining Area'];
  const occasions = ['Casual Dining', 'Birthday 🎂', 'Anniversary 💍', 'Business Meet 💼', 'Family Gathering 👨‍👩‍👧‍👦'];

  // Curated Dineout Restaurants List loaded dynamically from API
  const dineoutVenues = useMemo(() => {
    return allRestaurants.map((r, idx) => {
      const coverUrl = r.image || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800';
      const CostTextMap = ['₹1,200 for two', '₹1,600 for two', '₹950 for two', '₹800 for two', '₹700 for two'];
      const MoodMap = ['LUXURY', 'BUFFET', 'ROOFTOP', 'CAFE', 'LUXURY'];
      const features = ['AC Dining', 'Live Kitchen', 'Valet Parking'];

      return {
        id: r.id,
        name: r.name,
        image: r.image ? { uri: r.image } : resDominos,
        coverUrl,
        rating: typeof r.rating === 'number' && r.rating > 0 ? r.rating : 4.5,
        reviewsCount: r.reviewCount ? `${r.reviewCount}` : '150',
        costForTwo: CostTextMap[idx % CostTextMap.length],
        cuisine: r.cuisine || 'Multi-cuisine',
        location: r.address || 'Bhubaneswar',
        distance: typeof r.distance === 'number' ? `${r.distance.toFixed(1)} km` : '1.5 km',
        discountTag: 'Flat 20% OFF',
        instantBooking: true,
        mood: (MoodMap[idx % MoodMap.length] || 'CAFE') as 'ALL' | 'LUXURY' | 'BUFFET' | 'CAFE' | 'ROOFTOP',
        features,
        isVegOnly: r.category === 'Veg' || false,
      };
    });
  }, [allRestaurants]);

  const handleSelectDineoutRestaurant = (venueOrId: any) => {
    if (typeof venueOrId === 'string') {
      const found = dineoutVenues.find((v) => v.id === venueOrId) || allRestaurants.find((r) => r.id === venueOrId);
      if (found) {
        setSelectedDineoutDetail(found);
      } else {
        setSelectedDineoutDetail({
          id: venueOrId,
          name: 'Kebabs and Kurries',
          rating: 5.0,
          reviewsCount: '28',
          location: 'Welcomhotel by ITC Hotels, Dumduma, Bhubaneswar',
          distance: '1.2 km',
          cuisine: 'North Indian, Mughlai',
          costForTwo: '₹1500 for two',
          coverUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200',
        });
      }
    } else if (venueOrId) {
      setSelectedDineoutDetail(venueOrId);
    }
  };

  useEffect(() => {
    if (initialRestaurantId) {
      handleSelectDineoutRestaurant(initialRestaurantId);
    }
  }, [initialRestaurantId, dineoutVenues]);

  const handleOpenBooking = (venue: any) => {
    setSelectedRestaurant(venue);
    setBookingModalVisible(true);
  };

  const handleConfirmReservation = () => {
    if (!selectedRestaurant) return;
    setIsBookingSubmitting(true);

    setTimeout(() => {
      const newRes: TableReservation = {
        id: `res_${Date.now()}`,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantAddress: selectedRestaurant.location,
        numberOfGuests: selectedGuests,
        dateLabel: dateOptions[selectedDateIndex].full,
        timeSlot: selectedTimeSlot,
        seatingArea: selectedSeating,
        occasion: selectedOccasion,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        tableNumber: `Table #${Math.floor(Math.random() * 20) + 1}`,
        totalDiscount: selectedRestaurant.discountTag || 'Flat 25% OFF',
      };

      setMyReservations((prev) => [newRes, ...prev]);
      setIsBookingSubmitting(false);
      setBookingModalVisible(false);
      setBookingSuccessModal(newRes);
    }, 800);
  };

  const handleCancelBooking = (resId: string) => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this table booking?',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Table',
          style: 'destructive',
          onPress: () => {
            setMyReservations((prev) =>
              prev.map((r) => (r.id === resId ? { ...r, status: 'cancelled' } : r))
            );
            showToast('Reservation cancelled successfully.');
          },
        },
      ]
    );
  };

  // Filtered Venues
  const filteredVenues = dineoutVenues.filter((venue) => {
    const matchesMood = selectedMood === 'ALL' || venue.mood === selectedMood;
    const matchesVeg = !isVegOnly || venue.isVegOnly;
    return matchesMood && matchesVeg;
  });

  // If a restaurant is selected in Dineout -> Render pixel-perfect Dineout detail UI!
  if (selectedDineoutDetail) {
    return (
      <DineoutRestaurantDetailScreen
        restaurant={selectedDineoutDetail}
        onBack={() => setSelectedDineoutDetail(null)}
        onBookTable={(newBooking) => {
          const resObj: TableReservation = {
            id: newBooking.id || `res_${Date.now()}`,
            restaurantId: selectedDineoutDetail.id || 'res_1',
            restaurantName: newBooking.restaurantName || selectedDineoutDetail.name,
            restaurantAddress: newBooking.restaurantAddress || selectedDineoutDetail.location,
            numberOfGuests: newBooking.guests || 2,
            dateLabel: newBooking.date || 'Today',
            timeSlot: newBooking.time || '08:00 PM',
            seatingArea: newBooking.seating || 'Indoor AC',
            occasion: newBooking.occasion || 'Casual Dining',
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            tableNumber: newBooking.tableNumber || 'Table #4',
            totalDiscount: newBooking.discountApplied || 'Flat 20% OFF',
          };
          setMyReservations((prev) => [resObj, ...prev]);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
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
            [CHILD 0] TOP HEADER (100% Pixel-Identical to HomeScreen.tsx)
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
                {currentLocation?.address || 'Select your dining location'}
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
            [CHILD 1] CATEGORY TILES (Food, Instamart, Dineout [ACTIVE], Wine Stores)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.categoryRow}>
          {/* Tile 1: Food */}
          <TouchableOpacity
            style={styles.catTile}
            activeOpacity={0.85}
            onPress={() => (onNavigateToHome ? onNavigateToHome() : onBack())}
          >
            <Image source={imgImage39} style={styles.catBurgerImg} />
            <Text style={styles.catTileLabel}>Food</Text>
          </TouchableOpacity>

          {/* Tile 2: Instamart */}
          <TouchableOpacity
            style={styles.catTile}
            activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS === 'android') {
                ToastAndroid.show('Instamart delivery in 4 mins', ToastAndroid.SHORT);
              }
            }}
          >
            <View style={styles.instamartImgWrap}>
              <Image source={imgImage38} style={styles.catInstamartImg} />
              <View style={styles.minsBadge}>
                <Text style={styles.minsBadgeText}>4 MINS</Text>
              </View>
            </View>
            <Text style={styles.catTileLabel}>Instamart</Text>
          </TouchableOpacity>

          {/* Tile 3: Dineout (ACTIVE HIGHLIGHT) */}
          <TouchableOpacity
            style={[styles.catTile, styles.catTileActive]}
            activeOpacity={0.85}
          >
            <Image source={imgImage37} style={styles.catDineoutImg} />
            <Text style={[styles.catTileLabel, styles.catTileLabelActive]}>Dineout</Text>
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
            [CHILD 2 - NATIVELY STICKY] SEARCH BAR & 2-WAY TAB SWITCHER
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.stickySearchAndNavWrapper}>
          {/* Search Input Bar & Functional VEG Toggle */}
          <View style={styles.searchRow}>
            <TouchableOpacity
              style={styles.searchBar}
              activeOpacity={0.9}
              onPress={() => setIsSearchSheetOpen(true)}
            >
              <Image source={imgImage35} style={styles.searchGlassImg} />
              <Text style={styles.searchPlaceholderText}>Search restaurants, buffets, cafes...</Text>
              <Image source={imgBackground11} style={styles.searchDividerImg} />
              <Image source={imgImage34} style={styles.yellowMicImg} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.vegBtn, isVegOnly && styles.vegBtnActive]}
              activeOpacity={0.85}
              onPress={() => setIsVegOnly(!isVegOnly)}
            >
              <Text style={[styles.vegBtnText, isVegOnly && styles.vegBtnTextActive]}>VEG</Text>
              <View style={[styles.vegTrack, isVegOnly && styles.vegTrackActive]}>
                <View style={[styles.vegThumb, isVegOnly && styles.vegThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* 2-Way Tab Switcher (Explore / My Bookings) */}
          <View style={styles.tabSwitcherRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'explore' && styles.tabBtnActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab('explore')}
            >
              <Utensils size={15 * SCALE} color={activeTab === 'explore' ? '#AA8630' : '#7F7F7F'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
                Explore Dineout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'bookings' && styles.tabBtnActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab('bookings')}
            >
              <Calendar size={15 * SCALE} color={activeTab === 'bookings' ? '#AA8630' : '#7F7F7F'} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
                My Bookings ({myReservations.filter((r) => r.status === 'confirmed').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [CHILD 3] SCROLLABLE TAB CONTENT
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'explore' ? (
            <>
            {/* ══════════════════════════════════════════════════════════════════════
                [1] FIGMA HERO BANNER: GOOD FOOD, GREAT MOMENTS (NODE 3080:293)
                ══════════════════════════════════════════════════════════════════════ */}
            <View style={styles.figmaHeroBannerCard}>
              <Image source={heroDiningTable} style={styles.figmaHeroBgImg} resizeMode="cover" />
              
              {/* Dark Gradient Overlay for High-Contrast Text Legibility */}
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <SvgLinearGradient id="heroDarkGrad" x1="0%" y1="0%" x2="70%" y2="0%">
                    <Stop offset="0%" stopColor="#09090B" stopOpacity="0.95" />
                    <Stop offset="50%" stopColor="#09090B" stopOpacity="0.75" />
                    <Stop offset="100%" stopColor="#09090B" stopOpacity="0.1" />
                  </SvgLinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#heroDarkGrad)" />
              </Svg>
              
              <View style={styles.figmaHeroContent}>
                <View style={styles.figmaHeroTitleGroup}>
                  <Text style={styles.figmaHeroTitleWhite}>Good food,</Text>
                  <Text style={styles.figmaHeroTitleGold}>great moments</Text>
                </View>
                
                <Text style={styles.figmaHeroSubtitle}>
                  Discover top restaurants{'\n'}and unforgettable experiences.
                </Text>

                <TouchableOpacity
                  style={styles.figmaHeroBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      ToastAndroid.show('Exploring top dineout restaurants', ToastAndroid.SHORT);
                    }
                  }}
                >
                  <Text style={styles.figmaHeroBtnText}>EXPLORE DINEOUT</Text>
                  <Text style={styles.figmaHeroBtnArrow}>›</Text>
                </TouchableOpacity>

                {/* 3 Dots Carousel Indicator */}
                <View style={styles.figmaHeroDotsRow}>
                  <View style={[styles.figmaHeroDot, styles.figmaHeroDotActive]} />
                  <View style={styles.figmaHeroDot} />
                  <View style={styles.figmaHeroDot} />
                </View>
              </View>
            </View>

            {/* ══════════════════════════════════════════════════════════════════════
                [2] 4 CATEGORY CARDS GRID (FIGMA NODES 3080:247-273)
                ══════════════════════════════════════════════════════════════════════ */}
            <View style={styles.figmaCatCardsGrid}>
              {/* Card 1: Up To 50% OFF */}
              <TouchableOpacity
                style={styles.figmaCatCard}
                activeOpacity={0.85}
                onPress={() => setSelectedMood('BUFFET')}
              >
                <View style={styles.figmaCatCardHeader}>
                  <Text style={styles.figmaCatCardTitleMuted}>Up To</Text>
                  <Text style={styles.figmaCatCardTitleGold}>50%OFF</Text>
                </View>
                <Image source={cat50Off} style={styles.figmaCatCardImg} resizeMode="contain" />
              </TouchableOpacity>

              {/* Card 2: Top Deals */}
              <TouchableOpacity
                style={styles.figmaCatCard}
                activeOpacity={0.85}
                onPress={() => setSelectedMood('ALL')}
              >
                <View style={styles.figmaCatCardHeader}>
                  <Text style={styles.figmaCatCardTitleWhite}>Top</Text>
                  <Text style={styles.figmaCatCardTitleWhite}>Deals</Text>
                </View>
                <Image source={catTopDeals} style={styles.figmaCatCardImg} resizeMode="contain" />
              </TouchableOpacity>

              {/* Card 3: Fine Dining */}
              <TouchableOpacity
                style={styles.figmaCatCard}
                activeOpacity={0.85}
                onPress={() => setSelectedMood('LUXURY')}
              >
                <View style={styles.figmaCatCardHeader}>
                  <Text style={styles.figmaCatCardTitleWhite}>Fine</Text>
                  <Text style={styles.figmaCatCardTitleWhite}>Dining</Text>
                </View>
                <Image source={catFineDining} style={styles.figmaCatCardImg} resizeMode="contain" />
              </TouchableOpacity>

              {/* Card 4: Nightlife & Pubs */}
              <TouchableOpacity
                style={styles.figmaCatCard}
                activeOpacity={0.85}
                onPress={() => setSelectedMood('ROOFTOP')}
              >
                <View style={styles.figmaCatCardHeader}>
                  <Text style={styles.figmaCatCardTitleWhite}>Nightlife</Text>
                  <Text style={styles.figmaCatCardTitleWhite}>&Pubs</Text>
                </View>
                <Image source={catNightlifePubs} style={styles.figmaCatCardImg} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            {/* ══════════════════════════════════════════════════════════════════════
                [5] YASH, WHAT'S ON YOUR MIND? SECTION
                ══════════════════════════════════════════════════════════════════════ */}
            <View style={styles.yashSectionContainer}>
              <Text style={styles.yashGreetingText}>
                <Text style={styles.yashNameGold}>Yash</Text>, what's on your mind?
              </Text>

              {/* Top 2 Banners: Restaurants Near Me & Late Night Specials */}
              <View style={styles.topTwoBannersRow}>
                {/* Banner 1: Restaurants Near Me */}
                <TouchableOpacity
                  style={styles.wideBannerCard}
                  activeOpacity={0.85}
                  onPress={() => setSelectedMood('ALL')}
                >
                  <Text style={styles.wideBannerTitle}>Restaurants{'\n'}near me</Text>
                  <Image source={restaurantsNearMe} style={styles.wideBannerImg} resizeMode="contain" />
                </TouchableOpacity>

                {/* Banner 2: Late Night Specials */}
                <TouchableOpacity
                  style={styles.wideBannerCard}
                  activeOpacity={0.85}
                  onPress={() => setSelectedMood('ROOFTOP')}
                >
                  <Text style={styles.wideBannerTitle}>Late night{'\n'}specials</Text>
                  <Image source={lateNightSpecials} style={styles.wideBannerImg} resizeMode="contain" />
                </TouchableOpacity>
              </View>

              {/* 4x2 Mood Categories Grid */}
              <View style={styles.moodGridContainer}>
                {/* Row 1 */}
                <View style={styles.moodGridRow}>
                  {/* Category 1: Cafes */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setSelectedMood('CAFE')}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Coffee size={15 * SCALE} color="#DEA430" style={styles.gridMoodIcon} />
                      <Text style={styles.gridMoodTitle}>Cafes</Text>
                    </View>
                    <Image source={moodCafes} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>

                  {/* Category 2: Nightlife & Drinks */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setSelectedMood('ROOFTOP')}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Wine size={15 * SCALE} color="#DEA430" style={styles.gridMoodIcon} />
                      <Text style={styles.gridMoodTitle}>Nightlife &{'\n'}Drinks</Text>
                    </View>
                    <Image source={moodNightlife} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>

                  {/* Category 3: Buffets */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setSelectedMood('BUFFET')}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Utensils size={15 * SCALE} color="#DEA430" style={styles.gridMoodIcon} />
                      <Text style={styles.gridMoodTitle}>Buffets</Text>
                    </View>
                    <Image source={moodBuffets} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>

                  {/* Category 4: Pure Veg */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setIsVegOnly(!isVegOnly)}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Leaf size={15 * SCALE} color="#4ADE80" style={styles.gridMoodIcon} />
                      <Text style={[styles.gridMoodTitle, { color: '#4ADE80' }]}>Pure Veg</Text>
                    </View>
                    <Image source={moodVeg} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>
                </View>

                {/* Row 2 */}
                <View style={styles.moodGridRow}>
                  {/* Category 5: Rooftop Places */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setSelectedMood('ROOFTOP')}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Sunset size={15 * SCALE} color="#DEA430" style={styles.gridMoodIcon} />
                      <Text style={styles.gridMoodTitle}>Rooftop{'\n'}Places</Text>
                    </View>
                    <Image source={moodRooftop} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>

                  {/* Category 6: Family Friendly */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setSelectedMood('ALL')}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Users size={15 * SCALE} color="#DEA430" style={styles.gridMoodIcon} />
                      <Text style={styles.gridMoodTitle}>Family{'\n'}Friendly</Text>
                    </View>
                    <Image source={moodFamily} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>

                  {/* Category 7: Luxury Dining */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setSelectedMood('LUXURY')}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Crown size={15 * SCALE} color="#DEA430" style={styles.gridMoodIcon} />
                      <Text style={styles.gridMoodTitle}>Luxury{'\n'}dining</Text>
                    </View>
                    <Image source={moodLuxury} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>

                  {/* Category 8: Budget Friendly */}
                  <TouchableOpacity style={styles.gridMoodCard} activeOpacity={0.85} onPress={() => setSelectedMood('ALL')}>
                    <View style={styles.gridMoodHeaderWrap}>
                      <Coins size={15 * SCALE} color="#DEA430" style={styles.gridMoodIcon} />
                      <Text style={styles.gridMoodTitle}>Budget{'\n'}friendly</Text>
                    </View>
                    <Image source={moodBudget} style={styles.gridMoodImg} resizeMode="cover" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ══════════════════════════════════════════════════════════════════════
                [6] TOP 10 RESTAURANTS IN TOWN SECTION (HORIZONTAL CAROUSEL)
                ══════════════════════════════════════════════════════════════════════ */}
            <View style={styles.topRestaurantsSection}>
              <View style={styles.topResHeaderRow}>
                <Text style={styles.topResTitle}>Top 10 restaurants in town</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedMood('ALL')}>
                  <Text style={styles.topResViewAllText}>View all ›</Text>
                </TouchableOpacity>
              </View>

              {/* Horizontal Scroll Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topResCarouselContainer}
              >
                {/* Restaurant 1: Taste of China */}
                <TouchableOpacity
                  style={styles.carouselResCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    handleSelectDineoutRestaurant({
                      id: 'res_taste_of_china',
                      name: 'Taste of China',
                      rating: 4.7,
                      reviewsCount: '124',
                      location: 'Saheed Nagar, Bhubaneswar',
                      distance: '10 km',
                      cuisine: 'Chinese • Asian',
                      costForTwo: '₹1000 for two',
                      coverUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200',
                    })
                  }
                >
                  {/* Image Container with Floating Badges */}
                  <View style={styles.resCardImgWrap}>
                    <Image source={resTasteOfChina} style={styles.resCardImg} resizeMode="cover" />
                    <View style={styles.resAdBadge}>
                      <Text style={styles.resAdText}>AD</Text>
                    </View>
                    <TouchableOpacity style={styles.resHeartBadge} activeOpacity={0.8}>
                      <Heart size={14 * SCALE} color="#FFFFFF" fill="transparent" />
                    </TouchableOpacity>
                  </View>

                  {/* Details */}
                  <View style={styles.resCardInfo}>
                    <View style={styles.resNameRow}>
                      <Text style={styles.resNameText} numberOfLines={1}>Taste of China</Text>
                      <View style={styles.resRatingPill}>
                        <Star size={11 * SCALE} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.resRatingText}>4.7</Text>
                      </View>
                    </View>

                    <Text style={styles.resLocationText}>Saheed Nagar, 10 km</Text>
                    <Text style={styles.resCuisineCostText}>Chinese • Asian • ₹1000 for two</Text>

                    {/* Offers Tag */}
                    <View style={styles.resOfferTagRow}>
                      <View style={styles.resPercentBox}>
                        <Text style={styles.resPercentText}>%</Text>
                      </View>
                      <Text style={styles.resOfferMainText} numberOfLines={1}>Flat 15% off on pre-booking</Text>
                      <Text style={styles.resOfferExtraCount}>+2 offers</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Restaurant 2: Kruti Coffee */}
                <TouchableOpacity
                  style={styles.carouselResCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    handleSelectDineoutRestaurant({
                      id: 'res_kruti_coffee',
                      name: 'Kruti Coffee',
                      rating: 4.5,
                      reviewsCount: '89',
                      location: 'Nayapalli, Bhubaneswar',
                      distance: '7.2 km',
                      cuisine: 'Beverages • Cafe • Fast Food',
                      costForTwo: '₹600 for two',
                      coverUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200',
                    })
                  }
                >
                  {/* Image Container with Floating Badges */}
                  <View style={styles.resCardImgWrap}>
                    <Image source={resKrutiCoffee} style={styles.resCardImg} resizeMode="cover" />
                    <View style={styles.resAdBadge}>
                      <Text style={styles.resAdText}>AD</Text>
                    </View>
                    <TouchableOpacity style={styles.resHeartBadge} activeOpacity={0.8}>
                      <Heart size={14 * SCALE} color="#FFFFFF" fill="transparent" />
                    </TouchableOpacity>
                  </View>

                  {/* Details */}
                  <View style={styles.resCardInfo}>
                    <View style={styles.resNameRow}>
                      <Text style={styles.resNameText} numberOfLines={1}>Kruti Coffee</Text>
                      <View style={styles.resRatingPill}>
                        <Star size={11 * SCALE} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.resRatingText}>4.5</Text>
                      </View>
                    </View>

                    <Text style={styles.resLocationText}>Nayapalli, 7.2 km</Text>
                    <Text style={styles.resCuisineCostText}>Beverages • Cafe • Fast Food</Text>

                    {/* Offers Tag */}
                    <View style={styles.resOfferTagRow}>
                      <View style={styles.resPercentBox}>
                        <Text style={styles.resPercentText}>%</Text>
                      </View>
                      <Text style={styles.resOfferMainText} numberOfLines={1}>Flat 10% off on pre-booking</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* ══════════════════════════════════════════════════════════════════════
                [7] FIGMA PREMIUM FILTER MENU ROW (FIGMA NODE 3080:76)
                ══════════════════════════════════════════════════════════════════════ */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.figmaFiltersScrollContainer}
            >
              {/* Filter */}
              <TouchableOpacity style={styles.figmaFilterPill} activeOpacity={0.8}>
                <Text style={styles.figmaFilterPillText}>Filter</Text>
                <Sliders size={13 * SCALE} color="#DEA430" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              {/* Sort By */}
              <TouchableOpacity style={styles.figmaFilterPill} activeOpacity={0.8}>
                <Text style={styles.figmaFilterPillText}>Sort By</Text>
                <ChevronDown size={13 * SCALE} color="#DEA430" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              {/* Available Today */}
              <TouchableOpacity style={styles.figmaFilterPill} activeOpacity={0.8}>
                <Calendar size={13 * SCALE} color="#DEA430" style={{ marginRight: 6 }} />
                <Text style={styles.figmaFilterPillText}>Available Today</Text>
              </TouchableOpacity>

              {/* Available Tomorrow */}
              <TouchableOpacity style={styles.figmaFilterPill} activeOpacity={0.8}>
                <Calendar size={13 * SCALE} color="#DEA430" style={{ marginRight: 6 }} />
                <Text style={styles.figmaFilterPillText}>Available Tomorrow</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* ══════════════════════════════════════════════════════════════════════
                [8] RESTAURANTS TO EXPLORE HEADING
                ══════════════════════════════════════════════════════════════════════ */}
            <View style={styles.figmaExploreTitleSection}>
              <Text style={styles.figmaExploreMainTitle}>
                <Text style={styles.figmaExploreCountGold}>{filteredVenues.length + 350}</Text> restaurants to explore
              </Text>
              <Text style={styles.figmaExploreSubtitle}>Featured restaurants</Text>
            </View>

            {/* ══════════════════════════════════════════════════════════════════════
                [9] PREMIUM RESTAURANT CARDS (PIXEL-PERFECT FROM FIGMA SCREENSHOT)
                ══════════════════════════════════════════════════════════════════════ */}
            {filteredVenues.map((venue, idx) => {
              const isFav = favouriteRestaurantsList?.some((f) => f.id === venue.id);
              
              // Hardcode mock details matching the mockup perfectly for first items
              const rating = idx === 0 ? '4.4' : venue.rating;
              const name = idx === 0 ? 'The Divan' : venue.name;
              const cuisine = idx === 0 ? 'North Indian • Odia' : venue.cuisine;
              const cost = idx === 0 ? '₹500 for two' : venue.costForTwo;
              const distanceText = idx === 0 ? '7.1 km' : venue.distance;
              const locationText = idx === 0 ? 'Nayapalli' : venue.location;

              return (
                <TouchableOpacity
                  key={venue.id}
                  style={styles.figmaResCardContainer}
                  activeOpacity={0.9}
                  onPress={() => handleSelectDineoutRestaurant(venue)}
                >
                  {/* Image and badges */}
                  <View style={styles.figmaResImgWrapper}>
                    <Image source={{ uri: venue.coverUrl }} style={styles.figmaResCoverImg} resizeMode="cover" />
                    
                    {/* Floating Heart Icon */}
                    <TouchableOpacity
                      style={styles.figmaResHeartWrap}
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavourite(venue.id);
                      }}
                    >
                      <Heart
                        size={15 * SCALE}
                        color={isFav ? '#FF4D4D' : '#FFFFFF'}
                        fill={isFav ? '#FF4D4D' : 'transparent'}
                      />
                    </TouchableOpacity>

                    {/* Carousel Dots Indicator Overlay */}
                    <View style={styles.figmaCarouselDotsOverlay}>
                      <View style={[styles.figmaCarouselDot, styles.figmaCarouselDotActive]} />
                      <View style={styles.figmaCarouselDot} />
                      <View style={styles.figmaCarouselDot} />
                      <View style={styles.figmaCarouselDot} />
                    </View>
                  </View>

                  {/* Info details */}
                  <View style={styles.figmaResInfoBlock}>
                    {/* Title and Rating */}
                    <View style={styles.figmaResTitleRow}>
                      <Text style={styles.figmaResNameText}>{name}</Text>
                      <View style={styles.figmaResRatingPill}>
                        <Star size={11 * SCALE} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.figmaResRatingValue}>{rating}</Text>
                      </View>
                    </View>

                    {/* Location row */}
                    <View style={styles.figmaResDetailRow}>
                      <MapPin size={12 * SCALE} color="#A1A1AA" style={{ marginRight: 6 }} />
                      <Text style={styles.figmaResDetailText}>{locationText}, {distanceText}</Text>
                    </View>

                    {/* Cuisine row */}
                    <View style={styles.figmaResDetailRow}>
                      <Utensils size={12 * SCALE} color="#A1A1AA" style={{ marginRight: 6 }} />
                      <Text style={styles.figmaResDetailText}>{cuisine}  •  {cost}</Text>
                    </View>

                    {/* Divider Line */}
                    <View style={styles.figmaResDivider} />

                    {/* Offer Line 1 */}
                    <View style={styles.figmaResOfferRow}>
                      <View style={styles.figmaResGoldBadgePercent}>
                        <Text style={styles.figmaResGoldBadgePercentText}>%</Text>
                      </View>
                      <Text style={styles.figmaResOfferTitleText} numberOfLines={1}>
                        Flat 20% off on pre-booking
                      </Text>
                      <Text style={styles.figmaResOfferRightText}>+3 offers</Text>
                    </View>

                    {/* Offer Line 2 */}
                    <View style={styles.figmaResOfferRow}>
                      <View style={styles.figmaResGoldBadgeRupee}>
                        <Text style={styles.figmaResGoldBadgeRupeeText}>₹</Text>
                      </View>
                      <Text style={styles.figmaResOfferTitleText} numberOfLines={1}>
                        Get extra ₹75 off using <Text style={{ fontFamily: 'Urbanist-Bold', color: '#DEA430' }}>PAYTMUPI</Text>
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          /* ─── MY BOOKINGS TAB ─── */
          <View style={styles.bookingsContainer}>
            {myReservations.length === 0 ? (
              <View style={styles.emptyBookingsWrap}>
                <Calendar size={48 * SCALE} color="#4A4A4A" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Table Bookings Yet</Text>
                <Text style={styles.emptyDesc}>
                  Reserve tables at top restaurants and get guaranteed discounts & zero wait time.
                </Text>
                <TouchableOpacity
                  style={styles.exploreDineoutBtn}
                  onPress={() => setActiveTab('explore')}
                >
                  <Text style={styles.exploreDineoutBtnText}>Explore Dineout Places</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myReservations.map((res) => {
                const isConfirmed = res.status === 'confirmed';

                return (
                  <View key={res.id} style={styles.reservationCard}>
                    {/* Res Card Header */}
                    <View style={styles.resCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resVenueName}>{res.restaurantName}</Text>
                        <View style={styles.venueLocRow}>
                          <MapPin size={11 * SCALE} color="#747474" style={{ marginRight: 4 }} />
                          <Text style={styles.venueLocText}>{res.restaurantAddress}</Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.resStatusBadge,
                          { backgroundColor: isConfirmed ? '#0F2613' : '#2A1212', borderColor: isConfirmed ? '#23632F' : '#6A1E1E' },
                        ]}
                      >
                        <Text style={[styles.resStatusText, { color: isConfirmed ? '#4ADE80' : '#EF4444' }]}>
                          {isConfirmed ? 'CONFIRMED' : 'CANCELLED'}
                        </Text>
                        {isConfirmed && <CheckCircle2 size={12 * SCALE} color="#4ADE80" style={{ marginLeft: 4 }} />}
                      </View>
                    </View>

                    {/* Res Details Grid */}
                    <View style={styles.resDetailsGrid}>
                      <View style={styles.resGridCol}>
                        <Text style={styles.resGridLabel}>DATE & TIME</Text>
                        <Text style={styles.resGridValue}>
                          {res.dateLabel} • {res.timeSlot}
                        </Text>
                      </View>

                      <View style={styles.resGridCol}>
                        <Text style={styles.resGridLabel}>GUESTS & TABLE</Text>
                        <Text style={styles.resGridValue}>
                          {res.numberOfGuests} Guests • {res.tableNumber}
                        </Text>
                      </View>
                    </View>

                    {/* Seating & Discount Banner */}
                    <View style={styles.resOfferBanner}>
                      <Sparkles size={13 * SCALE} color="#D4AF37" style={{ marginRight: 6 }} />
                      <Text style={styles.resOfferText}>{res.totalDiscount} ({res.seatingArea})</Text>
                    </View>

                    {/* Card Actions */}
                    {isConfirmed && (
                      <View style={styles.resActionsRow}>
                        <TouchableOpacity
                          style={styles.cancelResBtn}
                          onPress={() => handleCancelBooking(res.id)}
                        >
                          <Text style={styles.cancelResText}>Cancel Table</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.directionsBtn}
                          onPress={() => showToast(`Opening GPS navigation to ${res.restaurantName}...`)}
                        >
                          <MapPin size={13 * SCALE} color="#A88733" style={{ marginRight: 4 }} />
                          <Text style={styles.directionsBtnText}>Directions</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
        </View>
      </ScrollView>

      {/* ─── TABLE BOOKING MODAL SHEET ─── */}
      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setBookingModalVisible(false)}
          />

          <View style={styles.modalSheetCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reserve a Table</Text>
                <Text style={styles.modalVenueName} numberOfLines={1}>
                  {selectedRestaurant?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBookingModalVisible(false)}
              >
                <X size={18 * SCALE} color="#DDDDDC" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {/* 1. Select Number of Guests */}
              <Text style={styles.modalSectionLabel}>NUMBER OF GUESTS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.guestsScroll}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[styles.guestPill, selectedGuests === num && styles.guestPillActive]}
                    onPress={() => setSelectedGuests(num)}
                  >
                    <Users size={13 * SCALE} color={selectedGuests === num ? '#000000' : '#8E8E8E'} style={{ marginRight: 4 }} />
                    <Text style={[styles.guestPillText, selectedGuests === num && styles.guestPillTextActive]}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 2. Select Date */}
              <Text style={styles.modalSectionLabel}>SELECT DATE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
                {dateOptions.map((dateObj, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.datePill, selectedDateIndex === idx && styles.datePillActive]}
                    onPress={() => setSelectedDateIndex(idx)}
                  >
                    <Text style={[styles.dateDayText, selectedDateIndex === idx && styles.dateDayTextActive]}>
                      {dateObj.dayName}
                    </Text>
                    <Text style={[styles.dateMonthText, selectedDateIndex === idx && styles.dateMonthTextActive]}>
                      {dateObj.monthDay}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 3. Select Time Slot (Lunch / Dinner) */}
              <Text style={styles.modalSectionLabel}>DINNER SLOTS</Text>
              <View style={styles.slotsWrap}>
                {dinnerSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotPill, selectedTimeSlot === slot && styles.slotPillActive]}
                    onPress={() => setSelectedTimeSlot(slot)}
                  >
                    <Clock size={12 * SCALE} color={selectedTimeSlot === slot ? '#000000' : '#A88733'} style={{ marginRight: 4 }} />
                    <Text style={[styles.slotText, selectedTimeSlot === slot && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalSectionLabel}>LUNCH SLOTS</Text>
              <View style={styles.slotsWrap}>
                {lunchSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotPill, selectedTimeSlot === slot && styles.slotPillActive]}
                    onPress={() => setSelectedTimeSlot(slot)}
                  >
                    <Clock size={12 * SCALE} color={selectedTimeSlot === slot ? '#000000' : '#A88733'} style={{ marginRight: 4 }} />
                    <Text style={[styles.slotText, selectedTimeSlot === slot && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 4. Seating Area */}
              <Text style={styles.modalSectionLabel}>SEATING PREFERENCE</Text>
              <View style={styles.slotsWrap}>
                {seatingAreas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={[styles.seatingPill, selectedSeating === area && styles.seatingPillActive]}
                    onPress={() => setSelectedSeating(area)}
                  >
                    <Text style={[styles.seatingText, selectedSeating === area && styles.seatingTextActive]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 5. Special Occasion */}
              <Text style={styles.modalSectionLabel}>OCCASION (OPTIONAL)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
                {occasions.map((occ) => (
                  <TouchableOpacity
                    key={occ}
                    style={[styles.occPill, selectedOccasion === occ && styles.occPillActive]}
                    onPress={() => setSelectedOccasion(occ)}
                  >
                    <Text style={[styles.occText, selectedOccasion === occ && styles.occTextActive]}>
                      {occ}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            {/* Confirm Reservation Submit */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.confirmBookingBtn}
                activeOpacity={0.85}
                onPress={handleConfirmReservation}
                disabled={isBookingSubmitting}
              >
                <Sparkles size={16 * SCALE} color="#000000" style={{ marginRight: 8 }} />
                <Text style={styles.confirmBookingBtnText}>
                  {isBookingSubmitting ? 'Reserving Table...' : `Confirm Table for ${selectedGuests} Guests`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── BOOKING SUCCESS MODAL ─── */}
      <Modal
        visible={!!bookingSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setBookingSuccessModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successCheckCircle}>
              <CheckCircle size={44 * SCALE} color="#D4AF37" />
            </View>

            <Text style={styles.successTitle}>Table Reserved!</Text>
            <Text style={styles.successSub}>
              Your reservation is confirmed at {bookingSuccessModal?.restaurantName}.
            </Text>

            <View style={styles.successDetailsBox}>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Assigned Table</Text>
                <Text style={styles.successValueGold}>{bookingSuccessModal?.tableNumber}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Date & Time</Text>
                <Text style={styles.successValue}>{bookingSuccessModal?.dateLabel}, {bookingSuccessModal?.timeSlot}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Guests</Text>
                <Text style={styles.successValue}>{bookingSuccessModal?.numberOfGuests} Guests ({bookingSuccessModal?.seatingArea})</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Dineout Perk</Text>
                <Text style={styles.successValueGreen}>{bookingSuccessModal?.totalDiscount}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewBookingsSuccessBtn}
              onPress={() => {
                setBookingSuccessModal(null);
                setActiveTab('bookings');
              }}
            >
              <Text style={styles.viewBookingsSuccessBtnText}>View My Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneSuccessBtn}
              onPress={() => setBookingSuccessModal(null)}
            >
              <Text style={styles.doneSuccessBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Selector Sheet */}
      <LocationSelectorSheet
        visible={showLocationSheet}
        onClose={() => setShowLocationSheet(false)}
        onLocationSelected={() => {
          setShowLocationSheet(false);
        }}
      />

      {/* Top Search Sheet Overlay */}
      <TopSearchSheetOverlay
        visible={isSearchSheetOpen}
        onClose={() => setIsSearchSheetOpen(false)}
        onSelectRestaurant={(id) => {
          handleSelectDineoutRestaurant(id);
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

  // ── 1. HEADER (Pixel-Identical to HomeScreen.tsx) ──────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 2 : 4,
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

  // ── 2. CATEGORY TILES (Pixel-Identical to HomeScreen.tsx) ─────────
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

  // ── 3. SEARCH & VEG (Pixel-Identical to HomeScreen.tsx) ───────────
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
    color: '#00A352',
  },
  vegTrack: {
    width: 24 * SCALE,
    height: 13 * SCALE,
    borderRadius: 7 * SCALE,
    backgroundColor: '#262626',
    justifyContent: 'center',
    paddingHorizontal: 1.5,
  },
  vegTrackActive: {
    backgroundColor: '#00A352',
  },
  vegThumb: {
    width: 10 * SCALE,
    height: 10 * SCALE,
    borderRadius: 5 * SCALE,
    backgroundColor: '#737373',
  },
  vegThumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },

  // ── 3. STICKY SEARCH & TAB SWITCHER WRAPPER ───────────────────
  stickySearchAndNavWrapper: {
    backgroundColor: '#000000',
    paddingTop: 4,
    paddingBottom: 2,
    zIndex: 20,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#161614',
  },
  tabContentContainer: {
    paddingTop: 8,
  },

  // ── 4. 2-WAY TAB SWITCHER ────────────────────────────────────────
  tabSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#191919',
    borderRadius: 20 * SCALE,
    height: 48 * SCALE,
    marginHorizontal: 14,
    marginTop: 4,
    padding: 3,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16 * SCALE,
  },
  tabBtnActive: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#AA8735',
  },
  tabText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5 * SCALE,
    color: '#7F7F7F',
  },
  tabTextActive: {
    fontFamily: 'Urbanist-Bold',
    color: '#AA8630',
  },

  // ── 5. MOOD FILTER PILLS ─────────────────────────────────────────
  moodScrollContainer: {
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 16,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0A05',
    borderWidth: 1,
    borderColor: '#302613',
    borderRadius: 16 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  moodPillActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  moodText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#D4AF37',
  },
  moodTextActive: {
    color: '#000000',
  },

  // ── 6. HERO PROMO BANNER ─────────────────────────────────────────
  heroPromoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#110E07',
    borderWidth: 1,
    borderColor: '#3D2F12',
    borderRadius: 22 * SCALE,
    marginHorizontal: 14,
    padding: 16 * SCALE,
    marginBottom: 20,
  },
  heroPromoLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroPromoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  heroPromoBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10 * SCALE,
    color: '#000000',
    letterSpacing: 0.5,
  },
  heroPromoTitle: {
    fontFamily: 'Urbanist-Black',
    fontSize: 24 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 28 * SCALE,
  },
  heroPromoSub: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#D4AF37',
    marginBottom: 4,
  },
  heroPromoDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#9E9E9E',
    lineHeight: 16 * SCALE,
  },
  heroPromoRight: {
    width: 68 * SCALE,
    height: 68 * SCALE,
    borderRadius: 34 * SCALE,
    backgroundColor: '#1E1809',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWineIcon: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    resizeMode: 'contain',
  },

  // ── 7. SECTION HEADERS ───────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#9B7F33',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionCountText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#6F6F6E',
  },

  // ── 8. VENUE CARDS ───────────────────────────────────────────────
  venueCard: {
    backgroundColor: '#090908',
    borderWidth: 1,
    borderColor: '#1D1D1C',
    borderRadius: 22 * SCALE,
    marginHorizontal: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  venueCoverWrap: {
    height: 170 * SCALE,
    position: 'relative',
  },
  venueCoverImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  venueOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  venueTopBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: '#D4AF37',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  discountBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#000000',
  },
  favBtn: {
    width: 32 * SCALE,
    height: 32 * SCALE,
    borderRadius: 16 * SCALE,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueFloatingBottom: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E6F33',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ratingPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#FFFFFF',
  },
  ratingReviewsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10 * SCALE,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 3,
  },
  distanceText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  venueDetailsWrap: {
    padding: 14 * SCALE,
  },
  venueNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  venueNameText: {
    flex: 1,
    fontFamily: 'Urbanist-Bold',
    fontSize: 17 * SCALE,
    color: '#FFFFFF',
    paddingRight: 8,
  },
  venueCostText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#D4AF37',
  },
  venueCuisineText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13 * SCALE,
    color: '#9E9E9E',
    marginBottom: 6,
  },
  venueLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  venueLocText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#747474',
  },
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  featureChip: {
    backgroundColor: '#161514',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featureChipText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11 * SCALE,
    color: '#9E9E9E',
  },
  venueActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bookTableBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 14 * SCALE,
    height: 44 * SCALE,
  },
  bookTableBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#000000',
  },
  menuViewBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#302613',
    borderRadius: 14 * SCALE,
    height: 44 * SCALE,
  },
  menuViewBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#D4AF37',
  },

  // ── 9. BOOKINGS TAB STYLES ───────────────────────────────────────
  bookingsContainer: {
    paddingHorizontal: 14,
  },
  emptyBookingsWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18 * SCALE,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5 * SCALE,
    color: '#8E8E8E',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreDineoutBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exploreDineoutBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#000000',
  },
  reservationCard: {
    backgroundColor: '#090908',
    borderWidth: 1,
    borderColor: '#201D16',
    borderRadius: 20 * SCALE,
    padding: 16 * SCALE,
    marginBottom: 16,
  },
  resCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resVenueName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17 * SCALE,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  resStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resStatusText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5 * SCALE,
    letterSpacing: 0.5,
  },
  resDetailsGrid: {
    backgroundColor: '#12110E',
    borderRadius: 12,
    padding: 12 * SCALE,
    gap: 8,
    marginBottom: 10,
  },
  resGridCol: {},
  resGridLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5 * SCALE,
    color: '#6F6F6E',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resGridValue: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5 * SCALE,
    color: '#E0E0E0',
  },
  resOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B170C',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  resOfferText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#D4AF37',
  },
  resActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  cancelResBtn: {
    paddingVertical: 6,
  },
  cancelResText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#EF4444',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#3D2F12',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  directionsBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#A88733',
  },

  // ── 10. MODAL STYLES ─────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheetCard: {
    backgroundColor: '#0F0E0D',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: '#262218',
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1E1C',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19 * SCALE,
    color: '#FFFFFF',
  },
  modalVenueName: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13 * SCALE,
    color: '#D4AF37',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalSectionLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#8E8E8E',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  guestsScroll: {
    marginBottom: 8,
  },
  guestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#28251E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  guestPillActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  guestPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#8E8E8E',
  },
  guestPillTextActive: {
    color: '#000000',
  },
  datesScroll: {
    marginBottom: 8,
  },
  datePill: {
    alignItems: 'center',
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#28251E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    minWidth: 70,
  },
  datePillActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  dateDayText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#8E8E8E',
    marginBottom: 2,
  },
  dateDayTextActive: {
    color: '#000000',
  },
  dateMonthText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#6F6F6E',
  },
  dateMonthTextActive: {
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
  },
  slotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#28251E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  slotPillActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  slotText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#D4AF37',
  },
  slotTextActive: {
    color: '#000000',
  },
  seatingPill: {
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#28251E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  seatingPillActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  seatingText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#A88733',
  },
  seatingTextActive: {
    color: '#000000',
  },
  occPill: {
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#28251E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  occPillActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  occText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#A88733',
  },
  occTextActive: {
    color: '#000000',
  },
  modalFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1F1E1C',
    marginTop: 10,
  },
  confirmBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    height: 50,
  },
  confirmBookingBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#000000',
  },

  // ── 11. SUCCESS MODAL ────────────────────────────────────────────
  successCard: {
    backgroundColor: '#0F0E0D',
    borderWidth: 1,
    borderColor: '#3D2F12',
    borderRadius: 24,
    marginHorizontal: 24,
    padding: 24,
    alignItems: 'center',
  },
  successCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1B170C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 22 * SCALE,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  successSub: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5 * SCALE,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 18,
  },
  successDetailsBox: {
    width: '100%',
    backgroundColor: '#161514',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#747474',
  },
  successValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#FFFFFF',
  },
  successValueGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#D4AF37',
  },
  successValueGreen: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#4ADE80',
  },
  viewBookingsSuccessBtn: {
    width: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  viewBookingsSuccessBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5 * SCALE,
    color: '#000000',
  },
  doneSuccessBtn: {
    paddingVertical: 6,
  },
  doneSuccessBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#8E8E8E',
  },

  // ─── 1. Figma Hero Banner Card (Node 3080:293) ───────────────────
  figmaHeroBannerCard: {
    width: '100%',
    height: 188 * SCALE,
    borderRadius: 22 * SCALE,
    borderWidth: 1.2,
    borderColor: '#242018',
    backgroundColor: '#09090B',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 14 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  figmaHeroBgImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  figmaHeroContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '70%',
    paddingLeft: 18 * SCALE,
    paddingTop: 16 * SCALE,
    paddingBottom: 14 * SCALE,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  figmaHeroTitleGroup: {
    gap: 1 * SCALE,
  },
  figmaHeroTitleWhite: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 21 * SCALE,
    color: '#D4D4D8',
    lineHeight: 25 * SCALE,
    letterSpacing: -0.3,
  },
  figmaHeroTitleGold: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 21 * SCALE,
    color: '#DEA430',
    lineHeight: 25 * SCALE,
    letterSpacing: -0.3,
  },
  figmaHeroSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11.5 * SCALE,
    color: '#8A8A92',
    lineHeight: 15.5 * SCALE,
    marginTop: 3 * SCALE,
  },
  figmaHeroBtn: {
    backgroundColor: '#DEB13E',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 7 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6 * SCALE,
    shadowColor: '#DEB13E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  figmaHeroBtnText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 10.5 * SCALE,
    color: '#3B2909',
    letterSpacing: 0.4,
    marginRight: 4 * SCALE,
  },
  figmaHeroBtnArrow: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 13 * SCALE,
    color: '#3B2909',
    marginTop: -1,
  },
  figmaHeroDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5 * SCALE,
    marginTop: 6 * SCALE,
  },
  figmaHeroDot: {
    width: 5 * SCALE,
    height: 5 * SCALE,
    borderRadius: 2.5 * SCALE,
    backgroundColor: '#403B32',
  },
  figmaHeroDotActive: {
    width: 14 * SCALE,
    backgroundColor: '#DEA430',
  },

  // ─── 2. 4 Category Cards Grid (Node 3080:247-273) ────────────────
  figmaCatCardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12 * SCALE,
  },
  figmaCatCard: {
    flex: 1,
    height: 120 * SCALE,
    borderRadius: 18 * SCALE,
    borderWidth: 1.2,
    borderColor: '#1E1D22',
    backgroundColor: '#090A0B',
    paddingTop: 10 * SCALE,
    paddingHorizontal: 6 * SCALE,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 3 * SCALE,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  figmaCatCardHeader: {
    alignItems: 'center',
  },
  figmaCatCardTitleMuted: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#A3A3A3',
    lineHeight: 14 * SCALE,
  },
  figmaCatCardTitleGold: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 11.5 * SCALE,
    color: '#DEA430',
    lineHeight: 14 * SCALE,
  },
  figmaCatCardTitleWhite: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#B5B5B5',
    textAlign: 'center',
    lineHeight: 14 * SCALE,
  },
  figmaCatCardImg: {
    width: '100%',
    height: 58 * SCALE,
    marginBottom: 2 * SCALE,
  },

  // ─── 3. HDFC Bank Offer Ribbon (Node 3080:195) ───────────────────
  figmaBankRibbon: {
    backgroundColor: '#080808',
    borderRadius: 14 * SCALE,
    borderWidth: 1.2,
    borderColor: '#1A1A18',
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 9 * SCALE,
    marginBottom: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  figmaBankLogoBox: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#26262B',
    borderRadius: 8 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 4 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10 * SCALE,
  },
  figmaBankIcon: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    marginRight: 5 * SCALE,
  },
  figmaBankLogoText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 10.5 * SCALE,
    color: '#B1B1B1',
    letterSpacing: 0.3,
  },
  figmaBankTextWrap: {
    flex: 1,
  },
  figmaBankOfferText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11 * SCALE,
    color: '#717171',
    lineHeight: 15 * SCALE,
  },
  figmaBankOfferGold: {
    fontFamily: 'Urbanist-ExtraBold',
    color: '#DEA430',
  },

  // ─── 4. Flash Deal Zone Card (Node 3080:108) ─────────────────────
  figmaFlashDealCard: {
    height: 148 * SCALE,
    borderRadius: 22 * SCALE,
    borderWidth: 1.2,
    borderColor: '#262014',
    backgroundColor: '#080807',
    marginBottom: 16 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 14 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  figmaFlashDealBgImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  figmaFlashLeftCol: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  figmaFlashZoneBadge: {
    backgroundColor: '#080807',
    borderWidth: 1,
    borderColor: '#695C3A',
    borderRadius: 5 * SCALE,
    paddingHorizontal: 7 * SCALE,
    paddingVertical: 2.5 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  figmaFlashZoneIcon: {
    fontSize: 10 * SCALE,
    color: '#DEA430',
    marginRight: 4 * SCALE,
  },
  figmaFlashZoneText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 9.5 * SCALE,
    color: '#9A803F',
    letterSpacing: 0.5,
  },
  figmaFlashTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5 * SCALE,
    color: '#B4B4B4',
    lineHeight: 18 * SCALE,
    marginTop: 4 * SCALE,
  },
  figmaFlashSubtext: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 10.5 * SCALE,
    color: '#6B6B6B',
  },
  figmaGrabNowBtn: {
    backgroundColor: '#DEB13E',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 5.5 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  figmaGrabNowBtnText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 10.5 * SCALE,
    color: '#553F19',
    letterSpacing: 0.3,
    marginRight: 4 * SCALE,
  },
  figmaGrabNowBtnArrow: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 13 * SCALE,
    color: '#553F19',
    marginTop: -1,
  },
  figmaFlashRightCol: {
    width: 140 * SCALE,
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  figmaBrandCirclesCluster: {
    position: 'absolute',
    right: 22 * SCALE,
    top: 4 * SCALE,
    width: 100 * SCALE,
    height: 76 * SCALE,
  },
  figmaBrandCircleChaayos: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 22 * SCALE,
    backgroundColor: '#1E3B27',
    borderWidth: 1,
    borderColor: '#375C41',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  figmaChaayosText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8.5 * SCALE,
    color: '#B2BDAC',
  },
  figmaBrandCircleBeerCafe: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    borderRadius: 21 * SCALE,
    backgroundColor: '#0D0C07',
    borderWidth: 1,
    borderColor: '#F5BE38',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 6 * SCALE,
  },
  figmaBeerCafeText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 7.5 * SCALE,
    color: '#F5BE38',
    textAlign: 'center',
    lineHeight: 8.5 * SCALE,
  },
  figmaBrandCircleDelhi: {
    width: 40 * SCALE,
    height: 40 * SCALE,
    borderRadius: 20 * SCALE,
    backgroundColor: '#0C0C0E',
    borderWidth: 1,
    borderColor: '#2C2B32',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 20 * SCALE,
    bottom: 0,
  },
  figmaDelhiText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 6.5 * SCALE,
    color: '#8C8C8C',
    textAlign: 'center',
    lineHeight: 7.5 * SCALE,
  },
  figmaStartsAtBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#DEB13E',
    borderRadius: 16 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 5 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  figmaStartsAtLabel: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 7.5 * SCALE,
    color: '#624619',
    letterSpacing: 0.3,
  },
  figmaStartsAtPrice: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 20 * SCALE,
    color: '#211D15',
    lineHeight: 22 * SCALE,
    letterSpacing: -0.5,
  },

  // ─── 5. Yash Greeting & Mood Grid Styles ─────────────────────────
  yashSectionContainer: {
    marginTop: 8 * SCALE,
    marginBottom: 16 * SCALE,
    paddingHorizontal: 3 * SCALE,
  },
  yashGreetingText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 18 * SCALE,
    color: '#FFFFFF',
    marginBottom: 14 * SCALE,
    letterSpacing: -0.2,
  },
  yashNameGold: {
    color: '#DEA430',
  },
  topTwoBannersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12 * SCALE,
    gap: 8 * SCALE,
  },
  wideBannerCard: {
    flex: 1,
    height: 104 * SCALE,
    backgroundColor: '#090A0B',
    borderRadius: 18 * SCALE,
    borderWidth: 1.2,
    borderColor: '#1E1C22',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    paddingLeft: 14 * SCALE,
    paddingTop: 16 * SCALE,
    position: 'relative',
  },
  wideBannerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5 * SCALE,
    color: '#FFFFFF',
    lineHeight: 18 * SCALE,
    zIndex: 2,
  },
  wideBannerImg: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 95 * SCALE,
    height: 95 * SCALE,
    zIndex: 1,
  },
  moodGridContainer: {
    gap: 8 * SCALE,
  },
  moodGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8 * SCALE,
  },
  gridMoodCard: {
    flex: 1,
    height: 122 * SCALE,
    backgroundColor: '#090A0B',
    borderRadius: 16 * SCALE,
    borderWidth: 1.1,
    borderColor: '#1C1B20',
    overflow: 'hidden',
    justifyContent: 'space-between',
    paddingVertical: 10 * SCALE,
    paddingHorizontal: 6 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  gridMoodHeaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  gridMoodIcon: {
    marginBottom: 4 * SCALE,
  },
  gridMoodTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#D4D4D8',
    textAlign: 'center',
    lineHeight: 14 * SCALE,
  },
  gridMoodImg: {
    width: '105%',
    height: 48 * SCALE,
    borderRadius: 8 * SCALE,
    marginTop: 4 * SCALE,
    alignSelf: 'center',
  },

  // ─── 6. Top 10 Restaurants Carousel Styles ───────────────────────
  topRestaurantsSection: {
    marginBottom: 20 * SCALE,
  },
  topResHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12 * SCALE,
    paddingHorizontal: 4 * SCALE,
  },
  topResTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 17 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  topResViewAllText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#DEA430',
  },
  topResCarouselContainer: {
    paddingHorizontal: 4 * SCALE,
    gap: 12 * SCALE,
  },
  carouselResCard: {
    width: 254 * SCALE,
    backgroundColor: '#0A0A0C',
    borderRadius: 20 * SCALE,
    borderWidth: 1.2,
    borderColor: '#201D1A',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  resCardImgWrap: {
    width: '100%',
    height: 125 * SCALE,
    position: 'relative',
  },
  resCardImg: {
    width: '100%',
    height: '100%',
  },
  resAdBadge: {
    position: 'absolute',
    left: 10 * SCALE,
    top: 10 * SCALE,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 4 * SCALE,
    paddingHorizontal: 5 * SCALE,
    paddingVertical: 2 * SCALE,
  },
  resAdText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9 * SCALE,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  resHeartBadge: {
    position: 'absolute',
    right: 10 * SCALE,
    top: 10 * SCALE,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 14 * SCALE,
    width: 28 * SCALE,
    height: 28 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resCardInfo: {
    padding: 12 * SCALE,
    gap: 4 * SCALE,
  },
  resNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5 * SCALE,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 6 * SCALE,
  },
  resRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A9C4E',
    borderRadius: 6 * SCALE,
    paddingHorizontal: 6 * SCALE,
    paddingVertical: 3 * SCALE,
  },
  resRatingText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#FFFFFF',
  },
  resLocationText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11.5 * SCALE,
    color: '#8A8A92',
  },
  resCuisineCostText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11.5 * SCALE,
    color: '#6B6B6B',
  },
  resOfferTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6 * SCALE,
    borderTopWidth: 1,
    borderColor: '#1F1C18',
    paddingTop: 8 * SCALE,
  },
  resPercentBox: {
    backgroundColor: '#DEA430',
    borderRadius: 4 * SCALE,
    width: 15 * SCALE,
    height: 15 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6 * SCALE,
  },
  resPercentText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10 * SCALE,
    color: '#000000',
  },
  resOfferMainText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#DEA430',
    flex: 1,
  },
  resOfferExtraCount: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5 * SCALE,
    color: '#8E8E96',
    marginLeft: 6 * SCALE,
  },

  // ─── 7. Figma Filters Row Styles ─────────────────────────────────
  figmaFiltersScrollContainer: {
    paddingVertical: 12 * SCALE,
    gap: 8 * SCALE,
    paddingHorizontal: 4 * SCALE,
  },
  figmaFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090A0B',
    borderRadius: 14 * SCALE,
    borderWidth: 1.2,
    borderColor: '#24222A',
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 8 * SCALE,
    marginRight: 8 * SCALE,
  },
  figmaFilterPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#D4D4D8',
  },

  // ─── 8. Explore Heading Styles ───────────────────────────────────
  figmaExploreTitleSection: {
    marginTop: 10 * SCALE,
    marginBottom: 16 * SCALE,
    paddingHorizontal: 4 * SCALE,
  },
  figmaExploreMainTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 18 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 3 * SCALE,
  },
  figmaExploreCountGold: {
    color: '#DEA430',
  },
  figmaExploreSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12 * SCALE,
    color: '#71717A',
  },

  // ─── 9. Premium Restaurant Cards Styles ─────────────────────────
  figmaResCardContainer: {
    backgroundColor: '#090A0B',
    borderRadius: 22 * SCALE,
    borderWidth: 1.2,
    borderColor: '#1E1B22',
    overflow: 'hidden',
    marginBottom: 20 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  figmaResImgWrapper: {
    width: '100%',
    height: 200 * SCALE,
    position: 'relative',
  },
  figmaResCoverImg: {
    width: '100%',
    height: '100%',
  },
  figmaResHeartWrap: {
    position: 'absolute',
    right: 14 * SCALE,
    top: 14 * SCALE,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 18 * SCALE,
    width: 32 * SCALE,
    height: 32 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaCarouselDotsOverlay: {
    position: 'absolute',
    bottom: 12 * SCALE,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6 * SCALE,
  },
  figmaCarouselDot: {
    width: 6 * SCALE,
    height: 6 * SCALE,
    borderRadius: 3 * SCALE,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  figmaCarouselDotActive: {
    backgroundColor: '#DEA430',
    width: 8 * SCALE,
    height: 8 * SCALE,
    borderRadius: 4 * SCALE,
    marginTop: -1 * SCALE,
  },
  figmaResInfoBlock: {
    padding: 16 * SCALE,
    gap: 6 * SCALE,
  },
  figmaResTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4 * SCALE,
  },
  figmaResNameText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 18 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  figmaResRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#357A38',
    borderRadius: 8 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 4 * SCALE,
  },
  figmaResRatingValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#FFFFFF',
  },
  figmaResDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  figmaResDetailText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#A1A1AA',
  },
  figmaResDivider: {
    height: 1,
    backgroundColor: '#1E1B22',
    marginVertical: 10 * SCALE,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 1,
    borderColor: '#2D2833',
  },
  figmaResOfferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8 * SCALE,
  },
  figmaResGoldBadgePercent: {
    backgroundColor: '#DEA430',
    borderRadius: 50,
    width: 16 * SCALE,
    height: 16 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8 * SCALE,
  },
  figmaResGoldBadgePercentText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10 * SCALE,
    color: '#000000',
  },
  figmaResGoldBadgeRupee: {
    backgroundColor: '#DEA430',
    borderRadius: 50,
    width: 16 * SCALE,
    height: 16 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8 * SCALE,
  },
  figmaResGoldBadgeRupeeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10 * SCALE,
    color: '#000000',
  },
  figmaResOfferTitleText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13 * SCALE,
    color: '#E4E4E7',
    flex: 1,
  },
  figmaResOfferRightText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#DEA430',
  },
});
