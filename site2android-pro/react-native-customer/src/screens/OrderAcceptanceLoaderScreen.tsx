import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Platform,
  Animated,
  Easing,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, FileText, BellRing, Sparkles, XCircle } from 'lucide-react-native';
import Svg, { Rect, Path, Circle, Ellipse, Line, G } from 'react-native-svg';
import CHEF_IMG from '../assets/chef.png';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config';
import { useViewModel } from '../state/MainViewModel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND_RED = '#FF181F';

interface LoaderProps {
  visible: boolean;
  onComplete: () => void;
  onCancel?: () => void;
  orderId?: string | null;
}

// Custom Dotted Spinner for React Native
const DottedSpinner = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.spinnerContainer, { transform: [{ rotate: rotation }] }]}>
      {[...Array(8)].map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x = 10 + 7.5 * Math.cos(angle - Math.PI / 2);
        const y = 10 + 7.5 * Math.sin(angle - Math.PI / 2);
        const opacity = 0.2 + (i / 7) * 0.8;

        return (
          <View
            key={i}
            style={[
              styles.spinnerDot,
              {
                left: x - 1.5,
                top: y - 1.5,
                opacity,
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
};

// Green Check icon
const GreenCheck = () => (
  <View style={styles.checkCircle}>
    <Text style={styles.checkIcon}>✓</Text>
  </View>
);

export const OrderAcceptanceLoaderScreen: React.FC<LoaderProps> = ({
  visible,
  onComplete,
  onCancel,
  orderId,
}) => {
  const [progress, setProgress] = useState(0);
  const bellShakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const { authState } = useViewModel();
  const sessionToken = authState.type === 'Authenticated' ? authState.sessionToken : '';

  const [isAccepted, setIsAccepted] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const socketRef = useRef<any>(null);

  // Poll for order acceptance if WebSocket fails
  useEffect(() => {
    if (!visible || !orderId || isCancelled) return;

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/detail`, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.order) {
            if (data.order.status === 'cancelled') {
              setIsCancelled(true);
            } else if (data.order.status !== 'placed') {
              setIsAccepted(true);
            }
          }
        }
      } catch (err) {
        console.error("Error polling order status:", err);
      }
    };

    // Initial check
    checkStatus();

    // Set up polling interval
    const interval = setInterval(() => {
      if (isMounted && !isAccepted && !isCancelled) {
        checkStatus();
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [visible, orderId, isAccepted, isCancelled, sessionToken]);

  // WebSocket connection for order updates
  useEffect(() => {
    if (!visible || !orderId || isCancelled) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      auth: {
        sessionToken: sessionToken,
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`🔌 [OrderAcceptanceLoader] Joined order room: ${orderId}`);
      socket.emit('join-order', orderId);
    });

    socket.on('order-status', (data: any) => {
      console.log('📡 [OrderAcceptanceLoader] order-status socket event:', data);
      if (data.status === 'cancelled') {
        setIsCancelled(true);
      } else if (data.status && data.status !== 'placed') {
        setIsAccepted(true);
      }
    });

    socket.on('delivery-update', (data: any) => {
      console.log('📡 [OrderAcceptanceLoader] delivery-update socket event:', data.status);
      if (data.status === 'cancelled') {
        setIsCancelled(true);
      } else if (data.status && data.status !== 'placed') {
        setIsAccepted(true);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [visible, orderId, isCancelled, sessionToken]);

  // Bell shaking and chef/bag float
  useEffect(() => {
    if (!visible) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(bellShakeAnim, { toValue: 5, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bellShakeAnim, { toValue: -5, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bellShakeAnim, { toValue: 5, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(bellShakeAnim, { toValue: 0, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1200),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [visible, bellShakeAnim, floatAnim]);

  // Handle progress animation & checklists
  useEffect(() => {
    if (!visible) {
      setProgress(0);
      setIsAccepted(false);
      setIsCancelled(false);
      return;
    }

    // Phase 1: progress up to 35% in 1.2s
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 35) {
          return prev + 2;
        } else if (prev < 45) {
          // Slowly tick up while waiting
          return prev + 0.2;
        } else {
          return prev;
        }
      });
    }, 80);

    return () => clearInterval(timer);
  }, [visible]);

  // Handle final completion steps once accepted
  useEffect(() => {
    if (!visible) return;

    // Fallback: If no orderId is passed, auto-accept after 3.2 seconds
    if (!orderId) {
      const fallbackTimer = setTimeout(() => {
        setIsAccepted(true);
      }, 3200);
      return () => clearTimeout(fallbackTimer);
    }

    if (isAccepted) {
      // 1. Advance Row 2 spinner. Move progress to 80%
      setProgress(80);

      // 2. After 600ms, check row 3 (Almost Done). Move progress to 100%
      const timer1 = setTimeout(() => {
        setProgress(100);
      }, 600);

      // 3. After 1100ms, finish loader
      const timer2 = setTimeout(() => {
        onComplete();
      }, 1100);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isAccepted, visible, orderId, onComplete]);

  if (!visible) return null;

  if (isCancelled) {
    return (
      <SafeAreaView style={[styles.overlayContainer, { backgroundColor: '#FFFDFD' }]}>
        <View style={styles.contentWrapper}>
          
          {/* Top Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.mainHeading, { color: '#E03546' }]}>
              Order <Text style={{ color: '#111111' }}>Declined</Text>
            </Text>
            <Text style={styles.subheading}>
              The restaurant declined or cancelled the order request
            </Text>
          </View>

          {/* Large Error Illustration */}
          <View style={styles.errorIconContainer}>
            <XCircle size={100} color="#E03546" strokeWidth={1.5} />
            <Text style={styles.errorBigText}>Not Accepted</Text>
          </View>

          {/* Detailed Message Box */}
          <View style={styles.cancellationDetailCard}>
            <Text style={styles.cancellationDetailTitle}>What happened?</Text>
            <Text style={styles.cancellationDetailText}>
              The restaurant is currently experiencing high order volumes or is short of ingredients and couldn't process your items.
            </Text>
            
            <View style={styles.refundNotice}>
              <ShieldCheck size={16} color="#059669" strokeWidth={2.5} />
              <Text style={styles.refundNoticeText}>
                Refund Status: <Text style={{ color: '#059669', fontWeight: 'bold' }}>Initiated</Text>. Rupees will be returned to your source account automatically in 2-3 business days.
              </Text>
            </View>
          </View>

          {/* Promo Coupon Apology */}
          <View style={styles.apologyPromoCard}>
            <View style={styles.promoHeaderRow}>
              <Sparkles size={16} color="#D97706" />
              <Text style={styles.promoCouponTitle}>WE ARE SORRY!</Text>
            </View>
            <Text style={styles.promoCouponText}>
              Please accept a discount coupon on your next order:
            </Text>
            <View style={styles.promoCodePill}>
              <Text style={styles.promoCodeText}>SORRY50</Text>
            </View>
            <Text style={styles.promoExpiryText}>₹50 OFF • Valid for 7 days</Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={styles.returnButton} 
            onPress={() => {
              if (onCancel) {
                onCancel();
              } else {
                onComplete();
              }
            }}
          >
            <Text style={styles.returnButtonText}>Return to Restaurants</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.overlayContainer}>
      <View style={styles.contentWrapper}>
          
          {/* Top Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.mainHeading}>
              Placing <Text style={styles.highlightRed}>Your Order</Text>
            </Text>
            <Text style={styles.subheading}>
              Please wait while we place your order securely
            </Text>
          </View>

          <Image
            source={CHEF_IMG}
            style={styles.chefImage}
            resizeMode="contain"
          />

          {/* Under-illustration Status Messaging */}
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>
              Waiting for <Text style={{ color: BRAND_RED }}>Restaurant</Text> Acceptance
            </Text>
            <Text style={styles.statusSubtitle}>
              The restaurant is reviewing your order.{"\n"}We'll notify you once it's accepted.
            </Text>

            {/* Phase 3-dot indicator */}
            <View style={styles.phaseIndicatorContainer}>
              <View style={styles.phaseDot} />
              <View style={styles.phaseDot} />
              <View style={[styles.phaseDot, styles.phaseDotActive]} />
            </View>
          </View>

          {/* Status Row Checklist Card */}
          <View style={styles.checklistCard}>
            {/* Row 1: Restaurant Reviewing */}
            <View style={styles.checkItemRow}>
              <View style={styles.checkItemLeft}>
                <View style={styles.iconCircleBg}>
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND_RED} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M6 18V17a4 4 0 0 1 8 0v1" />
                    <Path d="M18 18h.01" />
                    <Path d="M4 18h.01" />
                    <Path d="M12 2a5 5 0 0 0-4.9 4H16.9A5 5 0 0 0 12 2Z" />
                    <Path d="M8.5 14.5A2.5 2.5 0 1 0 12 11" />
                  </Svg>
                </View>
                <View>
                  <Text style={styles.checkItemTitle}>Restaurant Reviewing</Text>
                  <Text style={styles.checkItemSubtitle}>The restaurant is checking your order</Text>
                </View>
              </View>
              <View>
                {progress > 35 ? <GreenCheck /> : <DottedSpinner />}
              </View>
            </View>

            <View style={styles.cardSeparator} />

            {/* Row 2: Verifying Items */}
            <View style={styles.checkItemRow}>
              <View style={styles.checkItemLeft}>
                <View style={styles.iconCircleBg}>
                  <FileText size={18} color={BRAND_RED} strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.checkItemTitle}>Verifying Items & Availability</Text>
                  <Text style={styles.checkItemSubtitle}>Ensuring all items are available</Text>
                </View>
              </View>
              <View>
                {progress > 75 ? (
                  <GreenCheck />
                ) : progress > 35 ? (
                  <DottedSpinner />
                ) : (
                  <Text style={styles.loadingDots}>...</Text>
                )}
              </View>
            </View>

            <View style={styles.cardSeparator} />

            {/* Row 3: Almost Done */}
            <View style={styles.checkItemRow}>
              <View style={styles.checkItemLeft}>
                <View style={styles.iconCircleBg}>
                  <BellRing size={18} color={BRAND_RED} strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={styles.checkItemTitle}>Almost Done</Text>
                  <Text style={styles.checkItemSubtitle}>Confirming acceptance details</Text>
                </View>
              </View>
              <View>
                {progress >= 100 ? (
                  <GreenCheck />
                ) : progress > 75 ? (
                  <DottedSpinner />
                ) : (
                  <Text style={styles.loadingDots}>...</Text>
                )}
              </View>
            </View>
          </View>

          {/* SAFEGUARD WARNING BANNER */}
          <View style={styles.safeguardBanner}>
            <View style={styles.safeguardIconBg}>
              <ShieldCheck size={18} color={BRAND_RED} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.safeguardText}>
                Don't worry, we don't charge until your order is accepted by the restaurant.
              </Text>
            </View>
          </View>

          <Text style={styles.bottomFooterLabel}>
            This will only take a few seconds...
          </Text>

          <Text style={styles.systemStatusLabel}>
            SYNCHRONIZING WITH ORDER DESK
          </Text>

        </View>

        {/* Bottom Wave Graphic */}
        <View style={styles.bottomWaveContainer}>
          <Svg width="100%" height="100%" viewBox="0 0 460 100" preserveAspectRatio="none">
            <Path d="M0 45 C120 75, 240 5, 460 70 L460 100 L0 100 Z" fill="#FF181F" />
            <Path d="M0 60 C150 90, 300 20, 460 85 L460 100 L0 100 Z" fill="#D60A13" opacity="0.4" />
          </Svg>
        </View>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: '#fefefe',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainHeading: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111111',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  highlightRed: {
    color: BRAND_RED,
  },
  subheading: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
  },
  chefImage: {
    width: 280,
    height: 280,
    marginVertical: 18,
    alignSelf: 'center',
  },
  paperBag: {
    position: 'absolute',
    left: 45,
    top: 92,
    width: 54,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bagBrandText: {
    position: 'absolute',
    fontSize: 8.5,
    fontWeight: '900',
    color: '#911416',
    top: 24,
    textAlign: 'center',
  },
  chefContainer: {
    position: 'absolute',
    left: 110,
    bottom: 24,
    width: 80,
    height: 110,
  },
  speechBubbleContainer: {
    position: 'absolute',
    top: 14,
    left: 54,
    width: 105,
    height: 62,
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -6,
    left: 40,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    zIndex: 2,
  },
  speechBubbleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
  },
  redBellContainer: {
    position: 'absolute',
    top: -10,
    left: 42,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  bubbleText: {
    fontSize: 7.2,
    fontWeight: '900',
    color: '#111111',
    marginTop: 8,
    textAlign: 'center',
  },
  bubbleLine1: {
    height: 2.5,
    backgroundColor: '#FEE2E2',
    borderRadius: 1.25,
    width: '85%',
    marginTop: 6,
  },
  bubbleLine2: {
    height: 2.5,
    backgroundColor: '#FEE2E2',
    borderRadius: 1.25,
    width: '60%',
    marginTop: 4,
  },
  spinnerContainer: {
    width: 20,
    height: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: BRAND_RED,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
  },
  statusTextContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  phaseIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
  },
  phaseDotActive: {
    backgroundColor: BRAND_RED,
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  checklistCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircleBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkItemTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  checkItemSubtitle: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1.5,
  },
  cardSeparator: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 10,
  },
  loadingDots: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: 'bold',
    paddingRight: 6,
  },
  safeguardBanner: {
    width: '100%',
    backgroundColor: '#FFF2F3',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 12,
  },
  safeguardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND_RED,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  safeguardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 14,
  },
  bottomFooterLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 18,
  },
  systemStatusLabel: {
    fontSize: 8.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#CBD5E1',
    fontWeight: 'bold',
    marginTop: 6,
    letterSpacing: 1,
  },
  bottomWaveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 55,
  },
  errorIconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  errorBigText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E03546',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  cancellationDetailCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 18,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
    marginBottom: 16,
  },
  cancellationDetailTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  cancellationDetailText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    fontWeight: '500',
  },
  refundNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  refundNoticeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
    lineHeight: 13,
  },
  apologyPromoCard: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 16,
    alignItems: 'center',
    marginBottom: 28,
  },
  promoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  promoCouponTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  promoCouponText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    textAlign: 'center',
  },
  promoCodePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D97706',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginVertical: 10,
  },
  promoCodeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 1,
  },
  promoExpiryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  returnButton: {
    width: '100%',
    backgroundColor: '#FF181F',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF181F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
