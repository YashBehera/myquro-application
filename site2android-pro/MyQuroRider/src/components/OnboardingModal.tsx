import React, { useState } from 'react';
import * as Location from 'expo-location';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

interface LanguageOption {
  id: string;
  nativeName: string;
  englishName: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'en', nativeName: 'English', englishName: 'English' },
  { id: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { id: 'mr', nativeName: 'मराठी', englishName: 'Marathi' },
  { id: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { id: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil' },
  { id: 'te', nativeName: 'తెలుగు', englishName: 'Telugu' },
  { id: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam' },
  { id: 'bn', nativeName: 'বাংলা', englishName: 'Bengali' },
];

export function OnboardingModal({ visible, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [mobileNumber, setMobileNumber] = useState<string>('');

  const handleFinish = () => {
    setStep(1);
    onClose();
  };

  const handleRequestPermissions = async () => {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus === 'granted') {
        await Location.requestBackgroundPermissionsAsync();
      }
    } catch (e) {
      console.warn('Error requesting permissions:', e);
    } finally {
      setStep(3);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" />

          {/* STEP 3: PHONE NUMBER / GET STARTED SCREEN (Figma Node 424:273) */}
          {step === 3 ? (
            <KeyboardAvoidingView
              style={styles.fullFlex}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.page3Container}>
                  {/* Top Hero Image Banner */}
                  <View style={styles.page3HeroContainer}>
                    <Image
                      source={require('../../assets/images/rider_onboarding_get_started.png')}
                      style={styles.page3HeroImage}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Bottom Auth Action Form */}
                  <View style={styles.page3FormContainer}>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.countryCodePrefix}>+91</Text>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Enter your 10 digit mobile number"
                        placeholderTextColor="#787878"
                        keyboardType="number-pad"
                        maxLength={10}
                        value={mobileNumber}
                        onChangeText={setMobileNumber}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleFinish}
                      activeOpacity={0.85}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.primaryButtonText}>Get Started</Text>
                    </TouchableOpacity>

                    <View style={styles.stepIndicatorRow}>
                      <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                      <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                      <View style={styles.stepDotActive} />
                    </View>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.fullFlex}>
              {/* Top Header Text */}
              <SafeAreaView style={styles.safeTop}>
                <View style={styles.headerContainer}>
                  <Text style={styles.greetingText}>Hello Partner!</Text>
                  <Text style={styles.welcomeText}>
                    Welcome to <Text style={styles.goldBrandText}>My Quro</Text>
                  </Text>
                </View>
              </SafeAreaView>

              {/* Hero Image Section */}
              <View style={styles.heroSection}>
                <View style={styles.goldenGlow} />
                <Image
                  source={require('../../assets/images/rider_onboarding.png')}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>

              {/* Background Gradient Overlay */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)']}
                style={styles.gradientOverlay}
                pointerEvents="none"
              />

              {/* STEP 1: LANGUAGE SELECTION SCREEN (Figma Node 424:198) */}
              {step === 1 && (
                <View style={styles.bottomCardStep1}>
                  <Text style={styles.sectionTitle}>Select a language to continue</Text>

                  <View style={styles.gridContainer}>
                    {LANGUAGES.map((lang) => {
                      const isSelected = selectedLang === lang.id;
                      return (
                        <TouchableOpacity
                          key={lang.id}
                          activeOpacity={0.8}
                          onPress={() => setSelectedLang(lang.id)}
                          style={[
                            styles.langCard,
                            isSelected ? styles.langCardSelected : styles.langCardUnselected,
                          ]}
                        >
                          <View style={styles.langTextCol}>
                            <Text style={styles.nativeText}>{lang.nativeName}</Text>
                            <Text style={styles.englishText}>{lang.englishName}</Text>
                          </View>

                          <View
                            style={[
                              styles.radioOuter,
                              isSelected ? styles.radioOuterSelected : styles.radioOuterUnselected,
                            ]}
                          >
                            {isSelected && <View style={styles.radioInnerSelected} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    onPress={() => setStep(2)}
                    activeOpacity={0.85}
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonText}>Confirm</Text>
                  </TouchableOpacity>

                  <View style={styles.stepIndicatorRow}>
                    <View style={styles.stepDotActive} />
                    <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                  </View>
                </View>
              )}

              {/* STEP 2: LOCATION PERMISSION SCREEN (Figma Node 424:184) */}
              {step === 2 && (
                <View style={styles.bottomCardStep2}>
                  <View style={styles.cardContent}>
                    <Text style={styles.permissionTitle}>
                      Allow My Quro to access your location even when app is in background
                    </Text>

                    <Text style={styles.permissionBody}>
                      The My Quro Delivery App collects and transmits location data to assign orders even when the app is in the background.{'\n\n'}
                      To ensure that orders are assigned even when the app is in the background, please select & “ALLOW ALL THE TIME” in location permissions
                    </Text>

                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => setStep(3)} activeOpacity={0.7} style={styles.actionBtn}>
                        <Text style={styles.actionText}>DENY</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleRequestPermissions} activeOpacity={0.7} style={styles.actionBtn}>
                        <Text style={styles.actionText}>ALLOW</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleRequestPermissions} activeOpacity={0.85} style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>Okay</Text>
                    </TouchableOpacity>

                    <View style={styles.stepIndicatorRow}>
                      <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                      <View style={styles.stepDotActive} />
                      <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  fullFlex: {
    flex: 1,
    justifyContent: 'space-between',
  },
  safeTop: {
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  greetingText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    letterSpacing: -0.22,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    letterSpacing: -0.22,
  },
  goldBrandText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    maxHeight: height * 0.32,
  },
  goldenGlow: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignSelf: 'center',
  },
  heroImage: {
    width: width * 0.85,
    height: height * 0.3,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomCardStep1: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomCardStep2: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.22,
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  langCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  langCardSelected: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  langCardUnselected: {
    borderColor: '#2A2A2A',
    backgroundColor: '#111111',
  },
  langTextCol: {
    justifyContent: 'center',
  },
  nativeText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  englishText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#787878',
    lineHeight: 18,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  radioOuterUnselected: {
    borderWidth: 1.2,
    borderColor: '#475569',
  },
  radioInnerSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4AF37',
  },
  primaryButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#D4AF37',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  cardContent: {
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: -0.22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  permissionBody: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#787878',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 24,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 0.5,
  },
  page3Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
    justifyContent: 'space-between',
  },
  page3HeroContainer: {
    width: '100%',
    height: height * 0.62,
    overflow: 'hidden',
  },
  page3HeroImage: {
    width: '100%',
    height: '100%',
  },
  page3FormContainer: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 20,
    backgroundColor: '#111111',
  },
  countryCodePrefix: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#D4AF37',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.22,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  stepDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37',
  },
  stepDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
});
