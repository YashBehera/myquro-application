import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path, Line, Rect, Polyline, Polygon } from 'react-native-svg';
import {
  X,
  MapPin,
  ArrowLeft,
  Edit2,
  Trash2,
  Share2,
  MoreVertical,
} from 'lucide-react-native';
import { OlaMapView, OlaMapViewRef } from '../components/OlaMapView';
import { useViewModel, SavedAddress } from '../state/MainViewModel';
import {
  fetchPlaceSuggestions,
  getCoordsFromPlaceId,
  reverseGeocode,
  detectCurrentLocationWithOla,
} from '../services/LocationService';

import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

// ─── Crisp Vector SVG Icons matching Figma Node 3029:1843 ───────────────────────
const GoldGpsIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Circle cx="12" cy="12" r="3" />
    <Line x1="12" y1="2" x2="12" y2="6" />
    <Line x1="12" y1="18" x2="12" y2="22" />
    <Line x1="2" y1="12" x2="6" y2="12" />
    <Line x1="18" y1="12" x2="22" y2="12" />
  </Svg>
);

const GoldPlusIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
    <Line x1="12" y1="8" x2="12" y2="16" />
    <Line x1="8" y1="12" x2="16" y2="12" />
  </Svg>
);

const GoldShareIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Svg>
);

const GoldHomeIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Svg>
);

const GoldGymIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Polygon points="3 11 22 2 13 21 11 13 3 11" />
  </Svg>
);

const GoldWorkIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </Svg>
);

const GoldPinIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const GoldSearchLens = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="11" cy="11" r="8" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);

const GoldBackArrow = ({ size = 22 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

const VerticalThreeDots = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#707070">
    <Circle cx="12" cy="5" r="1.8" />
    <Circle cx="12" cy="12" r="1.8" />
    <Circle cx="12" cy="19" r="1.8" />
  </Svg>
);

const GoldChevronDown = ({ size = 12 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#BA9237" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="6 9 12 15 18 9" />
  </Svg>
);

interface LocationSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (location: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
}

export const LocationSelectorSheet: React.FC<LocationSelectorSheetProps> = ({
  visible,
  onClose,
  onLocationSelected,
}) => {
  const {
    currentLocation,
    savedAddresses,
    addSavedAddress,
    deleteSavedAddress,
    updateSavedAddress,
  } = useViewModel();

  const insets = useSafeAreaInsets();
  const topSafeInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 28));
  const bottomSafeInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8);

  // Search and general navigation states
  const [addressStep, setAddressStep] = useState<'search' | 'map' | 'form'>('search');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [viewAllAddresses, setViewAllAddresses] = useState(false);
  const [isQuickLocationMode, setIsQuickLocationMode] = useState(false);

  // Map selector states
  const [mapRegion, setMapRegion] = useState({
    latitude: currentLocation?.latitude || 20.2961,
    longitude: currentLocation?.longitude || 85.8245,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [selectedLocationInfo, setSelectedLocationInfo] = useState<{ label: string; address: string }>({
    label: currentLocation?.label || 'Select location',
    address: currentLocation?.address || '',
  });
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const [isMapSearching, setIsMapSearching] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{
    item: any;
    top: number;
    right: number;
  } | null>(null);

  const openAddressMenu = (item: any, e: any) => {
    const pageY = e?.nativeEvent?.pageY;
    const pageX = e?.nativeEvent?.pageX;
    if (pageY !== undefined && pageX !== undefined) {
      setMenuAnchor({
        item,
        top: Math.min(pageY + 12, Dimensions.get('window').height - 150),
        right: Math.max(16, SCREEN_WIDTH - pageX - 10),
      });
    } else {
      setMenuAnchor({
        item,
        top: 250,
        right: 20,
      });
    }
  };

  // Form details states
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [houseNo, setHouseNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isOrderingForMyself, setIsOrderingForMyself] = useState(true);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  // Native GPS Tracking states
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const geocodeTimeoutRef = useRef<any>(null);
  const olaMapRef = useRef<OlaMapViewRef>(null);

  // User's saved addresses
  const effectiveAddresses = savedAddresses || [];

  // Load recent searches and reset steps on open
  useEffect(() => {
    if (visible) {
      setAddressStep('search');
      setQuery('');
      setSuggestions([]);
      loadRecentSearches();
      hasCenteredOnUserRef.current = false;
    }
  }, [visible]);

  // Debounced place suggestions logic for search
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await fetchPlaceSuggestions(query);
        setSuggestions(results);
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Debounced search for Map view
  useEffect(() => {
    if (mapSearchQuery.trim().length < 2) {
      setMapSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsMapSearching(true);
      try {
        const results = await fetchPlaceSuggestions(mapSearchQuery);
        setMapSuggestions(results);
      } catch (err) {
        console.error("Map Suggestions fetch error:", err);
      } finally {
        setIsMapSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [mapSearchQuery]);

  const loadRecentSearches = async () => {
    try {
      const data = await AsyncStorage.getItem('@recent_searches');
      if (data) {
        setRecentSearches(JSON.parse(data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveRecentSearch = async (item: any) => {
    try {
      const existing = recentSearches.filter((s) => s.placeId !== item.placeId);
      const updated = [item, ...existing].slice(0, 5);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Distance calculation helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    if (d < 1) {
      return `${Math.round(d * 1000)} m`;
    }
    return `${d.toFixed(1)} km`;
  };

  // Hardware current location search via Ola Maps with Interactive Map Step
  const handleGPSDetect = async () => {
    setIsQuickLocationMode(true);
    setAddressStep('map');
    setIsResolvingAddress(true);

    try {
      const locationResult = await detectCurrentLocationWithOla();
      setMapRegion({
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setUserLocation({
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
      });
      setSelectedLocationInfo({
        label: locationResult.label,
        address: locationResult.address,
      });
      setArea(locationResult.label);
      setCity(locationResult.address.split(',')[1]?.trim() || '');
      olaMapRef.current?.recenter(locationResult.latitude, locationResult.longitude, 16.5);
      olaMapRef.current?.setUserLocation(locationResult.latitude, locationResult.longitude);
    } catch (err) {
      console.error("Ola Maps GPS detect error:", err);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const detectCurrentLocationForMap = async () => {
    setIsResolvingAddress(true);
    try {
      const locationResult = await detectCurrentLocationWithOla();
      setMapRegion({
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setUserLocation({
        latitude: locationResult.latitude,
        longitude: locationResult.longitude,
      });
      setSelectedLocationInfo({
        label: locationResult.label,
        address: locationResult.address,
      });
      setArea(locationResult.label);
      setCity(locationResult.address.split(',')[1]?.trim() || '');
      olaMapRef.current?.recenter(locationResult.latitude, locationResult.longitude, 16.5);
      olaMapRef.current?.setUserLocation(locationResult.latitude, locationResult.longitude);
    } catch (err) {
      console.error("Ola Maps map detect error:", err);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const handleMapRegionChange = (coords: { latitude: number; longitude: number }) => {
    setMapRegion((prev) => ({
      ...prev,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }));
    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    setIsResolvingAddress(true);
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const info = await reverseGeocode(coords.latitude, coords.longitude);
        if (info) {
          setSelectedLocationInfo(info);
          setArea(info.label);
          setCity(info.address.split(',').slice(-3, -2)[0]?.trim() || info.address.split(',')[1]?.trim() || '');
        }
      } catch (err) {
        console.error("Ola reverse geocode error on map drag:", err);
      } finally {
        setIsResolvingAddress(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = async (item: any, navigateToMap: boolean = false) => {
    setSearching(true);
    setIsMapSearching(false);
    try {
      let lat = item.lat;
      let lng = item.lng;
      if (!lat || !lng) {
        const coords = await getCoordsFromPlaceId(item.placeId);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      if (lat && lng) {
        saveRecentSearch(item);
        const resolvedLabel = item.mainText || item.description?.split(',')[0] || 'Selected Location';
        const resolvedAddress = item.description || item.mainText;

        setMapRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        setSelectedLocationInfo({
          label: resolvedLabel,
          address: resolvedAddress,
        });
        setArea(resolvedLabel);
        setCity(resolvedAddress.split(',').slice(-3, -2)[0]?.trim() || resolvedAddress.split(',')[1]?.trim() || '');

        olaMapRef.current?.recenter(lat, lng, 16.5);

        if (navigateToMap) {
          setMapSearchQuery('');
          setMapSuggestions([]);
        } else {
          // In main search, jump to interactive map for user to confirm or adjust pin
          setAddressStep('map');
          setQuery('');
          setSuggestions([]);
        }
      }
    } catch (err) {
      console.error("Error selecting suggestion:", err);
    } finally {
      setSearching(false);
      setIsMapSearching(false);
    }
  };

  const handleStartEditAddress = (item: any) => {
    setEditingAddressId(item.id);
    setAddressType(item.type === 'Home' || item.type === 'Work' ? item.type : 'Other');
    setHouseNo(item.houseNo || '');
    setLandmark(item.landmark || '');
    setArea(item.area || '');
    setCity(item.city || '');
    setDeliveryInstructions(item.deliveryInstructions || '');
    setIsOrderingForMyself(!item.receiverName && !item.receiverPhone);
    setReceiverName(item.receiverName || '');
    setReceiverPhone(item.receiverPhone || '');
    setAddressStep('form');
  };

  const handleSaveAddress = async () => {
    if (!houseNo.trim()) {
      Alert.alert('Required Field', 'Please enter a Flat / House No / Building name.');
      return;
    }
    if (!area.trim()) {
      Alert.alert('Required Field', 'Please specify an Area / Locality.');
      return;
    }
    if (!isOrderingForMyself) {
      if (!receiverName.trim()) {
        Alert.alert('Required Field', "Please enter the receiver's name.");
        return;
      }
      if (!receiverPhone.trim() || receiverPhone.trim().replace(/\D/g, '').length < 10) {
        Alert.alert('Invalid Phone', "Please enter a valid 10-digit phone number for the receiver.");
        return;
      }
    }

    const finalFullAddressText = `${houseNo.trim()}, ${landmark.trim() ? landmark.trim() + ', ' : ''}${area.trim()}${city.trim() ? ', ' + city.trim() : ''}`;

    const newAddr: SavedAddress = {
      id: editingAddressId || Date.now().toString(),
      type: addressType,
      houseNo: houseNo.trim(),
      landmark: landmark.trim(),
      area: area.trim(),
      city: city.trim() || area.trim() || '',
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
      address: finalFullAddressText,
      receiverName: !isOrderingForMyself ? receiverName.trim() : undefined,
      receiverPhone: !isOrderingForMyself ? receiverPhone.trim() : undefined,
    };

    if (editingAddressId) {
      updateSavedAddress(newAddr);
    } else {
      addSavedAddress(newAddr);
    }

    onLocationSelected({
      label: newAddr.type,
      address: finalFullAddressText,
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
    });

    onClose();
  };

  const handleShareAddressRequest = async () => {
    try {
      await Share.share({
        message: 'Hey! Please share your delivery address with me on MyQuro: https://myquro.com/address-request',
        title: 'Request Delivery Address',
      });
    } catch (error: any) {
      Alert.alert('Share', error.message);
    }
  };

  const visibleAddresses = viewAllAddresses ? effectiveAddresses : effectiveAddresses.slice(0, 3);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.figmaLocRoot, { paddingTop: topSafeInset, paddingBottom: bottomSafeInset }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={true} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
            {/* ══════════════════════════════════════════════════════════════════════
                STEP 1: FIGMA SEARCH & SAVED ADDRESSES VIEW (NODE 3029:1843)
                ══════════════════════════════════════════════════════════════════════ */}
            {addressStep === 'search' && (
              <View style={{ flex: 1 }}>
                {/* [1] TOP HEADER ROW */}
                <View style={styles.figmaLocHeaderRow}>
                  <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    style={styles.figmaLocBackBtn}
                  >
                    <GoldBackArrow size={22} />
                  </TouchableOpacity>

                  <View style={styles.figmaLocTitleRow}>
                    <Text style={styles.figmaLocTitleWhite}>Select your </Text>
                    <Text style={styles.figmaLocTitleGold}>location</Text>
                  </View>
                </View>

                {/* [2] SEARCH INPUT BOX */}
                <View style={styles.figmaLocSearchBar}>
                  <GoldPinIcon size={18} />
                  <TextInput
                    style={styles.figmaLocSearchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search an area or address"
                    placeholderTextColor="#6A6A6A"
                    returnKeyType="search"
                  />
                  {query.length > 0 ? (
                    <TouchableOpacity onPress={() => setQuery('')} style={{ padding: 4 }}>
                      <X size={18} color="#DDDDDC" />
                    </TouchableOpacity>
                  ) : (
                    <GoldSearchLens size={18} />
                  )}
                </View>

                {/* [3] AUTOCOMPLETE DROPDOWN RESULTS OR DEFAULT CONTENT */}
                {query.trim().length >= 2 ? (
                  <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    {searching ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#C49530" />
                      </View>
                    ) : (
                      <FlatList
                        data={suggestions}
                        keyExtractor={(item) => item.placeId}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            activeOpacity={0.7}
                            onPress={() => handleSelectSuggestion(item)}
                          >
                            <View style={styles.suggestionIconBg}>
                              <MapPin size={16} color="#C49530" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.suggestionMainText} numberOfLines={1}>
                                {item.mainText}
                              </Text>
                              <Text style={styles.suggestionSubText} numberOfLines={2}>
                                {item.description}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No matching locations found.</Text>
                          </View>
                        }
                      />
                    )}
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.figmaLocScrollContent}
                  >
                    {/* [4] 3 BIG QUICK ACTION CARDS */}
                    <View style={styles.figmaLocQuickActionsRow}>
                      {/* Card 1: Use Current Location */}
                      <TouchableOpacity
                        style={styles.figmaLocQuickCard}
                        activeOpacity={0.8}
                        onPress={handleGPSDetect}
                      >
                        <View style={styles.quickCircleBadge}>
                          <GoldGpsIcon size={22} />
                        </View>
                        <View style={styles.figmaLocQuickTextGroup}>
                          <Text style={styles.figmaLocQuickTitle}>Use Current{'\n'}Location</Text>
                          <Text style={styles.figmaLocQuickSubtitle}>Detect your location</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Card 2: Add New Address */}
                      <TouchableOpacity
                        style={styles.figmaLocQuickCard}
                        activeOpacity={0.8}
                        onPress={() => {
                          setIsQuickLocationMode(false);
                          setHouseNo('');
                          setLandmark('');
                          setDeliveryInstructions('');
                          setEditingAddressId(null);
                          setIsOrderingForMyself(true);
                          setReceiverName('');
                          setReceiverPhone('');
                          setAddressStep('map');
                          detectCurrentLocationForMap();
                        }}
                      >
                        <View style={styles.quickCircleBadge}>
                          <GoldPlusIcon size={20} />
                        </View>
                        <View style={styles.figmaLocQuickTextGroup}>
                          <Text style={styles.figmaLocQuickTitle}>Add New{'\n'}Address</Text>
                          <Text style={styles.figmaLocQuickSubtitle}>Add a new address</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Card 3: Request Address */}
                      <TouchableOpacity
                        style={styles.figmaLocQuickCard}
                        activeOpacity={0.8}
                        onPress={handleShareAddressRequest}
                      >
                        <View style={styles.quickCircleBadge}>
                          <GoldShareIcon size={20} />
                        </View>
                        <View style={styles.figmaLocQuickTextGroup}>
                          <Text style={styles.figmaLocQuickTitle}>Request{'\n'}Address</Text>
                          <Text style={styles.figmaLocQuickSubtitle}>Share to get location</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* [5] SAVED ADDRESSES SECTION (ONLY IF USER HAS SAVED ADDRESSES) */}
                    {effectiveAddresses.length > 0 && (
                      <>
                        <Text style={styles.figmaLocSectionHeader}>SAVED ADDRESSES</Text>

                        {/* Saved Addresses Grouped Container */}
                        <View style={styles.figmaLocGroupedCard}>
                          {visibleAddresses.map((item, index) => {
                            const isSelected = currentLocation?.label
                              ? currentLocation.label.toLowerCase() === item.type.toLowerCase()
                              : index === 0;
                            const isLast = index === visibleAddresses.length - 1;

                            const renderBadgeIcon = () => {
                              const t = item.type?.toLowerCase() || '';
                              if (t.includes('gym')) return <GoldGymIcon size={20} />;
                              if (t.includes('work') || t.includes('office')) return <GoldWorkIcon size={20} />;
                              if (t.includes('kashish') || t.includes('other')) return <GoldPinIcon size={20} />;
                              return <GoldHomeIcon size={20} />;
                            };

                            const distanceText = item.latitude && userLocation
                              ? calculateDistance(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude || 0)
                              : '';

                            return (
                              <React.Fragment key={item.id || index}>
                                <View style={styles.figmaLocAddressRow}>
                                  <TouchableOpacity
                                    style={styles.figmaLocAddressClickArea}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                      onLocationSelected({
                                        label: item.type,
                                        address: item.address || `${item.houseNo}, ${item.area}`,
                                        latitude: item.latitude || mapRegion.latitude,
                                        longitude: item.longitude || mapRegion.longitude,
                                      });
                                      onClose();
                                    }}
                                  >
                                    {/* Left Distance Badge Container */}
                                    <View style={styles.figmaLocDistanceBadge}>
                                      {renderBadgeIcon()}
                                      {distanceText ? (
                                        <Text style={styles.figmaLocDistanceText}>{distanceText}</Text>
                                      ) : null}
                                    </View>

                                    {/* Middle Details */}
                                    <View style={styles.figmaLocAddressMiddle}>
                                      <View style={styles.figmaLocNameRow}>
                                        <Text style={styles.figmaLocAddressName}>{item.type}</Text>
                                        {isSelected && (
                                          <View style={styles.figmaLocSelectedBadge}>
                                            <Text style={styles.figmaLocSelectedText}>SELECTED</Text>
                                          </View>
                                        )}
                                      </View>
                                      {Boolean(item.houseNo || item.landmark) && (
                                        <Text style={styles.figmaLocAddressLine1} numberOfLines={1}>
                                          {item.houseNo ? `${item.houseNo}, ` : ''}{item.landmark || ''}
                                        </Text>
                                      )}
                                      <Text style={styles.figmaLocAddressLine2} numberOfLines={2}>
                                        {item.area || item.city || item.address || ''}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>

                                  {/* Right 3-Dots Action Button */}
                                  <TouchableOpacity
                                    style={styles.figmaLocRowMoreBtn}
                                    activeOpacity={0.6}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    onPress={(e) => openAddressMenu(item, e)}
                                  >
                                    <VerticalThreeDots size={18} />
                                  </TouchableOpacity>
                                </View>

                                {!isLast && <View style={styles.figmaLocRowDivider} />}
                              </React.Fragment>
                            );
                          })}

                          {/* View All / View Less Toggle */}
                          {effectiveAddresses.length > 2 && (
                            <TouchableOpacity
                              style={styles.figmaLocViewAllBtn}
                              activeOpacity={0.7}
                              onPress={() => setViewAllAddresses(!viewAllAddresses)}
                            >
                              <Text style={styles.figmaLocViewAllText}>
                                {viewAllAddresses ? 'View less' : 'View all'}
                              </Text>
                              <View style={viewAllAddresses ? { transform: [{ rotate: '180deg' }] } : undefined}>
                                <GoldChevronDown size={12} />
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      </>
                    )}

                    {/* [6] RECENT SEARCHES (IF ANY REAL USER SEARCHES EXIST) */}
                    {recentSearches && recentSearches.length > 0 && (
                      <>
                        <Text style={[styles.figmaLocSectionHeader, { marginTop: 24 }]}>
                          RECENT SEARCHES
                        </Text>
                        {recentSearches.map((item, index) => (
                          <TouchableOpacity
                            key={item.placeId || index}
                            style={styles.figmaLocRecentCard}
                            activeOpacity={0.8}
                            onPress={() => handleSelectSuggestion(item, false)}
                          >
                            <View style={styles.figmaLocDistanceBadge}>
                              <GoldPinIcon size={20} />
                            </View>
                            <View style={styles.figmaLocAddressMiddle}>
                              <Text style={styles.figmaLocAddressName}>{item.mainText}</Text>
                              <Text style={styles.figmaLocAddressLine1} numberOfLines={2}>
                                {item.description}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </ScrollView>
                )}
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                STEP 2: INTERACTIVE MAP PICKER STEP (OLA MAPS ADJUSTABLE PIN)
                ══════════════════════════════════════════════════════════════════════ */}
            {addressStep === 'map' && (
              <View style={{ flex: 1, position: 'relative', backgroundColor: '#000000' }}>
                {/* Floating Map Search Header */}
                <View style={styles.mapFloatingHeaderContainer}>
                  <View style={styles.mapFloatingHeader}>
                    <TouchableOpacity
                      onPress={() => setAddressStep('search')}
                      style={styles.mapBackBtn}
                    >
                      <ArrowLeft size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Interactive Map Search Input */}
                    <View style={styles.mapSearchBarInner}>
                      <GoldSearchLens size={16} />
                      <TextInput
                        style={styles.mapSearchInput}
                        value={mapSearchQuery}
                        onChangeText={setMapSearchQuery}
                        placeholder="Search area, landmark, street..."
                        placeholderTextColor="#7A7A7A"
                        returnKeyType="search"
                      />
                      {mapSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setMapSearchQuery('')} style={{ padding: 4 }}>
                          <X size={16} color="#DDDDDC" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Dropdown Floating Suggestions over the Map */}
                  {mapSearchQuery.trim().length >= 2 && (
                    <View style={styles.mapFloatingSuggestionsBox}>
                      {isMapSearching ? (
                        <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                          <ActivityIndicator size="small" color="#D4AF37" />
                        </View>
                      ) : (
                        <FlatList
                          data={mapSuggestions}
                          keyExtractor={(item) => item.placeId}
                          keyboardShouldPersistTaps="handled"
                          style={{ maxHeight: 220 }}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.mapSuggestionItem}
                              activeOpacity={0.7}
                              onPress={() => handleSelectSuggestion(item, true)}
                            >
                              <View style={styles.suggestionIconBg}>
                                <MapPin size={14} color="#C49530" />
                              </View>
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.suggestionMainText} numberOfLines={1}>
                                  {item.mainText}
                                </Text>
                                <Text style={styles.suggestionSubText} numberOfLines={1}>
                                  {item.description}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          )}
                          ListEmptyComponent={
                            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                              <Text style={styles.emptyText}>No matching locations found.</Text>
                            </View>
                          }
                        />
                      )}
                    </View>
                  )}
                </View>

                {/* Ola Map View */}
                <View style={{ flex: 1 }}>
                  <OlaMapView
                    ref={olaMapRef}
                    initialLatitude={mapRegion.latitude}
                    initialLongitude={mapRegion.longitude}
                    onRegionChangeComplete={handleMapRegionChange}
                    userLocation={userLocation}
                    showCenterMarker={true}
                    showLocateMeButton={false}
                    style={StyleSheet.absoluteFillObject}
                  />

                  {/* Floating Re-center GPS Button on Map */}
                  <TouchableOpacity
                    style={styles.mapLocateMeFloatingBtn}
                    activeOpacity={0.85}
                    onPress={detectCurrentLocationForMap}
                  >
                    <GoldGpsIcon size={22} />
                  </TouchableOpacity>
                </View>

                {/* Bottom Address Confirmation Bar */}
                <View style={styles.mapBottomCard}>
                  <View style={styles.mapBottomInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={styles.mapBottomLabel} numberOfLines={1}>
                        {selectedLocationInfo.label}
                      </Text>
                      {isResolvingAddress && (
                        <ActivityIndicator size="small" color="#D4AF37" />
                      )}
                    </View>
                    <Text style={styles.mapBottomAddress} numberOfLines={2}>
                      {selectedLocationInfo.address}
                    </Text>
                  </View>

                  <View style={styles.mapActionButtonsRow}>
                    {isQuickLocationMode ? (
                      /* Use Current Location: ONLY Confirm Location button */
                      <TouchableOpacity
                        style={[styles.mapConfirmBtn, { flex: 1, backgroundColor: '#D4AF37' }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          onLocationSelected({
                            label: selectedLocationInfo.label,
                            address: selectedLocationInfo.address,
                            latitude: mapRegion.latitude,
                            longitude: mapRegion.longitude,
                          });
                          onClose();
                        }}
                      >
                        <Text style={[styles.mapConfirmBtnText, { color: '#000000' }]}>
                          Confirm Location
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      /* Add New Address: ONLY Save Address button */
                      <TouchableOpacity
                        style={[styles.mapConfirmBtn, { flex: 1, backgroundColor: '#D4AF37' }]}
                        activeOpacity={0.8}
                        onPress={() => setAddressStep('form')}
                      >
                        <Text style={[styles.mapConfirmBtnText, { color: '#000000' }]}>
                          Save Address
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                STEP 3: COMPLETE ADDRESS DETAILS FORM STEP
                ══════════════════════════════════════════════════════════════════════ */}
            {addressStep === 'form' && (
              <ScrollView
                style={{ flex: 1, backgroundColor: '#000000' }}
                contentContainerStyle={styles.formScrollContent}
              >
                {/* Form Header */}
                <View style={styles.figmaLocHeaderRow}>
                  <TouchableOpacity
                    onPress={() => setAddressStep('map')}
                    style={styles.figmaLocBackBtn}
                  >
                    <GoldBackArrow size={22} />
                  </TouchableOpacity>
                  <Text style={styles.figmaLocTitleWhite}>
                    {editingAddressId ? 'Edit Address' : 'Address Details'}
                  </Text>
                </View>

                {/* Selected Map Location Summary */}
                <View style={styles.formLocationCard}>
                  <MapPin size={18} color="#C49530" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.formLocationCardTitle}>{selectedLocationInfo.label}</Text>
                    <Text style={styles.formLocationCardSub}>{selectedLocationInfo.address}</Text>
                  </View>
                </View>

                {/* Save As (Home / Work / Other) Pills */}
                <Text style={styles.formLabel}>SAVE AS</Text>
                <View style={styles.formTagRow}>
                  {(['Home', 'Work', 'Other'] as const).map((tag) => {
                    const isSelected = addressType === tag;
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.formTagBtn,
                          isSelected && styles.formTagBtnActive,
                        ]}
                        onPress={() => setAddressType(tag)}
                      >
                        <Text
                          style={[
                            styles.formTagText,
                            isSelected && styles.formTagTextActive,
                          ]}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Form Inputs */}
                <Text style={styles.formLabel}>FLAT / HOUSE NO. / FLOOR / BUILDING *</Text>
                <View style={styles.formInputBox}>
                  <TextInput
                    value={houseNo}
                    onChangeText={setHouseNo}
                    placeholder="e.g. Flat 402, Lotus Towers"
                    placeholderTextColor="#6A6A6A"
                    style={styles.formInput}
                  />
                </View>

                <Text style={styles.formLabel}>LANDMARK (OPTIONAL)</Text>
                <View style={styles.formInputBox}>
                  <TextInput
                    value={landmark}
                    onChangeText={setLandmark}
                    placeholder="e.g. Near Big Bazaar"
                    placeholderTextColor="#6A6A6A"
                    style={styles.formInput}
                  />
                </View>

                <Text style={styles.formLabel}>AREA / LOCALITY *</Text>
                <View style={styles.formInputBox}>
                  <TextInput
                    value={area}
                    onChangeText={setArea}
                    placeholder="e.g. Khandagiri"
                    placeholderTextColor="#6A6A6A"
                    style={styles.formInput}
                  />
                </View>

                <Text style={styles.formLabel}>CITY</Text>
                <View style={styles.formInputBox}>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Bhubaneswar"
                    placeholderTextColor="#6A6A6A"
                    style={styles.formInput}
                  />
                </View>

                {/* Receiver Details Tick Box Section */}
                <View style={styles.receiverSectionContainer}>
                  <TouchableOpacity
                    style={styles.receiverCheckboxRow}
                    activeOpacity={0.8}
                    onPress={() => setIsOrderingForMyself(!isOrderingForMyself)}
                  >
                    <View style={[styles.receiverCheckboxBox, isOrderingForMyself && styles.receiverCheckboxBoxChecked]}>
                      {isOrderingForMyself && <Text style={styles.receiverCheckmarkText}>✓</Text>}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.receiverCheckboxTitle}>Ordering for myself</Text>
                      <Text style={styles.receiverCheckboxSubtitle}>
                        {isOrderingForMyself
                          ? 'Delivery notifications will be sent to your primary number'
                          : 'Enter alternate receiver name & phone number'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Dropdown for Receiver Name & Number when un-ticked */}
                  {!isOrderingForMyself && (
                    <View style={styles.receiverDropdownFields}>
                      <Text style={[styles.formLabel, { marginTop: 8 }]}>RECEIVER'S NAME *</Text>
                      <View style={styles.formInputBox}>
                        <TextInput
                          value={receiverName}
                          onChangeText={setReceiverName}
                          placeholder="e.g. Rahul Sharma"
                          placeholderTextColor="#6A6A6A"
                          style={styles.formInput}
                        />
                      </View>

                      <Text style={[styles.formLabel, { marginTop: 14 }]}>RECEIVER'S PHONE NUMBER *</Text>
                      <View style={styles.formInputBox}>
                        <TextInput
                          value={receiverPhone}
                          onChangeText={setReceiverPhone}
                          placeholder="e.g. 9876543210"
                          placeholderTextColor="#6A6A6A"
                          keyboardType="phone-pad"
                          maxLength={10}
                          style={styles.formInput}
                        />
                      </View>
                    </View>
                  )}
                </View>

                {/* Submit Save Button */}
                <TouchableOpacity
                  style={styles.formSaveBtn}
                  activeOpacity={0.8}
                  onPress={handleSaveAddress}
                >
                  <Text style={styles.formSaveBtnText}>Save and Select Address</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </KeyboardAvoidingView>
      </View>
      {/* ── ANCHORED MINI ADDRESS DROPDOWN MODAL ── */}
      <Modal
        visible={!!menuAnchor}
        transparent
        animationType="none"
        onRequestClose={() => setMenuAnchor(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdropTransparent}
          activeOpacity={1}
          onPress={() => setMenuAnchor(null)}
        >
          {menuAnchor && (
            <View
              style={[
                styles.miniAddressDropdownCard,
                {
                  top: menuAnchor.top,
                  right: menuAnchor.right,
                },
              ]}
            >
              {/* Option 1: Edit Address */}
              <TouchableOpacity
                style={styles.miniAddressDropdownItem}
                activeOpacity={0.7}
                onPress={() => {
                  const item = menuAnchor.item;
                  setMenuAnchor(null);
                  handleStartEditAddress(item);
                }}
              >
                <Edit2 size={13 * SCALE} color="#DEA430" style={{ marginRight: 8 * SCALE }} />
                <Text style={styles.miniAddressDropdownText} numberOfLines={1}>
                  Edit
                </Text>
              </TouchableOpacity>

              {/* Option 2: Share Address */}
              <TouchableOpacity
                style={styles.miniAddressDropdownItem}
                activeOpacity={0.7}
                onPress={async () => {
                  const item = menuAnchor.item;
                  setMenuAnchor(null);
                  try {
                    await Share.share({
                      message: `My saved address: ${item.type} - ${item.houseNo ? item.houseNo + ', ' : ''}${item.area || item.address}`,
                    });
                  } catch (e) {}
                }}
              >
                <Share2 size={13 * SCALE} color="#DEA430" style={{ marginRight: 8 * SCALE }} />
                <Text style={styles.miniAddressDropdownText} numberOfLines={1}>
                  Share
                </Text>
              </TouchableOpacity>

              {/* Option 3: Delete Address */}
              <TouchableOpacity
                style={[styles.miniAddressDropdownItem, { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
                onPress={() => {
                  const item = menuAnchor.item;
                  setMenuAnchor(null);
                  deleteSavedAddress(item.id);
                }}
              >
                <Trash2 size={13 * SCALE} color="#EF4444" style={{ marginRight: 8 * SCALE }} />
                <Text style={[styles.miniAddressDropdownText, { color: '#EF4444' }]} numberOfLines={1}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  figmaLocRoot: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },
  figmaLocSafeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ─── [1] TOP HEADER ROW ───
  figmaLocHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  figmaLocBackBtn: {
    paddingVertical: 6,
    paddingRight: 14,
  },
  figmaLocTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  figmaLocTitleWhite: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 22,
    color: '#DDDDDC',
    letterSpacing: -0.2,
  },
  figmaLocTitleGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 22,
    color: '#C49530',
    letterSpacing: -0.2,
  },

  // ─── [2] SEARCH BAR ───
  figmaLocSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 16,
    height: 52,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  figmaLocSearchInput: {
    flex: 1,
    fontFamily: 'Urbanist-Medium',
    fontSize: 14.5,
    color: '#DDDDDC',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  // ─── [3] SCROLL CONTENT ───
  figmaLocScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // ─── [4] 3 BIG QUICK ACTION CARDS ───
  figmaLocQuickActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 24,
  },
  figmaLocQuickCard: {
    flex: 1,
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1F1E1E',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  quickCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0E0D0B',
    borderWidth: 1,
    borderColor: '#2D271B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  figmaLocQuickTextGroup: {
    marginTop: 8,
  },
  figmaLocQuickTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#C4C4C4',
    lineHeight: 17,
    marginBottom: 4,
  },
  figmaLocQuickSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#626262',
    lineHeight: 14,
  },

  // ─── [5] SECTION HEADERS ───
  figmaLocSectionHeader: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#A2802F',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 6,
  },

  // ─── [6] SAVED ADDRESSES GROUPED CARD ───
  figmaLocGroupedCard: {
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1C1C1A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 22,
  },
  figmaLocAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  figmaLocDistanceBadge: {
    width: 48,
    height: 58,
    backgroundColor: '#090807',
    borderWidth: 1,
    borderColor: '#262421',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  figmaLocDistanceText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5,
    color: '#707070',
    marginTop: 3,
  },
  figmaLocAddressMiddle: {
    flex: 1,
    paddingRight: 8,
  },
  figmaLocNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  figmaLocAddressName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#C7C7C7',
  },
  figmaLocSelectedBadge: {
    backgroundColor: '#1B1711',
    borderWidth: 1,
    borderColor: '#3F3523',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  figmaLocSelectedText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5,
    color: '#AF8A34',
    letterSpacing: 0.5,
  },
  figmaLocAddressLine1: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#727272',
    lineHeight: 17,
  },
  figmaLocAddressLine2: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#707070',
    lineHeight: 16,
    marginTop: 1,
  },
  figmaLocRowMoreBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  figmaLocAddressClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBackdropTransparent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    zIndex: 99999,
  },
  miniAddressDropdownCard: {
    position: 'absolute',
    width: 140 * SCALE,
    backgroundColor: '#16171B',
    borderRadius: 12 * SCALE,
    borderWidth: 1.2,
    borderColor: 'rgba(222, 164, 48, 0.4)',
    paddingVertical: 3 * SCALE,
    zIndex: 999999,
    elevation: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
  },
  miniAddressDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11 * SCALE,
    paddingVertical: 10 * SCALE,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  miniAddressDropdownText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12.5 * SCALE,
    color: '#E4E4E7',
    flex: 1,
  },
  figmaLocRowDivider: {
    height: 1,
    backgroundColor: '#131312',
    marginLeft: 62,
  },
  figmaLocViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#131312',
    gap: 6,
  },
  figmaLocViewAllText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#BA9237',
  },

  // ─── [7] RECENTLY SEARCHED CARD ───
  figmaLocRecentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1C1C1A',
    borderRadius: 20,
    padding: 14,
    marginBottom: 22,
  },

  // ─── AUTOCOMPLETE / SUGGESTIONS ───
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  suggestionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionMainText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#DDDDDC',
  },
  suggestionSubText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#707070',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    color: '#707070',
  },

  // ─── MAP STEP STYLES ───
  mapFloatingHeaderContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 99,
  },
  mapFloatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 12, 14, 0.96)',
    borderWidth: 1.2,
    borderColor: '#2F2F36',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  mapBackBtn: {
    padding: 6,
    marginRight: 6,
  },
  mapSearchBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapSearchInput: {
    flex: 1,
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    color: '#DDDDDC',
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  mapFloatingSuggestionsBox: {
    marginTop: 6,
    backgroundColor: '#0F0F12',
    borderWidth: 1.2,
    borderColor: '#2D2D36',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  mapSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.8,
    borderBottomColor: '#1F1F24',
  },
  mapHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#DDDDDC',
  },
  centerPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mapLocateMeFloatingBtn: {
    position: 'absolute',
    right: 16,
    bottom: 180,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(12, 12, 14, 0.95)',
    borderWidth: 1.2,
    borderColor: '#3A3644',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 12,
  },
  mapActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  mapBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#070707',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1F1E1E',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    zIndex: 20,
  },
  mapBottomInfo: {
    marginBottom: 14,
  },
  mapBottomLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#DDDDDC',
    marginBottom: 4,
  },
  mapBottomAddress: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#707070',
    lineHeight: 17,
  },
  mapConfirmBtn: {
    backgroundColor: '#C49530',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapConfirmBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#000000',
  },

  // ─── FORM STEP STYLES ───
  formScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  formLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1F1E1E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  formLocationCardTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#DDDDDC',
    marginBottom: 2,
  },
  formLocationCardSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#707070',
  },
  formLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#A2802F',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 12,
  },
  formTagRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  formTagBtn: {
    flex: 1,
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1F1E1E',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  formTagBtnActive: {
    backgroundColor: '#1B1711',
    borderColor: '#C49530',
  },
  formTagText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#707070',
  },
  formTagTextActive: {
    color: '#C49530',
  },
  formInputBox: {
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1F1E1E',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  formInput: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    color: '#DDDDDC',
  },
  // ─── RECEIVER DETAILS STYLES ───
  receiverSectionContainer: {
    marginTop: 18,
    marginBottom: 8,
    backgroundColor: '#0A0A0C',
    borderWidth: 1.2,
    borderColor: '#24242C',
    borderRadius: 16,
    padding: 14,
  },
  receiverCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiverCheckboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#555566',
    backgroundColor: '#18181F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiverCheckboxBoxChecked: {
    backgroundColor: '#C49530',
    borderColor: '#C49530',
  },
  receiverCheckmarkText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#000000',
    marginTop: -2,
  },
  receiverCheckboxTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#EEEEEE',
  },
  receiverCheckboxSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#777788',
    marginTop: 2,
  },
  receiverDropdownFields: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#202028',
  },
  formSaveBtn: {
    backgroundColor: '#C49530',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  formSaveBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#000000',
  },
});
