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

export default function InsuranceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  const handleNeedHelp = () => {
    router.push('/help-support');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0A08" translucent />

      {/* TOP HEADER: BACK BUTTON */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
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

        {/* CENTER GRAPHIC ILLUSTRATION CANVAS */}
        <View style={styles.graphicCanvasWrapper}>
          {/* Background Ambient Cloud Shape */}
          <View style={styles.cloudBackdropLayer} />

          {/* Golden Sparkles Decorative Accents */}
          <Ionicons name="sparkles" size={14} color="#F2CA50" style={[styles.sparkle, styles.sparkleTopLeft]} />
          <Ionicons name="sparkles" size={16} color="#F2CA50" style={[styles.sparkle, styles.sparkleTopRight]} />
          <Ionicons name="star" size={8} color="#F2CA50" style={[styles.sparkle, styles.sparkleMidLeft]} />
          <Ionicons name="star" size={8} color="#F2CA50" style={[styles.sparkle, styles.sparkleMidRight]} />
          <Ionicons name="sparkles" size={14} color="#F2CA50" style={[styles.sparkle, styles.sparkleBottomLeft]} />

          {/* Decorative Dotted Matrix */}
          <View style={styles.dotsMatrixRight}>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
            <View style={styles.dotRow}>
              <View style={styles.tinyDot} />
              <View style={styles.tinyDot} />
            </View>
          </View>

          {/* 3D Insurance Shield & Document Graphic */}
          <View style={styles.graphicImageContainer}>
            <Image
              source={require('../../assets/images/insurance_illustration.png')}
              style={styles.graphicImage}
              resizeMode="contain"
            />
            {/* Soft Bottom Gold Glow */}
            <View style={styles.goldGlowEllipse} />
          </View>
        </View>

        {/* COMING SOON HEADLINE & SUBTITLE */}
        <View style={styles.headlineBlock}>
          <Text style={styles.comingSoonTitle}>
            Coming <Text style={styles.soonGoldText}>Soon</Text>
          </Text>

          <View style={styles.goldIndicatorPill} />

          <Text style={styles.subtitleDescriptionText}>
            We're working on something amazing{'\n'}to bring you the best insurance{'\n'}experience. Stay tuned!
          </Text>
        </View>

        {/* GLOWING NOTIFICATION BELL ACTION BUTTON */}
        <TouchableOpacity style={styles.bellButtonWrapper} activeOpacity={0.85}>
          <View style={styles.bellButtonHalo}>
            <Ionicons name="notifications-outline" size={26} color="#F2CA50" />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1, minHeight: 32 }} />

        {/* NEED HELP? BOTTOM CARD */}
        <TouchableOpacity
          onPress={handleNeedHelp}
          style={styles.needHelpCard}
          activeOpacity={0.85}
        >
          <View style={styles.helpLeftSection}>
            <View style={styles.headsetIconWrapper}>
              <Ionicons name="headset" size={26} color="#F2CA50" />
            </View>
            <View style={styles.helpTextColumn}>
              <Text style={styles.needHelpTitle}>Need Help?</Text>
              <Text style={styles.needHelpSubtitle}>
                Our support team is always here for you.
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#F2CA50" />
        </TouchableOpacity>
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
    marginTop: 6,
    marginBottom: 24,
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
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 6,
  },
  cloudBackdropLayer: {
    position: 'absolute',
    width: 260,
    height: 150,
    backgroundColor: 'rgba(35, 30, 20, 0.45)',
    borderRadius: 50,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 2,
  },
  sparkleTopLeft: {
    top: 15,
    left: 35,
    opacity: 0.85,
  },
  sparkleTopRight: {
    top: 25,
    right: 35,
    opacity: 0.9,
  },
  sparkleMidLeft: {
    top: 80,
    left: 10,
    opacity: 0.6,
  },
  sparkleMidRight: {
    top: 90,
    right: 20,
    opacity: 0.6,
  },
  sparkleBottomLeft: {
    bottom: 25,
    left: 40,
    opacity: 0.8,
  },
  dotsMatrixRight: {
    position: 'absolute',
    right: 30,
    bottom: 45,
    gap: 5,
    zIndex: 2,
    opacity: 0.35,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 5,
  },
  tinyDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#F2CA50',
  },
  graphicImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    position: 'relative',
  },
  graphicImage: {
    width: 240,
    height: 230,
  },
  goldGlowEllipse: {
    position: 'absolute',
    bottom: -8,
    width: 150,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(242, 202, 80, 0.25)',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  headlineBlock: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  soonGoldText: {
    color: '#F2CA50',
  },
  goldIndicatorPill: {
    width: 36,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#F2CA50',
    marginTop: 14,
    marginBottom: 16,
  },
  subtitleDescriptionText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#B5B5B5',
    textAlign: 'center',
    lineHeight: 22,
  },
  bellButtonWrapper: {
    marginTop: 4,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellButtonHalo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1C1810',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  needHelpCard: {
    width: '100%',
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  helpLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headsetIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(242, 202, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTextColumn: {
    flex: 1,
  },
  needHelpTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  needHelpSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#9E9E9E',
    lineHeight: 18,
  },
});
