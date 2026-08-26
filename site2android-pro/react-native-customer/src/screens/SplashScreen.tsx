import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViewModel } from '../state/MainViewModel';

const { width, height } = Dimensions.get('window');

// Exact Figma dimensions (Node 3061:118: 342 x 283)
const LOGO_WIDTH = Math.round(Math.min(width * 0.48, 200));
const LOGO_HEIGHT = Math.round(LOGO_WIDTH * (283 / 342));

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationEnd }) => {
  const insets = useSafeAreaInsets();
  const { currentLocation } = useViewModel();

  // Animation values for Swiggy-style staged entrance
  const logoScale = useRef(new Animated.Value(0.35)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  const addressOpacity = useRef(new Animated.Value(0)).current;
  const addressTranslateY = useRef(new Animated.Value(-24)).current;

  const screenFadeOut = useRef(new Animated.Value(1)).current;

  // Format Location Text from ViewModel (Fallback to Figma defaults if not yet set)
  const locationLabel = currentLocation?.label || 'Gym';
  
  let placeName = 'The Iron Fist GYM,';
  let streetAddress = 'L.S Complex,Plot No-784,2nd Floor,L.S Comp...';

  if (currentLocation?.address && currentLocation.address.trim().length > 0) {
    const parts = currentLocation.address.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      placeName = `${parts[0]},`;
      streetAddress = parts.slice(1).join(', ');
    } else if (parts.length === 1) {
      placeName = parts[0];
      streetAddress = currentLocation.address;
    }
  }

  useEffect(() => {
    // ─── STAGE 1: Logo Zoom In & Fade In (Swiggy Spring Pop) ───
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 65,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle breathing glow loop after initial zoom pop
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, {
            toValue: 1.035,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoPulse, {
            toValue: 1,
            duration: 850,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // ─── STAGE 2: Address Cascasdes & Drops Down after Logo Pops ───
    const addressTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(addressOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(addressTranslateY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]).start();
    }, 380);

    // ─── STAGE 3: Smooth Exit Transition to HomeScreen ───
    const exitTimer = setTimeout(() => {
      Animated.timing(screenFadeOut, {
        toValue: 0,
        duration: 320,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        onAnimationEnd();
      });
    }, 2200);

    return () => {
      clearTimeout(addressTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeOut }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* Top Location Information (Cascades down in Stage 2) */}
      <View
        style={[
          styles.topInfoContainer,
          { paddingTop: insets.top > 0 ? insets.top + (height * 0.065) : 48 },
        ]}
      >
        <Animated.View
          style={{
            opacity: addressOpacity,
            transform: [{ translateY: addressTranslateY }],
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Main Label: e.g. "Gym" (Figma Node 3061:121) */}
          <Text style={styles.locationTag}>{locationLabel}</Text>

          {/* Place Name: e.g. "The Iron Fist GYM," (Figma Node 3061:120) */}
          <Text style={styles.placeName}>{placeName}</Text>

          {/* Street Address: (Figma Node 3061:119) */}
          <Text style={styles.streetAddress} numberOfLines={1} ellipsizeMode="tail">
            {streetAddress}
          </Text>
        </Animated.View>
      </View>

      {/* Center Golden Glowing "Q" Logo (Zooms In in Stage 1) */}
      <View style={styles.centerLogoWrapper}>
        <Animated.View
          style={[
            styles.logoAnimatedBox,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { scale: logoPulse }],
            },
          ]}
        >
          <Image
            source={require('../assets/images/figma_gold_q_logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topInfoContainer: {
    width: '100%',
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  locationTag: {
    fontSize: 27,
    fontFamily: 'Urbanist-ExtraBold',
    fontWeight: '800',
    color: '#E3E3E3',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  placeName: {
    fontSize: 15.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#B08E38',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.15,
  },
  streetAddress: {
    fontSize: 13.5,
    fontFamily: 'Urbanist-Regular',
    color: '#848584',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: width * 0.86,
    letterSpacing: -0.1,
  },
  centerLogoWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.09,
  },
  logoAnimatedBox: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
