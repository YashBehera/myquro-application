import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function PayoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedWeek, setSelectedWeek] = useState('20 Jul – 26 Jul');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/earnings');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payouts</Text>
      </View>

      {/* SCROLLABLE PAYOUTS CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* WEEKLY DATE RANGE SELECTOR */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity style={styles.dateChevronBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color="#F2CA50" />
          </TouchableOpacity>

          <Text style={styles.dateRangeText}>{selectedWeek}</Text>

          <TouchableOpacity style={styles.dateChevronBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        {/* CASH LIMIT HEADER PILL */}
        <View style={styles.limitPillContainer}>
          <View style={styles.limitPillBox}>
            <Text style={styles.limitPillLabel}>
              Available cash limit : <Text style={styles.limitPillValue}>₹0</Text>
            </Text>
          </View>
        </View>

        {/* 1. CASH LEFT WITH YOU CARD */}
        <View style={styles.cashCard}>
          {/* Top Cash Graphic */}
          <View style={styles.cashGraphicRow}>
            <Image
              source={require('../../assets/images/image copy 2.png')}
              style={styles.cashGraphicImage}
              resizeMode="contain"
            />
          </View>

          {/* Cash Left Label & Amount */}
          <Text style={styles.cashLeftLabel}>CASH LEFT WITH YOU</Text>
          <Text style={styles.cashLeftAmountText}>₹0</Text>

          {/* Divider Line */}
          <View style={styles.cardDividerLine} />

          {/* Audio / Slider Controls Row */}
          <View style={styles.audioControlsRow}>
            <TouchableOpacity style={styles.audioPlayBtn} activeOpacity={0.8}>
              <Ionicons name="play-outline" size={20} color="#F2CA50" />
            </TouchableOpacity>

            {/* Slider Track Line */}
            <View style={styles.sliderTrackLine}>
              <View style={styles.sliderHandleDot} />
            </View>

            {/* Language A/अ Button */}
            <TouchableOpacity style={styles.translatePill} activeOpacity={0.8}>
              <Text style={styles.translatePillText}>A/अ</Text>
            </TouchableOpacity>
          </View>

          {/* Golden Deposit Now Button */}
          <TouchableOpacity style={styles.depositBtn} activeOpacity={0.85}>
            <Text style={styles.depositBtnText}>Deposit now</Text>
          </TouchableOpacity>
        </View>

        {/* 2. NO BANK TRANSFERS THIS WEEK CARD */}
        <View style={styles.noTransfersCard}>
          <View style={styles.noTransfersTextGroup}>
            <Text style={styles.noTransfersDateLabel}>{selectedWeek}</Text>
            <Text style={styles.noTransfersNoticeText}>No bank transfers this week</Text>
          </View>

          <Image
            source={require('../../assets/images/3d_cash_padlock.png')}
            style={styles.cashPadlockImage}
            resizeMode="contain"
          />
        </View>

        {/* 3. HAVEN'T SEEN YOU MASCOT EMPTY STATE SECTION */}
        <View style={styles.mascotEmptyStateSection}>
          {/* Speech Bubble */}
          <View style={styles.speechBubbleContainer}>
            <Text style={styles.speechTitleText}>Haven’t seen you</Text>
            <Text style={styles.speechSubtext}>this week!</Text>
            {/* Sparkle Icon */}
            <Ionicons name="sparkles" size={14} color="#F2CA50" style={styles.sparkleIcon} />
          </View>

          {/* Delivery Dost Mascot Portrait */}
          <Image
            source={require('../../assets/images/delivery_dost_mascot_portrait.png')}
            style={styles.mascotPortraitImage}
            resizeMode="contain"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  dateChevronBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1B18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateRangeText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  limitPillContainer: {
    alignItems: 'center',
    marginBottom: -1,
    zIndex: 10,
  },
  limitPillBox: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  limitPillLabel: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#FFFFFF',
  },
  limitPillValue: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  cashCard: {
    backgroundColor: '#161412',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  cashGraphicRow: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cashGraphicImage: {
    width: 70,
    height: 55,
  },
  cashLeftLabel: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#A6A6A6',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  cashLeftAmountText: {
    fontSize: 42,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 14,
  },
  cardDividerLine: {
    height: 1,
    backgroundColor: '#2A2620',
    marginBottom: 16,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrackLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#3A352F',
    justifyContent: 'center',
    position: 'relative',
  },
  sliderHandleDot: {
    position: 'absolute',
    left: '15%',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F2CA50',
  },
  translatePill: {
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  translatePillText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  depositBtn: {
    backgroundColor: '#F2CA50',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  depositBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  noTransfersCard: {
    backgroundColor: '#161412',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  noTransfersTextGroup: {
    flex: 1,
  },
  noTransfersDateLabel: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    marginBottom: 4,
  },
  noTransfersNoticeText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cashPadlockImage: {
    width: 65,
    height: 50,
  },
  mascotEmptyStateSection: {
    alignItems: 'center',
    position: 'relative',
    marginTop: 10,
  },
  speechBubbleContainer: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 36,
    paddingHorizontal: 36,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '94%',
    position: 'relative',
    marginBottom: -16,
    zIndex: 10,
  },
  speechTitleText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  speechSubtext: {
    fontSize: 18,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  sparkleIcon: {
    position: 'absolute',
    bottom: -6,
    right: 40,
  },
  mascotPortraitImage: {
    width: '100%',
    height: 260,
  },
});
