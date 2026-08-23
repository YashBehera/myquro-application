import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMenuStore } from '../state/menuStore';
import { Category, Dish } from '../types/menu';
import { CategoryModal } from '../components/menu/CategoryModal';

const { width } = Dimensions.get('window');

const FILTER_OPTIONS: ('All' | 'Available' | 'Unavailable' | 'Veg' | 'Non-Veg' | 'With Variants' | 'With Add-ons')[] = [
  'All',
  'Available',
  'Unavailable',
  'Veg',
  'Non-Veg',
  'With Variants',
  'With Add-ons',
];

export default function MenuManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    categories,
    dishes,
    isLoading,
    loadMenu,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    toggleCategoryStatus,
    deleteDish,
    duplicateDish,
    toggleDishAvailability,
    reorderDishes,
    bulkUpdateDishStatus,
    bulkDeleteDishes,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    selectedDishIdsForBulk,
    toggleSelectDishForBulk,
    selectAllDishesForBulk,
    clearBulkSelection,
    getMenuStats,
    getFilteredDishes,
    isDishAvailableNow,
  } = useMenuStore();

  // Category Modal State
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // Bulk Selection Mode
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Collapsed Category IDs map (Default: all expanded)
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    loadMenu();
  }, []);

  const stats = getMenuStats();
  const filteredDishes = getFilteredDishes();

  // Group filtered dishes by category
  const dishesByCategoryMap = useMemo(() => {
    const map = new Map<string, Dish[]>();
    categories.forEach((cat) => {
      const catDishes = filteredDishes
        .filter((d) => d.categoryId === cat.id)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      map.set(cat.id, catDishes);
    });
    return map;
  }, [categories, filteredDishes]);

  // Toggle Category Collapse
  const toggleCollapseCategory = (catId: string) => {
    setCollapsedCategoryIds((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Reorder Category (Up/Down)
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const ordered = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const temp = ordered[index];
    ordered[index] = ordered[targetIndex];
    ordered[targetIndex] = temp;

    await reorderCategories(ordered.map((c) => c.id));
  };

  // Reorder Dish (Up/Down within category)
  const handleMoveDish = async (categoryId: string, dishIndex: number, direction: 'up' | 'down') => {
    const catDishes = (dishesByCategoryMap.get(categoryId) || []).sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    const targetIndex = direction === 'up' ? dishIndex - 1 : dishIndex + 1;
    if (targetIndex < 0 || targetIndex >= catDishes.length) return;

    const ordered = [...catDishes];
    const temp = ordered[dishIndex];
    ordered[dishIndex] = ordered[targetIndex];
    ordered[targetIndex] = temp;

    await reorderDishes(categoryId, ordered.map((d) => d.id));
  };

  // Delete Category Confirmation
  const handleDeleteCategory = (cat: Category) => {
    const dishCount = dishes.filter((d) => d.categoryId === cat.id).length;
    Alert.alert(
      `Delete "${cat.name}" Category?`,
      `This category currently has ${dishCount} dish(es). Deleting it will also remove all its dishes. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory(cat.id),
        },
      ]
    );
  };

  // Delete Dish Confirmation
  const handleDeleteDish = (dish: Dish) => {
    Alert.alert(
      `Delete "${dish.name}"?`,
      'Are you sure you want to permanently remove this dish from your menu?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Dish',
          style: 'destructive',
          onPress: () => deleteDish(dish.id),
        },
      ]
    );
  };

  // Duplicate Dish Handler
  const handleDuplicateDish = async (dishId: string) => {
    try {
      const duplicated = await duplicateDish(dishId);
      if (duplicated) {
        Alert.alert('Dish Duplicated', `"${duplicated.name}" has been created. You can now edit its details.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Bulk Actions
  const handleBulkActivate = async () => {
    if (selectedDishIdsForBulk.length === 0) return;
    await bulkUpdateDishStatus(selectedDishIdsForBulk, true);
    setIsBulkMode(false);
  };

  const handleBulkDeactivate = async () => {
    if (selectedDishIdsForBulk.length === 0) return;
    await bulkUpdateDishStatus(selectedDishIdsForBulk, false);
    setIsBulkMode(false);
  };

  const handleBulkDelete = () => {
    if (selectedDishIdsForBulk.length === 0) return;
    Alert.alert(
      `Delete ${selectedDishIdsForBulk.length} Selected Dishes?`,
      'This will permanently delete the selected dishes from your menu.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete ${selectedDishIdsForBulk.length} Dishes`,
          style: 'destructive',
          onPress: async () => {
            await bulkDeleteDishes(selectedDishIdsForBulk);
            setIsBulkMode(false);
          },
        },
      ]
    );
  };

  const getDietaryBadge = (type: string) => {
    switch (type) {
      case 'veg':
        return { color: '#16A34A', label: 'Veg' };
      case 'non-veg':
        return { color: '#EF4444', label: 'Non-Veg' };
      case 'egg':
        return { color: '#E8C547', label: 'Egg' };
      case 'vegan':
        return { color: '#06B6D4', label: 'Vegan' };
      default:
        return { color: '#16A34A', label: 'Veg' };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#E8C547" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Menu Management</Text>
          <Text style={styles.headerSubtitle}>Categories → Dishes → Customizations</Text>
        </View>

        {/* Quick Actions (Preview Menu & Add Category) */}
        <View style={styles.headerActionBtns}>
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => router.push('/menu-preview')}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={14} color="#E8C547" />
            <Text style={styles.previewBtnText}>Preview</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addCategoryBtn}
            onPress={() => {
              setCategoryToEdit(null);
              setIsCategoryModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#0B0B0B" />
            <Text style={styles.addCategoryBtnText}>Category</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Metrics Cards */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={[styles.statCard, { borderColor: '#E8C547' }]}>
            <Text style={[styles.statValue, { color: '#E8C547' }]}>{stats.totalCategories}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.totalDishes}</Text>
            <Text style={styles.statLabel}>Total Dishes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{stats.activeDishes}</Text>
            <Text style={styles.statLabel}>Active Online</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.inactiveDishes}</Text>
            <Text style={styles.statLabel}>Unavailable</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#E8C547' }]}>{stats.unavailableToday}</Text>
            <Text style={styles.statLabel}>Out of Hours</Text>
          </View>
        </ScrollView>
      </View>

      {/* Search & Filter Controls */}
      <View style={styles.filterSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#E8C547" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search dish, category or description..."
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

          {/* Bulk Mode Toggle */}
          <TouchableOpacity
            style={[styles.bulkModeBtn, isBulkMode && styles.bulkModeBtnActive]}
            onPress={() => {
              const next = !isBulkMode;
              setIsBulkMode(next);
              if (!next) clearBulkSelection();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isBulkMode ? 'checkbox' : 'checkbox-outline'}
              size={16}
              color={isBulkMode ? '#0B0B0B' : '#E8C547'}
            />
            <Text style={[styles.bulkModeText, isBulkMode && styles.bulkModeTextActive]}>
              {isBulkMode ? 'Done' : 'Bulk'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow} contentContainerStyle={{ gap: 6 }}>
          {FILTER_OPTIONS.map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bulk Action Floating Bar */}
      {isBulkMode && (
        <View style={styles.bulkActionBar}>
          <View style={styles.bulkCountRow}>
            <Text style={styles.bulkCountText}>
              {selectedDishIdsForBulk.length} Selected
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedDishIdsForBulk.length === filteredDishes.length) {
                  clearBulkSelection();
                } else {
                  selectAllDishesForBulk(filteredDishes.map((d) => d.id));
                }
              }}
            >
              <Text style={styles.selectAllText}>
                {selectedDishIdsForBulk.length === filteredDishes.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bulkBtnsRow}>
            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: '#16A34A' }]}
              onPress={handleBulkActivate}
              disabled={selectedDishIdsForBulk.length === 0}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bulkBtnText}>Activate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: '#191919', borderWidth: 1, borderColor: '#2A2A2A' }]}
              onPress={handleBulkDeactivate}
              disabled={selectedDishIdsForBulk.length === 0}
            >
              <Ionicons name="pause-circle-outline" size={16} color="#FFFFFF" />
              <Text style={[styles.bulkBtnText, { color: '#FFFFFF' }]}>Deactivate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkActionBtn, { backgroundColor: '#EF4444' }]}
              onPress={handleBulkDelete}
              disabled={selectedDishIdsForBulk.length === 0}
            >
              <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bulkBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Categories & Dishes List */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {categories.length === 0 ? (
          <View style={styles.emptyCategoriesView}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="fast-food-outline" size={42} color="#E8C547" />
            </View>
            <Text style={styles.emptyCategoriesTitle}>No Categories Created</Text>
            <Text style={styles.emptyCategoriesSubtitle}>
              Get started by creating your first food category (e.g. Burgers, Ice Cream, Pizzas).
            </Text>
            <TouchableOpacity
              style={styles.createFirstCatBtn}
              onPress={() => {
                setCategoryToEdit(null);
                setIsCategoryModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#0B0B0B" />
              <Text style={styles.createFirstCatBtnText}>Add First Category</Text>
            </TouchableOpacity>
          </View>
        ) : (
          categories
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((cat, catIndex) => {
              const catDishes = dishesByCategoryMap.get(cat.id) || [];
              const isCollapsed = !!collapsedCategoryIds[cat.id];

              return (
                <View key={cat.id} style={styles.categoryCard}>
                  {/* Category Header Row */}
                  <View style={styles.categoryHeader}>
                    <TouchableOpacity
                      style={styles.catTitlePressable}
                      onPress={() => toggleCollapseCategory(cat.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.catEmojiBox}>
                        <Text style={styles.catEmoji}>{cat.icon || '📁'}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={styles.catNameRow}>
                          <Text style={styles.catName}>{cat.name}</Text>
                          <View
                            style={[
                              styles.catStatusPill,
                              cat.isActive ? styles.catStatusPillActive : styles.catStatusPillInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.catStatusText,
                                cat.isActive ? styles.catStatusTextActive : styles.catStatusTextInactive,
                              ]}
                            >
                              {cat.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.catDishCount}>
                          {catDishes.length} {catDishes.length === 1 ? 'Dish' : 'Dishes'}
                        </Text>
                      </View>
                      <View style={styles.chevronCircle}>
                        <Ionicons
                          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                          size={16}
                          color="#E8C547"
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Category Action Icons */}
                    <View style={styles.catActionToolsRow}>
                      {/* Move Up */}
                      <TouchableOpacity
                        style={[styles.catToolBtn, catIndex === 0 && { opacity: 0.3 }]}
                        onPress={() => handleMoveCategory(catIndex, 'up')}
                        disabled={catIndex === 0}
                      >
                        <Ionicons name="arrow-up" size={14} color="#8E8E8E" />
                      </TouchableOpacity>

                      {/* Move Down */}
                      <TouchableOpacity
                        style={[
                          styles.catToolBtn,
                          catIndex === categories.length - 1 && { opacity: 0.3 },
                        ]}
                        onPress={() => handleMoveCategory(catIndex, 'down')}
                        disabled={catIndex === categories.length - 1}
                      >
                        <Ionicons name="arrow-down" size={14} color="#8E8E8E" />
                      </TouchableOpacity>

                      {/* Toggle Active/Inactive */}
                      <TouchableOpacity
                        style={styles.catToolBtn}
                        onPress={() => toggleCategoryStatus(cat.id)}
                      >
                        <Ionicons
                          name={cat.isActive ? 'eye-outline' : 'eye-off-outline'}
                          size={15}
                          color={cat.isActive ? '#16A34A' : '#EF4444'}
                        />
                      </TouchableOpacity>

                      {/* Edit Category */}
                      <TouchableOpacity
                        style={styles.catToolBtn}
                        onPress={() => {
                          setCategoryToEdit(cat);
                          setIsCategoryModalVisible(true);
                        }}
                      >
                        <Ionicons name="create-outline" size={15} color="#E8C547" />
                      </TouchableOpacity>

                      {/* Delete Category */}
                      <TouchableOpacity
                        style={styles.catToolBtn}
                        onPress={() => handleDeleteCategory(cat)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </TouchableOpacity>

                      {/* Add Dish inside this Category */}
                      <TouchableOpacity
                        style={styles.addDishSmallBtn}
                        onPress={() => router.push(`/dish-editor?categoryId=${cat.id}`)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="add" size={14} color="#0B0B0B" />
                        <Text style={styles.addDishSmallBtnText}>Add Dish</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Category Dishes List (if expanded) */}
                  {!isCollapsed && (
                    <View style={styles.dishesListWrapper}>
                      {catDishes.length === 0 ? (
                        <View style={styles.emptyDishesBox}>
                          <Text style={styles.emptyDishesText}>No dishes added yet in {cat.name}</Text>
                          <TouchableOpacity
                            style={styles.addFirstDishBtn}
                            onPress={() => router.push(`/dish-editor?categoryId=${cat.id}`)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="add-circle-outline" size={16} color="#E8C547" />
                            <Text style={styles.addFirstDishBtnText}>+ Add Dish to {cat.name}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        catDishes.map((dish, dishIndex) => {
                          const isAvailableNow = isDishAvailableNow(dish);
                          const dietaryBadge = getDietaryBadge(dish.dietaryType);
                          const isBulkSelected = selectedDishIdsForBulk.includes(dish.id);

                          return (
                            <View
                              key={dish.id}
                              style={[
                                styles.dishItemCard,
                                !dish.isAvailable && styles.dishItemCardUnavailable,
                                isBulkSelected && styles.dishItemCardSelected,
                              ]}
                            >
                              {/* Bulk Checkbox (if in bulk mode) */}
                              {isBulkMode && (
                                <TouchableOpacity
                                  style={styles.bulkItemCheckbox}
                                  onPress={() => toggleSelectDishForBulk(dish.id)}
                                >
                                  <Ionicons
                                    name={isBulkSelected ? 'checkbox' : 'square-outline'}
                                    size={20}
                                    color={isBulkSelected ? '#E8C547' : '#8E8E8E'}
                                  />
                                </TouchableOpacity>
                              )}

                              {/* Dish Image Thumbnail */}
                              {dish.image ? (
                                <Image
                                  source={{ uri: dish.image }}
                                  style={styles.dishThumb}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.dishThumbPlaceholder}>
                                  <Ionicons name="restaurant-outline" size={20} color="#8E8E8E" />
                                </View>
                              )}

                              {/* Dish Details */}
                              <View style={styles.dishDetailsColumn}>
                                {/* Dietary Badge & Name */}
                                <View style={styles.dishTitleRow}>
                                  <View
                                    style={[
                                      styles.dietaryMiniSquare,
                                      { borderColor: dietaryBadge.color },
                                    ]}
                                  >
                                    <View
                                      style={[
                                        styles.dietaryMiniDot,
                                        { backgroundColor: dietaryBadge.color },
                                      ]}
                                    />
                                  </View>
                                  <Text style={styles.dishItemName} numberOfLines={1}>
                                    {dish.name}
                                  </Text>
                                </View>

                                {/* Pricing & Badges */}
                                <View style={styles.dishPriceBadgesRow}>
                                  <Text style={styles.dishItemPrice}>
                                    {dish.hasVariants && dish.variants.length > 0
                                      ? `From ₹${Math.min(...dish.variants.map((v) => v.price))}`
                                      : `₹${dish.basePrice}`}
                                  </Text>

                                  {dish.hasVariants && dish.variants.length > 0 && (
                                    <View style={styles.variantBadgePill}>
                                      <Text style={styles.variantBadgePillText}>
                                        {dish.variants.length} Var
                                      </Text>
                                    </View>
                                  )}

                                  {dish.customizationGroups.length > 0 && (
                                    <View style={styles.addonBadgePill}>
                                      <Text style={styles.addonBadgePillText}>
                                        {dish.customizationGroups.reduce(
                                          (acc, g) => acc + g.addOns.length,
                                          0
                                        )}{' '}
                                        Addons
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                {/* Schedule Notice if active */}
                                {dish.hasSchedule && (
                                  <View style={styles.scheduleTagRow}>
                                    <Ionicons name="time-outline" size={11} color="#E8C547" />
                                    <Text style={styles.scheduleTagText}>
                                      {dish.scheduleStartTime} - {dish.scheduleEndTime}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Quick Availability Toggle & Dish Actions */}
                              <View style={styles.dishActionsColumn}>
                                {/* Quick Availability Switch */}
                                <TouchableOpacity
                                  style={[
                                    styles.quickAvailTrack,
                                    dish.isAvailable
                                      ? styles.quickAvailTrackActive
                                      : styles.quickAvailTrackInactive,
                                  ]}
                                  onPress={() => toggleDishAvailability(dish.id)}
                                  activeOpacity={0.8}
                                >
                                  <View
                                    style={[
                                      styles.quickAvailThumb,
                                      dish.isAvailable
                                        ? styles.quickAvailThumbActive
                                        : styles.quickAvailThumbInactive,
                                    ]}
                                  />
                                </TouchableOpacity>
                                <Text
                                  style={[
                                    styles.quickAvailLabel,
                                    dish.isAvailable
                                      ? styles.quickAvailLabelActive
                                      : styles.quickAvailLabelInactive,
                                  ]}
                                >
                                  {dish.isAvailable ? 'In Stock' : 'Out'}
                                </Text>

                                {/* Tools: Edit, Duplicate, Delete, Reorder */}
                                <View style={styles.dishToolsGrid}>
                                  <TouchableOpacity
                                    style={styles.dishToolBtn}
                                    onPress={() =>
                                      router.push(`/dish-editor?dishId=${dish.id}&categoryId=${cat.id}`)
                                    }
                                  >
                                    <Ionicons name="create-outline" size={14} color="#E8C547" />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.dishToolBtn}
                                    onPress={() => handleDuplicateDish(dish.id)}
                                  >
                                    <Ionicons name="copy-outline" size={14} color="#38BDF8" />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.dishToolBtn}
                                    onPress={() => handleDeleteDish(dish)}
                                  >
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[styles.dishToolBtn, dishIndex === 0 && { opacity: 0.3 }]}
                                    onPress={() => handleMoveDish(cat.id, dishIndex, 'up')}
                                    disabled={dishIndex === 0}
                                  >
                                    <Ionicons
                                      name="chevron-up"
                                      size={14}
                                      color="#8E8E8E"
                                    />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[
                                      styles.dishToolBtn,
                                      dishIndex === catDishes.length - 1 && { opacity: 0.3 },
                                    ]}
                                    onPress={() => handleMoveDish(cat.id, dishIndex, 'down')}
                                    disabled={dishIndex === catDishes.length - 1}
                                  >
                                    <Ionicons
                                      name="chevron-down"
                                      size={14}
                                      color="#8E8E8E"
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            })
        )}
      </ScrollView>

      {/* Category Create / Edit Modal */}
      <CategoryModal
        visible={isCategoryModalVisible}
        categoryToEdit={categoryToEdit}
        onClose={() => setIsCategoryModalVisible(false)}
        onSave={async (categoryData) => {
          if (categoryToEdit) {
            await updateCategory(categoryToEdit.id, categoryData);
          } else {
            await addCategory(categoryData);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },

  /* TOP BAR */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
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
  headerActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#E8C547',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 4,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addCategoryBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0B0B0B',
    marginLeft: 2,
  },

  /* STATS CONTAINER */
  statsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  statsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statCard: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 85,
  },
  statValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },

  /* FILTER & SEARCH SECTION */
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  bulkModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bulkModeBtnActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  bulkModeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 4,
  },
  bulkModeTextActive: {
    color: '#0B0B0B',
  },
  filterChipsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterChipActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderColor: '#E8C547',
  },
  filterChipText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  filterChipTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },

  /* BULK ACTION BAR */
  bulkActionBar: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
  },
  bulkCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bulkCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectAllText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
  },
  bulkBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 8,
  },
  bulkBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },

  /* MAIN SCROLL */
  mainScroll: {
    flex: 1,
    paddingTop: 6,
  },
  emptyCategoriesView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCategoriesTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCategoriesSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E8E',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  createFirstCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 18,
  },
  createFirstCatBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#0B0B0B',
    marginLeft: 6,
  },

  /* CATEGORY CARD */
  categoryCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
    overflow: 'hidden',
  },
  categoryHeader: {
    backgroundColor: '#141414',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  catTitlePressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catEmojiBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catEmoji: {
    fontSize: 20,
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  catStatusPillActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  catStatusPillInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  catStatusText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    fontWeight: '700',
  },
  catStatusTextActive: {
    color: '#16A34A',
  },
  catStatusTextInactive: {
    color: '#EF4444',
  },
  catDishCount: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catActionToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 6,
  },
  catToolBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDishSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 4,
  },
  addDishSmallBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0B0B0B',
    marginLeft: 2,
  },

  /* DISHES LIST WRAPPER */
  dishesListWrapper: {
    padding: 10,
    gap: 8,
  },
  emptyDishesBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyDishesText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  addFirstDishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addFirstDishBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 4,
  },
  dishItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 10,
  },
  dishItemCardUnavailable: {
    opacity: 0.6,
  },
  dishItemCardSelected: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.06)',
  },
  bulkItemCheckbox: {
    paddingRight: 8,
  },
  dishThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  dishThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishDetailsColumn: {
    flex: 1,
    paddingHorizontal: 10,
  },
  dishTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dietaryMiniSquare: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  dietaryMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dishItemName: {
    flex: 1,
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dishPriceBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dishItemPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  variantBadgePill: {
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  variantBadgePillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  addonBadgePill: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  addonBadgePillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5,
    fontWeight: '700',
    color: '#38BDF8',
  },
  scheduleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleTagText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10,
    fontWeight: '400',
    color: '#E8C547',
    marginLeft: 3,
  },
  dishActionsColumn: {
    alignItems: 'flex-end',
  },
  quickAvailTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
  },
  quickAvailTrackActive: {
    backgroundColor: '#16A34A',
  },
  quickAvailTrackInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickAvailThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  quickAvailThumbActive: {
    alignSelf: 'flex-end',
  },
  quickAvailThumbInactive: {
    alignSelf: 'flex-start',
  },
  quickAvailLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 4,
  },
  quickAvailLabelActive: {
    color: '#16A34A',
  },
  quickAvailLabelInactive: {
    color: '#8E8E8E',
  },
  dishToolsGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  dishToolBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


