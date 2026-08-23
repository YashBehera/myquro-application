import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function ReusableBagsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0A08" translucent />

      {/* TOP BAR: BACK BUTTON */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtnTouch}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BRANDING HEADER: MyQuro. WITH GOLDEN ACCENT LINES */}
        <View style={styles.brandHeaderContainer}>
          <LinearGradient
            colors={['transparent', 'rgba(242, 202, 80, 0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.brandAccentLine}
          />
          <Text style={styles.brandTextGold}>
            My<Text style={styles.brandTextWhite}>Quro</Text>
            <Text style={styles.brandDot}>.</Text>
          </Text>
          <LinearGradient
            colors={['transparent', 'rgba(242, 202, 80, 0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.brandAccentLine}
          />
        </View>

        {/* CENTER BAG GRAPHIC WITH AMBIENT SHADOW AND SPARKLES */}
        <View style={styles.graphicCanvasWrapper}>
          {/* Background Ambient Cloud Shape */}
          <View style={styles.cloudBackdropLayer} />

          {/* Golden Sparkles Decorative Accents */}
          <Ionicons name="sparkles" size={14} color="#F2CA50" style={[styles.sparkle, styles.sparkleTopLeft]} />
          <Ionicons name="sparkles" size={16} color="#F2CA50" style={[styles.sparkle, styles.sparkleTopRight]} />
          <Ionicons name="star" size={8} color="#F2CA50" style={[styles.sparkle, styles.sparkleMidLeft]} />
          <Ionicons name="star" size={8} color="#F2CA50" style={[styles.sparkle, styles.sparkleMidRight]} />
          <Ionicons name="sparkles" size={14} color="#F2CA50" style={[styles.sparkle, styles.sparkleBottomLeft]} />
          <Ionicons name="sparkles" size={14} color="#F2CA50" style={[styles.sparkle, styles.sparkleBottomRight]} />

          {/* MyQuro Reusable Bag 3D Asset */}
          <View style={styles.bagImageContainer}>
            <Image
              source={require('../../assets/images/myquro_reusable_bag.png')}
              style={styles.bagGraphicImage}
              resizeMode="contain"
            />
            {/* Soft Bottom Gold Glow */}
            <View style={styles.goldGlowEllipse} />
          </View>
        </View>

        {/* STATUS TEXT & GOLD INDICATOR PILL */}
        <View style={styles.statusTextBlock}>
          <Text style={styles.statusTextLine}>
            You do not have any{'\n'}reusable bags for return
          </Text>
          <View style={styles.goldIndicatorPill} />
        </View>

        <View style={{ flex: 1, minHeight: 40 }} />

        {/* QUICK TIP BOTTOM CARD */}
        <View style={styles.quickTipCard}>
          <View style={styles.tipHeaderRow}>
            <Text style={styles.bulbEmoji}>💡</Text>
            <Text style={styles.tipTitleText}>Quick Tip</Text>
            <Text style={styles.bulbEmoji}>💡</Text>
          </View>

          <Text style={styles.tipDescriptionText}>
            Return the bags to the MyQuro store while picking up your next order to save time.
          </Text>

          <View style={styles.cardBottomDivider} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0A08',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnTouch: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  brandHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    marginBottom: 36,
  },
  brandAccentLine: {
    width: 60,
    height: 1.5,
  },
  brandTextGold: {
    fontSize: 28,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
    letterSpacing: -0.5,
  },
  brandTextWhite: {
    color: '#FFFFFF',
  },
  brandDot: {
    color: '#F2CA50',
  },
  graphicCanvasWrapper: {
    width: 280,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  cloudBackdropLayer: {
    position: 'absolute',
    width: 260,
    height: 140,
    backgroundColor: 'rgba(35, 30, 20, 0.45)',
    borderRadius: 50,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 2,
  },
  sparkleTopLeft: {
    top: 15,
    left: 45,
    opacity: 0.8,
  },
  sparkleTopRight: {
    top: 25,
    right: 45,
    opacity: 0.9,
  },
  sparkleMidLeft: {
    top: 90,
    left: 15,
    opacity: 0.6,
  },
  sparkleMidRight: {
    top: 100,
    right: 25,
    opacity: 0.6,
  },
  sparkleBottomLeft: {
    bottom: 25,
    left: 55,
    opacity: 0.8,
  },
  sparkleBottomRight: {
    bottom: 20,
    right: 55,
    opacity: 0.8,
  },
  bagImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    position: 'relative',
  },
  bagGraphicImage: {
    width: 250,
    height: 220,
  },
  goldGlowEllipse: {
    position: 'absolute',
    bottom: -6,
    width: 140,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(242, 202, 80, 0.25)',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  statusTextBlock: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  statusTextLine: {
    fontSize: 21,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  goldIndicatorPill: {
    width: 38,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#F2CA50',
    marginTop: 18,
  },
  quickTipCard: {
    width: '100%',
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.22)',
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bulbEmoji: {
    fontSize: 16,
  },
  tipTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    textDecorationColor: '#F2CA50',
  },
  tipDescriptionText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#B5B5B5',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 12,
  },
  cardBottomDivider: {
    width: 44,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F2CA50',
    opacity: 0.7,
    marginTop: 18,
  },
});
