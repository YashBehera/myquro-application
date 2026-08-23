import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import {
  Alert,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';

export default function BankPayoutIssueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken, driverProfile } = useRider();

  const hasBankAdded = Boolean(driverProfile?.bankAccount);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/payout-issue');
    }
  };

  const handleAddBank = () => {
    setBottomSheetVisible(false);
    router.push('/add-bank-account');
  };

  // Dynamic weeks calculation
  const weeks = React.useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

    const list = [];
    for (let w = 1; w <= 4; w++) {
      const mon = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - (w * 7));
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      const title = w === 1 ? 'Last Week' : `Week ${w + 30}`;
      const dateRange = `${mon.getDate()} ${monthNames[mon.getMonth()]} to ${sun.getDate()} ${monthNames[sun.getMonth()]}`;
      list.push({
        id: `week_${w}`,
        title,
        dateRange,
      });
    }
    return list;
  }, []);

  const handleSelectWeek = (item: any) => {
    if (!hasBankAdded) {
      setBottomSheetVisible(true);
      return;
    }
    setSelectedWeek(item);
    setDisputeReason('');
    setDisputeModalVisible(true);
  };

  const handleSubmitDispute = async () => {
    Keyboard.dismiss();
    if (!disputeReason.trim()) {
      Alert.alert('Error', 'Please select or describe the payout discrepancy.');
      return;
    }

    setIsSubmitting(true);
    let ticketId = `BNK-${Date.now().toString().slice(-5)}`;

    if (sessionToken) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/delivery/rider/support-ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'Origin': 'http://localhost:3000',
          },
          body: JSON.stringify({
            category: 'bank_payout',
            subject: `Bank Payout Discrepancy for ${selectedWeek?.title} (${selectedWeek?.dateRange})`,
            description: disputeReason,
            metadata: {
              week: selectedWeek,
              bankName: driverProfile?.bankName || 'Direct Transfer',
              accountNumber: driverProfile?.bankAccount || 'N/A',
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ticket?.id) ticketId = data.ticket.id;
        }
      } catch (err) {
        console.error('Bank dispute error:', err);
      }
    }

    setIsSubmitting(false);
    setDisputeModalVisible(false);

    Alert.alert('Inquiry Submitted', `Your bank payout inquiry (#${ticketId}) for ${selectedWeek?.title} has been submitted successfully. Our finance operations team will verify the NEFT / UTR transfer status within 2-4 hours.`, [
      { text: 'OK' },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incorrect Payout to bank</Text>
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitleText}>Select the week for which you faced the issue</Text>

      {/* MAIN CONTENT (UNDERLYING WEEKS LIST) */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardContainer}>
          {weeks.map((item, index) => {
            const isLast = index === weeks.length - 1;

            return (
              <View key={item.id} style={styles.rowWrapper}>
                <TouchableOpacity
                  onPress={() => handleSelectWeek(item)}
                  style={styles.weekRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeftGroup}>
                    <Text style={styles.rowTitleText}>{item.title}</Text>
                    <Text style={styles.dateRangeText}>{item.dateRange}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#F2CA50" />
                </TouchableOpacity>

                {/* Dotted Divider */}
                {!isLast && (
                  <View style={styles.dottedDivider} />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.spacer} />

        {/* BOTTOM SKYLINE FOOTER */}
        <Image
          source={require('../../assets/images/skyline_footer.jpg')}
          style={styles.skylineImage}
          resizeMode="contain"
        />
      </ScrollView>

      {/* BOTTOM SHEET OVERLAY MODAL (IF NO BANK ADDED) */}
      <Modal
        visible={bottomSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBottomSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setBottomSheetVisible(false)}
          />
          
          <View style={[styles.bottomSheetContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.handleBar} />

            <TouchableOpacity
              onPress={() => setBottomSheetVisible(false)}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#F2CA50" />
            </TouchableOpacity>

            <View style={styles.bankCardWrapper}>
              <View style={styles.bankCard}>
                <Text style={styles.bankCardTitle}>{driverProfile?.bankName || 'MyQuro Bank'}</Text>
                <Ionicons name="business" size={32} color="#FFFFFF" style={styles.bankCardIcon} />
                <Text style={styles.bankCardName}>{driverProfile?.bankHolderName || driverProfile?.name || 'Rider'}</Text>
              </View>
              
              <View style={[styles.notAddedPill, hasBankAdded && { backgroundColor: '#10B981' }]}>
                <Ionicons name={hasBankAdded ? 'checkmark-circle-outline' : 'warning-outline'} size={14} color="#FFFFFF" />
                <Text style={styles.notAddedText}>{hasBankAdded ? 'Bank Verified' : 'Not added'}</Text>
              </View>
            </View>

            <Text style={styles.addBankTitle}>{hasBankAdded ? 'Bank Account Linked' : 'Add Bank details first'}</Text>
            <Text style={styles.addBankSubtitle}>
              {hasBankAdded ? 'Your payouts are directly transferred to your bank.' : 'Bank verification needed to receive payouts'}
            </Text>

            <TouchableOpacity onPress={handleAddBank} activeOpacity={0.85} style={styles.submitBtnWrapper}>
              <LinearGradient
                colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitBtnGradient}
              >
                <Text style={styles.submitBtnText}>{hasBankAdded ? 'Manage Bank Account' : 'Add Now'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BANK PAYOUT INQUIRY POP UP MODAL */}
      <Modal
        visible={disputeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setDisputeModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setDisputeModalVisible(false);
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={[styles.inquirySheetContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.inquiryHeader}>
                  <View style={styles.inquiryHeaderLeft}>
                    <View style={styles.inquiryIconContainer}>
                      <Ionicons name="card" size={20} color="#F2CA50" />
                    </View>
                    <View>
                      <Text style={styles.inquiryTitle}>Bank Payout Inquiry</Text>
                      <Text style={styles.inquirySubtitle}>Verify credit status with finance</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setDisputeModalVisible(false);
                    }}
                    style={styles.inquiryCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color="#F2CA50" />
                  </TouchableOpacity>
                </View>

                {/* Selected Week & Bank Info Card */}
                <View style={styles.inquiryInfoCard}>
                  <View style={styles.inquiryInfoRow}>
                    <View style={styles.inquiryWeekBadge}>
                      <Ionicons name="calendar-outline" size={15} color="#F2CA50" />
                      <Text style={styles.inquiryWeekText}>{selectedWeek?.title || 'Selected Week'}</Text>
                    </View>
                    <Text style={styles.inquiryDateText}>{selectedWeek?.dateRange || ''}</Text>
                  </View>

                  <View style={styles.inquiryDivider} />

                  <View style={styles.inquiryBankRow}>
                    <View style={styles.inquiryBankLeft}>
                      <Ionicons name="business-outline" size={15} color="#22C55E" />
                      <Text style={styles.inquiryBankName} numberOfLines={1}>
                        {driverProfile?.bankName || 'Linked Bank'}
                        {driverProfile?.bankAccount ? ` (•••• ${driverProfile.bankAccount.slice(-4)})` : ''}
                      </Text>
                    </View>
                    <View style={styles.inquiryVerifiedTag}>
                      <Ionicons name="checkmark-circle" size={13} color="#22C55E" />
                      <Text style={styles.inquiryVerifiedText}>Verified</Text>
                    </View>
                  </View>
                </View>

                {/* Quick Issue Chips */}
                <Text style={styles.quickChipsLabel}>Select Common Issue</Text>
                <View style={styles.quickChipsRow}>
                  {[
                    'Amount not credited',
                    'Partial payout received',
                    'Incorrect deduction',
                    'Bank account issue',
                  ].map((chip) => {
                    const isSelected = disputeReason === chip;
                    return (
                      <TouchableOpacity
                        key={chip}
                        onPress={() => {
                          Keyboard.dismiss();
                          setDisputeReason(chip);
                        }}
                        style={[
                          styles.chipBtn,
                          isSelected && styles.chipBtnSelected,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {chip}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Description Input */}
                <Text style={styles.inputLabel}>Describe the discrepancy</Text>
                <TextInput
                  style={styles.inquiryTextArea}
                  placeholder="Provide additional details or reference info..."
                  placeholderTextColor="#787878"
                  multiline
                  numberOfLines={3}
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  blurOnSubmit={true}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmitDispute}
                  activeOpacity={0.85}
                  style={styles.submitBtnWrapper}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitBtnGradient}
                  >
                    <Text style={styles.submitBtnText}>
                      {isSubmitting ? 'SUBMITTING...' : 'SUBMIT INQUIRY'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  cardContainer: {
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderRadius: 24,
    paddingVertical: 8,
  },
  rowWrapper: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  rowLeftGroup: {
    flex: 1,
    gap: 4,
  },
  rowTitleText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateRangeText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2520',
    borderStyle: 'dashed',
    marginHorizontal: 20,
  },
  spacer: {
    flex: 1,
  },
  skylineImage: {
    width: '100%',
    height: 120,
    marginTop: 40,
  },
  // Modal & Bottom Sheet styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardAvoidContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#141210',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    position: 'relative',
  },
  inquirySheetContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.2,
    borderColor: '#262626',
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  handleBar: {
    width: 50,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1B18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inquiry Header Styles
  inquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inquiryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inquiryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inquiryTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inquirySubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
    marginTop: 2,
  },
  inquiryCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inquiry Card Styles
  inquiryInfoCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  inquiryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inquiryWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inquiryWeekText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inquiryDateText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#F2CA50',
  },
  inquiryDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
  },
  inquiryBankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inquiryBankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  inquiryBankName: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#D4D4D4',
  },
  inquiryVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  inquiryVerifiedText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#22C55E',
  },
  // Chips
  quickChipsLabel: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chipBtn: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipBtnSelected: {
    borderColor: '#F2CA50',
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#A6A6A6',
  },
  chipTextSelected: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
  },
  // Inputs
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inquiryTextArea: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1.2,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  // Bank Graphic Card in No Bank Added Sheet
  bankCardWrapper: {
    alignItems: 'center',
    width: '80%',
    marginTop: 10,
    marginBottom: 28,
  },
  bankCard: {
    width: '100%',
    height: 140,
    backgroundColor: '#1D70B8',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  bankCardTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bankCardIcon: {
    marginVertical: 4,
  },
  bankCardName: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
  },
  notAddedPill: {
    position: 'absolute',
    bottom: -14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  notAddedText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addBankTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  addBankSubtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
    marginBottom: 32,
    textAlign: 'center',
  },
  submitBtnWrapper: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A1F00',
    letterSpacing: 0.5,
  },
});
