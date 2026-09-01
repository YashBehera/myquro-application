import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Linking,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Check,
  Share2,
  Phone,
  MapPin,
  Tag,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Smartphone,
  Hourglass,
  Utensils,
  X,
} from 'lucide-react-native';
import Svg, {
  Polygon,
  Circle,
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCALE } from '../utils/responsive';

export interface BookingConfirmationScreenProps {
  bookingDetails: {
    id?: string;
    restaurantName: string;
    restaurantAddress?: string;
    restaurantPhone?: string;
    restaurantImage?: any;
    date: string;
    dayName?: string;
    time: string;
    mealType?: 'Lunch' | 'Dinner' | string;
    guests: number | string;
    offerText?: string;
    tableNumber?: string;
    restaurantId?: string;
  };
  onDone: () => void;
  onPayBill?: () => void;
  onViewRestaurantDetails?: (restaurantId?: string) => void;
  onCancelBooking?: (bookingId?: string) => void;
  onHelp?: () => void;
}

// ─── DineCash Gold Hexagon Icon ──────────────────────────────────────────────
const DineCashHexagon: React.FC<{ size?: number }> = ({ size = 26 }) => {
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

// ─── Golden Halo Glow Background ─────────────────────────────────────────────
const GlowingCheckHalo: React.FC = () => {
  return (
    <View style={styles.haloWrap}>
      <Svg width={180 * SCALE} height={180 * SCALE} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#DEA430" stopOpacity="0.45" />
            <Stop offset="45%" stopColor="#DEA430" stopOpacity="0.18" />
            <Stop offset="75%" stopColor="#DEA430" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="100" cy="100" r="95" fill="url(#glowGrad)" />
        {/* Subtle particle points */}
        <Circle cx="45" cy="40" r="1.5" fill="#DEA430" opacity="0.6" />
        <Circle cx="160" cy="50" r="2" fill="#DEA430" opacity="0.7" />
        <Circle cx="170" cy="140" r="1.5" fill="#DEA430" opacity="0.5" />
        <Circle cx="35" cy="130" r="2" fill="#DEA430" opacity="0.6" />
        <Circle cx="100" cy="20" r="1.5" fill="#DEA430" opacity="0.8" />
      </Svg>
    </View>
  );
};

export const BookingConfirmationScreen: React.FC<BookingConfirmationScreenProps> = ({
  bookingDetails,
  onDone,
  onPayBill,
  onViewRestaurantDetails,
  onCancelBooking,
  onHelp,
}) => {
  const insets = useSafeAreaInsets();
  const [isTermsExpanded, setIsTermsExpanded] = useState(false);

  const restaurantName = bookingDetails?.restaurantName || 'Kruti Coffee';
  const restaurantAddress =
    bookingDetails?.restaurantAddress || 'Nayapalli, Bhubaneswar';
  const restaurantPhone = bookingDetails?.restaurantPhone || '+91 98765 43210';
  const displayDate = bookingDetails?.date || '29 Aug 2026';
  const displayDayName = (bookingDetails?.dayName || 'TODAY').toUpperCase();
  const displayTime = bookingDetails?.time || '10:30 PM';
  const displayMealType = (bookingDetails?.mealType || 'DINNER').toUpperCase();
  const displayGuests = bookingDetails?.guests || 2;
  const displayOffer = bookingDetails?.offerText || 'Flat 10% off on total bill';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎉 Table confirmed at ${restaurantName}!\n📅 ${displayDayName}, ${displayDate}\n⏰ ${displayTime} (${displayMealType})\n👥 For ${displayGuests} Guests\n📍 ${restaurantAddress}\nBooked via My Quro Dineout`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleCallRestaurant = () => {
    if (restaurantPhone) {
      Linking.openURL(`tel:${restaurantPhone.replace(/\s+/g, '')}`).catch(() => {
        Alert.alert('Call Restaurant', `Phone: ${restaurantPhone}`);
      });
    }
  };

  const handleOpenMap = () => {
    const query = encodeURIComponent(`${restaurantName}, ${restaurantAddress}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Restaurant Location', restaurantAddress);
      });
    }
  };

  const handleCancelPrompt = () => {
    Alert.alert(
      'Cancel Table Reservation?',
      `Are you sure you want to cancel your table booking at ${restaurantName}?`,
      [
        { text: 'Keep Reservation', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            if (onCancelBooking) {
              onCancelBooking(bookingDetails?.id);
            } else {
              Alert.alert('Booking Cancelled', 'Your reservation has been cancelled.');
              onDone();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ─── TOP HEADER: SHARE ACTION ─── */}
      <View
        style={[
          styles.headerRow,
          { paddingTop: 10 * SCALE },
        ]}
      >
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.shareBtn}
          activeOpacity={0.8}
          onPress={handleShare}
          accessibilityLabel="Share booking"
        >
          <Share2 size={22 * SCALE} color="#DEA430" />
        </TouchableOpacity>
      </View>

      {/* ─── SCROLLABLE CONFIRMATION CONTENT ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── HERO CELEBRATION: GLOWING CHECKMARK ─── */}
        <View style={styles.heroSection}>
          <View style={styles.heroCheckWrapper}>
            <GlowingCheckHalo />
            <View style={styles.heroCheckCircle}>
              <Check size={34 * SCALE} color="#DEA430" strokeWidth={3.5} />
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Your <Text style={styles.heroTitleGold}>table</Text> is booked!
          </Text>
        </View>

        {/* ─── MAIN LUXURY BOOKING TICKET CARD ─── */}
        <View style={styles.ticketCard}>
          {/* Status Badge */}
          <View style={styles.confirmedBadge}>
            <Text style={styles.confirmedBadgeText}>CONFIRMED</Text>
          </View>

          {/* 3-Column Info Row */}
          <View style={styles.infoThreeCols}>
            {/* Column 1: Date */}
            <View style={styles.infoCol}>
              <Text style={styles.infoColTitle} numberOfLines={1}>
                {displayDayName}
              </Text>
              <Text style={styles.infoColSubtitle} numberOfLines={1}>
                {displayDate}
              </Text>
            </View>

            {/* Vertical hairline divider */}
            <View style={styles.infoColDivider} />

            {/* Column 2: Meal & Time */}
            <View style={styles.infoCol}>
              <Text style={styles.infoColTitle} numberOfLines={1}>
                {displayMealType}
              </Text>
              <Text style={styles.infoColSubtitle} numberOfLines={1}>
                {displayTime}
              </Text>
            </View>

            {/* Vertical hairline divider */}
            <View style={styles.infoColDivider} />

            {/* Column 3: Guests */}
            <View style={styles.infoCol}>
              <Text style={styles.infoColTitle} numberOfLines={1}>
                FOR {displayGuests}
              </Text>
              <Text style={styles.infoColSubtitle}>guests</Text>
            </View>
          </View>

          {/* Restaurant Details Row */}
          <View style={styles.restaurantRow}>
            <View style={styles.restaurantIconWrap}>
              <Utensils size={20 * SCALE} color="#DEA430" />
            </View>

            <View style={styles.restaurantTextCol}>
              <Text style={styles.restaurantTitleText} numberOfLines={1}>
                {restaurantName}
              </Text>
              <Text style={styles.restaurantAddressText} numberOfLines={1}>
                {restaurantAddress}
              </Text>
            </View>

            {/* Quick Action Icons */}
            <View style={styles.restaurantActionBtns}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                activeOpacity={0.8}
                onPress={handleCallRestaurant}
                accessibilityLabel="Call Restaurant"
              >
                <Phone size={18 * SCALE} color="#DEA430" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionIconBtn}
                activeOpacity={0.8}
                onPress={handleOpenMap}
                accessibilityLabel="Open Map Location"
              >
                <MapPin size={18 * SCALE} color="#DEA430" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ticket Cutout Notches & Dashed Divider */}
          <View style={styles.cutoutDividerRow}>
            <View style={styles.leftNotch} />
            <View style={styles.dashedDividerLine} />
            <View style={styles.rightNotch} />
          </View>

          {/* OFFER FOR YOU Box */}
          <View style={styles.offerForYouWrapper}>
            <View style={styles.offerForYouBadge}>
              <Text style={styles.offerForYouBadgeText}>OFFER FOR YOU</Text>
            </View>

            <View style={styles.offerForYouBox}>
              <View style={styles.offerTagCircle}>
                <Tag size={15 * SCALE} color="#DEA430" />
              </View>
              <Text style={styles.offerForYouText}>{displayOffer}</Text>
            </View>
          </View>

          {/* Pay Bill Now Action Button */}
          <TouchableOpacity
            style={styles.payBillBtn}
            activeOpacity={0.88}
            onPress={onPayBill ? onPayBill : () => Alert.alert('Pay Bill', 'Please pay via My Quro Dineout during your visit to avail the discount.')}
          >
            <Text style={styles.payBillBtnText}>Pay bill now</Text>
          </TouchableOpacity>

          {/* Bottom DineCash Ribbon */}
          <View style={styles.dineCashRibbon}>
            <DineCashHexagon size={24 * SCALE} />
            <Text style={styles.dineCashRibbonText}>
              Use <Text style={styles.dineCashGold}>₹200 DineCash</Text> + Earn{' '}
              <Text style={styles.dineCashGold}>10% cashback</Text>
            </Text>
          </View>
        </View>

        {/* ─── PRIMARY DONE BUTTON (TOP PLACEMENT) ─── */}
        <TouchableOpacity
          style={styles.primaryDoneBtn}
          activeOpacity={0.88}
          onPress={onDone}
        >
          <Text style={styles.primaryDoneBtnText}>Done</Text>
        </TouchableOpacity>

        {/* ─── INTRODUCING SPLIT PAY CARD ─── */}
        <View style={styles.splitPayCard}>
          <View style={styles.splitPayLeftCol}>
            <Text style={styles.splitPayTag}>INTRODUCING</Text>
            <Text style={styles.splitPayTitle}>
              Split <Text style={{ color: '#DEA430' }}>Pay</Text>
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Alert.alert('Split Pay', 'Split bill with friends effortlessly minus the awkwardness.')}
            >
              <Text style={styles.splitPaySubText}>
                Split bill with friends{'\n'}minus the{' '}
                <Text style={styles.splitPayAwkward}>awkwardness ›</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.splitPayRightCol}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=600&auto=format&fit=crop&q=80',
              }}
              style={styles.splitPayImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ─── "WHAT TO DO NEXT?" CARD ─── */}
        <View style={styles.whatNextCard}>
          <Text style={styles.whatNextTitle}>
            What to do <Text style={{ color: '#DEA430' }}>next?</Text>
          </Text>

          {/* Step 1 */}
          <View style={styles.stepRow}>
            <View style={styles.stepIconCircle}>
              <Calendar size={20 * SCALE} color="#DEA430" />
            </View>
            <Text style={styles.stepText}>
              Reach restaurant on the booked date and time
            </Text>
          </View>

          {/* Vertical Connecting Line */}
          <View style={styles.stepConnectingLine} />

          {/* Step 2 */}
          <View style={styles.stepRow}>
            <View style={styles.stepIconCircle}>
              <Smartphone size={20 * SCALE} color="#DEA430" />
            </View>
            <Text style={styles.stepText}>
              Pay your dining bill via My Quro Dineout, your offer gets auto applied!
            </Text>
          </View>

          {/* Table Ready Notice Pill */}
          <View style={styles.waitNoticePill}>
            <Text style={styles.hourglassIcon}>⌛</Text>
            <Text style={styles.waitNoticeText}>
              You may have to wait for your table to get ready
            </Text>
          </View>
        </View>

        {/* ─── "VIEW RESTAURANT DETAILS" ACTION BUTTON ─── */}
        <TouchableOpacity
          style={styles.viewRestaurantCard}
          activeOpacity={0.85}
          onPress={() => {
            if (onViewRestaurantDetails) {
              onViewRestaurantDetails(bookingDetails?.restaurantId);
            } else {
              onDone();
            }
          }}
        >
          <Text style={styles.viewRestaurantText}>View restaurant details</Text>
          <ArrowRight size={20 * SCALE} color="#DEA430" />
        </TouchableOpacity>

        {/* ─── CANCEL BOOKING ROW ─── */}
        <View style={styles.cancelRow}>
          <Text style={styles.cancelPromptText}>
            Can't make it to the restaurant?
          </Text>
          <TouchableOpacity activeOpacity={0.8} onPress={handleCancelPrompt}>
            <Text style={styles.cancelLinkText}>Cancel booking ›</Text>
          </TouchableOpacity>
        </View>

        {/* ─── "OFFER TERMS & CONDITIONS" ACCORDION ─── */}
        <View style={styles.termsAccordionWrap}>
          <TouchableOpacity
            style={styles.termsAccordionHeader}
            activeOpacity={0.8}
            onPress={() => setIsTermsExpanded(!isTermsExpanded)}
          >
            <Text style={styles.termsAccordionTitle}>
              Offer terms & conditions
            </Text>
            {isTermsExpanded ? (
              <ChevronUp size={20 * SCALE} color="#DEA430" />
            ) : (
              <ChevronDown size={20 * SCALE} color="#DEA430" />
            )}
          </TouchableOpacity>

          {isTermsExpanded && (
            <View style={styles.termsExpandedBody}>
              <Text style={styles.termBulletText}>
                • Discount is valid strictly on dine-in bill payment made via My Quro Pay.
              </Text>
              <Text style={styles.termBulletText}>
                • Table reservation will be held for up to 15 minutes post scheduled arrival time.
              </Text>
              <Text style={styles.termBulletText}>
                • Discount is applicable on total food & soft beverage bill.
              </Text>
              <Text style={styles.termBulletText}>
                • Cannot be clubbed with existing in-house restaurant promotions or buffet coupons.
              </Text>
            </View>
          )}
        </View>

        {/* ─── BOTTOM DONE BUTTON & HELP LINK ─── */}
        <TouchableOpacity
          style={[styles.primaryDoneBtn, { marginTop: 24 }]}
          activeOpacity={0.88}
          onPress={onDone}
        >
          <Text style={styles.primaryDoneBtnText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpLinkRow}
          activeOpacity={0.8}
          onPress={onHelp ? onHelp : () => Alert.alert('Customer Support', 'Contact us at support@myquro.com or call 1800-123-4567 for reservation assistance.')}
        >
          <Text style={styles.helpTextRegular}>
            Need help with this order?{' '}
            <Text style={styles.helpTextGold}>HELP</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: Math.max(insets.bottom, 24) + 20 }} />
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
    paddingHorizontal: 20 * SCALE,
    paddingBottom: 10 * SCALE,
    backgroundColor: '#000000',
  },
  shareBtn: {
    width: 40 * SCALE,
    height: 40 * SCALE,
    borderRadius: 20 * SCALE,
    backgroundColor: '#14120E',
    borderWidth: 1,
    borderColor: '#2D2516',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16 * SCALE,
    paddingTop: 10 * SCALE,
    paddingBottom: 30 * SCALE,
  },

  // ─── Hero Section ───
  heroSection: {
    alignItems: 'center',
    marginTop: 6 * SCALE,
    marginBottom: 24 * SCALE,
  },
  heroCheckWrapper: {
    width: 130 * SCALE,
    height: 130 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 14 * SCALE,
  },
  haloWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCheckCircle: {
    width: 82 * SCALE,
    height: 82 * SCALE,
    borderRadius: 41 * SCALE,
    backgroundColor: '#050505',
    borderWidth: 3.5 * SCALE,
    borderColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 26 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  heroTitleGold: {
    color: '#DEA430',
  },

  // ─── Luxury Ticket Card ───
  ticketCard: {
    backgroundColor: '#0D0C0A',
    borderWidth: 1.2 * SCALE,
    borderColor: '#241E12',
    borderRadius: 22 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingTop: 18 * SCALE,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  confirmedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E180C',
    borderWidth: 1,
    borderColor: '#4A3916',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 4 * SCALE,
    marginBottom: 16 * SCALE,
  },
  confirmedBadgeText: {
    color: '#DEA430',
    fontSize: 11.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ─── 3-Column Info ───
  infoThreeCols: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 18 * SCALE,
    borderBottomWidth: 1,
    borderBottomColor: '#1A160F',
  },
  infoCol: {
    flex: 1,
  },
  infoColDivider: {
    width: 1,
    height: 36 * SCALE,
    backgroundColor: '#1F1A12',
    marginHorizontal: 8 * SCALE,
  },
  infoColTitle: {
    color: '#FFFFFF',
    fontSize: 17 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 3 * SCALE,
  },
  infoColSubtitle: {
    color: '#8E8E8E',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },

  // ─── Restaurant Row ───
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16 * SCALE,
  },
  restaurantIconWrap: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 22 * SCALE,
    backgroundColor: '#1A160E',
    borderWidth: 1,
    borderColor: '#2F2514',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * SCALE,
  },
  restaurantTextCol: {
    flex: 1,
    marginRight: 10 * SCALE,
  },
  restaurantTitleText: {
    color: '#FFFFFF',
    fontSize: 16.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 2 * SCALE,
  },
  restaurantAddressText: {
    color: '#8E8E8E',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
  },
  restaurantActionBtns: {
    flexDirection: 'row',
    gap: 8 * SCALE,
  },
  actionIconBtn: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#17140E',
    borderWidth: 1,
    borderColor: '#2B2212',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Ticket Cutouts & Dashed Divider ───
  cutoutDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -16 * SCALE,
    marginVertical: 4 * SCALE,
  },
  leftNotch: {
    width: 20 * SCALE,
    height: 20 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#000000',
    marginLeft: -10 * SCALE,
  },
  dashedDividerLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2313',
    borderStyle: 'dashed',
    marginHorizontal: 6 * SCALE,
  },
  rightNotch: {
    width: 20 * SCALE,
    height: 20 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#000000',
    marginRight: -10 * SCALE,
  },

  // ─── Offer Box ───
  offerForYouWrapper: {
    position: 'relative',
    marginTop: 18 * SCALE,
    marginBottom: 12 * SCALE,
  },
  offerForYouBadge: {
    position: 'absolute',
    top: -9 * SCALE,
    left: 14 * SCALE,
    zIndex: 2,
    backgroundColor: '#DEA430',
    borderRadius: 6 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 2.5 * SCALE,
  },
  offerForYouBadgeText: {
    color: '#000000',
    fontSize: 10.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offerForYouBox: {
    backgroundColor: '#12100A',
    borderWidth: 1,
    borderColor: '#382B12',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerTagCircle: {
    width: 32 * SCALE,
    height: 32 * SCALE,
    borderRadius: 16 * SCALE,
    backgroundColor: '#1F190D',
    borderWidth: 1,
    borderColor: '#3D2F12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * SCALE,
  },
  offerForYouText: {
    color: '#FFFFFF',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    flex: 1,
  },

  // ─── Pay Bill Now Button ───
  payBillBtn: {
    backgroundColor: '#DEA430',
    height: 50 * SCALE,
    borderRadius: 14 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6 * SCALE,
    marginBottom: 16 * SCALE,
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  payBillBtnText: {
    color: '#000000',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },

  // ─── DineCash Ribbon ───
  dineCashRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141109',
    borderTopWidth: 1,
    borderColor: '#241D10',
    paddingVertical: 12 * SCALE,
    marginHorizontal: -16 * SCALE,
    paddingHorizontal: 16 * SCALE,
  },
  dineCashRibbonText: {
    color: '#C0C0C0',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginLeft: 8 * SCALE,
  },
  dineCashGold: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Primary Done Button ───
  primaryDoneBtn: {
    backgroundColor: '#DEA430',
    height: 52 * SCALE,
    borderRadius: 16 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18 * SCALE,
    marginBottom: 8 * SCALE,
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryDoneBtnText: {
    color: '#000000',
    fontSize: 16.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },

  // ─── Split Pay Card ───
  splitPayCard: {
    backgroundColor: '#12110D',
    borderWidth: 1,
    borderColor: '#2A2212',
    borderRadius: 20 * SCALE,
    padding: 16 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14 * SCALE,
    overflow: 'hidden',
  },
  splitPayLeftCol: {
    flex: 1,
    paddingRight: 10 * SCALE,
  },
  splitPayTag: {
    color: '#DEA430',
    fontSize: 10.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4 * SCALE,
  },
  splitPayTitle: {
    color: '#FFFFFF',
    fontSize: 22 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginBottom: 6 * SCALE,
  },
  splitPaySubText: {
    color: '#9E9E9E',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 18 * SCALE,
  },
  splitPayAwkward: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  splitPayRightCol: {
    width: 110 * SCALE,
    height: 86 * SCALE,
    borderRadius: 14 * SCALE,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#261F10',
  },
  splitPayImage: {
    width: '100%',
    height: '100%',
  },

  // ─── "What to do next?" Card ───
  whatNextCard: {
    backgroundColor: '#0D0C0A',
    borderWidth: 1.2 * SCALE,
    borderColor: '#241E12',
    borderRadius: 20 * SCALE,
    padding: 18 * SCALE,
    marginTop: 18 * SCALE,
  },
  whatNextTitle: {
    color: '#FFFFFF',
    fontSize: 19 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginBottom: 18 * SCALE,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIconCircle: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 22 * SCALE,
    backgroundColor: '#1A160E',
    borderWidth: 1,
    borderColor: '#382B12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14 * SCALE,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 14.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 20 * SCALE,
    flex: 1,
  },
  stepConnectingLine: {
    width: 2,
    height: 22 * SCALE,
    backgroundColor: '#292110',
    marginLeft: 21 * SCALE,
    marginVertical: 4 * SCALE,
  },
  waitNoticePill: {
    backgroundColor: '#19140A',
    borderWidth: 1,
    borderColor: '#382B12',
    borderRadius: 12 * SCALE,
    paddingVertical: 11 * SCALE,
    paddingHorizontal: 12 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18 * SCALE,
  },
  hourglassIcon: {
    fontSize: 16 * SCALE,
    marginRight: 8 * SCALE,
  },
  waitNoticeText: {
    color: '#DEA430',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    flex: 1,
  },

  // ─── View Restaurant Details Card ───
  viewRestaurantCard: {
    backgroundColor: '#0D0C0A',
    borderWidth: 1.2 * SCALE,
    borderColor: '#2E2514',
    borderRadius: 16 * SCALE,
    paddingHorizontal: 18 * SCALE,
    paddingVertical: 18 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16 * SCALE,
  },
  viewRestaurantText: {
    color: '#DEA430',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },

  // ─── Cancel Booking Row ───
  cancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14 * SCALE,
    paddingHorizontal: 4 * SCALE,
    marginTop: 8 * SCALE,
  },
  cancelPromptText: {
    color: '#8E8E8E',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
  },
  cancelLinkText: {
    color: '#DEA430',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Terms Accordion ───
  termsAccordionWrap: {
    backgroundColor: '#0D0C0A',
    borderWidth: 1,
    borderColor: '#241E12',
    borderRadius: 16 * SCALE,
    marginTop: 10 * SCALE,
    overflow: 'hidden',
  },
  termsAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 16 * SCALE,
  },
  termsAccordionTitle: {
    color: '#FFFFFF',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  termsExpandedBody: {
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 16 * SCALE,
    borderTopWidth: 1,
    borderTopColor: '#1C170E',
    paddingTop: 12 * SCALE,
    gap: 8 * SCALE,
  },
  termBulletText: {
    color: '#8E8E8E',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18 * SCALE,
  },

  // ─── Help Link ───
  helpLinkRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14 * SCALE,
  },
  helpTextRegular: {
    color: '#C0C0C0',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Regular',
  },
  helpTextGold: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
});
