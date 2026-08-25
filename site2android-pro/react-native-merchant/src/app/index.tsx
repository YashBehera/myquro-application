import React, { useState, useEffect, useRef } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/state/authStore';
import { apiClient } from '@/services/apiClient';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    image: require('../../assets/images/restaurant_onboarding_hero.png'),
    renderHeadline: () => (
      <Text style={styles.headlineText}>
        <Text style={styles.headlineWhite}>Access to </Text>
        <Text style={styles.headlineGold}>MyQuro</Text>
        <Text style={styles.headlineWhite}> tools{'\n'}and support</Text>
      </Text>
    ),
  },
  {
    image: require('../../assets/images/onboarding_hero_2.png'),
    renderHeadline: () => (
      <Text style={styles.headlineText}>
        <Text style={styles.headlineWhite}>Increase your </Text>
        <Text style={styles.headlineGold}>online order</Text>
        <Text style={styles.headlineWhite}>{'\n'}and reach customers</Text>
      </Text>
    ),
  },
  {
    image: require('../../assets/images/onboarding_hero_3.png'),
    renderHeadline: () => (
      <Text style={styles.headlineText}>
        <Text style={styles.headlineWhite}>Grow your </Text>
        <Text style={styles.headlineGold}>restaurant</Text>
        <Text style={styles.headlineWhite}> business{'\n'}with MyQuro</Text>
      </Text>
    ),
  },
];

export default function RestaurantOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);


  // Animated opacity for ultra-smooth 60fps cross-fade for both image and headline
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Cycles slides with a smooth 450ms cross-fade every 4.5 seconds
    const interval = setInterval(() => {
      // Smooth fade-out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        // Next slide index (0 -> 1 -> 2 -> 0)
        setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
        // Smooth fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  // Strict numeric input filtering (digits only, max 10 digits)
  const handleInputChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '');
    const limited = numericOnly.slice(0, 10);
    setInputValue(limited);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleContinue = async () => {
    // Validate exact 10 digits
    if (inputValue.length !== 10) {
      setErrorMessage('Please enter an exact 10-digit mobile number');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      console.log("Checking merchant account by phone number:", inputValue);
      const response = await apiClient.post('/customer/auth/merchant-login-phone', { phone: inputValue });
      const { token, onboardingStatus, user } = response.data;

      // Clear old caches for clean session
      try {
        await AsyncStorage.multiRemove([
          '@myquro_active_restaurant_id',
          '@myquro_restaurant_menu_v2',
          '@myquro_restaurant_menu_v1',
          '@placed_orders_history',
        ]);
      } catch {}

      // Log in the user in the app state
      await useAuthStore.getState().setToken(token);
      useAuthStore.getState().setUser(user);

      // Prime active restaurant profile
      try {
        const restRes = await apiClient.get('/restaurants/my-restaurant', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (restRes.data?.restaurant?.id) {
          await AsyncStorage.setItem('@myquro_active_restaurant_id', restRes.data.restaurant.id);
        }
      } catch (e) {
        console.warn('Could not prime active restaurant cache:', e);
      }

      console.log(`Merchant login successful. Onboarding status: ${onboardingStatus}`);

      if (onboardingStatus === 'APPROVED') {
        // Bypass onboarding completely
        router.replace('/(tabs)');
      } else if (onboardingStatus === 'PENDING') {
        router.replace('/thank-you');
      } else {
        router.push('/onboarding-checklist');
      }
    } catch (error: any) {
      // If profile not found, it is a new merchant onboarding flow
      console.log("Merchant profile query completed, starting onboarding flow:", error?.response?.data || error.message);
      router.push('/onboarding-checklist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Hero Image Section with Animated Cross-Fade */}
      <View style={styles.heroImageWrapper}>
        <Animated.View style={[styles.heroImageContainer, { opacity: fadeAnim }]}>
          <Image
            source={SLIDES[currentSlideIndex].image}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Multi-stop gradient overlay for seamless dark background blending */}
        <LinearGradient
          colors={[
            'rgba(11, 13, 18, 0.4)',
            'rgba(11, 13, 18, 0.05)',
            'rgba(11, 13, 18, 0.5)',
            'rgba(11, 13, 18, 0.95)',
            '#0B0D12',
          ]}
          locations={[0, 0.25, 0.65, 0.88, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Top Spacer positioning content below hero showcase */}
            <View style={styles.topSpacer} />

            {/* Middle Content Section */}
            <View style={styles.contentSection}>
              {/* Partner Banner */}
              <View style={styles.partnerRow}>
                <View style={styles.partnerTextWrapper}>
                  <Text style={styles.partnerText}>PARTNER WITH MYQURO!</Text>
                  <View style={styles.partnerUnderline} />
                </View>
              </View>

              {/* Dynamic Animated Value Proposition Headline */}
              <Animated.View style={[styles.headlineContainer, { opacity: fadeAnim }]}>
                {SLIDES[currentSlideIndex].renderHeadline()}
              </Animated.View>

              {/* Carousel / Progress Indicator Bars synced with active slide */}
              <View style={styles.indicatorRow}>
                <View
                  style={[
                    styles.indicatorBar,
                    currentSlideIndex === 0 ? styles.indicatorActive : styles.indicatorInactive,
                  ]}
                />
                <View
                  style={[
                    styles.indicatorBar,
                    currentSlideIndex === 1 ? styles.indicatorActive : styles.indicatorInactive,
                  ]}
                />
                <View
                  style={[
                    styles.indicatorBar,
                    currentSlideIndex === 2 ? styles.indicatorActive : styles.indicatorInactive,
                  ]}
                />
              </View>
            </View>

            {/* Bottom Interactive Card */}
            <View style={styles.bottomCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleColumn}>
                  <Text style={styles.cardTitle}>
                    <Text style={styles.cardTitleWhite}>Get </Text>
                    <Text style={styles.cardTitleGold}>Started</Text>
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Enter a mobile number or restaurant ID{'\n'}to continue
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.infoButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    color="rgba(255, 255, 255, 0.65)"
                  />
                </TouchableOpacity>
              </View>

              {/* Input Field (Numbers Only, Exact 10 Digits) */}
              <View
                style={[
                  styles.inputContainer,
                  errorMessage ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="call"
                  size={18}
                  color={errorMessage ? '#EF4444' : '#F5A623'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Restaurant ID / Mobile number"
                  placeholderTextColor="rgba(255, 255, 255, 0.38)"
                  value={inputValue}
                  onChangeText={handleInputChange}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {inputValue.length > 0 && (
                  <Text style={styles.charCounter}>{inputValue.length}/10</Text>
                )}
              </View>

              {/* Validation Error Text */}
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              {/* CTA Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.ctaButton}
                onPress={handleContinue}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#FDC830', '#F39C12', '#E67E22']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={19} color="#000000" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Footer Terms & Conditions */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By logging in, I agree to MyQuro's{' '}
                  <Text style={styles.termsLink}>terms & conditions</Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  heroImageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.52,
    width: '100%',
  },
  heroImageContainer: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topSpacer: {
    height: height * 0.32,
  },

  /* Content Section */
  contentSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  partnerTextWrapper: {
    alignSelf: 'flex-start',
  },
  partnerText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 13,
    letterSpacing: 1.1,
    color: '#FFFFFF',
  },
  partnerUnderline: {
    width: 64,
    height: 2.5,
    backgroundColor: '#F5A623',
    borderRadius: 2,
    marginTop: 2,
  },
  headlineContainer: {
    marginTop: 4,
    marginBottom: 16,
    minHeight: 74,
  },
  headlineText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 30,
    lineHeight: 37,
  },
  headlineWhite: {
    color: '#FFFFFF',
  },
  headlineGold: {
    color: '#F5A623',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  indicatorBar: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#F5A623',
  },
  indicatorInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },

  /* Bottom Card */
  bottomCard: {
    backgroundColor: 'rgba(17, 20, 29, 0.94)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleColumn: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 24,
    lineHeight: 28,
  },
  cardTitleWhite: {
    color: '#FFFFFF',
  },
  cardTitleGold: {
    color: '#F5A623',
  },
  cardSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.68)',
    lineHeight: 18,
    marginTop: 4,
  },
  infoButton: {
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: 'rgba(13, 16, 24, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'Urbanist-Regular',
    paddingVertical: 0,
  },
  charCounter: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 8,
  },
  errorText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  ctaButton: {
    height: 52,
    borderRadius: 14,
    marginTop: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ctaText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    color: '#000000',
    marginRight: 8,
  },
  termsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  termsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.62)',
    textAlign: 'center',
  },
  termsLink: {
    color: '#F5A623',
    fontFamily: 'Urbanist-Medium',
    textDecorationLine: 'underline',
  },
});
