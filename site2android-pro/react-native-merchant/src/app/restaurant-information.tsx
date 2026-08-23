import React, { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/state/onboardingStore';
import { apiClient } from '@/services/apiClient';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export default function RestaurantInformationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ locationAdded?: string; address?: string }>();
  const setFields = useOnboardingStore((state: any) => state.setFields);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(true);

  // Basic Details State
  const [ownerName, setOwnerName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Location Added State
  const [isLocationAdded, setIsLocationAdded] = useState(
    params.locationAdded === 'true'
  );
  const [selectedAddress, setSelectedAddress] = useState(
    params.address || ''
  );

  // Fetch live restaurant info on mount
  useEffect(() => {
    let isMounted = true;
    const fetchLiveRestaurant = async () => {
      try {
        const res = await apiClient.get('/restaurants/my-restaurant');
        if (isMounted && res.data?.restaurant) {
          const r = res.data.restaurant;
          setRestaurantId(r.id);
          if (r.restaurantName) setRestaurantName(r.restaurantName);
          if (r.restaurantName) setOwnerName(r.restaurantName);
          if (r.email) setEmailAddress(r.email);
          if (r.phoneNumber) setMobileNumber(r.phoneNumber);
          if (r.restaurantAddress) {
            setSelectedAddress(r.restaurantAddress);
            setIsLocationAdded(true);
          }
        }
      } catch (err) {
        console.warn('Could not fetch live restaurant info:', err);
      } finally {
        if (isMounted) setIsFetchingInfo(false);
      }
    };

    fetchLiveRestaurant();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (params.locationAdded === 'true') {
      setIsLocationAdded(true);
      if (params.address) {
        setSelectedAddress(params.address);
      }
      if (errors.location) {
        setErrors((prev) => ({ ...prev, location: '' }));
      }
    }
  }, [params.locationAdded, params.address]);

  // WhatsApp Preference State
  const [whatsappOption, setWhatsappOption] = useState<'same' | 'different'>('same');
  const [customWhatsapp, setCustomWhatsapp] = useState('');

  // Working Days State (Default: all selected)
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]);

  // Timings State (Default: 10:00 AM to 11:00 PM)
  const [timingOption, setTimingOption] = useState<'same' | 'separate'>('same');
  const [timeSlots, setTimeSlots] = useState<{ open: string; close: string }[]>([
    { open: '10:00 AM', close: '11:00 PM' },
  ]);

  // Time Picker Modal State
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [activeTimeType, setActiveTimeType] = useState<'open' | 'close'>('open');

  // Modal Temp Selection
  const [pickerHour, setPickerHour] = useState('10');
  const [pickerMinute, setPickerMinute] = useState('00');
  const [pickerPeriod, setPickerPeriod] = useState<'AM' | 'PM'>('AM');

  // Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
    if (errors.days) {
      setErrors((prev) => ({ ...prev, days: '' }));
    }
  };

  const toggleSelectAllDays = () => {
    if (selectedDays.length === DAYS_OF_WEEK.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays([...DAYS_OF_WEEK]);
    }
    if (errors.days) {
      setErrors((prev) => ({ ...prev, days: '' }));
    }
  };

  const handleOpenTimePicker = (index: number, type: 'open' | 'close') => {
    setActiveSlotIndex(index);
    setActiveTimeType(type);

    const currentTime = type === 'open' ? timeSlots[index].open : timeSlots[index].close;
    const [timePart, periodPart] = currentTime.split(' ');
    if (timePart && periodPart) {
      const [h, m] = timePart.split(':');
      setPickerHour(h.padStart(2, '0'));
      setPickerMinute(m.padStart(2, '0'));
      setPickerPeriod(periodPart as 'AM' | 'PM');
    }

    setIsTimePickerVisible(true);
  };

  const handleConfirmTime = () => {
    const formattedTime = `${pickerHour}:${pickerMinute} ${pickerPeriod}`;
    const updatedSlots = [...timeSlots];

    if (activeTimeType === 'open') {
      updatedSlots[activeSlotIndex].open = formattedTime;
    } else {
      updatedSlots[activeSlotIndex].close = formattedTime;
    }

    setTimeSlots(updatedSlots);
    setIsTimePickerVisible(false);

    if (errors.timings) {
      setErrors((prev) => ({ ...prev, timings: '' }));
    }
  };

  const handleAddSlot = () => {
    setTimeSlots([...timeSlots, { open: '01:00 PM', close: '05:00 PM' }]);
  };

  const handleMobileChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '').slice(0, 10);
    setMobileNumber(numericOnly);
    if (errors.mobile) {
      setErrors((prev) => ({ ...prev, mobile: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!ownerName.trim()) {
      newErrors.ownerName = "Owner's Full Name is required";
    }

    if (!restaurantName.trim()) {
      newErrors.restaurantName = 'Restaurant Name is required';
    }

    // Strict validation for Restaurant Location
    if (!isLocationAdded) {
      newErrors.location = 'Restaurant location is required. Please add location.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailAddress.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(emailAddress.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!mobileNumber.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (mobileNumber.length !== 10) {
      newErrors.mobile = 'Mobile number must be exact 10 digits';
    }

    if (whatsappOption === 'different') {
      if (!customWhatsapp.trim() || customWhatsapp.length !== 10) {
        newErrors.whatsapp = 'Please enter a valid 10-digit WhatsApp number';
      }
    }

    if (selectedDays.length === 0) {
      newErrors.days = 'Please select at least 1 working day';
    }

    // Validate that open and close times are not identical
    for (let i = 0; i < timeSlots.length; i++) {
      if (timeSlots[i].open === timeSlots[i].close) {
        newErrors.timings = 'Opening and closing time cannot be the same';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAndContinue = async () => {
    if (validateForm()) {
      setFields({
        ownerName,
        restaurantName,
        email: emailAddress,
        phoneNumber: mobileNumber,
        restaurantAddress: selectedAddress,
      });

      if (restaurantId) {
        try {
          await apiClient.patch(`/restaurants/${restaurantId}`, {
            restaurantName,
            email: emailAddress,
            phoneNumber: mobileNumber,
            restaurantAddress: selectedAddress,
          });
        } catch (err) {
          console.warn('Failed to update restaurant details on backend:', err);
        }
      }

      // Save details and advance onboarding timeline to Step 2
      router.push({
        pathname: '/onboarding-steps',
        params: { step: '2' },
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

            {/* Header Row with Title & Store Graphic */}
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                Restaurant <Text style={styles.headerTitleGold}>Information</Text>
              </Text>
              <View style={styles.storeIllustrationWrapper}>
                <Image
                  source={require('../../assets/image copy.png')}
                  style={styles.storeIllustration}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* CARD 1: Basic Details */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="clipboard-outline" size={19} color="#E8C547" />
                </View>
                <Text style={styles.cardTitle}>Basic Details</Text>
              </View>

              {/* Owner's Full Name */}
              <Text style={styles.inputLabel}>Owner's Full Name*</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.ownerName ? styles.inputContainerError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Enter owner's full name"
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  value={ownerName}
                  onChangeText={(t) => {
                    setOwnerName(t);
                    if (errors.ownerName) setErrors((p) => ({ ...p, ownerName: '' }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {errors.ownerName ? (
                <Text style={styles.errorText}>{errors.ownerName}</Text>
              ) : null}

              {/* Restaurant Name */}
              <Text style={styles.inputLabel}>Restaurant Name*</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.restaurantName ? styles.inputContainerError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Enter restaurant name"
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  value={restaurantName}
                  onChangeText={(t) => {
                    setRestaurantName(t);
                    if (errors.restaurantName)
                      setErrors((p) => ({ ...p, restaurantName: '' }));
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              {errors.restaurantName ? (
                <Text style={styles.errorText}>{errors.restaurantName}</Text>
              ) : null}

              {/* Add Restaurant Location */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.locationButton,
                  isLocationAdded ? styles.locationButtonAdded : null,
                  errors.location ? styles.inputContainerError : null,
                ]}
                onPress={() => router.push('/restaurant-location')}
              >
                <View style={styles.locationButtonLeft}>
                  <Ionicons
                    name={isLocationAdded ? 'checkmark-circle' : 'location-outline'}
                    size={20}
                    color="#E8C547"
                    style={styles.locationIcon}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationButtonText}>
                      {isLocationAdded
                        ? 'Location Added'
                        : 'Add Restaurant Location*'}
                    </Text>
                    {isLocationAdded && (
                      <Text
                        style={styles.locationAddressSubtext}
                        numberOfLines={1}
                      >
                        {selectedAddress}
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons
                  name={isLocationAdded ? 'create-outline' : 'arrow-forward'}
                  size={18}
                  color="#E8C547"
                />
              </TouchableOpacity>
              {errors.location ? (
                <Text style={styles.errorText}>{errors.location}</Text>
              ) : null}
            </View>

            {/* CARD 2: Owner Contact Details */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="call" size={18} color="#E8C547" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Owner Contact Details</Text>
                  <Text style={styles.cardSubtitle}>
                    To get updates on payments, customer complaints,{'\n'}order
                    acceptance, etc
                  </Text>
                </View>
              </View>

              {/* Email Address */}
              <Text style={styles.inputLabel}>Email address*</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  value={emailAddress}
                  onChangeText={(t) => {
                    setEmailAddress(t);
                    if (errors.email) setErrors((p) => ({ ...p, email: '' }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}

              <View style={styles.infoRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="rgba(255, 255, 255, 0.55)"
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  You will receive a verification mail on this ID
                </Text>
              </View>

              {/* Mobile Number */}
              <Text style={styles.inputLabel}>Mobile Number*</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.mobile ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="call"
                  size={17}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <View style={styles.countryCodeWrapper}>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <Ionicons
                    name="chevron-down"
                    size={13}
                    color="rgba(255, 255, 255, 0.7)"
                    style={{ marginLeft: 4 }}
                  />
                </View>
                <View style={styles.phoneVerticalDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile number"
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  value={mobileNumber}
                  onChangeText={handleMobileChange}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              {errors.mobile ? (
                <Text style={styles.errorText}>{errors.mobile}</Text>
              ) : null}
            </View>

            {/* CARD 3: WhatsApp Preference Card */}
            <View style={styles.card}>
              <Text style={styles.whatsappCardHeader}>
                Provide your <Text style={styles.whatsappGold}>WhatsApp</Text>{' '}
                number to get insights on ratings, menu, etc
              </Text>

              {/* Radio 1: Same as above */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.radioRow}
                onPress={() => setWhatsappOption('same')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    whatsappOption === 'same' ? styles.radioCircleActive : null,
                  ]}
                >
                  {whatsappOption === 'same' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioText}>
                  My WhatsApp number is same as above
                </Text>
              </TouchableOpacity>

              {/* Radio 2: Different number */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.radioRow}
                onPress={() => setWhatsappOption('different')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    whatsappOption === 'different' ? styles.radioCircleActive : null,
                  ]}
                >
                  {whatsappOption === 'different' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioText}>
                  I have a different WhatsApp number
                </Text>
              </TouchableOpacity>

              {/* Optional Custom WhatsApp Input */}
              {whatsappOption === 'different' && (
                <View
                  style={[
                    styles.inputContainer,
                    { marginTop: 12 },
                    errors.whatsapp ? styles.inputContainerError : null,
                  ]}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={18}
                    color="#E8C547"
                    style={styles.fieldIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter WhatsApp number"
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    value={customWhatsapp}
                    onChangeText={(t) => {
                      setCustomWhatsapp(t.replace(/[^0-9]/g, '').slice(0, 10));
                      if (errors.whatsapp)
                        setErrors((p) => ({ ...p, whatsapp: '' }));
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              )}
              {errors.whatsapp ? (
                <Text style={styles.errorText}>{errors.whatsapp}</Text>
              ) : null}
            </View>

            {/* CARD 4: Working Days Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderBetween}>
                <Text style={styles.cardTitle}>Working days</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={toggleSelectAllDays}
                >
                  <Text style={styles.selectAllText}>
                    {selectedDays.length === DAYS_OF_WEEK.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 2-Column Days Checkbox Grid */}
              <View style={styles.daysGrid}>
                {/* Column 1 */}
                <View style={styles.daysColumn}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        activeOpacity={0.7}
                        style={styles.checkboxRow}
                        onPress={() => toggleDay(day)}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            isChecked ? styles.checkboxBoxChecked : null,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons name="checkmark" size={14} color="#E8C547" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Column 2 */}
                <View style={styles.daysColumn}>
                  {['Friday', 'Saturday', 'Sunday'].map((day) => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        activeOpacity={0.7}
                        style={styles.checkboxRow}
                        onPress={() => toggleDay(day)}
                      >
                        <View
                          style={[
                            styles.checkboxBox,
                            isChecked ? styles.checkboxBoxChecked : null,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons name="checkmark" size={14} color="#E8C547" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {errors.days ? (
                <Text style={styles.errorText}>{errors.days}</Text>
              ) : null}
            </View>

            {/* CARD 5: Opening & Closing Time Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Opening & Closing time</Text>

              {/* Radio 1: Same time all working days */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.radioRow}
                onPress={() => setTimingOption('same')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    timingOption === 'same' ? styles.radioCircleActive : null,
                  ]}
                >
                  {timingOption === 'same' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioText}>
                  I open and close my restaurant at the same time on all working
                  days
                </Text>
              </TouchableOpacity>

              {/* Radio 2: Separate daywise timings */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.radioRow}
                onPress={() => setTimingOption('separate')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    timingOption === 'separate' ? styles.radioCircleActive : null,
                  ]}
                >
                  {timingOption === 'separate' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioText}>
                  I've separate daywise timings
                </Text>
              </TouchableOpacity>

              {/* Dashed Separator */}
              <View style={styles.dashedDivider} />

              {/* Time Slots List */}
              {timeSlots.map((slot, index) => (
                <View key={index} style={styles.timePickerRow}>
                  {/* Open Time Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.timeButton}
                    onPress={() => handleOpenTimePicker(index, 'open')}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color="#E8C547"
                      style={styles.timeIcon}
                    />
                    <Text style={styles.timeButtonText}>{slot.open}</Text>
                  </TouchableOpacity>

                  {/* Close Time Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.timeButton}
                    onPress={() => handleOpenTimePicker(index, 'close')}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color="#E8C547"
                      style={styles.timeIcon}
                    />
                    <Text style={styles.timeButtonText}>{slot.close}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {errors.timings ? (
                <Text style={styles.errorText}>{errors.timings}</Text>
              ) : null}

              {/* + Add Another Slot Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.addSlotButton}
                onPress={handleAddSlot}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color="#E8C547"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.addSlotText}>Add another slot</Text>
              </TouchableOpacity>

              {/* Operational Notice Box */}
              <View style={styles.operationalNoticeBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#E8C547"
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text style={styles.operationalNoticeText}>
                  Longer operational timings ensures you get 1.5X more orders
                  and helps you avoid cancellations.
                </Text>
              </View>
            </View>

            {/* Save & Continue CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.saveButton}
              onPress={handleSaveAndContinue}
            >
              <LinearGradient
                colors={['#FDC830', '#F39C12', '#E67E22']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveText}>Save & Continue</Text>
                <Ionicons name="arrow-forward" size={19} color="#0B0D12" />
              </LinearGradient>
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

      {/* CUSTOM TIME PICKER MODAL */}
      <Modal
        visible={isTimePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="time" size={22} color="#E8C547" />
              <Text style={styles.modalTitle}>
                Select {activeTimeType === 'open' ? 'Opening' : 'Closing'} Time
              </Text>
            </View>

            {/* Current Time Display Preview */}
            <View style={styles.modalTimePreview}>
              <Text style={styles.modalTimeText}>
                {pickerHour}:{pickerMinute} {pickerPeriod}
              </Text>
            </View>

            {/* Selector Rows */}
            <View style={styles.pickerColumnsRow}>
              {/* Hour Selector */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Hour</Text>
                <ScrollView
                  style={styles.columnScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      activeOpacity={0.7}
                      style={[
                        styles.pickerItem,
                        pickerHour === h ? styles.pickerItemActive : null,
                      ]}
                      onPress={() => setPickerHour(h)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          pickerHour === h ? styles.pickerItemTextActive : null,
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute Selector */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Minute</Text>
                <ScrollView
                  style={styles.columnScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      activeOpacity={0.7}
                      style={[
                        styles.pickerItem,
                        pickerMinute === m ? styles.pickerItemActive : null,
                      ]}
                      onPress={() => setPickerMinute(m)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          pickerMinute === m ? styles.pickerItemTextActive : null,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* AM / PM Toggle */}
              <View style={styles.periodColumn}>
                <Text style={styles.columnLabel}>Period</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.periodButton,
                    pickerPeriod === 'AM' ? styles.periodButtonActive : null,
                  ]}
                  onPress={() => setPickerPeriod('AM')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      pickerPeriod === 'AM' ? styles.periodTextActive : null,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.periodButton,
                    pickerPeriod === 'PM' ? styles.periodButtonActive : null,
                  ]}
                  onPress={() => setPickerPeriod('PM')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      pickerPeriod === 'PM' ? styles.periodTextActive : null,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.modalCancelButton}
                onPress={() => setIsTimePickerVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.modalConfirmButton}
                onPress={handleConfirmTime}
              >
                <LinearGradient
                  colors={['#FDC830', '#F39C12', '#E67E22']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirmGradient}
                >
                  <Text style={styles.modalConfirmText}>Set Time</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  storeIllustrationWrapper: {
    width: 80,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
    marginLeft: 12,
  },
  storeIllustration: {
    width: '100%',
    height: '100%',
  },

  /* Card */
  card: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
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

  /* Input Fields */
  inputLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 6,
  },
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
    marginTop: 4,
    marginLeft: 2,
  },

  /* Location Button */
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 14,
  },
  locationButtonAdded: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.08)',
  },
  locationButtonLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  locationIcon: {
    marginRight: 10,
  },
  locationButtonText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#E8C547',
  },
  locationAddressSubtext: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginTop: 2,
  },

  /* Info Verification Helper */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
  },

  /* Phone Field */
  countryCodeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  countryCodeText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  phoneVerticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 8,
  },

  /* WhatsApp Header */
  whatsappCardHeader: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 14,
  },
  whatsappGold: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },

  /* Radio Row */
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: '#E8C547',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8C547',
  },
  radioText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },

  /* Working Days */
  selectAllText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#E8C547',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  daysColumn: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#141414',
  },
  checkboxBoxChecked: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
  },
  checkboxLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Dashed Divider */
  dashedDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 14,
  },

  /* Time Pickers */
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  timeIcon: {
    marginRight: 8,
  },
  timeButtonText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8C547',
    marginTop: 6,
    backgroundColor: 'rgba(232, 197, 71, 0.06)',
  },
  addSlotText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#E8C547',
  },
  operationalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  operationalNoticeText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    lineHeight: 16,
  },

  /* Save CTA Button */
  saveButton: {
    height: 48,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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

  /* TIME PICKER MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#191919',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalTimePreview: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTimeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 24,
    color: '#E8C547',
  },
  pickerColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 170,
    marginBottom: 18,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  columnLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#8E8E8E',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  columnScroll: {
    width: '100%',
  },
  pickerItem: {
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 2,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderWidth: 1,
    borderColor: '#E8C547',
  },
  pickerItemText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 14,
    color: '#8E8E8E',
  },
  pickerItemTextActive: {
    fontFamily: 'Urbanist-Bold',
    color: '#E8C547',
  },
  periodColumn: {
    width: 68,
    marginHorizontal: 4,
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  periodButton: {
    width: 52,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  periodButtonActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderColor: '#E8C547',
  },
  periodText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#8E8E8E',
  },
  periodTextActive: {
    color: '#E8C547',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalCancelText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalConfirmButton: {
    flex: 1.3,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#0B0B0B',
  },
});
