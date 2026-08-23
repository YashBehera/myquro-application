import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function ThankYouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.replace('/(tabs)');
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Svg width={46} height={38} viewBox="0 0 60 50" fill="none">
              <Path
                d="M 12 40 L 24 16 L 33 28 L 45 8 M 37 8 H 45 V 16"
                stroke="#E8C547"
                strokeWidth={5.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.logoText}>MyQuro</Text>
          </View>

          {/* Onboarding Complete Hero Illustration */}
          <View style={styles.illustrationWrapper}>
            <Image
              source={require('../../assets/image copy 6.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Main Success Content Card */}
          <View style={styles.card}>
            {/* Circular Checkmark Badge */}
            <View style={styles.checkmarkBadgeWrapper}>
              <View style={styles.checkmarkBadge}>
                <Ionicons name="checkmark" size={26} color="#0B0B0B" />
              </View>
            </View>

            {/* Thank you titles */}
            <Text style={styles.thankYouTitle}>Thank you!</Text>
            <Text style={styles.thankYouSubtitle}>We've received your details.</Text>

            <View style={styles.horizontalDivider} />

            {/* Step/Info List */}
            {/* Info Item 1 */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="people-sharp" size={18} color="#E8C547" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoTitle}>
                  <Text style={styles.goldText}>MyQuro team</Text> will review and approve it.
                </Text>
                <Text style={styles.infoDescription}>
                  Our team will carefully verify your information to ensure everything is perfect.
                </Text>
              </View>
            </View>

            <View style={styles.innerDivider} />

            {/* Info Item 2 */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar-outline" size={18} color="#E8C547" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoTitle}>
                  Your restaurant will be live in <Text style={styles.goldText}>72 hr</Text> of work days.
                </Text>
                <Text style={styles.infoDescription}>
                  Once approved, your restaurant will go live within 72 working hours.
                </Text>
              </View>
            </View>

            <View style={styles.innerDivider} />

            {/* Info Item 3 */}
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#E8C547" />
              </View>
              <View style={styles.infoTextWrapper}>
                <Text style={styles.infoTextOnly}>
                  You will receive an email & SMS notification once your restaurant is live.
                </Text>
              </View>
            </View>

            {/* Custom Interactive Progress Redirect Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(secondsLeft / 10) * 100}%` }]} />
              </View>
              <Text style={styles.redirectText}>
                Redirecting to dashboard in <Text style={styles.countdownNumber}>{secondsLeft}s</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  logoText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  illustrationWrapper: {
    width: width * 0.85,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    width: '100%',
    backgroundColor: '#191919',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 18,
    paddingTop: 34,
    paddingBottom: 22,
    position: 'relative',
    marginTop: 16,
  },
  checkmarkBadgeWrapper: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E8C547',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  thankYouTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 26,
    color: '#E8C547',
    textAlign: 'center',
    marginTop: 4,
  },
  thankYouSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  goldText: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
  infoDescription: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 2,
    lineHeight: 16,
  },
  innerDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 14,
    marginLeft: 48,
  },
  infoTextOnly: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
    flex: 1,
  },
  progressContainer: {
    marginTop: 22,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#141414',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E8C547',
    borderRadius: 2,
  },
  redirectText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
  },
  countdownNumber: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
});
