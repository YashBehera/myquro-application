/**
 * OrderConfirmationScreen.tsx — MyQuro Customer App
 * 
 * 100% Dynamic & Pixel-Perfect Implementation matching Figma Node 3046:88:
 * - Fullscreen sleek dark background (#030305)
 * - Exact same loader size and position as Phase 1 and Phase 2
 * - Radiant emerald green checkmark badge with gold particle sparkles & glowing arc
 * - "Order Placed!" dual-tone heading (Order in white, Placed! in gold)
 * - Sparkle divider line (-- ✦ --)
 * - "Thank you for your order, [Customer Name]"
 * - "Your order is being confirmed with the restaurant. We will notify you as soon as it's confirmed."
 * - Bottom 3-column summary card: Order ID (#MQ...) | Estimated Time (25-30mins) | Delivering to
 * - Bottom Primary CTA to Track Delivery
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  Clock,
  MapPin,
  ChevronRight,
  X,
} from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useViewModel } from '../state/MainViewModel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_WIDTH / 390, 0.88), 1.15);

// Fixed loader dimensions across ALL screens
const SPINNER_SIZE = 206 * SCALE;
const STROKE_WIDTH = 7.5 * SCALE;
const RADIUS = (SPINNER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface OrderConfirmationScreenProps {
  visible: boolean;
  onClose: () => void;
  onTrackDelivery: () => void;
  onBrowse?: () => void;
  onReorder?: () => void;
  onShare?: () => void;
  orderAmount?: number;
  orderId: string;
  restaurantName?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  userName?: string;
  estimatedDeliveryTime?: string;
}

export const OrderConfirmationScreen: React.FC<OrderConfirmationScreenProps> = ({
  visible,
  onClose,
  onTrackDelivery,
  onBrowse,
  orderId,
  restaurantName = 'Restaurant',
  deliveryAddress,
  userName,
  estimatedDeliveryTime,
}) => {
  const insets = useSafeAreaInsets();
  const { authState, currentLocation, savedAddresses, allRestaurants, cartItems } = useViewModel();

  const spinAnim = useRef(new Animated.Value(0)).current;
  const popAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleRotateAnim = useRef(new Animated.Value(0)).current;

  const currentRestaurant = allRestaurants?.find(r => 
    r.name.toLowerCase() === (restaurantName || '').toLowerCase() || 
    (cartItems && cartItems.length > 0 && r.id === cartItems[0].restaurantId)
  );

  const baseDeliveryMins = currentRestaurant?.deliveryTime || 30;
  const resolvedEstimatedTime = estimatedDeliveryTime || `${Math.max(20, baseDeliveryMins - 5)}-${baseDeliveryMins + 5} mins`;

  // Resolved Customer Name
  const resolvedUserName = userName || (authState.type === 'Authenticated' ? (authState.username || (authState as any).user?.name) : '') || '';

  // Resolved Delivery Address
  const resolvedAddress: string = deliveryAddress || currentLocation?.address || (savedAddresses.length > 0 ? savedAddresses[0].address : '') || 'Your Delivery Location';

  useEffect(() => {
    if (!visible) return;

    // Fade in overlay
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 360 loop rotation for gold arc
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // Sparkles slow rotation
    const sparkleLoop = Animated.loop(
      Animated.timing(sparkleRotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    sparkleLoop.start();

    // Pop animation for emerald checkmark badge
    Animated.spring(popAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    return () => {
      spinLoop.stop();
      sparkleLoop.stop();
    };
  }, [visible]);

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleRotation = sparkleRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  const displayOrderId = `#MQ${(orderId || '123456789').replace(/[^0-9]/g, '').slice(-9) || '123456789'}`;
  const shortAddress = resolvedAddress.length > 28 ? `${resolvedAddress.slice(0, 26)}...` : resolvedAddress;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#030305" translucent={false} />

      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
        {/* Top spacer */}
        <View style={{ height: insets.top + 32 * SCALE }} />

        {/* ════════════════════════════════════════════════════════════════════════
            [1] FIXED-POSITION CIRCULAR EMERALD CHECKMARK & GOLD SPARKLES
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.fixedSpinnerSection}>
          <View style={[styles.spinnerWrapper, { width: SPINNER_SIZE, height: SPINNER_SIZE }]}>
            {/* Floating Gold Sparkle Stars */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ rotate: sparkleRotation }] },
              ]}
            >
              <Svg width={SPINNER_SIZE} height={SPINNER_SIZE} style={StyleSheet.absoluteFill}>
                <Path d="M22 30L24 38L32 40L24 42L22 50L20 42L12 40L20 38Z" fill="#FBD766" opacity="0.9" />
                <Path d="M180 45L181.5 50L186.5 51.5L181.5 53L180 58L178.5 53L173.5 51.5L178.5 50Z" fill="#DEA430" opacity="0.8" />
                <Path d="M170 155L172 162L179 164L172 166L170 173L168 166L161 164L168 162Z" fill="#FFD700" opacity="0.95" />
                <Circle cx="35" cy="145" r="3" fill="#DEA430" opacity="0.75" />
                <Circle cx="190" cy="115" r="2.5" fill="#FBD766" opacity="0.8" />
              </Svg>
            </Animated.View>

            {/* Outer Circular Track */}
            <Svg width={SPINNER_SIZE} height={SPINNER_SIZE} style={StyleSheet.absoluteFill}>
              <Circle
                cx={SPINNER_SIZE / 2}
                cy={SPINNER_SIZE / 2}
                r={RADIUS}
                stroke="#1A1A20"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
            </Svg>

            {/* Rotating Glowing Gold Arc */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ rotate: spinRotation }] },
              ]}
            >
              <Svg width={SPINNER_SIZE} height={SPINNER_SIZE}>
                <Defs>
                  <LinearGradient id="confirmGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FBD766" stopOpacity="1" />
                    <Stop offset="55%" stopColor="#DEA430" stopOpacity="0.95" />
                    <Stop offset="100%" stopColor="#C4A541" stopOpacity="0.1" />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={SPINNER_SIZE / 2}
                  cy={SPINNER_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#confirmGoldGradient)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${CIRCUMFERENCE * 0.44} ${CIRCUMFERENCE * 0.56}`}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>

            {/* Center Emerald Green Checkmark Circle */}
            <Animated.View
              style={[
                styles.emeraldCheckCircle,
                {
                  width: SPINNER_SIZE - 32 * SCALE,
                  height: SPINNER_SIZE - 32 * SCALE,
                  borderRadius: (SPINNER_SIZE - 32 * SCALE) / 2,
                  transform: [{ scale: popAnim }],
                },
              ]}
            >
              <Svg width={76 * SCALE} height={76 * SCALE} viewBox="0 0 80 80" fill="none">
                <Path
                  d="M20 41L34 55L62 25"
                  stroke="#FFFFFF"
                  strokeWidth={7.5 * SCALE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [2] HEADINGS & SUBTITLE (FIGMA NODE 3046:88)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.fixedMiddleTextSection}>
          {/* "Order Placed!" Heading (Dual tone: white + gold) */}
          <View style={styles.orderPlacedTitleRow}>
            <Text style={styles.orderWhiteText}>Order </Text>
            <Text style={styles.placedGoldText}>Placed!</Text>
          </View>

          {/* Sparkle Divider */}
          <View style={styles.sparkleDividerRow}>
            <View style={styles.sparkleLine} />
            <Svg width={14 * SCALE} height={14 * SCALE} viewBox="0 0 24 24" fill="none">
              <Path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#DEA430" />
            </Svg>
            <View style={styles.sparkleLine} />
          </View>

          {/* Personalized Thank You & Status Message */}
          <Text style={styles.thankYouText}>Thank you for your order{resolvedUserName ? ',' : '!'}</Text>
          {resolvedUserName ? <Text style={styles.customerNameText}>{resolvedUserName}</Text> : null}

          <View style={styles.confirmationMsgContainer}>
            <Text style={styles.confirmationMsgLine}>Your order is being confirmed with the restaurant.</Text>
            <Text style={styles.confirmationMsgLine}>We will notify you as soon as it's confirmed.</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [3] BOTTOM 3-COLUMN ORDER SUMMARY CARD (FIGMA NODE 3046:108)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.bottomSection}>
          <View style={styles.orderSummaryCard}>
            {/* Column 1: Order ID */}
            <View style={styles.summaryCol}>
              <FileText size={20 * SCALE} color="#DEA430" strokeWidth={2.2} />
              <Text style={styles.summaryLabel}>Order ID</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{displayOrderId}</Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* Column 2: Estimated Time */}
            <View style={styles.summaryCol}>
              <Clock size={20 * SCALE} color="#DEA430" strokeWidth={2.2} />
              <Text style={styles.summaryLabel}>Estimated Time</Text>
              <Text style={styles.summaryValue}>{resolvedEstimatedTime}</Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* Column 3: Delivering to */}
            <View style={styles.summaryCol}>
              <MapPin size={20 * SCALE} color="#DEA430" strokeWidth={2.2} />
              <Text style={styles.summaryLabel}>Delivering to</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>{shortAddress}</Text>
            </View>
          </View>

          {/* Track Order CTA Button */}
          <TouchableOpacity
            style={styles.trackOrderBtn}
            activeOpacity={0.88}
            onPress={onTrackDelivery}
          >
            <Text style={styles.trackOrderBtnText}>Track Live Delivery</Text>
            <ChevronRight size={18 * SCALE} color="#000000" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={{ height: Math.max(insets.bottom, 12) }} />
      </Animated.View>
    </Modal>
  );
};

export default OrderConfirmationScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030305',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20 * SCALE,
  },
  fixedSpinnerSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: SPINNER_SIZE + 8 * SCALE,
  },
  spinnerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emeraldCheckCircle: {
    backgroundColor: '#0E9F6E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0E9F6E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#34D399',
  },
  fixedMiddleTextSection: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 18 * SCALE,
    minHeight: 220 * SCALE,
  },
  orderPlacedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10 * SCALE,
  },
  orderWhiteText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 34 * SCALE,
    color: '#DADADA',
    letterSpacing: -0.5,
  },
  placedGoldText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 34 * SCALE,
    color: '#D4A42A',
    letterSpacing: -0.5,
  },
  sparkleDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 * SCALE,
    marginBottom: 16 * SCALE,
  },
  sparkleLine: {
    width: 42 * SCALE,
    height: 1.5,
    backgroundColor: '#C4A541',
    opacity: 0.85,
    borderRadius: 1,
  },
  thankYouText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 2,
  },
  customerNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#E6E6E6',
    textAlign: 'center',
    marginBottom: 10 * SCALE,
  },
  confirmationMsgContainer: {
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
  },
  confirmationMsgLine: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5 * SCALE,
    color: '#7E7E7E',
    textAlign: 'center',
    lineHeight: 19 * SCALE,
  },
  bottomSection: {
    width: '100%',
    gap: 14 * SCALE,
  },
  orderSummaryCard: {
    width: '100%',
    backgroundColor: '#0B0B0B',
    borderWidth: 1,
    borderColor: '#202020',
    borderRadius: 24 * SCALE,
    paddingVertical: 18 * SCALE,
    paddingHorizontal: 10 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4 * SCALE,
    paddingHorizontal: 4 * SCALE,
  },
  summaryLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#717171',
    textAlign: 'center',
  },
  summaryValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#A9A9A9',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 48 * SCALE,
    backgroundColor: '#202020',
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 16 * SCALE,
    paddingVertical: 14 * SCALE,
    gap: 8 * SCALE,
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  trackOrderBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#000000',
  },
});
