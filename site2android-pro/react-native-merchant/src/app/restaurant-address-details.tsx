import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useOnboardingStore } from '@/state/onboardingStore';

export default function RestaurantAddressDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setFields = useOnboardingStore((state: any) => state.setFields);

  // Form State
  const [fullAddress, setFullAddress] = useState('');
  const [shopPlotNumber, setShopPlotNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [pincode, setPincode] = useState('600032');
  const [landmark, setLandmark] = useState('');

  // Audio / Photo State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

  // Errors State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleEditMapLocation = () => {
    router.back();
  };

  const handlePincodeChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '').slice(0, 6);
    setPincode(numericOnly);
    if (errors.pincode) {
      setErrors((prev) => ({ ...prev, pincode: '' }));
    }
  };

  const handleTakePhotoFromCamera = async () => {
    setIsPhotoModalVisible(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is required to take photos of your restaurant.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedPhotos([...attachedPhotos, result.assets[0].uri]);
      }
    } catch (error) {
      console.log('Error launching camera:', error);
    }
  };

  const handleUploadFromLocalFolders = async () => {
    setIsPhotoModalVisible(false);
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Gallery access is required to upload photos from your local folders.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((asset) => asset.uri);
        setAttachedPhotos([...attachedPhotos, ...newUris]);
      }
    } catch (error) {
      console.log('Error picking images:', error);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setAttachedPhotos(attachedPhotos.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullAddress.trim()) {
      newErrors.fullAddress = 'Full Address is required';
    }

    if (!shopPlotNumber.trim()) {
      newErrors.shopPlotNumber = 'Shop / Plot number is required';
    }

    if (!floor.trim()) {
      newErrors.floor = 'Floor is required';
    }

    if (!buildingName.trim()) {
      newErrors.buildingName = 'Building / Complex name is required';
    }

    if (!pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (pincode.length !== 6) {
      newErrors.pincode = 'Pincode must be exact 6 digits';
    }

    if (!landmark.trim()) {
      newErrors.landmark = 'Landmark is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAddress = () => {
    if (validateForm()) {
      setFields({
        postalCode: pincode,
        city: 'Chennai',
        state: 'Tamil Nadu',
      });
      // Direct redirection back to Restaurant Information with location confirmed
      router.push({
        pathname: '/restaurant-information',
        params: {
          locationAdded: 'true',
          address: `${shopPlotNumber ? shopPlotNumber + ', ' : ''}${buildingName ? buildingName + ', ' : ''}Vandi Pathai St, Chennai`,
        },
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Subtle Vector Texture Background */}
      <View style={styles.backgroundTextureWrapper}>
        <Image
          source={require('../../assets/images/user_map_texture.png')}
          style={styles.backgroundTexture}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[
            'rgba(7, 9, 14, 0.92)',
            'rgba(7, 9, 14, 0.85)',
            'rgba(7, 9, 14, 0.98)',
          ]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 20) + 20 },
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

            {/* Header Title */}
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                Add <Text style={styles.headerTitleGold}>restaurant location</Text>
              </Text>
            </View>

            {/* CARD 1: Top Embedded Map Card with Edit Button */}
            <View style={styles.topMapCard}>
              <Image
                source={require('../../assets/images/user_map_texture.png')}
                style={styles.topMapImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(7, 9, 14, 0.2)', 'rgba(7, 9, 14, 0.65)']}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />

              {/* Glowing Center Pin Marker */}
              <View style={styles.topMapPinWrapper}>
                <Ionicons name="location" size={32} color="#E8C547" />
              </View>

              {/* Edit Map Location Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.editMapButton}
                onPress={handleEditMapLocation}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color="#E8C547"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.editMapText}>Edit Map Location</Text>
              </TouchableOpacity>
            </View>

            {/* CARD 2: Address Details */}
            <View style={styles.card}>
              {/* Card Header: Address Details */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="location-outline" size={20} color="#E8C547" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Address Details</Text>
                  <Text style={styles.cardSubtitle}>
                    Provide accurate details to ensure timely delivery{'\n'}of food
                    to your customers
                  </Text>
                </View>
              </View>

              {/* Field 1: Full Address */}
              <View
                style={[
                  styles.inputContainer,
                  errors.fullAddress ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Full Address*"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={fullAddress}
                  onChangeText={(t) => {
                    setFullAddress(t);
                    if (errors.fullAddress)
                      setErrors((p) => ({ ...p, fullAddress: '' }));
                  }}
                  autoCapitalize="words"
                />
              </View>
              {errors.fullAddress ? (
                <Text style={styles.errorText}>{errors.fullAddress}</Text>
              ) : null}

              {/* Field 2 & 3: Shop/Plot Number & Floor */}
              <View style={styles.twoColumnRow}>
                {/* Shop/Plot Number */}
                <View style={styles.shopPlotColumn}>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.shopPlotNumber ? styles.inputContainerError : null,
                    ]}
                  >
                    <Text style={styles.hashSymbol}>#</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Shop/Plot Number*"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={shopPlotNumber}
                      onChangeText={(t) => {
                        setShopPlotNumber(t);
                        if (errors.shopPlotNumber)
                          setErrors((p) => ({ ...p, shopPlotNumber: '' }));
                      }}
                    />
                  </View>
                  {errors.shopPlotNumber ? (
                    <Text style={styles.errorText}>{errors.shopPlotNumber}</Text>
                  ) : null}
                </View>

                {/* Floor */}
                <View style={styles.floorColumn}>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.floor ? styles.inputContainerError : null,
                    ]}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={19}
                      color="#E8C547"
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Floor*"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={floor}
                      onChangeText={(t) => {
                        setFloor(t);
                        if (errors.floor)
                          setErrors((p) => ({ ...p, floor: '' }));
                      }}
                    />
                  </View>
                  {errors.floor ? (
                    <Text style={styles.errorText}>{errors.floor}</Text>
                  ) : null}
                </View>
              </View>

              {/* Field 4: Building/Mall/Complex Name */}
              <View
                style={[
                  styles.inputContainer,
                  errors.buildingName ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Building/Mall/Complex Name*"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={buildingName}
                  onChangeText={(t) => {
                    setBuildingName(t);
                    if (errors.buildingName)
                      setErrors((p) => ({ ...p, buildingName: '' }));
                  }}
                  autoCapitalize="words"
                />
              </View>
              {errors.buildingName ? (
                <Text style={styles.errorText}>{errors.buildingName}</Text>
              ) : null}

              {/* Field 5: Pincode */}
              <View
                style={[
                  styles.inputContainer,
                  errors.pincode ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <View style={styles.pincodeContent}>
                  <Text style={styles.pincodeLabel}>Pincode*</Text>
                  <TextInput
                    style={styles.pincodeInput}
                    placeholder="600032"
                    placeholderTextColor="rgba(255, 255, 255, 0.35)"
                    value={pincode}
                    onChangeText={handlePincodeChange}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
              {errors.pincode ? (
                <Text style={styles.errorText}>{errors.pincode}</Text>
              ) : null}
            </View>

            {/* CARD 3: Additional Information */}
            <View style={styles.card}>
              {/* Card Header: Additional Information */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#E8C547"
                  />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Additional Information</Text>
                  <Text style={styles.cardSubtitle}>
                    To further avoid delays and cancellations help delivery{'\n'}
                    partners reach you easily with this info
                  </Text>
                </View>
              </View>

              {/* Field 1: Landmark */}
              <View
                style={[
                  styles.inputContainer,
                  errors.landmark ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={19}
                  color="#E8C547"
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Landmark*"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={landmark}
                  onChangeText={(t) => {
                    setLandmark(t);
                    if (errors.landmark)
                      setErrors((p) => ({ ...p, landmark: '' }));
                  }}
                />
              </View>
              {errors.landmark ? (
                <Text style={styles.errorText}>{errors.landmark}</Text>
              ) : null}

              {/* Field 2: Directions to reach (Voice Recorder) Box */}
              <View style={styles.voiceRecorderBox}>
                <View style={styles.voiceHeaderRow}>
                  <View style={styles.micBadge}>
                    <Ionicons name="mic-outline" size={18} color="#E8C547" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voiceTitle}>
                      Directions to reach (Voice Recorder)
                    </Text>
                    <Text style={styles.voiceSubtitle}>
                      (eg. take the first left next to red gate...)
                    </Text>
                  </View>
                </View>

                {/* Audio Player / Recorder Pill Bar */}
                <View style={styles.audioPlayerBar}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.playButton}
                    onPress={() => setIsPlayingAudio(!isPlayingAudio)}
                  >
                    <Ionicons
                      name={isPlayingAudio ? 'pause' : 'play'}
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>

                  <Text style={styles.audioTimeText}>0:00</Text>

                  {/* Audio Progress Track */}
                  <View style={styles.audioTrackContainer}>
                    <View style={styles.audioTrackActive} />
                  </View>

                  {/* Record Mic Icon */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsRecording(!isRecording)}
                  >
                    <Ionicons
                      name={isRecording ? 'mic' : 'mic-outline'}
                      size={20}
                      color="#E8C547"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Field 3: Add photos of restaurant front */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.addPhotosButton}
                onPress={() => setIsPhotoModalVisible(true)}
              >
                <View style={styles.addPhotosLeft}>
                  <Ionicons name="camera-outline" size={20} color="#E8C547" />
                  <Text style={styles.addPhotosText}>
                    {attachedPhotos.length > 0
                      ? `Photo attached (${attachedPhotos.length})`
                      : 'Add photos of restaurant front'}
                  </Text>
                </View>
                <Ionicons
                  name={
                    attachedPhotos.length > 0
                      ? 'checkmark-circle'
                      : 'images-outline'
                  }
                  size={20}
                  color="#E8C547"
                />
              </TouchableOpacity>

              {/* Attached Photos Thumbnails List */}
              {attachedPhotos.length > 0 && (
                <View style={styles.photoThumbnailsRow}>
                  {attachedPhotos.map((uri, index) => (
                    <View key={index} style={styles.thumbnailWrapper}>
                      <Image
                        source={{ uri }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.removePhotoButton}
                        onPress={() => handleRemovePhoto(index)}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Save Address Details CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.saveButton}
              onPress={handleSaveAddress}
            >
              <LinearGradient
                colors={['#FDC830', '#F39C12', '#E67E22']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                <Text style={styles.saveText}>Save Address Details</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* PHOTO SELECTION MODAL (Camera vs Local Folders) */}
      <Modal
        visible={isPhotoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setIsPhotoModalVisible(false)}
        >
          <View style={styles.photoModalCard}>
            <View style={styles.modalDragHandle} />

            <Text style={styles.photoModalTitle}>Add Restaurant Photos</Text>
            <Text style={styles.photoModalSubtitle}>
              Upload photos of your storefront to help customers and riders locate you easily.
            </Text>

            {/* Option 1: Take Photo from Camera */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.photoOptionButton}
              onPress={handleTakePhotoFromCamera}
            >
              <View style={styles.photoOptionIconBadge}>
                <Ionicons name="camera" size={24} color="#E8C547" />
              </View>
              <View style={styles.photoOptionTextWrapper}>
                <Text style={styles.photoOptionTitle}>Take a photo from camera</Text>
                <Text style={styles.photoOptionDescription}>
                  Capture storefront right now using camera
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#E8C547" />
            </TouchableOpacity>

            {/* Option 2: Upload from Local Folders / Gallery */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.photoOptionButton}
              onPress={handleUploadFromLocalFolders}
            >
              <View style={styles.photoOptionIconBadge}>
                <Ionicons name="images" size={24} color="#E8C547" />
              </View>
              <View style={styles.photoOptionTextWrapper}>
                <Text style={styles.photoOptionTitle}>Upload from local folders</Text>
                <Text style={styles.photoOptionDescription}>
                  Choose photo from gallery or device files
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#E8C547" />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.photoModalCancelButton}
              onPress={() => setIsPhotoModalVisible(false)}
            >
              <Text style={styles.photoModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  backgroundTextureWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundTexture: {
    width: '100%',
    height: '100%',
    opacity: 0.12,
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
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitleGold: {
    color: '#E8C547',
  },

  /* Top Map Card */
  topMapCard: {
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#141414',
  },
  topMapImage: {
    width: '100%',
    height: '100%',
  },
  topMapPinWrapper: {
    position: 'absolute',
    top: '38%',
    left: '46%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editMapButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#191919',
    paddingHorizontal: 12,
  },
  editMapText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#E8C547',
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
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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

  /* Input Container */
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
  hashSymbol: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#E8C547',
    marginRight: 8,
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

  /* Two Column Row */
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shopPlotColumn: {
    flex: 1.25,
    marginRight: 8,
  },
  floorColumn: {
    flex: 1,
  },

  /* Pincode Field */
  pincodeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  pincodeLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10,
    color: '#8E8E8E',
    marginTop: 2,
  },
  pincodeInput: {
    height: 24,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'Urbanist-Bold',
    paddingVertical: 0,
  },

  /* Voice Recorder Box */
  voiceRecorderBox: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginBottom: 12,
  },
  voiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  micBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voiceTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  voiceSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 2,
  },
  audioPlayerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
  },
  playButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioTimeText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11.5,
    color: '#FFFFFF',
    marginLeft: 6,
    marginRight: 8,
  },
  audioTrackContainer: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2A2A',
    marginRight: 10,
  },
  audioTrackActive: {
    width: '25%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#E8C547',
  },

  /* Add Photos Button */
  addPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
  },
  addPhotosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addPhotosText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#8E8E8E',
    marginLeft: 10,
  },

  /* Photo Thumbnails */
  photoThumbnailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  thumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8C547',
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Save CTA Button */
  saveButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  saveGradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0B0B',
  },

  /* PHOTO SELECTION MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  photoModalCard: {
    backgroundColor: '#191919',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8C547',
    alignSelf: 'center',
    marginBottom: 14,
  },
  photoModalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  photoModalSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    lineHeight: 16,
    marginBottom: 18,
  },
  photoOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  photoOptionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  photoOptionTextWrapper: {
    flex: 1,
  },
  photoOptionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  photoOptionDescription: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginTop: 2,
  },
  photoModalCancelButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  photoModalCancelText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
});
