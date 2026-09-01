import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  Alert,
  Image,
} from 'react-native';
const quroBadgeImg = require('../assets/images/quro_badge.png');
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
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
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SCALE,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from '../utils/responsive';

import { BookingConfirmationScreen } from './BookingConfirmationScreen';

interface BookTableScreenProps {
  restaurant: any;
  onBack: () => void;
  onConfirmBooking: (bookingDetails: any) => void;
}

// ─── Custom Outline Sun Icon (Radiating Rays in Gold) ───────────────────────
const CustomOutlineSunIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = '#DEA430',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth="1.6" />
      <Path d="M12 2V4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M12 19.5V22" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M4.93 4.93L6.7 6.7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M17.3 17.3L19.07 19.07" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M2 12H4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M19.5 12H22" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M4.93 19.07L6.7 17.3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M17.3 6.7L19.07 4.93" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
};

// ─── Custom Crescent Moon Icon ──────────────────────────────────────────────
const CustomCrescentMoonIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 18,
  color = '#8E8E93',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// ─── Custom Radio Button (Gold Selected Circle) ─────────────────────────────
const CustomRadioButton: React.FC<{ isSelected: boolean; isSoldOut?: boolean }> = ({
  isSelected,
  isSoldOut = false,
}) => {
  if (isSoldOut) {
    return (
      <View style={[styles.radioCircle, styles.radioCircleDisabled]}>
        <View style={styles.radioInnerUnselected} />
      </View>
    );
  }

  if (isSelected) {
    return (
      <View style={[styles.radioCircle, styles.radioCircleActive]}>
        <View style={styles.radioInnerDot} />
      </View>
    );
  }

  return (
    <View style={styles.radioCircle}>
      <View style={styles.radioInnerUnselected} />
    </View>
  );
};

// ─── Gold Hexagon Icon for DineCash ──────────────────────────────────────────
const DineCashHexagon: React.FC<{ size?: number }> = ({ size = 32 }) => {
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

// ─── Subtle Geometric Gold Background for Banner ─────────────────────────────
const DineCashBannerPattern: React.FC = () => {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1C170B" stopOpacity="0.85" />
          <Stop offset="50%" stopColor="#141414" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#181308" stopOpacity="0.9" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#bannerBg)" rx={14 * SCALE} />
      <Circle cx="90%" cy="20%" r="50" stroke="#DEA430" strokeWidth="0.8" opacity={0.12} />
      <Circle cx="90%" cy="20%" r="75" stroke="#DEA430" strokeWidth="0.5" opacity={0.08} />
      <Circle cx="10%" cy="90%" r="40" stroke="#DEA430" strokeWidth="0.8" opacity={0.1} />
    </Svg>
  );
};

export const BookTableScreen: React.FC<BookTableScreenProps> = ({
  restaurant,
  onBack,
  onConfirmBooking,
}) => {
  const insets = useSafeAreaInsets();

  const restaurantName = restaurant?.name || '';
  const restaurantAddress = restaurant?.location || restaurant?.address || '';
  const restaurantCity = restaurant?.city || '';
  const restaurantCover =
    restaurant?.coverUrl ||
    restaurant?.image?.uri ||
    (typeof restaurant?.image === 'string' ? restaurant.image : '') ||
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200';

  // Navigation Step: 'select_slot' | 'review_summary' | 'confirmation'
  const [currentStep, setCurrentStep] = useState<'select_slot' | 'review_summary' | 'confirmation'>('select_slot');
  const [confirmedBookingData, setConfirmedBookingData] = useState<any | null>(null);

  // Guest options (1 through 10+)
  const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8, '10+'];
  const [selectedGuests, setSelectedGuests] = useState<number | string>(2);

  // Dynamic Date options (Today + next 6 days)
  const dateOptions = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateNum = d.getDate().toString().padStart(2, '0');
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' });
      const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const fullDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const discount = i % 2 === 0 ? '15% off' : '20% off';
      return { dateNum, dayName, fullDate, discount, month };
    });
  }, []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // Meal Type: 'lunch' | 'dinner'
  const [mealType, setMealType] = useState<'lunch' | 'dinner'>('lunch');

  // Lunch Slots
  const lunchSlots = [
    { time: '02:00 PM', discount: '15% off' },
    { time: '02:15 PM', discount: '15% off' },
    { time: '02:30 PM', discount: '15% off' },
    { time: '02:45 PM', discount: '15% off' },
    { time: '03:00 PM', discount: '15% off' },
    { time: '03:15 PM', discount: '15% off' },
    { time: '03:30 PM', discount: '15% off' },
    { time: '03:45 PM', discount: '15% off' },
    { time: '04:00 PM', discount: '15% off' },
  ];

  // Dinner Slots
  const dinnerSlots = [
    { time: '07:00 PM', discount: '15% off' },
    { time: '07:30 PM', discount: '15% off' },
    { time: '08:00 PM', discount: '20% off' },
    { time: '08:30 PM', discount: '20% off' },
    { time: '09:00 PM', discount: '15% off' },
    { time: '09:30 PM', discount: '15% off' },
    { time: '10:00 PM', discount: '15% off' },
    { time: '10:30 PM', discount: '15% off' },
  ];

  const currentSlots = mealType === 'lunch' ? lunchSlots : dinnerSlots;
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('02:00 PM');

  // Selected Booking Option: 'one_15' | 'regular_10'
  const [selectedOfferId, setSelectedOfferId] = useState<'one_15' | 'regular_10'>('regular_10');

  // Accordion State: Offer Terms and Conditions
  const [isTermsExpanded, setIsTermsExpanded] = useState(false);

  // Benefits Modal State
  const [benefitsModalVisible, setBenefitsModalVisible] = useState(false);

  const activeDate = dateOptions[selectedDateIndex];
  const offerTitle =
    selectedOfferId === 'one_15'
      ? 'Flat 15% Off on Total Bill'
      : 'Flat 10% off on total bill';

  const handleProceedToReview = () => {
    setCurrentStep('review_summary');
  };

  const handleFinalConfirmBooking = () => {
    const discountText =
      selectedOfferId === 'one_15'
        ? 'Flat 15% OFF + ₹10/guest cover charge'
        : 'Flat 10% OFF + FREE cover charge';

    const newBooking = {
      id: `dine_${Date.now()}`,
      restaurantId: restaurant?.id || 'res_kruti',
      restaurantName,
      restaurantAddress,
      restaurantPhone: restaurant?.phone || '+91 98765 43210',
      restaurantImage: restaurantCover,
      guests: selectedGuests,
      date: activeDate.fullDate,
      dayName: activeDate.dayName,
      time: selectedTimeSlot,
      mealType: mealType === 'lunch' ? 'Lunch' : 'Dinner',
      tableNumber: `Table #${Math.floor(Math.random() * 15) + 1}`,
      discountApplied: discountText,
      offerText: offerTitle,
      offerSelected: selectedOfferId === 'one_15' ? 'one EXCLUSIVE' : 'REGULAR OFFER',
    };

    // Notify parent & transition directly to the full confirmation screen
    onConfirmBooking(newBooking);
    setConfirmedBookingData(newBooking);
    setCurrentStep('confirmation');
  };

  // ════════════════════════════════════════════════════════════════════════════
  // [VIEW 3] DEDICATED BOOKING CONFIRMATION SCREEN ("YOUR TABLE IS BOOKED!")
  // ════════════════════════════════════════════════════════════════════════════
  if (currentStep === 'confirmation' && confirmedBookingData) {
    return (
      <BookingConfirmationScreen
        bookingDetails={confirmedBookingData}
        onDone={onBack}
        onPayBill={() => {
          Alert.alert(
            'Pay Bill',
            'Please ask your server for the bill and pay via My Quro Dineout during your visit to avail the discount.'
          );
        }}
        onViewRestaurantDetails={() => onBack()}
        onCancelBooking={() => {
          Alert.alert('Reservation Cancelled', 'Your table booking has been cancelled.');
          onBack();
        }}
        onHelp={() => {
          Alert.alert(
            'Customer Support',
            'Contact us at support@myquro.com or call 1800-123-4567 for reservation assistance.'
          );
        }}
      />
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [VIEW 2] REVIEW & SUMMARY TICKET SCREEN (WHEN PROCEED IS CLICKED)
  // ════════════════════════════════════════════════════════════════════════════
  if (currentStep === 'review_summary') {
    return (
      <View style={styles.screenContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Header */}
        <View
          style={[
            styles.reviewHeaderContainer,
            { paddingTop: 10 * SCALE },
          ]}
        >
          <TouchableOpacity
            style={styles.simpleBackBtn}
            activeOpacity={0.8}
            onPress={() => setCurrentStep('select_slot')}
          >
            <ArrowLeft size={24 * SCALE} color="#DEA430" />
          </TouchableOpacity>

          <View style={styles.reviewHeaderTitleCol}>
            <Text style={styles.reviewHeaderTitleText}>{restaurantName}</Text>
            <Text style={styles.reviewHeaderSubtitleText}>{restaurantCity}</Text>
          </View>
        </View>

        {/* Scrollable Summary */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Luxury Booking Ticket Card */}
          <View style={styles.ticketCardContainer}>
            {/* Top 3-Column Info Row */}
            <View style={styles.ticketTopRow}>
              <View style={styles.ticketCol}>
                <Text style={styles.ticketColMainText}>{activeDate.dayName}</Text>
                <Text style={styles.ticketColSubText}>{activeDate.fullDate}</Text>
              </View>

              <View style={styles.ticketCol}>
                <Text style={styles.ticketColMainText}>
                  {mealType === 'lunch' ? 'Lunch' : 'Dinner'}
                </Text>
                <Text style={styles.ticketColSubText}>{selectedTimeSlot}</Text>
              </View>

              <View style={styles.ticketCol}>
                <Text style={styles.ticketColMainText}>for {selectedGuests}</Text>
                <Text style={styles.ticketColSubText}>guests</Text>
              </View>
            </View>

            {/* Restaurant Address Row */}
            <View style={styles.ticketVenueBlock}>
              <Text style={styles.ticketVenueTitle}>{restaurantName}</Text>
              <Text style={styles.ticketVenueAddress} numberOfLines={1}>
                {restaurantAddress}
              </Text>
            </View>

            {/* Cutout Notches & Dotted Divider */}
            <View style={styles.ticketCutoutRow}>
              <View style={styles.ticketLeftNotch} />
              <View style={styles.ticketDottedLine} />
              <View style={styles.ticketRightNotch} />
            </View>

            {/* "OFFER FOR YOU" Box */}
            <View style={styles.offerForYouWrapper}>
              <View style={styles.offerForYouBadge}>
                <Text style={styles.offerForYouBadgeText}>OFFER FOR YOU</Text>
              </View>
              <View style={styles.offerForYouBox}>
                <Text style={styles.offerForYouTitleText}>{offerTitle}</Text>
              </View>
            </View>

            {/* DineCash Patterned Card Footer */}
            <View style={styles.ticketFooterWrap}>
              <DineCashBannerPattern />
              <View style={styles.ticketFooterContent}>
                <DineCashHexagon size={28 * SCALE} />
                <Text style={styles.ticketFooterText}>
                  Use <Text style={styles.ticketFooterGold}>₹200</Text> DineCash + Earn{' '}
                  <Text style={styles.ticketFooterGold}>10%</Text> cashback
                </Text>
              </View>
            </View>
          </View>

          {/* Accordion: Offer terms & conditions */}
          <View style={styles.termsAccordionWrap}>
            <TouchableOpacity
              style={styles.termsAccordionHeader}
              activeOpacity={0.8}
              onPress={() => setIsTermsExpanded(!isTermsExpanded)}
            >
              <Text style={styles.termsAccordionTitle}>Offer terms & conditions</Text>
              {isTermsExpanded ? (
                <ChevronUp size={20 * SCALE} color="#DEA430" />
              ) : (
                <ChevronDown size={20 * SCALE} color="#DEA430" />
              )}
            </TouchableOpacity>

            {isTermsExpanded && (
              <View style={styles.termsExpandedBody}>
                <Text style={styles.termBulletText}>
                  • Offer is valid strictly on dine-in bill payment made via MyQuro Pay.
                </Text>
                <Text style={styles.termBulletText}>
                  • Table reservation will be held for up to 15 minutes post scheduled arrival time.
                </Text>
                <Text style={styles.termBulletText}>
                  • Cannot be clubbed with existing in-house restaurant buffet promotions.
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 110 * SCALE }} />
        </ScrollView>

        {/* Sticky Bottom: Book your table for Free */}
        <View
          style={[
            styles.bottomStickyBar,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <TouchableOpacity
            style={styles.proceedBtn}
            activeOpacity={0.88}
            onPress={handleFinalConfirmBooking}
          >
            <Text style={styles.proceedBtnText}>Book your table for Free</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [VIEW 1] INITIAL STEP: DATE, GUESTS & TIME SLOT SELECTOR
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Top Header */}
      <View
        style={[
          styles.headerContainer,
          { paddingTop: 10 * SCALE },
        ]}
      >
        <TouchableOpacity
          style={styles.circularBackBtn}
          activeOpacity={0.8}
          onPress={onBack}
        >
          <ArrowLeft size={22 * SCALE} color="#DEA430" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitleText}>Book table</Text>
          <Text style={styles.headerSubtitleText} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
      </View>

      {/* Main Scrollable Form Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        {/* DineCash Promo Banner */}
        <View style={styles.dineCashBannerWrap}>
          <DineCashBannerPattern />
          <View style={styles.dineCashBannerContent}>
            <DineCashHexagon size={30 * SCALE} />
            <Text style={styles.dineCashBannerText}>
              Get flat <Text style={styles.dineCashBannerGold}>10% DineCash</Text> on your bill payment
            </Text>
          </View>
        </View>

        {/* Number of guest(s) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>Number of guest(s)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.guestsScrollContainer}
          >
            {guestOptions.map((g, idx) => {
              const isSelected = selectedGuests === g;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.guestBox,
                    isSelected && styles.guestBoxActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedGuests(g)}
                >
                  <Text
                    style={[
                      styles.guestBoxText,
                      isSelected && styles.guestBoxTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* When are you visiting? */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>When are you visiting?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesScrollContainer}
          >
            {dateOptions.map((item: any, idx: number) => {
              const isSelected = selectedDateIndex === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dateCard,
                    isSelected && styles.dateCardActive,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDateIndex(idx)}
                >
                  <Text
                    style={[
                      styles.dateNumText,
                      isSelected && styles.dateNumTextActive,
                    ]}
                  >
                    {item.dateNum}
                  </Text>
                  <Text
                    style={[
                      styles.dateDayText,
                      isSelected && styles.dateDayTextActive,
                    ]}
                  >
                    {item.dayName.slice(0, 3)}
                  </Text>

                  <View style={styles.discountBadgePill}>
                    <Text style={styles.discountBadgeText}>{item.discount}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.monthVerticalPill}>
              <Text style={styles.monthVerticalText}>
                {dateOptions[selectedDateIndex]?.month || 'SEP'}
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Time Slot Selector Big Card */}
        <View style={styles.slotsCardContainer}>
          <View style={styles.mealToggleContainer}>
            <TouchableOpacity
              style={[
                styles.mealTabBtn,
                mealType === 'lunch' && styles.mealTabBtnActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setMealType('lunch');
                setSelectedTimeSlot(lunchSlots[0]?.time || '02:00 PM');
              }}
            >
              <CustomOutlineSunIcon
                size={20 * SCALE}
                color={mealType === 'lunch' ? '#DEA430' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.mealTabText,
                  mealType === 'lunch' && styles.mealTabTextActive,
                ]}
              >
                Lunch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mealTabBtn,
                mealType === 'dinner' && styles.mealTabBtnActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                setMealType('dinner');
                setSelectedTimeSlot(dinnerSlots[2]?.time || '08:00 PM');
              }}
            >
              <CustomCrescentMoonIcon
                size={18 * SCALE}
                color={mealType === 'dinner' ? '#DEA430' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.mealTabText,
                  mealType === 'dinner' && styles.mealTabTextActive,
                ]}
              >
                Dinner
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.slotsGridContainer}>
            {currentSlots.map((slot, idx) => {
              const isSelected = selectedTimeSlot === slot.time;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.slotBox,
                    isSelected && styles.slotBoxActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTimeSlot(slot.time)}
                >
                  <Text
                    style={[
                      styles.slotTimeText,
                      isSelected && styles.slotTimeTextActive,
                    ]}
                  >
                    {slot.time}
                  </Text>
                  <Text
                    style={[
                      styles.slotDiscountText,
                      isSelected && styles.slotDiscountTextActive,
                    ]}
                  >
                    {slot.discount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Booking Option Section */}
        <View style={styles.bookingOptionSection}>
          <Text style={styles.bookingOptionHeading}>
            Booking option for{' '}
            <Text style={styles.bookingOptionTimeHighlight}>
              {selectedTimeSlot}
            </Text>
          </Text>

          {/* CARD 1: QURO EXCLUSIVE */}
          <View style={styles.oneExclusiveCard}>
            <View style={styles.oneExclusiveHeaderRow}>
              <Image source={quroBadgeImg} style={styles.quroBookTableBadgeImg} resizeMode="contain" />
              <Text style={styles.exclusiveLabelText}> EXCLUSIVE</Text>
            </View>

            <View style={styles.offerOptionBlock}>
              <View style={styles.offerOptionRow}>
                <CustomRadioButton isSelected={false} isSoldOut={true} />
                <View style={styles.offerDetailsCol}>
                  <Text style={styles.offerOptionTitle}>Flat 20% off on Weekends</Text>
                  <Text style={styles.offerOptionSub}>
                    Redeemable cover charge: ₹12/guest
                  </Text>
                  <Text style={styles.offerOptionSub}>
                    Redeem it by paying final bill via MyQuro
                  </Text>
                  <Text style={styles.soldOutBadgeText}>Sold out!</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardInternalDivider} />

            <TouchableOpacity
              style={styles.offerOptionBlock}
              activeOpacity={0.85}
              onPress={() => setSelectedOfferId('one_15')}
            >
              <View style={styles.offerOptionRow}>
                <CustomRadioButton isSelected={selectedOfferId === 'one_15'} />
                <View style={styles.offerDetailsCol}>
                  <Text style={styles.offerOptionTitle}>Flat 15% Off on Total Bill</Text>
                  <Text style={styles.offerOptionSub}>
                    Redeemable cover charge: ₹10/guest
                  </Text>
                  <Text style={styles.offerOptionSubGold}>
                    Redeem it by paying final bill via MyQuro
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.cardInternalDivider} />

            <View style={styles.onePlanFooterNoteWrap}>
              <Text style={styles.onePlanFooterText}>
                1 month MyQURO plan for ₹1 will be auto-added in the next step.{' '}
                <Text
                  style={styles.viewBenefitsLink}
                  onPress={() => setBenefitsModalVisible(true)}
                >
                  View benefits
                </Text>
              </Text>
            </View>
          </View>

          {/* CARD 2: REGULAR OFFER */}
          <TouchableOpacity
            style={[
              styles.regularOfferCard,
              selectedOfferId === 'regular_10' && styles.regularOfferCardActive,
            ]}
            activeOpacity={0.85}
            onPress={() => setSelectedOfferId('regular_10')}
          >
            <Text style={styles.regularOfferLabel}>REGULAR OFFER</Text>

            <View style={styles.offerOptionRow}>
              <CustomRadioButton isSelected={selectedOfferId === 'regular_10'} />
              <View style={styles.offerDetailsCol}>
                <Text style={styles.offerOptionTitle}>Flat 10% off on total bill</Text>
                <Text style={styles.offerOptionSub}>Cover charge: FREE</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.couponsAvailableNote}>
            Coupons & additional offers available during bill payment
          </Text>

          <View style={styles.termsAccordionWrap}>
            <TouchableOpacity
              style={styles.termsAccordionHeader}
              activeOpacity={0.8}
              onPress={() => setIsTermsExpanded(!isTermsExpanded)}
            >
              <Text style={styles.termsAccordionTitle}>Offer terms and conditions</Text>
              {isTermsExpanded ? (
                <ChevronUp size={20 * SCALE} color="#DEA430" />
              ) : (
                <ChevronDown size={20 * SCALE} color="#DEA430" />
              )}
            </TouchableOpacity>

            {isTermsExpanded && (
              <View style={styles.termsExpandedBody}>
                <Text style={styles.termBulletText}>
                  • Discount is valid strictly on dine-in services and pre-booked slots.
                </Text>
                <Text style={styles.termBulletText}>
                  • Redeemable cover charges will be 100% deducted from the final bill payment made via MyQuro Pay.
                </Text>
                <Text style={styles.termBulletText}>
                  • Table reservation is held for a grace period of 15 minutes from the scheduled time.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 110 * SCALE }} />
      </ScrollView>

      {/* Fixed Bottom: Proceed Button */}
      <View
        style={[
          styles.bottomStickyBar,
          { paddingBottom: Math.max(insets.bottom, 16) + 4 },
        ]}
      >
        <TouchableOpacity
          style={styles.proceedBtn}
          activeOpacity={0.88}
          onPress={handleProceedToReview}
        >
          <Text style={styles.proceedBtnText}>Proceed</Text>
        </TouchableOpacity>
      </View>

      {/* Benefits Modal */}
      <Modal
        visible={benefitsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBenefitsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={quroBadgeImg} style={styles.quroBookTableBadgeImg} resizeMode="contain" />
                <Text style={[styles.exclusiveLabelText, { fontSize: 14 * SCALE, marginLeft: 4 }]}>
                  MEMBERSHIP
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBenefitsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20 * SCALE} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.benefitItemCard}>
              <Sparkles size={20 * SCALE} color="#DEA430" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitItemTitle}>Extra 15% - 25% Off at 10,000+ Dining Venues</Text>
                <Text style={styles.benefitItemDesc}>
                  Exclusive dining discounts across premium five-star & luxury cafes.
                </Text>
              </View>
            </View>

            <View style={styles.benefitItemCard}>
              <ShieldCheck size={20 * SCALE} color="#DEA430" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitItemTitle}>Free Delivery on Food Orders</Text>
                <Text style={styles.benefitItemDesc}>
                  Zero delivery fees on all orders above ₹149.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              activeOpacity={0.88}
              onPress={() => setBenefitsModalVisible(false)}
            >
              <Text style={styles.modalSubmitBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── LUXURY BLACK & GOLD STYLES (MATCHING SCREENSHOT PIXEL-PERFECT) ──────────
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ─── Top Header ───
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 14 * SCALE,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  circularBackBtn: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 22 * SCALE,
    borderWidth: 1.2,
    borderColor: '#DEA430',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    marginLeft: 14 * SCALE,
    flex: 1,
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 20 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  headerSubtitleText: {
    color: '#9E9E9E',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },

  // ─── Review Header (View 2) ───
  reviewHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 14 * SCALE,
    backgroundColor: '#000000',
  },
  simpleBackBtn: {
    padding: 6 * SCALE,
    marginRight: 10 * SCALE,
    marginLeft: -6 * SCALE,
  },
  reviewHeaderTitleCol: {
    flex: 1,
  },
  reviewHeaderTitleText: {
    color: '#FFFFFF',
    fontSize: 20 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  reviewHeaderSubtitleText: {
    color: '#9E9E9E',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 1,
  },

  // ─── Scroll Content ───
  scrollContent: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollInner: {
    paddingTop: 14 * SCALE,
    paddingHorizontal: 16 * SCALE,
  },

  // ─── Ticket Card Container (View 2) ───
  ticketCardContainer: {
    backgroundColor: '#141414',
    borderRadius: 20 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20 * SCALE,
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20 * SCALE,
    paddingTop: 20 * SCALE,
  },
  ticketCol: {
    flex: 1,
  },
  ticketColMainText: {
    color: '#FFFFFF',
    fontSize: 17 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ticketColSubText: {
    color: '#8E8E93',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 3,
  },
  ticketVenueBlock: {
    paddingHorizontal: 20 * SCALE,
    marginTop: 16 * SCALE,
  },
  ticketVenueTitle: {
    color: '#FFFFFF',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ticketVenueAddress: {
    color: '#8E8E93',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },

  // ─── Cutout Notches & Dotted Line ───
  ticketCutoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18 * SCALE,
    position: 'relative',
  },
  ticketLeftNotch: {
    width: 22 * SCALE,
    height: 22 * SCALE,
    borderRadius: 11 * SCALE,
    backgroundColor: '#000000',
    marginLeft: -11 * SCALE,
    zIndex: 2,
  },
  ticketRightNotch: {
    width: 22 * SCALE,
    height: 22 * SCALE,
    borderRadius: 11 * SCALE,
    backgroundColor: '#000000',
    marginRight: -11 * SCALE,
    zIndex: 2,
  },
  ticketDottedLine: {
    flex: 1,
    borderBottomWidth: 1.2,
    borderStyle: 'dotted',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginHorizontal: 4 * SCALE,
  },

  // ─── Offer For You Box ───
  offerForYouWrapper: {
    marginHorizontal: 16 * SCALE,
    marginBottom: 16 * SCALE,
    position: 'relative',
    paddingTop: 8 * SCALE,
  },
  offerForYouBadge: {
    position: 'absolute',
    top: 0,
    left: 14 * SCALE,
    backgroundColor: '#DEA430',
    borderRadius: 4 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 2 * SCALE,
    zIndex: 3,
  },
  offerForYouBadgeText: {
    color: '#000000',
    fontSize: 10 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  offerForYouBox: {
    borderWidth: 1.5,
    borderColor: '#DEA430',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 14 * SCALE,
    backgroundColor: 'transparent',
  },
  offerForYouTitleText: {
    color: '#FFFFFF',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Ticket Footer Card ───
  ticketFooterWrap: {
    height: 52 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 16 * SCALE,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  ticketFooterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  ticketFooterText: {
    color: '#FFFFFF',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginLeft: 10 * SCALE,
    flex: 1,
  },
  ticketFooterGold: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── DineCash Banner (View 1) ───
  dineCashBannerWrap: {
    height: 54 * SCALE,
    borderRadius: 14 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.3)',
    marginBottom: 22 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 14 * SCALE,
  },
  dineCashBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  dineCashBannerText: {
    color: '#FFFFFF',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginLeft: 10 * SCALE,
    flex: 1,
  },
  dineCashBannerGold: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Section Shared Styles ───
  sectionWrap: {
    marginBottom: 22 * SCALE,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 12 * SCALE,
  },

  // ─── Number of guest(s) ───
  guestsScrollContainer: {
    flexDirection: 'row',
    gap: 10 * SCALE,
  },
  guestBox: {
    width: 58 * SCALE,
    height: 52 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestBoxActive: {
    backgroundColor: '#18140A',
    borderWidth: 1.5,
    borderColor: '#DEA430',
  },
  guestBoxText: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  guestBoxTextActive: {
    color: '#DEA430',
  },

  // ─── When are you visiting? ───
  datesScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * SCALE,
  },
  dateCard: {
    width: 72 * SCALE,
    height: 96 * SCALE,
    borderRadius: 16 * SCALE,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8 * SCALE,
    paddingBottom: 6 * SCALE,
  },
  dateCardActive: {
    backgroundColor: '#18140A',
    borderWidth: 1.5,
    borderColor: '#DEA430',
  },
  dateNumText: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dateNumTextActive: {
    color: '#DEA430',
  },
  dateDayText: {
    color: '#8E8E93',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginTop: 2,
    marginBottom: 6 * SCALE,
  },
  dateDayTextActive: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  discountBadgePill: {
    backgroundColor: '#DEA430',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 3 * SCALE,
  },
  discountBadgeText: {
    color: '#000000',
    fontSize: 10 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  monthVerticalPill: {
    width: 36 * SCALE,
    height: 96 * SCALE,
    borderRadius: 14 * SCALE,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthVerticalText: {
    color: '#8E8E93',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 2,
    transform: [{ rotate: '-90deg' }],
  },

  // ─── Time Slot Selector Big Card ───
  slotsCardContainer: {
    backgroundColor: '#121212',
    borderRadius: 20 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 16 * SCALE,
    marginBottom: 22 * SCALE,
  },
  mealToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 26 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 3 * SCALE,
    marginBottom: 18 * SCALE,
  },
  mealTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10 * SCALE,
    borderRadius: 22 * SCALE,
  },
  mealTabBtnActive: {
    backgroundColor: '#18140A',
    borderWidth: 1.5,
    borderColor: '#DEA430',
  },
  mealTabText: {
    color: '#8E8E93',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginLeft: 8 * SCALE,
  },
  mealTabTextActive: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  slotsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10 * SCALE,
  },
  slotBox: {
    width: '23.5%',
    paddingVertical: 9 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBoxActive: {
    backgroundColor: '#18140A',
    borderWidth: 1.5,
    borderColor: '#DEA430',
  },
  slotTimeText: {
    color: '#FFFFFF',
    fontSize: 11.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  slotTimeTextActive: {
    color: '#DEA430',
  },
  slotDiscountText: {
    color: '#DEA430',
    fontSize: 10 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginTop: 2,
  },
  slotDiscountTextActive: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Booking Option Section ───
  bookingOptionSection: {
    marginBottom: 20 * SCALE,
  },
  bookingOptionHeading: {
    color: '#FFFFFF',
    fontSize: 16.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 14 * SCALE,
  },
  bookingOptionTimeHighlight: {
    color: '#DEA430',
  },

  // ─── CARD 1: one EXCLUSIVE Card ───
  oneExclusiveCard: {
    backgroundColor: '#121212',
    borderRadius: 18 * SCALE,
    borderWidth: 1.2,
    borderColor: 'rgba(222, 164, 48, 0.4)',
    padding: 16 * SCALE,
    marginBottom: 14 * SCALE,
  },
  oneExclusiveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14 * SCALE,
  },
  quroBookTableBadgeImg: {
    width: 50 * SCALE,
    height: 17 * SCALE,
    marginRight: 4 * SCALE,
  },
  exclusiveLabelText: {
    color: '#DEA430',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  offerOptionBlock: {
    paddingVertical: 2 * SCALE,
  },
  offerOptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioCircle: {
    width: 22 * SCALE,
    height: 22 * SCALE,
    borderRadius: 11 * SCALE,
    borderWidth: 1.5,
    borderColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * SCALE,
    marginTop: 2 * SCALE,
  },
  radioCircleActive: {
    borderColor: '#DEA430',
    borderWidth: 2,
  },
  radioCircleDisabled: {
    borderColor: '#555555',
  },
  radioInnerDot: {
    width: 10 * SCALE,
    height: 10 * SCALE,
    borderRadius: 5 * SCALE,
    backgroundColor: '#DEA430',
  },
  radioInnerUnselected: {
    width: 0,
    height: 0,
  },
  offerDetailsCol: {
    flex: 1,
  },
  offerOptionTitle: {
    color: '#FFFFFF',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 4 * SCALE,
  },
  offerOptionSub: {
    color: '#8E8E93',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18 * SCALE,
  },
  offerOptionSubGold: {
    color: '#DEA430',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 18 * SCALE,
  },
  soldOutBadgeText: {
    color: '#FF453A',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 6 * SCALE,
  },
  cardInternalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14 * SCALE,
  },
  onePlanFooterNoteWrap: {
    paddingTop: 2 * SCALE,
  },
  onePlanFooterText: {
    color: '#CCCCCC',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18 * SCALE,
  },
  viewBenefitsLink: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ─── CARD 2: REGULAR OFFER Card ───
  regularOfferCard: {
    backgroundColor: '#121212',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16 * SCALE,
    marginBottom: 12 * SCALE,
  },
  regularOfferCardActive: {
    borderColor: 'rgba(222, 164, 48, 0.5)',
  },
  regularOfferLabel: {
    color: '#8E8E93',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12 * SCALE,
  },
  couponsAvailableNote: {
    color: '#8E8E93',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginVertical: 12 * SCALE,
  },

  // ─── Accordion Terms ───
  termsAccordionWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 16 * SCALE,
    marginTop: 4 * SCALE,
  },
  termsAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termsAccordionTitle: {
    color: '#FFFFFF',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  termsExpandedBody: {
    marginTop: 12 * SCALE,
    paddingLeft: 4 * SCALE,
    gap: 8 * SCALE,
  },
  termBulletText: {
    color: '#9E9E9E',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18 * SCALE,
  },

  // ─── Sticky Bottom Bar ───
  bottomStickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16 * SCALE,
    paddingTop: 12 * SCALE,
    zIndex: 30,
  },
  proceedBtn: {
    backgroundColor: '#DEA430',
    height: 52 * SCALE,
    borderRadius: 14 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedBtnText: {
    color: '#000000',
    fontSize: 17 * SCALE,
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
  modalCloseBtn: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 18 * SCALE,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#181818',
    borderRadius: 14 * SCALE,
    padding: 14 * SCALE,
    marginBottom: 12 * SCALE,
  },
  benefitItemTitle: {
    color: '#FFFFFF',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  benefitItemDesc: {
    color: '#999999',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 3,
    lineHeight: 17 * SCALE,
  },
  modalSubmitBtn: {
    backgroundColor: '#DEA430',
    height: 50 * SCALE,
    borderRadius: 14 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14 * SCALE,
  },
  modalSubmitBtnText: {
    color: '#000000',
    fontSize: 15 * SCALE,
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
});
