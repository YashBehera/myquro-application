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

const ALL_SUGGESTED_CUISINES = [
  // Popular & Common
  'North Indian',
  'South Indian',
  'Biryani',
  'Chinese',
  'Fast Food',
  'Burgers',
  'Pizzas',
  'Cafe',
  'Street Food',
  'Beverages',
  'Desserts',

  // North Indian & Regional
  'Punjabi',
  'Mughlai',
  'Tandoori',
  'Awadhi',
  'Lucknowi',
  'Kashmiri',
  'Rajasthani',
  'Bihari',
  'Himachali',
  'Chaat',
  'Parathas',
  'Kebabs',

  // South Indian & Regional
  'Tamil',
  'Kerala',
  'Andhra',
  'Telangana',
  'Karnataka',
  'Chettinad',
  'Rayalaseema',
  'Mangalorean',
  'Udupi',
  'Malabar',
  'Hyderabadi',
  'Dosa',
  'Haleem',

  // West & Central India
  'Maharashtrian',
  'Gujarati',
  'Goan',
  'Malwani',
  'Kathiyawadi',
  'Parsi',
  'Sindhi',
  'Jain Food',
  'Navratri Special',
  'Thali',
  'Home Food',

  // East & North East India
  'Bengali',
  'Odia',
  'Assamese',
  'North Eastern',
  'Khasi',
  'Naga',
  'Tibetan',
  'Momos',
  'Sikkimese',

  // Asian & Oriental
  'Indo-Chinese',
  'Pan-Asian',
  'Thai',
  'Japanese',
  'Sushi',
  'Korean',
  'Vietnamese',
  'Oriental',
  'Dim Sum',
  'Ramen',

  // Western & Global
  'Italian',
  'Continental',
  'American',
  'Mexican',
  'Tex-Mex',
  'Mediterranean',
  'Lebanese',
  'Middle Eastern',
  'Greek',
  'Spanish',
  'French',
  'Pastas',
  'Sandwiches',
  'Wraps & Rolls',
  'Barbecue',
  'Steaks & Grills',
  'Shawarma',

  // Bakery, Desserts & Health
  'Bakery',
  'Ice Creams',
  'Ice Cream Cakes',
  'Waffle',
  'Cakes & Pastries',
  'Mithai / Sweets',
  'Healthy Food',
  'Salads',
  'Keto',
  'Vegan',
  'Shakes & Smoothies',
  'Tea & Chai',
  'Coffee',
  'Juices',
  'Sri Lankan',
];

const POS_PROVIDERS = [
  'PetPooja',
  'LimeTray',
  'UrbanPiper',
  'DotPe',
  'SlickPOS',
  'Posist',
  'Other',
];

const PACKAGING_TIERS = [
  { range: '0 - 50', charge: '5' },
  { range: '51 - 150', charge: '7' },
  { range: '151 - 300', charge: '10' },
  { range: '301 - 500', charge: '15' },
  { range: '501 and above', charge: '20' },
];

export default function MenuSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Form State
  const [posOption, setPosOption] = useState<'no' | 'yes' | null>('no');
  const [selectedPosProvider, setSelectedPosProvider] = useState<string>('PetPooja');
  const [customPosName, setCustomPosName] = useState<string>('');

  const [foodType, setFoodType] = useState<'veg' | 'both' | null>('both');
  const [cuisines, setCuisines] = useState<string[]>(['Chinese', 'North Indian']);

  // Cuisine Modal & Search State
  const [isCuisineModalVisible, setIsCuisineModalVisible] = useState(false);
  const [cuisineSearchQuery, setCuisineSearchQuery] = useState('');

  // Cost for Two State
  const [costForTwo, setCostForTwo] = useState('350');

  // Menu Uploads State
  const [menuPhotos, setMenuPhotos] = useState<string[]>([]);

  // Packaging Charges State (Default: 'item' / 'fixed' / 'zero')
  const [packagingType, setPackagingType] = useState<'zero' | 'fixed' | 'item'>(
    'item'
  );
  const [fixedPackagingAmount, setFixedPackagingAmount] = useState('15');

  // Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSelectPos = (option: 'no' | 'yes') => {
    setPosOption(option);
    if (errors.pos) setErrors((prev) => ({ ...prev, pos: '' }));
    if (errors.posProvider) setErrors((prev) => ({ ...prev, posProvider: '' }));
  };

  const handleSelectFoodType = (type: 'veg' | 'both') => {
    setFoodType(type);
    if (errors.foodType) setErrors((prev) => ({ ...prev, foodType: '' }));
  };

  const toggleCuisine = (item: string) => {
    if (cuisines.includes(item)) {
      setCuisines(cuisines.filter((c) => c !== item));
    } else {
      setCuisines([...cuisines, item]);
    }
    if (errors.cuisines) setErrors((prev) => ({ ...prev, cuisines: '' }));
  };

  const handleAddNewSearchedCuisine = () => {
    const trimmed = cuisineSearchQuery.trim();
    if (trimmed && !cuisines.includes(trimmed)) {
      setCuisines([...cuisines, trimmed]);
      setCuisineSearchQuery('');
      if (errors.cuisines) setErrors((prev) => ({ ...prev, cuisines: '' }));
    }
  };

  const filteredCuisines = ALL_SUGGESTED_CUISINES.filter((item) =>
    item.toLowerCase().includes(cuisineSearchQuery.toLowerCase())
  );

  const handleUploadMenu = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Gallery access is required to upload your menu cards.'
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
        setMenuPhotos([...menuPhotos, ...newUris]);
      }
    } catch (error) {
      console.log('Error picking menu files:', error);
    }
  };

  const handleRemoveMenuPhoto = (index: number) => {
    setMenuPhotos(menuPhotos.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!posOption) {
      newErrors.pos = 'Please select whether you have a POS system';
    } else if (posOption === 'yes') {
      if (!selectedPosProvider) {
        newErrors.posProvider = 'Please select your POS provider';
      } else if (selectedPosProvider === 'Other' && !customPosName.trim()) {
        newErrors.posProvider = 'Please enter your POS provider name';
      }
    }

    if (!foodType) {
      newErrors.foodType = 'Please select your food category';
    }

    if (cuisines.length === 0) {
      newErrors.cuisines = 'Please add at least one cuisine you serve';
    }

    if (!costForTwo.trim()) {
      newErrors.cost = 'Please enter approximate cost for two';
    }

    if (menuPhotos.length === 0) {
      newErrors.menuPhotos = 'Please upload at least one menu card photo or file';
    }

    if (!packagingType) {
      newErrors.packaging = 'Please select your packaging charge model';
    } else if (packagingType === 'fixed' && !fixedPackagingAmount.trim()) {
      newErrors.packaging = 'Please enter fixed packaging charge per order';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceed = () => {
    if (validateForm()) {
      // Proceed to Step 4 (Partner Contract) on onboarding steps timeline
      router.push({
        pathname: '/onboarding-steps',
        params: { step: '4' },
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
                <Ionicons name="arrow-back" size={20} color="#F5A623" />
              </TouchableOpacity>
            </View>

            {/* Header Row with Title & Food Bowl Graphic */}
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>
                Menu <Text style={styles.headerTitleGold}>Setup</Text>
              </Text>
              <Image
                source={require('../../assets/images/image copy.png')}
                style={styles.foodBowlIllustration}
                resizeMode="contain"
              />
            </View>

            {/* CARD 1: Do you have POS? */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="calculator-outline" size={20} color="#F5A623" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>
                    Do you have <Text style={styles.cardTitleGold}>POS?*</Text>
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Systems like PetPooja and Limetray using which you can accept
                    orders from MyQuro
                  </Text>
                </View>
              </View>

              {/* Radio Option 1: No, I don't have POS */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.radioBox,
                  posOption === 'no' ? styles.radioBoxActive : null,
                ]}
                onPress={() => handleSelectPos('no')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    posOption === 'no' ? styles.radioCircleActive : null,
                  ]}
                >
                  {posOption === 'no' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>No, I don't have POS</Text>
              </TouchableOpacity>

              {/* Radio Option 2: Yes, I have POS integration */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.radioBox,
                  posOption === 'yes' ? styles.radioBoxActive : null,
                ]}
                onPress={() => handleSelectPos('yes')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    posOption === 'yes' ? styles.radioCircleActive : null,
                  ]}
                >
                  {posOption === 'yes' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.radioLabel}>Yes, I have POS integration</Text>
              </TouchableOpacity>

              {/* Expandable POS Provider Selection when 'Yes' is chosen */}
              {posOption === 'yes' && (
                <View style={styles.posProviderSection}>
                  <Text style={styles.posProviderTitle}>
                    Which POS system are you using?*
                  </Text>

                  {/* POS Provider Chips Grid */}
                  <View style={styles.posChipsRow}>
                    {POS_PROVIDERS.map((provider) => (
                      <TouchableOpacity
                        key={provider}
                        activeOpacity={0.75}
                        style={[
                          styles.posChip,
                          selectedPosProvider === provider
                            ? styles.posChipActive
                            : null,
                        ]}
                        onPress={() => {
                          setSelectedPosProvider(provider);
                          if (errors.posProvider) {
                            setErrors((prev) => ({ ...prev, posProvider: '' }));
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.posChipText,
                            selectedPosProvider === provider
                              ? styles.posChipTextActive
                              : null,
                          ]}
                        >
                          {provider}
                        </Text>
                        {selectedPosProvider === provider && (
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#0B0D12"
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Other POS Custom Name Input */}
                  {selectedPosProvider === 'Other' && (
                    <View
                      style={[
                        styles.customPosInputContainer,
                        errors.posProvider ? styles.inputContainerError : null,
                      ]}
                    >
                      <TextInput
                        style={styles.customPosInput}
                        placeholder="Enter your POS software name*"
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        value={customPosName}
                        onChangeText={(t) => {
                          setCustomPosName(t);
                          if (errors.posProvider) {
                            setErrors((p) => ({ ...p, posProvider: '' }));
                          }
                        }}
                      />
                    </View>
                  )}

                  {errors.posProvider ? (
                    <Text style={styles.errorText}>{errors.posProvider}</Text>
                  ) : null}
                </View>
              )}

              {errors.pos ? (
                <Text style={styles.errorText}>{errors.pos}</Text>
              ) : null}
            </View>

            {/* CARD 2: What kind of food is on your menu? */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="restaurant-outline" size={19} color="#F5A623" />
                </View>
                <Text style={styles.cardTitle}>
                  What kind of food is on your menu?*
                </Text>
              </View>

              {/* Two Column Food Type Selector */}
              <View style={styles.foodTypeRow}>
                {/* Veg Only */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.foodTypePill,
                    foodType === 'veg' ? styles.foodTypePillActive : null,
                  ]}
                  onPress={() => handleSelectFoodType('veg')}
                >
                  <View
                    style={[
                      styles.radioCircleSmall,
                      foodType === 'veg' ? styles.radioCircleSmallActive : null,
                    ]}
                  >
                    {foodType === 'veg' && <View style={styles.radioDotSmall} />}
                  </View>
                  <Text style={styles.foodTypeLabel}>Veg Only</Text>
                </TouchableOpacity>

                {/* Both Veg & Non-Veg */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.foodTypePill,
                    foodType === 'both' ? styles.foodTypePillActive : null,
                  ]}
                  onPress={() => handleSelectFoodType('both')}
                >
                  <View
                    style={[
                      styles.radioCircleSmall,
                      foodType === 'both' ? styles.radioCircleSmallActive : null,
                    ]}
                  >
                    {foodType === 'both' && <View style={styles.radioDotSmall} />}
                  </View>
                  <Text style={styles.foodTypeLabel}>Both Veg & Non-Veg</Text>
                </TouchableOpacity>
              </View>
              {errors.foodType ? (
                <Text style={styles.errorText}>{errors.foodType}</Text>
              ) : null}

              {/* Dashed Separator */}
              <View style={styles.dashedDivider} />

              {/* Add Cuisines Section */}
              <Text style={styles.cuisinesSectionLabel}>
                Add cuisines that you serve
              </Text>

              {/* Selected Cuisines Chips */}
              {cuisines.length > 0 && (
                <View style={styles.cuisinesChipsRow}>
                  {cuisines.map((item) => (
                    <View key={item} style={styles.cuisineChip}>
                      <Text style={styles.cuisineChipText}>{item}</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleCuisine(item)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#F5A623"
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Cuisines Trigger Box (Opens Modal) */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.cuisineInputContainer,
                  errors.cuisines ? styles.inputContainerError : null,
                ]}
                onPress={() => setIsCuisineModalVisible(true)}
              >
                <Text style={styles.cuisineInputPlaceholder}>
                  {cuisines.length > 0
                    ? `${cuisines.length} cuisines selected - tap to add more`
                    : 'Eg. Chinese, North Indian'}
                </Text>
                <Ionicons name="add" size={22} color="#F5A623" />
              </TouchableOpacity>
              {errors.cuisines ? (
                <Text style={styles.errorText}>{errors.cuisines}</Text>
              ) : null}
            </View>

            {/* CARD 3: Cost for Two */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Text style={styles.badgeRupeeSymbol}>₹</Text>
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Cost for Two</Text>
                  <Text style={styles.cardSubtitle}>
                    Set the approximate cost for two people.
                  </Text>
                </View>
              </View>

              {/* Cost for Two Input */}
              <View
                style={[
                  styles.costInputContainer,
                  errors.cost ? styles.inputContainerError : null,
                ]}
              >
                <Text style={styles.inputRupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.costInput}
                  placeholder="Enter amount"
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                  value={costForTwo}
                  onChangeText={(t) => {
                    setCostForTwo(t.replace(/[^0-9]/g, ''));
                    if (errors.cost) setErrors((p) => ({ ...p, cost: '' }));
                  }}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              {errors.cost ? (
                <Text style={styles.errorText}>{errors.cost}</Text>
              ) : null}
            </View>

            {/* CARD 4: Upload your menu */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#F5A623"
                  />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Upload your menu</Text>
                  <Text style={styles.cardSubtitle}>
                    Add your menu to help customers explore your offerings.
                  </Text>
                </View>
              </View>

              {/* Requirements List */}
              <Text style={styles.requirementsHeader}>Requirements:</Text>
              <View style={styles.requirementItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.requirementText}>
                  Upload <Text style={styles.boldWhite}>clear menu card photos</Text> or
                  as a <Text style={styles.boldWhite}>word/excel file</Text>. Item
                  names prices should be readable.
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.requirementText}>
                  Menu should be in <Text style={styles.boldWhite}>English</Text> only.
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.requirementText}>
                  Every item should have <Text style={styles.boldWhite}>price mentioned</Text> against
                  it.
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.requirementText}>
                  Max file size: <Text style={styles.boldWhite}>25 MB (.jpg, .png, .docx, .xlsx, .pdf)</Text>.
                </Text>
              </View>

              {/* Dotted Upload Dropzone */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.uploadDropzone}
                onPress={handleUploadMenu}
              >
                <View style={styles.uploadCenterContent}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={36}
                    color="#F5A623"
                  />
                  <Text style={styles.uploadTitle}>Add your menu</Text>
                  <Text style={styles.uploadSubtitle}>
                    Click to upload or drag and drop
                  </Text>
                </View>

                {/* Right Photo/Add Badge */}
                <View style={styles.uploadTopRightBadge}>
                  <Ionicons name="images-outline" size={26} color="#F5A623" />
                </View>
              </TouchableOpacity>

              {/* Menu Photos Thumbnails */}
              {menuPhotos.length > 0 && (
                <View style={styles.menuThumbnailsRow}>
                  {menuPhotos.map((uri, index) => (
                    <View key={index} style={styles.menuThumbnailWrapper}>
                      <Image
                        source={{ uri }}
                        style={styles.menuThumbnailImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.removeMenuPhotoButton}
                        onPress={() => handleRemoveMenuPhoto(index)}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {errors.menuPhotos ? (
                <Text style={styles.errorText}>{errors.menuPhotos}</Text>
              ) : null}
            </View>

            {/* CARD 5: Packaging Charges */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.iconBadge}>
                  <Ionicons name="cube-outline" size={20} color="#F5A623" />
                </View>
                <View style={styles.cardHeaderTextWrapper}>
                  <Text style={styles.cardTitle}>Packaging Charges*</Text>
                  <Text style={styles.cardSubtitle}>
                    Not applicable on Indian Breads, MRP Items, Packaged Beverages
                    (Soft drinks, Water Bottle)
                  </Text>
                </View>
              </View>

              {/* Packaging Radio Options Row */}
              <View style={styles.packagingPillsRow}>
                {/* Option 1: Zero */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.packagingPill,
                    packagingType === 'zero' ? styles.packagingPillActive : null,
                  ]}
                  onPress={() => setPackagingType('zero')}
                >
                  <Text
                    style={[
                      styles.packagingPillText,
                      packagingType === 'zero'
                        ? styles.packagingPillTextActive
                        : null,
                    ]}
                  >
                    Zero
                  </Text>
                </TouchableOpacity>

                {/* Option 2: Fixed */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.packagingPill,
                    packagingType === 'fixed'
                      ? styles.packagingPillActive
                      : null,
                  ]}
                  onPress={() => setPackagingType('fixed')}
                >
                  <Text
                    style={[
                      styles.packagingPillText,
                      packagingType === 'fixed'
                        ? styles.packagingPillTextActive
                        : null,
                    ]}
                  >
                    Fixed (Order Level Packing)
                  </Text>
                </TouchableOpacity>

                {/* Option 3: Based on item price */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.packagingPill,
                    packagingType === 'item' ? styles.packagingPillActiveGold : null,
                  ]}
                  onPress={() => setPackagingType('item')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      style={[
                        styles.packagingPillText,
                        packagingType === 'item'
                          ? styles.packagingPillTextDark
                          : null,
                      ]}
                    >
                      Based on item price
                    </Text>
                    {packagingType === 'item' && (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color="#0B0D12"
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* TIER TABLE: Displayed when 'Based on item price' is selected */}
              {packagingType === 'item' && (
                <View style={styles.tierTableCard}>
                  {/* Table Header */}
                  <View style={styles.tierTableHeaderRow}>
                    <Text style={styles.tierTableHeaderText}>
                      Item price (₹)
                    </Text>
                    <Text style={styles.tierTableHeaderText}>
                      Packaging Charge (₹)
                    </Text>
                  </View>

                  {/* Table Rows */}
                  {PACKAGING_TIERS.map((tier, index) => (
                    <View key={index}>
                      <View style={styles.tierTableRow}>
                        <Text style={styles.tierRangeText}>{tier.range}</Text>
                        <Text style={styles.tierChargeText}>{tier.charge}</Text>
                      </View>
                      {index < PACKAGING_TIERS.length - 1 && (
                        <View style={styles.tierDottedDivider} />
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Fixed Packaging Amount Input when 'Fixed' is selected */}
              {packagingType === 'fixed' && (
                <View style={styles.fixedInputBox}>
                  <Text style={styles.fixedInputLabel}>Fixed Packing Charge per order (₹)</Text>
                  <View style={styles.fixedInputField}>
                    <Text style={styles.rupeeSymbolSmall}>₹</Text>
                    <TextInput
                      style={styles.fixedInput}
                      value={fixedPackagingAmount}
                      onChangeText={(t) => setFixedPackagingAmount(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </View>
              )}

              {/* Automatic Assignment Info Box */}
              <View style={styles.digitisationInfoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color="#F5A623"
                  style={{ marginRight: 10, marginTop: 1 }}
                />
                <Text style={styles.digitisationInfoText}>
                  These charges will be automatically assigned to your menu items
                  after digitisation.
                </Text>
              </View>
            </View>

            {/* Proceed CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.proceedButton}
              onPress={handleProceed}
            >
              <LinearGradient
                colors={['#FDC830', '#F39C12', '#E67E22']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.proceedGradient}
              >
                <Text style={styles.proceedTextActive}>Proceed</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom Help Floating Card */}
            <View style={styles.helpCard}>
              <Ionicons name="headset-outline" size={24} color="#F5A623" />
              <View style={styles.helpVerticalDivider} />
              <Text style={styles.helpText}>
                If you need any help, check out the{' '}
                <Text style={styles.faqsLink}>FAQs</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* CUISINE SELECTION & SEARCH MODAL */}
      <Modal
        visible={isCuisineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCuisineModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setIsCuisineModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.cuisineModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={styles.cuisineModalHeaderRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.modalBackButton}
                onPress={() => setIsCuisineModalVisible(false)}
              >
                <Ionicons name="arrow-back" size={19} color="#F5A623" />
              </TouchableOpacity>
              <Text style={styles.cuisineModalTitle}>
                Add cuisines <Text style={styles.cuisineModalTitleGold}>that you serve</Text>
              </Text>
            </View>

            {/* Search Input Bar */}
            <View style={styles.cuisineSearchBar}>
              <TextInput
                style={styles.cuisineSearchInput}
                placeholder="Search cuisine name"
                placeholderTextColor="rgba(255, 255, 255, 0.45)"
                value={cuisineSearchQuery}
                onChangeText={setCuisineSearchQuery}
                onSubmitEditing={handleAddNewSearchedCuisine}
                returnKeyType="search"
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleAddNewSearchedCuisine}
              >
                <Ionicons name="search" size={20} color="#F5A623" />
              </TouchableOpacity>
            </View>

            {/* Suggested Cuisines Label & Divider */}
            <View style={styles.suggestedDividerRow}>
              <Text style={styles.suggestedLabel}>SUGGESTED CUISINES</Text>
              <View style={styles.suggestedDividerLine} />
            </View>

            {/* Scrollable Cuisines Chips Grid */}
            <ScrollView
              style={styles.modalChipsScroll}
              contentContainerStyle={styles.modalChipsContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredCuisines.map((item) => {
                const isSelected = cuisines.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.75}
                    style={[
                      styles.suggestedChip,
                      isSelected ? styles.suggestedChipActive : null,
                    ]}
                    onPress={() => toggleCuisine(item)}
                  >
                    <Text
                      style={[
                        styles.suggestedChipText,
                        isSelected ? styles.suggestedChipTextActive : null,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color="#0B0D12"
                        style={{ marginLeft: 6 }}
                      />
                    ) : (
                      <Ionicons
                        name="add"
                        size={16}
                        color="#F5A623"
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* If no exact match, allow adding as custom cuisine */}
              {cuisineSearchQuery.trim() &&
                !filteredCuisines.some(
                  (c) =>
                    c.toLowerCase() === cuisineSearchQuery.trim().toLowerCase()
                ) && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.addCustomCuisineButton}
                    onPress={handleAddNewSearchedCuisine}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color="#F5A623"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.addCustomCuisineText}>
                      Add "{cuisineSearchQuery.trim()}" as a cuisine
                    </Text>
                  </TouchableOpacity>
                )}
            </ScrollView>

            {/* Done CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.doneButton}
              onPress={() => setIsCuisineModalVisible(false)}
            >
              <LinearGradient
                colors={['#FDC830', '#F39C12', '#E67E22']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneGradient}
              >
                <Text style={styles.doneText}>
                  Done ({cuisines.length} Selected)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  /* Top Nav */
  topNav: {
    paddingTop: 18,
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#FFFFFF',
    flex: 1,
  },
  headerTitleGold: {
    color: '#E8C547',
  },
  foodBowlIllustration: {
    width: 90,
    height: 90,
    marginLeft: 8,
  },

  /* Card */
  card: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeRupeeSymbol: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#E8C547',
  },
  cardHeaderTextWrapper: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitleGold: {
    color: '#E8C547',
  },
  cardSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    lineHeight: 17,
    marginTop: 4,
  },

  /* Radio Boxes */
  radioBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  radioBoxActive: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.06)',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#8E8E8E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioCircleActive: {
    borderColor: '#E8C547',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8C547',
  },
  radioLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },

  /* POS Provider Selection */
  posProviderSection: {
    marginTop: 10,
    marginBottom: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  posProviderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E8C547',
    marginBottom: 10,
  },
  posChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  posChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  posChipActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  posChipText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  posChipTextActive: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  customPosInputContainer: {
    height: 48,
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    marginTop: 10,
  },
  customPosInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
  },

  /* Food Type Row */
  foodTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodTypePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#141414',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  foodTypePillActive: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.08)',
  },
  radioCircleSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.6,
    borderColor: '#8E8E8E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioCircleSmallActive: {
    borderColor: '#E8C547',
  },
  radioDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8C547',
  },
  foodTypeLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },

  /* Dashed Divider */
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    marginVertical: 16,
  },

  /* Cuisines Section */
  cuisinesSectionLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E8E',
    marginBottom: 8,
  },
  cuisinesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.35)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  cuisineChipText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  cuisineInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  cuisineInputPlaceholder: {
    fontSize: 13.5,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#8E8E8E',
  },

  /* Cost for Two */
  costInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
  },
  inputRupeeSymbol: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#E8C547',
    marginRight: 10,
  },
  costInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    paddingVertical: 0,
  },

  /* Upload Your Menu */
  requirementsHeader: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E8C547',
    marginTop: 4,
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E8E',
    marginRight: 8,
    lineHeight: 18,
  },
  requirementText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    lineHeight: 18,
  },
  boldWhite: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadDropzone: {
    height: 128,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8C547',
    borderStyle: 'dashed',
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    position: 'relative',
  },
  uploadCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    fontWeight: '700',
    color: '#E8C547',
    marginTop: 4,
  },
  uploadSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  uploadTopRightBadge: {
    position: 'absolute',
    top: 14,
    right: 16,
  },
  menuThumbnailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  menuThumbnailWrapper: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E8C547',
    marginRight: 10,
    marginBottom: 10,
    position: 'relative',
  },
  menuThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removeMenuPhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Packaging Charges */
  packagingPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  packagingPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  packagingPillActive: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.08)',
  },
  packagingPillActiveGold: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  packagingPillText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  packagingPillTextActive: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  packagingPillTextDark: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  /* Tier Table */
  tierTableCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  tierTableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tierTableHeaderText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  tierTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tierRangeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  tierChargeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#E8C547',
  },
  tierDottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    marginVertical: 2,
  },

  /* Fixed Input Box */
  fixedInputBox: {
    marginTop: 14,
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  fixedInputLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginBottom: 8,
  },
  fixedInputField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: '#0B0B0B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8C547',
    paddingHorizontal: 12,
  },
  rupeeSymbolSmall: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#E8C547',
    marginRight: 6,
  },
  fixedInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
  },

  /* Digitisation Info Box */
  digitisationInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginTop: 16,
  },
  digitisationInfoText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    lineHeight: 17,
  },

  /* Proceed CTA Button */
  proceedButton: {
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: '#E8C547',
  },
  proceedGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  proceedTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: '#0B0B0B',
  },

  /* Bottom Help Floating Card */
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  helpVerticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 14,
  },
  helpText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  faqsLink: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* CUISINE MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  cuisineModalCard: {
    maxHeight: '82%',
    backgroundColor: '#191919',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  modalDragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E8E',
    alignSelf: 'center',
    marginBottom: 14,
  },
  cuisineModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cuisineModalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  cuisineModalTitleGold: {
    color: '#E8C547',
  },
  cuisineSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  cuisineSearchInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
  },
  suggestedDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  suggestedLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#E8C547',
    marginRight: 10,
  },
  suggestedDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  modalChipsScroll: {
    maxHeight: 280,
    marginBottom: 16,
  },
  modalChipsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 10,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.35)',
  },
  suggestedChipActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  suggestedChipText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  suggestedChipTextActive: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  addCustomCuisineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 197, 71, 0.1)',
    borderWidth: 1,
    borderColor: '#E8C547',
    marginTop: 6,
  },
  addCustomCuisineText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#E8C547',
  },
  doneButton: {
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E8C547',
  },
  doneGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0B0B0B',
  },
});
