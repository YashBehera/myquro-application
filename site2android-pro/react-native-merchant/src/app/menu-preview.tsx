import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMenuStore } from '../state/menuStore';
import { Dish, Category, Variant, AddOn, CustomizationGroup } from '../types/menu';

const { width } = Dimensions.get('window');

export default function MenuPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { categories, dishes, isDishAvailableNow } = useMenuStore();

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>(
    categories.find((c) => c.isActive)?.id || (categories[0]?.id ?? '')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Customization Sheet Modal State
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedAddOnMap, setSelectedAddOnMap] = useState<{ [groupId: string]: string[] }>({});
  const [itemQuantity, setItemQuantity] = useState(1);
  const [testCartToast, setTestCartToast] = useState<string | null>(null);

  // Active Categories
  const activeCategories = useMemo(() => {
    return categories.filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  }, [categories]);

  // Dishes grouped by category
  const dishesByCategory = useMemo(() => {
    const map = new Map<string, Dish[]>();
    activeCategories.forEach((cat) => {
      let catDishes = dishes
        .filter((d) => d.categoryId === cat.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        catDishes = catDishes.filter(
          (d) => d.name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q))
        );
      }

      if (selectedDietary === 'veg') {
        catDishes = catDishes.filter((d) => d.dietaryType === 'veg' || d.dietaryType === 'vegan');
      } else if (selectedDietary === 'non-veg') {
        catDishes = catDishes.filter((d) => d.dietaryType === 'non-veg');
      }

      map.set(cat.id, catDishes);
    });
    return map;
  }, [activeCategories, dishes, searchQuery, selectedDietary]);

  // Open Customization Modal
  const handleOpenCustomization = (dish: Dish) => {
    setSelectedDish(dish);
    setItemQuantity(1);

    // Default select first available variant if hasVariants
    if (dish.hasVariants && dish.variants.length > 0) {
      const defaultVar = dish.variants.find((v) => v.isAvailable) || dish.variants[0];
      setSelectedVariant(defaultVar);
    } else {
      setSelectedVariant(null);
    }

    // Default select required single-select add-ons if any
    const initialAddons: { [groupId: string]: string[] } = {};
    dish.customizationGroups.forEach((group) => {
      if (group.type === 'single' && group.isRequired && group.addOns.length > 0) {
        initialAddons[group.id] = [group.addOns[0].id];
      } else {
        initialAddons[group.id] = [];
      }
    });
    setSelectedAddOnMap(initialAddons);
  };

  // Toggle AddOn selection
  const handleToggleAddOn = (group: CustomizationGroup, addon: AddOn) => {
    const currentList = selectedAddOnMap[group.id] || [];
    if (group.type === 'single') {
      setSelectedAddOnMap({ ...selectedAddOnMap, [group.id]: [addon.id] });
    } else {
      // Multi-select
      if (currentList.includes(addon.id)) {
        setSelectedAddOnMap({
          ...selectedAddOnMap,
          [group.id]: currentList.filter((id) => id !== addon.id),
        });
      } else {
        if (group.maxSelections && currentList.length >= group.maxSelections) {
          return; // Max reached
        }
        setSelectedAddOnMap({
          ...selectedAddOnMap,
          [group.id]: [...currentList, addon.id],
        });
      }
    }
  };

  // Dynamic Price Calculation
  const currentCalculatedPrice = useMemo(() => {
    if (!selectedDish) return 0;

    let base = 0;
    if (selectedDish.hasVariants && selectedVariant) {
      base = selectedVariant.price;
    } else {
      base = selectedDish.basePrice;
    }

    let addOnsTotal = 0;
    selectedDish.customizationGroups.forEach((group) => {
      const selectedIds = selectedAddOnMap[group.id] || [];
      group.addOns.forEach((addon) => {
        if (selectedIds.includes(addon.id)) {
          addOnsTotal += addon.price;
        }
      });
    });

    return (base + addOnsTotal) * itemQuantity;
  }, [selectedDish, selectedVariant, selectedAddOnMap, itemQuantity]);

  const handleTestAddToCart = () => {
    if (!selectedDish) return;
    const variantName = selectedVariant ? ` (${selectedVariant.name})` : '';
    setTestCartToast(`Added ${itemQuantity}x ${selectedDish.name}${variantName} • Total ₹${currentCalculatedPrice}`);
    setSelectedDish(null);
    setTimeout(() => setTestCartToast(null), 4000);
  };

  const getDietaryBadgeColor = (type: string) => {
    switch (type) {
      case 'veg':
      case 'vegan':
        return '#10B981';
      case 'non-veg':
        return '#EF4444';
      case 'egg':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#E8C547" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Live Customer Menu Preview</Text>
            <Text style={styles.headerSubtitle}>Simulating customer ordering experience</Text>
          </View>
          <View style={styles.previewModeBadge}>
            <Text style={styles.previewBadgeText}>PREVIEW MODE</Text>
          </View>
        </View>

        {/* Search & Dietary Filters */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#E8C547" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search dishes or items..."
              placeholderTextColor="#8E8E8E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8E8E8E" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.dietaryFilterRow}>
            {(['all', 'veg', 'non-veg'] as const).map((filter) => {
              const isActive = selectedDietary === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.dietaryChip, isActive && styles.dietaryChipActive]}
                  onPress={() => setSelectedDietary(filter)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dietaryChipText, isActive && styles.dietaryChipTextActive]}>
                    {filter === 'all' ? 'All Food' : filter === 'veg' ? '🌱 Pure Veg' : '🍗 Non-Veg'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Horizontal Category Navigation Tabs */}
        <View style={styles.categoryTabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabsScroll}>
            {activeCategories.map((cat) => {
              const isSelected = selectedCategoryTab === cat.id;
              const count = (dishesByCategory.get(cat.id) || []).length;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catNavTab, isSelected && styles.catNavTabActive]}
                  onPress={() => setSelectedCategoryTab(cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.catNavIcon}>{cat.icon || '📁'}</Text>
                  <Text style={[styles.catNavLabel, isSelected && styles.catNavLabelActive]}>
                    {cat.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Dishes List */}
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {activeCategories.map((cat) => {
            const catDishes = dishesByCategory.get(cat.id) || [];
            if (catDishes.length === 0) return null;

            return (
              <View key={cat.id} style={styles.categorySectionBlock}>
                {/* Category Header */}
                <View style={styles.catSectionHeader}>
                  <Text style={styles.catSectionIcon}>{cat.icon || '📁'}</Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.catSectionTitle}>{cat.name}</Text>
                    {cat.description ? (
                      <Text style={styles.catSectionDesc}>{cat.description}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.catItemCountText}>{catDishes.length} Items</Text>
                </View>

                {/* Dish Cards in this Category */}
                {catDishes.map((dish) => {
                  const isAvailableNow = isDishAvailableNow(dish);
                  const isCustomizable =
                    dish.hasVariants || dish.customizationGroups.some((g) => g.addOns.length > 0);

                  return (
                    <View
                      key={dish.id}
                      style={[styles.dishCard, !isAvailableNow && styles.dishCardUnavailable]}
                    >
                      {/* Left Info Column */}
                      <View style={styles.dishLeftInfo}>
                        {/* Dietary Badge */}
                        <View style={styles.dietaryIconRow}>
                          <View
                            style={[
                              styles.dietaryOuterSquare,
                              { borderColor: getDietaryBadgeColor(dish.dietaryType) },
                            ]}
                          >
                            <View
                              style={[
                                styles.dietaryInnerDot,
                                { backgroundColor: getDietaryBadgeColor(dish.dietaryType) },
                              ]}
                            />
                          </View>
                          {dish.hasVariants && (
                            <View style={styles.customizableTag}>
                              <Text style={styles.customizableTagText}>CUSTOMISABLE</Text>
                            </View>
                          )}
                        </View>

                        {/* Dish Name */}
                        <Text style={styles.dishName}>{dish.name}</Text>

                        {/* Price */}
                        <Text style={styles.dishPrice}>
                          {dish.hasVariants && dish.variants.length > 0
                            ? `From ₹${Math.min(...dish.variants.map((v) => v.price))}`
                            : `₹${dish.basePrice}`}
                        </Text>

                        {/* Description */}
                        {dish.description ? (
                          <Text style={styles.dishDescription} numberOfLines={2}>
                            {dish.description}
                          </Text>
                        ) : null}

                        {/* Schedule Badge if time limited */}
                        {dish.hasSchedule && (
                          <View style={styles.scheduleBadge}>
                            <Ionicons name="time-outline" size={12} color="#E8C547" />
                            <Text style={styles.scheduleBadgeText}>
                              Served {dish.scheduleStartTime} - {dish.scheduleEndTime}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Right Image & Action Column */}
                      <View style={styles.dishRightAction}>
                        {dish.image ? (
                          <Image
                            source={{ uri: dish.image }}
                            style={styles.dishImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.dishImagePlaceholder}>
                            <Ionicons name="restaurant-outline" size={28} color="#8E8E8E" />
                          </View>
                        )}

                        {/* Add Button */}
                        {isAvailableNow ? (
                          <TouchableOpacity
                            style={styles.addDishBtn}
                            onPress={() => handleOpenCustomization(dish)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.addDishBtnText}>ADD</Text>
                            {isCustomizable && (
                              <Text style={styles.addDishBtnSubText}>Customise</Text>
                            )}
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.soldOutBadge}>
                            <Text style={styles.soldOutText}>Sold Out</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        {/* Test Cart Notification Toast */}
        {testCartToast && (
          <View style={styles.cartToast}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <Text style={styles.cartToastText}>{testCartToast}</Text>
          </View>
        )}

        {/* Interactive Customization Bottom Sheet Modal */}
        <Modal
          visible={!!selectedDish}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDish(null)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setSelectedDish(null)}
            />
            {selectedDish && (
              <View style={[styles.customizationSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetDishName}>{selectedDish.name}</Text>
                    <Text style={styles.sheetDishPrice}>
                      {selectedVariant
                        ? `Selected: ₹${selectedVariant.price}`
                        : `₹${selectedDish.basePrice}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedDish(null)}
                    style={styles.sheetCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* 1. Variants Selection (e.g. Choose Your Size) */}
                  {selectedDish.hasVariants && selectedDish.variants.length > 0 && (
                    <View style={styles.sheetSection}>
                      <View style={styles.sheetSectionTitleRow}>
                        <Text style={styles.sheetSectionTitle}>Choose Your Size / Portion</Text>
                        <Text style={styles.sheetRequiredBadge}>REQUIRED (1)</Text>
                      </View>

                      {selectedDish.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            style={[
                              styles.variantOptionRow,
                              isSelected && styles.variantOptionRowActive,
                            ]}
                            onPress={() => setSelectedVariant(v)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.radioOuter}>
                              {isSelected && <View style={styles.radioInner} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text
                                style={[
                                  styles.variantOptionName,
                                  isSelected && styles.variantOptionNameActive,
                                ]}
                              >
                                {v.name}
                              </Text>
                              {v.portion ? (
                                <Text style={styles.variantOptionPortion}>{v.portion}</Text>
                              ) : null}
                            </View>
                            <Text style={styles.variantOptionPrice}>₹{v.price}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* 2. Customization Groups & Add-ons */}
                  {selectedDish.customizationGroups.map((group) => {
                    const selectedIds = selectedAddOnMap[group.id] || [];
                    return (
                      <View key={group.id} style={styles.sheetSection}>
                        <View style={styles.sheetSectionTitleRow}>
                          <Text style={styles.sheetSectionTitle}>{group.name}</Text>
                          {group.isRequired ? (
                            <Text style={styles.sheetRequiredBadge}>REQUIRED</Text>
                          ) : (
                            <Text style={styles.sheetOptionalBadge}>
                              OPTIONAL (Up to {group.maxSelections})
                            </Text>
                          )}
                        </View>

                        {group.addOns.map((addon) => {
                          const isChecked = selectedIds.includes(addon.id);
                          return (
                            <TouchableOpacity
                              key={addon.id}
                              style={[styles.addonOptionRow, isChecked && styles.addonOptionRowActive]}
                              onPress={() => handleToggleAddOn(group, addon)}
                              activeOpacity={0.8}
                            >
                              <View
                                style={[
                                  styles.checkboxOuter,
                                  isChecked && styles.checkboxOuterChecked,
                                ]}
                              >
                                {isChecked && (
                                  <Ionicons name="checkmark" size={14} color="#0B0B0B" />
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.addonOptionName,
                                  isChecked && styles.addonOptionNameActive,
                                ]}
                              >
                                {addon.name}
                              </Text>
                              <Text style={styles.addonOptionPrice}>+₹{addon.price}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}

                  {/* Quantity Selector */}
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantityLabel}>Quantity</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                      >
                        <Ionicons name="remove" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.qtyNumber}>{itemQuantity}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => setItemQuantity(itemQuantity + 1)}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer Add To Cart Simulation */}
                <View style={styles.sheetFooter}>
                  <TouchableOpacity
                    style={styles.testAddBtn}
                    onPress={handleTestAddToCart}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.testAddBtnText}>
                      Test Add Item • Total ₹{currentCalculatedPrice}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </Modal>
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
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  previewModeBadge: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderWidth: 1,
    borderColor: '#E8C547',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#E8C547',
    letterSpacing: 0.5,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  dietaryFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dietaryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  dietaryChipActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderColor: '#E8C547',
  },
  dietaryChipText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  dietaryChipTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },
  categoryTabsWrapper: {
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 8,
  },
  categoryTabsScroll: {
    paddingHorizontal: 16,
  },
  catNavTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#191919',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  catNavTabActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  catNavIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  catNavLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  catNavLabelActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#0B0B0B',
  },
  mainScroll: {
    flex: 1,
    paddingTop: 12,
  },
  categorySectionBlock: {
    marginBottom: 24,
  },
  catSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
  },
  catSectionIcon: {
    fontSize: 22,
  },
  catSectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catSectionDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 1,
  },
  catItemCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#191919',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
  },
  dishCardUnavailable: {
    opacity: 0.55,
  },
  dishLeftInfo: {
    flex: 1,
    paddingRight: 12,
  },
  dietaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dietaryOuterSquare: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  dietaryInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  customizableTag: {
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  customizableTagText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#E8C547',
    letterSpacing: 0.3,
  },
  dishName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dishPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#E8C547',
    marginBottom: 6,
  },
  dishDescription: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    lineHeight: 16,
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  scheduleBadgeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#E8C547',
    marginLeft: 4,
  },
  dishRightAction: {
    width: 100,
    alignItems: 'center',
  },
  dishImage: {
    width: 100,
    height: 80,
    borderRadius: 10,
  },
  dishImagePlaceholder: {
    width: 100,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDishBtn: {
    backgroundColor: '#191919',
    borderWidth: 1.5,
    borderColor: '#E8C547',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addDishBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#E8C547',
  },
  addDishBtnSubText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 9,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  soldOutBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: -8,
  },
  soldOutText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  cartToast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cartToastText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  customizationSheet: {
    backgroundColor: '#191919',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  sheetDishName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetDishPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#E8C547',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  sheetSection: {
    marginBottom: 18,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  sheetSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetSectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetRequiredBadge: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sheetOptionalBadge: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  variantOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  variantOptionRowActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8C547',
  },
  variantOptionName: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  variantOptionNameActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },
  variantOptionPortion: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  variantOptionPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  addonOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  addonOptionRowActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.08)',
  },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#8E8E8E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxOuterChecked: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  addonOptionName: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  addonOptionNameActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },
  addonOptionPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#E8C547',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
    marginTop: 4,
  },
  quantityLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  qtyBtn: {
    padding: 6,
  },
  qtyNumber: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
  },
  testAddBtn: {
    backgroundColor: '#E8C547',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testAddBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0B0B',
  },
});

