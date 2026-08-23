import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useOnboardingStore } from '@/state/onboardingStore';

export default function RestaurantDocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ outletType?: string }>();
  const setFields = useOnboardingStore((state: any) => state.setFields);

  const [outletType, setOutletType] = useState(
    params.outletType || 'Category I: Freshly prepared food items only'
  );
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [gstinNumber, setGstinNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isGstinRequired =
    outletType.startsWith('Category II') || outletType.startsWith('Category III');

  useEffect(() => {
    if (params.outletType) {
      setOutletType(params.outletType);
      if (errors.outletType) {
        setErrors((prev) => ({ ...prev, outletType: '' }));
      }
      if (errors.gstin) {
        setErrors((prev) => ({ ...prev, gstin: '' }));
      }
    }
  }, [params.outletType]);

  const handleChooseOutletType = () => {
    router.push('/select-outlet-type');
  };

  const handleFssaiChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '').slice(0, 14);
    setFssaiNumber(numericOnly);
    if (errors.fssai) {
      setErrors((prev) => ({ ...prev, fssai: '' }));
    }
  };

  const handlePanChange = (text: string) => {
    const uppercase = text.toUpperCase().slice(0, 10);
    setPanNumber(uppercase);
    if (errors.pan) {
      setErrors((prev) => ({ ...prev, pan: '' }));
    }
  };

  const handleGstinChange = (text: string) => {
    const uppercase = text.toUpperCase().slice(0, 15);
    setGstinNumber(uppercase);
    if (errors.gstin) {
      setErrors((prev) => ({ ...prev, gstin: '' }));
    }
  };

  const handleIfscChange = (text: string) => {
    const uppercase = text.toUpperCase().slice(0, 11);
    setIfscCode(uppercase);
    if (errors.ifsc) {
      setErrors((prev) => ({ ...prev, ifsc: '' }));
    }
  };

  const handleAccountChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '');
    setAccountNumber(numericOnly);
    if (errors.account) {
      setErrors((prev) => ({ ...prev, account: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!outletType.trim()) {
      newErrors.outletType = 'Please choose your outlet type';
    }

    if (!fssaiNumber.trim()) {
      newErrors.fssai = 'FSSAI License / Certificate number is required';
    } else if (fssaiNumber.length !== 14) {
      newErrors.fssai = 'FSSAI License must be exact 14 digits';
    }

    if (!panNumber.trim()) {
      newErrors.pan = 'Business/Owner PAN is required';
    } else if (panNumber.length !== 10) {
      newErrors.pan = 'PAN must be exact 10 alphanumeric characters';
    }

    if (isGstinRequired) {
      if (!gstinNumber.trim()) {
        newErrors.gstin = 'GSTIN is compulsory for this category';
      } else if (gstinNumber.length !== 15) {
        newErrors.gstin = 'GSTIN must be exact 15 alphanumeric characters';
      }
    } else {
      if (gstinNumber.trim() && gstinNumber.length !== 15) {
        newErrors.gstin = 'GSTIN must be exact 15 alphanumeric characters';
      }
    }

    if (!ifscCode.trim()) {
      newErrors.ifsc = 'Bank IFSC code is required';
    } else if (ifscCode.length !== 11) {
      newErrors.ifsc = 'IFSC code must be exact 11 characters';
    }

    if (!accountNumber.trim()) {
      newErrors.account = 'Bank Account number is required';
    } else if (accountNumber.length < 9) {
      newErrors.account = 'Please enter a valid bank account number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceed = () => {
    if (validateForm()) {
      setFields({
        fssaiLicenseNumber: fssaiNumber,
        gstNumber: gstinNumber || '22AAAAA0000A1Z5',
        restaurantType: outletType.includes('Category I') ? 'fine-dining' : 'quick-service',
      });
      router.push({
        pathname: '/onboarding-steps',
        params: { step: '3' },
      });
    }
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
              { paddingBottom: Math.max(insets.bottom, 20) + 16 },
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

            {/* Header Section */}
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                Restaurant <Text style={styles.headerTitleGold}>Documents</Text>
              </Text>
              <Image
                source={require('../../assets/image copy 4.png')}
                style={styles.organizerIllustration}
                resizeMode="contain"
              />
            </View>

            {/* CARD 1: What's your outlet-type? */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="clipboard-outline" size={20} color="#E8C547" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>What's your outlet-type?</Text>
                  <Text style={styles.cardSubtitle}>
                    This determines whether MyQuro or you pay GST on the items sold.
                  </Text>
                </View>
              </View>

              {/* Action Button: Choose your outlet type */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.outletTypeButton,
                  errors.outletType ? styles.inputContainerError : null,
                ]}
                onPress={handleChooseOutletType}
              >
                <View style={styles.outletTypeLeft}>
                  <Ionicons
                    name="bag-handle-outline"
                    size={19}
                    color="#E8C547"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.outletTypeText} numberOfLines={1}>
                    {outletType}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#E8C547" />
              </TouchableOpacity>
              {errors.outletType ? (
                <Text style={styles.errorText}>{errors.outletType}</Text>
              ) : null}
            </View>

            {/* CARD 2: FSSAI License Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="shield-checkmark-outline" size={19} color="#E8C547" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>FSSAI Certificate Details</Text>
                  <Text style={styles.cardSubtitle}>
                    Mandatory food safety license required for all outlets
                  </Text>
                </View>
              </View>

              {/* FSSAI License Number Field */}
              <View
                style={[
                  styles.inputContainer,
                  errors.fssai ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="ribbon-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="FSSAI License / Certificate Number*"
                  placeholderTextColor="#8E8E8E"
                  value={fssaiNumber}
                  onChangeText={handleFssaiChange}
                  keyboardType="number-pad"
                  maxLength={14}
                />
              </View>
              {errors.fssai ? (
                <Text style={styles.errorText}>{errors.fssai}</Text>
              ) : null}
            </View>

            {/* CARD 3: Enter PAN & GSTIN details */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="id-card-outline" size={19} color="#E8C547" />
                </View>
                <Text style={styles.cardTitle}>Enter PAN & GSTIN details</Text>
              </View>

              {/* Field 1: Business/Owner PAN */}
              <View
                style={[
                  styles.inputContainer,
                  errors.pan ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Business/Owner PAN*"
                  placeholderTextColor="#8E8E8E"
                  value={panNumber}
                  onChangeText={handlePanChange}
                  autoCapitalize="characters"
                  maxLength={10}
                  autoCorrect={false}
                />
              </View>
              {errors.pan ? (
                <Text style={styles.errorText}>{errors.pan}</Text>
              ) : null}

              {/* Field 2: GSTIN */}
              <View
                style={[
                  styles.inputContainer,
                  errors.gstin ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={
                    isGstinRequired ? 'GSTIN*' : 'GSTIN (Optional)'
                  }
                  placeholderTextColor="#8E8E8E"
                  value={gstinNumber}
                  onChangeText={handleGstinChange}
                  autoCapitalize="characters"
                  maxLength={15}
                  autoCorrect={false}
                />
              </View>
              {errors.gstin ? (
                <Text style={styles.errorText}>{errors.gstin}</Text>
              ) : null}
            </View>

            {/* CARD 4: Official Bank Details */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="business-outline" size={19} color="#E8C547" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Official Bank Details</Text>
                  <Text style={styles.cardSubtitle}>
                    Payments from MyQuro will be credited here
                  </Text>
                </View>
              </View>

              {/* Field 1: Bank IFSC code */}
              <View
                style={[
                  styles.inputContainer,
                  errors.ifsc ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={18}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Bank IFSC code*"
                  placeholderTextColor="#8E8E8E"
                  value={ifscCode}
                  onChangeText={handleIfscChange}
                  autoCapitalize="characters"
                  maxLength={11}
                  autoCorrect={false}
                />
              </View>
              {errors.ifsc ? (
                <Text style={styles.errorText}>{errors.ifsc}</Text>
              ) : null}

              {/* Field 2: Bank Account number */}
              <View
                style={[
                  styles.inputContainer,
                  errors.account ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={18}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Bank Account number*"
                  placeholderTextColor="#8E8E8E"
                  value={accountNumber}
                  onChangeText={handleAccountChange}
                  keyboardType="number-pad"
                  maxLength={18}
                />
              </View>
              {errors.account ? (
                <Text style={styles.errorText}>{errors.account}</Text>
              ) : null}
            </View>

            {/* Save / Proceed CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.saveButton}
              onPress={handleProceed}
            >
              <Text style={styles.saveText}>Save & Proceed</Text>
              <Ionicons name="arrow-forward" size={18} color="#0B0B0B" />
            </TouchableOpacity>

            {/* Bottom Help Card */}
            <View style={styles.helpCard}>
              <Ionicons name="headset-outline" size={24} color="#E8C547" />
              <View style={styles.helpVerticalDivider} />
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
    paddingHorizontal: 16,
  },

  /* Top Nav */
  topNav: {
    paddingTop: 12,
    marginBottom: 14,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    flex: 1,
  },
  headerTitleGold: {
    color: '#E8C547',
  },
  organizerIllustration: {
    width: 80,
    height: 80,
    marginLeft: 8,
  },

  /* Card */
  card: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  },
  cardSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    lineHeight: 16,
    marginTop: 2,
  },

  /* Outlet Type Action Button */
  outletTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  outletTypeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  outletTypeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#E8C547',
  },

  /* Input Fields */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  fieldIcon: {
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
    marginBottom: 8,
    marginLeft: 4,
  },

  /* Save CTA Button */
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8C547',
    marginTop: 8,
    marginBottom: 14,
  },
  saveText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0B0B',
    marginRight: 6,
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
