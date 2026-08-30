/**
 * InstamartScreen.tsx — MyQuro Customer App
 * 
 * Pixel-by-pixel implementation of MyQuro Instamart "Coming Soon" screen:
 * - Header with gold circular back button, "Instamart" title, and gold circular search button
 * - MyQuro instamart COMING SOON! radiant typography & golden light flare
 * - 3D Black Luxury Grocery Basket with iconic golden "Q" branding and fresh groceries
 * - "Get ready for MyQuro Instamart" card with 3 core pillars:
 *     1. Wide range of essentials
 *     2. Lightning-fast delivery
 *     3. Trusted quality every time
 * - Footer with "We're working hard to serve you better." and "✦ Stay tuned! ✦"
 * - Compact single-screen non-scrolling flex layout
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Search,
  ShieldCheck,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop, Path } from 'react-native-svg';
import { SCREEN_WIDTH } from '../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 3D Grocery Basket with Q Logo asset
const instamartBasketImg = require('../assets/home/instamart_basket.png');

interface InstamartScreenProps {
  onBack: () => void;
  onNavigateToSearch?: () => void;
}

export const InstamartScreen: React.FC<InstamartScreenProps> = ({
  onBack,
  onNavigateToSearch,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ── TOP FLOATING HEADER ── */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerLeftWrap}>
          {/* Gold Border Circular Back Button */}
          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.8}
            onPress={onBack}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={22} color="#DEA430" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Instamart</Text>
        </View>

        {/* Gold Border Circular Search Button */}
        <TouchableOpacity
          style={styles.circleBtn}
          activeOpacity={0.8}
          onPress={onNavigateToSearch}
          accessibilityLabel="Search"
        >
          <Search size={20} color="#DEA430" />
        </TouchableOpacity>
      </View>

      {/* ── MAIN NON-SCROLLING FLEX CONTAINER ── */}
      <View style={[styles.mainBody, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* ── HERO BRANDING & HEADLINE ── */}
        <View style={styles.heroSection}>
          {/* Floating Sparkles */}
          <Text style={styles.sparkleTopLeft}>✦</Text>
          <Text style={styles.sparkleMidRight}>✦</Text>
          <Text style={styles.sparkleFarLeft}>✦</Text>
          <Text style={styles.sparkleFarRight}>✦</Text>

          {/* MyQuro Brand Name */}
          <View style={styles.brandRow}>
            <Text style={styles.brandMy}>My</Text>
            <Text style={styles.brandQuro}>Quro</Text>
          </View>

          {/* instamart Wordmark */}
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmarkInsta}>insta</Text>
            <Text style={styles.wordmarkMart}>mart</Text>
          </View>

          {/* COMING SOON! */}
          <Text style={styles.comingSoonText}>COMING SOON!</Text>

          {/* Golden Horizontal Flare Beam */}
          <View style={styles.flareContainer}>
            <Svg height="3" width={SCREEN_WIDTH * 0.70} viewBox="0 0 280 3">
              <Defs>
                <SvgLinearGradient id="goldFlare" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#DEA430" stopOpacity="0" />
                  <Stop offset="25%" stopColor="#DEA430" stopOpacity="0.5" />
                  <Stop offset="50%" stopColor="#FFDE82" stopOpacity="1" />
                  <Stop offset="75%" stopColor="#DEA430" stopOpacity="0.5" />
                  <Stop offset="100%" stopColor="#DEA430" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="280" height="3" fill="url(#goldFlare)" />
            </Svg>
          </View>

          {/* Subtitle */}
          <Text style={styles.heroSubtitle}>
            Your everyday essentials,{'\n'}delivered in minutes.
          </Text>
        </View>

        {/* ── 3D GROCERY BASKET WITH Q BRANDING ── */}
        <View style={styles.basketContainer}>
          <Image
            source={instamartBasketImg}
            style={styles.basketImage}
            resizeMode="contain"
          />
        </View>

        {/* ── GET READY FOR MYQURO INSTAMART CARD ── */}
        <View style={styles.featureCard}>
          {/* Top Floating Badge with Gold Accent Lines */}
          <View style={styles.topBadgeWrapper}>
            <View style={styles.badgeLineLeft}>
              <Svg height="2" width="55" viewBox="0 0 55 2">
                <Defs>
                  <SvgLinearGradient id="lineLeftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#DEA430" stopOpacity="0" />
                    <Stop offset="100%" stopColor="#DEA430" stopOpacity="0.8" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="55" height="2" fill="url(#lineLeftGrad)" />
              </Svg>
            </View>

            <View style={styles.centerBadgeCircle}>
              {/* Shopping Bag Icon */}
              <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                  stroke="#F5BA42"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M3 6H21"
                  stroke="#F5BA42"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                  stroke="#F5BA42"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            <View style={styles.badgeLineRight}>
              <Svg height="2" width="55" viewBox="0 0 55 2">
                <Defs>
                  <SvgLinearGradient id="lineRightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#DEA430" stopOpacity="0.8" />
                    <Stop offset="100%" stopColor="#DEA430" stopOpacity="0" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="55" height="2" fill="url(#lineRightGrad)" />
              </Svg>
            </View>
          </View>

          {/* Card Title */}
          <Text style={styles.cardHeaderSmall}>Get ready for</Text>
          <Text style={styles.cardHeaderGold}>MyQuro Instamart</Text>

          {/* 3 Pillars Row */}
          <View style={styles.pillarsRow}>
            {/* Pillar 1: Wide range of essentials */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarIconWrap}>
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4 10H20L18.5 20H5.5L4 10Z"
                    stroke="#DEA430"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 10V6C9 5.20435 9.31607 4.44129 9.87868 3.87868C10.4413 3.31607 11.2044 3 12 3C12.7956 3 13.5587 3.31607 14.1213 3.87868C14.6839 4.44129 15 5.20435 15 6V10"
                    stroke="#DEA430"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M9 14V17M15 14V17"
                    stroke="#DEA430"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.pillarText}>
                Wide range of{'\n'}essentials
              </Text>
            </View>

            {/* Vertical Divider */}
            <View style={styles.pillarDivider} />

            {/* Pillar 2: Lightning-fast delivery */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarIconWrap}>
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="#DEA430"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M12 6V12L16 14"
                    stroke="#DEA430"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M2 9H6M2 15H6"
                    stroke="#DEA430"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.pillarText}>
                Lightning-fast{'\n'}delivery
              </Text>
            </View>

            {/* Vertical Divider */}
            <View style={styles.pillarDivider} />

            {/* Pillar 3: Trusted quality every time */}
            <View style={styles.pillarItem}>
              <View style={styles.pillarIconWrap}>
                <ShieldCheck size={24} color="#DEA430" strokeWidth={1.8} />
              </View>
              <Text style={styles.pillarText}>
                Trusted quality{'\n'}every time
              </Text>
            </View>
          </View>
        </View>

        {/* ── FOOTER SECTION ── */}
        <View style={styles.footerSection}>
          <Text style={styles.footerHelpText}>
            We're working hard to serve you better.
          </Text>

          <View style={styles.stayTunedRow}>
            <Text style={styles.stayTunedSparkle}>✦</Text>
            <Text style={styles.stayTunedText}>Stay tuned!</Text>
            <Text style={styles.stayTunedSparkle}>✦</Text>
          </View>
        </View>
      </View>
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
    paddingHorizontal: 16,
    paddingBottom: 4,
    backgroundColor: '#000000',
    zIndex: 20,
  },
  headerLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    color: '#FFFFFF',
    marginLeft: 14,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(20, 16, 10, 0.88)',
    borderWidth: 1.2,
    borderColor: '#C69B34',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── MAIN NON-SCROLLING BODY ──
  mainBody: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // ── HERO SECTION ──
  heroSection: {
    alignItems: 'center',
    marginTop: 4,
    position: 'relative',
    width: '100%',
  },
  sparkleTopLeft: {
    position: 'absolute',
    top: 0,
    left: 20,
    color: '#DEA430',
    fontSize: 16,
  },
  sparkleMidRight: {
    position: 'absolute',
    top: 36,
    right: 24,
    color: '#DEA430',
    fontSize: 15,
  },
  sparkleFarLeft: {
    position: 'absolute',
    top: 72,
    left: 32,
    color: '#DEA430',
    fontSize: 13,
  },
  sparkleFarRight: {
    position: 'absolute',
    top: 84,
    right: 64,
    color: '#DEA430',
    fontSize: 12,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMy: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  brandQuro: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    color: '#F5BA42',
    letterSpacing: 0.2,
  },

  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
  },
  wordmarkInsta: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 42,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  wordmarkMart: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 42,
    color: '#F5BA42',
    letterSpacing: -0.5,
  },

  comingSoonText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 24,
    color: '#F5BA42',
    letterSpacing: 2,
    marginTop: -2,
    textShadowColor: 'rgba(245, 186, 66, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  flareContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },

  heroSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    color: '#D8D8D8',
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── 3D BASKET ──
  basketContainer: {
    width: SCREEN_WIDTH - 20,
    maxWidth: 420,
    height: Math.min((SCREEN_WIDTH - 20) / 1.5, SCREEN_HEIGHT * 0.28),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  basketImage: {
    width: '100%',
    height: '100%',
  },

  // ── FEATURE CARD ──
  featureCard: {
    width: SCREEN_WIDTH - 32,
    maxWidth: 440,
    backgroundColor: '#0A0A09',
    borderWidth: 1.2,
    borderColor: '#241F16',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 16,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  topBadgeWrapper: {
    position: 'absolute',
    top: -22,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLineLeft: {
    marginRight: 6,
  },
  centerBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F0E0B',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  badgeLineRight: {
    marginLeft: 6,
  },

  cardHeaderSmall: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardHeaderGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    color: '#F5BA42',
    textAlign: 'center',
    marginTop: 1,
  },

  pillarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  pillarItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  pillarIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pillarText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 10.5,
    color: '#C4C4C4',
    textAlign: 'center',
    lineHeight: 14,
  },
  pillarDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#241F16',
  },

  // ── FOOTER ──
  footerSection: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  footerHelpText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  stayTunedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
  },
  stayTunedSparkle: {
    color: '#F5BA42',
    fontSize: 12,
  },
  stayTunedText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#F5BA42',
    letterSpacing: 0.3,
  },
});
