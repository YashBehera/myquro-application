import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Linking,
  Share,
  ToastAndroid,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  ChevronLeft,
  Heart,
  Maximize2,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Clock,
  Phone,
  Info,
  X,
  CheckCircle2,
  Calendar,
  Users,
  Sparkles,
  Percent,
  Plus,
  ArrowRight,
  Headphones,
  Image as ImageIcon,
  Receipt,
  Utensils,
  Share2,
} from 'lucide-react-native';
import Svg, {
  Polygon,
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViewModel } from '../state/MainViewModel';
import { OlaMapView } from '../components/OlaMapView';
import { BookTableScreen } from './BookTableScreen';
import { PayBillScreen } from './PayBillScreen';
import {
  SCALE,
  scale,
  moderateScale,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isTablet,
} from '../utils/responsive';

const quroBadgeImg = require('../assets/images/quro_badge.png');

interface DineoutRestaurantDetailScreenProps {
  restaurant: any;
  onBack: () => void;
  onBookTable?: (details: any) => void;
  onPayBill?: (amount: number) => void;
  onNavigateToRestaurant?: (id: string) => void;
  onNavigateToHelp?: () => void;
}

// ─── Custom Diamond Direction / Navigation GPS Icon ─────────────────────────
const DiamondDirectionIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#DEA430',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="12"
        y="1"
        width="15.5"
        height="15.5"
        rx="2"
        transform="rotate(45 12 1)"
        fill={color}
      />
      <Path
        d="M9.5 14.5V11C9.5 9.89543 10.3954 9 11.5 9H14.5M14.5 9L12.5 7M14.5 9L12.5 11"
        stroke="#000000"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── Custom Share / Upload Tray Icon ────────────────────────────────────────
const CustomShareIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#DEA430',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Path
        d="M12 15V4M12 4L7.5 8.5M12 4L16.5 8.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── Gold Hexagon Icon for DineCash ──────────────────────────────────────────
const DineCashHexagon: React.FC<{ size?: number }> = ({ size = 36 }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon
          points="50,4 92,26 92,74 50,96 8,74 8,26"
          fill="#1C180A"
          stroke="#DEA430"
          strokeWidth="6"
        />
        <Polygon
          points="50,13 84,30 84,70 50,87 16,70 16,30"
          fill="#251F0D"
          stroke="#DEA430"
          strokeWidth="2.5"
        />
        <SvgText
          x="50"
          y="63"
          textAnchor="middle"
          fontSize="48"
          fontWeight="bold"
          fill="#DEA430"
        >
          ₹
        </SvgText>
      </Svg>
    </View>
  );
};

// ─── Green Hexagon Icon for Cashback ────────────────────────────────────────
const GreenCashbackHexagon: React.FC<{ size?: number }> = ({ size = 34 }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon
          points="50,4 92,26 92,74 50,96 8,74 8,26"
          fill="#0D2E1C"
          stroke="#10B981"
          strokeWidth="6"
        />
        <Polygon
          points="50,13 84,30 84,70 50,87 16,70 16,30"
          fill="#064E2E"
          stroke="#10B981"
          strokeWidth="2"
        />
        <SvgText
          x="50"
          y="63"
          textAnchor="middle"
          fontSize="48"
          fontWeight="bold"
          fill="#10B981"
        >
          ₹
        </SvgText>
      </Svg>
    </View>
  );
};

// ─── Credit Card Svg Graphic ────────────────────────────────────────────────
const MiniCreditCardGraphic: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 40 28" fill="none">
      <Rect width="40" height="28" rx="4" fill="#202226" stroke="#3A3D44" strokeWidth="1" />
      <Rect x="0" y="5" width="40" height="5" fill="#141517" />
      <Rect x="4" y="14" width="8" height="6" rx="1.5" fill="#E5B842" />
      <Circle cx="30" cy="20" r="3.5" fill="#EB001B" fillOpacity="0.8" />
      <Circle cx="34" cy="20" r="3.5" fill="#F79E1B" fillOpacity="0.8" />
    </Svg>
  );
};

// ─── Golden Q Logo for "Restaurant Insights" ────────────────────────────────
const GoldenQIcon: React.FC<{ size?: number }> = ({ size = 18 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle
        cx="50"
        cy="46"
        r="34"
        stroke="#DEA430"
        strokeWidth="12"
        fill="transparent"
      />
      <Path
        d="M48 50L78 80"
        stroke="#DEA430"
        strokeWidth="14"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export const DineoutRestaurantDetailScreen: React.FC<DineoutRestaurantDetailScreenProps> = ({
  restaurant,
  onBack,
  onBookTable,
  onPayBill,
  onNavigateToRestaurant,
  onNavigateToHelp,
}) => {
  const insets = useSafeAreaInsets();
  const { favouriteRestaurantsList, toggleFavourite, allRestaurants } = useViewModel();

  // Scroll tracking state for sticky header title
  const [isScrolled, setIsScrolled] = useState(false);

  // Offers Tab: 'prebooking' | 'walkin'
  const [activeOffersTab, setActiveOffersTab] = useState<'prebooking' | 'walkin'>('prebooking');

  // Accordion Expand/Collapse States
  const [isFiveStarExpanded, setIsFiveStarExpanded] = useState(true);
  const [isNearExpanded, setIsNearExpanded] = useState(true);

  // Media & Modals
  const [isMuted, setIsMuted] = useState(true);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [dineCashModalVisible, setDineCashModalVisible] = useState(false);
  const [splitPayModalVisible, setSplitPayModalVisible] = useState(false);
  const [insightsModalVisible, setInsightsModalVisible] = useState(false);
  const [activeInsightQuestion, setActiveInsightQuestion] = useState<string | null>(null);

  // Booking Flow (Full Screen Dedicated View)
  const [isBookTableScreenOpen, setIsBookTableScreenOpen] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState<any | null>(null);

  // Pay Bill Flow (Full Screen Dedicated View)
  const [isPayBillScreenOpen, setIsPayBillScreenOpen] = useState(false);
  const [billAmount, setBillAmount] = useState('1500');
  const [splitMembers, setSplitMembers] = useState('4');
  const [paySuccessModal, setPaySuccessModal] = useState<any | null>(null);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Normalized restaurant data dynamically retrieved from restaurant object
  const restaurantName = restaurant?.name || '';
  const restaurantRating = restaurant?.rating
    ? typeof restaurant.rating === 'number'
      ? restaurant.rating.toFixed(1)
      : restaurant.rating
    : '4.8';
  const restaurantReviewCount = restaurant?.reviewsCount || (restaurant?.reviewCount ? `${restaurant.reviewCount}` : '100+');
  const restaurantDistance = restaurant?.distance
    ? typeof restaurant.distance === 'number'
      ? `${restaurant.distance.toFixed(1)} km`
      : restaurant.distance
    : 'Nearby';
  const restaurantLocation =
    restaurant?.location || restaurant?.address || '';
  const restaurantCuisine = restaurant?.cuisine || 'Multi-cuisine';
  const restaurantCost = restaurant?.costForTwo || '₹1,000 for two';
  const restaurantPhone = restaurant?.phone || '';

  const restaurantLat = restaurant?.latitude || 20.2520;
  const restaurantLng = restaurant?.longitude || 85.7950;

  const isFav = favouriteRestaurantsList?.some((f) => f.id === restaurant?.id);

  const restaurantCover =
    restaurant?.coverUrl ||
    restaurant?.image?.uri ||
    (typeof restaurant?.image === 'string' ? restaurant.image : '') ||
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80';

  // Dynamic gallery items
  const galleryItems = useMemo(() => {
    if (restaurant?.gallery && Array.isArray(restaurant.gallery) && restaurant.gallery.length > 0) {
      return restaurant.gallery.map((item: any, idx: number) => ({
        url: typeof item === 'string' ? item : item.url || restaurantCover,
        title: item.title || `${restaurantName} ${idx + 1}`,
      }));
    }
    const defaultPhotos = [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80',
    ];
    return [
      { url: restaurantCover || defaultPhotos[0], title: 'Grand Dining Hall' },
      { url: defaultPhotos[0], title: 'Warm Table Seating' },
      { url: defaultPhotos[1], title: 'Luxury Ambience' },
      { url: defaultPhotos[2], title: 'Signature Specialties' },
      { url: defaultPhotos[3], title: 'Chef Curations' },
      { url: defaultPhotos[4], title: 'Evening View' },
    ];
  }, [restaurant, restaurantCover, restaurantName]);

  // AI Prompt Pills
  const aiPromptPills = [
    { id: '1', icon: '💬', label: '"Food and reviews"' },
    { id: '2', icon: '✨', label: '"What\'s the vibe like?"' },
    { id: '3', icon: '🖼️', label: '"Show me real photos"' },
    { id: '4', icon: '🎵', label: '"Is there Live music?"' },
    { id: '5', icon: '🐼', label: '"and kid-friendly?"' },
    { id: '6', icon: '🕒', label: '"Is there Long wait?"' },
  ];

  // Amenities list
  const amenitiesList = [
    'Reservation available',
    'Parking available',
    'Free wifi',
    'MyQuroPay accepted',
    'Halal for meat',
    'Full bar available',
    'AC Dining Area',
  ];

  // Dynamic 5 Star Recommendations from real database
  const fiveStarList = useMemo(() => {
    const others = (allRestaurants || []).filter((r) => r.id !== restaurant?.id);
    const sorted = [...others].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return sorted.slice(0, 4).map((r) => {
      const imgUri = typeof r.image === 'string' ? r.image : (r.image as any)?.uri || restaurantCover;
      return {
        id: r.id,
        name: r.name,
        rating: r.rating ? (typeof r.rating === 'number' ? r.rating.toFixed(1) : r.rating) : '4.5',
        cuisine: r.cuisine || 'Multi-cuisine',
        distance: typeof r.distance === 'number' ? `${r.distance.toFixed(1)} km` : (r.distance || '1.0 km'),
        discount: 'FLAT 25% OFF',
        image: imgUri,
        isAd: false,
      };
    });
  }, [allRestaurants, restaurant?.id, restaurantCover]);

  // Dynamic Near Recommendations from real database
  const nearList = useMemo(() => {
    const others = (allRestaurants || []).filter((r) => r.id !== restaurant?.id);
    const sorted = [...others].sort((a, b) => (a.distance || 99) - (b.distance || 99));
    return sorted.slice(0, 4).map((r) => {
      const imgUri = typeof r.image === 'string' ? r.image : (r.image as any)?.uri || restaurantCover;
      return {
        id: r.id,
        name: r.name,
        rating: r.rating ? (typeof r.rating === 'number' ? r.rating.toFixed(1) : r.rating) : '4.5',
        cuisine: r.cuisine || 'Multi-cuisine',
        distance: typeof r.distance === 'number' ? `${r.distance.toFixed(1)} km` : (r.distance || '1.0 km'),
        discount: 'FLAT 20% OFF',
        image: imgUri,
      };
    });
  }, [allRestaurants, restaurant?.id, restaurantCover]);

  // Dynamic Date Options
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

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${restaurantName} on MyQuro Dineout! ${restaurantLocation}`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleDirections = () => {
    const query = encodeURIComponent(`${restaurantName} ${restaurantLocation}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    Linking.openURL(url as string).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${restaurantPhone}`).catch(() => {
      showToast(`Contact: ${restaurantPhone}`);
    });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > 180 && !isScrolled) {
      setIsScrolled(true);
    } else if (y <= 180 && isScrolled) {
      setIsScrolled(false);
    }
  };

  const handleOpenAIPrompt = (promptText: string) => {
    setActiveInsightQuestion(promptText);
    setInsightsModalVisible(true);
  };

  // If Book Table Screen is open -> Render full-screen dedicated BookTableScreen!
  if (isBookTableScreenOpen) {
    return (
      <BookTableScreen
        restaurant={restaurant}
        onBack={() => setIsBookTableScreenOpen(false)}
        onConfirmBooking={(bookingDetails) => {
          // Do NOT close BookTableScreen here — BookingConfirmationScreen renders
          // inside BookTableScreen and will call onBack (above) when the user taps "Done".
          if (onBookTable) {
            onBookTable(bookingDetails);
          }
        }}
      />
    );
  }

  // If Pay Bill Screen is open -> Render full-screen dedicated PayBillScreen!
  if (isPayBillScreenOpen) {
    return (
      <PayBillScreen
        restaurant={restaurant}
        onBack={() => setIsPayBillScreenOpen(false)}
        onPaymentSuccess={(paymentData) => {
          setIsPayBillScreenOpen(false);
          if (onPayBill) {
            onPayBill(paymentData.finalPaid);
          }
        }}
      />
    );
  }

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ══════════════════════════════════════════════════════════════════════
          [1] FLOATING TOP HEADER (FULL BLEED SAFE AREA AT Y=0)
          ══════════════════════════════════════════════════════════════════════ */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(insets.top, 12) + (isScrolled ? 6 * SCALE : 2 * SCALE),
          },
          isScrolled && styles.headerContainerScrolled,
        ]}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.circularHeaderBtn}
          activeOpacity={0.8}
          onPress={onBack}
        >
          <ChevronLeft size={22 * SCALE} color="#DEA430" />
        </TouchableOpacity>

        {/* Center: Restaurant Title & Address (Visible when scrolled) */}
        {isScrolled ? (
          <View style={styles.headerScrolledTitleCol}>
            <Text style={styles.headerScrolledTitle} numberOfLines={1}>
              {restaurantName}
            </Text>
            <Text style={styles.headerScrolledSubtitle} numberOfLines={1}>
              {restaurantLocation}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Right Actions: Heart + Custom Share */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.circularHeaderBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (restaurant?.id) {
                toggleFavourite(restaurant.id);
              }
              showToast(isFav ? 'Removed from favourites' : 'Added to favourites ❤️');
            }}
          >
            <Heart
              size={20 * SCALE}
              color="#DEA430"
              fill={isFav ? '#DEA430' : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circularHeaderBtn, { marginLeft: 10 * SCALE }]}
            activeOpacity={0.8}
            onPress={handleShare}
          >
            <CustomShareIcon size={19 * SCALE} color="#DEA430" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          [2] MAIN SCROLLABLE CONTENT (FULL BLEED TO Y=0)
          ══════════════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ─── Hero Media Container (Bottom Fades Into Black) ─── */}
        <View style={styles.heroMediaContainer}>
          {/* Sharp Hero Image */}
          <Image
            source={{ uri: galleryItems[activeMediaIndex]?.url || restaurantCover }}
            style={styles.heroMediaCover}
            resizeMode="cover"
          />

          {/* Top Gradient Vignette */}
          <Svg width="100%" height={120 * SCALE} style={styles.heroTopGrad}>
            <Defs>
              <SvgLinearGradient id="heroTopFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
                <Stop offset="50%" stopColor="#000000" stopOpacity="0.45" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#heroTopFade)" />
          </Svg>

          {/* Bottom Gradient: Fades image cleanly into black background */}
          <Svg width="100%" height={220 * SCALE} style={styles.heroBottomGrad}>
            <Defs>
              <SvgLinearGradient id="heroBottomFade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <Stop offset="55%" stopColor="#000000" stopOpacity="0.7" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#heroBottomFade)" />
          </Svg>

          {/* 2/6 Photos Pill Indicator */}
          <TouchableOpacity
            style={styles.photoCountPill}
            activeOpacity={0.85}
            onPress={() => setGalleryModalVisible(true)}
          >
            <ImageIcon size={13 * SCALE} color="#DEA430" style={{ marginRight: 4 }} />
            <Text style={styles.photoCountText}>2/6</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Floating Main Info Card (Directly Overlapping the Extended Blurred Hero Bottom) ─── */}
        <View style={styles.mainInfoCard}>
          <View style={styles.infoTopRow}>
            <View style={styles.nameLocationCol}>
              <Text style={styles.restaurantTitle} numberOfLines={2}>
                {restaurantName}
              </Text>

                {/* Distance & Location Dropdown */}
                <TouchableOpacity
                  style={styles.locationDropdownRow}
                  activeOpacity={0.8}
                  onPress={() => setInfoModalVisible(true)}
                >
                  <View style={styles.locationPinIcon}>
                    <MapPin size={13 * SCALE} color="#8E8E93" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationText}>
                      {restaurantDistance} • {restaurantLocation.split(',')[0] || restaurantLocation},
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                      <Text style={styles.locationTextSub}>
                        {restaurantLocation.split(',').slice(1).join(',').trim() || 'Dumduma, Bhubaneswar'}
                      </Text>
                      <ChevronDown size={14 * SCALE} color="#DEA430" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Rating Box */}
              <View style={styles.ratingCol}>
                <View style={styles.ratingBadgeBox}>
                  <Text style={styles.ratingScoreText}>{restaurantRating}</Text>
                  <Star
                    size={14 * SCALE}
                    color="#DEA430"
                    fill="#DEA430"
                    style={{ marginLeft: 4 }}
                  />
                </View>

                {/* Google Ratings */}
                <TouchableOpacity
                  style={styles.googleRatingRow}
                  activeOpacity={0.8}
                  onPress={() => setInfoModalVisible(true)}
                >
                  <View style={styles.googleLogoInline}>
                    <Text style={{ color: '#4285F4', fontFamily: 'Urbanist-Bold', fontSize: 11 * SCALE }}>G</Text>
                    <Text style={{ color: '#EA4335', fontFamily: 'Urbanist-Bold', fontSize: 11 * SCALE }}>o</Text>
                    <Text style={{ color: '#FBBC05', fontFamily: 'Urbanist-Bold', fontSize: 11 * SCALE }}>o</Text>
                    <Text style={{ color: '#4285F4', fontFamily: 'Urbanist-Bold', fontSize: 11 * SCALE }}>g</Text>
                    <Text style={{ color: '#34A853', fontFamily: 'Urbanist-Bold', fontSize: 11 * SCALE }}>l</Text>
                    <Text style={{ color: '#EA4335', fontFamily: 'Urbanist-Bold', fontSize: 11 * SCALE }}>e</Text>
                  </View>
                  <Text style={styles.ratingsCountText}>{restaurantReviewCount} ratings</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dottedDivider} />

            {/* Row 2: Dietary Badge + Cuisine & Cost */}
            <View style={styles.cuisineCostRow}>
              <View style={styles.dietaryBadge}>
                <View style={styles.dietaryDot} />
              </View>
              <Text style={styles.cuisineCostText}>
                {restaurantCuisine}  |  {restaurantCost}
              </Text>
            </View>

            {/* Row 3: Timings Pill + Diamond Direction + Phone */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.timingsPill}
                activeOpacity={0.8}
                onPress={() => setInfoModalVisible(true)}
              >
                <Clock size={16 * SCALE} color="#DEA430" style={{ marginRight: 6 }} />
                <Text style={styles.timingsTextGold}>Open </Text>
                <Text style={styles.timingsTextSub}>till 3PM</Text>
                <ChevronDown size={14 * SCALE} color="#DEA430" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSquareBtn}
                activeOpacity={0.8}
                onPress={handleDirections}
              >
                <DiamondDirectionIcon size={21 * SCALE} color="#DEA430" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSquareBtn}
                activeOpacity={0.8}
                onPress={handleCall}
              >
                <Phone size={18 * SCALE} color="#DEA430" />
              </TouchableOpacity>
            </View>
          </View>

        {/* ══════════════════════════════════════════════════════════════════════
            [3] "OFFERS FOR YOU" SECTION
            ══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.offersSectionWrapper}>
          <Text style={styles.offersSectionHeading}>Offers for you</Text>

          {/* Segmented Tabs: Pre-booking offers | Walk-in offers */}
          <View style={styles.segmentedTabsContainer}>
            <TouchableOpacity
              style={[
                styles.segmentedTabBtn,
                activeOffersTab === 'prebooking' && styles.segmentedTabBtnActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveOffersTab('prebooking')}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  activeOffersTab === 'prebooking' && styles.segmentedTabTextActive,
                ]}
              >
                Pre-booking offers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentedTabBtn,
                activeOffersTab === 'walkin' && styles.segmentedTabBtnActive,
              ]}
              activeOpacity={0.85}
              onPress={() => setActiveOffersTab('walkin')}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  activeOffersTab === 'walkin' && styles.segmentedTabTextActive,
                ]}
              >
                Walk-in offers
              </Text>
            </TouchableOpacity>
          </View>

          {/* Hero Promo Card: one EXCLUSIVE */}
          <View style={styles.heroPromoCard}>
            <View style={styles.promoWatermarkGraphic}>
              <Svg width={100 * SCALE} height={100 * SCALE} viewBox="0 0 100 100" opacity={0.12}>
                <Circle cx="50" cy="50" r="40" stroke="#DEA430" strokeWidth="8" />
                <Path d="M30 35L70 65M35 65L37 60M63 35L65 40" stroke="#DEA430" strokeWidth="6" strokeLinecap="round" />
              </Svg>
            </View>

            <View style={styles.promoHeaderBadgeRow}>
              <Image source={quroBadgeImg} style={styles.quroDineoutPromoImg} resizeMode="contain" />
              <Text style={styles.promoExclusiveText}> EXCLUSIVE</Text>
            </View>

            <TouchableOpacity
              style={styles.promoTitleRow}
              activeOpacity={0.85}
              onPress={() => setIsBookTableScreenOpen(true)}
            >
              <Text style={styles.promoMainTitle}>Flat 25% off on Weekends</Text>
              <ChevronRight size={18 * SCALE} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <Text style={styles.promoSubText}>
              with 1 Month at just <Text style={styles.promoGoldRupee}>₹1</Text>
            </Text>

            <View style={styles.promoCarouselDotsRow}>
              <View style={[styles.promoDot, styles.promoDotActive]} />
              <View style={styles.promoDot} />
              <View style={styles.promoDot} />
            </View>
          </View>

          {/* Plus Connector ⊕ */}
          <View style={styles.plusConnectorWrapper}>
            <View style={styles.plusConnectorCircle}>
              <Plus size={13 * SCALE} color="#DEA430" strokeWidth={2.5} />
            </View>
          </View>

          {/* 2 Side-by-Side Offer Cards */}
          <View style={styles.sideBySideRow}>
            <View style={styles.smallOfferCard}>
              <GreenCashbackHexagon size={32 * SCALE} />
              <View style={styles.smallOfferTextCol}>
                <Text style={styles.smallOfferTitle}>10% cashback</Text>
                <Text style={styles.smallOfferSub}>+ Use up to ₹200</Text>
              </View>
            </View>

            <View style={styles.centerSmallPlus}>
              <Text style={styles.centerSmallPlusText}>+</Text>
            </View>

            <View style={styles.smallOfferCard}>
              <MiniCreditCardGraphic size={30 * SCALE} />
              <View style={styles.smallOfferTextCol}>
                <Text style={styles.smallOfferTitle}>Cashback 10%*</Text>
                <Text style={styles.smallOfferSub} numberOfLines={1}>
                  MyQuro HDFC Bank...
                </Text>
                <View style={styles.miniCardDotsRow}>
                  <View style={[styles.miniDot, styles.miniDotActive]} />
                  <View style={styles.miniDot} />
                </View>
              </View>
            </View>
          </View>

          {/* "INTRODUCING Split Pay" Feature Card */}
          <TouchableOpacity
            style={styles.splitPayCard}
            activeOpacity={0.88}
            onPress={() => setSplitPayModalVisible(true)}
          >
            <View style={styles.splitPayLeftCol}>
              <Text style={styles.introducingLabel}>I N T R O D U C I N G</Text>
              <Text style={styles.splitPayTitle}>Split Pay</Text>
              <Text style={styles.splitPaySubText}>
                Split bill with friends{'\n'}minus the{' '}
                <Text style={styles.awkwardnessText}>awkwardness ›</Text>
              </Text>
            </View>

            <View style={styles.splitPayRightCol}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=800&auto=format&fit=crop&q=80',
                }}
                style={styles.splitPayIllustrationImg}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>

          {/* ══════════════════════════════════════════════════════════════════
              [4] "RESTAURANT INSIGHTS BY Q" WITH INTERACTIVE PILLS
              ══════════════════════════════════════════════════════════════════ */}
          <View style={styles.restaurantInsightsSection}>
            <View style={styles.insightsTitleRow}>
              <Text style={styles.insightsTitleText}>Restaurant insights by </Text>
              <GoldenQIcon size={18 * SCALE} />
            </View>
            <Text style={styles.insightsSubText}>
              Vibe. Food. Buzz. Powered by AI
            </Text>

            <View style={styles.aiPillsGrid}>
              {aiPromptPills.map((pill) => (
                <TouchableOpacity
                  key={pill.id}
                  style={styles.aiPromptPill}
                  activeOpacity={0.8}
                  onPress={() => handleOpenAIPrompt(pill.label)}
                >
                  <Text style={styles.aiPillEmoji}>{pill.icon}</Text>
                  <Text style={styles.aiPillLabel}>{pill.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.askQSearchPill}
              activeOpacity={0.85}
              onPress={() => handleOpenAIPrompt('Ask Q anything')}
            >
              <Sparkles size={16 * SCALE} color="#DEA430" style={{ marginRight: 6 }} />
              <Text style={styles.askQSearchText}>Ask Q anything...</Text>
            </TouchableOpacity>
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              [5] ORNAMENTAL DIVIDER: ☙ USEFUL BITS ❧
              ══════════════════════════════════════════════════════════════════ */}
          <View style={styles.usefulBitsDividerWrap}>
            <View style={styles.flourishLine} />
            <Text style={styles.flourishOrnament}>☙</Text>
            <Text style={styles.usefulBitsText}> USEFUL BITS </Text>
            <Text style={styles.flourishOrnament}>❧</Text>
            <View style={styles.flourishLine} />
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              [6] "MENUS TAILORED FOR YOUR TASTE" CARD
              ══════════════════════════════════════════════════════════════════ */}
          <View style={styles.menusTailoredCard}>
            <Image
              source={{ uri: restaurantCover }}
              style={styles.menusTailoredBgImg}
              resizeMode="cover"
            />
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="menuCardGrad" x1="0%" y1="0%" x2="80%" y2="0%">
                  <Stop offset="0%" stopColor="#0A0A0A" stopOpacity="0.95" />
                  <Stop offset="55%" stopColor="#0A0A0A" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#0A0A0A" stopOpacity="0.2" />
                </SvgLinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#menuCardGrad)" />
            </Svg>

            <View style={styles.menusTailoredContent}>
              <Text style={styles.menusTailoredTitle}>
                Menus tailored{'\n'}for your taste
              </Text>
              <TouchableOpacity
                style={styles.exploreMenusBtn}
                activeOpacity={0.85}
                onPress={() => setGalleryModalVisible(true)}
              >
                <Text style={styles.exploreMenusBtnText}>View Menu</Text>
                <ChevronRight size={14 * SCALE} color="#000000" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              [7] PHOTOS SECTION (ASYMMETRIC GRID WITH +3 OVERLAY)
              ══════════════════════════════════════════════════════════════════ */}
          <View style={styles.photosSectionWrapper}>
            <Text style={styles.photosSectionTitle}>Photos</Text>

            <View style={styles.photosGridContainer}>
              <View style={styles.photosTopRow}>
                <TouchableOpacity
                  style={styles.photoLargeLeft}
                  activeOpacity={0.9}
                  onPress={() => {
                    setActiveMediaIndex(0);
                    setGalleryModalVisible(true);
                  }}
                >
                  <Image source={{ uri: galleryItems[0]?.url || restaurantCover }} style={styles.fullImg} resizeMode="cover" />
                </TouchableOpacity>

                <View style={styles.photosRightCol}>
                  <TouchableOpacity
                    style={styles.photoRightItem}
                    activeOpacity={0.9}
                    onPress={() => {
                      setActiveMediaIndex(1);
                      setGalleryModalVisible(true);
                    }}
                  >
                    <Image source={{ uri: galleryItems[1]?.url || restaurantCover }} style={styles.fullImg} resizeMode="cover" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.photoRightItem, { marginTop: 6 * SCALE }]}
                    activeOpacity={0.9}
                    onPress={() => {
                      setActiveMediaIndex(2);
                      setGalleryModalVisible(true);
                    }}
                  >
                    <Image source={{ uri: galleryItems[2]?.url || restaurantCover }} style={styles.fullImg} resizeMode="cover" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.photosBottomRow}>
                <TouchableOpacity
                  style={styles.photoBottomItem}
                  activeOpacity={0.9}
                  onPress={() => {
                    setActiveMediaIndex(3);
                    setGalleryModalVisible(true);
                  }}
                >
                  <Image source={{ uri: galleryItems[3]?.url || restaurantCover }} style={styles.fullImg} resizeMode="cover" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoBottomItem}
                  activeOpacity={0.9}
                  onPress={() => {
                    setActiveMediaIndex(4);
                    setGalleryModalVisible(true);
                  }}
                >
                  <Image source={{ uri: galleryItems[4]?.url || restaurantCover }} style={styles.fullImg} resizeMode="cover" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoBottomItem}
                  activeOpacity={0.9}
                  onPress={() => {
                    setActiveMediaIndex(5);
                    setGalleryModalVisible(true);
                  }}
                >
                  <Image source={{ uri: galleryItems[5]?.url || restaurantCover }} style={styles.fullImg} resizeMode="cover" />
                  <View style={styles.photoOverlayBadge}>
                    <Text style={styles.photoOverlayText}>+3</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              [8] AMENITIES SECTION
              ══════════════════════════════════════════════════════════════════ */}
          <View style={styles.amenitiesSectionWrapper}>
            <Text style={styles.amenitiesSectionTitle}>Amenities ({amenitiesList.length})</Text>

            <View style={styles.amenitiesGrid}>
              {amenitiesList.map((amenity, idx) => (
                <View key={idx} style={styles.amenityBox}>
                  <Star size={16 * SCALE} color="#DEA430" style={{ marginRight: 8 }} />
                  <Text style={styles.amenityText} numberOfLines={1}>
                    {amenity}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              [9] LOCATION WITH REAL OLA MAPS API INTEGRATION
              ══════════════════════════════════════════════════════════════════ */}
          <View style={styles.locationSectionWrapper}>
            <Text style={styles.locationSectionTitle}>Location</Text>

            {/* Real Ola Maps API Embedded MapView */}
            <View style={styles.olaMapContainerBox}>
              <OlaMapView
                initialLatitude={restaurantLat}
                initialLongitude={restaurantLng}
                initialZoom={15.5}
                showCenterMarker={true}
                showLocateMeButton={false}
                style={styles.olaMapViewInstance}
              />
            </View>

            <TouchableOpacity
              style={styles.locationAddressRow}
              activeOpacity={0.8}
              onPress={handleDirections}
            >
              <MapPin size={15 * SCALE} color="#DEA430" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.locationFullAddressText}>
                {restaurantDistance} • {restaurantLocation}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              [10] "HAVE QUERIES OR NEED HELP?" CARD
              ══════════════════════════════════════════════════════════════════ */}
          <TouchableOpacity
            style={styles.helpSupportCard}
            activeOpacity={0.85}
            onPress={() => {
              if (onNavigateToHelp) {
                onNavigateToHelp();
              } else {
                handleCall();
              }
            }}
          >
            <Headphones size={24 * SCALE} color="#DEA430" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.helpSupportTitle}>Have queries or need help with something?</Text>
              <Text style={styles.helpSupportLink}>View help & support</Text>
            </View>
            <ChevronRight size={18 * SCALE} color="#DEA430" />
          </TouchableOpacity>

          {/* ══════════════════════════════════════════════════════════════════
              [11] ACCORDIONS: RECOMMENDATIONS
              ══════════════════════════════════════════════════════════════════ */}
          <View style={styles.accordionContainer}>
            <TouchableOpacity
              style={styles.accordionHeaderRow}
              activeOpacity={0.8}
              onPress={() => setIsFiveStarExpanded(!isFiveStarExpanded)}
            >
              <Text style={styles.accordionTitle}>Recommended options in 5 Star</Text>
              {isFiveStarExpanded ? (
                <ChevronUp size={18 * SCALE} color="#FFFFFF" />
              ) : (
                <ChevronDown size={18 * SCALE} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {isFiveStarExpanded && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalResScroll}>
                {fiveStarList.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recCard}
                    activeOpacity={0.9}
                    onPress={() => onNavigateToRestaurant && onNavigateToRestaurant(item.id)}
                  >
                    <View style={styles.recImgWrap}>
                      <Image source={{ uri: item.image }} style={styles.fullImg} resizeMode="cover" />
                      {item.isAd && (
                        <View style={styles.recAdBadge}>
                          <Text style={styles.recAdText}>AD</Text>
                        </View>
                      )}
                      <View style={styles.recHeartBadge}>
                        <Heart size={14 * SCALE} color="#FFFFFF" />
                      </View>
                      <View style={styles.recDiscountPill}>
                        <Text style={styles.recDiscountText}>{item.discount}</Text>
                      </View>
                    </View>
                    <Text style={styles.recNameText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.recMetaRow}>
                      <Star size={11 * SCALE} color="#10B981" fill="#10B981" style={{ marginRight: 3 }} />
                      <Text style={styles.recRatingText}>{item.rating} • {item.cuisine}</Text>
                    </View>
                    <Text style={styles.recDistText}>{item.distance}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.accordionContainer}>
            <TouchableOpacity
              style={styles.accordionHeaderRow}
              activeOpacity={0.8}
              onPress={() => setIsNearExpanded(!isNearExpanded)}
            >
              <Text style={styles.accordionTitle}>Near {restaurantName}</Text>
              {isNearExpanded ? (
                <ChevronUp size={18 * SCALE} color="#FFFFFF" />
              ) : (
                <ChevronDown size={18 * SCALE} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            {isNearExpanded && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalResScroll}>
                {nearList.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recCard}
                    activeOpacity={0.9}
                    onPress={() => onNavigateToRestaurant && onNavigateToRestaurant(item.id)}
                  >
                    <View style={styles.recImgWrap}>
                      <Image source={{ uri: item.image }} style={styles.fullImg} resizeMode="cover" />
                      <View style={styles.recHeartBadge}>
                        <Heart size={14 * SCALE} color="#FFFFFF" />
                      </View>
                      <View style={styles.recDiscountPill}>
                        <Text style={styles.recDiscountText}>{item.discount}</Text>
                      </View>
                    </View>
                    <Text style={styles.recNameText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.recMetaRow}>
                      <Star size={11 * SCALE} color="#10B981" fill="#10B981" style={{ marginRight: 3 }} />
                      <Text style={styles.recRatingText}>{item.rating} • {item.cuisine}</Text>
                    </View>
                    <Text style={styles.recDistText}>{item.distance}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* ─── DineCash Promo Banner Card ─── */}
        <TouchableOpacity
          style={styles.dineCashCard}
          activeOpacity={0.85}
          onPress={() => setDineCashModalVisible(true)}
        >
          <DineCashHexagon size={36 * SCALE} />
          <Text style={styles.dineCashText}>
            Use up to ₹200 DineCash + Earn 10% more
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setDineCashModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Info size={18 * SCALE} color="#666666" />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Spacing for sticky bottom action bar */}
        <View style={{ height: 110 * SCALE }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          [12] FIXED BOTTOM STICKY ACTION BAR (BLACK & GOLD, NO ICONS)
          ══════════════════════════════════════════════════════════════════════ */}
      <View
        style={[
          styles.bottomStickyBar,
          { paddingBottom: Math.max(insets.bottom, 14) + 2 },
        ]}
      >
        {/* Left Action: Book a table (No Icon) */}
        <TouchableOpacity
          style={styles.bookTableBtn}
          activeOpacity={0.85}
          onPress={() => setIsBookTableScreenOpen(true)}
        >
          <Text style={styles.bookTableText}>Book a table</Text>
        </TouchableOpacity>

        {/* Right Action: Pay bill now (No Icon) */}
        <TouchableOpacity
          style={styles.payBillBtn}
          activeOpacity={0.85}
          onPress={() => setIsPayBillScreenOpen(true)}
        >
          <Text style={styles.payBillText}>Pay bill now</Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          [13] MODAL: SPLIT PAY CALCULATOR
          ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={splitPayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSplitPayModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Split Pay</Text>
                <Text style={styles.modalSheetSub}>Split the dining bill with friends effortlessly</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSplitPayModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20 * SCALE} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.splitPayInputWrap}>
              <Text style={styles.splitPayInputLabel}>Total Dining Bill Amount</Text>
              <View style={styles.billInputContainer}>
                <Text style={styles.billInputPrefix}>₹</Text>
                <TextInput
                  style={styles.billAmountInput}
                  value={billAmount}
                  onChangeText={setBillAmount}
                  keyboardType="numeric"
                  placeholder="1500"
                  placeholderTextColor="#666666"
                />
              </View>
            </View>

            <View style={styles.splitPayInputWrap}>
              <Text style={styles.splitPayInputLabel}>Number of People Splitting</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPillsScroll}>
                {['2', '3', '4', '5', '6', '8', '10'].map((num) => {
                  const isSelected = splitMembers === num;
                  return (
                    <TouchableOpacity
                      key={num}
                      style={[styles.pillOption, isSelected && styles.pillOptionActive]}
                      onPress={() => setSplitMembers(num)}
                    >
                      <Users size={13 * SCALE} color={isSelected ? '#000000' : '#DEA430'} style={{ marginRight: 4 }} />
                      <Text style={[styles.pillOptionText, isSelected && styles.pillOptionTextActive]}>
                        {num} People
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.splitPerPersonCard}>
              <Text style={styles.splitPerPersonLabel}>Each person pays</Text>
              <Text style={styles.splitPerPersonAmount}>
                ₹{(Math.max(0, (parseFloat(billAmount || '0') || 0) * 0.85) / (parseInt(splitMembers, 10) || 1)).toFixed(2)}
              </Text>
              <Text style={styles.splitPerPersonSavings}>
                Includes 15% instant DineCash discount!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              activeOpacity={0.85}
              onPress={() => {
                setSplitPayModalVisible(false);
                setIsPayBillScreenOpen(true);
              }}
            >
              <Text style={styles.modalSubmitBtnText}>Proceed to Split Pay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          [14] MODAL: AI RESTAURANT INSIGHTS & PROMPTS
          ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={insightsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInsightsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GoldenQIcon size={22 * SCALE} />
                <Text style={[styles.modalSheetTitle, { marginLeft: 8 }]}>
                  {activeInsightQuestion || 'AI Restaurant Insights'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setInsightsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20 * SCALE} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.detailInfoTitle}>🔥 Vibe & Ambience Score</Text>
              <Text style={styles.detailInfoVal}>
                9.8 / 10 • Dim luxury lighting, live charcoal grill, intimate seating with signature aromas.
              </Text>
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.detailInfoTitle}>🍽️ Chef's Must-Try Recommendations</Text>
              <Text style={styles.detailInfoVal}>
                • Galouti Kebab with Ulte Tawe ka Paratha{'\n'}
                • Slow-cooked Dal Bukhara (simmered for 18 hours){'\n'}
                • Kakori Kebab & Murgh Malai Tikka
              </Text>
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.detailInfoTitle}>👥 Crowd & Best Occasions</Text>
              <Text style={styles.detailInfoVal}>
                Couples, Family Dining, Corporate Celebrations. Peak hours: 8:00 PM – 10:00 PM.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => setInsightsModalVisible(false)}
            >
              <Text style={styles.modalSubmitBtnText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Success Dialogs ─── */}
      <Modal visible={!!bookingSuccessModal} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={styles.successDialog}>
            <CheckCircle2 size={54 * SCALE} color="#4ADE80" />
            <Text style={styles.successDialogTitle}>Table Reserved!</Text>
            <Text style={styles.successDialogSub}>
              {bookingSuccessModal?.restaurantName}
            </Text>
            <View style={styles.successTicketBox}>
              <Text style={styles.successTicketText}>
                {bookingSuccessModal?.date} • {bookingSuccessModal?.time}
              </Text>
              <Text style={styles.successTicketHighlight}>
                {bookingSuccessModal?.tableNumber} ({bookingSuccessModal?.guests} Guests)
              </Text>
              <Text style={styles.successTicketDiscount}>
                🎁 {bookingSuccessModal?.discountApplied}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.successDialogBtn}
              onPress={() => setBookingSuccessModal(null)}
            >
              <Text style={styles.successDialogBtnText}>Awesome, Done!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!paySuccessModal} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={styles.successDialog}>
            <CheckCircle2 size={54 * SCALE} color="#DEA430" />
            <Text style={styles.successDialogTitle}>Bill Paid Successfully!</Text>
            <Text style={styles.successDialogSub}>
              {paySuccessModal?.restaurantName}
            </Text>
            <View style={styles.successTicketBox}>
              <Text style={styles.successTicketText}>
                Txn: {paySuccessModal?.txnId}
              </Text>
              <Text style={styles.successTicketHighlight}>
                Paid: ₹{paySuccessModal?.paid?.toFixed(2)} (Saved ₹{paySuccessModal?.discount?.toFixed(2)})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.successDialogBtn}
              onPress={() => setPaySuccessModal(null)}
            >
              <Text style={styles.successDialogBtnText}>View Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Gallery Lightbox Modal ─── */}
      <Modal visible={galleryModalVisible} transparent animationType="fade">
        <View style={styles.galleryModalContainer}>
          <View style={[styles.galleryHeader, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
            <Text style={styles.galleryTitle}>{restaurantName} Gallery</Text>
            <TouchableOpacity onPress={() => setGalleryModalVisible(false)} style={styles.modalCloseBtn}>
              <X size={22 * SCALE} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.galleryGrid}>
            {galleryItems.map((item: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={styles.galleryItemBox}
                activeOpacity={0.9}
                onPress={() => {
                  setActiveMediaIndex(idx);
                  setGalleryModalVisible(false);
                }}
              >
                <Image source={{ uri: item?.url || restaurantCover }} style={styles.fullImg} resizeMode="cover" />
                <View style={styles.galleryLabelOverlay}>
                  <Text style={styles.galleryItemLabel}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ─── DineCash Benefits Info Modal ─── */}
      <Modal visible={dineCashModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <DineCashHexagon size={30 * SCALE} />
                <Text style={[styles.modalSheetTitle, { marginLeft: 10 }]}>MyQuro DineCash</Text>
              </View>
              <TouchableOpacity onPress={() => setDineCashModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20 * SCALE} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoFeatureCard}>
              <Percent size={20 * SCALE} color="#DEA430" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoFeatureTitle}>Instant Flat Savings</Text>
                <Text style={styles.infoFeatureDesc}>
                  Save up to ₹200 instantly on every dine-in bill payment at participating luxury partners.
                </Text>
              </View>
            </View>

            <View style={styles.infoFeatureCard}>
              <Sparkles size={20 * SCALE} color="#DEA430" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoFeatureTitle}>Earn 10% DineCash Back</Text>
                <Text style={styles.infoFeatureDesc}>
                  Get 10% of your bill credited directly back to your MyQuro DineCash wallet.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => setDineCashModalVisible(false)}
            >
              <Text style={styles.modalSubmitBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Restaurant Timings & Features Modal ─── */}
      <Modal visible={infoModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalSheetTitle}>About & Operating Hours</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.modalCloseBtn}>
                <X size={20 * SCALE} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.detailInfoTitle}>Address</Text>
              <Text style={styles.detailInfoVal}>{restaurantLocation}</Text>
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.detailInfoTitle}>Hours of Operation</Text>
              <Text style={styles.detailInfoVal}>Lunch: 12:30 PM – 03:30 PM</Text>
              <Text style={styles.detailInfoVal}>Dinner: 07:00 PM – 11:30 PM</Text>
            </View>

            <View style={styles.detailInfoBox}>
              <Text style={styles.detailInfoTitle}>Features</Text>
              <Text style={styles.detailInfoVal}>• Valet Parking Available</Text>
              <Text style={styles.detailInfoVal}>• Full Bar & Signature Cocktails</Text>
              <Text style={styles.detailInfoVal}>• Live Kitchen & Private Dining</Text>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.modalSubmitBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── LUXURY BLACK & GOLD STYLES (MATCHING MYQURO BRAND SYSTEM) ───────────────
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullImg: {
    width: '100%',
    height: '100%',
  },

  // ─── Floating Top Header Over Hero ───
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 8 * SCALE,
    zIndex: 30,
  },
  headerContainerScrolled: {
    backgroundColor: '#000000',
    paddingBottom: 10 * SCALE,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  headerScrolledTitleCol: {
    flex: 1,
    paddingHorizontal: 12 * SCALE,
  },
  headerScrolledTitle: {
    color: '#FFFFFF',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  headerScrolledSubtitle: {
    color: '#8E8E93',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 1,
  },
  circularHeaderBtn: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    borderRadius: 21 * SCALE,
    backgroundColor: 'rgba(18, 18, 18, 0.65)',
    borderWidth: 1.2,
    borderColor: '#4A3B18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ─── Scroll Content ───
  scrollContent: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollInner: {
    paddingBottom: 20 * SCALE,
  },

  // ─── Hero Media (Image fades cleanly into black at bottom) ───
  heroMediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.02,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  heroMediaCover: {
    width: '100%',
    height: '100%',
  },
  heroTopGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroBottomGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  photoCountPill: {
    position: 'absolute',
    bottom: 126 * SCALE,
    right: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    borderWidth: 1,
    borderColor: '#4A3B18',
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 5 * SCALE,
    borderRadius: 8 * SCALE,
    zIndex: 10,
  },
  photoCountText: {
    color: '#DEA430',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Floating Main Info Card (Luxury Black & Gold) ───
  mainInfoCard: {
    backgroundColor: '#121212',
    borderRadius: 20 * SCALE,
    borderWidth: 1.2,
    borderColor: '#3A2E12',
    marginHorizontal: 12 * SCALE,
    marginTop: -110 * SCALE, // Shifted upwards over the hero photo
    padding: 16 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 15,
  },
  infoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameLocationCol: {
    flex: 1,
    paddingRight: 8 * SCALE,
  },
  restaurantTitle: {
    color: '#FFFFFF',
    fontSize: 22 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  ratingCol: {
    alignItems: 'flex-end',
  },
  ratingBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1A10',
    borderWidth: 1.2,
    borderColor: '#4A3B18',
    borderRadius: 8 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 5 * SCALE,
  },
  ratingScoreText: {
    color: '#FFFFFF',
    fontSize: 17 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  googleRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5 * SCALE,
  },
  googleLogoInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4 * SCALE,
  },
  ratingsCountText: {
    color: '#8E8E93',
    fontSize: 11.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  locationDropdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8 * SCALE,
  },
  locationPinIcon: {
    marginRight: 4 * SCALE,
    marginTop: 2 * SCALE,
  },
  locationText: {
    color: '#9E9E9E',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 18 * SCALE,
  },
  locationTextSub: {
    color: '#9E9E9E',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  dottedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 14 * SCALE,
  },
  cuisineCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dietaryBadge: {
    width: 15 * SCALE,
    height: 15 * SCALE,
    borderRadius: 3 * SCALE,
    borderWidth: 1.2,
    borderColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8 * SCALE,
  },
  dietaryDot: {
    width: 6 * SCALE,
    height: 6 * SCALE,
    borderRadius: 3 * SCALE,
    backgroundColor: '#DEA430',
  },
  cuisineCostText: {
    color: '#B0B0B0',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14 * SCALE,
    gap: 10 * SCALE,
  },
  timingsPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 12 * SCALE,
    height: 44 * SCALE,
  },
  timingsTextGold: {
    color: '#DEA430',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  timingsTextSub: {
    color: '#9E9E9E',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  actionSquareBtn: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── "Offers for you" Section ───
  offersSectionWrapper: {
    marginTop: 18 * SCALE,
  },
  offersSectionHeading: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginHorizontal: 16 * SCALE,
    marginBottom: 12 * SCALE,
  },
  segmentedTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 24 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 14 * SCALE,
    padding: 4 * SCALE,
  },
  segmentedTabBtn: {
    flex: 1,
    paddingVertical: 10 * SCALE,
    borderRadius: 20 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabBtnActive: {
    backgroundColor: '#181818',
    borderWidth: 1.2,
    borderColor: '#4A3B18',
  },
  segmentedTabText: {
    color: '#8E8E93',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  segmentedTabTextActive: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Hero Promo Card: one EXCLUSIVE ───
  heroPromoCard: {
    backgroundColor: '#141414',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 14 * SCALE,
    marginTop: 12 * SCALE,
    padding: 18 * SCALE,
    position: 'relative',
    overflow: 'hidden',
  },
  promoWatermarkGraphic: {
    position: 'absolute',
    left: 4 * SCALE,
    bottom: -10 * SCALE,
    zIndex: 1,
  },
  promoHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10 * SCALE,
  },
  quroDineoutPromoImg: {
    width: 50 * SCALE,
    height: 17 * SCALE,
    marginRight: 4 * SCALE,
  },
  promoExclusiveText: {
    color: '#CCCCCC',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  promoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  promoMainTitle: {
    color: '#FFFFFF',
    fontSize: 20 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  promoSubText: {
    color: '#CCCCCC',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    marginTop: 6 * SCALE,
    zIndex: 2,
  },
  promoGoldRupee: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    fontSize: 15 * SCALE,
  },
  promoCarouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14 * SCALE,
    gap: 6 * SCALE,
  },
  promoDot: {
    width: 6 * SCALE,
    height: 6 * SCALE,
    borderRadius: 3 * SCALE,
    backgroundColor: '#333333',
  },
  promoDotActive: {
    backgroundColor: '#DEA430',
  },

  // ─── Connector Plus ⊕ ───
  plusConnectorWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -8 * SCALE,
    zIndex: 10,
  },
  plusConnectorCircle: {
    width: 22 * SCALE,
    height: 22 * SCALE,
    borderRadius: 11 * SCALE,
    backgroundColor: '#1E1A10',
    borderWidth: 1.2,
    borderColor: '#4A3B18',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Side-by-Side Offer Cards ───
  sideBySideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14 * SCALE,
    gap: 6 * SCALE,
  },
  smallOfferCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 16 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallOfferTextCol: {
    flex: 1,
    marginLeft: 8 * SCALE,
  },
  smallOfferTitle: {
    color: '#FFFFFF',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  smallOfferSub: {
    color: '#8E8E93',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  centerSmallPlus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSmallPlusText: {
    color: '#8E8E93',
    fontSize: 14 * SCALE,
    fontWeight: '600',
  },
  miniCardDotsRow: {
    flexDirection: 'row',
    gap: 4 * SCALE,
    marginTop: 4 * SCALE,
  },
  miniDot: {
    width: 4 * SCALE,
    height: 4 * SCALE,
    borderRadius: 2 * SCALE,
    backgroundColor: '#333333',
  },
  miniDotActive: {
    backgroundColor: '#DEA430',
  },

  // ─── "INTRODUCING Split Pay" Feature Card ───
  splitPayCard: {
    backgroundColor: '#121212',
    borderRadius: 18 * SCALE,
    borderWidth: 1.2,
    borderColor: 'rgba(222, 164, 48, 0.35)',
    marginHorizontal: 14 * SCALE,
    marginTop: 14 * SCALE,
    padding: 16 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  splitPayLeftCol: {
    flex: 1.1,
    paddingRight: 8 * SCALE,
  },
  introducingLabel: {
    color: '#DEA430',
    fontSize: 10 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 2,
  },
  splitPayTitle: {
    color: '#FFFFFF',
    fontSize: 22 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginVertical: 4 * SCALE,
  },
  splitPaySubText: {
    color: '#CCCCCC',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 17 * SCALE,
  },
  awkwardnessText: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  splitPayRightCol: {
    flex: 0.9,
    height: 100 * SCALE,
    borderRadius: 12 * SCALE,
    overflow: 'hidden',
  },
  splitPayIllustrationImg: {
    width: '100%',
    height: '100%',
  },

  // ─── "Restaurant insights by Q" ───
  restaurantInsightsSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20 * SCALE,
    marginHorizontal: 14 * SCALE,
  },
  insightsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsTitleText: {
    color: '#FFFFFF',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  insightsSubText: {
    color: '#8E8E93',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginTop: 4 * SCALE,
  },
  aiPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8 * SCALE,
    marginTop: 14 * SCALE,
  },
  aiPromptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 9 * SCALE,
  },
  aiPillEmoji: {
    fontSize: 12 * SCALE,
    marginRight: 6 * SCALE,
  },
  aiPillLabel: {
    color: '#D1D5DB',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  askQSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16140E',
    borderWidth: 1.2,
    borderColor: '#4A3B18',
    borderRadius: 24 * SCALE,
    width: '100%',
    paddingVertical: 12 * SCALE,
    marginTop: 14 * SCALE,
  },
  askQSearchText: {
    color: '#DEA430',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Ornamental Flourish Divider ───
  usefulBitsDividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20 * SCALE,
    paddingHorizontal: 20 * SCALE,
  },
  flourishLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A2E12',
  },
  flourishOrnament: {
    color: '#DEA430',
    fontSize: 16 * SCALE,
    marginHorizontal: 6 * SCALE,
  },
  usefulBitsText: {
    color: '#DEA430',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 2,
  },

  // ─── Menus Tailored Card ───
  menusTailoredCard: {
    backgroundColor: '#121212',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: '#4A3B18',
    marginHorizontal: 14 * SCALE,
    height: 150 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 18 * SCALE,
  },
  menusTailoredBgImg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
  },
  menusTailoredContent: {
    zIndex: 2,
    maxWidth: '60%',
  },
  menusTailoredTitle: {
    color: '#FFFFFF',
    fontSize: 20 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    lineHeight: 24 * SCALE,
  },
  exploreMenusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 18 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 7 * SCALE,
    marginTop: 12 * SCALE,
    alignSelf: 'flex-start',
  },
  exploreMenusBtnText: {
    color: '#000000',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Photos Section ───
  photosSectionWrapper: {
    marginTop: 22 * SCALE,
    marginHorizontal: 14 * SCALE,
  },
  photosSectionTitle: {
    color: '#FFFFFF',
    fontSize: 19 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 12 * SCALE,
  },
  photosGridContainer: {
    gap: 6 * SCALE,
  },
  photosTopRow: {
    flexDirection: 'row',
    height: 170 * SCALE,
    gap: 6 * SCALE,
  },
  photoLargeLeft: {
    flex: 1.3,
    borderRadius: 14 * SCALE,
    overflow: 'hidden',
  },
  photosRightCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  photoRightItem: {
    flex: 1,
    borderRadius: 12 * SCALE,
    overflow: 'hidden',
  },
  photosBottomRow: {
    flexDirection: 'row',
    height: 85 * SCALE,
    gap: 6 * SCALE,
  },
  photoBottomItem: {
    flex: 1,
    borderRadius: 12 * SCALE,
    overflow: 'hidden',
    position: 'relative',
  },
  photoOverlayBadge: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Amenities Section ───
  amenitiesSectionWrapper: {
    marginTop: 24 * SCALE,
    marginHorizontal: 14 * SCALE,
  },
  amenitiesSectionTitle: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 12 * SCALE,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8 * SCALE,
  },
  amenityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#3A2E12',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 12 * SCALE,
    width: (SCREEN_WIDTH - 36 * SCALE) / 2,
  },
  amenityText: {
    color: '#CCCCCC',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    flex: 1,
  },

  // ─── Real Ola Maps Location Section ───
  locationSectionWrapper: {
    marginTop: 24 * SCALE,
    marginHorizontal: 14 * SCALE,
  },
  locationSectionTitle: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 12 * SCALE,
  },
  olaMapContainerBox: {
    height: 140 * SCALE,
    borderRadius: 16 * SCALE,
    borderWidth: 1,
    borderColor: '#3A2E12',
    overflow: 'hidden',
    backgroundColor: '#121518',
  },
  olaMapViewInstance: {
    flex: 1,
  },
  locationAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10 * SCALE,
  },
  locationFullAddressText: {
    color: '#8E8E93',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
    flex: 1,
    lineHeight: 18 * SCALE,
  },

  // ─── Help & Support Card ───
  helpSupportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 14 * SCALE,
    borderWidth: 1,
    borderColor: '#3A2E12',
    marginHorizontal: 14 * SCALE,
    marginTop: 18 * SCALE,
    padding: 14 * SCALE,
  },
  helpSupportTitle: {
    color: '#FFFFFF',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  helpSupportLink: {
    color: '#DEA430',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 2,
  },

  // ─── Accordion Recommendations ───
  accordionContainer: {
    marginHorizontal: 14 * SCALE,
    marginTop: 18 * SCALE,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 14 * SCALE,
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12 * SCALE,
  },
  accordionTitle: {
    color: '#FFFFFF',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  horizontalResScroll: {
    marginBottom: 6 * SCALE,
  },
  recCard: {
    width: 125 * SCALE,
    marginRight: 10 * SCALE,
  },
  recImgWrap: {
    width: 125 * SCALE,
    height: 125 * SCALE,
    borderRadius: 14 * SCALE,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    position: 'relative',
  },
  recAdBadge: {
    position: 'absolute',
    top: 6 * SCALE,
    left: 6 * SCALE,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4 * SCALE,
    paddingHorizontal: 4 * SCALE,
    paddingVertical: 1,
  },
  recAdText: {
    color: '#FFFFFF',
    fontSize: 9 * SCALE,
    fontFamily: 'Urbanist-Bold',
  },
  recHeartBadge: {
    position: 'absolute',
    top: 6 * SCALE,
    right: 6 * SCALE,
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 13 * SCALE,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recDiscountPill: {
    position: 'absolute',
    bottom: 6 * SCALE,
    left: 6 * SCALE,
    right: 6 * SCALE,
    backgroundColor: 'rgba(20, 16, 8, 0.85)',
    borderWidth: 1,
    borderColor: '#DEA430',
    borderRadius: 6 * SCALE,
    paddingVertical: 3 * SCALE,
    alignItems: 'center',
  },
  recDiscountText: {
    color: '#DEA430',
    fontSize: 10 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  recNameText: {
    color: '#FFFFFF',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 6 * SCALE,
  },
  recMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  recRatingText: {
    color: '#8E8E93',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  recDistText: {
    color: '#8E8E93',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 1,
  },

  // ─── DineCash Promo Banner Card ───
  dineCashCard: {
    backgroundColor: '#121212',
    borderRadius: 14 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 14 * SCALE,
    marginTop: 16 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dineCashText: {
    color: '#FFFFFF',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Medium',
    flex: 1,
    marginLeft: 12 * SCALE,
    lineHeight: 18 * SCALE,
  },

  // ─── Fixed Bottom Sticky Bar (Black & Gold, NO ICONS) ───
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14 * SCALE,
    paddingTop: 12 * SCALE,
    flexDirection: 'row',
    gap: 12 * SCALE,
    zIndex: 30,
  },
  bookTableBtn: {
    flex: 1,
    height: 52 * SCALE,
    borderRadius: 14 * SCALE,
    backgroundColor: '#0A0A0A',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookTableText: {
    color: '#DEA430',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  payBillBtn: {
    flex: 1,
    height: 52 * SCALE,
    borderRadius: 14 * SCALE,
    backgroundColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBillText: {
    color: '#000000',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Modal Elements ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20 * SCALE,
  },
  modalSheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24 * SCALE,
    borderTopRightRadius: 24 * SCALE,
    paddingHorizontal: 20 * SCALE,
    paddingTop: 20 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16 * SCALE,
  },
  modalSheetTitle: {
    color: '#FFFFFF',
    fontSize: 19 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  modalSheetSub: {
    color: '#DEA430',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 18 * SCALE,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    color: '#888888',
    fontSize: 11.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 14 * SCALE,
    marginBottom: 8 * SCALE,
  },
  horizontalPillsScroll: {
    marginBottom: 6 * SCALE,
  },
  pillOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 10 * SCALE,
    marginRight: 8 * SCALE,
  },
  pillOptionActive: {
    backgroundColor: '#DEA430',
    borderColor: '#DEA430',
  },
  pillOptionText: {
    color: '#FFFFFF',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  pillOptionTextActive: {
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dateCard: {
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 10 * SCALE,
    marginRight: 8 * SCALE,
    alignItems: 'center',
  },
  dateCardActive: {
    backgroundColor: '#DEA430',
    borderColor: '#DEA430',
  },
  dateDayText: {
    color: '#888888',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  dateDayTextActive: {
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dateMonthText: {
    color: '#FFFFFF',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 2,
  },
  dateMonthTextActive: {
    color: '#000000',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8 * SCALE,
    marginBottom: 6 * SCALE,
  },
  timeSlotPill: {
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 9 * SCALE,
  },
  timeSlotPillActive: {
    backgroundColor: '#DEA430',
    borderColor: '#DEA430',
  },
  timeSlotText: {
    color: '#FFFFFF',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  timeSlotTextActive: {
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#DEA430',
    height: 50 * SCALE,
    borderRadius: 14 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18 * SCALE,
  },
  modalSubmitBtnText: {
    color: '#000000',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Split Pay Specifics ───
  splitPayInputWrap: {
    marginVertical: 8 * SCALE,
  },
  splitPayInputLabel: {
    color: '#9E9E9E',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginBottom: 6 * SCALE,
  },
  splitPerPersonCard: {
    backgroundColor: '#181818',
    borderRadius: 14 * SCALE,
    borderWidth: 1.2,
    borderColor: '#DEA430',
    padding: 16 * SCALE,
    alignItems: 'center',
    marginVertical: 12 * SCALE,
  },
  splitPerPersonLabel: {
    color: '#9E9E9E',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  splitPerPersonAmount: {
    color: '#DEA430',
    fontSize: 26 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginVertical: 4 * SCALE,
  },
  splitPerPersonSavings: {
    color: '#4ADE80',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
  },

  // ─── Pay Bill Specifics ───
  billInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 14 * SCALE,
    borderWidth: 1.5,
    borderColor: '#DEA430',
    paddingHorizontal: 16 * SCALE,
    height: 56 * SCALE,
    marginVertical: 6 * SCALE,
  },
  billInputPrefix: {
    color: '#DEA430',
    fontSize: 24 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginRight: 8 * SCALE,
  },
  billAmountInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 22 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  billBreakdownBox: {
    backgroundColor: '#181818',
    borderRadius: 14 * SCALE,
    padding: 14 * SCALE,
    marginVertical: 6 * SCALE,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8 * SCALE,
  },
  breakdownLabel: {
    color: '#999999',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  breakdownValue: {
    color: '#FFFFFF',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 10 * SCALE,
    marginTop: 4 * SCALE,
    marginBottom: 0,
  },
  breakdownTotalLabel: {
    color: '#FFFFFF',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  breakdownTotalValue: {
    color: '#DEA430',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Success Dialog ───
  successDialog: {
    width: '100%',
    backgroundColor: '#141414',
    borderRadius: 20 * SCALE,
    borderWidth: 1.5,
    borderColor: '#DEA430',
    padding: 24 * SCALE,
    alignItems: 'center',
  },
  successDialogTitle: {
    color: '#FFFFFF',
    fontSize: 21 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 12 * SCALE,
  },
  successDialogSub: {
    color: '#DEA430',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginTop: 4 * SCALE,
  },
  successTicketBox: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12 * SCALE,
    padding: 14 * SCALE,
    width: '100%',
    marginVertical: 16 * SCALE,
    alignItems: 'center',
  },
  successTicketText: {
    color: '#CCCCCC',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  successTicketHighlight: {
    color: '#FFFFFF',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginVertical: 4 * SCALE,
  },
  successTicketDiscount: {
    color: '#4ADE80',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  successDialogBtn: {
    backgroundColor: '#DEA430',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 24 * SCALE,
    paddingVertical: 12 * SCALE,
    width: '100%',
    alignItems: 'center',
  },
  successDialogBtnText: {
    color: '#000000',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Gallery Modal ───
  galleryModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 14 * SCALE,
  },
  galleryTitle: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8 * SCALE,
    gap: 8 * SCALE,
  },
  galleryItemBox: {
    width: (SCREEN_WIDTH - 24 * SCALE) / 2,
    height: 140 * SCALE,
    borderRadius: 12 * SCALE,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryThumbImg: {
    width: '100%',
    height: '100%',
  },
  galleryLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 4 * SCALE,
  },
  galleryItemLabel: {
    color: '#FFFFFF',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },

  // ─── Info Features ───
  infoFeatureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#181818',
    borderRadius: 14 * SCALE,
    padding: 14 * SCALE,
    marginBottom: 10 * SCALE,
  },
  infoFeatureTitle: {
    color: '#FFFFFF',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  infoFeatureDesc: {
    color: '#999999',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 3,
    lineHeight: 17 * SCALE,
  },
  detailInfoBox: {
    backgroundColor: '#181818',
    borderRadius: 12 * SCALE,
    padding: 12 * SCALE,
    marginBottom: 10 * SCALE,
  },
  detailInfoTitle: {
    color: '#DEA430',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  detailInfoVal: {
    color: '#CCCCCC',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18 * SCALE,
  },
});
