/**
 * OrderSendingLoaderScreen.tsx — MyQuro Customer App
 * 
 * 100% Dynamic & Pixel-Perfect Implementation matching Figma Node 3046:78:
 * - Fullscreen sleek dark background (#0C0C0C)
 * - Exact same loader size and position as Phase 1 and Phase 3
 * - Inner dark street-grid map radar disc with glowing golden Home Map Pin
 * - "Placing order to" primary heading + dynamic [Restaurant Name]
 * - "Please wait while we confirm your order details." subtitle
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G, Line } from 'react-native-svg';

import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

// Fixed loader dimensions across ALL screens
const SPINNER_SIZE = 206 * SCALE;
const STROKE_WIDTH = 7.5 * SCALE;
const RADIUS = (SPINNER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface OrderSendingLoaderScreenProps {
  visible: boolean;
  restaurantName?: string;
  orderId?: string;
  onComplete: () => void;
}

export const OrderSendingLoaderScreen: React.FC<OrderSendingLoaderScreenProps> = ({
  visible,
  restaurantName = 'Restaurant',
  orderId,
  onComplete,
}) => {
  const insets = useSafeAreaInsets();

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pinBounceAnim = useRef(new Animated.Value(0)).current;
  const pinGlowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!visible) return;

    // Fade in overlay
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 360 loop rotation
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // Subtle scale pulse on center map pin
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Pin gentle floating bounce
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pinBounceAnim, {
          toValue: -4,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pinBounceAnim, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    bounceLoop.start();

    // Pin dot glow
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pinGlowAnim, {
          toValue: 1.0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pinGlowAnim, {
          toValue: 0.3,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    // Auto complete after 2.6s
    const timer = setTimeout(() => {
      onComplete();
    }, 2600);

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      bounceLoop.stop();
      glowLoop.stop();
      clearTimeout(timer);
    };
  }, [visible, onComplete]);

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0C0C0C" translucent={false} />

      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
        <View style={{ height: insets.top + 32 * SCALE }} />

        {/* ════════════════════════════════════════════════════════════════════════
            [1] FIXED-POSITION CIRCULAR RADAR & HOME MAP PIN
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.fixedSpinnerSection}>
          <View style={[styles.spinnerWrapper, { width: SPINNER_SIZE, height: SPINNER_SIZE }]}>
            {/* Inner Dark Street Map Radar Grid */}
            <View style={[styles.mapRadarDisc, { width: SPINNER_SIZE - 22, height: SPINNER_SIZE - 22, borderRadius: (SPINNER_SIZE - 22) / 2 }]}>
              <Svg width={SPINNER_SIZE - 22} height={SPINNER_SIZE - 22} viewBox="0 0 190 190">
                <Line x1="20" y1="50" x2="170" y2="140" stroke="#181820" strokeWidth="3" />
                <Line x1="140" y1="20" x2="50" y2="170" stroke="#181820" strokeWidth="3" />
                <Line x1="40" y1="120" x2="160" y2="40" stroke="#181820" strokeWidth="2" />
                <Line x1="95" y1="10" x2="95" y2="180" stroke="#16161D" strokeWidth="2.5" />
                <Line x1="10" y1="95" x2="180" y2="95" stroke="#16161D" strokeWidth="2.5" />
                <Circle cx="95" cy="95" r="45" stroke="#14141A" strokeWidth="2" fill="none" />
                <Circle cx="95" cy="95" r="70" stroke="#121218" strokeWidth="1.5" fill="none" />
              </Svg>
            </View>

            {/* Background Circular Track */}
            <Svg width={SPINNER_SIZE} height={SPINNER_SIZE} style={StyleSheet.absoluteFill}>
              <Circle
                cx={SPINNER_SIZE / 2}
                cy={SPINNER_SIZE / 2}
                r={RADIUS}
                stroke="#1F1F26"
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
                  <LinearGradient id="radarGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FBD766" stopOpacity="1" />
                    <Stop offset="55%" stopColor="#DEA430" stopOpacity="0.95" />
                    <Stop offset="100%" stopColor="#C4A541" stopOpacity="0.1" />
                  </LinearGradient>
                </Defs>
                <Circle
                  cx={SPINNER_SIZE / 2}
                  cy={SPINNER_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#radarGoldGradient)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${CIRCUMFERENCE * 0.44} ${CIRCUMFERENCE * 0.56}`}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>

            {/* Center Glowing Gold Home Map Pin */}
            <Animated.View
              style={[
                styles.pinCenterBadge,
                {
                  transform: [
                    { translateY: pinBounceAnim },
                    { scale: pulseAnim },
                  ],
                },
              ]}
            >
              <Svg width={46 * SCALE} height={58 * SCALE} viewBox="0 0 46 58" fill="none">
                <Path
                  d="M23 2C12.5066 2 4 10.5066 4 21C4 32.5 21 48.5 23 50C25 48.5 42 32.5 42 21C42 10.5066 33.4934 2 23 2Z"
                  stroke="#DEA430"
                  strokeWidth={2.4 * SCALE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="#110E06"
                />
                <G transform="translate(13.5, 11) scale(0.8)">
                  <Path
                    d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
                    stroke="#DEA430"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="#1A1508"
                  />
                  <Path
                    d="M9 21V12H15V21"
                    stroke="#DEA430"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </G>
              </Svg>

              <Animated.View
                style={[
                  styles.pinGlowPoint,
                  { opacity: pinGlowAnim },
                ]}
              />
            </Animated.View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [2] HEADINGS & SUBTITLE (FIGMA NODE 3046:85, 86)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.fixedMiddleTextSection}>
          <Text style={styles.placingTitle}>Placing order to</Text>
          <Text style={styles.restaurantTitle} numberOfLines={2}>
            {restaurantName}
          </Text>

          <View style={styles.subTextContainer}>
            <Text style={styles.subTextLine}>Please wait while we confirm</Text>
            <Text style={styles.subTextLine}>your order details.</Text>
          </View>
        </View>

        <View style={{ height: insets.bottom + 40 * SCALE }} />
      </Animated.View>
    </Modal>
  );
};

export default OrderSendingLoaderScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0C0C0C',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24 * SCALE,
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
  mapRadarDisc: {
    position: 'absolute',
    backgroundColor: '#0D0D11',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pinCenterBadge: {
    width: 60 * SCALE,
    height: 70 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pinGlowPoint: {
    position: 'absolute',
    bottom: 2,
    width: 7 * SCALE,
    height: 7 * SCALE,
    borderRadius: 3.5 * SCALE,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 5,
  },
  fixedMiddleTextSection: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 18 * SCALE,
    minHeight: 220 * SCALE,
  },
  placingTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 32 * SCALE,
    color: '#E4E4E4',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6 * SCALE,
  },
  restaurantTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 23 * SCALE,
    color: '#DEA430',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 20 * SCALE,
    paddingHorizontal: 12 * SCALE,
  },
  subTextContainer: {
    alignItems: 'center',
  },
  subTextLine: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 16 * SCALE,
    color: '#8E8E8E',
    textAlign: 'center',
    lineHeight: 22 * SCALE,
  },
});
