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
} from 'lucide-react-native';

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

// ─── Direct Figma Asset Imports (Node 3019:288 - Pixel-identical to HomeScreen) ───
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
}) => {
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
        <View style={styles.header}>
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
              {/* ─── DINING MOODS ROW ─── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moodScrollContainer}
              >
              <TouchableOpacity
                style={[styles.moodPill, selectedMood === 'ALL' && styles.moodPillActive]}
                onPress={() => setSelectedMood('ALL')}
                activeOpacity={0.8}
              >
                <Flame size={14 * SCALE} color={selectedMood === 'ALL' ? '#000000' : '#A2883D'} style={{ marginRight: 6 }} />
                <Text style={[styles.moodText, selectedMood === 'ALL' && styles.moodTextActive]}>All Venues</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moodPill, selectedMood === 'LUXURY' && styles.moodPillActive]}
                onPress={() => setSelectedMood('LUXURY')}
                activeOpacity={0.8}
              >
                <Wine size={14 * SCALE} color={selectedMood === 'LUXURY' ? '#000000' : '#A2883D'} style={{ marginRight: 6 }} />
                <Text style={[styles.moodText, selectedMood === 'LUXURY' && styles.moodTextActive]}>Luxury Dining</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moodPill, selectedMood === 'BUFFET' && styles.moodPillActive]}
                onPress={() => setSelectedMood('BUFFET')}
                activeOpacity={0.8}
              >
                <Utensils size={14 * SCALE} color={selectedMood === 'BUFFET' ? '#000000' : '#A2883D'} style={{ marginRight: 6 }} />
                <Text style={[styles.moodText, selectedMood === 'BUFFET' && styles.moodTextActive]}>Buffet Specials</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moodPill, selectedMood === 'ROOFTOP' && styles.moodPillActive]}
                onPress={() => setSelectedMood('ROOFTOP')}
                activeOpacity={0.8}
              >
                <Sparkles size={14 * SCALE} color={selectedMood === 'ROOFTOP' ? '#000000' : '#A2883D'} style={{ marginRight: 6 }} />
                <Text style={[styles.moodText, selectedMood === 'ROOFTOP' && styles.moodTextActive]}>Rooftop & Bars</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moodPill, selectedMood === 'CAFE' && styles.moodPillActive]}
                onPress={() => setSelectedMood('CAFE')}
                activeOpacity={0.8}
              >
                <Coffee size={14 * SCALE} color={selectedMood === 'CAFE' ? '#000000' : '#A2883D'} style={{ marginRight: 6 }} />
                <Text style={[styles.moodText, selectedMood === 'CAFE' && styles.moodTextActive]}>Cafes & Brunch</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* ─── HERO DINEOUT SAVINGS BANNER ─── */}
            <View style={styles.heroPromoBanner}>
              <View style={styles.heroPromoLeft}>
                <View style={styles.heroPromoBadge}>
                  <Sparkles size={12 * SCALE} color="#000000" style={{ marginRight: 4 }} />
                  <Text style={styles.heroPromoBadgeText}>MYQURO DINEOUT PERKS</Text>
                </View>
                <Text style={styles.heroPromoTitle}>FLAT 40% OFF</Text>
                <Text style={styles.heroPromoSub}>ON TOTAL DINING BILLS</Text>
                <Text style={styles.heroPromoDesc}>Instant table confirmation & zero waiting time at premium venues</Text>
              </View>
              <View style={styles.heroPromoRight}>
                <Image source={figmaWineIcon} style={styles.heroWineIcon} />
              </View>
            </View>

            {/* ─── RESTAURANTS SECTION ─── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>FEATURED DINING VENUES</Text>
              <Text style={styles.sectionCountText}>{filteredVenues.length} places</Text>
            </View>

            {filteredVenues.map((venue) => {
              const isFav = favouriteRestaurantsList?.some((f) => f.id === venue.id);

              return (
                <View key={venue.id} style={styles.venueCard}>
                  {/* Venue Cover Image */}
                  <View style={styles.venueCoverWrap}>
                    <Image source={{ uri: venue.coverUrl }} style={styles.venueCoverImg} />
                    <View style={styles.venueOverlayGradient} />

                    {/* Top Badges */}
                    <View style={styles.venueTopBadges}>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>{venue.discountTag}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.favBtn}
                        activeOpacity={0.7}
                        onPress={() => toggleFavourite(venue.id)}
                      >
                        <Heart
                          size={16 * SCALE}
                          color={isFav ? '#FF4D4D' : '#FFFFFF'}
                          fill={isFav ? '#FF4D4D' : 'rgba(0,0,0,0.4)'}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Bottom Floating Info on Image */}
                    <View style={styles.venueFloatingBottom}>
                      <View style={styles.ratingPill}>
                        <Star size={12 * SCALE} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.ratingPillText}>{venue.rating}</Text>
                        <Text style={styles.ratingReviewsText}>({venue.reviewsCount})</Text>
                      </View>
                      <Text style={styles.distanceText}>{venue.distance}</Text>
                    </View>
                  </View>

                  {/* Venue Details */}
                  <View style={styles.venueDetailsWrap}>
                    <View style={styles.venueNameRow}>
                      <Text style={styles.venueNameText} numberOfLines={1}>
                        {venue.name}
                      </Text>
                      <Text style={styles.venueCostText}>{venue.costForTwo}</Text>
                    </View>

                    <Text style={styles.venueCuisineText} numberOfLines={1}>
                      {venue.cuisine}
                    </Text>

                    <View style={styles.venueLocRow}>
                      <MapPin size={12 * SCALE} color="#747474" style={{ marginRight: 4 }} />
                      <Text style={styles.venueLocText} numberOfLines={1}>
                        {venue.location}
                      </Text>
                    </View>

                    {/* Feature Chips */}
                    <View style={styles.featureChipsRow}>
                      {venue.features.map((feat, fIdx) => (
                        <View key={fIdx} style={styles.featureChip}>
                          <Text style={styles.featureChipText}>{feat}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.venueActionRow}>
                      <TouchableOpacity
                        style={styles.bookTableBtn}
                        activeOpacity={0.85}
                        onPress={() => handleOpenBooking(venue)}
                      >
                        <Calendar size={16 * SCALE} color="#000000" style={{ marginRight: 8 }} />
                        <Text style={styles.bookTableBtnText}>Book A Table</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuViewBtn}
                        activeOpacity={0.8}
                        onPress={() => onNavigateToRestaurant(venue.id)}
                      >
                        <Text style={styles.menuViewBtnText}>View Menu</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
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
          onNavigateToRestaurant(id);
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
});
