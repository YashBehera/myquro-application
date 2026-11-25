import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Star,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Bike,
  Utensils,
  MessageSquare,
  Lock,
  CheckCircle2,
} from 'lucide-react-native';
import { getSafeTopPadding, getSafeBottomPadding } from '../utils/responsive';

interface OrderItem {
  id?: string;
  menuItemId?: string;
  name?: string;
  quantity?: number;
  isVeg?: boolean;
}

export interface OrderRatingSubmitResult {
  foodRating?: number;
  deliveryRating?: number;
  dishesRating: Record<string, 'up' | 'down'>;
  reviewText: string;
  compliments: string[];
  items: Array<{ id?: string; menuItemId?: string; name?: string; rating?: number }>;
}

interface OrderRatingModalProps {
  visible: boolean;
  order: any;
  initialType?: 'food' | 'delivery';
  initialRating?: number;
  existingFoodRating?: number;
  existingDeliveryRating?: number;
  isFoodLocked?: boolean;
  isDeliveryLocked?: boolean;
  onClose: () => void;
  onSubmit: (result: OrderRatingSubmitResult) => void;
}

const FOOD_COMPLIMENT_OPTIONS = [
  'Delicious 😋',
  'Super Fast ⚡',
  'Hot & Fresh ♨️',
  'Neat Packaging 🛍️',
  'Great Value 🌟',
  'Tasty & Crispy 🍗',
];

const DELIVERY_COMPLIMENT_OPTIONS = [
  'Polite & Courteous 🤝',
  'Super Fast ⚡',
  'On Time ⏱️',
  'Handled with Care 📦',
  'Great Service 🌟',
];

const FOOD_SENTIMENTS: Record<number, string> = {
  1: 'Terrible 😞',
  2: 'Disappointing 😕',
  3: 'Average 😐',
  4: 'Very Good 😊',
  5: 'Exceptional! 🌟',
};

const DELIVERY_SENTIMENTS: Record<number, string> = {
  1: 'Poor Delivery ⚠️',
  2: 'Below Expectations 😕',
  3: 'Satisfactory 👍',
  4: 'Prompt & Courteous ⚡',
  5: 'Outstanding Service! 🌟',
};

export const OrderRatingModal: React.FC<OrderRatingModalProps> = ({
  visible,
  order,
  initialType = 'food',
  initialRating = 5,
  existingFoodRating,
  existingDeliveryRating,
  isFoodLocked: propIsFoodLocked,
  isDeliveryLocked: propIsDeliveryLocked,
  onClose,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();

  // Determine locked states from props or order properties
  const isFoodLocked = Boolean(
    propIsFoodLocked ||
    order?.foodLocked ||
    order?.isFoodLocked ||
    (existingFoodRating && existingFoodRating > 0)
  );

  const isDeliveryLocked = Boolean(
    propIsDeliveryLocked ||
    order?.deliveryLocked ||
    order?.isDeliveryLocked ||
    (existingDeliveryRating && existingDeliveryRating > 0)
  );

  const resolvedExistingFood = existingFoodRating || order?.foodRating || order?.food || 0;
  const resolvedExistingDelivery = existingDeliveryRating || order?.deliveryRating || order?.delivery || 0;

  // Rating values
  const [foodRating, setFoodRating] = useState<number>(0);
  const [deliveryRating, setDeliveryRating] = useState<number>(0);

  // Flags to track whether the user explicitly interacted with each section in this session
  const [userTouchedFood, setUserTouchedFood] = useState<boolean>(false);
  const [userTouchedDelivery, setUserTouchedDelivery] = useState<boolean>(false);

  const [reviewText, setReviewText] = useState<string>('');
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([]);
  const [dishesRating, setDishesRating] = useState<Record<string, 'up' | 'down'>>({});
  const [isReviewFocused, setIsReviewFocused] = useState<boolean>(false);

  // Accordion active section ('dishes' | 'review' | 'delivery' | null)
  const [expandedSection, setExpandedSection] = useState<'dishes' | 'review' | 'delivery' | null>('dishes');

  // Synchronize state when modal opens or initial parameters change
  useEffect(() => {
    if (visible) {
      if (initialType === 'delivery') {
        if (!isDeliveryLocked) {
          setDeliveryRating(initialRating || 5);
          setUserTouchedDelivery(true);
        } else {
          setDeliveryRating(resolvedExistingDelivery || 5);
          setUserTouchedDelivery(false);
        }

        if (!isFoodLocked) {
          setFoodRating(resolvedExistingFood || 0);
          setUserTouchedFood(Boolean(resolvedExistingFood > 0));
        } else {
          setFoodRating(resolvedExistingFood || 5);
          setUserTouchedFood(false);
        }

        setExpandedSection('delivery');
      } else {
        // initialType === 'food'
        if (!isFoodLocked) {
          setFoodRating(initialRating || 5);
          setUserTouchedFood(true);
        } else {
          setFoodRating(resolvedExistingFood || 5);
          setUserTouchedFood(false);
        }

        if (!isDeliveryLocked) {
          setDeliveryRating(resolvedExistingDelivery || 0);
          setUserTouchedDelivery(Boolean(resolvedExistingDelivery > 0));
        } else {
          setDeliveryRating(resolvedExistingDelivery || 5);
          setUserTouchedDelivery(false);
        }

        // If food is locked but delivery is unlocked, default to opening delivery accordion
        if (isFoodLocked && !isDeliveryLocked) {
          setExpandedSection('delivery');
        } else {
          setExpandedSection('dishes');
        }
      }

      setReviewText('');
      setSelectedCompliments([]);
      setDishesRating({});
    }
  }, [visible, initialType, initialRating, isFoodLocked, isDeliveryLocked, resolvedExistingFood, resolvedExistingDelivery]);

  // Parse items from order
  const orderItems: OrderItem[] = useMemo(() => {
    if (!order) return [];
    let raw: any[] = [];
    if (Array.isArray(order.items)) {
      raw = order.items;
    } else if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        if (Array.isArray(parsed)) raw = parsed;
      } catch (e) {}
    }

    if (raw.length === 0) {
      return [{ id: 'item_1', name: 'Meal Order Items', quantity: 1, isVeg: true }];
    }

    return raw.map((it, idx) => ({
      id: String(it.id || it.itemId || it.menuItemId || `dish_${idx}`),
      menuItemId: it.menuItemId || it.id,
      name: it.name || it.itemName || it.title || `Dish ${idx + 1}`,
      quantity: Number(it.quantity || it.qty || 1),
      isVeg: it.isVeg ?? it.is_veg ?? false,
    }));
  }, [order]);

  const restaurantName =
    order?.restaurantName ||
    order?.restaurant?.restaurantName ||
    order?.restaurant?.name ||
    order?.outletName ||
    'Restaurant';

  const riderName =
    order?.riderName ||
    order?.driverName ||
    order?.rider?.name ||
    order?.deliveryPartnerName ||
    'Delivery Partner';

  const orderId = String(order?.id || order?.orderId || '');
  const shortOrderId = orderId.length > 8 ? orderId.slice(-8).toUpperCase() : orderId.toUpperCase();

  const toggleAccordion = (section: 'dishes' | 'review' | 'delivery') => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleDishThumb = (dishId: string, thumb: 'up' | 'down') => {
    if (isFoodLocked) return;
    setUserTouchedFood(true);
    setDishesRating((prev) => ({
      ...prev,
      [dishId]: prev[dishId] === thumb ? (null as any) : thumb,
    }));
  };

  const toggleCompliment = (tag: string) => {
    setSelectedCompliments((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Determine which sections will actually be submitted
  const willSubmitFood = !isFoodLocked && (userTouchedFood || foodRating > 0);
  const willSubmitDelivery = !isDeliveryLocked && (userTouchedDelivery || deliveryRating > 0);
  const canSubmit = willSubmitFood || willSubmitDelivery;

  const getSubmitButtonLabel = (): string => {
    if (willSubmitFood && willSubmitDelivery) return 'Submit All Ratings';
    if (willSubmitFood) return 'Submit Meal Review';
    if (willSubmitDelivery) return 'Submit Delivery Rating';
    return 'Select Rating to Submit';
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert(
        'Rating Required',
        isFoodLocked
          ? 'Please select a star rating for your delivery partner.'
          : isDeliveryLocked
          ? 'Please select a star rating for your meal.'
          : 'Please select a star rating for your meal or delivery partner.'
      );
      return;
    }

    // Prepare items list with individual scores
    const itemsPayload = orderItems.map((dish) => {
      const dishThumb = dish.id ? dishesRating[dish.id] : undefined;
      const calculatedRating = dishThumb === 'up' ? 5 : dishThumb === 'down' ? 2 : (foodRating || 5);
      return {
        id: dish.id,
        menuItemId: dish.menuItemId || dish.id,
        name: dish.name,
        rating: calculatedRating,
      };
    });

    onSubmit({
      foodRating: willSubmitFood ? (foodRating || 5) : undefined,
      deliveryRating: willSubmitDelivery ? (deliveryRating || 5) : undefined,
      dishesRating,
      reviewText: reviewText.trim(),
      compliments: selectedCompliments,
      items: itemsPayload,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: getSafeTopPadding(insets.top, 12) }]}>
        {/* ─── TOP HEADER ─── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={20} color="#DEA430" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Utensils size={14} color="#DEA430" style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Meal from {restaurantName}
              </Text>
            </View>
            {shortOrderId ? (
              <Text style={styles.headerSubtitle}>Order #{shortOrderId}</Text>
            ) : null}
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getSafeBottomPadding(insets.bottom, 110) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── MEAL RATING SECTION (5 LARGE STARS) ─── */}
          <View style={styles.mealRatingCard}>
            <View style={styles.mealRatingHeader}>
              <Text style={styles.mealRatingPrompt}>How was your meal?</Text>
              {isFoodLocked ? (
                <View style={styles.lockedBadge}>
                  <Lock size={11} color="#DEA430" style={{ marginRight: 4 }} />
                  <Text style={styles.lockedBadgeText}>Meal Rated ★ {resolvedExistingFood || foodRating}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.starsWrapper}>
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isSelected = starVal <= (isFoodLocked ? resolvedExistingFood : foodRating);
                return (
                  <TouchableOpacity
                    key={starVal}
                    style={styles.starTouchItem}
                    activeOpacity={isFoodLocked ? 1 : 0.7}
                    disabled={isFoodLocked}
                    onPress={() => {
                      setFoodRating(starVal);
                      setUserTouchedFood(true);
                    }}
                  >
                    <Star
                      size={36}
                      color="#DEA430"
                      fill={isSelected ? '#DEA430' : 'transparent'}
                      strokeWidth={isSelected ? 1 : 1.5}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sentimentText}>
              {isFoodLocked
                ? `You rated this meal ${resolvedExistingFood || foodRating} stars`
                : foodRating > 0
                ? FOOD_SENTIMENTS[foodRating] || 'Tap to rate'
                : 'Tap a star to rate your meal'}
            </Text>
          </View>

          {/* ─── ACCORDION 1: RATE ORDERED DISHES ─── */}
          <View style={[styles.accordionCard, expandedSection === 'dishes' && styles.accordionCardActive]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion('dishes')}
              activeOpacity={0.8}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={styles.accordionIconCircle}>
                  <Utensils size={15} color="#DEA430" />
                </View>
                <View>
                  <Text style={styles.accordionHeaderText}>Rate your ordered dishes</Text>
                  <Text style={styles.accordionHeaderSubtext}>
                    {orderItems.length} {orderItems.length === 1 ? 'dish' : 'dishes'} in this order
                  </Text>
                </View>
              </View>

              <View style={styles.accordionHeaderRight}>
                {Object.keys(dishesRating).length > 0 ? (
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>{Object.keys(dishesRating).length} rated</Text>
                  </View>
                ) : null}
                {expandedSection === 'dishes' ? (
                  <ChevronUp size={20} color="#DEA430" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {expandedSection === 'dishes' && (
              <View style={styles.accordionBody}>
                <View style={styles.accordionInnerDivider} />
                {orderItems.map((dish, idx) => {
                  const dishThumb = dish.id ? dishesRating[dish.id] : undefined;
                  const isUp = dishThumb === 'up';
                  const isDown = dishThumb === 'down';

                  return (
                    <View key={dish.id || idx} style={styles.dishRow}>
                      <View style={styles.dishInfoCol}>
                        <View style={styles.dishVegBadgeRow}>
                          <View
                            style={[
                              styles.vegIndicatorSquare,
                              { borderColor: dish.isVeg ? '#10B981' : '#EF4444' },
                            ]}
                          >
                            <View
                              style={[
                                styles.vegIndicatorDot,
                                { backgroundColor: dish.isVeg ? '#10B981' : '#EF4444' },
                              ]}
                            />
                          </View>
                          <Text style={styles.dishNameText} numberOfLines={2}>
                            {dish.name}
                          </Text>
                        </View>
                        {dish.quantity && dish.quantity > 1 ? (
                          <Text style={styles.dishQtyText}>Qty: {dish.quantity}</Text>
                        ) : null}
                      </View>

                      <View style={styles.dishThumbsRow}>
                        {/* Thumbs Up Button */}
                        <TouchableOpacity
                          style={[
                            styles.thumbBtn,
                            isUp && styles.thumbBtnUpActive,
                            isFoodLocked && { opacity: 0.5 },
                          ]}
                          disabled={isFoodLocked}
                          activeOpacity={0.7}
                          onPress={() => dish.id && handleDishThumb(dish.id, 'up')}
                        >
                          <ThumbsUp
                            size={16}
                            color={isUp ? '#10B981' : '#888888'}
                            fill={isUp ? '#10B981' : 'transparent'}
                          />
                        </TouchableOpacity>

                        {/* Thumbs Down Button */}
                        <TouchableOpacity
                          style={[
                            styles.thumbBtn,
                            isDown && styles.thumbBtnDownActive,
                            isFoodLocked && { opacity: 0.5 },
                          ]}
                          disabled={isFoodLocked}
                          activeOpacity={0.7}
                          onPress={() => dish.id && handleDishThumb(dish.id, 'down')}
                        >
                          <ThumbsDown
                            size={16}
                            color={isDown ? '#EF4444' : '#888888'}
                            fill={isDown ? '#EF4444' : 'transparent'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ─── ACCORDION 2: ADD A DETAILED REVIEW ─── */}
          <View style={[styles.accordionCard, expandedSection === 'review' && styles.accordionCardActive]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion('review')}
              activeOpacity={0.8}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={styles.accordionIconCircle}>
                  <MessageSquare size={15} color="#DEA430" />
                </View>
                <View>
                  <Text style={styles.accordionHeaderText}>Add a detailed review</Text>
                  <Text style={styles.accordionHeaderSubtext}>Tell us about taste, portions & packaging</Text>
                </View>
              </View>

              <View style={styles.accordionHeaderRight}>
                {reviewText.trim().length > 0 || selectedCompliments.length > 0 ? (
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>Added</Text>
                  </View>
                ) : null}
                {expandedSection === 'review' ? (
                  <ChevronUp size={20} color="#DEA430" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {expandedSection === 'review' && (
              <View style={styles.accordionBody}>
                <View style={styles.accordionInnerDivider} />

                {/* Compliments Chips */}
                <Text style={styles.reviewSublabel}>What did you love about this meal?</Text>
                <View style={styles.chipsContainer}>
                  {FOOD_COMPLIMENT_OPTIONS.map((tag) => {
                    const isSelected = selectedCompliments.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.chipItem,
                          isSelected && styles.chipItemSelected,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => toggleCompliment(tag)}
                      >
                        <Text
                          style={[
                            styles.chipItemText,
                            isSelected && styles.chipItemTextSelected,
                          ]}
                        >
                          {tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Review Text Input */}
                <View style={[styles.reviewInputWrapper, isReviewFocused && styles.reviewInputWrapperFocused]}>
                  <TextInput
                    style={styles.reviewTextInput}
                    placeholder="Share details of your experience with the food, taste and presentation..."
                    placeholderTextColor="#555555"
                    multiline
                    maxLength={300}
                    numberOfLines={4}
                    value={reviewText}
                    onFocus={() => setIsReviewFocused(true)}
                    onBlur={() => setIsReviewFocused(false)}
                    onChangeText={setReviewText}
                  />
                  <Text style={styles.charCountText}>{reviewText.length}/300</Text>
                </View>
              </View>
            )}
          </View>

          {/* ─── ACCORDION 3: RATE DELIVERY PARTNER ─── */}
          <View style={[styles.accordionCard, expandedSection === 'delivery' && styles.accordionCardActive]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion('delivery')}
              activeOpacity={0.8}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={styles.accordionIconCircle}>
                  <Bike size={16} color="#DEA430" />
                </View>
                <View>
                  <Text style={styles.accordionHeaderText}>Rate your delivery partner</Text>
                  <Text style={styles.accordionHeaderSubtext}>Delivered by {(riderName || 'RIDER').toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.accordionHeaderRight}>
                {isDeliveryLocked ? (
                  <View style={styles.lockedBadgeSmall}>
                    <Lock size={10} color="#DEA430" style={{ marginRight: 3 }} />
                    <Text style={styles.lockedBadgeSmallText}>★ {resolvedExistingDelivery || deliveryRating}</Text>
                  </View>
                ) : deliveryRating > 0 ? (
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>★ {deliveryRating}</Text>
                  </View>
                ) : null}
                {expandedSection === 'delivery' ? (
                  <ChevronUp size={20} color="#DEA430" />
                ) : (
                  <ChevronDown size={20} color="#666666" />
                )}
              </View>
            </TouchableOpacity>

            {expandedSection === 'delivery' && (
              <View style={styles.accordionBody}>
                <View style={styles.accordionInnerDivider} />

                {/* Rider Info Row */}
                <View style={styles.riderInfoRow}>
                  <View style={styles.riderAvatarCircle}>
                    <Bike size={18} color="#000000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.riderLabel}>Delivery Partner</Text>
                    <Text style={styles.riderNameText}>{(riderName || 'DELIVERY PARTNER').toUpperCase()}</Text>
                  </View>
                  {isDeliveryLocked ? (
                    <View style={styles.lockedBadge}>
                      <Lock size={11} color="#DEA430" style={{ marginRight: 4 }} />
                      <Text style={styles.lockedBadgeText}>Rated ★ {resolvedExistingDelivery || deliveryRating}</Text>
                    </View>
                  ) : null}
                </View>

                {/* 5 Delivery Stars */}
                <View style={styles.deliveryStarsRow}>
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isSelected = starVal <= (isDeliveryLocked ? resolvedExistingDelivery : deliveryRating);
                    return (
                      <TouchableOpacity
                        key={starVal}
                        style={styles.deliveryStarTouch}
                        activeOpacity={isDeliveryLocked ? 1 : 0.7}
                        disabled={isDeliveryLocked}
                        onPress={() => {
                          setDeliveryRating(starVal);
                          setUserTouchedDelivery(true);
                        }}
                      >
                        <Star
                          size={30}
                          color="#DEA430"
                          fill={isSelected ? '#DEA430' : 'transparent'}
                          strokeWidth={isSelected ? 1 : 1.5}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.deliverySentimentText}>
                  {isDeliveryLocked
                    ? `Delivery rated ${resolvedExistingDelivery || deliveryRating} stars`
                    : deliveryRating > 0
                    ? DELIVERY_SENTIMENTS[deliveryRating] || 'Tap to rate'
                    : 'Tap a star to rate delivery service'}
                </Text>

                {/* Delivery Compliment Chips */}
                {!isDeliveryLocked ? (
                  <View style={styles.chipsContainer}>
                    {DELIVERY_COMPLIMENT_OPTIONS.map((tag) => {
                      const isSelected = selectedCompliments.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.chipItem,
                            isSelected && styles.chipItemSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => toggleCompliment(tag)}
                        >
                          <Text
                            style={[
                              styles.chipItemText,
                              isSelected && styles.chipItemTextSelected,
                            ]}
                          >
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>

        {/* ─── FIXED BOTTOM SUBMIT BUTTON (MYQURO LUXURY GOLD THEME) ─── */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              !canSubmit && styles.submitBtnDisabled,
            ]}
            activeOpacity={canSubmit ? 0.85 : 1}
            onPress={handleSubmit}
          >
            <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
              {getSubmitButtonLabel()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1814',
    backgroundColor: '#000000',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#12110D',
    borderWidth: 1,
    borderColor: '#2A2416',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11,
    color: '#DEA430',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // ─── MEAL RATING CARD ───
  mealRatingCard: {
    backgroundColor: '#0E0D0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#241E11',
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  mealRatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  mealRatingPrompt: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(222, 164, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  lockedBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#DEA430',
    fontWeight: '700',
  },
  lockedBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(222, 164, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginRight: 6,
  },
  lockedBadgeSmallText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5,
    color: '#DEA430',
    fontWeight: '700',
  },
  starsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 8,
  },
  starTouchItem: {
    padding: 4,
  },
  sentimentText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#A09786',
    marginTop: 4,
  },

  // ─── ACCORDION CARD ───
  accordionCard: {
    backgroundColor: '#0E0D0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#201B11',
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionCardActive: {
    borderColor: '#3B3019',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accordionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C170E',
    borderWidth: 1,
    borderColor: '#332712',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accordionHeaderText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  accordionHeaderSubtext: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11,
    color: '#7A7365',
    marginTop: 1,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countPill: {
    backgroundColor: 'rgba(222, 164, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    marginRight: 8,
  },
  countPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5,
    color: '#DEA430',
    fontWeight: '700',
  },
  accordionInnerDivider: {
    height: 1,
    backgroundColor: '#1A1710',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // ─── DISH ROW ───
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#17140D',
  },
  dishInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  dishVegBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vegIndicatorSquare: {
    width: 13,
    height: 13,
    borderWidth: 1.2,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  vegIndicatorDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  dishNameText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5,
    color: '#E0E0E0',
    flex: 1,
  },
  dishQtyText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#7A7365',
    marginLeft: 21,
    marginTop: 2,
  },
  dishThumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16140E',
    borderWidth: 1,
    borderColor: '#292213',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBtnUpActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  thumbBtnDownActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },

  // ─── REVIEW SECTION ───
  reviewSublabel: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#8A8273',
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chipItem: {
    backgroundColor: '#14120D',
    borderWidth: 1,
    borderColor: '#262013',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 5.5,
  },
  chipItemSelected: {
    backgroundColor: 'rgba(222, 164, 48, 0.15)',
    borderColor: '#DEA430',
  },
  chipItemText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#99907E',
  },
  chipItemTextSelected: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  reviewInputWrapper: {
    backgroundColor: '#11100C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262013',
    padding: 10,
  },
  reviewInputWrapperFocused: {
    borderColor: '#DEA430',
  },
  reviewTextInput: {
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  charCountText: {
    alignSelf: 'flex-end',
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#555146',
    marginTop: 4,
  },

  // ─── RIDER SECTION ───
  riderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  riderAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  riderLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#7A7365',
  },
  riderNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deliveryStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 10,
  },
  deliveryStarTouch: {
    padding: 4,
  },
  deliverySentimentText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#A09786',
    textAlign: 'center',
    marginBottom: 12,
  },

  // ─── FIXED BOTTOM BAR (MYQURO LUXURY GOLD THEME) ───
  bottomBar: {
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1F1B12',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: '#DEA430',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#241E12',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#000000',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  submitBtnTextDisabled: {
    color: '#6E5C33',
  },
});
