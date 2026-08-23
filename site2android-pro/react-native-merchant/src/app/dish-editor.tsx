import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMenuStore } from '../state/menuStore';
import { DietaryType, Variant, CustomizationGroup, AddOn, Dish } from '../types/menu';

const { width } = Dimensions.get('window');

const DIETARY_OPTIONS: { type: DietaryType; label: string; icon: string; color: string }[] = [
  { type: 'veg', label: 'Vegetarian', icon: 'leaf', color: '#10B981' },
  { type: 'non-veg', label: 'Non-Veg', icon: 'restaurant', color: '#EF4444' },
  { type: 'egg', label: 'Contains Egg', icon: 'egg-outline', color: '#F59E0B' },
  { type: 'vegan', label: '100% Vegan', icon: 'nutrition-outline', color: '#06B6D4' },
];

export default function DishEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ dishId?: string; categoryId?: string; isDuplicate?: string }>();

  const { categories, dishes, addDish, updateDish } = useMenuStore();

  const isEditing = !!params.dishId && params.isDuplicate !== 'true';
  const isDuplicate = params.isDuplicate === 'true';
  const editingDish = dishes.find((d) => d.id === params.dishId);

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    params.categoryId || (categories[0]?.id ?? '')
  );
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [dietaryType, setDietaryType] = useState<DietaryType>('veg');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isAvailable, setIsAvailable] = useState(true);

  // Scheduling
  const [hasSchedule, setHasSchedule] = useState(false);
  const [scheduleStartTime, setScheduleStartTime] = useState('07:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('11:00');

  // Pricing & Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [basePrice, setBasePrice] = useState('120');
  const [variants, setVariants] = useState<Variant[]>([]);

  // Customization Groups & Add-ons
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationGroup[]>([]);

  // Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Populate data when editing / duplicating
  useEffect(() => {
    if (editingDish) {
      setSelectedCategoryId(editingDish.categoryId);
      setDishName(isDuplicate ? `${editingDish.name} (Copy)` : editingDish.name);
      setDescription(editingDish.description || '');
      setDietaryType(editingDish.dietaryType);
      setImageUri(editingDish.image);
      setIsAvailable(editingDish.isAvailable);
      setHasSchedule(!!editingDish.hasSchedule);
      setScheduleStartTime(editingDish.scheduleStartTime || '07:00');
      setScheduleEndTime(editingDish.scheduleEndTime || '11:00');
      setHasVariants(editingDish.hasVariants);
      setBasePrice(String(editingDish.basePrice || ''));
      setVariants(editingDish.variants ? JSON.parse(JSON.stringify(editingDish.variants)) : []);
      setCustomizationGroups(
        editingDish.customizationGroups
          ? JSON.parse(JSON.stringify(editingDish.customizationGroups))
          : []
      );
    } else if (params.categoryId) {
      setSelectedCategoryId(params.categoryId);
    }
  }, [editingDish, isDuplicate]);

  // Image Picker (Gallery / Camera)
  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Please allow photo gallery access to upload dish images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick image from gallery.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permission Denied', 'Please allow camera access to take dish photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  // ---------------- Variant Handlers ----------------
  const handleAddVariant = () => {
    const newVariant: Variant = {
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: variants.length === 0 ? 'Small' : variants.length === 1 ? 'Regular' : 'Large',
      price: 120,
      portion: '',
      description: '',
      isAvailable: true,
      displayOrder: variants.length,
    };
    setVariants([...variants, newVariant]);
  };

  const handleUpdateVariant = (index: number, updates: Partial<Variant>) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], ...updates };
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // ---------------- Customization Group Handlers ----------------
  const handleAddCustomizationGroup = () => {
    const newGroup: CustomizationGroup = {
      id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: 'Add Extras & Customizations',
      isRequired: false,
      minSelections: 0,
      maxSelections: 3,
      type: 'multi',
      addOns: [
        {
          id: `addon-${Date.now()}-1`,
          name: 'Extra Cheese',
          price: 25,
          isAvailable: true,
          displayOrder: 0,
        },
      ],
    };
    setCustomizationGroups([...customizationGroups, newGroup]);
  };

  const handleUpdateGroup = (groupIndex: number, updates: Partial<CustomizationGroup>) => {
    const updated = [...customizationGroups];
    updated[groupIndex] = { ...updated[groupIndex], ...updates };
    setCustomizationGroups(updated);
  };

  const handleRemoveGroup = (groupIndex: number) => {
    setCustomizationGroups(customizationGroups.filter((_, i) => i !== groupIndex));
  };

  const handleAddAddOn = (groupIndex: number) => {
    const updated = [...customizationGroups];
    const group = updated[groupIndex];
    const newAddOn: AddOn = {
      id: `addon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      price: 20,
      isAvailable: true,
      displayOrder: group.addOns.length,
    };
    group.addOns = [...group.addOns, newAddOn];
    setCustomizationGroups(updated);
  };

  const handleUpdateAddOn = (groupIndex: number, addOnIndex: number, updates: Partial<AddOn>) => {
    const updated = [...customizationGroups];
    const group = updated[groupIndex];
    group.addOns[addOnIndex] = { ...group.addOns[addOnIndex], ...updates };
    setCustomizationGroups(updated);
  };

  const handleRemoveAddOn = (groupIndex: number, addOnIndex: number) => {
    const updated = [...customizationGroups];
    const group = updated[groupIndex];
    group.addOns = group.addOns.filter((_, i) => i !== addOnIndex);
    setCustomizationGroups(updated);
  };

  // ---------------- Save / Validation ----------------
  const handleSave = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!dishName.trim()) {
      newErrors.dishName = 'Dish name is required';
    }

    if (!selectedCategoryId) {
      newErrors.category = 'Please select a category';
    }

    if (!hasVariants) {
      const numPrice = Number(basePrice);
      if (isNaN(numPrice) || numPrice <= 0) {
        newErrors.basePrice = 'Enter a valid base price greater than 0';
      }
    } else {
      if (variants.length === 0) {
        newErrors.variants = 'Please add at least one variant (e.g. Small / Regular)';
      } else {
        const hasInvalidVariant = variants.some((v) => !v.name.trim() || isNaN(v.price) || v.price <= 0);
        if (hasInvalidVariant) {
          newErrors.variants = 'All variants must have a valid name and price > 0';
        }
      }
    }

    // Validate Customization Groups
    for (let gi = 0; gi < customizationGroups.length; gi++) {
      const group = customizationGroups[gi];
      if (!group.name.trim()) {
        newErrors[`group_${gi}`] = 'Customization group title is required';
      }
      if (group.addOns.length === 0) {
        newErrors[`group_${gi}_addons`] = 'Add at least one add-on item in this group';
      }
      for (let ai = 0; ai < group.addOns.length; ai++) {
        const addon = group.addOns[ai];
        if (!addon.name.trim()) {
          newErrors[`group_${gi}_addon_${ai}`] = 'Add-on name is required';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Missing Required Information', 'Please fix the highlighted errors before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const calculatedBasePrice = hasVariants && variants.length > 0
        ? Math.min(...variants.map((v) => v.price))
        : Number(basePrice);

      const dishPayload = {
        categoryId: selectedCategoryId,
        name: dishName.trim(),
        description: description.trim(),
        dietaryType,
        image: imageUri,
        basePrice: calculatedBasePrice,
        hasVariants,
        variants: hasVariants ? variants : [],
        customizationGroups,
        isAvailable,
        hasSchedule,
        scheduleStartTime: hasSchedule ? scheduleStartTime : undefined,
        scheduleEndTime: hasSchedule ? scheduleEndTime : undefined,
      };

      if (isEditing && editingDish) {
        await updateDish(editingDish.id, dishPayload);
      } else {
        await addDish(dishPayload);
      }

      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save dish. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#E8C547" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Dish' : isDuplicate ? 'Duplicate Dish' : 'Add New Dish'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isEditing
                ? 'Update dish details, variants & pricing'
                : 'Configure dish details, portions & customizations'}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Category Selection */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>1. Select Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catChipsRow}>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, isSelected && styles.catChipActive]}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        if (errors.category) setErrors((prev) => ({ ...prev, category: '' }));
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.catChipIcon}>{cat.icon || '📁'}</Text>
                      <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
            </View>

            {/* 2. Basic Information */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>2. Dish Details</Text>

              {/* Dish Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  Dish Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.dishName && styles.inputError]}
                  placeholder="e.g. Butterscotch, Crispy Veg Burger, Margherita"
                  placeholderTextColor="#8E8E8E"
                  value={dishName}
                  onChangeText={(val) => {
                    setDishName(val);
                    if (errors.dishName) setErrors((prev) => ({ ...prev, dishName: '' }));
                  }}
                />
                {errors.dishName ? <Text style={styles.errorText}>{errors.dishName}</Text> : null}
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe taste, key ingredients, preparation style..."
                  placeholderTextColor="#8E8E8E"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Dietary Type */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Dietary Classification</Text>
                <View style={styles.dietaryGrid}>
                  {DIETARY_OPTIONS.map((item) => {
                    const isSelected = dietaryType === item.type;
                    return (
                      <TouchableOpacity
                        key={item.type}
                        style={[
                          styles.dietaryCard,
                          isSelected && { borderColor: item.color, backgroundColor: `${item.color}15` },
                        ]}
                        onPress={() => setDietaryType(item.type)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color={isSelected ? item.color : '#8E8E8E'}
                        />
                        <Text
                          style={[
                            styles.dietaryLabel,
                            isSelected && { color: item.color, fontFamily: 'Urbanist-Bold', fontWeight: '700' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 3. Dish Image Upload */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>3. Dish Image (High Quality)</Text>
              <Text style={styles.sectionSubtitle}>
                Attract customers with clean, vibrant food photos
              </Text>

              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <View style={styles.imageOverlayActions}>
                    <TouchableOpacity
                      style={styles.imageActionBtn}
                      onPress={handlePickImage}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="images-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageActionBtn, { backgroundColor: 'rgba(239,68,68,0.85)' }]}
                      onPress={() => setImageUri(undefined)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.imageActionText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadButtonsRow}>
                  <TouchableOpacity
                    style={styles.uploadCard}
                    onPress={handlePickImage}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="cloud-upload-outline" size={26} color="#E8C547" />
                    <Text style={styles.uploadCardTitle}>Choose from Gallery</Text>
                    <Text style={styles.uploadCardSubtitle}>PNG, JPG up to 10MB</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadCard}
                    onPress={handleTakePhoto}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="camera-outline" size={26} color="#E8C547" />
                    <Text style={styles.uploadCardTitle}>Capture Photo</Text>
                    <Text style={styles.uploadCardSubtitle}>Take camera picture</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 4. Availability & Scheduled Window */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeaderTitle}>4. Availability & Timings</Text>

              {/* Main Quick Availability Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Immediate Dish Availability</Text>
                  <Text style={styles.toggleSubtitle}>
                    {isAvailable
                      ? 'Available ● Customers can order this dish'
                      : 'Unavailable ○ Marked out of stock in menu'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.switchTrack,
                    isAvailable ? styles.switchTrackActive : styles.switchTrackInactive,
                  ]}
                  onPress={() => setIsAvailable(!isAvailable)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      isAvailable ? styles.switchThumbActive : styles.switchThumbInactive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {/* Scheduled Time Window Toggle */}
              <View style={[styles.toggleRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Scheduled Serving Window (Optional)</Text>
                  <Text style={styles.toggleSubtitle}>
                    e.g. Breakfast items (7 AM - 11:30 AM), Lunch, Dinner
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.switchTrack,
                    hasSchedule ? styles.switchTrackActive : styles.switchTrackInactive,
                  ]}
                  onPress={() => setHasSchedule(!hasSchedule)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      hasSchedule ? styles.switchThumbActive : styles.switchThumbInactive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {hasSchedule && (
                <View style={styles.scheduleInputsRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>Start Time (HH:MM)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="07:00"
                      placeholderTextColor="#8E8E8E"
                      value={scheduleStartTime}
                      onChangeText={setScheduleStartTime}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.fieldLabel}>End Time (HH:MM)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="11:30"
                      placeholderTextColor="#8E8E8E"
                      value={scheduleEndTime}
                      onChangeText={setScheduleEndTime}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* 5. Pricing & Variants */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeaderTitle}>5. Pricing & Portions</Text>
                  <Text style={styles.sectionSubtitle}>
                    {hasVariants
                      ? 'Pricing is controlled by dish sizes/portions'
                      : 'Fixed single dish price'}
                  </Text>
                </View>

                {/* Has Variants Toggle */}
                <TouchableOpacity
                  style={[
                    styles.variantModeToggle,
                    hasVariants && styles.variantModeToggleActive,
                  ]}
                  onPress={() => {
                    const next = !hasVariants;
                    setHasVariants(next);
                    if (next && variants.length === 0) {
                      handleAddVariant();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={hasVariants ? 'layers' : 'pricetag-outline'}
                    size={16}
                    color={hasVariants ? '#0B0B0B' : '#E8C547'}
                  />
                  <Text style={[styles.variantModeText, hasVariants && styles.variantModeTextActive]}>
                    {hasVariants ? 'Variants ON' : 'Add Variants'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!hasVariants ? (
                /* Single Base Price Input */
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>
                    Base Price (₹) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput, errors.basePrice && styles.inputError]}
                      placeholder="120"
                      placeholderTextColor="#8E8E8E"
                      keyboardType="numeric"
                      value={basePrice}
                      onChangeText={(val) => {
                        setBasePrice(val);
                        if (errors.basePrice) setErrors((prev) => ({ ...prev, basePrice: '' }));
                      }}
                    />
                  </View>
                  {errors.basePrice ? <Text style={styles.errorText}>{errors.basePrice}</Text> : null}
                </View>
              ) : (
                /* Variants Builder List */
                <View style={styles.variantsContainer}>
                  {variants.map((variant, index) => (
                    <View key={variant.id || index} style={styles.variantCard}>
                      <View style={styles.variantHeader}>
                        <Text style={styles.variantBadgeText}>Option {index + 1}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveVariant(index)}
                          style={styles.variantDeleteBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.variantInputsGrid}>
                        <View style={{ flex: 2, marginRight: 8 }}>
                          <Text style={styles.fieldLabelSm}>Size / Option Name</Text>
                          <TextInput
                            style={styles.inputSm}
                            placeholder="Small, Regular, Large, Half, Full"
                            placeholderTextColor="#8E8E8E"
                            value={variant.name}
                            onChangeText={(val) => handleUpdateVariant(index, { name: val })}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabelSm}>Price (₹)</Text>
                          <TextInput
                            style={styles.inputSm}
                            placeholder="120"
                            placeholderTextColor="#8E8E8E"
                            keyboardType="numeric"
                            value={String(variant.price || '')}
                            onChangeText={(val) =>
                              handleUpdateVariant(index, { price: Number(val) || 0 })
                            }
                          />
                        </View>
                      </View>

                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.fieldLabelSm}>Portion / Serving Info (Optional)</Text>
                        <TextInput
                          style={styles.inputSm}
                          placeholder="e.g. 1 Scoop (100g), Serves 1-2"
                          placeholderTextColor="#8E8E8E"
                          value={variant.portion || ''}
                          onChangeText={(val) => handleUpdateVariant(index, { portion: val })}
                        />
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addOptionBtn}
                    onPress={handleAddVariant}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#E8C547" />
                    <Text style={styles.addOptionBtnText}>+ Add Another Variant</Text>
                  </TouchableOpacity>

                  {errors.variants ? <Text style={styles.errorText}>{errors.variants}</Text> : null}
                </View>
              )}
            </View>

            {/* 6. Customization Groups & Add-ons */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeaderTitle}>6. Customizations & Extras</Text>
                  <Text style={styles.sectionSubtitle}>
                    Optional toppings, dips, crusts, syrups & extras
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addGroupBtn}
                  onPress={handleAddCustomizationGroup}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#0B0B0B" />
                  <Text style={styles.addGroupBtnText}>Add Group</Text>
                </TouchableOpacity>
              </View>

              {customizationGroups.length === 0 ? (
                <View style={styles.emptyCustomizationBox}>
                  <Ionicons name="extension-puzzle-outline" size={24} color="#8E8E8E" />
                  <Text style={styles.emptyCustomizationText}>
                    No customizations yet. Click "Add Group" to offer extras like syrups, cheese, toppings, or dips.
                  </Text>
                </View>
              ) : (
                customizationGroups.map((group, groupIndex) => (
                  <View key={group.id || groupIndex} style={styles.groupCard}>
                    {/* Group Header */}
                    <View style={styles.groupHeaderRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.fieldLabelSm}>Group Title</Text>
                        <TextInput
                          style={styles.inputSm}
                          placeholder="e.g. Add Extras, Choose Cheese, Extra Toppings"
                          placeholderTextColor="#8E8E8E"
                          value={group.name}
                          onChangeText={(val) => handleUpdateGroup(groupIndex, { name: val })}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveGroup(groupIndex)}
                        style={styles.groupDeleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Group Selection Rules */}
                    <View style={styles.groupRulesRow}>
                      <TouchableOpacity
                        style={[
                          styles.ruleChip,
                          group.type === 'single' && styles.ruleChipActive,
                        ]}
                        onPress={() =>
                          handleUpdateGroup(groupIndex, {
                            type: 'single',
                            minSelections: 1,
                            maxSelections: 1,
                            isRequired: true,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.ruleChipText,
                            group.type === 'single' && styles.ruleChipTextActive,
                          ]}
                        >
                          Single Select (Radio)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.ruleChip,
                          group.type === 'multi' && styles.ruleChipActive,
                        ]}
                        onPress={() =>
                          handleUpdateGroup(groupIndex, {
                            type: 'multi',
                            minSelections: 0,
                            maxSelections: 5,
                            isRequired: false,
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.ruleChipText,
                            group.type === 'multi' && styles.ruleChipTextActive,
                          ]}
                        >
                          Multi Select (Checkboxes)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Add-ons List inside Group */}
                    <Text style={[styles.fieldLabelSm, { marginTop: 12, marginBottom: 6 }]}>
                      Add-on Items:
                    </Text>
                    {group.addOns.map((addon, addOnIndex) => (
                      <View key={addon.id || addOnIndex} style={styles.addonRow}>
                        <TextInput
                          style={[styles.inputSm, { flex: 2, marginRight: 8 }]}
                          placeholder="e.g. Chocolate Syrup, Choco Chips, Extra Cheese"
                          placeholderTextColor="#8E8E8E"
                          value={addon.name}
                          onChangeText={(val) =>
                            handleUpdateAddOn(groupIndex, addOnIndex, { name: val })
                          }
                        />
                        <View style={styles.addonPriceWrapper}>
                          <Text style={styles.currencyPrefixSm}>+₹</Text>
                          <TextInput
                            style={[styles.inputSm, styles.addonPriceInput]}
                            placeholder="20"
                            placeholderTextColor="#8E8E8E"
                            keyboardType="numeric"
                            value={String(addon.price || '0')}
                            onChangeText={(val) =>
                              handleUpdateAddOn(groupIndex, addOnIndex, {
                                price: Number(val) || 0,
                              })
                            }
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.addonDeleteBtn}
                          onPress={() => handleRemoveAddOn(groupIndex, addOnIndex)}
                        >
                          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.addAddonBtn}
                      onPress={() => handleAddAddOn(groupIndex)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add" size={16} color="#E8C547" />
                      <Text style={styles.addAddonBtnText}>Add Another Item</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Floating Save Action Bar */}
        <View style={[styles.bottomSaveBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.cancelFooterBtn}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Text style={styles.cancelFooterBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveFooterBtn}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveFooterBtnText}>
              {isSaving ? 'Saving...' : isEditing ? 'Update Dish' : 'Save & Publish Dish'}
            </Text>
          </TouchableOpacity>
        </View>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0B0B0B',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 1,
  },
  mainScroll: {
    flex: 1,
    paddingTop: 14,
  },
  sectionCard: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    fontWeight: '700',
    color: '#E8C547',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catChipsRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.2)',
    borderColor: '#E8C547',
  },
  catChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  catChipText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  catChipTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  fieldLabelSm: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'Urbanist-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  inputSm: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#EF4444',
    marginTop: 4,
  },
  dietaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dietaryLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginLeft: 6,
  },
  imagePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    height: 180,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlayActions: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  imageActionText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadCard: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(232, 197, 71, 0.35)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  uploadCardSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  toggleTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#16A34A',
  },
  switchTrackInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchThumbInactive: {
    alignSelf: 'flex-start',
  },
  scheduleInputsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  variantModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderWidth: 1,
    borderColor: '#E8C547',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  variantModeToggleActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  variantModeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 4,
  },
  variantModeTextActive: {
    color: '#0B0B0B',
  },
  priceInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  currencyPrefix: {
    position: 'absolute',
    left: 14,
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#E8C547',
    zIndex: 1,
  },
  priceInput: {
    paddingLeft: 32,
  },
  variantsContainer: {
    marginTop: 8,
  },
  variantCard: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 10,
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  variantBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#E8C547',
    textTransform: 'uppercase',
  },
  variantDeleteBtn: {
    padding: 4,
  },
  variantInputsGrid: {
    flexDirection: 'row',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  addOptionBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 6,
  },
  addGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addGroupBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#0B0B0B',
    marginLeft: 4,
  },
  emptyCustomizationBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyCustomizationText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  groupCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginBottom: 12,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupDeleteBtn: {
    padding: 6,
    marginTop: 14,
  },
  groupRulesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  ruleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  ruleChipActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderColor: '#E8C547',
  },
  ruleChipText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  ruleChipTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  addonPriceWrapper: {
    position: 'relative',
    width: 75,
    justifyContent: 'center',
    marginRight: 6,
  },
  currencyPrefixSm: {
    position: 'absolute',
    left: 6,
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
    zIndex: 1,
  },
  addonPriceInput: {
    paddingLeft: 24,
  },
  addonDeleteBtn: {
    padding: 4,
  },
  addAddonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 6,
  },
  addAddonBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 4,
  },
  bottomSaveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#191919',
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cancelFooterBtn: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelFooterBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E8E',
  },
  saveFooterBtn: {
    flex: 2,
    backgroundColor: '#E8C547',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveFooterBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0B0B0B',
  },
});
