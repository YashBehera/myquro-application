import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ImageBackground,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

interface DeliveredOrderViewProps {
  orderId?: string;
  restaurantName?: string;
  riderName?: string;
  riderPhone?: string;
  itemsCount?: number;
  deliveredTime?: string;
  onBack?: () => void;
  onRateDelivery?: (rating: number) => void;
  onRateItems?: () => void;
  onContactSupport?: () => void;
  onExploreOffers?: () => void;
}

export const DeliveredOrderView: React.FC<DeliveredOrderViewProps> = ({
  orderId,
  restaurantName = 'Hotel Mayfair',
  riderName = 'HARAPRASAD S',
  riderPhone,
  itemsCount = 1,
  deliveredTime,
  onBack,
  onRateDelivery,
  onRateItems,
  onContactSupport,
  onExploreOffers,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedRating, setSelectedRating] = useState<number>(0);

  // Format delivered time (e.g., 05:56 PM)
  const formatTime = (timeStr?: string) => {
    if (!timeStr) {
      const now = new Date();
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    }
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    } catch {
      return timeStr;
    }
  };

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
    if (onRateDelivery) {
      onRateDelivery(rating);
    }
    Alert.alert('Thank You!', `You rated ${riderName} ${rating} star${rating > 1 ? 's' : ''}.`);
  };

  const handleCallRiderOrSupport = () => {
    if (riderPhone) {
      Linking.openURL(`tel:${riderPhone}`);
    } else if (onContactSupport) {
      onContactSupport();
    } else {
      Alert.alert('Delivery Support', 'Connecting you to delivery support hotline...');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 48 : 24) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* ── TOP HEADER (FIGMA NODE 3061:48) ─────────────────────────────────── */}
      <View style={styles.topHeader}>
        {/* Left: Back Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={styles.headerRoundBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#F2CA50" />
        </TouchableOpacity>

        {/* Center: Brand Title & Subtitle */}
        <View style={styles.headerCenter}>
          <View style={styles.brandTitleRow}>
            <Text style={styles.brandMyText}>My </Text>
            <Text style={styles.brandQuroText}>Quro</Text>
          </View>
          <Text style={styles.headerSubtitleText}>
            {formatTime(deliveredTime)}  ·  {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {/* Right: More Options Menu */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert('Order Options', `Order #${orderId || 'Recent'}`, [
              { text: 'View Invoice', onPress: () => {} },
              { text: 'Get Help', onPress: onContactSupport },
              { text: 'Close', style: 'cancel' },
            ]);
          }}
          style={styles.headerRoundBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#AE811F" />
        </TouchableOpacity>
      </View>

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 28) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO 3D RIDER SECTION ─────────────────────────────────────────── */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../assets/images/delivered-rider-hero.png')}
            style={styles.heroRiderImage}
            resizeMode="contain"
          />

          {/* Delivered Status Badge Row */}
          <View style={styles.deliveredBadgeRow}>
            <Image
              source={require('../../assets/images/delivered-sparkle-left.png')}
              style={styles.sparkleIcon}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/delivered-check-badge.png')}
              style={styles.checkBadgeIcon}
              resizeMode="contain"
            />
            <Text style={styles.deliveredBadgeText}>Delivered</Text>
            <Image
              source={require('../../assets/images/delivered-sparkle-right.png')}
              style={styles.sparkleIcon}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* ── CARD 1: DELIVERY RATING & SUPPORT CARD ────────────────────────── */}
        <View style={styles.feedbackCardContainer}>
          {/* Delivered by text */}
          <View style={styles.deliveredByRow}>
            <Text style={styles.deliveredByLabel}>Delivered by </Text>
            <Text style={styles.deliveredByRiderName}>{riderName.toUpperCase()}</Text>
          </View>

          {/* Question */}
          <Text style={styles.ratingQuestionText}>How would you rate the delivery?</Text>

          {/* 5 Stars Rating Row */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                activeOpacity={0.7}
                onPress={() => handleStarPress(star)}
                style={styles.starTouchable}
              >
                <Ionicons
                  name={star <= selectedRating ? 'star' : 'star-outline'}
                  size={30}
                  color={star <= selectedRating ? '#F2CA50' : '#4E4E4E'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cardDivider} />

          {/* Row 1: Rate items in this order */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onRateItems}
            style={styles.cardActionRow}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.actionIconCircle}>
                <Image
                  source={require('../../assets/images/delivered-bag-icon.png')}
                  style={styles.actionIconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.actionRowTitle}>Rate items in this order</Text>
            </View>

            <View style={styles.actionRowRight}>
              <Ionicons name="chevron-forward" size={16} color="#666666" style={{ marginRight: 8 }} />
              <Image
                source={require('../../assets/images/delivered-food-thumb.png')}
                style={styles.foodThumbImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>

          <View style={styles.cardDivider} />

          {/* Row 2: Order not delivered? / Contact Support */}
          <View style={styles.cardActionRow}>
            <View style={styles.actionRowLeft}>
              <View style={styles.actionIconCircle}>
                <Image
                  source={require('../../assets/images/delivered-headset-icon.png')}
                  style={styles.actionIconImage}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.supportTitle}>Order not delivered?</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onContactSupport || handleCallRiderOrSupport}
                >
                  <Text style={styles.supportSubtitle}>Contact Delivery Support</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Calling Pill Button with Rider Avatar */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCallRiderOrSupport}
              style={styles.riderCallPill}
            >
              <Ionicons name="call" size={16} color="#F2CA50" style={{ marginRight: 6 }} />
              <Image
                source={require('../../assets/images/delivered-rider-avatar.png')}
                style={styles.riderCallAvatar}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CARD 2: MY QURO PAY PROMO CASHBACK BANNER ─────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={onExploreOffers}
          style={styles.promoCardContainer}
        >
          <ImageBackground
            source={require('../../assets/images/delivered-promo-banner.png')}
            style={styles.promoImageBg}
            imageStyle={styles.promoImageStyle}
            resizeMode="cover"
          >
            <View style={styles.promoContentLeft}>
              {/* My Quro Pay Badge */}
              <View style={styles.promoBadgeRow}>
                <Text style={styles.promoBrandMy}>My </Text>
                <Text style={styles.promoBrandQuro}>Quro</Text>
                <View style={styles.promoPayPill}>
                  <Text style={styles.promoPayPillText}>Pay</Text>
                </View>
              </View>

              {/* Promo Pitch */}
              <Text style={styles.promoPitchLine1}>
                Get up to <Text style={styles.promoPitchGold}>5%cashback</Text>
              </Text>
              <Text style={styles.promoPitchLine2}>on every order</Text>

              {/* Explore Offers Button */}
              <View style={styles.exploreOffersBtn}>
                <Text style={styles.exploreOffersText}>EXPLORE OFFERS</Text>
                <Ionicons name="chevron-forward" size={13} color="#553F18" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010000',
  },

  /* TOP HEADER */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#010000',
  },
  headerRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandMyText: {
    color: '#AE811F',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Urbanist-Bold',
  },
  brandQuroText: {
    color: '#D1D1D1',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Urbanist-Bold',
  },
  headerSubtitleText: {
    color: '#666666',
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: 'Urbanist-Medium',
  },

  /* SCROLL CONTENT */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },

  /* HERO 3D RIDER */
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroRiderImage: {
    width: Math.min(SCREEN_WIDTH * 0.76, 380),
    height: Math.min(SCREEN_WIDTH * 0.76, 380) * 0.8,
  },
  deliveredBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 8,
  },
  sparkleIcon: {
    width: 14,
    height: 14,
  },
  checkBadgeIcon: {
    width: 22,
    height: 22,
  },
  deliveredBadgeText: {
    color: '#D2D2D2',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.3,
  },

  /* FEEDBACK & SUPPORT CARD */
  feedbackCardContainer: {
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginTop: 16,
  },
  deliveredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deliveredByLabel: {
    color: '#606060',
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: 'Urbanist-Regular',
  },
  deliveredByRiderName: {
    color: '#957634',
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.3,
  },
  ratingQuestionText: {
    color: '#CACACA',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'Urbanist-Bold',
    marginTop: 4,
    marginBottom: 14,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  starTouchable: {
    padding: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#161616',
    marginVertical: 14,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconImage: {
    width: 22,
    height: 22,
  },
  actionRowTitle: {
    color: '#AEAEAE',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Urbanist-Medium',
  },
  actionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodThumbImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  supportTitle: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Urbanist-Bold',
  },
  supportSubtitle: {
    color: '#8D7133',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Urbanist-Bold',
    marginTop: 2,
  },
  riderCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 22,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  riderCallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  /* PROMO CARD */
  promoCardContainer: {
    marginTop: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    backgroundColor: '#080808',
  },
  promoImageBg: {
    width: '100%',
    minHeight: 145,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  promoImageStyle: {
    borderRadius: 22,
  },
  promoContentLeft: {
    width: '62%',
  },
  promoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  promoBrandMy: {
    color: '#A47E2C',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Urbanist-Bold',
  },
  promoBrandQuro: {
    color: '#C3C3C3',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Urbanist-Bold',
  },
  promoPayPill: {
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: '#52431E',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  promoPayPillText: {
    color: '#A2823A',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Urbanist-Bold',
  },
  promoPitchLine1: {
    color: '#CACACA',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Urbanist-Medium',
  },
  promoPitchGold: {
    color: '#AE8B3F',
    fontWeight: '800',
    fontFamily: 'Urbanist-Bold',
  },
  promoPitchLine2: {
    color: '#C9C9C9',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Urbanist-Medium',
    marginBottom: 10,
  },
  exploreOffersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E4AC20',
    borderWidth: 1,
    borderColor: '#BF9A37',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exploreOffersText: {
    color: '#553F18',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.3,
  },
});

export default DeliveredOrderView;
