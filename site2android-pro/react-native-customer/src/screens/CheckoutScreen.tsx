/**
 * CheckoutScreen.tsx — MyQuro Customer App
 * 
 * 100% Dynamic & Pixel-Perfect Implementation matching Figma Nodes 3027:1289 & 3027:1201
 * - Header with Restaurant Name & Dropdown Address (Home | F-134, Cosmopolis...)
 * - Benefits Banner ("₹55 saved! With MyQURO benefits")
 * - Gold Club Membership Card ("Your QURO membership ends in 3 days" + Extend ₹30)
 * - Cart Items Card (Veg/Non-Veg, Variant, Stepper, Price)
 * - 3 Action Buttons (+ Add Items, ✏ Cooking requests, ☐ Cutlery Needed)
 * - SURPRISE DEALS ✦ Carousel (Countdown timer 4m:55s, 25% OFF discount cards with working '+' buttons)
 * - SAVINGS CORNER (Apply Coupon)
 * - Multi-Segment Delivery Tabs Card (Delivery Type, Tip, Instructions)
 *   * Express (⚡ 35-40mins, ₹29 -> ₹19)
 *   * Standard (40-45 mins, Minimal order grouping)
 *   * Eco Saver (45-55 mins, Lesser CO2 by order grouping)
 * - Collapsible "To Pay" Bill Accordion Card with Green Receipt icon ("To Pay ₹450 ₹395" + "₹55 saved on the total!")
 * - Cancellation Policy Note
 * - Sticky Footer Tactical Payment Bar (Paytm / Google Pay Quick Select + Unified Place Order CTA + Wallet Row)
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Image,
  ToastAndroid,
  StatusBar,
  Animated,
} from 'react-native';
import {
  X,
  Check,
  ChevronRight,
  ChevronUp,
  Plus,
  Minus,
  Sparkles,
  Banknote,
  AlertTriangle,
} from 'lucide-react-native';
import { checkCustomerServiceability, MAX_DELIVERY_RADIUS_KM } from '../utils/serviceability';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useViewModel } from '../state/MainViewModel';
import { BACKEND_URL } from '../config';
import { ApplyCouponModal } from '../components/ApplyCouponModal';
import { OrderPaymentLoaderScreen } from './OrderPaymentLoaderScreen';
import { CelebrationPoppers } from '../components/CelebrationPoppers';
import { PaymentOptionsSheet } from './PaymentOptionsSheet';
import { ChooseDeliveryAddressModal } from '../components/ChooseDeliveryAddressModal';
import { LocationSelectorSheet } from './LocationSelectorSheet';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  MAX_CONTENT_WIDTH,
  getSafeTopPadding,
  getSafeBottomPadding,
} from '../utils/responsive';

// ─── Customization Modal Assets (Parity with Restaurant Detail Screen) ─────────
const modalMascot         = require('../assets/restaurant_detail/customization_modal/modalMascot.png');       // Rabbit Mascot Character
const modalClose          = require('../assets/restaurant_detail/customization_modal/modalClose.png');        // Gold Close ✕
const dietNonVegIcon      = require('../assets/restaurant_detail/figma/imgImage12.png');                      // Non-Veg Triangle Icon

// ─── Figma Node 3027:1289 & 3027:1201 Assets ───────────────────────────────────
const checkBack             = require('../assets/checkout/figma/checkBack.png');             // Back Arrow
const checkHome             = require('../assets/checkout/figma/checkHome.png');             // Home Icon
const checkMore             = require('../assets/checkout/figma/checkMore.png');             // 3-Dots More
const checkChevronDown      = require('../assets/checkout/figma/checkChevronDown.png');      // Address Chevron Down
const checkSparkle          = require('../assets/checkout/figma/checkSparkle.png');          // Sparkle Star Icon
const checkCooking          = require('../assets/checkout/figma/checkCooking.png');          // Cooking requests pencil icon
const checkAddItems         = require('../assets/checkout/figma/checkAddItems.png');         // Add Items plus icon
const checkPlus             = require('../assets/checkout/figma/checkPlus.png');             // Stepper Plus
const checkMinus            = require('../assets/checkout/figma/checkMinus.png');            // Stepper Minus
const checkVegIcon          = require('../assets/checkout/figma/checkVegIcon.png');          // Veg Green Square Icon
const checkDealSparkle      = require('../assets/checkout/figma/checkDealSparkle.png');      // Sparkle star for Deals
const dealPlusCircle        = require('../assets/checkout/figma/dealPlusCircle.png');        // Gold Plus button on deal
const checkCouponTag        = require('../assets/checkout/figma/checkCouponTag.png');        // Orange Coupon Tag
const checkCouponChevron    = require('../assets/checkout/figma/checkCouponChevron.png');    // Coupon Arrow
const receiptGreenIcon      = require('../assets/checkout/figma/receiptGreenIcon.png');      // Green Receipt icon
const toPayChevron          = require('../assets/checkout/figma/toPayChevron.png');          // Chevron on To Pay card
const expressBolt           = require('../assets/checkout/figma/expressBolt.png');           // Lightning Bolt for Express
const quroBadgeImg          = require('../assets/images/quro_badge.png');                    // QURO Gold Badge
const radioGoldSelected     = require('../assets/checkout/figma/radioGoldSelected.png');     // Gold Selected Radio
const radioUnselected       = require('../assets/checkout/figma/radioUnselected.png');       // Radio Unselected
const PAYTM_LOGO            = require('../assets/checkout/paytm_logo.png');                  // Paytm Logo

export interface SimFoodItem {
  id: string;
  name: string;
  price: number;
  rating: number;
  ratingCount: number;
  category: string;
  isVeg: boolean;
  isEatRight: boolean;
  image: string;
  badgeOffer?: string;
  description?: string;
  mrp?: number;
  bestseller?: boolean;
  variants?: any[];
  variantId?: string | null;
  restaurantId?: string;
  restaurantName?: string;
}

export interface SimCartItem {
  foodItem: SimFoodItem;
  quantity: number;
  variantId?: string | null;
  restaurantId?: string;
  customization?: {
    size?: { name: string; price: number; id?: string };
    sauce?: string;
    extras?: { name: string; price: number; id?: string }[];
  };
}

export interface SimCoupon {
  code: string;
  description: string;
  discount: number;
  minOrder: number;
}

export interface CheckoutScreenProps {
  cart?: SimCartItem[];
  setCart?: React.Dispatch<React.SetStateAction<SimCartItem[]>>;
  location?: string;
  onChangeLocationPress?: () => void;
  isGroupOrderActive?: boolean;
  groupMembers?: any[];
  billSplitMethod?: 'individual' | 'equal' | 'single';
  isSwiggyOneActive?: boolean;
  appliedCoupon?: SimCoupon | null;
  setAppliedCoupon?: (coupon: SimCoupon | null) => void;
  cutleryOptOut?: boolean;
  setCutleryOptOut?: (val: boolean) => void;
  donationAmount?: number;
  setDonationAmount?: (amount: number) => void;
  deliveryTip?: number;
  setDeliveryTip?: (tip: number) => void;
  selectedPayment?: string;
  setSelectedPayment?: (method: string) => void;
  deliveryInstruction?: string;
  setDeliveryInstruction?: (inst: string) => void;
  onBack?: () => void;
  onConfirmPay?: (finalTotal: number, addressId: string | null) => void;
  isDarkMode?: boolean;
  addLog?: (msg: string) => void;
  foodItems?: SimFoodItem[];
  restaurantId?: string;
  restaurantName?: string;
  restaurantDistance?: string;
}

const AVAILABLE_COUPONS: SimCoupon[] = [
  { code: 'DELULU4FOOD', description: '70% OFF up to ₹140 on orders above ₹199', discount: 140, minOrder: 199 },
  { code: 'MYQUROONE', description: 'Flat ₹50 OFF for Gold Members', discount: 50, minOrder: 249 },
  { code: 'FLAT300', description: 'Flat ₹300 OFF on orders above ₹500', discount: 300, minOrder: 500 },
];

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  cart = [],
  setCart = () => {},
  location,
  onChangeLocationPress = () => {},
  appliedCoupon: parentAppliedCoupon = null,
  setAppliedCoupon: parentSetAppliedCoupon,
  cutleryOptOut: parentCutleryOptOut = false,
  setCutleryOptOut: parentSetCutleryOptOut,
  onBack = () => {},
  onConfirmPay = () => {},
  foodItems = [],
  restaurantId,
  restaurantName,
  restaurantDistance,
  selectedPayment: parentSelectedPayment = 'UPI',
  setSelectedPayment: parentSetSelectedPayment,
  addLog = () => {},
}) => {
  const insets = useSafeAreaInsets();
  const { authState, updateCartQuantity, removeFromCart, savedAddresses, currentLocation, setCurrentLocation, syncCartItems, cartItems, allRestaurants } = useViewModel();

  // Resolved dynamic restaurant details
  const currentRestaurant = useMemo(() => {
    return allRestaurants?.find(r => 
      r.id === restaurantId || 
      r.name.toLowerCase() === (restaurantName || '').toLowerCase() || 
      (cartItems && cartItems.length > 0 && r.id === cartItems[0].restaurantId)
    );
  }, [allRestaurants, restaurantId, restaurantName, cartItems]);

  const displayRestaurantName = currentRestaurant?.name || restaurantName || (cartItems && cartItems.length > 0 ? cartItems[0].restaurantName : '') || 'Restaurant';
  const displayRestaurantDistance = currentRestaurant?.distance ? `${currentRestaurant.distance.toFixed(1)} km` : (restaurantDistance || '');

  const baseDeliveryMins = useMemo(() => {
    if (typeof currentRestaurant?.deliveryTime === 'number' && currentRestaurant.deliveryTime > 0) {
      return currentRestaurant.deliveryTime;
    }
    return 30;
  }, [currentRestaurant]);

  const expressEta = `${Math.max(15, baseDeliveryMins - 10)}-${Math.max(20, baseDeliveryMins - 5)} mins`;
  const standardEta = `${baseDeliveryMins}-${baseDeliveryMins + 5} mins`;
  const ecoEta = `${baseDeliveryMins + 5}-${baseDeliveryMins + 15} mins`;

  // Local interactive states
  const [selectedPayment, setSelectedPayment] = useState<string>(parentSelectedPayment || 'UPI');
  const [internalCoupon, setInternalCoupon] = useState<SimCoupon | null>(parentAppliedCoupon);
  const [internalCutlery, setInternalCutlery] = useState<boolean>(parentCutleryOptOut);
  const [cookingInstruction, setCookingInstruction] = useState('');
  const [showCookingModal, setShowCookingModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showPaymentLoader, setShowPaymentLoader] = useState(false);
  const [showPaymentOptionsSheet, setShowPaymentOptionsSheet] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showLocationSelectorSheet, setShowLocationSelectorSheet] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [appliedCelebrationCoupon, setAppliedCelebrationCoupon] = useState<SimCoupon | null>(null);

  const activeRestaurantId = useMemo(() => {
    return currentRestaurant?.id || restaurantId || (cartItems && cartItems.length > 0 ? cartItems[0].restaurantId : null);
  }, [currentRestaurant, restaurantId, cartItems]);

  const serviceability = useMemo(() => {
    if (!currentRestaurant) return null;
    return checkCustomerServiceability(
      currentRestaurant,
      currentLocation?.latitude,
      currentLocation?.longitude,
      MAX_DELIVERY_RADIUS_KM
    );
  }, [currentRestaurant, currentLocation?.latitude, currentLocation?.longitude]);

  const [restaurantMenuItems, setRestaurantMenuItems] = useState<any[]>([]);

  useEffect(() => {
    if (!activeRestaurantId) return;
    let isMounted = true;
    const loadRestaurantMenu = async () => {
      try {
        const cached = await AsyncStorage.getItem(`@menu_${activeRestaurantId}`);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          if (parsed.categories) {
            const items: any[] = [];
            parsed.categories.forEach((cat: any) => {
              (cat.items || []).forEach((item: any) => {
                const variantsList = item.variants || [];
                const pricePaise = variantsList[0]?.price;
                const price = typeof pricePaise === 'number' ? (pricePaise > 1000 ? Math.round(pricePaise / 100) : pricePaise) : (item.price || 199);
                items.push({
                  id: item.id,
                  name: item.name,
                  restaurantId: activeRestaurantId,
                  restaurantName: displayRestaurantName,
                  price,
                  rating: Number(item.rating || 0) > 0 ? Number(Number(item.rating).toFixed(1)) : 0,
                  ratingCount: Number(item.ratingCount || item.rating_count || 0),
                  isVeg: Boolean(item.isVeg !== undefined ? item.isVeg : true),
                  image: item.imageURL || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
                  description: item.description || '',
                  mrp: Math.round(price * 1.25),
                  bestseller: item.bestseller || false,
                  variants: variantsList,
                });
              });
            });
            if (items.length > 0) {
              setRestaurantMenuItems(items);
            }
          }
        }
      } catch (e) {}
    };
    loadRestaurantMenu();
    return () => { isMounted = false; };
  }, [activeRestaurantId, displayRestaurantName]);

  // ── Dish Customization Pop-Up Modal States (Exact Parity with Restaurant Detail Screen) ──
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<any | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [showItemCustomizationModal, setShowItemCustomizationModal] = useState(false);

  const currentVariants = useMemo(() => {
    if (!editingCartItem) return [];
    const itemFood = editingCartItem.foodItem || editingCartItem;
    const match = restaurantMenuItems.find((m: any) => m.id === itemFood.id) || foodItems.find((f: any) => f.id === itemFood.id);
    const variantsList = itemFood.variants && itemFood.variants.length > 0
      ? itemFood.variants
      : (match?.variants && match.variants.length > 0 ? match.variants : []);

    if (variantsList && variantsList.length > 0) {
      return variantsList.map((v: any, idx: number) => ({
        id: v.id || `var_${idx}`,
        name: v.variantName || v.name || v.portionSize || 'Regular',
        price: typeof v.price === 'number' ? (v.price > 1000 ? Math.round(v.price / 100) : v.price) : (itemFood.price || 150),
        serves: v.portionSize || v.variantName || v.name || 'Regular',
      }));
    }
    return [
      {
        id: (itemFood as any).variantId || itemFood.id || 'default',
        name: 'Regular',
        price: itemFood.price || 150,
        serves: 'Regular',
      },
    ];
  }, [editingCartItem, restaurantMenuItems, foodItems]);

  const currentAddonsList = useMemo(() => {
    if (!editingCartItem) return [];
    const itemFood = editingCartItem.foodItem || editingCartItem;
    const available = restaurantMenuItems.length > 0 ? restaurantMenuItems : foodItems.filter((f: any) => f.restaurantId === activeRestaurantId);
    return available
      .filter((f: any) => f.id !== itemFood.id)
      .slice(0, 4)
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        price: f.price,
        isVeg: f.isVeg,
        tag: f.bestseller ? 'Bestseller' : (f.rating >= 4.5 ? 'Chef Special' : undefined),
      }));
  }, [editingCartItem, restaurantMenuItems, foodItems, activeRestaurantId]);

  const modalSelectedVariant = currentVariants[selectedVariantIndex] || currentVariants[0];

  const modalAddonsCost = useMemo(() => {
    return selectedAddonIds.reduce((sum, id) => {
      const match = currentAddonsList.find((a: any) => a.id === id);
      return sum + (match ? match.price : 0);
    }, 0);
  }, [selectedAddonIds, currentAddonsList]);

  const modalSingleItemTotal = useMemo(() => {
    if (!modalSelectedVariant) return 0;
    return Math.round(modalSelectedVariant.price + modalAddonsCost);
  }, [modalSelectedVariant, modalAddonsCost]);

  const modalGrandTotal = useMemo(() => {
    return modalSingleItemTotal * modalQuantity;
  }, [modalSingleItemTotal, modalQuantity]);

  const handleToggleAddon = (id: string) => {
    setSelectedAddonIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 3) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('You can select maximum 3 items', ToastAndroid.SHORT);
        }
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleOpenItemCustomization = (item: any, index: number) => {
    setEditingItemIndex(index);
    setEditingCartItem(item);
    setModalQuantity(item.quantity || 1);
    setSelectedVariantIndex(0);
    const itemFood = item.foodItem || item;
    const currentVarId = item.variantId || item.customization?.size?.id;
    const match = restaurantMenuItems.find((m: any) => m.id === itemFood.id) || foodItems.find((f: any) => f.id === itemFood.id);
    const variantsList = itemFood.variants && itemFood.variants.length > 0
      ? itemFood.variants
      : (match?.variants && match.variants.length > 0 ? match.variants : []);
    if (variantsList.length > 0 && currentVarId) {
      const idx = variantsList.findIndex((v: any) => v.id === currentVarId);
      if (idx > -1) setSelectedVariantIndex(idx);
    }
    const existingExtras = item.customization?.extras || [];
    setSelectedAddonIds(existingExtras.map((e: any) => e.id || e.name));
    setShowItemCustomizationModal(true);
  };

  const handleSaveItemCustomization = () => {
    if (editingItemIndex === null || !editingCartItem || !modalSelectedVariant) {
      setShowItemCustomizationModal(false);
      return;
    }
    const unitPrice = modalSelectedVariant.price + modalAddonsCost;
    const selectedExtras = selectedAddonIds.map(id => {
      const match = currentAddonsList.find((a: any) => a.id === id);
      return {
        id,
        name: match ? match.name : id,
        price: match ? Math.round(match.price) : 0,
      };
    });

    const updatedCart = [...safeCart];
    const target = updatedCart[editingItemIndex];
    if (target) {
      const updatedItem: SimCartItem = {
        ...target,
        quantity: modalQuantity,
        variantId: modalSelectedVariant.id,
        foodItem: {
          ...target.foodItem,
          price: unitPrice,
        },
        customization: {
          ...target.customization,
          size: modalSelectedVariant,
          extras: selectedExtras,
        },
      };
      updatedCart[editingItemIndex] = updatedItem;

      setCart(updatedCart);
      if (syncCartItems) {
        syncCartItems(
          updatedCart.map(i => ({
            id: i.foodItem.id,
            name: i.foodItem.name,
            price: i.foodItem.price,
            quantity: i.quantity,
            image: i.foodItem.image,
            isVeg: i.foodItem.isVeg,
            description: i.foodItem.description || '',
            restaurantId: restaurantId || '',
            restaurantName: displayRestaurantName || '',
            variantId: i.variantId || i.customization?.size?.id || undefined,
            customization: i.customization || undefined,
          }))
        );
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Updated ${target.foodItem?.name || 'item'} specification`, ToastAndroid.SHORT);
      }
    }
    setShowItemCustomizationModal(false);
  };
  const modalScaleAnim = useRef(new Animated.Value(0.82)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (appliedCelebrationCoupon) {
      modalScaleAnim.setValue(0.82);
      modalOpacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          tension: 68,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [appliedCelebrationCoupon]);

  const getSelectedPaymentDisplayName = () => {
    switch (selectedPayment) {
      case 'UPI':
        return 'PAYTM UPI';
      case 'Google Pay':
        return 'GOOGLE PAY';
      case 'Card':
        return 'VISA (•••• 0484)';
      case 'super.money':
        return 'SUPER.MONEY';
      case 'PhonePe':
        return 'PHONEPE UPI';
      case 'Amazon Pay':
        return 'AMAZON PAY';
      case 'WhatsApp':
        return 'WHATSAPP';
      case 'COD':
        return 'PAY ON DELIVERY';
      default:
        return (selectedPayment || 'PAYTM UPI').toUpperCase();
    }
  };

  const renderFooterPaymentIcon = () => {
    switch (selectedPayment) {
      case 'Google Pay':
        return (
          <View style={styles.footerGpayIconBox}>
            <Text style={styles.footerGpayLetter}>G</Text>
            <Text style={styles.footerGpayText}>Pay</Text>
          </View>
        );
      case 'Card':
        return (
          <View style={styles.footerVisaBadge}>
            <Text style={styles.footerVisaText}>VISA</Text>
          </View>
        );
      case 'super.money':
        return (
          <View style={styles.footerSuperMoneyBadge}>
            <Text style={styles.footerSuperMoneyText}>S</Text>
          </View>
        );
      case 'PhonePe':
        return (
          <View style={styles.footerPhonePeBadge}>
            <Text style={styles.footerPhonePeText}>पे</Text>
          </View>
        );
      case 'Amazon Pay':
        return (
          <View style={styles.footerAmazonBadge}>
            <Text style={styles.footerAmazonText}>pay</Text>
          </View>
        );
      case 'WhatsApp':
        return (
          <View style={styles.footerWhatsappBadge}>
            <Svg width={14 * SCALE} height={14 * SCALE} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2Z"
                fill="#25D366"
              />
            </Svg>
          </View>
        );
      case 'COD':
        return (
          <View style={styles.footerCodBadge}>
            <Banknote size={16 * SCALE} color="#10B981" />
          </View>
        );
      default:
        return <Image source={PAYTM_LOGO} style={styles.paytmLogoImg} />;
    }
  };

  // Delivery Tab (Delivery Type | Tip | Instructions)
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<'delivery_type' | 'tip' | 'instructions'>('delivery_type');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<'express' | 'standard' | 'eco'>('standard');
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([]);
  const [isBillDetailsExpanded, setIsBillDetailsExpanded] = useState<boolean>(false);

  // Dynamic Surprise Deals derived PURELY from the active restaurant's real menu items
  const surpriseDealsList = useMemo(() => {
    const availableItems = restaurantMenuItems.length > 0
      ? restaurantMenuItems
      : (foodItems && activeRestaurantId ? foodItems.filter((f: any) => f.restaurantId === activeRestaurantId) : (foodItems || []));

    if (availableItems && availableItems.length > 0) {
      return availableItems
        .slice(0, 4)
        .map(f => {
          const originalPrice = f.mrp || Math.round(f.price * 1.25);
          const disc = Math.round((1 - f.price / originalPrice) * 100);
          return {
            id: f.id, // REAL ID from menu (not synthetic deal_...)
            name: f.name,
            originalPrice,
            dealPrice: f.price,
            discount: `${disc > 0 ? disc : 15}% OFF`,
            image: f.image ? (typeof f.image === 'string' ? { uri: f.image } : f.image) : { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80' },
            isVeg: Boolean(f.isVeg),
            description: f.description || '',
            variants: f.variants || [],
            variantId: f.variantId || (f.variants && f.variants[0]?.id) || null,
            restaurantId: f.restaurantId || activeRestaurantId,
            restaurantName: f.restaurantName || displayRestaurantName,
          };
        });
    }
    return [];
  }, [restaurantMenuItems, foodItems, activeRestaurantId, displayRestaurantName]);

  // Safe Cart Items calculation (handles both SimCartItem and CartItem shapes without fake fallbacks)
  const safeCart = useMemo<SimCartItem[]>(() => {
    const list = (cart && cart.length > 0) ? cart : (cartItems && cartItems.length > 0 ? cartItems : []);
    return list.map((item: any) => {
      const parsedCustomization = typeof item?.customization === 'string'
        ? (() => { try { return JSON.parse(item.customization); } catch(e) { return undefined; } })()
        : (item?.customization || item?.foodItem?.customization || undefined);

      if (item && item.foodItem && typeof item.foodItem === 'object') {
        return {
          foodItem: {
            id: item.foodItem.id || 'item',
            name: item.foodItem.name || 'Dish',
            price: typeof item.foodItem.price === 'number' ? item.foodItem.price : (typeof item.price === 'number' ? item.price : 0),
            rating: item.foodItem.rating || 0,
            ratingCount: item.foodItem.ratingCount || 0,
            category: item.foodItem.category || '',
            isVeg: item.foodItem.isVeg !== undefined ? item.foodItem.isVeg : true,
            isEatRight: !!item.foodItem.isEatRight,
            image: item.foodItem.image || item.image || '',
            description: item.foodItem.description || '',
          },
          variantId: item.variantId || item.foodItem.variantId || parsedCustomization?.size?.id,
          restaurantId: item.restaurantId || item.foodItem.restaurantId || currentRestaurant?.id,
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          customization: parsedCustomization,
        };
      }
      const rawP = typeof item?.price === 'number' ? item.price : (typeof item?.foodItem?.price === 'number' ? item.foodItem.price : 0);
      const cleanPrice = (rawP >= 1000 && rawP % 100 === 0) ? Math.round(rawP / 100) : (rawP >= 2000 ? Math.round(rawP / 100) : Math.round(rawP));
      return {
        foodItem: {
          id: item?.id || 'item',
          name: item?.name || 'Dish',
          price: cleanPrice,
          rating: item?.rating || 0,
          ratingCount: item?.ratingCount || 0,
          category: item?.category || '',
          isVeg: item?.isVeg !== undefined ? item.isVeg : true,
          isEatRight: !!item?.isEatRight,
          image: item?.image || '',
          description: item?.description || '',
        },
        variantId: item?.variantId || parsedCustomization?.size?.id,
        restaurantId: item?.restaurantId || currentRestaurant?.id,
        quantity: typeof item?.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
        customization: parsedCustomization,
      };
    });
  }, [cart, cartItems, currentRestaurant]);

  // Pricing calculations
  const itemTotal = useMemo(() => {
    return safeCart.reduce((sum, item) => {
      const basePrice = item.foodItem?.price || 0;
      return sum + basePrice * (item.quantity || 1);
    }, 0);
  }, [safeCart]);

  const activeCoupon = parentAppliedCoupon || internalCoupon;
  const couponDiscount = activeCoupon ? Math.min(activeCoupon.discount, itemTotal) : 0;
  const expressFee = selectedDeliveryType === 'express' ? 19 : 0;
  const deliveryFee = 0; // Free with MyQURO
  const taxes = Math.round(itemTotal * 0.05); // 5% GST
  const finalTotal = Math.max(0, itemTotal - couponDiscount + deliveryFee + expressFee + selectedTip + taxes);
  const originalTotal = itemTotal + 35 + (selectedDeliveryType === 'express' ? 29 : 0) + taxes;
  const totalSavings = Math.max(55, originalTotal - finalTotal);

  // Stepper handlers synchronized with ViewModel
  const handleIncreaseQty = (index: number) => {
    const updated = safeCart.map((item, idx) =>
      idx === index ? { ...item, quantity: (item.quantity || 1) + 1 } : item
    );
    setCart(updated);
    if (syncCartItems) {
      syncCartItems(
        updated.map(i => ({
          id: i.foodItem.id,
          name: i.foodItem.name,
          price: i.foodItem.price,
          quantity: i.quantity,
          image: i.foodItem.image,
          isVeg: i.foodItem.isVeg,
          description: i.foodItem.description || '',
          restaurantId: restaurantId || '',
          restaurantName: displayRestaurantName || '',
          variantId: i.variantId || i.customization?.size?.id || null,
          customization: i.customization || undefined,
        }))
      );
    }
  };

  const handleDecreaseQty = (index: number) => {
    const current = safeCart[index];
    let updated: SimCartItem[];
    if (current && current.quantity > 1) {
      updated = safeCart.map((item, idx) =>
        idx === index ? { ...item, quantity: item.quantity - 1 } : item
      );
    } else {
      updated = safeCart.filter((_, idx) => idx !== index);
    }
    setCart(updated);
    if (syncCartItems) {
      syncCartItems(
        updated.map(i => ({
          id: i.foodItem.id,
          name: i.foodItem.name,
          price: i.foodItem.price,
          quantity: i.quantity,
          image: i.foodItem.image,
          isVeg: i.foodItem.isVeg,
          description: i.foodItem.description || '',
          restaurantId: restaurantId || '',
          restaurantName: displayRestaurantName || '',
          variantId: i.variantId || i.customization?.size?.id || null,
          customization: i.customization || undefined,
        }))
      );
    }
  };

  // Add Surprise Deal (Real Item from Menu) to cart
  const handleAddDealItem = (deal: typeof surpriseDealsList[0]) => {
    const existingIndex = safeCart.findIndex(i => i.foodItem.id === deal.id || i.foodItem.name === deal.name);
    let updated: SimCartItem[];
    if (existingIndex > -1) {
      updated = safeCart.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: (item.quantity || 1) + 1 } : item
      );
    } else {
      const newDealItem: SimCartItem = {
        foodItem: {
          id: deal.id,
          name: deal.name,
          price: deal.dealPrice,
          mrp: deal.originalPrice,
          rating: 4.6,
          ratingCount: 88,
          category: 'Specials',
          isVeg: deal.isVeg,
          isEatRight: false,
          image: typeof deal.image === 'object' && (deal.image as any).uri ? (deal.image as any).uri : (typeof deal.image === 'string' ? deal.image : 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'),
          description: deal.description,
          variants: deal.variants,
          variantId: deal.variantId,
          restaurantId: deal.restaurantId,
          restaurantName: deal.restaurantName,
        },
        quantity: 1,
        variantId: deal.variantId,
      };
      updated = [...safeCart, newDealItem];
    }

    setCart(updated);
    if (syncCartItems) {
      syncCartItems(
        updated.map(i => ({
          id: i.foodItem.id,
          name: i.foodItem.name,
          price: i.foodItem.price,
          quantity: i.quantity,
          image: i.foodItem.image,
          isVeg: i.foodItem.isVeg,
          description: i.foodItem.description || '',
          restaurantId: deal.restaurantId || activeRestaurantId || '',
          restaurantName: displayRestaurantName || '',
          variantId: i.variantId || i.customization?.size?.id || null,
          customization: i.customization || undefined,
        }))
      );
    }
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Added ${deal.name} at ₹${deal.dealPrice}!`, ToastAndroid.SHORT);
    }
  };

  // Toggle delivery instructions
  const toggleInstruction = (inst: string) => {
    setSelectedInstructions((prev) =>
      prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]
    );
  };

  // Pay & Place Order -> Opens Figma 3046:48 Hold On Payment Verification screen with double-tap protection
  const lastTapRef = useRef<number>(0);
  const handleProceedToPay = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 1200 || showPaymentLoader) {
      return;
    }
    lastTapRef.current = now;

    if (safeCart.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart before placing an order.");
      return;
    }

    if (serviceability && !serviceability.isServiceable) {
      Alert.alert(
        serviceability.code === 'OUT_OF_DELIVERY_RANGE' ? 'Outside Delivery Area' : 'Outlet Unavailable',
        serviceability.reason || `Delivery is unavailable for your selected address (max ${MAX_DELIVERY_RADIUS_KM} km).`,
        [
          { text: 'Change Address', onPress: () => setShowAddressModal(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setShowPaymentLoader(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* ════════════════════════════════════════════════════════════════════════
          [1] TOP HEADER (FIGMA 3027:1289 & 3027:1201)
          ════════════════════════════════════════════════════════════════════════ */}
      <View style={[styles.topHeader, { paddingTop: getSafeTopPadding(insets.top, 6) }]}>
        <TouchableOpacity style={styles.headerBackBtn} activeOpacity={0.8} onPress={onBack}>
          <Image source={checkBack} style={styles.headerBackImg} />
        </TouchableOpacity>

        <View style={styles.headerCenterCol}>
          <Text style={styles.headerRestaurantTitle} numberOfLines={1}>
            {displayRestaurantName}
          </Text>

          <TouchableOpacity
            style={styles.headerAddressRow}
            activeOpacity={0.8}
            onPress={() => setShowAddressModal(true)}
          >
            <Image source={checkHome} style={styles.headerHomeImg} />
            <Text style={styles.headerAddressText} numberOfLines={1}>
              {currentLocation?.label ? `${currentLocation.label} | ` : (location ? `${location} | ` : '')}{currentLocation?.address || (savedAddresses.length > 0 ? savedAddresses[0].address : 'Select delivery location')}
            </Text>
            <Image source={checkChevronDown} style={styles.headerChevronDownImg} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.headerMoreBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (Platform.OS === 'android') {
              ToastAndroid.show('Order options & support', ToastAndroid.SHORT);
            }
          }}
        >
          <Image source={checkMore} style={styles.headerMoreImg} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]}
      >
        {serviceability && !serviceability.isServiceable && (
          <View style={{
            backgroundColor: 'rgba(239, 68, 68, 0.14)',
            borderColor: 'rgba(239, 68, 68, 0.45)',
            borderWidth: 1,
            borderRadius: 14,
            padding: 12,
            marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <AlertTriangle size={15} color="#F87171" style={{ marginRight: 6 }} />
              <Text style={{ color: '#FCA5A5', fontWeight: '700', fontSize: 13, flex: 1 }}>
                {serviceability.code === 'OUT_OF_DELIVERY_RANGE'
                  ? 'Outside Delivery Range'
                  : 'Restaurant Unavailable'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(true)}
                style={{ backgroundColor: '#F2CA50', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
              >
                <Text style={{ color: '#000000', fontWeight: '800', fontSize: 11 }}>Change Address</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#FECACA', fontSize: 12 }}>{serviceability.reason}</Text>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            [2] BENEFITS BANNER (LUXURY OBSIDIAN & CHAMPAGNE GOLD)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.benefitsBanner}>
          <View style={styles.benefitsLeftWrap}>
            <View style={styles.benefitsIconBadge}>
              <Svg width={13 * SCALE} height={13 * SCALE} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z"
                  fill="#F2CA50"
                />
              </Svg>
            </View>
            <Text style={styles.benefitsText}>
              <Text style={styles.benefitsGoldText}>₹55 saved!</Text> with MYQURO Benefits
            </Text>
          </View>
          <View style={styles.benefitsAppliedBadge}>
            <Text style={styles.benefitsAppliedText}>BENEFITS</Text>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [3] "YOUR QURO ENDS IN 3 DAYS" GOLD CLUB CARD
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.clubCardContainer}>
          <View style={styles.clubHeaderRow}>
            <Text style={styles.clubTitleWhite}>Your </Text>
            <Image source={quroBadgeImg} style={styles.clubQuroBadgeImg} resizeMode="contain" />
            <Text style={styles.clubTitleGold}> membership ends in 3 days</Text>
          </View>

          <View style={styles.clubBottomRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS === 'android') {
                  ToastAndroid.show('MyQURO: Free delivery on all orders above ₹99', ToastAndroid.SHORT);
                }
              }}
            >
              <Text style={styles.clubSubtitleText}>
                {`Get unlimited free deliveries for 3 months >`}
              </Text>
            </TouchableOpacity>

            <View style={styles.clubExtendBox}>
              <TouchableOpacity
                style={styles.clubExtendBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('Membership extension added!', ToastAndroid.SHORT);
                  }
                }}
              >
                <Text style={styles.clubExtendBtnText}>Extend</Text>
              </TouchableOpacity>
              <Text style={styles.clubExtendPriceText}>₹30</Text>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [4] CART ITEMS CARD (WITH QUANTITY & ACTION PILLS)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.cartItemsCard}>
          {safeCart.length === 0 ? (
            <View style={styles.emptyCartCard}>
              <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
              <Text style={styles.emptyCartSub}>Add some delectable dishes to get started!</Text>
              <TouchableOpacity style={styles.browseMenuBtn} onPress={onBack}>
                <Text style={styles.browseMenuText}>Browse Menu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            safeCart.map((item, index) => {
              const variantText = item.customization?.size?.name || (item as any).variantName || (item.foodItem as any)?.variantName || 'Regular';
              const itemPrice = (item.foodItem?.price || 0) * (item.quantity || 1);
              return (
                <View key={`checkout-item-${index}`} style={styles.cartItemRowWrap}>
                  <View style={styles.cartItemTopRow}>
                    {/* Left: Veg/Non-Veg Icon + Title + Variant */}
                    <View style={styles.cartItemLeftInfo}>
                      <View style={styles.cartItemNameRow}>
                        <Image source={item.foodItem?.isVeg ? checkVegIcon : require('../assets/restaurant_detail/figma/imgImage12.png')} style={styles.cartVegIcon} />
                        <Text style={styles.cartItemName} numberOfLines={2} ellipsizeMode="tail">
                          {item.foodItem?.name || 'Dish'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.cartItemVariantRow}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleOpenItemCustomization(item, index)}
                      >
                        <Text style={styles.cartItemVariantText}>{variantText}</Text>
                        <Image source={checkChevronDown} style={styles.cartVariantChevron} />
                      </TouchableOpacity>

                      {item.customization?.extras && item.customization.extras.length > 0 ? (
                        <View style={styles.cartItemExtrasSubtextRow}>
                          <Text style={styles.cartItemExtrasSubtext} numberOfLines={2}>
                            {item.customization.extras.map((e: any) => `${e.name}${e.price > 0 ? ` (+₹${e.price})` : ''}`).join(' • ')}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Right: Quantity Stepper + Price */}
                    <View style={styles.cartItemRightControls}>
                      <View style={styles.cartStepperBox}>
                        <TouchableOpacity
                          style={styles.cartStepperBtn}
                          activeOpacity={0.6}
                          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                          onPress={() => handleDecreaseQty(index)}
                        >
                          <Image source={checkMinus} style={styles.cartMinusIcon} />
                        </TouchableOpacity>

                        <Text style={styles.cartStepperCountText}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={styles.cartStepperBtn}
                          activeOpacity={0.6}
                          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                          onPress={() => handleIncreaseQty(index)}
                        >
                          <Image source={checkPlus} style={styles.cartPlusIcon} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.cartItemPriceText}>₹{itemPrice}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Quick Actions Under Items: + Add Items | ✏ Cooking requests | ☐ Cutlery Needed */}
          <View style={styles.quickActionsRow}>
            {/* 1. Add Items */}
            <TouchableOpacity
              style={styles.quickActionPill}
              activeOpacity={0.85}
              onPress={onBack}
            >
              <Image source={checkAddItems} style={styles.quickActionIcon} />
              <Text style={styles.quickActionText}>Add Items</Text>
            </TouchableOpacity>

            {/* 2. Cooking requests */}
            <TouchableOpacity
              style={styles.quickActionPill}
              activeOpacity={0.85}
              onPress={() => setShowCookingModal(true)}
            >
              <Image source={checkCooking} style={styles.quickActionIcon} />
              <Text style={styles.quickActionText}>
                {cookingInstruction ? 'Instructions added' : 'Cooking requests'}
              </Text>
            </TouchableOpacity>

            {/* 3. Cutlery Needed */}
            <TouchableOpacity
              style={[
                styles.quickActionPill,
                (parentCutleryOptOut || internalCutlery) && styles.quickActionPillActive,
              ]}
              activeOpacity={0.85}
              onPress={() => {
                const newVal = !(parentCutleryOptOut || internalCutlery);
                if (parentSetCutleryOptOut) parentSetCutleryOptOut(newVal);
                setInternalCutlery(newVal);
              }}
            >
              <View
                style={[
                  styles.cutleryCheckbox,
                  (parentCutleryOptOut || internalCutlery) && styles.cutleryCheckboxActive,
                ]}
              >
                {(parentCutleryOptOut || internalCutlery) && (
                  <Check size={10} color="#000000" strokeWidth={3} />
                )}
              </View>
              <Text style={styles.quickActionText}>Cutlery Needed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [5] "SURPRISE DEALS ✦" SECTION (CAROUSEL & WORKING '+' BUTTONS)
            ════════════════════════════════════════════════════════════════════════ */}
        {surpriseDealsList.length > 0 && (
          <View style={styles.dealsSectionContainer}>
            <View style={styles.dealsHeaderRow}>
              <View style={styles.dealsTitleWrap}>
                <Text style={styles.dealsTitleText}>SURPRISE DEALS</Text>
                <Image source={checkDealSparkle} style={styles.dealsSparkleIcon} />
              </View>

              <View style={styles.dealsTimerBadge}>
                <Text style={styles.dealsTimerText}>4m:55s</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealsScroll}
            >
              {surpriseDealsList.map((deal) => (
                <View key={deal.id} style={styles.dealCard}>
                  <View style={styles.dealImgWrap}>
                    <Image source={deal.image} style={styles.dealImg} />
                    
                    {/* Gold Circle '+' Button */}
                    <TouchableOpacity
                      style={styles.dealPlusBtn}
                      activeOpacity={0.85}
                      onPress={() => handleAddDealItem(deal)}
                    >
                      <Image source={dealPlusCircle} style={styles.dealPlusIcon} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dealInfoCol}>
                    <View style={styles.dealNameRow}>
                      <Image source={deal.isVeg ? checkVegIcon : require('../assets/restaurant_detail/figma/imgImage12.png')} style={styles.dealVegIcon} />
                      <Text style={styles.dealNameText} numberOfLines={2}>
                        {deal.name}
                      </Text>
                    </View>

                    <Text style={styles.dealPercentText}>{deal.discount}</Text>

                    <View style={styles.dealPriceRow}>
                      <Text style={styles.dealStrikePrice}>₹{deal.originalPrice}</Text>
                      <Text style={styles.dealFinalPrice}>₹{deal.dealPrice}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            [6] "SAVINGS CORNER" CARD (FIGMA NODE 3027:1201)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.savingsCornerCard}>
          <Text style={styles.savingsCornerTitle}>SAVINGS CORNER</Text>

          <TouchableOpacity
            style={styles.couponRow}
            activeOpacity={0.85}
            onPress={() => setShowCouponModal(true)}
          >
            <View style={styles.couponLeft}>
              <Image source={checkCouponTag} style={styles.couponTagIcon} />
              <Text style={styles.couponText}>
                {activeCoupon ? `Applied: ${activeCoupon.code} (-₹${activeCoupon.discount})` : 'Apply Coupon'}
              </Text>
            </View>
            <Image source={checkCouponChevron} style={styles.couponChevronIcon} />
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [7] MULTI-SEGMENT DELIVERY TABS CARD (FIGMA NODE 3027:1201)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.deliveryTabsCard}>
          {/* Top Segment Tabs */}
          <View style={styles.tabsHeaderRow}>
            {/* Tab 1: Delivery Type */}
            <TouchableOpacity
              style={[styles.tabButton, activeDeliveryTab === 'delivery_type' && styles.tabButtonActive]}
              activeOpacity={0.85}
              onPress={() => setActiveDeliveryTab('delivery_type')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeDeliveryTab === 'delivery_type' && styles.tabButtonTextActive,
                ]}
              >
                Delivery Type
              </Text>
              {activeDeliveryTab === 'delivery_type' && <View style={styles.tabIndicatorBar} />}
            </TouchableOpacity>

            {/* Tab 2: Tip */}
            <TouchableOpacity
              style={[styles.tabButton, activeDeliveryTab === 'tip' && styles.tabButtonActive]}
              activeOpacity={0.85}
              onPress={() => setActiveDeliveryTab('tip')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeDeliveryTab === 'tip' && styles.tabButtonTextActive,
                ]}
              >
                Tip {selectedTip > 0 ? `(₹${selectedTip})` : ''}
              </Text>
              {activeDeliveryTab === 'tip' && <View style={styles.tabIndicatorBar} />}
            </TouchableOpacity>

            {/* Tab 3: Instructions */}
            <TouchableOpacity
              style={[styles.tabButton, activeDeliveryTab === 'instructions' && styles.tabButtonActive]}
              activeOpacity={0.85}
              onPress={() => setActiveDeliveryTab('instructions')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeDeliveryTab === 'instructions' && styles.tabButtonTextActive,
                ]}
              >
                Instructions {selectedInstructions.length > 0 ? `(${selectedInstructions.length})` : ''}
              </Text>
              {activeDeliveryTab === 'instructions' && <View style={styles.tabIndicatorBar} />}
            </TouchableOpacity>
          </View>

          {/* Tab 1 Content: Delivery Type Radio Options */}
          {activeDeliveryTab === 'delivery_type' && (
            <View style={styles.deliveryOptionsList}>
              {/* Option 1: Express */}
              <TouchableOpacity
                style={styles.deliveryOptionItem}
                activeOpacity={0.85}
                onPress={() => setSelectedDeliveryType('express')}
              >
                <Image
                  source={selectedDeliveryType === 'express' ? radioGoldSelected : radioUnselected}
                  style={styles.radioIconImg}
                />
                <View style={styles.deliveryOptionContent}>
                  <View style={styles.deliveryOptionTitleRow}>
                    <View style={styles.expressTitleWrap}>
                      <Image source={expressBolt} style={styles.expressBoltImg} />
                      <Text style={styles.deliveryOptionTitle}>Express</Text>
                      <Text style={styles.expressStrikePrice}>₹29</Text>
                      <Text style={styles.expressDealPrice}>₹19</Text>
                    </View>
                    <Text style={styles.deliveryOptionEta}>{expressEta}</Text>
                  </View>
                  <Text style={styles.deliveryOptionSubtitle}>Fastest delivery, directly to you!</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.deliveryDivider} />

              {/* Option 2: Standard */}
              <TouchableOpacity
                style={styles.deliveryOptionItem}
                activeOpacity={0.85}
                onPress={() => setSelectedDeliveryType('standard')}
              >
                <Image
                  source={selectedDeliveryType === 'standard' ? radioGoldSelected : radioUnselected}
                  style={styles.radioIconImg}
                />
                <View style={styles.deliveryOptionContent}>
                  <View style={styles.deliveryOptionTitleRow}>
                    <Text style={styles.deliveryOptionTitle}>Standard</Text>
                    <Text style={styles.deliveryOptionEtaGold}>{standardEta}</Text>
                  </View>
                  <Text style={styles.deliveryOptionSubtitle}>Minimal order grouping</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.deliveryDivider} />

              {/* Option 3: Eco Saver */}
              <TouchableOpacity
                style={styles.deliveryOptionItem}
                activeOpacity={0.85}
                onPress={() => setSelectedDeliveryType('eco')}
              >
                <Image
                  source={selectedDeliveryType === 'eco' ? radioGoldSelected : radioUnselected}
                  style={styles.radioIconImg}
                />
                <View style={styles.deliveryOptionContent}>
                  <View style={styles.deliveryOptionTitleRow}>
                    <Text style={styles.deliveryOptionTitle}>Eco Saver</Text>
                    <Text style={styles.deliveryOptionEta}>{ecoEta}</Text>
                  </View>
                  <Text style={styles.deliveryOptionSubtitle}>Lesser CO2 by order grouping</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Tab 2 Content: Delivery Partner Tip */}
          {activeDeliveryTab === 'tip' && (
            <View style={styles.tipTabContent}>
              <Text style={styles.tipHeaderTitle}>Support your delivery partner</Text>
              <Text style={styles.tipSubtext}>100% of the tip goes directly to your delivery partner.</Text>
              <View style={styles.tipButtonsRow}>
                {[20, 30, 50].map((amount) => {
                  const isSelected = selectedTip === amount;
                  return (
                    <TouchableOpacity
                      key={`tip-${amount}`}
                      style={[styles.tipPill, isSelected && styles.tipPillActive]}
                      onPress={() => setSelectedTip(isSelected ? 0 : amount)}
                    >
                      <Text style={[styles.tipPillText, isSelected && styles.tipPillTextActive]}>
                        ₹{amount}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {selectedTip > 0 && (
                  <TouchableOpacity
                    style={styles.tipClearPill}
                    onPress={() => setSelectedTip(0)}
                  >
                    <Text style={styles.tipClearText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Tab 3 Content: Delivery Instructions */}
          {activeDeliveryTab === 'instructions' && (
            <View style={styles.instructionsTabContent}>
              <Text style={styles.instructionsHeaderTitle}>Delivery Instructions</Text>
              <View style={styles.instructionPillsWrap}>
                {['Avoid calling', 'Leave at door', "Don't ring bell", 'Pet at home', 'Leave with security'].map((inst) => {
                  const isSelected = selectedInstructions.includes(inst);
                  return (
                    <TouchableOpacity
                      key={inst}
                      style={[styles.instructionBadge, isSelected && styles.instructionBadgeActive]}
                      onPress={() => toggleInstruction(inst)}
                    >
                      <Text style={[styles.instructionBadgeText, isSelected && styles.instructionBadgeTextActive]}>
                        {inst}
                      </Text>
                      {isSelected && <Check size={12} color="#000000" strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [8] COLLAPSIBLE "TO PAY" BILL ACCORDION CARD (FIGMA NODE 3027:1201)
            ════════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.toPayAccordionCard}
          activeOpacity={0.88}
          onPress={() => setIsBillDetailsExpanded(!isBillDetailsExpanded)}
        >
          <View style={styles.toPayMainRow}>
            {/* Left: Green Receipt Icon */}
            <Image source={receiptGreenIcon} style={styles.receiptGreenImg} />

            {/* Middle: To Pay + Strikethrough + Final Price + Savings Subtitle */}
            <View style={styles.toPayInfoCol}>
              <View style={styles.toPayPriceRow}>
                <Text style={styles.toPayLabelText}>To Pay</Text>
                <Text style={styles.toPayStrikeText}>₹{originalTotal}</Text>
                <Text style={styles.toPayFinalText}>₹{finalTotal}</Text>
              </View>
              <Text style={styles.toPaySavingsText}>₹{totalSavings} saved on the total!</Text>
            </View>

            {/* Right: Down Chevron / Toggle */}
            <Image
              source={toPayChevron}
              style={[
                styles.toPayChevronImg,
                isBillDetailsExpanded && { transform: [{ rotate: '180deg' }] },
              ]}
            />
          </View>

          {/* Detailed Breakdown when Expanded */}
          {isBillDetailsExpanded && (
            <View style={styles.expandedBillBreakdown}>
              <View style={styles.billDivider} />
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Item Total</Text>
                <Text style={styles.billDetailValue}>₹{itemTotal}</Text>
              </View>
              {couponDiscount > 0 && (
                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabelGreen}>Coupon Discount</Text>
                  <Text style={styles.billDetailValueGreen}>-₹{couponDiscount}</Text>
                </View>
              )}
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Delivery Partner Fee</Text>
                <View style={styles.freeDeliveryRow}>
                  <Text style={styles.freeDeliveryStrike}>₹35</Text>
                  <Text style={styles.freeDeliveryGreen}>FREE</Text>
                </View>
              </View>
              {expressFee > 0 && (
                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabel}>⚡ Express Delivery</Text>
                  <Text style={styles.billDetailValue}>₹{expressFee}</Text>
                </View>
              )}
              {selectedTip > 0 && (
                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailLabel}>Delivery Tip</Text>
                  <Text style={styles.billDetailValue}>₹{selectedTip}</Text>
                </View>
              )}
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Taxes & GST (5%)</Text>
                <Text style={styles.billDetailValue}>₹{taxes}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* ════════════════════════════════════════════════════════════════════════
            [9] CANCELLATION POLICY (FIGMA NODE 3027:1201)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.cancellationPolicyContainer}>
          <Text style={styles.cancellationTitle}>Cancellation policy:</Text>
          <Text style={styles.cancellationBody}>
            Please double-check your order and address details. Orders are non-refundable once placed.
          </Text>
        </View>
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════════════
          [10] FOOTER - TACTICAL PAYMENT BAR (FIGMA NODE 3027:1289 & 3027:1201)
          ════════════════════════════════════════════════════════════════════════ */}
      <View style={[styles.stickyFooterBar, { paddingBottom: getSafeBottomPadding(insets.bottom, 12) }]}>
        <View style={styles.footerContent}>
          {/* Payment Method Selector */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowPaymentOptionsSheet(true)}
            style={styles.paymentMethodQuickSelect}
          >
            {renderFooterPaymentIcon()}
            <View style={styles.paymentTextsRow}>
              <View style={styles.paymentTexts}>
                <Text style={styles.paymentMethodName} numberOfLines={1}>
                  {getSelectedPaymentDisplayName()}
                </Text>
                <Text style={styles.paymentChangeText}>CHANGE</Text>
              </View>
              <ChevronUp size={14} color="#DEA430" />
            </View>
          </TouchableOpacity>

          {/* Unified Place Order CTA */}
          <View style={styles.unifiedCTA}>
            <View style={styles.ctaTotalSide}>
              <Text style={styles.ctaTotalAmount}>₹{finalTotal}</Text>
              <Text style={styles.ctaTotalLabel}>TOTAL BILL</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isProcessingPayment}
              onPress={handleProceedToPay}
              style={styles.placeOrderBtnGrad}
            >
              {isProcessingPayment ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Text style={styles.placeOrderBtnText}>PLACE ORDER</Text>
                  <ChevronRight size={16} color="#000000" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Minimal Row inside footer bottom */}
        <View style={styles.walletFooterRow}>
          <Text style={styles.walletLabel}>
            WALLET: <Text style={styles.walletAmount}>₹0</Text>
          </Text>
          <Text style={styles.walletDot}>•</Text>
          <TouchableOpacity onPress={() => Alert.alert("Add Funds", "Redirecting to wallet recharge...")}>
            <Text style={styles.walletAddFunds}>Add Funds</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          [11] COOKING INSTRUCTIONS MODAL
          ════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showCookingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCookingModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Cooking & Preparation Requests</Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="E.g., Less spicy, no onion/garlic, extra mint chutney..."
              placeholderTextColor="#666666"
              multiline
              numberOfLines={3}
              value={cookingInstruction}
              onChangeText={setCookingInstruction}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowCookingModal(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogSaveBtn}
                onPress={() => setShowCookingModal(false)}
              >
                <Text style={styles.dialogSaveText}>Save Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          [12] APPLY COUPON PAGE / MODAL (FIGMA NODE 3029:1641)
          ════════════════════════════════════════════════════════════════════════ */}
      <ApplyCouponModal
        visible={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        cartTotal={itemTotal}
        appliedCoupon={activeCoupon}
        onApplyCoupon={(coupon) => {
          if (parentSetAppliedCoupon) {
            parentSetAppliedCoupon(coupon);
          }
          setInternalCoupon(coupon);
          if (coupon && coupon.discount > 0) {
            setAppliedCelebrationCoupon(coupon);
          }
        }}
        restaurantId={currentRestaurant?.id || restaurantId || (cartItems && cartItems.length > 0 ? cartItems[0].restaurantId : '') || ''}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          [12.5] COUPON CELEBRATION MODAL (FIGMA / SCREENSHOT PIXEL-PERFECT)
          ════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!appliedCelebrationCoupon}
        transparent
        animationType="fade"
        onRequestClose={() => setAppliedCelebrationCoupon(null)}
      >
        <View style={styles.celebrationModalOverlay}>
          {/* Party Poppers / Confetti Celebration blasting behind the modal */}
          <CelebrationPoppers active={!!appliedCelebrationCoupon} />

          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAppliedCelebrationCoupon(null)}
          />
          {appliedCelebrationCoupon && (
            <Animated.View
              style={[
                styles.celebrationModalCard,
                {
                  opacity: modalOpacityAnim,
                  transform: [{ scale: modalScaleAnim }],
                  zIndex: 100,
                  elevation: 50,
                },
              ]}
            >
              {/* Top Overflow Gold Badge with % */}
              <View style={styles.celebrationTopBadge}>
                <Svg width={48 * SCALE} height={48 * SCALE} viewBox="0 0 24 24" fill="none">
                  {/* Scalloped Gold Badge */}
                  <Path
                    d="M12 2L14.4 3.9L17.5 3.6L18.8 6.4L21.7 7.7L21.4 10.8L23.3 13.2L21.4 15.6L21.7 18.7L18.8 20L17.5 22.8L14.4 22.5L12 24.4L9.6 22.5L6.5 22.8L5.2 20L2.3 18.7L2.6 15.6L0.7 13.2L2.6 10.8L2.3 7.7L5.2 6.4L6.5 3.6L9.6 3.9L12 2Z"
                    fill="#DEA430"
                  />
                  {/* Black % Symbol */}
                  <Path
                    d="M9 8.5C9 9.3 8.3 10 7.5 10C6.7 10 6 9.3 6 8.5C6 7.7 6.7 7 7.5 7C8.3 7 9 7.7 9 8.5ZM18 17.5C18 18.3 17.3 19 16.5 19C15.7 19 15 18.3 15 17.5C15 16.7 15.7 16 16.5 16C17.3 16 18 16.7 18 17.5ZM17.3 7.2L6.7 18.8"
                    stroke="#000000"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>

              {/* Close Button X */}
              <TouchableOpacity
                style={styles.celebrationCloseBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setAppliedCelebrationCoupon(null)}
              >
                <X size={16 * SCALE} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Line 1: 'COUPON' applied */}
              <Text style={styles.celebrationAppliedCodeText}>
                ‘{appliedCelebrationCoupon.code}’ applied
              </Text>

              {/* Line 2: ₹X savings with this coupon. */}
              <Text style={styles.celebrationSavingsHeading}>
                <Text style={styles.celebrationSavingsGold}>₹{appliedCelebrationCoupon.discount} savings </Text>
                with this coupon.
              </Text>

              {/* Line 3: Description */}
              <Text style={styles.celebrationDescText}>
                {appliedCelebrationCoupon.code} and save every time you order
              </Text>

              {/* Action Button: YAY! */}
              <TouchableOpacity
                style={styles.celebrationYayBtn}
                activeOpacity={0.85}
                onPress={() => setAppliedCelebrationCoupon(null)}
              >
                <Text style={styles.celebrationYayBtnText}>YAY!</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          [13] FIGMA 3046:48 "HOLD ON! PAYMENT VERIFICATION" LOADER SCREEN
          ════════════════════════════════════════════════════════════════════════ */}
      <OrderPaymentLoaderScreen
        visible={showPaymentLoader}
        amount={finalTotal}
        restaurantId={currentRestaurant?.id || restaurantId || (cartItems && cartItems.length > 0 ? cartItems[0].restaurantId : '') || ''}
        restaurantName={displayRestaurantName}
        deliveryAddress={currentLocation?.address || (savedAddresses.length > 0 ? savedAddresses[0].address : '')}
        paymentMethod={selectedPayment}
        deliveryType={selectedDeliveryType}
        deliveryTip={selectedTip}
        deliveryInstructions={selectedInstructions}
        cookingInstruction={cookingInstruction}
        cutleryOptOut={parentCutleryOptOut || internalCutlery}
        cartItems={safeCart}
        estimatedDeliveryTime={selectedDeliveryType === 'express' ? expressEta : (selectedDeliveryType === 'eco' ? ecoEta : standardEta)}
        onComplete={async (orderId) => {
          setShowPaymentLoader(false);
          setCart([]);
          if (syncCartItems) {
            syncCartItems([]);
          }
          try {
            await AsyncStorage.removeItem('@cart_items');
          } catch (e) {}

          if (Platform.OS === 'android') {
            ToastAndroid.show(`🎉 Order placed successfully! Tracking your delivery...`, ToastAndroid.SHORT);
          }

          onConfirmPay(finalTotal, orderId);
        }}
        onCancel={() => {
          setShowPaymentLoader(false);
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          [14] FULL-SCREEN FIGMA/SCREENSHOT PAYMENT OPTIONS SHEET
          ════════════════════════════════════════════════════════════════════════ */}
      <PaymentOptionsSheet
        visible={showPaymentOptionsSheet}
        onClose={() => setShowPaymentOptionsSheet(false)}
        finalTotal={finalTotal}
        totalItemsCount={safeCart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
        restaurantName={displayRestaurantName}
        deliveryTime={selectedDeliveryType === 'express' ? expressEta : (selectedDeliveryType === 'eco' ? ecoEta : standardEta)}
        deliveryAddressLabel={currentLocation?.label || (savedAddresses.length > 0 ? savedAddresses[0].type : 'Home')}
        deliveryAddressText={currentLocation?.address || (savedAddresses.length > 0 ? savedAddresses[0].address : 'Select delivery location')}
        selectedPayment={selectedPayment}
        onSelectPayment={(method) => {
          setSelectedPayment(method);
          if (parentSetSelectedPayment) {
            parentSetSelectedPayment(method);
          }
          addLog(`Selected payment mode: ${method}`);
        }}
        onProceedToPayWithMethod={(method) => {
          setSelectedPayment(method);
          if (parentSetSelectedPayment) {
            parentSetSelectedPayment(method);
          }
          addLog(`Selected payment mode: ${method}`);
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          [15] CHOOSE DELIVERY ADDRESS MODAL (POPUP)
          ════════════════════════════════════════════════════════════════════════ */}
      <ChooseDeliveryAddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        savedAddresses={savedAddresses}
        currentLocation={currentLocation}
        onSelectAddress={(addr) => {
          if (setCurrentLocation) {
            setCurrentLocation({
              address: addr.address || `${addr.houseNo ? addr.houseNo + ', ' : ''}${addr.landmark ? addr.landmark + ', ' : ''}${addr.area ? addr.area + ', ' : ''}${addr.city || ''}`.trim(),
              latitude: addr.latitude || currentLocation?.latitude || 0,
              longitude: addr.longitude || currentLocation?.longitude || 0,
              label: addr.type,
            });
          }
          addLog(`Selected delivery address: ${addr.type || 'Custom'}`);
        }}
        onAddNewAddress={() => {
          setShowAddressModal(false);
          setShowLocationSelectorSheet(true);
          if (onChangeLocationPress) {
            onChangeLocationPress();
          }
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          [16] FULL LOCATION SELECTOR SHEET (MAP / SEARCH / ADD FORM)
          ════════════════════════════════════════════════════════════════════════ */}
      <LocationSelectorSheet
        visible={showLocationSelectorSheet}
        onClose={() => setShowLocationSelectorSheet(false)}
        onLocationSelected={(loc) => {
          if (setCurrentLocation) {
            setCurrentLocation({
              address: loc.address,
              latitude: loc.latitude,
              longitude: loc.longitude,
              label: loc.label || 'Home',
            });
          }
          setShowLocationSelectorSheet(false);
          addLog(`Updated delivery address from selector: ${loc.label || loc.address}`);
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════════
          [17] DISH CUSTOMIZATION POP-UP MODAL (EXACT PARITY WITH RESTAURANT DETAIL SCREEN)
          ════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showItemCustomizationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowItemCustomizationModal(false)}
      >
        <View style={styles.customModalOverlay}>
          <TouchableOpacity
            style={styles.customModalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setShowItemCustomizationModal(false)}
          />

          <View style={styles.customModalCard}>
            {/* Header: Thumbnail + Dish Title + Close Button */}
            <View style={styles.customModalHeader}>
              <View style={styles.customModalHeaderLeft}>
                {editingCartItem?.foodItem?.image ? (
                  <Image
                    source={typeof editingCartItem.foodItem.image === 'string' ? { uri: editingCartItem.foodItem.image } : editingCartItem.foodItem.image}
                    style={styles.customModalDishThumb}
                  />
                ) : (
                  <View style={styles.customModalDishThumbFallback} />
                )}
                <Text style={styles.customModalDishTitle} numberOfLines={1}>
                  {editingCartItem?.foodItem?.name || editingCartItem?.name || 'Dish Details'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.customModalCloseBtn}
                activeOpacity={0.8}
                onPress={() => setShowItemCustomizationModal(false)}
              >
                <Image source={modalClose} style={styles.customModalCloseImg} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Customization Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.customModalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mascot Speech Bubble Row */}
              <View style={styles.mascotSpeechRow}>
                <Image source={modalMascot} style={styles.mascotImg} />
                <View style={styles.speechBubbleCard}>
                  <Text style={styles.speechBubbleText}>
                    Customize your order with available choices and add-ons.
                  </Text>
                </View>
              </View>

              {/* Section 1: "Choose From Variant" */}
              {currentVariants.length > 1 && (
                <View style={styles.customSectionWrap}>
                  <Text style={styles.customSectionTitle}>Choose From Variant</Text>
                  <Text style={styles.customSectionSubtitle}>Select any 1</Text>

                  <View style={styles.variantsBox}>
                    {currentVariants.map((variant: any, index: number) => {
                      const isSelected = selectedVariantIndex === index;
                      return (
                        <React.Fragment key={`variant-${variant.id || index}`}>
                          <TouchableOpacity
                            style={styles.variantRow}
                            activeOpacity={0.7}
                            delayPressIn={0}
                            onPress={() => setSelectedVariantIndex(index)}
                          >
                            <View style={styles.variantLeft}>
                              <Image
                                source={editingCartItem?.foodItem?.isVeg ? checkVegIcon : dietNonVegIcon}
                                style={styles.dietIconSmall}
                              />
                              <Text style={styles.variantNameText}>{variant.name}</Text>
                            </View>

                            <View style={styles.variantRight}>
                              <Text style={styles.variantPriceText}>₹{variant.price}</Text>
                              <View style={[styles.radioCircleOutline, isSelected && styles.radioCircleActive]}>
                                {isSelected && <View style={styles.radioCircleInner} />}
                              </View>
                            </View>
                          </TouchableOpacity>
                          {index < currentVariants.length - 1 && (
                            <View style={styles.variantDivider} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Section 2: "Add-ons & Extras" */}
              {currentAddonsList.length > 0 && (
                <View style={styles.customSectionWrap}>
                  <Text style={styles.customSectionTitle}>
                    Add-ons & Recommended Extras
                  </Text>
                  <Text style={styles.customSectionSubtitle}>Select up to 3</Text>

                  <View style={styles.addonsBox}>
                    {currentAddonsList.map((addon: any, index: number) => {
                      const isChecked = selectedAddonIds.includes(addon.id);
                      return (
                        <React.Fragment key={`addon-${addon.id}`}>
                          <TouchableOpacity
                            style={styles.addonRow}
                            activeOpacity={0.7}
                            delayPressIn={0}
                            onPress={() => handleToggleAddon(addon.id)}
                          >
                            <View style={styles.addonLeft}>
                              <Image
                                source={addon.isVeg ? checkVegIcon : dietNonVegIcon}
                                style={styles.dietIconSmall}
                              />
                              <View style={styles.addonTitleWrap}>
                                {addon.tag && (
                                  <View style={styles.addonTagPill}>
                                    <Text style={styles.addonTagText}>{addon.tag}</Text>
                                  </View>
                                )}
                                <Text style={styles.addonNameText} numberOfLines={1}>
                                  {addon.name}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.addonRight}>
                              <Text style={styles.addonPriceText}>+ ₹{Number(addon.price).toFixed(2)}</Text>
                              <View style={[styles.checkboxOutline, isChecked && styles.checkboxActive]}>
                                {isChecked && <Check size={13} color="#000000" strokeWidth={3.5} />}
                              </View>
                            </View>
                          </TouchableOpacity>
                          {index < currentAddonsList.length - 1 && (
                            <View style={styles.variantDivider} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Sticky Action Row: Quantity Stepper + Update Specification Button */}
            <View style={[styles.customModalBottomBar, { paddingBottom: getSafeBottomPadding(insets.bottom, 16) }]}>
              {/* Stepper (- qty +) */}
              <View style={styles.modalStepperBox}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                >
                  <Minus size={14} color="#D8A635" strokeWidth={3} />
                </TouchableOpacity>

                <Text style={styles.stepperCountText}>{modalQuantity}</Text>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setModalQuantity(modalQuantity + 1)}
                >
                  <Plus size={14} color="#D8A635" strokeWidth={3} />
                </TouchableOpacity>
              </View>

              {/* Update Specification Button */}
              <TouchableOpacity
                style={styles.modalAddCtaBtn}
                activeOpacity={0.88}
                onPress={handleSaveItemCustomization}
              >
                <Text style={styles.modalAddCtaText}>Update Specification</Text>
                <Text style={styles.modalAddCtaPipe}>|</Text>
                <Text style={styles.modalAddCtaPrice}>₹{modalGrandTotal}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Pixel-Perfect Responsive Styles Matching Figma Node 3027:1201 ────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#010202',
  },
  scrollContent: {
    paddingHorizontal: 14 * SCALE,
    paddingTop: 8,
    paddingBottom: 24,
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },

  // ── 1. TOP HEADER ──────────────────────────────────────────────
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14 * SCALE,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 12,
    backgroundColor: '#010202',
  },
  headerBackBtn: {
    padding: 6,
  },
  headerBackImg: {
    width: 20 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  headerCenterCol: {
    flex: 1,
    marginHorizontal: 12 * SCALE,
  },
  headerRestaurantTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#B0B0B0',
    marginBottom: 2,
  },
  headerAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  headerHomeImg: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
  },
  headerAddressText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#AD8B36',
    maxWidth: SCREEN_WIDTH * 0.58,
  },
  headerChevronDownImg: {
    width: 8 * SCALE,
    height: 6 * SCALE,
    resizeMode: 'contain',
  },
  headerMoreBtn: {
    padding: 6,
  },
  headerMoreImg: {
    width: 5 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },

  // ── 2. BENEFITS BANNER ─────────────────────────────────────────
  benefitsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#110F0A',
    borderWidth: 1.2,
    borderColor: 'rgba(222, 164, 48, 0.28)',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 10 * SCALE,
    marginBottom: 12 * SCALE,
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  benefitsLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9 * SCALE,
    flex: 1,
  },
  benefitsIconBadge: {
    width: 24 * SCALE,
    height: 24 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: 'rgba(222, 164, 48, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsSparkleImg: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
  },
  benefitsText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#D4CEBE',
    letterSpacing: 0.15,
  },
  benefitsGoldText: {
    fontFamily: 'Urbanist-ExtraBold',
    color: '#F2CA50',
    letterSpacing: 0.2,
  },
  benefitsAppliedBadge: {
    backgroundColor: 'rgba(222, 164, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.25)',
    borderRadius: 6 * SCALE,
    paddingHorizontal: 7 * SCALE,
    paddingVertical: 3 * SCALE,
  },
  benefitsAppliedText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9 * SCALE,
    color: '#F2CA50',
    letterSpacing: 0.6,
  },

  // ── 3. GOLD CLUB CARD ──────────────────────────────────────────
  clubCardContainer: {
    backgroundColor: '#0E0C08',
    borderWidth: 1,
    borderColor: '#372D16',
    borderRadius: 18 * SCALE,
    padding: 14 * SCALE,
    marginBottom: 12 * SCALE,
  },
  clubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clubTitleWhite: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 16 * SCALE,
    color: '#CBC9C5',
  },
  clubQuroBadgeImg: {
    width: 48 * SCALE,
    height: 16 * SCALE,
    marginHorizontal: 3 * SCALE,
  },
  clubTitleGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#B5903A',
  },
  clubBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clubSubtitleText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#ADACAA',
    lineHeight: 16 * SCALE,
    maxWidth: SCREEN_WIDTH * 0.55,
  },
  clubExtendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * SCALE,
  },
  clubExtendBtn: {
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#66532D',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 5 * SCALE,
  },
  clubExtendBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#A17F33',
  },
  clubExtendPriceText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#AFAFAF',
  },

  // ── 4. CART ITEMS CARD ─────────────────────────────────────────
  cartItemsCard: {
    backgroundColor: '#080808',
    borderRadius: 18 * SCALE,
    padding: 14 * SCALE,
    marginBottom: 12 * SCALE,
    borderWidth: 1,
    borderColor: '#171717',
  },
  emptyCartCard: {
    alignItems: 'center',
    paddingVertical: 24 * SCALE,
    paddingHorizontal: 16 * SCALE,
    gap: 8 * SCALE,
  },
  emptyCartTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#D4D4D4',
  },
  emptyCartSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13 * SCALE,
    color: '#777777',
    textAlign: 'center',
    marginBottom: 8 * SCALE,
  },
  browseMenuBtn: {
    backgroundColor: '#E6A827',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 20 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  browseMenuText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#000000',
  },
  cartItemRowWrap: {
    marginBottom: 14 * SCALE,
  },
  cartItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cartItemLeftInfo: {
    flex: 1,
    flexShrink: 1,
    marginRight: 10 * SCALE,
  },
  cartItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
    marginBottom: 4,
    flex: 1,
  },
  cartVegIcon: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
  },
  cartItemName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#C5C5C5',
    flex: 1,
    flexShrink: 1,
  },
  cartItemVariantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  cartItemVariantText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#7F7F7F',
  },
  cartVariantChevron: {
    width: 7 * SCALE,
    height: 5 * SCALE,
    resizeMode: 'contain',
  },
  cartItemExtrasSubtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2 * SCALE,
  },
  cartItemExtrasSubtext: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11.5 * SCALE,
    color: '#D4AF37',
    lineHeight: 15 * SCALE,
  },
  cartItemRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * SCALE,
    flexShrink: 0,
  },
  cartStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#292615',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 6 * SCALE,
    paddingVertical: 2 * SCALE,
    gap: 4 * SCALE,
  },
  cartStepperBtn: {
    minWidth: 26 * SCALE,
    minHeight: 26 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4 * SCALE,
  },
  cartMinusIcon: {
    width: 12 * SCALE,
    height: 4 * SCALE,
    resizeMode: 'contain',
  },
  cartPlusIcon: {
    width: 12 * SCALE,
    height: 12 * SCALE,
    resizeMode: 'contain',
  },
  cartStepperCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#B4B4B4',
  },
  cartItemPriceText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5 * SCALE,
    color: '#C0C0C0',
  },
  cartItemExtrasCard: {
    marginTop: 8 * SCALE,
    marginLeft: 20 * SCALE,
    backgroundColor: '#0F0E0B',
    borderWidth: 1,
    borderColor: '#262013',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  cartItemExtrasTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5 * SCALE,
    marginBottom: 6 * SCALE,
  },
  cartItemExtrasTitleText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#D4AF37',
    letterSpacing: 0.2,
  },
  cartItemExtrasList: {
    gap: 4 * SCALE,
  },
  cartItemExtraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cartItemExtraBulletDot: {
    width: 4 * SCALE,
    height: 4 * SCALE,
    borderRadius: 2 * SCALE,
    backgroundColor: '#997D32',
    marginRight: 6 * SCALE,
  },
  cartItemExtraName: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12 * SCALE,
    color: '#A8A8A8',
    flex: 1,
  },
  cartItemExtraPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#E5C365',
    marginLeft: 8,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6 * SCALE,
    marginTop: 6,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 14 * SCALE,
    paddingVertical: 8 * SCALE,
    paddingHorizontal: 4 * SCALE,
    gap: 5 * SCALE,
  },
  quickActionPillActive: {
    borderColor: '#CBA143',
  },
  quickActionIcon: {
    width: 12 * SCALE,
    height: 12 * SCALE,
    resizeMode: 'contain',
  },
  quickActionText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#9A9A9A',
  },
  cutleryCheckbox: {
    width: 13 * SCALE,
    height: 13 * SCALE,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cutleryCheckboxActive: {
    borderColor: '#DEA430',
    backgroundColor: '#DEA430',
  },

  // ── 5. SURPRISE DEALS SECTION ──────────────────────────────────
  dealsSectionContainer: {
    backgroundColor: '#080908',
    borderWidth: 1,
    borderColor: '#1B1B1B',
    borderRadius: 18 * SCALE,
    padding: 12 * SCALE,
    marginBottom: 12 * SCALE,
  },
  dealsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10 * SCALE,
  },
  dealsTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  dealsTitleText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#A38438',
  },
  dealsSparkleIcon: {
    width: 12 * SCALE,
    height: 12 * SCALE,
    resizeMode: 'contain',
  },
  dealsTimerBadge: {
    backgroundColor: '#121008',
    borderWidth: 1,
    borderColor: '#1F1C0E',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 3 * SCALE,
  },
  dealsTimerText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#A38436',
  },
  dealsScroll: {
    gap: 10 * SCALE,
  },
  dealCard: {
    width: 118 * SCALE,
    backgroundColor: '#080908',
    borderWidth: 1,
    borderColor: '#1C1919',
    borderRadius: 14 * SCALE,
    overflow: 'hidden',
  },
  dealImgWrap: {
    width: '100%',
    height: 100 * SCALE,
    position: 'relative',
    backgroundColor: '#121212',
  },
  dealImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dealPlusBtn: {
    position: 'absolute',
    top: 6 * SCALE,
    right: 6 * SCALE,
  },
  dealPlusIcon: {
    width: 22 * SCALE,
    height: 22 * SCALE,
    resizeMode: 'contain',
  },
  dealInfoCol: {
    padding: 8 * SCALE,
    gap: 2,
  },
  dealNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 3,
    minHeight: 28 * SCALE,
  },
  dealVegIcon: {
    width: 10 * SCALE,
    height: 10 * SCALE,
    resizeMode: 'contain',
    marginTop: 2,
  },
  dealNameText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#A1A1A1',
    flex: 1,
    lineHeight: 14 * SCALE,
  },
  dealPercentText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5 * SCALE,
    color: '#A6883C',
    marginVertical: 1,
  },
  dealPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
  },
  dealStrikePrice: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#6A6A69',
    textDecorationLine: 'line-through',
  },
  dealFinalPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#A5A5A5',
  },

  // ── 6. SAVINGS CORNER ──────────────────────────────────────────
  savingsCornerCard: {
    backgroundColor: '#080908',
    borderWidth: 1,
    borderColor: '#201E19',
    borderRadius: 18 * SCALE,
    padding: 12 * SCALE,
    marginBottom: 12 * SCALE,
  },
  savingsCornerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#9B7831',
    marginBottom: 8 * SCALE,
  },
  couponRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * SCALE,
  },
  couponTagIcon: {
    width: 18 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  couponText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13 * SCALE,
    color: '#AFAFAF',
  },
  couponChevronIcon: {
    width: 7 * SCALE,
    height: 12 * SCALE,
    resizeMode: 'contain',
  },

  // ── 7. MULTI-SEGMENT DELIVERY TABS CARD (FIGMA NODE 3027:1201) ──
  deliveryTabsCard: {
    backgroundColor: '#080908',
    borderWidth: 1,
    borderColor: '#12120F',
    borderRadius: 18 * SCALE,
    padding: 12 * SCALE,
    marginBottom: 12 * SCALE,
  },
  tabsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1813',
    paddingBottom: 8 * SCALE,
    marginBottom: 10 * SCALE,
  },
  tabButton: {
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 6 * SCALE,
    position: 'relative',
    borderRadius: 16 * SCALE,
  },
  tabButtonActive: {
    backgroundColor: '#010101',
    borderWidth: 1,
    borderColor: '#41331B',
  },
  tabButtonText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#7C7B7A',
  },
  tabButtonTextActive: {
    fontFamily: 'Urbanist-Bold',
    color: '#AA8436',
  },
  tabIndicatorBar: {
    position: 'absolute',
    bottom: -9 * SCALE,
    left: 12 * SCALE,
    right: 12 * SCALE,
    height: 2.5,
    backgroundColor: '#AA8436',
    borderRadius: 2,
  },
  deliveryOptionsList: {
    gap: 8 * SCALE,
  },
  deliveryOptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6 * SCALE,
    gap: 10 * SCALE,
  },
  radioIconImg: {
    width: 18 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
    marginTop: 2,
  },
  deliveryOptionContent: {
    flex: 1,
  },
  deliveryOptionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  expressTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  expressBoltImg: {
    width: 10 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
  },
  deliveryOptionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#B6B6B5',
  },
  expressStrikePrice: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#70706F',
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  expressDealPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#BBBBBA',
  },
  deliveryOptionEta: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#8C8C8B',
  },
  deliveryOptionEtaGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#AF8835',
  },
  deliveryOptionSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#6E6E6C',
  },
  deliveryDivider: {
    height: 1,
    backgroundColor: '#12120F',
  },
  tipTabContent: {
    paddingVertical: 6 * SCALE,
  },
  tipHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  tipSubtext: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#777777',
    marginBottom: 8 * SCALE,
  },
  tipButtonsRow: {
    flexDirection: 'row',
    gap: 8 * SCALE,
  },
  tipPill: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262420',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 6 * SCALE,
  },
  tipPillActive: {
    backgroundColor: '#2A2211',
    borderColor: '#DEA430',
  },
  tipPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#A0A0A0',
  },
  tipPillTextActive: {
    color: '#DEA430',
  },
  tipClearPill: {
    justifyContent: 'center',
    paddingHorizontal: 8 * SCALE,
  },
  tipClearText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#777777',
  },
  instructionsTabContent: {
    paddingVertical: 6 * SCALE,
  },
  instructionsHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#CCCCCC',
    marginBottom: 8 * SCALE,
  },
  instructionPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6 * SCALE,
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262420',
    borderRadius: 8 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 6 * SCALE,
    gap: 4 * SCALE,
  },
  instructionBadgeActive: {
    backgroundColor: '#DEA430',
    borderColor: '#DEA430',
  },
  instructionBadgeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#999999',
  },
  instructionBadgeTextActive: {
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },

  // ── 8. COLLAPSIBLE "TO PAY" BILL ACCORDION CARD (FIGMA NODE 3027:1201) ──
  toPayAccordionCard: {
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#0F0F0D',
    borderRadius: 18 * SCALE,
    padding: 12 * SCALE,
    marginBottom: 14 * SCALE,
  },
  toPayMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptGreenImg: {
    width: 32 * SCALE,
    height: 34 * SCALE,
    resizeMode: 'contain',
    marginRight: 10 * SCALE,
  },
  toPayInfoCol: {
    flex: 1,
    gap: 2,
  },
  toPayPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
  },
  toPayLabelText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#BCBBBB',
  },
  toPayStrikeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#70706E',
    textDecorationLine: 'line-through',
  },
  toPayFinalText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#BABABA',
  },
  toPaySavingsText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#DEA430',
  },
  toPayChevronImg: {
    width: 12 * SCALE,
    height: 8 * SCALE,
    resizeMode: 'contain',
    marginLeft: 6 * SCALE,
  },
  expandedBillBreakdown: {
    marginTop: 8 * SCALE,
    gap: 6 * SCALE,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#1E1E1C',
    marginVertical: 4 * SCALE,
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billDetailLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#8E8E8E',
  },
  billDetailValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#CCCCCC',
  },
  billDetailLabelGreen: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12 * SCALE,
    color: '#DEA430',
  },
  billDetailValueGreen: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#F2CA50',
  },
  freeDeliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freeDeliveryStrike: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#666666',
    textDecorationLine: 'line-through',
  },
  freeDeliveryGreen: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#F2CA50',
  },

  // ── 9. CANCELLATION POLICY ─────────────────────────────────────
  cancellationPolicyContainer: {
    paddingHorizontal: 4 * SCALE,
    marginBottom: 8 * SCALE,
  },
  cancellationTitle: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12.5 * SCALE,
    color: '#A3A3A3',
    marginBottom: 3,
  },
  cancellationBody: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#5E5D5D',
    lineHeight: 16 * SCALE,
  },

  // ── 10. FOOTER - TACTICAL PAYMENT BAR ──────────────────────────
  stickyFooterBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#080808',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1C',
    paddingHorizontal: 14 * SCALE,
    paddingTop: 10 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 1000,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10 * SCALE,
    marginBottom: 6 * SCALE,
  },
  paymentMethodQuickSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262420',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 6 * SCALE,
    gap: 6 * SCALE,
  },
  paytmLogoImg: {
    width: 28 * SCALE,
    height: 28 * SCALE,
    resizeMode: 'contain',
    borderRadius: 6 * SCALE,
  },
  footerGpayIconBox: {
    width: 28 * SCALE,
    height: 28 * SCALE,
    borderRadius: 6 * SCALE,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerGpayLetter: {
    fontFamily: 'Urbanist-Black',
    fontSize: 12 * SCALE,
    color: '#4285F4',
  },
  footerGpayText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9 * SCALE,
    color: '#5F6368',
    marginLeft: 0.5,
  },
  footerVisaBadge: {
    width: 28 * SCALE,
    height: 20 * SCALE,
    borderRadius: 4 * SCALE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerVisaText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 8.5 * SCALE,
    color: '#1A1F71',
    letterSpacing: 0.5,
  },
  footerSuperMoneyBadge: {
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 6 * SCALE,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSuperMoneyText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 13 * SCALE,
    color: '#FFFFFF',
  },
  footerPhonePeBadge: {
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 6 * SCALE,
    backgroundColor: '#5F259F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPhonePeText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 14 * SCALE,
    color: '#FFFFFF',
  },
  footerAmazonBadge: {
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 6 * SCALE,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerAmazonText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9 * SCALE,
    color: '#FFFFFF',
  },
  footerWhatsappBadge: {
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 6 * SCALE,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCodBadge: {
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 6 * SCALE,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTextsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
  },
  paymentTexts: {
    gap: 1,
  },
  paymentMethodName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10 * SCALE,
    color: '#E5E2E1',
    letterSpacing: 0.3,
  },
  paymentChangeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8.5 * SCALE,
    color: '#DEA430',
    letterSpacing: 0.5,
  },
  unifiedCTA: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161514',
    borderWidth: 1,
    borderColor: '#2C271E',
    borderRadius: 14 * SCALE,
    paddingLeft: 12 * SCALE,
    paddingRight: 4 * SCALE,
    paddingVertical: 4 * SCALE,
    height: 48 * SCALE,
  },
  ctaTotalSide: {
    justifyContent: 'center',
  },
  ctaTotalAmount: {
    fontFamily: 'Urbanist-Black',
    fontSize: 15 * SCALE,
    color: '#FFFFFF',
    lineHeight: 18 * SCALE,
  },
  ctaTotalLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8.5 * SCALE,
    color: '#8A857B',
    letterSpacing: 0.5,
  },
  placeOrderBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 9 * SCALE,
    gap: 4 * SCALE,
  },
  placeOrderBtnText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 12.5 * SCALE,
    color: '#000000',
    letterSpacing: 0.5,
  },
  walletFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 2,
    gap: 6 * SCALE,
  },
  walletLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#777777',
  },
  walletAmount: {
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  walletDot: {
    fontSize: 10 * SCALE,
    color: '#444444',
  },
  walletAddFunds: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#DEA430',
    textDecorationLine: 'underline',
  },

  // ── MODALS ─────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    backgroundColor: '#121212',
    borderRadius: 18 * SCALE,
    padding: 18 * SCALE,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 12,
  },
  dialogTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#FFFFFF',
  },
  dialogInput: {
    backgroundColor: '#080808',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13 * SCALE,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dialogCancelText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13 * SCALE,
    color: '#888888',
  },
  dialogSaveBtn: {
    backgroundColor: '#DEA430',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dialogSaveText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#000000',
  },
  couponModalCard: {
    backgroundColor: '#121212',
    borderRadius: 20 * SCALE,
    padding: 18 * SCALE,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#FFFFFF',
  },
  couponItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#080808',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222222',
    padding: 12,
  },
  couponInfo: {
    flex: 1,
    marginRight: 8,
  },
  couponCode: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#DEA430',
  },
  couponDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#888888',
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: '#1E1A11',
    borderWidth: 1,
    borderColor: '#DEA430',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  applyBtnActive: {
    backgroundColor: '#DEA430',
  },
  applyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#DEA430',
  },
  applyBtnTextActive: {
    color: '#000000',
  },

  // ── Coupon Celebration Modal Styles (Pixel-Perfect Figma/Screenshot) ──
  celebrationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28 * SCALE,
    zIndex: 99999,
  },
  celebrationModalCard: {
    width: '100%',
    maxWidth: 325 * SCALE,
    backgroundColor: '#141416',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24 * SCALE,
    paddingHorizontal: 22 * SCALE,
    paddingBottom: 22 * SCALE,
    paddingTop: 36 * SCALE,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 25,
  },
  celebrationTopBadge: {
    position: 'absolute',
    top: -24 * SCALE,
    alignSelf: 'center',
    width: 48 * SCALE,
    height: 48 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  celebrationCloseBtn: {
    position: 'absolute',
    top: 14 * SCALE,
    right: 14 * SCALE,
    width: 32 * SCALE,
    height: 32 * SCALE,
    borderRadius: 16 * SCALE,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  celebrationAppliedCodeText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14.5 * SCALE,
    color: '#D4D4D8',
    textAlign: 'center',
    marginBottom: 8 * SCALE,
  },
  celebrationSavingsHeading: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 22 * SCALE,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28 * SCALE,
    marginBottom: 8 * SCALE,
    paddingHorizontal: 6 * SCALE,
  },
  celebrationSavingsGold: {
    fontFamily: 'Urbanist-Black',
    color: '#DEA430',
  },
  celebrationDescText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13 * SCALE,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 18 * SCALE,
    marginBottom: 22 * SCALE,
    paddingHorizontal: 8 * SCALE,
  },
  celebrationYayBtn: {
    width: '100%',
    height: 48 * SCALE,
    borderRadius: 14 * SCALE,
    backgroundColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationYayBtnText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 16 * SCALE,
    color: '#000000',
    letterSpacing: 0.5,
  },

  // ── 13. DISH CUSTOMIZATION POP-UP MODAL (FIGMA NODE 3027:1105 PARITY) ──
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  customModalBackdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  customModalCard: {
    backgroundColor: '#0A0A08',
    borderTopLeftRadius: 28 * SCALE,
    borderTopRightRadius: 28 * SCALE,
    borderWidth: 1,
    borderColor: '#22201D',
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 16 * SCALE,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18 * SCALE,
    paddingBottom: 14 * SCALE,
    borderBottomWidth: 1,
    borderBottomColor: '#171715',
  },
  customModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 * SCALE,
    flex: 1,
  },
  customModalDishThumb: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 12 * SCALE,
    resizeMode: 'cover',
  },
  customModalDishThumbFallback: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#1E1E1C',
  },
  customModalDishTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18 * SCALE,
    color: '#E5E2E1',
    flex: 1,
  },
  customModalCloseBtn: {
    padding: 6,
  },
  customModalCloseImg: {
    width: 18 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  customModalScroll: {
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 12 * SCALE,
  },
  mascotSpeechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * SCALE,
    marginBottom: 18 * SCALE,
  },
  mascotImg: {
    width: 58 * SCALE,
    height: 72 * SCALE,
    resizeMode: 'contain',
  },
  speechBubbleCard: {
    flex: 1,
    backgroundColor: '#13100B',
    borderWidth: 1,
    borderColor: '#342C1B',
    borderRadius: 18 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 10 * SCALE,
  },
  speechBubbleText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#C5B496',
    lineHeight: 17 * SCALE,
  },
  customSectionWrap: {
    marginBottom: 20 * SCALE,
  },
  customSectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5 * SCALE,
    color: '#D4D4D4',
    marginBottom: 2,
  },
  customSectionSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#777777',
    marginBottom: 10 * SCALE,
  },
  variantsBox: {
    backgroundColor: '#070806',
    borderWidth: 1,
    borderColor: '#1E1E1B',
    borderRadius: 18 * SCALE,
    overflow: 'hidden',
  },
  variantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 14 * SCALE,
  },
  variantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * SCALE,
    flex: 1,
  },
  dietIconSmall: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
  },
  variantNameText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 14 * SCALE,
    color: '#CCCCCC',
  },
  variantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 * SCALE,
  },
  variantPriceText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#CCCCCC',
  },
  radioCircleOutline: {
    width: 20 * SCALE,
    height: 20 * SCALE,
    borderRadius: 10 * SCALE,
    borderWidth: 2,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  radioCircleActive: {
    borderColor: '#DEA430',
  },
  radioCircleInner: {
    width: 10 * SCALE,
    height: 10 * SCALE,
    borderRadius: 5 * SCALE,
    backgroundColor: '#DEA430',
  },
  variantDivider: {
    height: 1,
    backgroundColor: '#171715',
    marginHorizontal: 14 * SCALE,
  },
  addonsBox: {
    backgroundColor: '#070806',
    borderWidth: 1,
    borderColor: '#201E1A',
    borderRadius: 18 * SCALE,
    overflow: 'hidden',
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 13 * SCALE,
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * SCALE,
    flex: 1,
  },
  addonTitleWrap: {
    flex: 1,
    gap: 3,
  },
  addonTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E190D',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  addonTagText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9 * SCALE,
    color: '#947A34',
  },
  addonNameText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5 * SCALE,
    color: '#CCCCCC',
  },
  addonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * SCALE,
  },
  addonPriceText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#888888',
  },
  checkboxOutline: {
    width: 20 * SCALE,
    height: 20 * SCALE,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#666666',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    borderColor: '#DEA430',
    backgroundColor: '#DEA430',
  },
  customModalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingTop: 12 * SCALE,
    gap: 12 * SCALE,
    borderTopWidth: 1,
    borderTopColor: '#171715',
  },
  modalStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#7F6D36',
    borderRadius: 16 * SCALE,
    height: 50 * SCALE,
    paddingHorizontal: 12 * SCALE,
    gap: 16 * SCALE,
  },
  stepperBtn: {
    padding: 6,
  },
  stepperCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#FFFFFF',
  },
  modalAddCtaBtn: {
    flex: 1,
    height: 50 * SCALE,
    backgroundColor: '#D8A635',
    borderRadius: 16 * SCALE,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8 * SCALE,
  },
  modalAddCtaText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 15.5 * SCALE,
    color: '#2E1F07',
  },
  modalAddCtaPipe: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5 * SCALE,
    color: '#3E2904',
  },
  modalAddCtaPrice: {
    fontFamily: 'Urbanist-Black',
    fontSize: 15.5 * SCALE,
    color: '#2E1F07',
  },
});
