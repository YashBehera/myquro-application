import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function ReferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [contactNumber, setContactNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [cityName, setCityName] = useState('Bokaro');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  const stepsList = [
    { number: '1', text: "Enter your friend's details" },
    { number: '2', text: 'Complete the Target' },
    { number: '3', text: 'Enjoy the bonus' },
  ];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* FEATURED REFERRAL BANNER CARD */}
        <View style={styles.heroBannerCard}>
          <Image
            source={require('../../../assets/images/referral_orbit_banner.png')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>

        {/* SECTION 1: REFER YOUR FRIEND */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.goldLine} />
          <Text style={styles.sectionHeaderTitle}>REFER YOUR FRIEND</Text>
          <View style={styles.goldLine} />
        </View>

        {/* REFERRAL FORM CARD */}
        <View style={styles.formContainerCard}>
          {/* Input 1: Contact Number */}
          <View style={styles.inputBox}>
            <Ionicons name="call-outline" size={20} color="#F2CA50" />
            <TextInput
              style={styles.textInput}
              placeholder="Contact number"
              placeholderTextColor="#A6A6A6"
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
            />
            <TouchableOpacity style={styles.contactBookBtn} activeOpacity={0.8}>
              <Ionicons name="book" size={18} color="#F2CA50" />
            </TouchableOpacity>
          </View>

          {/* Input 2: Contact Name */}
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={20} color="#F2CA50" />
            <TextInput
              style={styles.textInput}
              placeholder="Contact name"
              placeholderTextColor="#A6A6A6"
              value={contactName}
              onChangeText={setContactName}
            />
          </View>

          {/* Input 3: Friend's city name */}
          <View style={styles.cityInputBox}>
            <View style={styles.cityTextGroup}>
              <Text style={styles.cityLabel}>Friend's city name</Text>
              <Text style={styles.cityValueText}>{cityName}</Text>
            </View>
            <Ionicons name="navigate" size={20} color="#F2CA50" />
          </View>

          {/* Refer Now CTA Button */}
          <TouchableOpacity style={styles.referNowBtn} activeOpacity={0.85}>
            <Text style={styles.referNowBtnText}>Refer Now</Text>
          </TouchableOpacity>

          {/* Winner Live Notification Box */}
          <View style={styles.winnerNotifBox}>
            <View style={styles.bellIconCircle}>
              <Ionicons name="notifications" size={16} color="#F2CA50" />
            </View>

            <View style={styles.winnerTextBlock}>
              <Text style={styles.winnerText}>
                <Text style={styles.winnerName}>SABIR HOSSAIN</Text> won{' '}
                <Text style={styles.winnerBonus}>₹10700</Text> bonus · 20 minutes ago
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: YOUR REFERRALS */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.goldLine} />
          <Text style={styles.sectionHeaderTitle}>YOUR REFERRALS</Text>
          <View style={styles.goldLine} />
        </View>

        {/* EXPANDED STEPPER & MEGAPHONE CARD */}
        <View style={styles.stepperContainerCard}>
          <Text style={styles.emptyTitleText}>No referrals to show</Text>
          <Text style={styles.emptySubtext}>Refer in 3 simple steps</Text>

          {/* STEPPER LIST WITH VERTICAL TIMELINE LINE */}
          <View style={styles.stepperWrapper}>
            {/* Connecting Vertical Gold Line */}
            <View style={styles.verticalTimelineLine} />

            {stepsList.map((step, index) => {
              const isLast = index === stepsList.length - 1;

              return (
                <View key={step.number} style={styles.stepItemRow}>
                  {/* Circle Number */}
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>{step.number}</Text>
                  </View>

                  {/* Step Text */}
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              );
            })}
          </View>

          {/* Bottom Row: Refer & Earn Now Button + 3D Megaphone Image */}
          <View style={styles.stepperBottomRow}>
            <TouchableOpacity style={styles.referEarnSmallBtn} activeOpacity={0.85}>
              <Text style={styles.referEarnSmallBtnText}>Refer & Earn now</Text>
            </TouchableOpacity>

            <Image
              source={require('../../../assets/images/3d_gold_megaphone.png')}
              style={styles.megaphoneImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  heroBannerCard: {
    height: 135,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    backgroundColor: '#12100C',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4E422C',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.5,
    marginHorizontal: 12,
  },
  formContainerCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 22,
    padding: 18,
    gap: 14,
    marginBottom: 24,
  },
  inputBox: {
    backgroundColor: '#0A0908',
    borderWidth: 1,
    borderColor: '#29241E',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  contactBookBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E1A14',
    borderWidth: 1,
    borderColor: '#3D3528',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityInputBox: {
    backgroundColor: '#0A0908',
    borderWidth: 1,
    borderColor: '#29241E',
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cityTextGroup: {
    justifyContent: 'center',
  },
  cityLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#F2CA50',
    marginBottom: 2,
  },
  cityValueText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  referNowBtn: {
    backgroundColor: '#F2CA50',
    height: 50,
    width: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  referNowBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  winnerNotifBox: {
    backgroundColor: '#1A1612',
    borderWidth: 1,
    borderColor: '#29231B',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  bellIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262016',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerTextBlock: {
    flex: 1,
  },
  winnerText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#FFFFFF',
  },
  winnerName: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  winnerBonus: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  stepperContainerCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
  },
  emptyTitleText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    marginBottom: 24,
  },
  stepperWrapper: {
    position: 'relative',
    paddingLeft: 6,
    marginBottom: 20,
    gap: 28,
  },
  verticalTimelineLine: {
    position: 'absolute',
    left: 25,
    top: 20,
    bottom: 20,
    width: 1.5,
    backgroundColor: '#F2CA50',
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  stepNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    backgroundColor: '#141210',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepNumberText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  stepText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepperBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  referEarnSmallBtn: {
    backgroundColor: '#F2CA50',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  referEarnSmallBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  megaphoneImage: {
    width: 140,
    height: 135,
    marginRight: -6,
    marginBottom: -6,
  },
});
