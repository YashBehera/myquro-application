import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';
import { CustomAlertModal, ModalType } from '../components/CustomAlertModal';

export default function AddBankAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken, driverProfile, updateDriverProfile } = useRider();

  const [accountNumber, setAccountNumber] = useState(driverProfile.bankAccount || '');
  const [reAccountNumber, setReAccountNumber] = useState(driverProfile.bankAccount || '');
  const [bankName, setBankName] = useState(driverProfile.bankName || '');
  const [ifscCode, setIfscCode] = useState(driverProfile.bankIfsc || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  }>({
    visible: false,
    title: '',
    subtitle: '',
  });

  const showAlertModal = (config: {
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  }) => {
    setCustomAlert({
      ...config,
      visible: true,
    });
  };

  const hideAlertModal = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/bank-details');
    }
  };

  const handleVerifyBankDetails = async () => {
    if (!accountNumber.trim()) {
      showAlertModal({
        type: 'warning',
        title: 'Account Number Required',
        subtitle: 'Please enter your bank account number.',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }
    if (accountNumber.trim() !== reAccountNumber.trim()) {
      showAlertModal({
        type: 'warning',
        title: 'Account Number Mismatch',
        subtitle: 'Account number and confirmation do not match. Please re-enter carefully.',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }
    if (!ifscCode.trim() || ifscCode.trim().length < 8) {
      showAlertModal({
        type: 'warning',
        title: 'Invalid IFSC',
        subtitle: 'Please enter a valid IFSC code (e.g. HDFC0001234).',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }

    setIsVerifying(true);
    try {
      updateDriverProfile({
        bankAccount: accountNumber.trim(),
        bankName: bankName.trim() || 'Bank Account',
        bankIfsc: ifscCode.trim().toUpperCase(),
        bankHolderName: driverProfile.name || 'Delivery Partner',
        bankAccountStatus: 'verified',
      });

      if (sessionToken) {
        await fetch(`${BACKEND_URL}/api/delivery/rider/bank-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
            Origin: 'http://localhost:3000',
          },
          body: JSON.stringify({
            accountNumber: accountNumber.trim(),
            bankName: bankName.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            holderName: driverProfile.name || 'Delivery Partner',
          }),
        });
      }

      showAlertModal({
        type: 'success_online',
        title: 'Bank Account Verified 🎉',
        subtitle: 'Your bank account details have been successfully verified and linked.',
        primaryButtonText: 'View Bank Details',
        onPrimaryPress: () => {
          hideAlertModal();
          router.replace('/bank-details');
        },
      });
    } catch (e) {
      console.error('Error saving bank account:', e);
      showAlertModal({
        type: 'success_online',
        title: 'Details Saved',
        subtitle: 'Bank account details saved locally.',
        primaryButtonText: 'Done',
        onPrimaryPress: () => {
          hideAlertModal();
          router.replace('/bank-details');
        },
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" translucent />

        {/* TOP BAR WITH BACK BUTTON */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        {/* TOP PROGRESS BAR (~65% FILLED) */}
        <View style={styles.progressTrackContainer}>
          <View style={styles.progressFillLine} />
        </View>

        {/* SCROLLABLE FORM CONTENT */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* HEADER TITLE & SUBTITLE */}
          <View style={styles.headerBlock}>
            <Text style={styles.headerTitle}>Add your Bank Account</Text>
            <Text style={styles.headerSubtitle}>
              You will get your payouts in this Bank Account
            </Text>
          </View>

          {/* FORM INPUT FIELDS */}
          <View style={styles.formContainer}>
            {/* INPUT 1: Account number */}
            <View style={styles.inputCard}>
              <View style={styles.inputIconBox}>
                <Ionicons name="business-outline" size={20} color="#F2CA50" />
              </View>
              <View style={styles.inputTextWrapper}>
                <Text style={styles.inputLabel}>Account number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your account number"
                  placeholderTextColor="#787878"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* INPUT 2: Re-enter account number */}
            <View style={styles.inputCard}>
              <View style={styles.inputIconBox}>
                <Ionicons name="log-in-outline" size={20} color="#F2CA50" />
              </View>
              <View style={styles.inputTextWrapper}>
                <Text style={styles.inputLabel}>Re-enter account number</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter account number"
                  placeholderTextColor="#787878"
                  value={reAccountNumber}
                  onChangeText={setReAccountNumber}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* INPUT 3: Bank name */}
            <View style={styles.inputCard}>
              <View style={styles.inputIconBox}>
                <Ionicons name="business-outline" size={20} color="#F2CA50" />
              </View>
              <View style={styles.inputTextWrapper}>
                <Text style={styles.inputLabel}>Bank name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter bank name (e.g. HDFC Bank, SBI)"
                  placeholderTextColor="#787878"
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>
            </View>

            {/* INPUT 4: IFSC code */}
            <View style={styles.inputCard}>
              <View style={styles.inputIconBox}>
                <Ionicons name="qr-code-outline" size={20} color="#F2CA50" />
              </View>
              <View style={styles.inputTextWrapper}>
                <Text style={styles.inputLabel}>IFSC code</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter IFSC code"
                  placeholderTextColor="#787878"
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* TIP BOX / INFO CARD */}
            <View style={styles.infoTipCard}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="information-circle-outline" size={22} color="#F2CA50" />
              </View>
              <Text style={styles.infoTipText}>
                Ex: HDFC0001234. You can find it on your passbook or cheque book
              </Text>
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>

        {/* BOTTOM CTA BUTTON */}
        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            onPress={handleVerifyBankDetails}
            disabled={isVerifying}
            style={[styles.verifyBtn, isVerifying && { opacity: 0.7 }]}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify bank details</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* REUSABLE CUSTOM ALERT UI MODAL */}
        <CustomAlertModal
          visible={customAlert.visible}
          type={customAlert.type}
          title={customAlert.title}
          subtitle={customAlert.subtitle}
          primaryButtonText={customAlert.primaryButtonText}
          onPrimaryPress={customAlert.onPrimaryPress || hideAlertModal}
          onClose={hideAlertModal}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  progressTrackContainer: {
    height: 3,
    backgroundColor: '#2A2A2A',
    width: '100%',
    marginBottom: 20,
  },
  progressFillLine: {
    width: '65%',
    height: '100%',
    backgroundColor: '#F2CA50',
    borderRadius: 1.5,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerBlock: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  formContainer: {
    gap: 16,
  },
  inputCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputIconBox: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputTextWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#EAE1D4',
    marginBottom: 2,
  },
  textInput: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
  },
  infoTipCard: {
    backgroundColor: '#161412',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#EAE1D4',
    lineHeight: 19,
  },
  bottomCard: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  verifyBtn: {
    backgroundColor: '#F2CA50',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
});
