import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function RestaurantNameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurantName, setRestaurantName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = () => {
    if (!restaurantName.trim()) {
      setErrorMessage('Please enter your restaurant name');
      return;
    }
    setErrorMessage('');
    // Proceed to next step
    router.push('/onboarding-steps');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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

            {/* Header Title Section */}
            <View style={styles.headerSection}>
              <Text style={styles.subtitle}>Before we start...</Text>
              <Text style={styles.title}>
                Let's add your{'\n'}restaurant{' '}
                <Text style={styles.titleGold}>name</Text>
              </Text>
            </View>

            {/* Main Form Container Card */}
            <View style={styles.mainCard}>
              {/* Card Header Row */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.storeIconBadge}>
                  <Ionicons name="storefront" size={24} color="#E8C547" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Enter restaurant name</Text>
                  <Text style={styles.cardSubtitle}>
                    This will be visible to your customers{'\n'}on the MyQuro app.
                  </Text>
                </View>
              </View>

              {/* Input Field */}
              <View
                style={[
                  styles.inputContainer,
                  errorMessage ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="storefront-outline"
                  size={19}
                  color="#8E8E8E"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter restaurant name"
                  placeholderTextColor="#8E8E8E"
                  value={restaurantName}
                  onChangeText={(text) => {
                    setRestaurantName(text);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Error Message if empty */}
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}

              {/* Separator */}
              <View style={styles.dashedDivider} />

              {/* Note Section with 3D Store Illustration */}
              <View style={styles.noteRow}>
                <View style={styles.noteTextColumn}>
                  <View style={styles.noteTitleRow}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#E8C547"
                      style={styles.noteInfoIcon}
                    />
                    <Text style={styles.noteTitle}>Note:</Text>
                  </View>
                  <Text style={styles.noteDescription}>
                    This is the name customers{'\n'}will see on the MyQuro app.
                  </Text>
                </View>

                {/* 3D Restaurant Store Illustration */}
                <View style={styles.illustrationWrapper}>
                  <Image
                    source={require('../../assets/images/store_illustration_3d.png')}
                    style={styles.storeIllustration}
                    resizeMode="cover"
                  />
                </View>
              </View>

              {/* Save CTA Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Full-Width Line */}
            <View style={styles.bottomDashedLine} />

            {/* Bottom Help Row */}
            <View style={styles.helpRow}>
              <Ionicons
                name="headset-outline"
                size={18}
                color="#E8C547"
                style={styles.helpIcon}
              />
              <Text style={styles.helpText}>
                If you need any help, check out the{' '}
                <Text style={styles.faqsLink}>FAQs</Text>
              </Text>
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
    backgroundColor: '#0B0B0B',
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
    paddingHorizontal: 16,
  },

  /* Top Nav */
  topNav: {
    paddingTop: 12,
    marginBottom: 18,
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

  /* Header Section */
  headerSection: {
    marginBottom: 20,
  },
  subtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    color: '#8E8E8E',
    marginBottom: 6,
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

  /* Main Card */
  mainCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderTextWrapper: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    lineHeight: 16,
  },

  /* Input Field */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'Urbanist-Regular',
    paddingVertical: 0,
  },
  errorText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },

  /* Dashed Divider */
  dashedDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 16,
  },

  /* Note Section */
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  noteTextColumn: {
    flex: 1,
    marginRight: 12,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteInfoIcon: {
    marginRight: 6,
  },
  noteTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#E8C547',
  },
  noteDescription: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    lineHeight: 16,
  },
  illustrationWrapper: {
    width: 90,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  storeIllustration: {
    width: '100%',
    height: '100%',
  },

  /* Save CTA Button */
  saveButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0B0B',
  },

  /* Bottom Help & Divider */
  bottomDashedLine: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 14,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  helpIcon: {
    marginRight: 8,
  },
  helpText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#8E8E8E',
  },
  faqsLink: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
});
