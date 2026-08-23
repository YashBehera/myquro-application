import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  Image,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Path } from 'react-native-svg';
import {
  Plus,
  Edit2,
  Trash2,
  MapPin,
  ArrowLeft,
  Search,
  Navigation,
  Bookmark,
  Briefcase,
  Camera,
  ChevronLeft,
  User,
} from 'lucide-react-native';
import { COLORS } from '../../theme/Theme';
import {
  fetchPlaceSuggestions,
  getCoordsFromPlaceId,
  reverseGeocode,
  detectCurrentLocationWithOla,
} from '../../services/LocationService';
import { scale } from './profileUtils';

interface AddressesSubViewProps {
  isDarkMode: boolean;
  authState: any;
  savedAddresses: any[];
  addSavedAddress: (addr: any) => void;
  updateSavedAddress: (addr: any) => void;
  deleteSavedAddress: (id: string) => void;
  onBack: () => void;
  editName: string;
  editPhone: string;
  showToast: (msg: string) => void;
}

export const AddressesSubView: React.FC<AddressesSubViewProps> = ({
  isDarkMode,
  authState,
  savedAddresses,
  addSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  onBack,
  editName,
  editPhone,
  showToast,
}) => {
  const [addressStep, setAddressStep] = useState<'list' | 'map' | 'form'>('list');
  const favQuroImg = require('../../assets/favorite_quro.png');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [houseNo, setHouseNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [useAccountDetails, setUseAccountDetails] = useState(false);
  const [customSaveAs, setCustomSaveAs] = useState('');
  const [addressPhotos, setAddressPhotos] = useState<string[]>([]);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [mapRegion, setMapRegion] = useState({
    latitude: 23.6693,
    longitude: 86.1511,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [selectedLocationInfo, setSelectedLocationInfo] = useState({
    label: 'Sector 4',
    address: 'Sector 4, Bokaro Steel City, Jharkhand, India',
  });

  const [userLocation, setUserLocation] = useState<any>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState<any[]>([]);
  const [isMapSearching, setIsMapSearching] = useState(false);

  const hasCenteredOnUserRef = useRef(false);
  const geocodeTimeoutRef = useRef<any>(null);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'MyQuro needs access to your location to set delivery address.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn("Location permission error:", err);
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (addressStep === 'map') {
      hasCenteredOnUserRef.current = false;
      const checkPermission = async () => {
        const granted = await requestLocationPermission();
        setHasLocationPermission(granted);
      };
      checkPermission();
    }
  }, [addressStep]);

  useEffect(() => {
    if (mapSearchQuery.trim().length < 2) {
      setMapSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsMapSearching(true);
      try {
        const res = await fetchPlaceSuggestions(mapSearchQuery);
        setMapSuggestions(res);
      } catch (err) {
        console.error("Suggestions error:", err);
      } finally {
        setIsMapSearching(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [mapSearchQuery]);

  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, []);

  const detectCurrentLocation = async (silent = false) => {
    if (!silent) {
      setIsResolvingAddress(true);
    }
    try {
      const locationResult = await detectCurrentLocationWithOla();
      if (locationResult) {
        setMapRegion({
          latitude: locationResult.latitude,
          longitude: locationResult.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        setSelectedLocationInfo({
          label: locationResult.label,
          address: locationResult.address,
        });
        setArea(locationResult.label);
        setCity(locationResult.address.split(',')[1]?.trim() || 'Bhubaneswar');
        setIsResolvingAddress(false);
        return;
      }
    } catch (err) {
      console.error("GPS Ola Maps Geocode error in profile:", err);
    }

    // Default fallback if GPS unavailable
    try {
      const info = await reverseGeocode(20.2520, 85.7820);
      if (info) {
        setSelectedLocationInfo(info);
        setArea(info.label);
        setCity(info.address.split(',')[1]?.trim() || 'Bhubaneswar');
      }
    } catch (_) {}
    setIsResolvingAddress(false);
  };

  const handleSelectSuggestion = async (item: any) => {
    setMapSearchQuery('');
    setMapSuggestions([]);
    try {
      const coords = await getCoordsFromPlaceId(item.placeId);
      if (coords) {
        const newRegion = {
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setMapRegion(newRegion);
        setIsResolvingAddress(true);
        setSelectedLocationInfo({ label: item.mainText, address: item.description });
        setArea(item.mainText);
        setCity(item.description.split(',')[1]?.trim() || 'Bokaro');
        setIsResolvingAddress(false);
      }
    } catch (err) {
      console.warn("Select suggestion error:", err);
    }
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressType('Home');
    setHouseNo('');
    setLandmark('');
    setArea('');
    setCity('');
    setDeliveryInstructions('');
    setMapSearchQuery('');
    setMapSuggestions([]);
    setReceiverName('');
    setReceiverPhone('');
    setUseAccountDetails(false);
    setAddressPhotos([]);
    setAddressStep('list');
  };

  const handleSaveAddress = () => {
    if (!receiverName.trim()) {
      Alert.alert('Error', 'Please fill in Receiver Name');
      return;
    }
    if (!receiverPhone.trim()) {
      Alert.alert('Error', 'Please fill in Receiver Number');
      return;
    }
    if (!houseNo.trim()) {
      Alert.alert('Error', 'Please fill in Building / Floor');
      return;
    }

    const finalArea = area.trim() || selectedLocationInfo.label;
    const finalCity = city.trim() || selectedLocationInfo.address.split(',')[1]?.trim() || 'Bokaro';
    const finalType = addressType === 'Other' && customSaveAs.trim() ? customSaveAs.trim() : addressType;

    const addrData: any = {
      type: finalType,
      houseNo,
      landmark,
      area: finalArea,
      city: finalCity,
      instructions: deliveryInstructions,
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
      address: selectedLocationInfo.address,
      receiverName,
      receiverPhone,
      useAccountDetails,
      customSaveAs,
      addressPhotos,
    };

    if (editingAddressId) {
      updateSavedAddress({ id: editingAddressId, ...addrData });
      Alert.alert('Success', 'Address updated successfully!');
    } else {
      addSavedAddress(addrData);
      Alert.alert('Success', 'Address added successfully!');
    }

    resetAddressForm();
  };

  const startEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    const isStandard = addr.type === 'Home' || addr.type === 'Work' || addr.type === 'Other';
    setAddressType(isStandard ? addr.type : 'Other');
    setHouseNo(addr.houseNo);
    setLandmark(addr.landmark);
    setArea(addr.area);
    setCity(addr.city);
    setDeliveryInstructions(addr.instructions || '');
    setReceiverName(addr.receiverName || '');
    setReceiverPhone(addr.receiverPhone || '');
    setUseAccountDetails(addr.useAccountDetails || false);
    setCustomSaveAs(isStandard ? '' : (addr.customSaveAs || addr.type));
    setAddressPhotos(addr.addressPhotos || []);
    if (addr.latitude && addr.longitude) {
      setMapRegion({
        latitude: addr.latitude,
        longitude: addr.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
    setSelectedLocationInfo({
      label: addr.area || addr.type,
      address: addr.address || `${addr.houseNo}, ${addr.landmark ? addr.landmark + ', ' : ''}${addr.area}, ${addr.city}`
    });
    setAddressStep('form');
  };

  const deleteAddress = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteSavedAddress(id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark, addressStep === 'list' && styles.favContainer]}>
      {addressStep === 'list' && (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.favHeader}>
            <TouchableOpacity onPress={onBack} style={styles.favHeaderBackBtn}>
              <ArrowLeft size={22} color="#eae1d4" />
            </TouchableOpacity>
            <Text style={styles.favHeaderTitle}>manage addresses</Text>
            <View style={{ width: 34 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
          >
            {/* Sparkles tagline */}
            <View style={styles.sparkleRow}>
              <Svg width={24} height={24} viewBox="0 0 12.8333 12.8333" fill="none">
                <Path
                  d="M10.5 4.66667L9.77083 3.0625L8.16667 2.33333L9.77083 1.60417L10.5 0L11.2292 1.60417L12.8333 2.33333L11.2292 3.0625L10.5 4.66667V4.66667M10.5 12.8333L9.77083 11.2292L8.16667 10.5L9.77083 9.77083L10.5 8.16667L11.2292 9.77083L12.8333 10.5L11.2292 11.2292L10.5 12.8333V12.8333M4.66667 11.0833L3.20833 7.875L0 6.41667L3.20833 4.95833L4.66667 1.75L6.125 4.95833L9.33333 6.41667L6.125 7.875L4.66667 11.0833V11.0833M4.66667 8.25417L5.25 7L6.50417 6.41667L5.25 5.83333L4.66667 4.57917L4.08333 5.83333L2.82917 6.41667L4.08333 7L4.66667 8.25417V8.25417M4.66667 6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667"
                  fill="#D4AF37"
                  fillOpacity={0.8}
                />
              </Svg>
              <Text style={styles.sparkleTagline}>Your saved locations</Text>
            </View>

            {/* Add Address Gold Trigger */}
            <TouchableOpacity
              style={styles.favAddAddressTrigger}
              onPress={() => {
                setHouseNo('');
                setLandmark('');
                setDeliveryInstructions('');
                setEditingAddressId(null);
                setMapRegion({
                  latitude: 23.6693,
                  longitude: 86.1511,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
                setSelectedLocationInfo({
                  label: 'Sector 4',
                  address: 'Sector 4, Bokaro Steel City, Jharkhand, India',
                });
                setAddressStep('map');
                detectCurrentLocation();
              }}
              activeOpacity={0.85}
            >
              <Plus size={20} color="#191919" style={{ marginRight: 8 }} />
              <Text style={styles.favAddAddressTriggerText}>Add New Address</Text>
            </TouchableOpacity>

            {/* Saved Address Cards */}
            {savedAddresses.map(item => (
              <View key={item.id} style={styles.favAddressCard}>
                <View style={styles.favAddressCardHeader}>
                  <View style={styles.favAddressTypeBadge}>
                    <Text style={styles.favAddressTypeBadgeText}>{item.type.toUpperCase()}</Text>
                  </View>
                  <View style={styles.favAddressActions}>
                    <TouchableOpacity onPress={() => startEditAddress(item)} style={styles.favAddressActionBtn}>
                      <Edit2 size={16} color="#deb853" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteAddress(item.id)} style={styles.favAddressActionBtn}>
                      <Trash2 size={16} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.favAddressHouse}>{item.houseNo}{item.landmark ? `, ${item.landmark}` : ''}</Text>
                <Text style={styles.favAddressDetail}>{item.area}, {item.city}</Text>
                {item.address ? (
                  <Text style={styles.favAddressMapText}>
                    📍 Map: {item.address}
                  </Text>
                ) : null}
                {item.instructions ? (
                  <View style={styles.favAddressInstructionsContainer}>
                    <Text style={styles.favAddressInstructionsText}>👉 {item.instructions}</Text>
                  </View>
                ) : null}
              </View>
            ))}

            {/* Premium Calligraphy Footer */}
            <View style={styles.favPremiumFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={styles.favPremiumFooterSignature}>Live it</Text>
                <Text style={[styles.favPremiumFooterSignature, styles.favPremiumFooterUp, { fontSize: 58, marginLeft: -8 * scale }]}> up!</Text>
              </View>
              <Text style={styles.favPremiumFooterSubtitle}>
                Crafted with 💛 in{"\n"}Jharkhand, India
              </Text>
            </View>
          </ScrollView>
        </View>
      )}

      {addressStep === 'map' && (
        <View style={styles.profileFigmaMapScreenContainer}>
          <View style={StyleSheet.absoluteFillObject}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              region={mapRegion}
              showsUserLocation={hasLocationPermission}
              showsMyLocationButton={false}
              onUserLocationChange={(event) => {
                if (event.nativeEvent?.coordinate) {
                  let { latitude, longitude } = event.nativeEvent.coordinate;
                  const isOutsideIndia = latitude < 6.0 || latitude > 38.0 || longitude < 68.0 || longitude > 98.0;
                  if (isOutsideIndia) {
                    latitude = 12.9343;
                    longitude = 77.6243;
                  }
                  setUserLocation({ latitude, longitude });

                  if (!hasCenteredOnUserRef.current) {
                    hasCenteredOnUserRef.current = true;
                    setMapRegion({
                      latitude,
                      longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    });
                    setIsResolvingAddress(true);
                    reverseGeocode(latitude, longitude).then(info => {
                      if (info) {
                        setSelectedLocationInfo(info);
                        setArea(info.label);
                        setCity(info.address.split(',')[1]?.trim() || 'Bokaro');
                      }
                    }).catch(err => {
                      console.warn(err);
                    }).finally(() => {
                      setIsResolvingAddress(false);
                    });
                  }
                }
              }}
              onRegionChangeComplete={(region) => {
                const latDiff = Math.abs(region.latitude - mapRegion.latitude);
                const lngDiff = Math.abs(region.longitude - mapRegion.longitude);
                if (latDiff < 0.0001 && lngDiff < 0.0001) return;

                setMapRegion(region);
                setIsResolvingAddress(true);
                if (geocodeTimeoutRef.current) {
                  clearTimeout(geocodeTimeoutRef.current);
                }
                geocodeTimeoutRef.current = setTimeout(async () => {
                  try {
                    const info = await reverseGeocode(region.latitude, region.longitude);
                    if (info) {
                      setSelectedLocationInfo(info);
                      setArea(info.label);
                      setCity(info.address.split(',')[1]?.trim() || 'Bokaro');
                    }
                  } catch (err) {
                    console.warn(err);
                  } finally {
                    setIsResolvingAddress(false);
                  }
                }, 300);
              }}
            />

            <View style={styles.profileFigmaCenteredMarkerContainer}>
              <MapPin size={40} color={COLORS.quroRedPrimary} strokeWidth={2.5} />
              <View style={styles.profileFigmaPinShadow} />
            </View>
          </View>

          <SafeAreaView style={styles.profileFigmaTopHeaderArea} pointerEvents="box-none">
            <View style={styles.profileFigmaTopSearchRow}>
              <TouchableOpacity onPress={() => setAddressStep('list')} style={styles.profileFigmaCircularBackBtn}>
                <ArrowLeft size={20} color="#eae1d4" />
              </TouchableOpacity>
              <View style={styles.profileFigmaTopSearchBox}>
                <TextInput
                  value={mapSearchQuery}
                  onChangeText={setMapSearchQuery}
                  placeholder="Search an area or address"
                  placeholderTextColor="#787878"
                  style={styles.profileFigmaTopSearchInput}
                />
                <Search size={18} color="#A0A0A0" />
              </View>
            </View>

            {mapSuggestions.length > 0 && (
              <View style={styles.profileFigmaSuggestionsDropdown}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  {mapSuggestions.map((item) => (
                    <TouchableOpacity
                      key={item.placeId}
                      style={styles.profileFigmaSuggestionRow}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <MapPin size={16} color={COLORS.quroRedPrimary} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.profileFigmaSuggestionMainText} numberOfLines={1}>
                          {item.mainText}
                        </Text>
                        <Text style={styles.profileFigmaSuggestionSubText} numberOfLines={1}>
                          {item.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </SafeAreaView>

          <TouchableOpacity
            style={styles.profileFigmaCurrentLocationBtn}
            onPress={() => {
              if (userLocation) {
                setMapRegion({
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                });
                setIsResolvingAddress(true);
                reverseGeocode(userLocation.latitude, userLocation.longitude).then(info => {
                  if (info) {
                    setSelectedLocationInfo(info);
                    setArea(info.label);
                    setCity(info.address.split(',')[1]?.trim() || 'Bokaro');
                  }
                }).catch(err => {
                  console.warn(err);
                }).finally(() => {
                  setIsResolvingAddress(false);
                });
              } else {
                detectCurrentLocation(false);
              }
            }}
          >
            <Navigation size={22} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.profileFigmaBottomOverlay}
            pointerEvents="box-none"
          >
            <View style={styles.profileFigmaInfoCard}>
              {isResolvingAddress ? (
                <View style={styles.profileFigmaInfoCardTextContainer}>
                  <ActivityIndicator size="small" color="#eae1d4" />
                  <Text style={styles.profileFigmaInfoCardAddress}>Resolving address...</Text>
                </View>
              ) : selectedLocationInfo.address ? (
                <View style={styles.profileFigmaInfoCardTextContainer}>
                  <Text style={styles.profileFigmaInfoCardLabel} numberOfLines={1}>
                    {selectedLocationInfo.label || 'Selected Location'}
                  </Text>
                  <Text style={styles.profileFigmaInfoCardAddress} numberOfLines={2}>
                    {selectedLocationInfo.address}
                  </Text>
                </View>
              ) : (
                <View style={styles.profileFigmaInfoCardTextContainer}>
                  <Text style={styles.profileFigmaInfoCardHeading}>Get the fastest delivery</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.profileFigmaGoldBtn}
                onPress={() => {
                  if (hasLocationPermission && selectedLocationInfo.address) {
                    setAddressStep('form');
                  } else {
                    detectCurrentLocation(false);
                  }
                }}
              >
                <Text style={styles.profileFigmaGoldBtnText}>
                  {hasLocationPermission && selectedLocationInfo.address
                    ? 'Confirm & Proceed'
                    : 'Turn on device location'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {addressStep === 'form' && (
        <View style={styles.profileFigmaFormScreenContainer}>
          <View style={styles.profileFigmaFormTopBar}>
            <TouchableOpacity onPress={() => setAddressStep('map')} style={styles.profileFigmaFormBackBtn}>
              <ArrowLeft size={22} color="#eae1d4" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.profileFigmaFormTopBarTitle}>{selectedLocationInfo.label || area || 'Location'}</Text>
              <Text style={styles.profileFigmaFormTopBarSubtitle} numberOfLines={1}>
                {selectedLocationInfo.address}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.profileFigmaFormScrollView}
            contentContainerStyle={styles.profileFigmaFormScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.profileFigmaFormSection}>
              <Text style={styles.profileFigmaFormSectionHeading}>Receiver Details</Text>

              <TouchableOpacity
                style={styles.profileFigmaCheckboxRow}
                activeOpacity={0.7}
                onPress={() => {
                  const nextVal = !useAccountDetails;
                  setUseAccountDetails(nextVal);
                  if (nextVal) {
                    setReceiverName(editName);
                    setReceiverPhone(editPhone);
                  } else {
                    setReceiverName('');
                    setReceiverPhone('');
                  }
                }}
              >
                <View style={[styles.profileFigmaCheckbox, useAccountDetails && styles.profileFigmaCheckboxChecked]}>
                  {useAccountDetails && <Text style={styles.profileFigmaCheckboxCheckmark}>✓</Text>}
                </View>
                <Text style={styles.profileFigmaCheckboxLabel}>Use my account details</Text>
              </TouchableOpacity>

              <View style={styles.profileFigmaFormInputBox}>
                <TextInput
                  value={receiverName}
                  onChangeText={(val) => {
                    setReceiverName(val);
                    setUseAccountDetails(false);
                  }}
                  placeholder="Receiver name *"
                  placeholderTextColor="#c3c3c3"
                  style={styles.profileFigmaFormInputField}
                />
              </View>

              <View style={styles.profileFigmaFormInputBox}>
                <TextInput
                  value={receiverPhone}
                  onChangeText={(val) => {
                    setReceiverPhone(val);
                    setUseAccountDetails(false);
                  }}
                  placeholder="Receiver number *"
                  placeholderTextColor="#c3c3c3"
                  style={styles.profileFigmaFormInputField}
                  keyboardType="phone-pad"
                />
                <User size={20} color="#c3c3c3" style={{ marginLeft: 8 }} />
              </View>
            </View>

            <View style={styles.profileFigmaFormSection}>
              <Text style={styles.profileFigmaFormSectionHeading}>Location Details</Text>

              <View style={styles.profileFigmaSegmentedControl}>
                <TouchableOpacity
                  style={[styles.profileFigmaSegmentedBtn, addressType === 'Home' && styles.profileFigmaSegmentedBtnActive]}
                  onPress={() => setAddressType('Home')}
                >
                  <Bookmark size={15} color={addressType === 'Home' ? '#554300' : '#d0c5af'} style={{ marginRight: 8 }} />
                  <Text style={[styles.profileFigmaSegmentedText, addressType === 'Home' && styles.profileFigmaSegmentedTextActive]}>
                    House
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileFigmaSegmentedBtn, addressType === 'Work' && styles.profileFigmaSegmentedBtnActive]}
                  onPress={() => setAddressType('Work')}
                >
                  <Briefcase size={16} color={addressType === 'Work' ? '#554300' : '#d0c5af'} style={{ marginRight: 8 }} />
                  <Text style={[styles.profileFigmaSegmentedText, addressType === 'Work' && styles.profileFigmaSegmentedTextActive]}>
                    Office
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.profileFigmaSegmentedBtn, addressType === 'Other' && styles.profileFigmaSegmentedBtnActive]}
                  onPress={() => setAddressType('Other')}
                >
                  <Navigation size={15} color={addressType === 'Other' ? '#554300' : '#d0c5af'} style={{ marginRight: 8 }} />
                  <Text style={[styles.profileFigmaSegmentedText, addressType === 'Other' && styles.profileFigmaSegmentedTextActive]}>
                    Other
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileFigmaFormInputBox}>
                <TextInput
                  value={houseNo}
                  onChangeText={setHouseNo}
                  placeholder="Building / Floor *"
                  placeholderTextColor="#9d9d9d"
                  style={styles.profileFigmaFormInputField}
                />
              </View>

              <View style={styles.profileFigmaFormInputBox}>
                <TextInput
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="Street (Recommended)"
                  placeholderTextColor="#9d9d9d"
                  style={styles.profileFigmaFormInputField}
                />
              </View>

              <View style={styles.profileFigmaAreaMapCard}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.profileFigmaAreaCardLabel}>AREA</Text>
                  <Text style={styles.profileFigmaAreaCardValue}>
                    {area ? `${area}, ${city}` : selectedLocationInfo.address}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.profileFigmaMiniMapBtn}
                  onPress={() => setAddressStep('map')}
                >
                  <View style={styles.profileFigmaMiniMapWrapper}>
                    <MapPin size={24} color="#d4af37" />
                    <View style={styles.profileFigmaMiniMapOverlay}>
                      <Text style={styles.profileFigmaMiniMapOverlayText}>Change</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.profileFigmaFormInputBox}>
                <TextInput
                  value={customSaveAs}
                  onChangeText={setCustomSaveAs}
                  placeholder="Save address as *"
                  placeholderTextColor="#9d9d9d"
                  style={styles.profileFigmaFormInputField}
                />
              </View>
            </View>

            <View style={styles.profileFigmaFormSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={styles.profileFigmaFormSectionHeading}>
                  Landmark/Entry Photo <Text style={styles.profileFigmaFormSectionHeadingOptional}>optional</Text>
                </Text>
                <View style={styles.profileFigmaNewBadge}>
                  <Text style={styles.profileFigmaNewBadgeText}>NEW</Text>
                </View>
              </View>

              <View style={styles.profileFigmaPhotoCard}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.profileFigmaPhotoCardDesc}>
                    Add photos to help us deliver faster, without any extra calls (max 3 photos allowed)
                  </Text>
                  {addressPhotos.length > 0 && (
                    <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                      {addressPhotos.map((p, idx) => (
                        <View key={idx} style={styles.profileFigmaPhotoThumb}>
                          <Text style={styles.profileFigmaPhotoThumbText}>Photo {idx + 1}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.profileFigmaCameraBtn}
                  onPress={() => {
                    if (addressPhotos.length >= 3) {
                      Alert.alert('Limit Reached', 'You can upload a maximum of 3 photos.');
                      return;
                    }
                    Alert.alert('Add Photo', 'Choose an option to add a photo:', [
                      { text: 'Mock Camera Photo', onPress: () => setAddressPhotos(prev => [...prev, `photo_${prev.length + 1}`]) },
                      { text: 'Cancel', style: 'cancel' }
                    ]);
                  }}
                >
                  <Camera size={24} color="#f2ca50" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.profileFigmaFormSection}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.profileFigmaFormSectionHeading}>
                  Delivery Instructions <Text style={styles.profileFigmaFormSectionHeadingOptional}>optional</Text>
                </Text>
              </View>

              <View style={styles.profileFigmaFormInputBox}>
                <TextInput
                  value={deliveryInstructions}
                  onChangeText={setDeliveryInstructions}
                  placeholder="Instructions to reach location"
                  placeholderTextColor="#c3c3c3"
                  style={styles.profileFigmaFormInputField}
                />
                <TouchableOpacity onPress={() => {
                  if (deliveryInstructions.trim()) {
                    Alert.alert('Instructions Added', 'Your custom instructions have been attached to this address.');
                  }
                }}>
                  <Text style={styles.profileFigmaInstructionAddBtnText}>ADD</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.profileFigmaSaveBtn} onPress={handleSaveAddress}>
              <Text style={styles.profileFigmaSaveBtnText}>Save Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  favContainer: {
    flex: 1,
    backgroundColor: '#191919',
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
  },
  favHeaderBackBtn: {
    padding: 6,
  },
  favHeaderTitle: {
    fontSize: 20,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'center',
  },
  favLogoRow: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  favLogoMy: {
    fontSize: 50,
    color: '#deb853',
    fontFamily: 'Fasthand-Regular',
    letterSpacing: -1.5,
    height: 60,
    lineHeight: 70,
  },
  favQuroCropContainer: {
    width: 107,
    height: 60,
    overflow: 'hidden',
    marginLeft: 0,
  },
  favQuroCropImage: {
    width: 167,
    height: 90,
    marginLeft: -65,
    bottom: 20,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  sparkleTagline: {
    fontSize: 14,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Medium',
  },
  favAddAddressTrigger: {
    backgroundColor: '#f2ca50',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 22,
    marginVertical: 16,
  },
  favAddAddressTriggerText: {
    color: '#191919',
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
  },
  favAddressCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 22,
    marginBottom: 14,
  },
  favAddressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  favAddressTypeBadge: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  favAddressTypeBadgeText: {
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  favAddressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favAddressActionBtn: {
    padding: 4,
  },
  favAddressHouse: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  favAddressDetail: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#8a8a8a',
  },
  favAddressMapText: {
    fontSize: 12,
    fontFamily: 'Urbanist-SemiBold',
    color: '#f2ca50',
    marginTop: 6,
  },
  favAddressInstructionsContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 10,
  },
  favAddressInstructionsText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#eae1d4',
  },
  favPremiumFooter: {
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: 20,
    marginBottom: 20,
  },
  favPremiumFooterSignature: {
    fontSize: 50,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.22,
    lineHeight: 65,
    paddingTop: 10,
  },
  favPremiumFooterUp: {
    fontFamily: 'Fasthand-Regular',
    color: '#f2ca50',
  },
  favPremiumFooterSubtitle: {
    fontSize: 18,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'left',
    lineHeight: 22,
    letterSpacing: 0.6,
    marginTop: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#0F0F12',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  addAddressTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  addAddressTriggerDark: {
    backgroundColor: '#1E1E24',
    borderBottomColor: '#2C2C2E',
  },
  addAddressTriggerText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.quroRedPrimary,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EBEBEB',
  },
  addressCardDark: {
    backgroundColor: '#1E1E24',
    borderColor: '#2C2C2E',
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeBadge: {
    backgroundColor: '#EBEBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  addressTypeBadgeDark: {
    backgroundColor: '#2C2C2E',
  },
  addressTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#686B78',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addressActionBtn: {
    padding: 4,
  },
  addressHouse: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 13,
    color: '#686B78',
  },
  addressInstructionsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
  },
  addressInstructionsText: {
    fontSize: 12,
    color: '#fc8019',
    fontWeight: '600',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  profileFigmaMapScreenContainer: {
    flex: 1,
    backgroundColor: '#191919',
    position: 'relative',
  },
  profileFigmaCenteredMarkerContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 10,
    alignItems: 'center',
  },
  profileFigmaPinShadow: {
    width: 14,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 2,
    marginTop: 2,
  },
  profileFigmaTopHeaderArea: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 24,
    left: 24,
    right: 24,
    zIndex: 99,
  },
  profileFigmaTopSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileFigmaCircularBackBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileFigmaTopSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 9999,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileFigmaTopSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#eae1d4',
    paddingVertical: 8,
    marginRight: 8,
    fontFamily: 'Urbanist-Medium',
  },
  profileFigmaSuggestionsDropdown: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 220,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  profileFigmaSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  profileFigmaSuggestionMainText: {
    fontSize: 13.5,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaSuggestionSubText: {
    fontSize: 11,
    color: '#868E96',
    marginTop: 2,
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaCurrentLocationBtn: {
    position: 'absolute',
    bottom: 310,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.quroRedPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 98,
  },
  profileFigmaBottomOverlay: {
    position: 'absolute',
    bottom: 31,
    left: 25,
    right: 25,
    gap: 16,
    zIndex: 97,
  },
  profileFigmaInfoCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 24,
    padding: 24,
    height: 202,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  profileFigmaInfoCardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  profileFigmaInfoCardHeading: {
    fontSize: 26,
    color: '#eae1d4',
    lineHeight: 32,
    letterSpacing: -0.56,
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaInfoCardLabel: {
    fontSize: 20,
    color: '#eae1d4',
    marginBottom: 4,
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaInfoCardAddress: {
    fontSize: 12,
    color: '#868E96',
    lineHeight: 16,
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaGoldBtn: {
    backgroundColor: '#d4af37',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileFigmaGoldBtnText: {
    fontSize: 18,
    color: '#554300',
    letterSpacing: -0.2,
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaFormScreenContainer: {
    flex: 1,
    backgroundColor: '#191919',
  },
  profileFigmaFormTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderBottomWidth: 1,
    borderBottomColor: '#4d4635',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
  },
  profileFigmaFormBackBtn: {
    padding: 6,
  },
  profileFigmaFormTopBarTitle: {
    fontSize: 18,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaFormTopBarSubtitle: {
    fontSize: 11,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Regular',
    opacity: 0.8,
    marginTop: 2,
  },
  profileFigmaFormScrollView: {
    flex: 1,
  },
  profileFigmaFormScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  profileFigmaFormSection: {
    marginBottom: 32,
    width: '100%',
  },
  profileFigmaFormSectionHeading: {
    fontSize: 18,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 16,
  },
  profileFigmaCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  profileFigmaCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#767676',
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileFigmaCheckboxChecked: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  profileFigmaCheckboxCheckmark: {
    color: '#554300',
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaCheckboxLabel: {
    fontSize: 15,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Medium',
  },
  profileFigmaFormInputBox: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#767676',
    borderRadius: 18,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    marginBottom: 16,
  },
  profileFigmaFormInputField: {
    flex: 1,
    fontSize: 16,
    color: '#eae1d4',
    paddingVertical: 10,
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaSegmentedControl: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#4d4635',
    borderRadius: 12,
    padding: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileFigmaSegmentedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  profileFigmaSegmentedBtnActive: {
    backgroundColor: '#d4af37',
  },
  profileFigmaSegmentedText: {
    fontSize: 16,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaSegmentedTextActive: {
    color: '#554300',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaAreaMapCard: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#8d8d8d',
    borderRadius: 18,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileFigmaAreaCardLabel: {
    fontSize: 12,
    color: '#d0c5af',
    letterSpacing: 0.6,
    marginBottom: 4,
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaAreaCardValue: {
    fontSize: 16,
    color: '#eae1d4',
    lineHeight: 22,
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaMiniMapBtn: {
    marginLeft: 8,
  },
  profileFigmaMiniMapWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8d8d8d',
    backgroundColor: '#191919',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileFigmaMiniMapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(56, 52, 43, 0.9)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  profileFigmaMiniMapOverlayText: {
    fontSize: 10,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaSaveBtn: {
    backgroundColor: '#d4af37',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileFigmaSaveBtnText: {
    fontSize: 18,
    color: '#554300',
    letterSpacing: -0.2,
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaFormSectionHeadingOptional: {
    fontSize: 13,
    color: '#8d8d8d',
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaNewBadge: {
    backgroundColor: '#383120',
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  profileFigmaNewBadgeText: {
    fontSize: 10,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaPhotoCard: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#4d4635',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileFigmaPhotoCardDesc: {
    fontSize: 13,
    color: '#868E96',
    lineHeight: 18,
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaPhotoThumb: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#4d4635',
    borderRadius: 8,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileFigmaPhotoThumbText: {
    fontSize: 9,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Medium',
  },
  profileFigmaCameraBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eae1d4',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#191919',
  },
  profileFigmaInstructionAddBtnText: {
    fontSize: 14,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    marginLeft: 8,
  },
});
