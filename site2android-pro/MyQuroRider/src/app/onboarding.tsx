import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRider } from '../context/RiderContext';
import { BACKEND_URL, OLA_MAPS_API_KEY } from '../config';
import MapView, { UrlTile } from 'react-native-maps';
import { fetchPlaceSuggestions, getCoordsFromPlaceId, reverseGeocode, AutocompleteSuggestion } from '../services/LocationService';
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
  PermissionsAndroid,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

interface LanguageOption {
  id: string;
  nativeName: string;
  englishName: string;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'en', nativeName: 'English', englishName: 'English' },
  { id: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { id: 'mr', nativeName: 'मराठी', englishName: 'Marathi' },
  { id: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { id: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil' },
  { id: 'te', nativeName: 'తెలుగు', englishName: 'Telugu' },
  { id: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam' },
  { id: 'bn', nativeName: 'বাংলা', englishName: 'Bengali' },
];

const NEARBY_CITIES = [
  { name: 'Bokaro', isCurrent: true },
  { name: 'Dhanbad', isCurrent: false },
  { name: 'Purulia', isCurrent: false },
];

const OTHER_CITIES: string[] = [];

const BAD_SELFIE_LABELS = [
  'Tilted head',
  'Blurry',
  'Helmet on',
  'Face mask',
  'Sunglasses',
  'Dark light',
];

const TSHIRT_SIZES = ['S', 'M', 'L', 'XL', '2XL'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp, completeOnboarding, updateDriverProfile, driverProfile } = useRider();
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  // Step 1: Language Selection (Node 424:198)
  // Step 2: Location Permission (Node 424:184)
  // Step 3: Mobile Number Login (Node 424:273)
  // Step 4: Delivery Onboarding Checklist (Step 1 Active) (Node 591:366)
  // Step 5: Select Vehicle Type (Node 637:188)
  // Step 6: Select City to Work (Node 642:336)
  // Step 7: Select Work Area / Zone (Node 703:192)
  // Step 8: Select Delivery Category (Node 732:142)
  // Step 9: Delivery Onboarding Checklist (Step 1 Completed ✅, Step 2 Active) (Node 758:128)
  // Step 10: Selfie Verification Guidelines (Node 770:205)
  // Step 11: Create Profile Selfie Confirmation (Node 771:247)
  // Step 12: Delivery Onboarding Ambient Completion Backdrop (Node 773:340)
  // Step 13: Select T-shirt Size (Node 800:154)
  // Step 14: Kit Delivery Address Confirmation (Node 811:155)
  // Step 15: Kit Order Success & Delivery Confirmation
  // Step 16: Interactive Map Pinning & Address Change (Node 815:202)
  // Step 17: Address for T-shirt & bag delivery (Current Location / Add Different) (Node 860:165)
  // Step 18: Enter your delivery address form (Node 919:161)
  // Step 19: Pay Joining Fee (Node 919:232)
  // Step 22: Delivery Onboarding 1 - Application Status (Node 919:476)
  // Step 23: Delivery Onboarding 2 - Aadhaar Verification Details (Node 963:317)
  // Step 24: Delivery Onboarding 3 - Application Submitted Dashboard (Node 987:128)
  // Step 25: Delivery Onboarding 4 - Work Zone Map Confirmation (Node 987:221)
  // Step 26: Delivery Onboarding 5 - Go Online Tutorial (Node 996:413)
  // Step 27: Delivery Onboarding 6 - Accept Order Tutorial (Node 996:469)
  // Step 28: Delivery Onboarding 7 - Daily Payout Tutorial (Node 1024:123)
  // Step 29: Delivery Onboarding 8 - Welcome & Delivery Dost (Node 1244:76)
  // Step 30: Delivery Onboarding 9 - Free Delivery Kit Promo (Node 3041:78)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30>(1);

  // Skip language/notification steps after first install
  useEffect(() => {
    const checkFirstInstall = async () => {
      try {
        const seen = await AsyncStorage.getItem('@app_first_install_done');
        if (seen === 'true') {
          // Already saw language/notification steps — go straight to login
          setStep(3);
        }
      } catch (e) {
        // ignore, default to step 1
      }
    };
    checkFirstInstall();
  }, []);
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<'petrol' | 'electric' | 'none' | null>('petrol');
  const [selectedCity, setSelectedCity] = useState<string | null>('Bokaro');
  const [citySearchQuery, setCitySearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string | null>('city_centre');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('food_delivery');
  const [selectedTshirtSize, setSelectedTshirtSize] = useState<string>('M');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [cityField, setCityField] = useState<string>('');
  const [stateField, setStateField] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<'instalment' | 'full'>('instalment');
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [termsAgreed, setTermsAgreed] = useState<boolean>(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: 23.6693,
    longitude: 86.1511,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [predictions, setPredictions] = useState<AutocompleteSuggestion[]>([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const mapRef = React.useRef<MapView | null>(null);

  const hasCenteredOnUserRef = React.useRef(false);

  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [zonesList, setZonesList] = useState<any[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [aadhaarFrontUri, setAadhaarFrontUri] = useState<string | null>(null);
  const [aadhaarFrontBase64, setAadhaarFrontBase64] = useState<string | null>(null);
  const [aadhaarBackUri, setAadhaarBackUri] = useState<string | null>(null);
  const [aadhaarBackBase64, setAadhaarBackBase64] = useState<string | null>(null);
  const [aadhaarFullName, setAadhaarFullName] = useState<string>('');
  const [aadhaarNumberInput, setAadhaarNumberInput] = useState<string>('');
  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState<boolean>(false);

  useEffect(() => {
    const loadCities = async () => {
      try {
        setIsLoadingCities(true);
        const res = await fetch(`${BACKEND_URL}/api/rider/onboarding/cities`);
        if (res.ok) {
          const data = await res.json();
          setCitiesList(data);
        }
      } catch (e) {
        console.error('Error fetching cities:', e);
      } finally {
        setIsLoadingCities(false);
      }
    };
    loadCities();
  }, []);

  useEffect(() => {
    const loadZones = async () => {
      if (!selectedCity) return;
      const cityObj = citiesList.find(c => c.name === selectedCity);
      if (!cityObj) return;

      try {
        setIsLoadingZones(true);
        const res = await fetch(`${BACKEND_URL}/api/rider/onboarding/zones?cityId=${cityObj.id}`);
        if (res.ok) {
          const data = await res.json();
          setZonesList(data);
          // Auto select first open zone
          const openZone = data.find((z: any) => z.isOpen);
          if (openZone) {
            setSelectedZone(openZone.id);
          } else if (data.length > 0) {
            setSelectedZone(data[0].id);
          }
        }
      } catch (e) {
        console.error('Error fetching zones:', e);
      } finally {
        setIsLoadingZones(false);
      }
    };
    loadZones();
  }, [selectedCity, citiesList]);

  // Debounced autocomplete fetcher (fires when mapSearchQuery changes)
  useEffect(() => {
    if (!mapSearchQuery || mapSearchQuery.trim().length < 2) {
      setPredictions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await fetchPlaceSuggestions(mapSearchQuery);
        setPredictions(results);
      } catch (err) {
        console.error('[onboarding] autocomplete error:', err);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [mapSearchQuery]);

  // GPS centering + reverse geocode when user opens Step 16 map
  useEffect(() => {
    if (step !== 16) return;
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setHasLocationPermission(true);
          if (!hasCenteredOnUserRef.current) {
            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;
            hasCenteredOnUserRef.current = true;
            const newReg = { latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 };
            setMapRegion(newReg);
            if (mapRef.current) {
              mapRef.current.animateToRegion(newReg, 1000);
            }
            const info = await reverseGeocode(latitude, longitude);
            if (info) {
              setDeliveryAddress(info.address);
              setStreetAddress(info.street);
              setCityField(info.city);
              setStateField(info.state);
              setPincode(info.pincode);
            }
          }
        }
      } catch (e) {
        console.warn('[onboarding] location error:', e);
      }
    };
    requestLocation();
  }, [step]);

  const handleSelectPrediction = async (suggestion: AutocompleteSuggestion) => {
    Keyboard.dismiss();
    setMapSearchQuery(suggestion.description);
    setPredictions([]);
    try {
      setIsResolvingAddress(true);
      const coords = await getCoordsFromPlaceId(suggestion.placeId);
      if (coords) {
        const newReg = { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
        setMapRegion(newReg);
        if (mapRef.current) {
          mapRef.current.animateToRegion(newReg, 1000);
        }
        const info = await reverseGeocode(coords.lat, coords.lng);
        if (info) {
          setDeliveryAddress(info.address);
          setStreetAddress(info.street);
          setCityField(info.city);
          setStateField(info.state);
          setPincode(info.pincode);
        }
      }
    } catch (e) {
      console.warn('[onboarding] handleSelectPrediction error:', e);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const handleLanguageConfirm = async () => {
    try {
      await AsyncStorage.setItem('@app_first_install_done', 'true');
    } catch (e) {
      // ignore
    }
    setStep(2);
  };

  const handleLocationNext = async () => {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus === 'granted') {
        await Location.requestBackgroundPermissionsAsync();
      }
    } catch (e) {
      console.warn('Error requesting permissions:', e);
    } finally {
      setStep(3);
    }
  };

  const handleGetStarted = async () => {
    const rawDigits = mobileNumber.replace(/\D/g, '').slice(-10);
    if (!rawDigits || rawDigits.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number');
      return;
    }
    setAuthError(null);
    setIsAuthLoading(true);
    const success = await sendOtp('+91' + rawDigits);
    setIsAuthLoading(false);
    if (success) {
      setIsOtpSent(true);
    } else {
      setAuthError('Failed to send OTP. Please try again.');
    }
  };

  const handleVerify = async () => {
    const rawDigits = mobileNumber.replace(/\D/g, '').slice(-10);
    if (!otpCode || otpCode.trim().length < 6) {
      setAuthError('Please enter the 6-digit OTP code');
      return;
    }
    setAuthError(null);
    setIsAuthLoading(true);
    const result = await verifyOtp('+91' + rawDigits, otpCode.trim());
    setIsAuthLoading(false);
    if (result.success) {
      if (result.onboardingCompleted) {
        // Rider already onboarded — go straight to the home screen
        router.replace('/(tabs)');
      } else {
        updateDriverProfile({ phone: rawDigits });
        setStep(4);
      }
    } else {
      setAuthError('Invalid OTP code. Please check and try again.');
    }
  };

  const handleWorkSettingsStart = () => {
    setStep(5);
  };

  const handleVehicleContinue = () => {
    updateDriverProfile({
      vehicleType: selectedVehicle === 'petrol' ? 'bike' : 'scooter',
      vehicleName: selectedVehicle === 'petrol' ? 'Petrol Bike' : 'Electric Scooter',
    });
    setStep(6);
  };

  const handleCitySelectConfirm = () => {
    if (selectedCity) {
      updateDriverProfile({ city: selectedCity });
    }
    setStep(7);
  };

  const handleZoneSelectConfirm = () => {
    const matchedZone = zonesList.find(z => z.id === selectedZone);
    updateDriverProfile({ zone: matchedZone?.name || 'City Centre' });
    setStep(8);
  };

  const handleCategorySelectConfirm = () => {
    updateDriverProfile({
      orderCategory: selectedCategory === 'food_delivery' ? 'Food Delivery' : 'Food, Instamart',
    });
    setStep(9);
  };

  const handleStep2ProfileContinue = () => {
    setStep(10);
  };

  const handleTakeSelfieNow = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Camera access is required to take a selfie. Would you like to pick a photo from gallery instead?',
          [
            {
              text: 'Open Gallery',
              onPress: async () => {
                const galleryResult = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                  base64: true,
                });
                if (!galleryResult.canceled && galleryResult.assets[0]) {
                  const uri = galleryResult.assets[0].uri;
                  setSelfieUri(uri);
                  setSelfieBase64(galleryResult.assets[0].base64 || null);
                  updateDriverProfile({ avatarUrl: uri });
                  setStep(11);
                }
              },
            },
            {
              text: 'Use Demo Photo',
              onPress: () => {
                setSelfieUri(null);
                setSelfieBase64('mock_selfie_base64_figma_copied');
                setStep(11);
              },
            },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelfieUri(uri);
        setSelfieBase64(result.assets[0].base64 || null);
        updateDriverProfile({ avatarUrl: uri });
        setStep(11);
      }
    } catch (err) {
      console.error('Selfie camera error:', err);
      // Fallback
      setSelfieUri(null);
      setSelfieBase64('mock_selfie_base64_figma_copied');
      setStep(11);
    }
  };

  const handlePickAadhaarImage = async (side: 'front' | 'back') => {
    Alert.alert(
      `Upload Aadhaar ${side === 'front' ? 'Front Side' : 'Back Side'}`,
      'Choose an option to capture or upload your Aadhaar photo:',
      [
        {
          text: 'Take Photo (Camera)',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                cameraType: ImagePicker.CameraType.back,
                allowsEditing: true,
                aspect: [16, 10],
                quality: 0.8,
                base64: true,
              });
              if (!result.canceled && result.assets[0]) {
                if (side === 'front') {
                  setAadhaarFrontUri(result.assets[0].uri);
                  setAadhaarFrontBase64(result.assets[0].base64 || null);
                } else {
                  setAadhaarBackUri(result.assets[0].uri);
                  setAadhaarBackBase64(result.assets[0].base64 || null);
                }
              }
            } catch (e) {
              console.error('Error opening camera for Aadhaar:', e);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery permission is required.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 10],
                quality: 0.8,
                base64: true,
              });
              if (!result.canceled && result.assets[0]) {
                if (side === 'front') {
                  setAadhaarFrontUri(result.assets[0].uri);
                  setAadhaarFrontBase64(result.assets[0].base64 || null);
                } else {
                  setAadhaarBackUri(result.assets[0].uri);
                  setAadhaarBackBase64(result.assets[0].base64 || null);
                }
              }
            } catch (e) {
              console.error('Error opening gallery for Aadhaar:', e);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleUploadAadhaarSubmit = async () => {
    if (!aadhaarFullName.trim()) {
      Alert.alert('Full Name Required', 'Please enter your full name as printed on your Aadhaar card.');
      return;
    }
    setIsUploadingAadhaar(true);
    try {
      // Sync the user's real name across the entire Rider App & Context
      updateDriverProfile({
        name: aadhaarFullName.trim(),
      });
      // Simulate backend Aadhaar verification / OCR / API push
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep(24);
    } catch (e) {
      console.error('Aadhaar upload failed:', e);
      setStep(24);
    } finally {
      setIsUploadingAadhaar(false);
    }
  };

  const handleProfileCompleteFinal = () => {
    setStep(13);
  };

  const handleTshirtContinue = () => {
    setStep(14);
  };

  const handleAddressConfirm = () => {
    setStep(19);
  };

  const handleProceedToAadhaar = () => {
    setStep(22);
  };

  const handleOpenMapChangeAddress = () => {
    setStep(16);
  };

  const handleMapContinueDetails = () => {
    // deliveryAddress is already set by the reverse geocode on pan/drop
    setStep(17);
  };

  const handleUseCurrentLocation = () => {
    // Use the current geocoded deliveryAddress (set on GPS centering)
    setStep(18);
  };

  const handleSubmitDeliveryDetails = () => {
    setDeliveryAddress(`${houseNumber}, ${streetAddress}, ${cityField}, ${stateField} ${pincode}, India`);
    setStep(19);
  };

  const handlePayInstalment = () => {
    setShowTermsModal(true);
  };

  const handleAgreeAndPay = () => {
    setShowTermsModal(false);
    setStep(15);
  };

  const handlePayFull = () => {
    setStep(15);
  };

  const handleAddDifferentLocation = () => {
    // Navigate to enter delivery address form (step 18)
    setStep(18);
  };

  const handleEnterDashboard = async () => {
    setIsAuthLoading(true);

    const resolvedName = aadhaarFullName || driverProfile.name || 'Delivery Partner';
    const resolvedCity = selectedCity || 'Bokaro';
    const resolvedZone = selectedZone || 'city_centre';
    const resolvedCategory = selectedCategory === 'food_delivery' ? 'Food Delivery' : (selectedCategory || 'Food Delivery');
    const resolvedSelfie = selfieBase64
      ? (selfieBase64.startsWith('data:') || selfieBase64.startsWith('http') || selfieBase64.startsWith('file://') ? selfieBase64 : `data:image/jpeg;base64,${selfieBase64}`)
      : (selfieUri || driverProfile.avatarUrl || '');

    // Immediately save to driverProfile and AsyncStorage
    updateDriverProfile({
      name: resolvedName,
      city: resolvedCity,
      zone: resolvedZone === 'city_centre' ? 'City Centre' : resolvedZone,
      orderCategory: resolvedCategory,
      avatarUrl: resolvedSelfie,
    });

    await completeOnboarding({
      name: resolvedName,
      cityId: resolvedCity,
      zoneId: resolvedZone,
      orderType: selectedCategory || 'food_delivery',
      vehicleType: selectedVehicle || 'petrol',
      selfieBase64: resolvedSelfie,
      aadhaar: aadhaarNumberInput || '123456789012',
      pan: 'ABCDE1234F',
    });
    setIsAuthLoading(false);
    router.replace('/(tabs)');
  };

  const activeCities = citiesList.length > 0
    ? citiesList
    : NEARBY_CITIES.map((c) => ({ id: `city_${c.name.toLowerCase()}`, name: c.name, state: 'Jharkhand', isActive: true, isCurrent: c.isCurrent }));

  const filteredCities = activeCities.filter((city) =>
    city.name.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  const filteredNearbyCities = filteredCities.filter((city) => city.isCurrent || city.name === 'Bokaro');
  const filteredOtherCities = filteredCities.filter((city) => !city.isCurrent && city.name !== 'Bokaro');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" />

        {/* STEP 30: DELIVERY ONBOARDING 9 - FREE DELIVERY KIT PROMO (Figma Node 3041:78) */}
        {step === 30 ? (
          <SafeAreaView style={styles.page30Container}>
            {/* Top Control Bar */}
            <View style={styles.page30TopBar}>
              <View style={styles.page30TopControlsRight}>
                {/* Audio/Voice Toggle Button */}
                <TouchableOpacity style={styles.page30VoiceBtn} activeOpacity={0.8}>
                  <Ionicons name="volume-high" size={16} color="#000000" />
                </TouchableOpacity>

                {/* Language Selector Pill */}
                <TouchableOpacity style={styles.page30LangPill} activeOpacity={0.8}>
                  <Ionicons name="language-outline" size={14} color="#2A2A2A" style={{ marginRight: 4 }} />
                  <Text style={styles.page30LangText}>English</Text>
                  <Ionicons name="chevron-down" size={14} color="#2A2A2A" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Showcase Content Area */}
            <View style={styles.page30ContentArea}>
              {/* Free Delivery Kit Graphic Image */}
              <Image
                source={require('../../assets/images/gift box.png')}
                style={styles.page30KitImage}
                resizeMode="contain"
              />

              {/* Headline Tutorial Text */}
              <Text style={styles.page30HeadlineText}>
                Free Delivery Kit After 2 Days Of Work And Minimum 10 Orders
              </Text>
            </View>

            {/* Bottom Buttons Row: Back + Start Delivering */}
            <View style={styles.page30BottomCard}>
              <View style={styles.page30ButtonsRow}>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep(29)}
                  style={styles.page30BackBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={22} color="#F2CA50" />
                </TouchableOpacity>

                {/* Golden Start Delivering Button - Launch App */}
                <TouchableOpacity
                  onPress={handleEnterDashboard}
                  style={styles.page30StartBtnTouch}
                  activeOpacity={0.8}
                >
                  <View style={styles.page30StartBtnInner}>
                    <Text style={styles.page30StartBtnText}>Start Delivering</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000000" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        ) : step === 29 ? (
          <SafeAreaView style={styles.page29Container}>
            {/* Top Control Bar */}
            <View style={styles.page29TopBar}>
              <View style={styles.page29TopControlsRight}>
                {/* Audio/Voice Toggle Button */}
                <TouchableOpacity style={styles.page29VoiceBtn} activeOpacity={0.8}>
                  <Ionicons name="volume-high" size={16} color="#000000" />
                </TouchableOpacity>

                {/* Language Selector Pill */}
                <TouchableOpacity style={styles.page29LangPill} activeOpacity={0.8}>
                  <Ionicons name="language-outline" size={14} color="#2A2A2A" style={{ marginRight: 4 }} />
                  <Text style={styles.page29LangText}>English</Text>
                  <Ionicons name="chevron-down" size={14} color="#2A2A2A" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Content Area */}
            <View style={styles.page29ContentArea}>
              {/* Welcome Greetings Header */}
              <View style={styles.page29HeaderBlock}>
                <Text style={styles.page29Subtitle}>Welcome</Text>
                <Text style={styles.page29Title}>{driverProfile.name || aadhaarFullName || 'Delivery Partner'}</Text>
              </View>

              {/* Delivery Dost Mascot & Speech Bubble Block */}
              <View style={styles.page29MascotSection}>
                {/* Speech Bubble */}
                <View style={styles.page29SpeechBubble}>
                  <Text style={styles.page29SpeechText}>
                    I’m your dost. Here for you, always.
                  </Text>
                  <View style={styles.page29SpeechTail} />
                </View>

                {/* Delivery Dost Mascot Image */}
                <Image
                  source={require('../../assets/images/dost.png')}
                  style={styles.page29MascotImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Bottom Full-Width "Lets start" Button - Advances to Step 30 */}
            <View style={styles.page29BottomCard}>
              <TouchableOpacity
                onPress={() => setStep(30)}
                style={styles.page29StartBtnTouch}
                activeOpacity={0.8}
              >
                <View style={styles.page29StartBtnInner}>
                  <Text style={styles.page29StartBtnText}>Lets start</Text>
                  <Ionicons name="chevron-forward" size={20} color="#000000" />
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        ) : step === 28 ? (
          <SafeAreaView style={styles.page28Container}>
            {/* Top Control Bar */}
            <View style={styles.page28TopBar}>
              <View style={styles.page28TopControlsRight}>
                {/* Audio/Voice Toggle Button */}
                <TouchableOpacity style={styles.page28VoiceBtn} activeOpacity={0.8}>
                  <Ionicons name="volume-high" size={16} color="#000000" />
                </TouchableOpacity>

                {/* Language Selector Pill */}
                <TouchableOpacity style={styles.page28LangPill} activeOpacity={0.8}>
                  <Ionicons name="language-outline" size={14} color="#2A2A2A" style={{ marginRight: 4 }} />
                  <Text style={styles.page28LangText}>English</Text>
                  <Ionicons name="chevron-down" size={14} color="#2A2A2A" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Showcase Content Area */}
            <View style={styles.page28ContentArea}>
              {/* Rider Cash Payout Mascot Image */}
              <Image
                source={require('../../assets/images/rider_cash_payout_mascot.png')}
                style={styles.page28MascotImage}
                resizeMode="contain"
              />

              {/* Headline Tutorial Text */}
              <Text style={styles.page28HeadlineText}>
                Earn Daily, Get Payout Next Day
              </Text>
            </View>

            {/* Bottom Buttons Row: Back + Next */}
            <View style={styles.page28BottomCard}>
              <View style={styles.page28ButtonsRow}>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep(27)}
                  style={styles.page28BackBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={22} color="#F2CA50" />
                </TouchableOpacity>

                {/* Golden Next Button - Advances to Step 29 */}
                <TouchableOpacity
                  onPress={() => setStep(29)}
                  style={styles.page28NextBtnTouch}
                  activeOpacity={0.8}
                >
                  <View style={styles.page28NextBtnInner}>
                    <Text style={styles.page28NextBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000000" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        ) : step === 27 ? (
          <SafeAreaView style={styles.page27Container}>
            {/* Top Control Bar */}
            <View style={styles.page27TopBar}>
              <View style={styles.page27TopControlsRight}>
                {/* Audio/Voice Toggle Button */}
                <TouchableOpacity style={styles.page27VoiceBtn} activeOpacity={0.8}>
                  <Ionicons name="volume-high" size={16} color="#000000" />
                </TouchableOpacity>

                {/* Language Selector Pill */}
                <TouchableOpacity style={styles.page27LangPill} activeOpacity={0.8}>
                  <Ionicons name="language-outline" size={14} color="#2A2A2A" style={{ marginRight: 4 }} />
                  <Text style={styles.page27LangText}>English</Text>
                  <Ionicons name="chevron-down" size={14} color="#2A2A2A" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Showcase Content Area */}
            <View style={styles.page27ContentArea}>
              {/* Order Offer Showcase Card */}
              <View style={styles.page27OrderCard}>
                <Text style={styles.page27EarningLabel}>Estimated earning</Text>

                {/* Rupee Symbol Icons Row */}
                <View style={styles.page27RupeeRow}>
                  <Image
                    source={require('../../assets/images/rupee_symbol_icon.png')}
                    style={styles.page27RupeeIcon}
                    resizeMode="contain"
                  />
                  <Image
                    source={require('../../assets/images/rupee_symbol_icon.png')}
                    style={styles.page27RupeeIcon}
                    resizeMode="contain"
                  />
                  <Image
                    source={require('../../assets/images/rupee_symbol_icon.png')}
                    style={styles.page27RupeeIcon}
                    resizeMode="contain"
                  />
                </View>

                {/* Placeholder Skeleton Bars */}
                <View style={styles.page27SkeletonBar1} />
                <View style={styles.page27SkeletonBar2} />

                {/* Accept Order Button */}
                <TouchableOpacity
                  onPress={() => setStep(28)}
                  style={styles.page27AcceptBtnTouch}
                  activeOpacity={0.8}
                >
                  <Text style={styles.page27AcceptBtnText}>Accept order</Text>
                </TouchableOpacity>
              </View>

              {/* Headline Tutorial Text */}
              <Text style={styles.page27HeadlineText}>
                Got A New Order? Tap Accept
              </Text>
            </View>

            {/* Bottom Buttons Row: Back + Next */}
            <View style={styles.page27BottomCard}>
              <View style={styles.page27ButtonsRow}>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep(26)}
                  style={styles.page27BackBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={22} color="#F2CA50" />
                </TouchableOpacity>

                {/* Golden Next Button - Advances to Step 28 */}
                <TouchableOpacity
                  onPress={() => setStep(28)}
                  style={styles.page27NextBtnTouch}
                  activeOpacity={0.8}
                >
                  <View style={styles.page27NextBtnInner}>
                    <Text style={styles.page27NextBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000000" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        ) : step === 26 ? (
          <SafeAreaView style={styles.page26Container}>
            {/* Top Control Bar */}
            <View style={styles.page26TopBar}>
              <View style={styles.page26TopControlsRight}>
                {/* Audio/Voice Toggle Button */}
                <TouchableOpacity style={styles.page26VoiceBtn} activeOpacity={0.8}>
                  <Ionicons name="volume-high" size={16} color="#000000" />
                </TouchableOpacity>

                {/* Language Selector Pill */}
                <TouchableOpacity style={styles.page26LangPill} activeOpacity={0.8}>
                  <Ionicons name="language-outline" size={14} color="#2A2A2A" style={{ marginRight: 4 }} />
                  <Text style={styles.page26LangText}>English</Text>
                  <Ionicons name="chevron-down" size={14} color="#2A2A2A" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main Showcase Content Area */}
            <View style={styles.page26ContentArea}>
              {/* Center Online Toggle Showcase Card */}
              <View style={styles.page26ShowcaseCard}>
                <Text style={styles.page26TimeText}>09:30 AM</Text>

                {/* Online Toggle Switch Badge */}
                <View style={styles.page26ToggleBadge}>
                  <Text style={styles.page26OnlineLabel}>Online</Text>
                  <Image
                    source={require('../../assets/images/online_toggle_switch.png')}
                    style={styles.page26ToggleIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Headline Tutorial Text */}
              <Text style={styles.page26HeadlineText}>
                Go Online & Stay Near Restaurants!
              </Text>
            </View>

            {/* Bottom Buttons Row: Back + Next */}
            <View style={styles.page26BottomCard}>
              <View style={styles.page26ButtonsRow}>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep(25)}
                  style={styles.page26BackBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={22} color="#F2CA50" />
                </TouchableOpacity>

                {/* Golden Next Button - Advances to Step 27 */}
                <TouchableOpacity
                  onPress={() => setStep(27)}
                  style={styles.page26NextBtnTouch}
                  activeOpacity={0.8}
                >
                  <View style={styles.page26NextBtnInner}>
                    <Text style={styles.page26NextBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000000" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        ) : step === 25 ? (
          <SafeAreaView style={styles.page25Container}>
            {/* Top Control Bar */}
            <View style={styles.page25TopBar}>
              <View style={styles.page25TopControlsRight}>
                {/* Audio/Voice Toggle Button */}
                <TouchableOpacity style={styles.page25VoiceBtn} activeOpacity={0.8}>
                  <Ionicons name="volume-high" size={16} color="#000000" />
                </TouchableOpacity>

                {/* Language Selector Pill */}
                <TouchableOpacity style={styles.page25LangPill} activeOpacity={0.8}>
                  <Ionicons name="language-outline" size={14} color="#2A2A2A" style={{ marginRight: 4 }} />
                  <Text style={styles.page25LangText}>English</Text>
                  <Ionicons name="chevron-down" size={14} color="#2A2A2A" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Map Area with Gradient Overlays */}
            <View style={styles.page25MapWrapper}>
              <Image
                source={require('../../assets/images/work_zone_map_bg.png')}
                style={styles.page25MapImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['#0E0C0A', 'transparent']}
                style={styles.page25TopGradient}
              />
              <LinearGradient
                colors={['transparent', '#0E0C0A']}
                style={styles.page25BottomGradient}
              />
            </View>

            {/* Bottom Zone Confirmation Details & Navigation Controls */}
            <View style={styles.page25BottomCard}>
              <View style={styles.page25ZoneInfoBlock}>
                <Text style={styles.page25ZoneSubtitle}>Your Work Zone</Text>
                <Text style={styles.page25ZoneTitle}>
                  {selectedZone ? selectedZone.replace('_', ' ').toUpperCase() : 'CITY CENTRE'}
                </Text>
              </View>

              {/* Bottom Buttons Row: Back + Next */}
              <View style={styles.page25ButtonsRow}>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep(24)}
                  style={styles.page25BackBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={22} color="#F2CA50" />
                </TouchableOpacity>

                {/* Golden Next Button - Advances to Step 26 */}
                <TouchableOpacity
                  onPress={() => setStep(26)}
                  style={styles.page25NextBtnTouch}
                  activeOpacity={0.8}
                >
                  <View style={styles.page25NextBtnInner}>
                    <Text style={styles.page25NextBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color="#000000" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        ) : step === 24 ? (
          <SafeAreaView style={styles.page24Container}>
            <ScrollView contentContainerStyle={styles.page24ScrollContent} showsVerticalScrollIndicator={false}>
              {/* Green Hero Header Section */}
              <View style={styles.page24HeroBanner}>
                {/* Top Controls: Back Arrow + Help + Options */}
                <View style={styles.page24TopControlsRow}>
                  <TouchableOpacity
                    onPress={() => setStep(23)}
                    style={styles.page24BackBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={24} color="#EAE1D4" />
                  </TouchableOpacity>

                  <View style={styles.page24RightControls}>
                    <TouchableOpacity style={styles.page24HelpBtn} activeOpacity={0.7}>
                      <Ionicons name="call-outline" size={16} color="#E0A900" style={{ marginRight: 5 }} />
                      <Text style={styles.page24HelpText}>HELP</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.page24MoreBtn} activeOpacity={0.7}>
                      <Ionicons name="ellipsis-vertical" size={22} color="#EAE1D4" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Green Hero Text Content */}
                <View style={styles.page24HeroTextBlock}>
                  <Text style={styles.page24WelcomeText}>
                    Great {driverProfile.name || 'Delivery Partner'}!
                  </Text>
                  <Text style={styles.page24HeadlineText}>
                    Application submitted! Your ID will be ready in less than 5 minutes.
                  </Text>
                </View>
              </View>

              {/* Completed Tasks Checklist */}
              <View style={styles.page24ChecklistSection}>
                {/* Aadhaar Card Task Row (Completed) */}
                <TouchableOpacity onPress={() => setStep(23)} style={styles.page24TaskRow} activeOpacity={0.8}>
                  <Image
                    source={require('../../assets/images/checked_checkbox_green.png')}
                    style={styles.page24CheckedIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.page24TaskTextContainer}>
                    <Text style={styles.page24TaskTitle}>Aadhaar card</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#EAE1D4" />
                </TouchableOpacity>

                {/* Dashed Separator */}
                <View style={styles.page24DashedDivider} />

                {/* Selfie Task Row (Completed) */}
                <TouchableOpacity onPress={() => setStep(25)} style={styles.page24TaskRow} activeOpacity={0.8}>
                  <Image
                    source={require('../../assets/images/checked_checkbox_green.png')}
                    style={styles.page24CheckedIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.page24TaskTextContainer}>
                    <Text style={styles.page24TaskTitle}>Selfie</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#EAE1D4" />
                </TouchableOpacity>
              </View>

              {/* Full Width Thick Gray Section Divider */}
              <View style={styles.page24ThickDivider} />

              {/* Bank Details Later Promo Card - Tapping advances to Page 25 */}
              <TouchableOpacity onPress={() => setStep(25)} activeOpacity={0.9} style={styles.page24BankCardContainer}>
                <View style={styles.page24BankCardContent}>
                  <View style={styles.page24BankTextCol}>
                    <Text style={styles.page24BankCardTitle}>Add bank details later</Text>
                    <Text style={styles.page24BankCardSubtitle}>earnings go directly to your bank</Text>
                  </View>
                  <Image
                    source={require('../../assets/images/bank_details_passbook_card.png')}
                    style={styles.page24BankPassbookImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        ) : step === 23 ? (
          <SafeAreaView style={styles.page23Container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={styles.page23Content}>
                {/* Back Button */}
                <TouchableOpacity
                  onPress={() => setStep(22)}
                  style={styles.page23BackBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={24} color="#EAE1D4" />
                </TouchableOpacity>

                {/* Header Title + Aadhaar Card Icon Badge */}
                <View style={styles.page23HeaderRow}>
                  <View>
                    <Text style={styles.page23HeaderTitle}>Aadhaar card</Text>
                    <Text style={{ color: '#A0A0A0', fontSize: 13, fontFamily: 'Urbanist-Medium', marginTop: 4 }}>
                      Verify your identity with Aadhaar
                    </Text>
                  </View>
                  <View style={styles.page23AadhaarCardBadge}>
                    <Image
                      source={require('../../assets/images/aadhaar_card_icon.png')}
                      style={styles.page23AadhaarCardImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* Full Name Input as per Aadhaar Card */}
                <View style={[styles.page23RefundCard, { marginBottom: 16 }]}>
                  <View style={styles.page23CardTopRow}>
                    <Text style={[styles.page23CardLabel, { color: '#EAE1D4', fontWeight: '700' }]}>
                      Full Name (As per Aadhaar)
                    </Text>
                    <View style={[styles.page23StatusBadge, { backgroundColor: 'rgba(242, 202, 80, 0.15)' }]}>
                      <Ionicons name="person" size={12} color="#F2CA50" style={{ marginRight: 4 }} />
                      <Text style={[styles.page23StatusBadgeText, { fontSize: 11 }]}>Official Name</Text>
                    </View>
                  </View>
                  <TextInput
                    style={{
                      height: 50,
                      backgroundColor: '#1C1914',
                      borderWidth: 1.5,
                      borderColor: aadhaarFullName ? '#F2CA50' : '#3E3830',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontFamily: 'Urbanist-Bold',
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor="#787878"
                    value={aadhaarFullName}
                    onChangeText={(text) => {
                      setAadhaarFullName(text);
                      updateDriverProfile({ name: text });
                    }}
                    autoCapitalize="words"
                  />
                  <Text style={{ color: '#8E8E8E', fontSize: 12, fontFamily: 'Urbanist-Regular', marginTop: 6 }}>
                    This name will be displayed across your entire Rider Profile & ID.
                  </Text>
                </View>

                {/* Front Side Upload Card */}
                <View style={[styles.page23RefundCard, { marginBottom: 16 }]}>
                  <View style={styles.page23CardTopRow}>
                    <Text style={styles.page23CardLabel}>Front Side Photo</Text>
                    {aadhaarFrontUri ? (
                      <View style={styles.page23StatusBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                        <Text style={[styles.page23StatusBadgeText, { color: '#16A34A' }]}>Selected</Text>
                      </View>
                    ) : (
                      <View style={[styles.page23StatusBadge, { backgroundColor: 'rgba(224, 169, 0, 0.15)' }]}>
                        <Ionicons name="alert-circle" size={14} color="#E0A900" style={{ marginRight: 4 }} />
                        <Text style={[styles.page23StatusBadgeText, { color: '#E0A900' }]}>Required</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handlePickAadhaarImage('front')}
                    activeOpacity={0.85}
                    style={{
                      width: '100%',
                      height: 120,
                      borderRadius: 14,
                      backgroundColor: '#1E1E1E',
                      borderWidth: 1,
                      borderStyle: aadhaarFrontUri ? 'solid' : 'dashed',
                      borderColor: aadhaarFrontUri ? '#F2CA50' : '#555555',
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {aadhaarFrontUri ? (
                      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Image
                          source={{ uri: aadhaarFrontUri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Ionicons name="camera" size={14} color="#F2CA50" />
                          <Text style={{ color: '#F2CA50', fontSize: 12, fontFamily: 'Urbanist-Bold' }}>Change</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <Ionicons name="camera-outline" size={32} color="#EAE1D4" />
                        <Text style={{ color: '#EAE1D4', fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
                          Tap to Capture / Choose Front Photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Back Side Upload Card */}
                <View style={[styles.page23RefundCard, { marginBottom: 24 }]}>
                  <View style={styles.page23CardTopRow}>
                    <Text style={styles.page23CardLabel}>Back Side Photo</Text>
                    {aadhaarBackUri ? (
                      <View style={styles.page23StatusBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                        <Text style={[styles.page23StatusBadgeText, { color: '#16A34A' }]}>Selected</Text>
                      </View>
                    ) : (
                      <View style={[styles.page23StatusBadge, { backgroundColor: 'rgba(224, 169, 0, 0.15)' }]}>
                        <Ionicons name="alert-circle" size={14} color="#E0A900" style={{ marginRight: 4 }} />
                        <Text style={[styles.page23StatusBadgeText, { color: '#E0A900' }]}>Required</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => handlePickAadhaarImage('back')}
                    activeOpacity={0.85}
                    style={{
                      width: '100%',
                      height: 120,
                      borderRadius: 14,
                      backgroundColor: '#1E1E1E',
                      borderWidth: 1,
                      borderStyle: aadhaarBackUri ? 'solid' : 'dashed',
                      borderColor: aadhaarBackUri ? '#F2CA50' : '#555555',
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {aadhaarBackUri ? (
                      <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <Image
                          source={{ uri: aadhaarBackUri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Ionicons name="camera" size={14} color="#F2CA50" />
                          <Text style={{ color: '#F2CA50', fontSize: 12, fontFamily: 'Urbanist-Bold' }}>Change</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <Ionicons name="camera-outline" size={32} color="#EAE1D4" />
                        <Text style={{ color: '#EAE1D4', fontSize: 14, fontFamily: 'Urbanist-SemiBold' }}>
                          Tap to Capture / Choose Back Photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Submit / Proceed Button */}
                <TouchableOpacity
                  onPress={handleUploadAadhaarSubmit}
                  disabled={isUploadingAadhaar}
                  activeOpacity={0.85}
                  style={styles.continueBtnWrapper}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueBtnGradient}
                  >
                    <Text style={styles.continueBtnTextActive}>
                      {isUploadingAadhaar ? 'Verifying Documents...' : 'Submit Aadhaar For Verification'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        ) : step === 22 ? (
          <SafeAreaView style={styles.page22Container}>
            <ScrollView contentContainerStyle={styles.page22ScrollContent} showsVerticalScrollIndicator={false}>
              {/* Hero Header Section */}
              <View style={styles.page22HeroBanner}>
                <Image
                  source={require('../../assets/images/delivery_onboarding_partner_hero.png')}
                  style={styles.page22HeroImage}
                  resizeMode="cover"
                />

                {/* Top Controls: Back Arrow + Help + Options */}
                <View style={styles.page22TopControlsRow}>
                  <TouchableOpacity
                    onPress={() => setStep(15)}
                    style={styles.page22BackBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={24} color="#EAE1D4" />
                  </TouchableOpacity>

                  <View style={styles.page22RightControls}>
                    <TouchableOpacity style={styles.page22HelpBtn} activeOpacity={0.7}>
                      <Ionicons name="call-outline" size={16} color="#E0A900" style={{ marginRight: 5 }} />
                      <Text style={styles.page22HelpText}>HELP</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.page22MoreBtn} activeOpacity={0.7}>
                      <Ionicons name="ellipsis-vertical" size={22} color="#EAE1D4" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hero Text Content */}
                <View style={styles.page22HeroTextBlock}>
                  <Text style={styles.page22WelcomeText}>
                    Welcome {driverProfile.name || 'Delivery Partner'}!
                  </Text>
                  <Text style={styles.page22HeadlineText}>Complete your application now!</Text>
                </View>
              </View>

              {/* Application Tasks Checklist */}
              <View style={styles.page22ChecklistSection}>
                {/* Aadhaar Card Task Row */}
                <TouchableOpacity onPress={() => setStep(23)} style={styles.page22TaskRow} activeOpacity={0.8}>
                  <View style={styles.page22RadioIconWrapper}>
                    <View style={[styles.page22RadioCircle, (aadhaarFrontUri && aadhaarBackUri) && { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}>
                      {(aadhaarFrontUri && aadhaarBackUri) && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                  </View>
                  <View style={styles.page22TaskTextContainer}>
                    <Text style={styles.page22TaskTitle}>Aadhaar card</Text>
                    <Text style={(aadhaarFrontUri && aadhaarBackUri) ? styles.page22TaskStatusVerified : styles.page22TaskStatusPending}>
                      {(aadhaarFrontUri && aadhaarBackUri) ? 'Photos uploaded' : 'Pending'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep(23)} activeOpacity={0.8} style={styles.page22UploadBtnTouch}>
                    <LinearGradient
                      colors={['#E0A900', '#FFDB6D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.page22UploadBtnGradient}
                    >
                      <Text style={styles.page22UploadBtnText}>{(aadhaarFrontUri && aadhaarBackUri) ? 'Edit' : 'Upload'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Dashed Separator */}
                <View style={styles.page22DashedDivider} />

                {/* Selfie Task Row */}
                <TouchableOpacity onPress={() => setStep(10)} style={styles.page22TaskRow} activeOpacity={0.8}>
                  <View style={styles.page22RadioIconWrapper}>
                    <View style={[styles.page22RadioCircle, selfieUri && { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}>
                      {selfieUri && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                  </View>
                  <View style={styles.page22TaskTextContainer}>
                    <Text style={styles.page22TaskTitle}>Selfie</Text>
                    <Text style={styles.page22TaskStatusVerified}>
                      {selfieUri ? 'Selfie captured' : 'Sent for verification'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#EAE1D4" />
                </TouchableOpacity>
              </View>

              {/* Full Width Thick Gray Section Divider */}
              <View style={styles.page22ThickDivider} />

              {/* Bank Details Later Promo Card */}
              <View style={styles.page22BankCardContainer}>
                <View style={styles.page22BankCardContent}>
                  <View style={styles.page22BankTextCol}>
                    <Text style={styles.page22BankCardTitle}>Add bank details later</Text>
                    <Text style={styles.page22BankCardSubtitle}>earnings go directly to your bank</Text>
                  </View>
                  <Image
                    source={require('../../assets/images/bank_details_passbook_card.png')}
                    style={styles.page22BankPassbookImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        ) : step === 19 ? (
          <SafeAreaView style={styles.page19Container}>
            {/* Hero Banner: Starfield + Earnings Guarantee */}
            <View style={styles.page19HeroBanner}>
              <Image
                source={require('../../assets/images/earnings_hero_banner.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
              {/* Back Button */}
              <TouchableOpacity
                onPress={() => setStep(14)}
                style={styles.page19BackBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={26} color="#EAE1D4" />
              </TouchableOpacity>
            </View>

            {/* Section Tab Label */}
            <Text style={styles.page19SectionTab}>Pay Joining Fee</Text>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.page19ScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* ── PAY IN INSTALMENT CARD (Selected / Gold bordered) ── */}
              <TouchableOpacity
                style={[
                  styles.page19PayCard,
                  selectedPayment === 'instalment'
                    ? styles.page19PayCardSelected
                    : styles.page19PayCardUnselected,
                ]}
                onPress={() => setSelectedPayment('instalment')}
                activeOpacity={0.9}
              >
                {/* Card Header Row */}
                <View style={styles.page19CardHeaderRow}>
                  <Text style={styles.page19CardTitle}>Pay in instalment</Text>
                  <Ionicons
                    name={selectedPayment === 'instalment' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color="#F2CA50"
                  />
                </View>

                {/* Amount + Description Row */}
                <View style={styles.page19AmountRow}>
                  <View style={styles.page19AmountBadge}>
                    <Text style={styles.page19AmountText}>₹49</Text>
                  </View>
                  <View style={styles.page19VertDivider} />
                  <Text style={styles.page19InstalmentDesc}>
                    Pay remaining ₹1,749 later in weekly instalments ₹100–₹600/week
                  </Text>
                </View>

                {/* Audio Player Row */}
                <View style={styles.page19AudioPlayer}>
                  <Image
                    source={require('../../assets/images/play_button_icon.png')}
                    style={styles.page19PlayIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.page19AudioTime}>00:00</Text>
                  <View style={styles.page19ProgressTrack}>
                    <View style={styles.page19ProgressFill} />
                    <View style={styles.page19ProgressThumb} />
                  </View>
                  <View style={styles.page19TranslateBtn}>
                    <Image
                      source={require('../../assets/images/translate_icon.png')}
                      style={styles.page19TranslateIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* Pay Button */}
                <TouchableOpacity
                  onPress={handlePayInstalment}
                  activeOpacity={0.85}
                  style={styles.page19PayNowBtnTouch}
                >
                  <LinearGradient
                    colors={['#F2CA50', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.page19PayNowBtnGradient}
                  >
                    <Text style={styles.page19PayNowBtnText}>Pay only ₹49 now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </TouchableOpacity>

              {/* ── PAY FULL CARD ── */}
              <TouchableOpacity
                style={[
                  styles.page19PayCard,
                  selectedPayment === 'full'
                    ? styles.page19PayCardSelected
                    : styles.page19PayCardUnselected,
                ]}
                onPress={() => setSelectedPayment('full')}
                activeOpacity={0.9}
              >
                {/* Card Header */}
                <View style={styles.page19CardHeaderRow}>
                  <Text style={styles.page19CardTitle}>Pay Full</Text>
                  <Ionicons
                    name={selectedPayment === 'full' ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color="#F2CA50"
                  />
                </View>

                {/* Price Row: ₹1,258 + strikethrough ₹1,798 + Save badge */}
                <View style={styles.page19FullPriceRow}>
                  <Text style={styles.page19FullPrice}>₹1,258</Text>
                  <Text style={styles.page19StrikethroughPrice}>₹1,798</Text>
                  <View style={styles.page19SaveBadge}>
                    <Text style={styles.page19SaveBadgeText}>Save ₹540</Text>
                  </View>
                </View>

                {/* Audio Player Row */}
                <View style={styles.page19AudioPlayer}>
                  <Image
                    source={require('../../assets/images/play_button_icon.png')}
                    style={styles.page19PlayIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.page19AudioTime}>00:00</Text>
                  <View style={styles.page19ProgressTrack}>
                    <View style={styles.page19ProgressFill} />
                    <View style={styles.page19ProgressThumb} />
                  </View>
                  <View style={styles.page19TranslateBtn}>
                    <Image
                      source={require('../../assets/images/translate_icon.png')}
                      style={styles.page19TranslateIcon}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* No Extra Charges row */}
                <View style={styles.page19NoExtraRow}>
                  <Image
                    source={require('../../assets/images/smiling_sunglasses_emoji.png')}
                    style={styles.page19SunglassEmoji}
                    resizeMode="contain"
                  />
                  <Text style={styles.page19NoExtraText}>No Extra Charges Later</Text>
                </View>

                {/* Pay Full Button */}
                <TouchableOpacity
                  onPress={handlePayFull}
                  activeOpacity={0.85}
                  style={styles.page19PayNowBtnTouch}
                >
                  <LinearGradient
                    colors={['#F2CA50', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.page19PayNowBtnGradient}
                  >
                    <Text style={styles.page19PayNowBtnText}>Pay ₹1,258 Full Amount</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Bottom spacer */}
              <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── PAGE 20: TERMS & CONDITIONS BOTTOM SHEET MODAL (Figma Node 963:199) ── */}
            <Modal
              visible={showTermsModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowTermsModal(false)}
            >
              {/* Dark scrim */}
              <TouchableWithoutFeedback onPress={() => setShowTermsModal(false)}>
                <View style={styles.page20Scrim} />
              </TouchableWithoutFeedback>

              {/* Bottom Sheet */}
              <View style={styles.page20BottomSheet}>
                {/* Drag handle */}
                <View style={styles.page20DragHandle} />

                {/* Checkbox row */}
                <TouchableOpacity
                  onPress={() => setTermsAgreed(!termsAgreed)}
                  activeOpacity={0.8}
                  style={styles.page20CheckboxRow}
                >
                  <Image
                    source={
                      termsAgreed
                        ? require('../../assets/images/tick_box_checked.png')
                        : require('../../assets/images/tick_box_checked.png')
                    }
                    style={styles.page20CheckboxIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.page20TermsText}>
                    I agree to the{' '}
                    <Text style={styles.page20TermsLink}>terms and conditions</Text>
                    {' '}mentioned by the vender and the company
                  </Text>
                </TouchableOpacity>

                {/* Agree & Pay Button */}
                <TouchableOpacity
                  onPress={handleAgreeAndPay}
                  activeOpacity={0.85}
                  style={styles.page20AgreeBtn}
                >
                  <LinearGradient
                    colors={['#F2CA50', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.page20AgreeBtnGradient}
                  >
                    <Text style={styles.page20AgreeBtnText}>Agree & Pay Only 49 Now</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Home Indicator bar */}
                <View style={styles.page20HomeIndicator} />
              </View>
            </Modal>
          </SafeAreaView>
        ) : step === 18 ? (
          /* STEP 18: ENTER YOUR DELIVERY ADDRESS FORM (Figma Node 919:161) */
          <SafeAreaView style={styles.page18Container}>
            {/* Header: Back + 3-dot Menu */}
            <View style={styles.page18HeaderRow}>
              <TouchableOpacity
                onPress={() => setStep(17)}
                style={styles.page18BackBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={26} color="#EAE1D4" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.page18MoreBtn} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={22} color="#EAE1D4" />
              </TouchableOpacity>
            </View>

            {/* Page Title */}
            <Text style={styles.page18Title}>Enter your delivery address</Text>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.page18ScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Warning Banner: Delivery location cannot be changed later */}
                <View style={styles.page18WarningBanner}>
                  <Image
                    source={require('../../assets/images/idea_lightbulb_icon.png')}
                    style={styles.page18BulbIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.page18WarningText}>
                    Delivery location cannot be changed later
                  </Text>
                </View>

                {/* House/Flat Number Field — gold-bordered with floating label */}
                <View style={styles.page18FloatLabelWrapper}>
                  <View style={styles.page18HouseNumberField}>
                    <TextInput
                      style={styles.page18HouseNumberInput}
                      value={houseNumber}
                      onChangeText={setHouseNumber}
                      placeholderTextColor="rgba(229,226,225,0.5)"
                      selectionColor="#F2CA50"
                    />
                  </View>
                  {/* Floating label clipped over the border */}
                  <View style={styles.page18FloatLabelBg}>
                    <Text style={styles.page18FloatLabelText}>House/flat number*</Text>
                  </View>
                </View>

                {/* Street Address Row: text + Change button */}
                <View style={styles.page18StreetRow}>
                  <View style={styles.page18StreetField}>
                    <Text style={styles.page18FieldText} numberOfLines={3}>
                      {streetAddress}
                    </Text>
                  </View>

                  {/* Change Button with map thumbnail */}
                  <TouchableOpacity
                    onPress={() => setStep(16)}
                    activeOpacity={0.85}
                    style={styles.page18ChangeBtn}
                  >
                    <Image
                      source={require('../../assets/images/dark_map_background.png')}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                    <View style={styles.page18ChangeBtnOverlay} />
                    <Image
                      source={require('../../assets/images/gold_map_pin.png')}
                      style={styles.page18ChangePinIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.page18ChangeBtnLabel}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Landmark (optional) */}
                <View style={styles.page18StandardField}>
                  <TextInput
                    style={styles.page18FieldInput}
                    placeholder="Landmark (optional)"
                    placeholderTextColor="#EAE1D4"
                    value={landmark}
                    onChangeText={setLandmark}
                    selectionColor="#F2CA50"
                  />
                </View>

                {/* Pincode */}
                <View style={styles.page18StandardField}>
                  <TextInput
                    style={styles.page18FieldInput}
                    placeholder="Pincode"
                    placeholderTextColor="#EAE1D4"
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="numeric"
                    selectionColor="#F2CA50"
                  />
                </View>

                {/* City */}
                <View style={styles.page18StandardField}>
                  <TextInput
                    style={styles.page18FieldInput}
                    placeholder="City"
                    placeholderTextColor="#EAE1D4"
                    value={cityField}
                    onChangeText={setCityField}
                    selectionColor="#F2CA50"
                  />
                </View>

                {/* State */}
                <View style={styles.page18StandardField}>
                  <TextInput
                    style={styles.page18FieldInput}
                    placeholder="State"
                    placeholderTextColor="#EAE1D4"
                    value={stateField}
                    onChangeText={setStateField}
                    selectionColor="#F2CA50"
                  />
                </View>

                {/* Bottom spacer */}
                <View style={{ height: 100 }} />
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Submit Details Button — fixed at bottom */}
            <View style={styles.page18BottomBtnContainer}>
              <TouchableOpacity
                onPress={handleSubmitDeliveryDetails}
                activeOpacity={0.85}
                style={styles.page18SubmitBtnTouch}
              >
                <LinearGradient
                  colors={['#F2CA50', '#D4AF37', '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.page18SubmitBtnGradient}
                >
                  <Text style={styles.page18SubmitBtnText}>Submit details</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        ) : step === 17 ? (
          /* STEP 17: ADDRESS FOR T-SHIRT & BAG DELIVERY - CURRENT LOCATION (Figma Node 860:165) */
          <View style={styles.fullFlex}>
            {/* Frozen snapshot of the pinned map region */}
            <MapView
              style={StyleSheet.absoluteFillObject}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              showsUserLocation={false}
              pointerEvents="none"
              provider="google"
            >
              {OLA_MAPS_API_KEY ? (
                <UrlTile
                  urlTemplate={`https://api.olamaps.io/tiles/v1/styles/default-light/{z}/{x}/{y}.png?api_key=${OLA_MAPS_API_KEY}`}
                  maximumZ={19}
                  flipY={false}
                />
              ) : null}
            </MapView>

            {/* Center pin overlay on step 17 snapshot */}
            <View
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
              pointerEvents="none"
            >
              <View style={[styles.goldPinWrapper, { transform: [{ translateY: -29 }] }]}>
                <Image
                  source={require('../../assets/images/gold_map_pin.png')}
                  style={styles.goldPinImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Top Gradient Overlay */}
            <LinearGradient
              colors={['#0E0C0A', 'rgba(14, 12, 10, 0.4)', 'transparent']}
              style={styles.page16TopGradientOverlay}
              pointerEvents="none"
            />

            <SafeAreaView style={styles.page16SafeAreaContainer}>
              {/* Header Row: Back Button */}
              <View style={styles.page16HeaderRow}>
                <TouchableOpacity
                  onPress={() => setStep(16)}
                  style={styles.page16BackBtnTouch}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
              </View>

              {/* Spacer — touches in the middle pass through to map snapshot */}
              <View style={{ flex: 1 }} pointerEvents="none" />

              {/* Bottom Address Card: Address for T-shirt & bag delivery */}
              <View style={styles.page17BottomCard}>
                {/* Section Title */}
                <Text style={styles.page17AddressHeaderTitle}>Address for T-shirt &amp; bag delivery</Text>

                {/* Dark location card */}
                <View style={styles.page17LocationCard}>
                  {/* Location Icon Box */}
                  <View style={styles.page17LocationIconBox}>
                    <Image
                      source={require('../../assets/images/location_redirect_icon.png')}
                      style={styles.page17LocationIcon}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Address Text Block */}
                  <View style={styles.page17AddressTextBlock}>
                    <Text style={styles.page17CurrentLocationLabel}>At my current location</Text>
                    <Text style={styles.page17AddressSubtext}>
                      {deliveryAddress || 'Fetching your location...'}
                    </Text>
                  </View>
                </View>

                {/* Use My Current Location Button */}
                <TouchableOpacity
                  onPress={handleUseCurrentLocation}
                  activeOpacity={0.85}
                  style={styles.page17UseCurrentBtn}
                >
                  <LinearGradient
                    colors={['#F2CA50', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.page17UseCurrentBtnGradient}
                  >
                    <Text style={styles.page17UseCurrentBtnText}>Use My Current Location</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Or Divider Row */}
                <View style={styles.page17OrDividerRow}>
                  <View style={styles.page17DashedLine} />
                  <Text style={styles.page17OrText}>Or</Text>
                  <View style={styles.page17DashedLine} />
                </View>

                {/* Add A Different Location Button */}
                <TouchableOpacity
                  onPress={handleAddDifferentLocation}
                  activeOpacity={0.8}
                  style={styles.page17DifferentLocationBtn}
                >
                  <Text style={styles.page17DifferentLocationBtnText}>Add A Different Location</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        ) : step === 16 ? (
          /* STEP 16: INTERACTIVE MAP PINNING & DELIVERY ADDRESS SELECTION SCREEN (Figma Node 815:202) */
          <View style={styles.fullFlex}>
            {/* Live MapView with Ola Maps light tiles overlay */}
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFillObject}
              initialRegion={mapRegion}
              showsUserLocation={hasLocationPermission}
              showsMyLocationButton={false}
              provider="google"
              onRegionChangeComplete={async (region) => {
                try {
                  setIsResolvingAddress(true);
                  const info = await reverseGeocode(region.latitude, region.longitude);
                  if (info) {
                    setDeliveryAddress(info.address);
                    setStreetAddress(info.street);
                    setCityField(info.city);
                    setStateField(info.state);
                    setPincode(info.pincode);
                  }
                } catch (e) {
                  console.warn('[step16] reverseGeocode error:', e);
                } finally {
                  setIsResolvingAddress(false);
                }
              }}
            >
              {OLA_MAPS_API_KEY ? (
                <UrlTile
                  urlTemplate={`https://api.olamaps.io/tiles/v1/styles/default-light/{z}/{x}/{y}.png?api_key=${OLA_MAPS_API_KEY}`}
                  maximumZ={19}
                  flipY={false}
                />
              ) : null}
            </MapView>

            {/* Top Map Gradient Overlay */}
            <LinearGradient
              colors={['#0E0C0A', 'rgba(14, 12, 10, 0.4)', 'transparent']}
              style={styles.page16TopGradientOverlay}
              pointerEvents="none"
            />

            <SafeAreaView style={styles.page16SafeAreaContainer} pointerEvents="box-none">
              {/* Header Row: Back Button & Map Search Input + Autocomplete Overlay */}
              <View>
                <View style={styles.page16HeaderRow}>
                  <TouchableOpacity
                    onPress={() => setStep(14)}
                    style={styles.page16BackBtnTouch}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.page16SearchInputFrame}>
                    <TextInput
                      style={styles.page16SearchTextInput}
                      placeholder="Search your area or address"
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      value={mapSearchQuery}
                      onChangeText={setMapSearchQuery}
                    />
                    <View style={styles.searchDividerLine} />
                    <Ionicons name="search" size={20} color="#FFFFFF" style={styles.searchIconRight} />
                  </View>
                </View>

                {/* Autocomplete Suggestions Dropdown */}
                {predictions.length > 0 && (
                  <View style={{
                    backgroundColor: '#1C1A17',
                    marginHorizontal: 16,
                    borderRadius: 10,
                    marginTop: 4,
                    maxHeight: 200,
                    zIndex: 9999,
                    borderWidth: 1,
                    borderColor: '#3A3530',
                    overflow: 'hidden',
                    elevation: 12,
                  }}>
                    <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {predictions.map((p) => (
                        <TouchableOpacity
                          key={p.placeId}
                          style={{ padding: 13, borderBottomWidth: 1, borderBottomColor: '#2A2620' }}
                          onPress={() => handleSelectPrediction(p)}
                        >
                          <Ionicons name="location-outline" size={14} color="#F2CA50" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#EAE1D4', fontSize: 14, fontFamily: 'Urbanist-SemiBold', paddingLeft: 20 }} numberOfLines={2}>{p.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Transparent spacer — lets touches fall through to the MapView beneath */}
              <View style={{ flex: 1 }} pointerEvents="none" />

              {/* Floating Bottom Address Confirmation Card */}
              <View style={styles.page16BottomAddressCardContainer}>
                {/* Header Banner Pill */}
                <LinearGradient
                  colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.page16BannerPillGradient}
                >
                  <Text style={styles.page16BannerPillText}>Bag &amp; T-shirt will be delivered here</Text>
                </LinearGradient>

                <View style={styles.page16CardContentInner}>
                  <Text style={styles.page16LocationTitle} numberOfLines={1}>
                    {streetAddress || cityField || 'Locating...'}
                  </Text>
                  <Text style={styles.page16AddressSubtext} numberOfLines={3}>
                    {isResolvingAddress ? 'Updating address...' : (deliveryAddress || 'Move the pin to set your location')}
                  </Text>

                  <TouchableOpacity
                    onPress={handleMapContinueDetails}
                    activeOpacity={0.85}
                    style={styles.page16ContinueBtnTouch}
                  >
                    <LinearGradient
                      colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.page16ContinueBtnGradient}
                    >
                      <Text style={styles.page16ContinueBtnText}>Continue to add details</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>

            {/* ── Fixed center pin overlay (map moves, pin stays) ── */}
            <View
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {/* Tooltip bubble above pin */}
              {showTooltip && (
                <View style={styles.tooltipBubbleContainer}>
                  <Text style={styles.tooltipText}>Move the pin to change location</Text>
                  <TouchableOpacity
                    onPress={() => setShowTooltip(false)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    // allow tap through to dismiss
                    style={{ pointerEvents: 'auto' } as any}
                  >
                    <Ionicons name="close" size={16} color="#0E0C0A" />
                  </TouchableOpacity>
                  <View style={styles.tooltipTailArrow} />
                </View>
              )}

              {/* Gold pin fixed at center - tip is accurate center */}
              <View style={[styles.goldPinWrapper, { transform: [{ translateY: -29 }] }]}>
                <Image
                  source={require('../../assets/images/gold_map_pin.png')}
                  style={styles.goldPinImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        ) : step === 15 ? (
          /* STEP 15: KIT ORDER SUCCESS & FINAL DELIVERY CONFIRMATION */
          <LinearGradient
            colors={['#0E0C0A', '#1E1C1A', '#2A261C', '#0E0C0A']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={styles.fullFlex}
          >
            <SafeAreaView style={styles.fullFlex}>
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <View>
                  <View style={styles.kitDeliveryHeroContainerAdjusted}>
                    <Image
                      source={require('../../assets/images/kit_delivery_banner.png')}
                      style={{ width: '100%', height: '115%', position: 'absolute', top: 0 }}
                      resizeMode="cover"
                    />
                    <View style={styles.kitDeliveryHeroGradientOverlay} />
                  </View>

                  <View style={styles.page15CardContainer}>
                    <View style={styles.successBadgeRow}>
                      <Ionicons name="checkmark-circle" size={28} color="#16A34A" />
                      <Text style={styles.successBadgeTitle}>Kit Order Placed Successfully!</Text>
                    </View>

                    <Text style={styles.page15DeliveryEstText}>
                      Estimated Delivery: <Text style={styles.goldHighlightText}>2-3 Business Days</Text>
                    </Text>

                    <View style={styles.kitDeliveryLineDivider} />

                    <Text style={styles.kitDeliveryHeaderTitle}>Delivering to:</Text>
                    <Text style={styles.kitDeliveryAddressText}>{deliveryAddress}</Text>

                    <View style={styles.kitSummaryBox}>
                      <Text style={styles.kitSummaryTitle}>Kit Contents & Payment Details:</Text>
                      <Text style={styles.kitSummaryItem}>• Official My Quro T-Shirt (Size: {selectedTshirtSize})</Text>
                      <Text style={styles.kitSummaryItem}>• Insulated Thermal Delivery Bag</Text>
                      <Text style={styles.kitSummaryItem}>• Payment Option: {selectedPayment === 'instalment' ? 'Instalment (₹49 Paid)' : 'Full Amount (₹1,258 Paid)'}</Text>
                      <Text style={styles.kitSummaryItem}>• Rider ID Card & Helmet Decals</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.page14BottomButtonsContainer}>
                  <TouchableOpacity
                    onPress={handleProceedToAadhaar}
                    activeOpacity={0.85}
                    style={styles.continueBtnWrapper}
                  >
                    <LinearGradient
                      colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.continueBtnGradient}
                    >
                      <Text style={styles.continueBtnTextActive}>Proceed to Aadhaar Verification</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        ) : step === 14 ? (
          /* STEP 14: CONFIRM KIT DELIVERY ADDRESS SCREEN (Figma Node 811:155) */
          <SafeAreaView style={styles.fullFlex}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={styles.kitDeliveryHeroContainerAdjusted}>
                <Image
                  source={require('../../assets/images/kit_delivery_banner.png')}
                  style={styles.kitDeliveryHeroImageAdjusted}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setStep(13)}
                  style={styles.page19BackBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={26} color="#EAE1D4" />
                </TouchableOpacity>
              </View>

              <View style={styles.kitDeliveryAddressDetailsContainer}>
                <Text style={styles.kitDeliveryHeaderTitle}>T-shirt & bag will be delivered here</Text>

                <View style={styles.kitDeliveryLineDivider} />

                <Text style={styles.kitDeliveryAddressText}>
                  {deliveryAddress || 'No delivery address selected. Please add your address to receive your kit.'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.page14BottomButtonsContainer}>
              {deliveryAddress ? (
                <>
                  <TouchableOpacity
                    onPress={handleAddressConfirm}
                    activeOpacity={0.85}
                    style={styles.continueBtnWrapper}
                  >
                    <LinearGradient
                      colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.continueBtnGradient}
                    >
                      <Text style={styles.continueBtnTextActive}>Continue</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleOpenMapChangeAddress}
                    activeOpacity={0.8}
                    style={styles.changeAddressBtnTouch}
                  >
                    <Text style={styles.changeAddressBtnText}>No, change address</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={handleOpenMapChangeAddress}
                  activeOpacity={0.85}
                  style={styles.continueBtnWrapper}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueBtnGradient}
                  >
                    <Text style={styles.continueBtnTextActive}>Add Address</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(16)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(15)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 13 ? (
          /* STEP 13: SELECT T-SHIRT SIZE SCREEN (Figma Node 800:154) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page6TopBar}>
              <TouchableOpacity onPress={() => setStep(11)} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.page6HeaderTitle}>Select T-shirt size</Text>
            </View>

            <ScrollView style={styles.page13ScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.tshirtCardFrame}>
                <Image
                  source={require('../../assets/images/rider_tshirt_showcase.png')}
                  style={styles.tshirtShowcaseImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.tshirtSizeHeaderRow}>
                <Text style={styles.tshirtSizeLabelLeft}>Select size</Text>
                <Text style={styles.tshirtSizeLabelRight}>{selectedTshirtSize}</Text>
              </View>

              <View style={styles.sizePillsRow}>
                {TSHIRT_SIZES.map((size) => {
                  const isSelected = selectedTshirtSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      activeOpacity={0.8}
                      onPress={() => setSelectedTshirtSize(size)}
                      style={[
                        styles.sizePillTouch,
                        isSelected ? styles.sizePillSelected : styles.sizePillUnselected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sizePillText,
                          isSelected ? styles.sizePillTextSelected : styles.sizePillTextUnselected,
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.page5BottomContainer}>
              <TouchableOpacity
                onPress={handleTshirtContinue}
                activeOpacity={0.85}
                style={styles.continueBtnWrapper}
              >
                <LinearGradient
                  colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueBtnGradient}
                >
                  <Text style={styles.continueBtnTextActive}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(16)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(15)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 12 ? (
          /* STEP 12: DELIVERY ONBOARDING AMBIENT COMPLETION SCREEN (Figma Node 773:340) */
          <LinearGradient
            colors={['#0E0C0A', '#1E1C1A', '#3A3835', '#12100E']}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.9 }}
            style={styles.fullFlex}
          >
            <View style={styles.topRightGoldenGlow} />
            <View style={styles.bottomLeftGoldenGlow} />

            <SafeAreaView style={styles.fullFlex}>
              <View style={styles.page12ContentContainer}>
                <View style={styles.page12MascotCircle}>
                  <Image
                    source={require('../../assets/images/rider_mascot.png')}
                    style={styles.page12MascotImage}
                    resizeMode="contain"
                  />
                  <View style={styles.page12CheckBadge}>
                    <Ionicons name="checkmark-circle" size={36} color="#16A34A" />
                  </View>
                </View>

                <Text style={styles.page12Title}>Registration Complete!</Text>
                <Text style={styles.page12Subtitle}>
                  Welcome to <Text style={styles.goldBrandText}>My Quro</Text> Rider Fleet.{'\n'}
                  Your profile and work settings are verified.
                </Text>
              </View>

              <View style={styles.page5BottomContainer}>
                <TouchableOpacity
                  onPress={handleEnterDashboard}
                  activeOpacity={0.85}
                  style={styles.continueBtnWrapper}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueBtnGradient}
                  >
                    <Text style={styles.continueBtnTextActive}>Go to Dashboard</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.stepIndicatorRow}>
                  <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
                  <View style={styles.stepDotActive} />
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>
        ) : step === 11 ? (
          /* STEP 11: CREATE PROFILE SELFIE CONFIRMATION SCREEN (Figma Node 771:247) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page6TopBar}>
              <TouchableOpacity onPress={() => setStep(10)} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.page6HeaderTitle}>Create your profile</Text>

              <View style={styles.topBarRightGroup}>
                <TouchableOpacity style={styles.helpButton} activeOpacity={0.8}>
                  <Ionicons name="call" size={14} color="#F2CA50" />
                  <Text style={styles.helpButtonText}>HELP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.progressLineBg}>
              <View style={[styles.progressLineFill, { width: '75%' }]} />
            </View>

            <View style={styles.page11CenterContainer}>
              <View style={styles.page11AvatarPreviewContainer}>
                <Image
                  source={selfieUri ? { uri: selfieUri } : require('../../assets/images/selfie_good_example.png')}
                  style={styles.page11AvatarImage}
                  resizeMode="cover"
                />
              </View>

              <TouchableOpacity onPress={handleTakeSelfieNow} activeOpacity={0.7} style={styles.retakeLinkTouch}>
                <Text style={styles.retakeLinkText}>Click selfie again</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep(10)} activeOpacity={0.7} style={styles.infoLinkTouch}>
                <Text style={styles.infoLinkText}>See how to click correct selfie</Text>
                <Ionicons name="information-circle-outline" size={18} color="#787878" />
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />

            <View style={styles.page5BottomContainer}>
              <TouchableOpacity
                onPress={handleProfileCompleteFinal}
                activeOpacity={0.85}
                style={styles.continueBtnWrapper}
              >
                <LinearGradient
                  colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueBtnGradient}
                >
                  <Text style={styles.continueBtnTextActive}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 10 ? (
          /* STEP 10: SELFIE VERIFICATION GUIDELINES SCREEN (Figma Node 770:205) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page6TopBar}>
              <TouchableOpacity onPress={() => setStep(9)} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.page10ScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.badSelfieWarningTitle}>Don’t click selfies like this</Text>

              <View style={styles.badSelfieGridContainer}>
                {BAD_SELFIE_LABELS.map((label, index) => (
                  <View key={label} style={styles.badSelfieItemWrapper}>
                    <View style={styles.badSelfieImageFrame}>
                      <Image
                        source={require('../../assets/images/selfie_good_example.png')}
                        style={[
                          styles.badSelfieImage,
                          index === 1 && { opacity: 0.3 },
                          index === 2 && { tintColor: '#333333' },
                          index === 4 && { tintColor: '#1A1A1A' },
                          index === 5 && { opacity: 0.2 },
                        ]}
                        resizeMode="cover"
                      />
                      <View style={styles.redCancelBadge}>
                        <Ionicons name="close-circle" size={20} color="#FF0808" />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.goodSelfieSectionContainer}>
                <View style={styles.goodSelfieAvatarWrapper}>
                  <Image
                    source={require('../../assets/images/selfie_good_example.png')}
                    style={styles.goodSelfieImage}
                    resizeMode="cover"
                  />
                  <View style={styles.greenCheckBadge}>
                    <Ionicons name="checkmark-circle" size={32} color="#16A34A" />
                  </View>
                </View>

                <Text style={styles.goodSelfieInstructionTitle}>Take clean, clear selfie</Text>
              </View>
            </ScrollView>

            <View style={styles.page5BottomContainer}>
              <TouchableOpacity
                onPress={handleTakeSelfieNow}
                activeOpacity={0.85}
                style={styles.continueBtnWrapper}
              >
                <LinearGradient
                  colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueBtnGradient}
                >
                  <Text style={styles.continueBtnTextActive}>Take selfie now</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 9 ? (
          /* STEP 9: DELIVERY ONBOARDING CHECKLIST - STEP 2 ACTIVE (Figma Node 758:128) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page4TopBar}>
              <View style={styles.topBarRightGroup}>
                <TouchableOpacity style={styles.helpButton} activeOpacity={0.8}>
                  <Ionicons name="call" size={14} color="#F2CA50" />
                  <Text style={styles.helpButtonText}>HELP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.mascotContainer}>
              <Image
                source={require('../../assets/images/rider_mascot.png')}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.checklistHeadline}>
              Become a delivery partner in 3 easy steps!
            </Text>

            <View style={styles.checklistCardsContainer}>
              <View style={styles.completedStepCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.completedCheckCircle}>
                    <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.stepNumberLabelLocked}>STEP 1</Text>
                    <Text style={styles.stepTitleTextActive}>Work Setting</Text>
                    <Text style={styles.completedStatusText}>Completed</Text>
                  </View>
                </View>

                <Image
                  source={require('../../assets/images/helmet_graphic.png')}
                  style={styles.helmetGraphic}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.activeStepCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.lockBadgeActive}>
                    <Ionicons name="lock-open" size={13} color="#F2CA50" />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.stepNumberLabelActive}>STEP 2</Text>
                    <Text style={styles.stepTitleTextActive}>Profile</Text>
                    <Text style={styles.stepSubtextActive}>Uploads Aadhar and PAN details</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleStep2ProfileContinue}
                  activeOpacity={0.85}
                  style={styles.startNowButton}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBtnContent}
                  >
                    <Text style={styles.startNowText}>Continue</Text>
                    <Ionicons name="chevron-forward" size={18} color="#3A2C00" />
                  </LinearGradient>
                </TouchableOpacity>

                <Image
                  source={require('../../assets/images/profile_icon.png')}
                  style={styles.profileIconGraphicActive}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.lockedStepCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.lockBadgeLocked}>
                    <Ionicons name="lock-closed" size={13} color="#8D8D8D" />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.stepNumberLabelLocked}>STEP 3</Text>
                    <Text style={styles.stepTitleTextLocked}>Pay Joining Fees</Text>
                  </View>
                </View>
                <Image
                  source={require('../../assets/images/helmet_graphic.png')}
                  style={styles.kitBagGraphic}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.stepIndicatorRow}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
              <View style={styles.stepDotActive} />
              <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
            </View>
          </SafeAreaView>
        ) : step === 8 ? (
          /* STEP 8: SELECT DELIVERY CATEGORY SCREEN (Figma Node 732:142) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page5TopBar}>
              <TouchableOpacity onPress={() => setStep(7)} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.topBarRightGroup}>
                <TouchableOpacity style={styles.helpButton} activeOpacity={0.8}>
                  <Ionicons name="call" size={14} color="#F2CA50" />
                  <Text style={styles.helpButtonText}>HELP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.progressLineBg}>
              <View style={[styles.progressLineFill, { width: '65%' }]} />
            </View>

            <View style={styles.page7TitleSection}>
              <Text style={styles.page7Title}>Select the area you would like to deliver</Text>
              <Text style={styles.page7Subtitle}>
                Please select the category where you want to work under
              </Text>
            </View>

            <View style={styles.page7ZoneCardsContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedCategory('food_delivery')}
                style={[
                  styles.activeZoneCard,
                  selectedCategory === 'food_delivery' && styles.zoneCardHighlighted,
                ]}
              >
                <View style={styles.bestZoneBadge}>
                  <LinearGradient
                    colors={['#E0A900', '#FFDB6D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bestZoneBadgeGradient}
                  >
                    <Text style={styles.bestZoneBadgeText}>🎉 Limited offer join at ₹ 0</Text>
                  </LinearGradient>
                </View>

                <View style={[styles.zoneCardHeaderRow, { marginTop: 8 }]}>
                  <View style={styles.zoneCardLeftGroup}>
                    <View
                      style={[
                        styles.vehicleRadioOuter,
                        selectedCategory === 'food_delivery'
                          ? styles.radioOuterSelected
                          : styles.radioOuterUnselected,
                      ]}
                    >
                      {selectedCategory === 'food_delivery' && <View style={styles.radioInnerSelected} />}
                    </View>

                    <View style={styles.zoneTextCol}>
                      <Text style={styles.zoneNameTextActive}>Food Delivery</Text>
                      <Text style={styles.weeklyEarningsText}>
                        All orders in your selection and nearby areas
                      </Text>

                      <Text style={[styles.minimumGuaranteeText, { marginTop: 6 }]}>
                        ₹4,000 <Text style={styles.guaranteeSubLabel}>Minimum Guarantee</Text>
                      </Text>

                      <TouchableOpacity activeOpacity={0.7} style={styles.learnMoreRow}>
                        <Ionicons name="play-circle" size={16} color="#F2CA50" />
                        <Text style={styles.learnMoreText}>Learn More</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Image
                    source={require('../../assets/images/food_bowl.png')}
                    style={styles.foodBowlImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />

            <View style={styles.page5BottomContainer}>
              <TouchableOpacity
                onPress={handleCategorySelectConfirm}
                activeOpacity={0.85}
                disabled={!selectedCategory}
                style={[
                  styles.continueBtnWrapper,
                  !selectedCategory && styles.disabledContinueBtn,
                ]}
              >
                {selectedCategory ? (
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueBtnGradient}
                  >
                    <Text style={styles.continueBtnTextActive}>Continue</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.continueBtnGradient}>
                    <Text style={styles.continueBtnTextDisabled}>Continue</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 7 ? (
          /* STEP 7: SELECT WORK AREA / ZONE SCREEN (Figma Node 703:192) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page5TopBar}>
              <TouchableOpacity onPress={() => setStep(6)} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.topBarRightGroup}>
                <TouchableOpacity style={styles.helpButton} activeOpacity={0.8}>
                  <Ionicons name="call" size={14} color="#F2CA50" />
                  <Text style={styles.helpButtonText}>HELP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.progressLineBg}>
              <View style={styles.progressLineFill} />
            </View>

            <View style={styles.page7TitleSection}>
              <Text style={styles.page7Title}>Select the area you want to work in</Text>
              <Text style={styles.page7Subtitle}>
                Select area on the basis of earnings and distance from your location.
              </Text>
            </View>

            <View style={styles.page7ZoneCardsContainer}>
              {(() => {
                const fallbackZones = [
                  {
                    id: 'zone_city_centre',
                    name: 'City Centre',
                    minGuarantee: '₹4,000',
                    weeklyEarnings: 'Upto 6,000 weekly earnings',
                    distance: '3 km',
                    isBestZone: true,
                    isOpen: true,
                  },
                  {
                    id: 'zone_jainamore',
                    name: 'Jainamore',
                    minGuarantee: '₹4,000',
                    weeklyEarnings: 'Upto 8,000 weekly earnings',
                    distance: '16 km',
                    isBestZone: false,
                    isOpen: false,
                    noOpeningReason: 'No opening currently',
                  },
                ];

                const activeZones = zonesList.length > 0 ? zonesList : fallbackZones;

                return activeZones.map((zone) => {
                  const isSelected = selectedZone === zone.id;

                  if (zone.isOpen) {
                    return (
                      <TouchableOpacity
                        key={zone.id}
                        activeOpacity={0.85}
                        onPress={() => setSelectedZone(zone.id)}
                        style={[
                          styles.activeZoneCard,
                          isSelected && styles.zoneCardHighlighted,
                        ]}
                      >
                        {zone.isBestZone && (
                          <View style={styles.bestZoneBadge}>
                            <LinearGradient
                              colors={['#E0A900', '#FFDB6D']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.bestZoneBadgeGradient}
                            >
                              <Text style={styles.bestZoneBadgeText}>Best zone</Text>
                            </LinearGradient>
                          </View>
                        )}

                        <View style={styles.zoneCardHeaderRow}>
                          <View style={styles.zoneCardLeftGroup}>
                            <View
                              style={[
                                styles.vehicleRadioOuter,
                                isSelected ? styles.radioOuterSelected : styles.radioOuterUnselected,
                              ]}
                            >
                              {isSelected && <View style={styles.radioInnerSelected} />}
                            </View>
                            <View style={styles.zoneTextCol}>
                              <Text style={styles.zoneNameTextActive}>{zone.name}</Text>
                              <Text style={styles.minimumGuaranteeText}>
                                {zone.minGuarantee} <Text style={styles.guaranteeSubLabel}>Minimum Guarantee</Text>
                              </Text>
                              <Text style={styles.weeklyEarningsText}>{zone.weeklyEarnings}</Text>
                            </View>
                          </View>

                          <View style={styles.distanceBadgeRow}>
                            <Ionicons name="navigate-outline" size={14} color="#8D8D8D" />
                            <Text style={styles.distanceText}>{zone.distance}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  } else {
                    return (
                      <View key={zone.id} style={styles.lockedZoneCard}>
                        <Text style={styles.noOpeningWarningText}>{zone.noOpeningReason || 'No opening currently'}</Text>

                        <View style={styles.zoneCardHeaderRow}>
                          <View style={styles.zoneCardLeftGroup}>
                            <View style={styles.radioOuterUnselected} />
                            <View style={styles.zoneTextCol}>
                              <Text style={styles.zoneNameTextLocked}>{zone.name}</Text>
                              <Text style={styles.minimumGuaranteeText}>
                                {zone.minGuarantee} <Text style={styles.guaranteeSubLabel}>Minimum Guarantee</Text>
                              </Text>
                              <Text style={styles.weeklyEarningsTextDisabled}>{zone.weeklyEarnings}</Text>
                            </View>
                          </View>

                          <View style={styles.distanceBadgeRow}>
                            <Ionicons name="navigate-outline" size={14} color="#8D8D8D" />
                            <Text style={styles.distanceText}>{zone.distance}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  }
                });
              })()}

              <View style={styles.cantFindZoneCard}>
                <Text style={styles.cantFindText}>Can’t find your zone?</Text>
                <TouchableOpacity onPress={() => setStep(6)} activeOpacity={0.7}>
                  <Text style={styles.changeCityLinkText}>Change city?</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.page5BottomContainer}>
              <TouchableOpacity
                onPress={handleZoneSelectConfirm}
                activeOpacity={0.85}
                disabled={!selectedZone}
                style={[
                  styles.continueBtnWrapper,
                  !selectedZone && styles.disabledContinueBtn,
                ]}
              >
                {selectedZone ? (
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueBtnGradient}
                  >
                    <Text style={styles.continueBtnTextActive}>Continue</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.continueBtnGradient}>
                    <Text style={styles.continueBtnTextDisabled}>Continue</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 6 ? (
          /* STEP 6: SELECT CITY TO WORK SCREEN (Figma Node 642:336) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page6TopBar}>
              <TouchableOpacity onPress={() => setStep(5)} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.page6HeaderTitle}>Select a city to work</Text>
            </View>

            <View style={styles.searchBarWrapper}>
              <Ionicons name="search" size={20} color="#9D9D9D" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search a city"
                placeholderTextColor="#9D9D9D"
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
              />
            </View>

            <ScrollView style={styles.page6ScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.citySectionHeader}>Cities near you</Text>
              <View style={styles.nearbyCitiesRow}>
                {filteredNearbyCities.map((city) => {
                  const isSelected = selectedCity === city.name;
                  return (
                    <View key={city.name} style={styles.cityChipWrapper}>
                      {city.isCurrent && (
                        <View style={styles.currentCityBadge}>
                          <Text style={styles.currentCityBadgeText}>Current city</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setSelectedCity(city.name)}
                        style={[
                          styles.cityChipBtn,
                          isSelected ? styles.cityChipSelected : styles.cityChipUnselected,
                        ]}
                      >
                        <Text style={styles.cityChipText}>{city.name}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {filteredOtherCities.length > 0 && (
                <>
                  <Text style={styles.citySectionHeader}>Other cities</Text>
                  <View style={styles.otherCitiesListContainer}>
                    {filteredOtherCities.map((city, index) => {
                      const isSelected = selectedCity === city.name;
                      return (
                        <React.Fragment key={city.name}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setSelectedCity(city.name)}
                            style={styles.otherCityRow}
                          >
                            <Text style={styles.otherCityNameText}>{city.name}</Text>
                            <View
                              style={[
                                styles.cityRadioOuter,
                                isSelected ? styles.radioOuterSelected : styles.radioOuterUnselected,
                              ]}
                            >
                              {isSelected && <View style={styles.radioInnerSelected} />}
                            </View>
                          </TouchableOpacity>
                          {index < filteredOtherCities.length - 1 && (
                            <View style={styles.cityRowDivider} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.page6BottomContainer}>
              <TouchableOpacity
                onPress={handleCitySelectConfirm}
                activeOpacity={0.85}
                disabled={!selectedCity}
                style={[
                  styles.continueBtnWrapper,
                  !selectedCity && styles.disabledContinueBtn,
                ]}
              >
                {selectedCity ? (
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueBtnGradient}
                  >
                    <Text style={styles.continueBtnTextActive}>Select city</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.continueBtnGradient}>
                    <Text style={styles.continueBtnTextDisabled}>Select city</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 5 ? (
          /* STEP 5: SELECT VEHICLE TYPE SCREEN (Figma Node 637:188) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page5TopBar}>
              <TouchableOpacity onPress={() => setStep(4)} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.topBarRightGroup}>
                <TouchableOpacity style={styles.helpButton} activeOpacity={0.8}>
                  <Ionicons name="call" size={14} color="#F2CA50" />
                  <Text style={styles.helpButtonText}>HELP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.topDivider} />

            <View style={styles.page5TitleSection}>
              <Text style={styles.page5Title}>Select vehicle type</Text>
              <Text style={styles.page5Subtitle}>Your selection can only be changed after 30 days</Text>
            </View>

            <View style={styles.vehicleCardContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedVehicle('petrol')}
                style={styles.vehicleOptionRow}
              >
                <View style={styles.vehicleLeftGroup}>
                  <View
                    style={[
                      styles.vehicleRadioOuter,
                      selectedVehicle === 'petrol' ? styles.radioOuterSelected : styles.radioOuterUnselected,
                    ]}
                  >
                    {selectedVehicle === 'petrol' && <View style={styles.radioInnerSelected} />}
                  </View>
                  <Text style={styles.vehicleOptionTitle}>Petrol</Text>
                </View>
                <Image
                  source={require('../../assets/images/vehicle_petrol_bike.png')}
                  style={styles.vehicleGraphicImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.optionDottedDivider} />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedVehicle('electric')}
                style={styles.vehicleOptionRow}
              >
                <View style={styles.vehicleLeftGroup}>
                  <View
                    style={[
                      styles.vehicleRadioOuter,
                      selectedVehicle === 'electric' ? styles.radioOuterSelected : styles.radioOuterUnselected,
                    ]}
                  >
                    {selectedVehicle === 'electric' && <View style={styles.radioInnerSelected} />}
                  </View>
                  <Text style={styles.vehicleOptionTitle}>Electric</Text>
                </View>
                <Image
                  source={require('../../assets/images/vehicle_electric_scooty.png')}
                  style={styles.vehicleGraphicImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.optionDottedDivider} />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedVehicle('none')}
                style={styles.vehicleOptionRow}
              >
                <View style={styles.vehicleLeftGroup}>
                  <View
                    style={[
                      styles.vehicleRadioOuter,
                      selectedVehicle === 'none' ? styles.radioOuterSelected : styles.radioOuterUnselected,
                    ]}
                  >
                    {selectedVehicle === 'none' && <View style={styles.radioInnerSelected} />}
                  </View>
                  <View style={styles.noVehicleTextCol}>
                    <Text style={styles.vehicleOptionTitle}>I don't have a vehicle</Text>
                    <Text style={styles.noVehicleSubtext}>
                      My Quro will help you find the best vehicle rental deals
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.spacer} />

            <View style={styles.page5BottomContainer}>
              <TouchableOpacity
                onPress={handleVehicleContinue}
                activeOpacity={0.85}
                disabled={!selectedVehicle}
                style={[
                  styles.continueBtnWrapper,
                  !selectedVehicle && styles.disabledContinueBtn,
                ]}
              >
                {selectedVehicle ? (
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueBtnGradient}
                  >
                    <Text style={styles.continueBtnTextActive}>Continue</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.continueBtnGradient}>
                    <Text style={styles.continueBtnTextDisabled}>Continue</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.stepIndicatorRow}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                <View style={styles.stepDotActive} />
                <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
              </View>
            </View>
          </SafeAreaView>
        ) : step === 4 ? (
          /* STEP 4: DELIVERY ONBOARDING CHECKLIST SCREEN (Figma Node 591:366) */
          <SafeAreaView style={styles.fullFlex}>
            <View style={styles.page4TopBar}>
              <View style={styles.topBarRightGroup}>
                <TouchableOpacity style={styles.helpButton} activeOpacity={0.8}>
                  <Ionicons name="call" size={14} color="#F2CA50" />
                  <Text style={styles.helpButtonText}>HELP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.mascotContainer}>
              <Image
                source={require('../../assets/images/rider_mascot.png')}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.checklistHeadline}>
              Become a delivery partner in 3 easy steps!
            </Text>

            <View style={styles.checklistCardsContainer}>
              {/* STEP 1 CARD: Work Settings (ACTIVE) */}
              <View style={styles.activeStepCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.lockBadgeActive}>
                    <Ionicons name="lock-open" size={13} color="#F2CA50" />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.stepNumberLabelActive}>STEP 1</Text>
                    <Text style={styles.stepTitleTextActive}>Work Settings</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleWorkSettingsStart}
                  activeOpacity={0.85}
                  style={styles.startNowButton}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBtnContent}
                  >
                    <Text style={styles.startNowText}>Start now</Text>
                    <Ionicons name="arrow-forward" size={18} color="#3A2C00" />
                  </LinearGradient>
                </TouchableOpacity>

                <Image
                  source={require('../../assets/images/helmet_graphic.png')}
                  style={styles.helmetGraphic}
                  resizeMode="contain"
                />
              </View>

              {/* STEP 2 CARD: Profile (LOCKED) */}
              <View style={styles.lockedStepCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.lockBadgeLocked}>
                    <Ionicons name="lock-closed" size={13} color="#8D8D8D" />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.stepNumberLabelLocked}>STEP 2</Text>
                    <Text style={styles.stepTitleTextLocked}>Profile</Text>
                    <Text style={styles.stepSubtextLocked}>Uploads Aadhar and PAN details</Text>
                  </View>
                </View>
                <Image
                  source={require('../../assets/images/profile_icon.png')}
                  style={styles.profileIconGraphic}
                  resizeMode="contain"
                />
              </View>

              {/* STEP 3 CARD: Order Kit (LOCKED) */}
              <View style={styles.lockedStepCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.lockBadgeLocked}>
                    <Ionicons name="lock-closed" size={13} color="#8D8D8D" />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.stepNumberLabelLocked}>STEP 3</Text>
                    <Text style={styles.stepTitleTextLocked}>Order My Quro deliver Kit</Text>
                  </View>
                </View>
                <Image
                  source={require('../../assets/images/helmet_graphic.png')}
                  style={styles.kitBagGraphic}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.stepIndicatorRow}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
              <View style={styles.stepDotActive} />
              <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
              <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
            </View>
          </SafeAreaView>
        ) : step === 3 ? (
          /* STEP 3: PHONE NUMBER / GET STARTED SCREEN (Figma Node 424:273) */
          <KeyboardAvoidingView
            style={styles.fullFlex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.page3Container}>
                <View style={styles.page3HeroContainer}>
                  <Image
                    source={require('../../assets/images/rider_onboarding_get_started.png')}
                    style={styles.page3HeroImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.page3FormContainer}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.countryCodePrefix}>+91</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="Enter your 10 digit mobile number"
                      placeholderTextColor="#787878"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      editable={!isOtpSent && !isAuthLoading}
                    />
                  </View>

                  {isOtpSent && (
                    <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Enter 6-digit OTP code"
                        placeholderTextColor="#787878"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otpCode}
                        onChangeText={setOtpCode}
                        editable={!isAuthLoading}
                      />
                    </View>
                  )}

                  {authError && (
                    <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700', marginVertical: 8, textAlign: 'center' }}>
                      {authError}
                    </Text>
                  )}

                  <TouchableOpacity
                    onPress={isOtpSent ? handleVerify : handleGetStarted}
                    activeOpacity={0.85}
                    style={[styles.primaryButtonWrapper, { marginTop: 12 }]}
                    disabled={isAuthLoading}
                  >
                    <LinearGradient
                      colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.fullBtnGradient}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isAuthLoading ? 'Please wait...' : isOtpSent ? 'Verify OTP' : 'Get Started'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                <View style={styles.stepIndicatorRow}>
                  <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                  <View style={styles.stepDotActive} />
                  <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        ) : (
          <View style={styles.fullFlex}>
            <SafeAreaView style={styles.safeTop}>
              <View style={styles.headerContainer}>
                <Text style={styles.greetingText}>Hello Partner!</Text>
                <Text style={styles.welcomeText}>
                  Welcome to <Text style={styles.goldBrandText}>My Quro</Text>
                </Text>
              </View>
            </SafeAreaView>

            <View style={styles.heroSection}>
              <View style={styles.goldenGlow} />
              <Image
                source={require('../../assets/images/rider_onboarding.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>

            <LinearGradient
              colors={['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)']}
              style={styles.gradientOverlay}
              pointerEvents="none"
            />

            {/* STEP 1: LANGUAGE SELECTION SCREEN (Figma Node 424:198) */}
            {step === 1 && (
              <View style={styles.bottomCardStep1}>
                <Text style={styles.sectionTitle}>Select a language to continue</Text>

                <View style={styles.gridContainer}>
                  {LANGUAGES.map((lang) => {
                    const isSelected = selectedLang === lang.id;
                    return (
                      <TouchableOpacity
                        key={lang.id}
                        activeOpacity={0.8}
                        onPress={() => setSelectedLang(lang.id)}
                        style={[
                          styles.langCard,
                          isSelected ? styles.langCardSelected : styles.langCardUnselected,
                        ]}
                      >
                        <View style={styles.langTextCol}>
                          <Text style={styles.nativeText}>{lang.nativeName}</Text>
                          <Text style={styles.englishText}>{lang.englishName}</Text>
                        </View>

                        <View
                          style={[
                            styles.radioOuter,
                            isSelected ? styles.radioOuterSelected : styles.radioOuterUnselected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInnerSelected} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  onPress={handleLanguageConfirm}
                  activeOpacity={0.85}
                  style={styles.primaryButtonWrapper}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fullBtnGradient}
                  >
                    <Text style={styles.primaryButtonText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.stepIndicatorRow}>
                  <View style={styles.stepDotActive} />
                  <TouchableOpacity onPress={() => setStep(2)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                  <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
                </View>
              </View>
            )}

            {/* STEP 2: LOCATION PERMISSION SCREEN (Figma Node 424:184) */}
            {step === 2 && (
              <View style={styles.bottomCardStep2}>
                <View style={styles.cardContent}>
                  <Text style={styles.permissionTitle}>
                    Allow My Quro to access your location even when app is in background
                  </Text>

                  <Text style={styles.permissionBody}>
                    The My Quro Delivery App collects and transmits location data to assign orders even when the app is in the background.{'\n\n'}
                    To ensure that orders are assigned even when the app is in the background, please select & “ALLOW ALL THE TIME” in location permissions
                  </Text>

                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={handleLocationNext} activeOpacity={0.7} style={styles.actionBtn}>
                      <Text style={styles.actionText}>DENY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLocationNext} activeOpacity={0.7} style={styles.actionBtn}>
                      <Text style={styles.actionText}>ALLOW</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleLocationNext} activeOpacity={0.85} style={styles.primaryButtonWrapper}>
                    <LinearGradient
                      colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.fullBtnGradient}
                    >
                      <Text style={styles.primaryButtonText}>Okay</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.stepIndicatorRow}>
                    <TouchableOpacity onPress={() => setStep(1)} style={styles.stepDotInactive} />
                    <View style={styles.stepDotActive} />
                    <TouchableOpacity onPress={() => setStep(3)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(4)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(5)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(6)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(7)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(8)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(9)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(10)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(11)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(13)} style={styles.stepDotInactive} />
                    <TouchableOpacity onPress={() => setStep(14)} style={styles.stepDotInactive} />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  fullFlex: {
    flex: 1,
    justifyContent: 'space-between',
  },
  spacer: {
    flex: 1,
  },
  safeTop: {
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  greetingText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.22,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.22,
  },
  goldBrandText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    maxHeight: height * 0.32,
  },
  goldenGlow: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignSelf: 'center',
  },
  heroImage: {
    width: width * 0.85,
    height: height * 0.3,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomCardStep1: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomCardStep2: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.22,
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  langCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  langCardSelected: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  langCardUnselected: {
    borderColor: '#2A2A2A',
    backgroundColor: '#111111',
  },
  langTextCol: {
    justifyContent: 'center',
  },
  nativeText: {
    fontSize: 16,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  englishText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#787878',
    lineHeight: 18,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderWidth: 1.5,
    borderColor: '#D4AF37',
  },
  radioOuterUnselected: {
    borderWidth: 1.2,
    borderColor: '#475569',
  },
  radioInnerSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4AF37',
  },
  primaryButtonWrapper: {
    width: '100%',
    height: 60,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fullBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A1F00',
  },
  cardContent: {
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: -0.22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  permissionBody: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#787878',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 24,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 0.5,
  },
  // PAGE 3 SPECIFIC STYLES
  page3Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
    justifyContent: 'space-between',
  },
  page3HeroContainer: {
    width: '100%',
    height: height * 0.6,
    overflow: 'hidden',
  },
  page3HeroImage: {
    width: '100%',
    height: '100%',
  },
  page3FormContainer: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 20,
    backgroundColor: '#111111',
  },
  countryCodePrefix: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#D4AF37',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.22,
  },
  // PAGE 4 & PAGE 9 CHECKLIST STYLES
  page4TopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topBarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#F2CA50',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  helpButtonText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreButton: {
    padding: 4,
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  mascotImage: {
    width: 190,
    height: 190,
  },
  checklistHeadline: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  checklistCardsContainer: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 10,
  },
  activeStepCard: {
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#F2CA50',
    borderRadius: 18,
    padding: 16,
    position: 'relative',
    gap: 14,
  },
  completedStepCard: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8D8D8D',
    borderRadius: 18,
    padding: 16,
    position: 'relative',
  },
  completedCheckCircle: {
    marginTop: 2,
  },
  completedStatusText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2,
  },
  lockedStepCard: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8D8D8D',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  lockBadgeActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  lockBadgeLocked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(141, 141, 141, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardTextCol: {
    gap: 2,
  },
  stepNumberLabelActive: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#D0C5AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepTitleTextActive: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  stepSubtextActive: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '600',
    color: '#D0C5AF',
    marginTop: 2,
  },
  stepNumberLabelLocked: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#8D8D8D',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepTitleTextLocked: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  stepSubtextLocked: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '600',
    color: '#D0C5AF',
    marginTop: 2,
  },
  startNowButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 135,
    borderWidth: 1,
    borderColor: '#FFE082',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  gradientBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  startNowText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#2A1F00',
  },
  helmetGraphic: {
    position: 'absolute',
    right: 12,
    top: 16,
    width: 70,
    height: 70,
  },
  profileIconGraphic: {
    width: 44,
    height: 44,
    opacity: 0.6,
  },
  profileIconGraphicActive: {
    position: 'absolute',
    right: 16,
    top: 24,
    width: 50,
    height: 50,
    tintColor: '#F2CA50',
  },
  kitBagGraphic: {
    width: 48,
    height: 48,
    opacity: 0.6,
  },
  stepIndicatorRow: {
    display: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  stepDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4AF37',
  },
  stepDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },

  // PAGE 5 SPECIFIC STYLES
  page5TopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 4,
  },
  topDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginTop: 12,
    marginBottom: 24,
  },
  page5TitleSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 6,
  },
  page5Title: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
  },
  page5Subtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#787878',
  },
  vehicleCardContainer: {
    marginHorizontal: 24,
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#3B3B3B',
    borderRadius: 24,
    padding: 16,
  },
  vehicleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  vehicleLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  vehicleRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleOptionTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noVehicleTextCol: {
    flex: 1,
    gap: 2,
  },
  noVehicleSubtext: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#787878',
    lineHeight: 16,
  },
  vehicleGraphicImage: {
    width: 54,
    height: 54,
  },
  optionDottedDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 4,
  },
  page5BottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  continueBtnWrapper: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  disabledContinueBtn: {
    backgroundColor: '#5C5C64',
  },
  continueBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnTextActive: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#2A1F00',
  },
  continueBtnTextDisabled: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // PAGE 6 SPECIFIC STYLES
  page6TopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 16,
  },
  page6HeaderTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    height: 56,
    borderWidth: 1,
    borderColor: '#8D8D8D',
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#111111',
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#FFFFFF',
  },
  page6ScrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  citySectionHeader: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#787878',
    marginBottom: 14,
    marginTop: 6,
  },
  nearbyCitiesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  cityChipWrapper: {
    position: 'relative',
  },
  currentCityBadge: {
    position: 'absolute',
    top: -12,
    left: 4,
    zIndex: 10,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentCityBadgeText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#3A2C00',
  },
  cityChipBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#5C5C64',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityChipSelected: {
    backgroundColor: '#3B3B3B',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  cityChipUnselected: {
    backgroundColor: '#5C5C64',
  },
  cityChipText: {
    fontSize: 15,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  otherCitiesListContainer: {
    paddingBottom: 20,
  },
  otherCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  otherCityNameText: {
    fontSize: 15,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cityRadioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityRowDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  page6BottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },

  // PAGE 7 SPECIFIC STYLES
  progressLineBg: {
    height: 3,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 2,
  },
  progressLineFill: {
    width: '35%',
    height: '100%',
    backgroundColor: '#F2CA50',
    borderRadius: 2,
  },
  page7TitleSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 6,
  },
  page7Title: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
  },
  page7Subtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#787878',
    lineHeight: 18,
  },
  page7ZoneCardsContainer: {
    paddingHorizontal: 24,
    gap: 18,
  },
  activeZoneCard: {
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    borderColor: '#F2CA50',
    borderRadius: 18,
    padding: 16,
    position: 'relative',
  },
  zoneCardHighlighted: {
    backgroundColor: 'rgba(242, 202, 80, 0.06)',
  },
  bestZoneBadge: {
    position: 'absolute',
    top: -12,
    left: 14,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 10,
  },
  bestZoneBadgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  bestZoneBadgeText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#554300',
  },
  zoneCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  zoneCardLeftGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
  },
  zoneTextCol: {
    gap: 4,
    flex: 1,
  },
  zoneNameTextActive: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  minimumGuaranteeText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#16A34A',
  },
  guaranteeSubLabel: {
    fontSize: 13,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '500',
    color: '#16A34A',
  },
  weeklyEarningsText: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#787878',
    marginTop: 2,
  },
  distanceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#8D8D8D',
  },
  lockedZoneCard: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8D8D8D',
    borderRadius: 18,
    padding: 16,
  },
  noOpeningWarningText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FF0808',
    marginBottom: 8,
  },
  zoneNameTextLocked: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  weeklyEarningsTextDisabled: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: 'rgba(120, 120, 120, 0.5)',
    marginTop: 2,
  },
  cantFindZoneCard: {
    backgroundColor: '#1B1A18',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 4,
  },
  cantFindText: {
    fontSize: 16,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  changeCityLinkText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
  },

  // PAGE 8 SPECIFIC STYLES
  learnMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  learnMoreText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
  },
  foodBowlImage: {
    width: 80,
    height: 80,
    alignSelf: 'center',
  },

  // PAGE 10 SPECIFIC STYLES
  page10ScrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  badSelfieWarningTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FF0808',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  badSelfieGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 28,
  },
  badSelfieItemWrapper: {
    width: '30%',
    aspectRatio: 1,
  },
  badSelfieImageFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    position: 'relative',
  },
  badSelfieImage: {
    width: '100%',
    height: '100%',
  },
  redCancelBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0E0C0A',
    borderRadius: 10,
  },
  goodSelfieSectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  goodSelfieAvatarWrapper: {
    width: 170,
    height: 170,
    borderRadius: 85,
    overflow: 'visible',
    position: 'relative',
    borderWidth: 3,
    borderColor: '#16A34A',
  },
  goodSelfieImage: {
    width: '100%',
    height: '100%',
    borderRadius: 85,
  },
  greenCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0E0C0A',
    borderRadius: 16,
  },
  goodSelfieInstructionTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
    textAlign: 'center',
  },

  // PAGE 11 SPECIFIC STYLES
  page11CenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    gap: 20,
  },
  page11AvatarPreviewContainer: {
    width: 184,
    height: 184,
    borderRadius: 92,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#F2CA50',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  page11AvatarImage: {
    width: '100%',
    height: '100%',
  },
  retakeLinkTouch: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retakeLinkText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
  },
  infoLinkTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  infoLinkText: {
    fontSize: 14,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#787878',
  },

  // PAGE 12 SPECIFIC STYLES
  topRightGoldenGlow: {
    position: 'absolute',
    top: -50,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(234, 188, 40, 0.18)',
    transform: [{ scale: 1.4 }],
  },
  bottomLeftGoldenGlow: {
    position: 'absolute',
    bottom: -60,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(234, 188, 40, 0.18)',
    transform: [{ scale: 1.4 }],
  },
  page12ContentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },
  page12MascotCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    borderWidth: 2,
    borderColor: '#F2CA50',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  page12MascotImage: {
    width: 120,
    height: 120,
  },
  page12CheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    backgroundColor: '#0E0C0A',
    borderRadius: 18,
  },
  page12Title: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  page12Subtitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '500',
    color: '#EAE1D4',
    textAlign: 'center',
    lineHeight: 24,
  },

  // PAGE 13 SPECIFIC STYLES
  page13ScrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  tshirtCardFrame: {
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    height: 278,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    padding: 16,
  },
  tshirtShowcaseImage: {
    width: '100%',
    height: '100%',
  },
  tshirtSizeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  tshirtSizeLabelLeft: {
    fontSize: 16,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
  },
  tshirtSizeLabelRight: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  sizePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  sizePillTouch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizePillSelected: {
    backgroundColor: '#F2CA50',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sizePillUnselected: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3D3D3D',
  },
  sizePillText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  sizePillTextSelected: {
    color: '#2A2A2A',
  },
  sizePillTextUnselected: {
    color: '#EAE1D4',
  },

  // PAGE 14 & PAGE 15 SPECIFIC STYLES
  kitDeliveryHeroContainerAdjusted: {
    width: '100%',
    height: height * 0.38,
    maxHeight: 330,
    backgroundColor: '#0E0C0A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  kitDeliveryHeroImageAdjusted: {
    width: '100%',
    height: '100%',
  },
  kitDeliveryHeroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
  kitDeliveryAddressDetailsContainer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: 10,
  },
  kitDeliveryHeaderTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#EAE1D4',
  },
  kitDeliveryLineDivider: {
    height: 1,
    backgroundColor: '#3A3A3A',
    marginVertical: 4,
  },
  kitDeliveryAddressText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    lineHeight: 22,
  },
  page14BottomButtonsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 10,
  },
  changeAddressBtnTouch: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#5C5C64',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeAddressBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },

  // PAGE 15 SPECIFIC STYLES
  page15CardContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
  },
  successBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successBadgeTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#16A34A',
  },
  page15DeliveryEstText: {
    fontSize: 14,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
  },
  goldHighlightText: {
    color: '#F2CA50',
    fontWeight: '800',
  },
  kitSummaryBox: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3D3D3D',
    marginTop: 4,
    gap: 4,
  },
  kitSummaryTitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
    marginBottom: 2,
  },
  kitSummaryItem: {
    fontSize: 14,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
  },

  // PAGE 16 MAP SPECIFIC STYLES (Figma Node 815:202)
  page16TopGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 2,
  },
  page16BottomGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 2,
  },
  page16SafeAreaContainer: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  page16HeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },
  page16BackBtnTouch: {
    padding: 4,
  },
  page16SearchInputFrame: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    borderWidth: 1,
    borderColor: '#787878',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  page16SearchTextInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '500',
    color: '#FFFFFF',
  },
  searchDividerLine: {
    width: 1,
    height: 24,
    backgroundColor: '#787878',
    marginHorizontal: 12,
  },
  searchIconRight: {
    opacity: 0.9,
  },
  page16MapCenterCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tooltipBubbleContainer: {
    position: 'absolute',
    top: height * 0.2,
    alignSelf: 'center',
    backgroundColor: '#EAE1D4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
  tooltipText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#0E0C0A',
  },
  tooltipTailArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#EAE1D4',
  },
  goldPinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  goldPinImage: {
    width: 48,
    height: 58,
  },
  pinShadowEllipse: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    marginTop: -2,
  },
  landmarkItem1: {
    position: 'absolute',
    top: height * 0.1,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
  },
  landmarkItem2: {
    position: 'absolute',
    top: height * 0.26,
    right: 24,
    alignItems: 'center',
    gap: 4,
  },
  landmarkItem3: {
    position: 'absolute',
    bottom: height * 0.1,
    right: 28,
    alignItems: 'center',
    gap: 4,
  },
  landmarkDotOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F2CA50',
    backgroundColor: 'rgba(242, 202, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landmarkDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F2CA50',
  },
  landmarkTextLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  page16BottomAddressCardContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3D3D3D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  page16BannerPillGradient: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page16BannerPillText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#3A2C00',
  },
  page16CardContentInner: {
    padding: 16,
    gap: 10,
  },
  page16LocationTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
  },
  page16AddressSubtext: {
    fontSize: 14,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
    lineHeight: 20,
  },
  page16ContinueBtnTouch: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
  },
  page16ContinueBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page16ContinueBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },

  // ── PAGE 17: ADDRESS FOR T-SHIRT & BAG DELIVERY (NODE 860:165) ──────────────
  page17BottomCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#EAE1D4',
    borderRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    gap: 14,
  },
  page17AddressHeaderTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
    letterSpacing: -0.3,
  },
  page17LocationCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  page17LocationIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#787878',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  page17LocationIcon: {
    width: 28,
    height: 28,
  },
  page17AddressTextBlock: {
    flex: 1,
    gap: 4,
  },
  page17CurrentLocationLabel: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#E5E2E1',
    letterSpacing: -0.3,
  },
  page17AddressSubtext: {
    fontSize: 13,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
    lineHeight: 19,
  },
  page17UseCurrentBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  page17UseCurrentBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page17UseCurrentBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#0E0C0A',
    letterSpacing: 0.1,
  },
  page17OrDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  page17DashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  page17OrText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page17DifferentLocationBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(242, 202, 80, 0.51)',
    borderWidth: 1.5,
    borderColor: '#E0A900',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page17DifferentLocationBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#0E0C0A',
    letterSpacing: 0.1,
  },

  // ── PAGE 18: ENTER DELIVERY ADDRESS FORM (NODE 919:161) ──────────────────────
  page18Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  page18HeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  page18BackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page18MoreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page18Title: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
    paddingHorizontal: 24,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  page18ScrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  page18WarningBanner: {
    backgroundColor: '#1C1B1B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77, 70, 53, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  page18BulbIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  page18WarningText: {
    fontSize: 13,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#F2CA50',
    flex: 1,
    lineHeight: 19,
  },
  page18FloatLabelWrapper: {
    position: 'relative',
    marginTop: 8,
  },
  page18HouseNumberField: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    borderRadius: 12,
    height: 55,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  page18HouseNumberInput: {
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#E5E2E1',
    height: 55,
    padding: 0,
  },
  page18FloatLabelBg: {
    position: 'absolute',
    top: -9,
    left: 14,
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  page18FloatLabelText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#F2CA50',
  },
  page18StreetRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  page18StreetField: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8D8D8D',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    minHeight: 76,
  },
  page18FieldText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#EAE1D4',
    lineHeight: 22,
    textTransform: 'capitalize',
  },
  page18ChangeBtn: {
    width: 77,
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#8D8D8D',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    flexShrink: 0,
  },
  page18ChangeBtnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 12, 10, 0.55)',
  },
  page18ChangePinIcon: {
    width: 22,
    height: 28,
    zIndex: 1,
  },
  page18ChangeBtnLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    zIndex: 1,
    marginTop: 4,
  },
  page18StandardField: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8D8D8D',
    borderRadius: 18,
    height: 56,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  page18FieldInput: {
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#EAE1D4',
    height: 56,
    padding: 0,
  },
  page18BottomBtnContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: 36,
    paddingTop: 12,
    backgroundColor: '#0E0C0A',
  },
  page18SubmitBtnTouch: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  page18SubmitBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page18SubmitBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.1,
  },

  // ── PAGE 19: PAY JOINING FEE (NODE 919:232) ──────────────────────────────────
  page19Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  page19HeroBanner: {
    height: 196,
    width: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  page19BackBtn: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  page19EarningsTextBlock: {
    alignItems: 'center',
    zIndex: 1,
  },
  page19EarningsLabel: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#D0C5AF',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  page19EarningsAmount: {
    fontSize: 48,
    fontFamily: 'Urbanist-Black',
    fontWeight: '900',
    color: '#F2CA50',
    letterSpacing: -1,
    lineHeight: 56,
  },
  page19MinGuaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  page19MinGuaranteeDiamond: {
    fontSize: 11,
    color: '#F2CA50',
    fontWeight: '700',
  },
  page19MinGuaranteeText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  page19SectionTab: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
    textAlign: 'center',
    textTransform: 'capitalize',
    marginVertical: 10,
    letterSpacing: 0.3,
  },
  page19ScrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 24,
  },
  page19PayCard: {
    borderRadius: 18,
    padding: 20,
    gap: 14,
    backgroundColor: '#2A2A2A',
  },
  page19PayCardSelected: {
    borderWidth: 2,
    borderColor: '#F2CA50',
  },
  page19PayCardUnselected: {
    borderWidth: 1,
    borderColor: '#787878',
  },
  page19CardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  page19CardTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
    letterSpacing: -0.2,
  },
  page19RadioIcon: {
    width: 20,
    height: 20,
  },
  page19AmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  page19AmountBadge: {
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page19AmountText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
  },
  page19VertDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#8D8D8D',
  },
  page19InstalmentDesc: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#D0C5AF',
    lineHeight: 17,
  },
  page19AudioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#787878',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
    height: 51,
  },
  page19PlayIcon: {
    width: 20,
    height: 20,
    flexShrink: 0,
  },
  page19AudioTime: {
    fontSize: 14,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
    width: 40,
  },
  page19ProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#4A4A4A',
    borderRadius: 2,
    justifyContent: 'center',
  },
  page19ProgressFill: {
    position: 'absolute',
    left: 0,
    width: '20%',
    height: '100%',
    backgroundColor: '#F2CA50',
    borderRadius: 2,
  },
  page19ProgressThumb: {
    position: 'absolute',
    left: '20%',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F2CA50',
    marginLeft: -5,
    marginTop: -3,
  },
  page19TranslateBtn: {
    width: 39,
    height: 35,
    backgroundColor: '#F2CA50',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  page19TranslateIcon: {
    width: 22,
    height: 22,
  },
  page19PayNowBtnTouch: {
    height: 49,
    borderRadius: 16,
    overflow: 'hidden',
  },
  page19PayNowBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page19PayNowBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.1,
  },
  page19FullPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  page19FullPrice: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#EAE1D4',
  },
  page19StrikethroughPrice: {
    fontSize: 14,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: 'rgba(120,120,120,0.65)',
    textDecorationLine: 'line-through',
  },
  page19SaveBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  page19SaveBadgeText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  page19NoExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  page19SunglassEmoji: {
    width: 18,
    height: 18,
  },
  page19NoExtraText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    textTransform: 'capitalize',
  },

  // ── PAGE 20: TERMS & CONDITIONS BOTTOM SHEET MODAL (NODE 963:199) ─────────────
  page20Scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  page20BottomSheet: {
    backgroundColor: '#EAE1D4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 28,
    paddingBottom: 36,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  page20DragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(42, 42, 42, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  page20CheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  page20CheckboxIcon: {
    width: 22,
    height: 22,
    marginTop: 1,
    flexShrink: 0,
  },
  page20TermsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#2A2A2A',
    lineHeight: 20,
  },
  page20TermsLink: {
    color: '#E0A900',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  page20AgreeBtn: {
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
  },
  page20AgreeBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page20AgreeBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  page20HomeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: 'rgba(42, 42, 42, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 4,
  },

  // STEP 22 STYLES (Figma Node 919:476)
  page22Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  page22ScrollContent: {
    paddingBottom: 40,
  },
  page22HeroBanner: {
    width: '100%',
    height: 320,
    position: 'relative',
    backgroundColor: '#0E0C0A',
  },
  page22HeroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  page22TopControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    zIndex: 10,
  },
  page22BackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page22RightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  page22HelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
  },
  page22HelpText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  page22MoreBtn: {
    padding: 4,
  },
  page22HeroTextBlock: {
    position: 'absolute',
    bottom: 25,
    left: 25,
    right: 25,
  },
  page22WelcomeText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: 'rgba(234, 225, 212, 0.63)',
    marginBottom: 4,
  },
  page22HeadlineText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    lineHeight: 28,
  },
  page22ChecklistSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  page22TaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  page22RadioIconWrapper: {
    marginRight: 14,
  },
  page22RadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#787878',
  },
  page22TaskTextContainer: {
    flex: 1,
  },
  page22TaskTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#EAE1D4',
    marginBottom: 2,
  },
  page22TaskStatusPending: {
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#E0A900',
  },
  page22TaskStatusVerified: {
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#E0A900',
  },
  page22UploadBtnTouch: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  page22UploadBtnGradient: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  page22UploadBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#554300',
  },
  page22DashedDivider: {
    borderBottomWidth: 1,
    borderColor: '#333333',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  page22ThickDivider: {
    height: 12,
    backgroundColor: '#1E1B18',
    marginVertical: 24,
  },
  page22BankCardContainer: {
    paddingHorizontal: 24,
  },
  page22BankCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  page22BankTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  page22BankCardTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 4,
  },
  page22BankCardSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  page22BankPassbookImage: {
    width: 85,
    height: 53,
  },

  // STEP 23 STYLES (Figma Node 963:317)
  page23Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  page23Content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  page23BackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  page23HeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  page23HeaderTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  page23AadhaarCardBadge: {
    width: 73,
    height: 61,
    backgroundColor: '#787878',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  page23AadhaarCardImage: {
    width: 69,
    height: 39,
  },
  page23RefundCard: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8D8D8D',
    borderRadius: 22,
    padding: 18,
  },
  page23CardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  page23CardLabel: {
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A0A0A0',
    textTransform: 'capitalize',
  },
  page23StatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  page23StatusBadgeText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  page23PhotosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  page23PhotoThumbnail: {
    width: 62,
    height: 62,
    borderRadius: 10,
    backgroundColor: '#3A3A3A',
  },

  // STEP 24 STYLES (Figma Node 987:128)
  page24Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  page24ScrollContent: {
    paddingBottom: 40,
  },
  page24HeroBanner: {
    width: '100%',
    height: 323,
    backgroundColor: '#16A34A',
    position: 'relative',
    justifyContent: 'space-between',
    paddingBottom: 25,
  },
  page24TopControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    zIndex: 10,
  },
  page24BackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page24RightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  page24HelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
  },
  page24HelpText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  page24MoreBtn: {
    padding: 4,
  },
  page24HeroTextBlock: {
    paddingHorizontal: 27,
  },
  page24WelcomeText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#6CE99A',
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  page24HeadlineText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    lineHeight: 28,
    textTransform: 'capitalize',
  },
  page24ChecklistSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  page24TaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  page24CheckedIcon: {
    width: 18,
    height: 18,
    marginRight: 14,
  },
  page24TaskTextContainer: {
    flex: 1,
  },
  page24TaskTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#EAE1D4',
  },
  page24DashedDivider: {
    borderBottomWidth: 1,
    borderColor: '#333333',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  page24ThickDivider: {
    height: 12,
    backgroundColor: '#1E1B18',
    marginVertical: 24,
  },
  page24BankCardContainer: {
    paddingHorizontal: 24,
  },
  page24BankCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  page24BankTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  page24BankCardTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 4,
  },
  page24BankCardSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  page24BankPassbookImage: {
    width: 85,
    height: 53,
  },

  // STEP 25 STYLES (Figma Node 987:221)
  page25Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  page25TopBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    zIndex: 20,
  },
  page25TopControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  page25VoiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page25LangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8D8D8D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  page25LangText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page25MapWrapper: {
    flex: 1,
    position: 'relative',
  },
  page25MapImage: {
    width: '100%',
    height: '100%',
  },
  page25TopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  page25BottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  page25BottomCard: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  page25ZoneInfoBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  page25ZoneSubtitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: 'rgba(234, 225, 212, 0.74)',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  page25ZoneTitle: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  page25ButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  page25BackBtn: {
    width: 54,
    height: 49,
    borderRadius: 12,
    backgroundColor: 'rgba(224, 169, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page25NextBtnTouch: {
    flex: 1,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#D4AF37',
    overflow: 'hidden',
  },
  page25NextBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  page25NextBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },

  // STEP 26 STYLES (Figma Node 996:413)
  page26Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
    justifyContent: 'space-between',
  },
  page26TopBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    zIndex: 20,
  },
  page26TopControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  page26VoiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page26LangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8D8D8D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  page26LangText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page26ContentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  page26ShowcaseCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#2A2A2A',
    borderRadius: 40,
    paddingVertical: 28,
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  page26TimeText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#D0C5AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 24,
  },
  page26ToggleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAE1D4',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 10,
  },
  page26OnlineLabel: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page26ToggleIcon: {
    width: 47,
    height: 30,
  },
  page26HeadlineText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    textAlign: 'center',
    lineHeight: 32,
    maxWidth: 300,
  },
  page26BottomCard: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  page26ButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  page26BackBtn: {
    width: 54,
    height: 49,
    borderRadius: 12,
    backgroundColor: 'rgba(224, 169, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page26NextBtnTouch: {
    flex: 1,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#D4AF37',
    overflow: 'hidden',
  },
  page26NextBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  page26NextBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },

  // STEP 27 STYLES (Figma Node 996:469)
  page27Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
    justifyContent: 'space-between',
  },
  page27TopBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    zIndex: 20,
  },
  page27TopControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  page27VoiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page27LangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8D8D8D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  page27LangText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page27ContentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  page27OrderCard: {
    width: '100%',
    maxWidth: 270,
    backgroundColor: '#2A2A2A',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  page27EarningLabel: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#8E8E8E',
    marginBottom: 12,
  },
  page27RupeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  page27RupeeIcon: {
    width: 47,
    height: 47,
  },
  page27SkeletonBar1: {
    width: 177,
    height: 10,
    backgroundColor: 'rgba(217, 217, 217, 0.57)',
    borderRadius: 20,
    marginBottom: 10,
  },
  page27SkeletonBar2: {
    width: 105,
    height: 10,
    backgroundColor: 'rgba(217, 217, 217, 0.57)',
    borderRadius: 20,
    marginBottom: 24,
  },
  page27AcceptBtnTouch: {
    width: '100%',
    height: 47,
    backgroundColor: '#D4AF37',
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  page27AcceptBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page27HeadlineText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    textAlign: 'center',
    lineHeight: 32,
    maxWidth: 300,
    textTransform: 'capitalize',
  },
  page27BottomCard: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  page27ButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  page27BackBtn: {
    width: 54,
    height: 49,
    borderRadius: 12,
    backgroundColor: 'rgba(224, 169, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page27NextBtnTouch: {
    flex: 1,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#D4AF37',
    overflow: 'hidden',
  },
  page27NextBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  page27NextBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },

  // STEP 28 STYLES (Figma Node 1024:123)
  page28Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
    justifyContent: 'space-between',
  },
  page28TopBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    zIndex: 20,
  },
  page28TopControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  page28VoiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page28LangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8D8D8D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  page28LangText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page28ContentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  page28MascotImage: {
    width: width * 0.82,
    maxWidth: 340,
    height: height * 0.42,
    maxHeight: 380,
    marginBottom: 28,
  },
  page28HeadlineText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    textAlign: 'center',
    lineHeight: 32,
    maxWidth: 320,
    textTransform: 'capitalize',
  },
  page28BottomCard: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  page28ButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  page28BackBtn: {
    width: 54,
    height: 49,
    borderRadius: 12,
    backgroundColor: 'rgba(224, 169, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page28NextBtnTouch: {
    flex: 1,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#D4AF37',
    overflow: 'hidden',
  },
  page28NextBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  page28NextBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },

  // STEP 29 STYLES (Figma Node 1244:76)
  page29Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
    justifyContent: 'space-between',
  },
  page29TopBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    zIndex: 20,
  },
  page29TopControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  page29VoiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page29LangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8D8D8D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  page29LangText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page29ContentArea: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  page29HeaderBlock: {
    alignItems: 'center',
    marginTop: 10,
  },
  page29Subtitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#F2CA50',
    marginBottom: 6,
  },
  page29Title: {
    fontSize: 32,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  page29MascotSection: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  page29SpeechBubble: {
    backgroundColor: '#E6DEC9',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: -6,
    zIndex: 10,
    alignItems: 'center',
    maxWidth: 220,
  },
  page29SpeechText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#0E0C0A',
    textAlign: 'center',
  },
  page29SpeechTail: {
    position: 'absolute',
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E6DEC9',
  },
  page29MascotImage: {
    width: 210,
    height: 330,
  },
  page29BottomCard: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  page29StartBtnTouch: {
    width: '100%',
    height: 49,
    borderRadius: 16,
    backgroundColor: '#D4AF37',
    overflow: 'hidden',
  },
  page29StartBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  page29StartBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },

  // STEP 30 STYLES (Figma Node 3041:78)
  page30Container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
    justifyContent: 'space-between',
  },
  page30TopBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#0E0C0A',
    zIndex: 20,
  },
  page30TopControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  page30VoiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page30LangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8D8D8D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  page30LangText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A2A2A',
  },
  page30ContentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  page30KitImage: {
    width: 326,
    height: 244,
    marginBottom: 36,
  },
  page30HeadlineText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    textAlign: 'center',
    lineHeight: 32,
    maxWidth: 300,
    textTransform: 'capitalize',
  },
  page30BottomCard: {
    backgroundColor: '#0E0C0A',
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  page30ButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  page30BackBtn: {
    width: 54,
    height: 49,
    borderRadius: 12,
    backgroundColor: 'rgba(224, 169, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page30StartBtnTouch: {
    flex: 1,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#D4AF37',
    overflow: 'hidden',
  },
  page30StartBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  page30StartBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
});