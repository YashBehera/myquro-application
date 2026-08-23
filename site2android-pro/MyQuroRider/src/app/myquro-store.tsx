import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function MyQuroStoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleNotifyMe = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    Alert.alert('Success', "Thank you! We'll notify you as soon as we launch.");
    setEmail('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0A08" translucent />
      
      {/* TOP HEADER */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MyQuro Store</Text>
        {/* Spacer for centering */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* LOGO */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>
            My<Text style={styles.logoTextGold}>Quro</Text>
          </Text>
        </View>

        {/* COMING SOON HEADING */}
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonTitle}>
            Coming <Text style={styles.soonGold}>Soon</Text>
          </Text>
          <Text style={styles.comingSoonSubtitle}>
            We are building something amazing for you.{'\n'}Stay tuned!
          </Text>
        </View>

        {/* BRAND STORE PEDESTAL GRAPHIC */}
        <View style={styles.graphicContainer}>
          <Image
            source={require('../../assets/images/image copy 13.png')}
            style={styles.graphicImage}
            resizeMode="contain"
          />
        </View>

        {/* WHAT YOU CAN EXPECT SECTION */}
        <View style={styles.expectSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.headerLine} />
            <Text style={styles.expectSectionTitle}>What you can expect</Text>
            <View style={styles.headerLine} />
          </View>

          <View style={styles.expectGrid}>
            {/* Box 1: Exclusive Products */}
            <View style={styles.expectCard}>
              <Ionicons name="bag-handle-outline" size={26} color="#F2CA50" />
              <Text style={styles.expectCardText}>Exclusive Products</Text>
            </View>

            {/* Box 2: Best Offers */}
            <View style={styles.expectCard}>
              <Ionicons name="pricetag-outline" size={26} color="#F2CA50" />
              <Text style={styles.expectCardText}>Best Offers</Text>
            </View>

            {/* Box 3: Trusted Quality */}
            <View style={styles.expectCard}>
              <Ionicons name="shield-checkmark-outline" size={26} color="#F2CA50" />
              <Text style={styles.expectCardText}>Trusted Quality</Text>
            </View>

            {/* Box 4: Fast Delivery */}
            <View style={styles.expectCard}>
              <Ionicons name="flash-outline" size={26} color="#F2CA50" />
              <Text style={styles.expectCardText}>Fast Delivery</Text>
            </View>
          </View>
        </View>

        {/* BE THE FIRST TO KNOW NOTIFICATION FORM */}
        <View style={styles.notifyCard}>
          <View style={styles.bellIconContainer}>
            <Ionicons name="notifications-outline" size={22} color="#F2CA50" />
          </View>
          
          <Text style={styles.notifyTitle}>Be the first to know!</Text>
          <Text style={styles.notifySubtitle}>Get notified when we launch.</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={18} color="#A6A6A6" style={styles.mailIcon} />
            <TextInput
              style={styles.emailInput}
              placeholder="Enter your email"
              placeholderTextColor="#A6A6A6"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <TouchableOpacity 
            onPress={handleNotifyMe} 
            style={styles.notifyBtn} 
            activeOpacity={0.85}
          >
            <Text style={styles.notifyBtnText}>Notify Me</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0A08',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1815',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2923',
    backgroundColor: '#191715',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  logoTextGold: {
    color: '#F2CA50',
  },
  comingSoonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  soonGold: {
    color: '#F2CA50',
  },
  comingSoonSubtitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  graphicContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  graphicImage: {
    width: '100%',
    height: '100%',
  },
  expectSection: {
    width: '100%',
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2E2923',
  },
  expectSectionTitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  expectCard: {
    width: '48%',
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  expectCardText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#A6A6A6',
    textAlign: 'center',
  },
  notifyCard: {
    width: '100%',
    backgroundColor: '#141210',
    borderWidth: 1.2,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    marginTop: 10,
  },
  bellIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#2E2923',
    backgroundColor: '#1E1B17',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -22,
  },
  notifyTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 4,
  },
  notifySubtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    marginBottom: 16,
  },
  inputContainer: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  mailIcon: {
    marginRight: 8,
  },
  emailInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 14,
  },
  notifyBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F2CA50',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifyBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
});
