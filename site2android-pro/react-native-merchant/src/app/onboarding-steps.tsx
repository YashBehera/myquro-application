import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Natural image dimensions (1220 x 1289)
const IMAGE_HEIGHT = width * (1289 / 1220);

export default function OnboardingStepsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ step?: string }>();

  const currentActiveStep = params.step ? parseInt(params.step) : 1;

  const handleProceedStep1 = () => {
    // Navigate to Restaurant Information (Step 1)
    router.push('/restaurant-information');
  };

  const handleProceedStep2 = () => {
    // Navigate to Restaurant Documents (Step 2)
    router.push('/restaurant-documents');
  };

  const handleProceedStep3 = () => {
    // Navigate to Menu Setup (Step 3)
    router.push('/menu-setup');
  };

  const handleProceedStep4 = () => {
    // Navigate to Partner Contract (Step 4)
    router.push('/partner-contract');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Proportional Hero Background Image */}
      <View style={styles.heroBackgroundWrapper}>
        <Image
          source={require('../../assets/image.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Multi-Stop Dark Fade Gradient for Text Readability */}
        <LinearGradient
          colors={[
            'rgba(11, 13, 18, 0.45)',
            'rgba(11, 13, 18, 0.2)',
            'rgba(11, 13, 18, 0.45)',
            'rgba(11, 13, 18, 0.78)',
            '#07090E',
          ]}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Navigation Bar */}
          <View style={styles.topNav}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#E8C547" />
            </TouchableOpacity>
          </View>

          {/* Hero Header Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroTextColumn}>
              <View style={styles.goldAccentLine} />
              <Text style={styles.title}>
                Let's finish{'\n'}
                <Text style={styles.titleGold}>onboarding</Text> you!
              </Text>
              <Text style={styles.subtitle}>In less than 10 minutes</Text>
            </View>
          </View>

          {/* Main Steps Container Card (Translucent Glassmorphism) */}
          <View style={styles.stepsCard}>
            {/* STEP 1: Restaurant Information */}
            <View style={styles.stepContainer}>
              <View style={styles.timelineLeftColumn}>
                {currentActiveStep > 1 ? (
                  <View style={styles.completedStepBadge}>
                    <Ionicons name="checkmark" size={18} color="#0B0D12" />
                  </View>
                ) : (
                  <View style={styles.activeStepBadge}>
                    <Text style={styles.activeStepText}>1</Text>
                  </View>
                )}
                {/* Dotted Connecting Line */}
                <View style={styles.dottedLine} />
              </View>

              <View style={styles.stepContentColumn}>
                <View style={styles.stepHeaderRow}>
                  <Text style={styles.stepLabelActive}>STEP 1</Text>
                  {currentActiveStep > 1 && (
                    <Text style={styles.completedLabelText}>Completed ✓</Text>
                  )}
                </View>
                <Text style={styles.stepTitle}>Restaurant Information</Text>
                <Text style={styles.stepDescription}>
                  Location, Owner details, Open & Close hrs.
                </Text>

                {currentActiveStep === 1 ? (
                  /* Proceed Button for Step 1 */
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.proceedButton}
                    onPress={handleProceedStep1}
                  >
                    <LinearGradient
                      colors={['#FDC830', '#F39C12', '#E67E22']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.proceedGradient}
                    >
                      <Text style={styles.proceedText}>Proceed</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#0B0D12"
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  /* Edit action if completed */
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.editStepRow}
                    onPress={handleProceedStep1}
                  >
                    <Text style={styles.editStepText}>Edit details</Text>
                    <Ionicons name="pencil" size={13} color="#E8C547" />
                  </TouchableOpacity>
                )}

                <View style={styles.stepDivider} />
              </View>
            </View>

            {/* STEP 2: Restaurant Documents */}
            <View style={styles.stepContainer}>
              <View style={styles.timelineLeftColumn}>
                {currentActiveStep === 2 ? (
                  <View style={styles.activeStepBadge}>
                    <Text style={styles.activeStepText}>2</Text>
                  </View>
                ) : currentActiveStep > 2 ? (
                  <View style={styles.completedStepBadge}>
                    <Ionicons name="checkmark" size={18} color="#0B0D12" />
                  </View>
                ) : (
                  <View style={styles.inactiveStepBadge}>
                    <Text style={styles.inactiveStepText}>2</Text>
                  </View>
                )}
                <View style={styles.dottedLine} />
              </View>

              <View style={styles.stepContentColumn}>
                <View style={styles.stepHeaderRow}>
                  <Text
                    style={
                      currentActiveStep >= 2
                        ? styles.stepLabelActive
                        : styles.stepLabelInactive
                    }
                  >
                    STEP 2
                  </Text>
                  {currentActiveStep > 2 && (
                    <Text style={styles.completedLabelText}>Completed ✓</Text>
                  )}
                </View>
                <Text
                  style={
                    currentActiveStep >= 2
                      ? styles.stepTitle
                      : styles.stepTitleInactive
                  }
                >
                  Restaurant Documents
                </Text>

                {currentActiveStep === 2 ? (
                  <>
                    <Text style={styles.stepDescription}>
                      FSSAI certificate, Bank details, PAN card, GSTIN
                    </Text>
                    {/* Proceed Button for Step 2 */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.proceedButton}
                      onPress={handleProceedStep2}
                    >
                      <LinearGradient
                        colors={['#FDC830', '#F39C12', '#E67E22']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.proceedGradient}
                      >
                        <Text style={styles.proceedText}>Proceed</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#0B0D12"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : currentActiveStep > 2 ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.editStepRow}
                    onPress={handleProceedStep2}
                  >
                    <Text style={styles.editStepText}>Edit details</Text>
                    <Ionicons name="pencil" size={13} color="#E8C547" />
                  </TouchableOpacity>
                ) : null}

                <View style={styles.stepDivider} />
              </View>
            </View>

            {/* STEP 3: Menu Setup */}
            <View style={styles.stepContainer}>
              <View style={styles.timelineLeftColumn}>
                {currentActiveStep === 3 ? (
                  <View style={styles.activeStepBadge}>
                    <Text style={styles.activeStepText}>3</Text>
                  </View>
                ) : currentActiveStep > 3 ? (
                  <View style={styles.completedStepBadge}>
                    <Ionicons name="checkmark" size={18} color="#0B0D12" />
                  </View>
                ) : (
                  <View style={styles.inactiveStepBadge}>
                    <Text style={styles.inactiveStepText}>3</Text>
                  </View>
                )}
                <View style={styles.dottedLine} />
              </View>

              <View style={styles.stepContentColumn}>
                <View style={styles.stepHeaderRow}>
                  <Text
                    style={
                      currentActiveStep >= 3
                        ? styles.stepLabelActive
                        : styles.stepLabelInactive
                    }
                  >
                    STEP 3
                  </Text>
                  {currentActiveStep > 3 && (
                    <Text style={styles.completedLabelText}>Completed ✓</Text>
                  )}
                </View>
                <Text
                  style={
                    currentActiveStep >= 3
                      ? styles.stepTitle
                      : styles.stepTitleInactive
                  }
                >
                  Menu Setup
                </Text>

                {currentActiveStep === 3 ? (
                  <>
                    <Text style={styles.stepDescription}>
                      Food images, item names, prices, dish descriptions
                    </Text>
                    {/* Proceed Button for Step 3 */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.proceedButton}
                      onPress={handleProceedStep3}
                    >
                      <LinearGradient
                        colors={['#FDC830', '#F39C12', '#E67E22']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.proceedGradient}
                      >
                        <Text style={styles.proceedText}>Proceed</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#0B0D12"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : currentActiveStep > 3 ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.editStepRow}
                    onPress={handleProceedStep3}
                  >
                    <Text style={styles.editStepText}>Edit details</Text>
                    <Ionicons name="pencil" size={13} color="#E8C547" />
                  </TouchableOpacity>
                ) : null}

                <View style={styles.stepDivider} />
              </View>
            </View>

            {/* STEP 4: Partner Contract */}
            <View style={[styles.stepContainer, { marginBottom: 0 }]}>
              <View style={styles.timelineLeftColumn}>
                {currentActiveStep === 4 ? (
                  <View style={styles.activeStepBadge}>
                    <Text style={styles.activeStepText}>4</Text>
                  </View>
                ) : currentActiveStep > 4 ? (
                  <View style={styles.completedStepBadge}>
                    <Ionicons name="checkmark" size={18} color="#0B0D12" />
                  </View>
                ) : (
                  <View style={styles.inactiveStepBadge}>
                    <Text style={styles.inactiveStepText}>4</Text>
                  </View>
                )}
              </View>

              <View style={styles.stepContentColumn}>
                <View style={styles.stepHeaderRow}>
                  <Text
                    style={
                      currentActiveStep >= 4
                        ? styles.stepLabelActive
                        : styles.stepLabelInactive
                    }
                  >
                    STEP 4
                  </Text>
                  {currentActiveStep > 4 && (
                    <Text style={styles.completedLabelText}>Completed ✓</Text>
                  )}
                </View>
                <Text
                  style={
                    currentActiveStep >= 4
                      ? styles.stepTitle
                      : styles.stepTitleInactive
                  }
                >
                  Partner Contract
                </Text>

                {currentActiveStep === 4 ? (
                  <>
                    <Text style={styles.stepDescription}>
                      Commission rates, delivery terms, partner agreement
                    </Text>
                    {/* Proceed Button for Step 4 */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.proceedButton}
                      onPress={handleProceedStep4}
                    >
                      <LinearGradient
                        colors={['#FDC830', '#F39C12', '#E67E22']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.proceedGradient}
                      >
                        <Text style={styles.proceedText}>Proceed</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#0B0D12"
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          {/* Bottom Floating Help Card */}
          <View style={styles.helpCard}>
            <Ionicons name="headset-outline" size={24} color="#E8C547" />
            <View style={styles.helpVerticalDivider} />
            <Text style={styles.helpText}>
              If you need any help, check out the{' '}
              <Text style={styles.faqsLink}>FAQs</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  heroBackgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Math.max(IMAGE_HEIGHT, height * 0.6),
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 0.95 }],
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  /* Top Nav */
  topNav: {
    paddingTop: 14,
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#191919',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Hero Section */
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroTextColumn: {
    flex: 1,
    paddingRight: 8,
  },
  goldAccentLine: {
    width: 40,
    height: 3,
    backgroundColor: '#E8C547',
    borderRadius: 2,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 26,
    lineHeight: 32,
    color: '#FFFFFF',
  },
  titleGold: {
    color: '#E8C547',
  },
  subtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#8E8E8E',
    marginTop: 6,
  },

  /* Steps Card */
  stepsCard: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
  },
  timelineLeftColumn: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  activeStepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#141414',
    borderWidth: 2,
    borderColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#E8C547',
  },
  completedStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveStepText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    color: '#8E8E8E',
  },
  dottedLine: {
    flex: 1,
    width: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    marginVertical: 4,
    minHeight: 32,
  },
  stepContentColumn: {
    flex: 1,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepLabelActive: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#E8C547',
    marginBottom: 2,
  },
  completedLabelText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#E8C547',
  },
  editStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  editStepText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12,
    color: '#E8C547',
    marginRight: 4,
  },
  stepTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  stepDescription: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 16,
  },
  stepLabelInactive: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: '#8E8E8E',
    marginBottom: 2,
  },
  stepTitleInactive: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#8E8E8E',
  },
  proceedButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  proceedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    width: '100%',
  },
  proceedText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0B0B0B',
  },
  stepDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },

  /* Bottom Help Floating Card */
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  helpVerticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 12,
  },
  helpText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#8E8E8E',
  },
  faqsLink: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
});
