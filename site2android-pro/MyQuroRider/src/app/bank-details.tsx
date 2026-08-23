import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';

export default function BankDetailsNoticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driverProfile } = useRider();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/earnings');
    }
  };

  const hasBank = !!driverProfile.bankAccount;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" translucent />

      {/* TOP BAR WITH BACK BUTTON */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank details</Text>
      </View>

      {/* TOP PROGRESS BAR */}
      <View style={styles.progressTrackContainer}>
        <View style={[styles.progressFillLine, hasBank && { width: '100%' }]} />
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.mainContentArea}>
        {hasBank ? (
          <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
            {/* LUXURY GOLD/BLACK VIRTUAL BANK CARD */}
            <View style={styles.virtualBankCard}>
              {/* Top Row: Chip & Bank Name */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.chipAndLogo}>
                  <Ionicons name="hardware-chip-outline" size={32} color="#F2CA50" />
                  <Ionicons name="wifi" size={18} color="rgba(242, 202, 80, 0.6)" style={{ transform: [{ rotate: '90deg' }] }} />
                </View>
                <View style={styles.bankTag}>
                  <Text style={styles.bankTagText}>{driverProfile.bankName || 'PRIMARY ACCOUNT'}</Text>
                </View>
              </View>

              {/* Middle: Masked Account Digits */}
              <View style={styles.cardAccountBlock}>
                <Text style={styles.accountNumberFormatted}>
                  ••••  ••••  {driverProfile.bankAccount ? driverProfile.bankAccount.slice(-4) : '••••'}
                </Text>
              </View>

              {/* Bottom Row: Holder Name & IFSC */}
              <View style={styles.cardFooterRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSmallLabel}>ACCOUNT HOLDER</Text>
                  <Text style={styles.cardHolderName}>
                    {driverProfile.bankHolderName || driverProfile.name || 'DELIVERY PARTNER'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardSmallLabel}>IFSC CODE</Text>
                  <Text style={styles.cardIfscValue}>{driverProfile.bankIfsc || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Payout Status Banner */}
            <View style={styles.statusBannerCard}>
              <View style={styles.statusIconWrap}>
                <Ionicons name="checkmark-done-circle" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Bank Account Active</Text>
                <Text style={styles.statusSubtitle}>
                  Ready for instant payouts & daily earnings settlement.
                </Text>
              </View>
            </View>

            {/* Security Trust Features */}
            <View style={styles.securityBox}>
              <View style={styles.securityItem}>
                <Ionicons name="lock-closed-outline" size={16} color="#F2CA50" />
                <Text style={styles.securityText}>256-bit Encrypted Banking Data</Text>
              </View>
              <View style={styles.securityItem}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#F2CA50" />
                <Text style={styles.securityText}>NPCI & RBI Compliant Routing</Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <>
            {/* 3D BLUE BANK PASSBOOK ILLUSTRATION */}
            <View style={styles.passbookGraphicContainer}>
              <Image
                source={require('../../assets/images/image.png')}
                style={styles.passbookImage}
                resizeMode="contain"
              />
            </View>

            {/* BANK ACCOUNT NAME VERIFICATION CARD */}
            <View style={styles.verificationCard}>
              <View style={styles.verificationTextGroup}>
                <Text style={styles.verificationLabel}>
                  Bank Account must match your registered name
                </Text>
                <Text style={styles.userNameText}>{driverProfile.name || 'Delivery Partner'}</Text>
              </View>

              {/* Golden Avatar Icon */}
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={28} color="#000000" />
              </View>
            </View>
          </>
        )}
      </View>

      {/* BOTTOM CTA BUTTON */}
      <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          onPress={() => router.push('/add-bank-account')}
          style={styles.understandBtn}
          activeOpacity={0.85}
        >
          <Ionicons name={hasBank ? 'swap-horizontal' : 'arrow-forward'} size={20} color="#000000" />
          <Text style={styles.understandBtnText}>
            {hasBank ? 'Change Bank Account' : 'I Understand & Continue'}
          </Text>
        </TouchableOpacity>
      </View>
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
  progressTrackContainer: {
    height: 3,
    backgroundColor: '#2A2A2A',
    width: '100%',
    marginBottom: 20,
  },
  progressFillLine: {
    width: '35%',
    height: '100%',
    backgroundColor: '#F2CA50',
    borderRadius: 1.5,
  },
  mainContentArea: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  passbookGraphicContainer: {
    width: '100%',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  passbookImage: {
    width: '90%',
    height: '100%',
  },
  verificationCard: {
    width: '100%',
    backgroundColor: '#161412',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verificationTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  verificationLabel: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#EAE1D4',
    lineHeight: 20,
    marginBottom: 8,
  },
  userNameText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomCard: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  understandBtn: {
    backgroundColor: '#F2CA50',
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  understandBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  virtualBankCard: {
    width: '100%',
    backgroundColor: '#171512',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    borderRadius: 24,
    padding: 22,
    gap: 20,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipAndLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankTag: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    borderWidth: 1,
    borderColor: '#F2CA50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bankTagText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
    letterSpacing: 0.5,
  },
  cardAccountBlock: {
    marginVertical: 10,
  },
  accountNumberFormatted: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2C271F',
  },
  cardSmallLabel: {
    fontSize: 10,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8E8E',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  cardHolderName: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardIfscValue: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  statusBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
  },
  statusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#A0A0A0',
    lineHeight: 18,
  },
  securityBox: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#29241E',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginTop: 14,
    marginBottom: 20,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  securityText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#CCCCCC',
  },
});
