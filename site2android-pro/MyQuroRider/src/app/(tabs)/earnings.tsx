import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '../../context/RiderContext';

export default function EarningsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedWeek, setSelectedWeek] = useState('20 Jul – 26 Jul');
  const { weeklyEarnings } = useRider();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" translucent />

      {/* TOP PENDING NOTICE BAR */}
      <View style={styles.topNoticeBar}>
        <Text style={styles.topNoticeText}>1 upload pending ⏰</Text>
      </View>

      {/* SCROLLABLE EARNINGS CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. ADD BANK DETAILS CARD */}
        <View style={styles.addBankCard}>
          <View style={styles.addBankTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addBankTitle}>Add Bank details</Text>
              <Text style={styles.addBankSubtext}>to unlock earnings</Text>
            </View>

            <Image
              source={require('../../../assets/images/image copy 3.png')}
              style={styles.addBankGraphic}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/bank-details')}
            style={styles.addNowBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.addNowBtnText}>Add now</Text>
          </TouchableOpacity>
        </View>

        {/* 2. WEEKLY DATE RANGE SELECTOR & EARNINGS HEADER */}
        <View style={styles.weeklyHeaderSection}>
          {/* Date Selector Row */}
          <View style={styles.dateSelectorRow}>
            <TouchableOpacity style={styles.dateChevronBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={16} color="#F2CA50" />
            </TouchableOpacity>

            <Text style={styles.dateRangeText}>{selectedWeek}</Text>

            <TouchableOpacity style={styles.dateChevronBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </TouchableOpacity>
          </View>

          {/* Amount & 3D Gold Lock */}
          <View style={styles.earningsAmountRow}>
            <Text style={styles.earningsAmountText}>₹{weeklyEarnings}</Text>
            <Image
              source={require('../../../assets/images/3d_gold_lock_icon.png')}
              style={styles.goldLockImage}
              resizeMode="contain"
            />
          </View>

          {/* Subtitle Label */}
          <Text style={styles.weeklyEarningsSubLabel}>YOUR WEEKLY EARNINGS</Text>
        </View>

        {/* 3. OFFER ZONE & PAYOUTS CARDS ROW */}
        <View style={styles.twoCardsRow}>
          {/* Left Card: Offer Zone */}
          <TouchableOpacity style={styles.quickCard} activeOpacity={0.85}>
            <View style={styles.quickCardLeft}>
              <Image
                source={require('../../../assets/images/image copy.png')}
                style={styles.quickCardIcon}
                resizeMode="contain"
              />
              <Text style={styles.quickCardTitle}>Offer zone</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
          </TouchableOpacity>

          {/* Right Card: Payouts */}
          <TouchableOpacity
            onPress={() => router.push('/payouts')}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <View style={styles.quickCardLeft}>
              <Image
                source={require('../../../assets/images/image copy 2.png')}
                style={styles.quickCardIcon}
                resizeMode="contain"
              />
              <Text style={styles.quickCardTitle}>Payouts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        {/* 4. WEEKLY EARNINGS HISTORY CARD */}
        <View style={styles.historyCard}>
          <Text style={styles.historySectionHeader}>
            WEEKLY EARNINGS HISTORY ({selectedWeek})
          </Text>

          {/* All Details Button */}
          <TouchableOpacity style={styles.allDetailsBtn} activeOpacity={0.8}>
            <Text style={styles.allDetailsBtnText}>All Details</Text>
          </TouchableOpacity>

          {/* 1st Order 3D Graphic & Empty State */}
          <View style={styles.emptyStateSection}>
            <Image
              source={require('../../../assets/images/image copy 4.png')}
              style={styles.firstOrderGraphic}
              resizeMode="contain"
            />

            <Text style={styles.letsDeliverTitle}>Let’s deliver</Text>
            <Text style={styles.letsDeliverSubtext}>our first order of the week!</Text>
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
    backgroundColor: '#0E0C0A',
  },
  topNoticeBar: {
    paddingVertical: 9,
    backgroundColor: '#0E0C0A',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1815',
  },
  topNoticeText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  addBankCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  addBankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  addBankTitle: {
    fontSize: 19,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addBankSubtext: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
    marginTop: 2,
  },
  addBankGraphic: {
    width: 60,
    height: 44,
  },
  addNowBtn: {
    backgroundColor: '#F2CA50',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNowBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  weeklyHeaderSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  dateChevronBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E1B18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateRangeText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  earningsAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  earningsAmountText: {
    fontSize: 40,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  goldLockImage: {
    width: 28,
    height: 32,
  },
  weeklyEarningsSubLabel: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#A6A6A6',
    letterSpacing: 1.5,
  },
  twoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickCardIcon: {
    width: 28,
    height: 28,
  },
  quickCardTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  historyCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  historySectionHeader: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  allDetailsBtn: {
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  allDetailsBtnText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  emptyStateSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  firstOrderGraphic: {
    width: 200,
    height: 125,
    marginBottom: 14,
  },
  letsDeliverTitle: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 3,
    textAlign: 'center',
  },
  letsDeliverSubtext: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
    textAlign: 'center',
  },
});
