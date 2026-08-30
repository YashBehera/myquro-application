import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  ToastAndroid,
} from 'react-native';
import {
  ArrowLeft,
  Menu,
  MapPin,
  CheckCircle2,
  Star,
  RotateCcw,
  User,
  MapPinned,
  CreditCard,
  Ticket,
  FileText,
  GraduationCap,
  Settings,
  LogOut,
  Heart,
  Navigation,
  Clock,
  ShoppingBag,
  ChevronDown,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config';
import { useViewModel } from '../state/MainViewModel';
import { isTablet } from '../utils/responsive';

import { EditProfileSubView } from './profile/EditProfileSubView';
import { AddressesSubView } from './profile/AddressesSubView';
import { PaymentsSubView } from './profile/PaymentsSubView';
import { HelpSubView } from './profile/HelpSubView';
import { FavouritesSubView } from './profile/FavouritesSubView';
import { VouchersSubView } from './profile/VouchersSubView';
import { StatementSubView } from './profile/StatementSubView';
import { StudentRewardsSubView } from './profile/StudentRewardsSubView';
import { SettingsSubView } from './profile/SettingsSubView';
import { LogoutSubView } from './profile/LogoutSubView';
import { OrderDetailsSubView } from './profile/OrderDetailsSubView';
import { RefundScreen } from './profile/RefundScreen';

// ─── Figma Node 3025:799 & 3029:1729 Profile Assets ──────────────────────────
const profHeadphones         = require('../assets/profile/profHeadphones.png');
const profPhoneIcon          = require('../assets/profile/profPhoneIcon.png');
const headerArtLarge         = require('../assets/profile/headerArtLarge.png');
const headerArtCircle        = require('../assets/profile/headerArtCircle.png');
const profChevron            = require('../assets/profile/profChevron.png');
const profUpdatePhone        = require('../assets/profile/profUpdatePhone.png');
const profSavedAddress       = require('../assets/profile/profSavedAddress.png');
const profPaymentModes       = require('../assets/profile/profPaymentModes.png');
const profMyRefunds          = require('../assets/profile/profMyRefunds.png');
const profMyQuroMoney        = require('../assets/profile/profMyQuroMoney.png');
const profVouchers           = require('../assets/profile/profVouchers.png');
const profAccountStatement   = require('../assets/profile/profAccountStatement.png');
const profStudentRewards     = require('../assets/profile/profStudentRewards.png');
const quroBadgeImg           = require('../assets/images/quro_badge.png');

const orderResAsiaSeven      = require('../assets/profile/orderResAsiaSeven.png');

interface ProfileScreenProps {
  onBackToHome?: () => void;
  onNavigateToTracking?: (orderId: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBackToHome, onNavigateToTracking }) => {
  const {
    isDarkMode,
    authState,
    savedAddresses,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
    logout,
    deleteAccount,
    updateProfile,
    favouriteRestaurantsList,
    toggleFavourite,
    addToCart,
    addMultipleToCart,
    foodItems,
    allRestaurants,
    userOrders = [],
    refreshUserOrders,
  } = useViewModel();

  // Navigation states
  const [currentView, setCurrentView] = useState<
    'main' | 'edit_profile' | 'addresses' | 'payments' | 'help' | 'favourites' | 'vouchers' | 'statement' | 'student_rewards' | 'settings' | 'logout' | 'order_details' | 'refunds'
  >('main');

  // Selected Order for Figma Node 3029:1553 Details View
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);

  // Menu popup state
  const [showMenuOptions, setShowMenuOptions] = useState(false);

  // Pagination for in-screen past orders (show 5, load 5 more on click)
  const [visibleOrdersCount, setVisibleOrdersCount] = useState(5);

  // Edit Profile fields
  const [editName, setEditName] = useState(
    authState.type === 'Authenticated' ? (authState.username || (authState as any).user?.name || '') : ''
  );
  const [editEmail, setEditEmail] = useState(
    authState.type === 'Authenticated' ? (authState.email || (authState as any).user?.email || '') : ''
  );
  const [editPhone, setEditPhone] = useState(
    authState.type === 'Authenticated' ? ((authState as any).phone || (authState as any).user?.phone || '') : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  // Orders list state initialized with in-memory orders
  const [ordersList, setOrdersList] = useState<any[]>(userOrders);

  useEffect(() => {
    if (userOrders && userOrders.length > 0) {
      setOrdersList(userOrders);
    }
  }, [userOrders]);

  // Interactive Ratings state per order
  const [ratings, setRatings] = useState<Record<string, { food: number; delivery: number }>>({});

  const normalizePrice = (raw: any): number => {
    if (raw === undefined || raw === null || raw === '') return 0;
    let num = typeof raw === 'number' ? raw : (parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0);
    if (isNaN(num) || num <= 0) return 0;
    // Handle paise: e.g. 15000 -> 150, 30000 -> 300, 29900 -> 299, 45000 -> 450
    if (num >= 1000 && num % 100 === 0) {
      num = num / 100;
    } else if (num >= 2000) {
      num = num / 100;
    }
    return Math.round(num);
  };

  // Helper to extract clean numerical price for an item
  const getItemPrice = (it: any): number => {
    if (!it) return 0;
    const qty = Math.max(1, parseInt(String(it.quantity || it.qty || 1), 10));

    // Priority 1: unit price fields
    const rawUnit = it.price ?? it.unitPrice ?? it.basePrice ?? it.itemPrice ?? it.foodItem?.price;
    let unitPrice = normalizePrice(rawUnit);

    // If unit price is 0 and it.totalPrice is provided
    if (unitPrice <= 0 && it.totalPrice !== undefined && it.totalPrice !== null) {
      const normalizedTotal = normalizePrice(it.totalPrice);
      unitPrice = qty > 1 ? Math.round(normalizedTotal / qty) : normalizedTotal;
    }

    // Check if matched in foodItems or allRestaurants
    if (unitPrice <= 0 && foodItems && foodItems.length > 0) {
      const matchFood = foodItems.find((f: any) => f.id === it.id || f.id === it.menuItemId || f.name === (it.name || it.menuItemName));
      if (matchFood && typeof matchFood.price === 'number' && matchFood.price > 0) {
        unitPrice = normalizePrice(matchFood.price);
      }
    }

    return Math.max(0, unitPrice);
  };

  // Helper to calculate or extract the full order total
  const getOrderTotalAmount = (order: any): number => {
    if (!order) return 0;
    const raw = order.billTotal ?? order.grandTotal ?? order.totalAmount ?? order.amount ?? order.subtotal;
    let total = normalizePrice(raw);

    if (total > 0) return total;

    // Fallback: sum up items
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      const sum = order.items.reduce((acc: number, it: any) => {
        const p = getItemPrice(it);
        const q = Math.max(1, parseInt(String(it.quantity || it.qty || 1), 10));
        return acc + (p * q);
      }, 0);
      if (sum > 0) return Math.round(sum);
    }
    return 0;
  };

  // Helper to format currency
  const formatOrderAmount = (rawAmount: any): string => {
    const num = normalizePrice(rawAmount);
    return `₹${num}`;
  };

  const fetchUserOrders = async () => {
    try {
      let remoteOrders: any[] = [];
      let userId: string | null = null;
      let sessionToken: string | null = null;

      if (authState.type === 'Authenticated') {
        userId = (authState as any).userId || (authState as any).user?.id || (authState as any).id || null;
        sessionToken = authState.sessionToken || null;
      }

      if (!userId || !sessionToken) {
        try {
          const storedAuth = await AsyncStorage.getItem('@auth_state');
          if (storedAuth) {
            const parsedAuth = JSON.parse(storedAuth);
            if (parsedAuth?.type === 'Authenticated') {
              userId = parsedAuth.userId || parsedAuth.user?.id || parsedAuth.id || null;
              sessionToken = parsedAuth.sessionToken || null;
            }
          }
        } catch (e) {}
      }

      if (userId && sessionToken) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/orders/${userId}/user-orders`, {
            headers: {
              Authorization: `Bearer ${sessionToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.orders && Array.isArray(data.orders)) {
              remoteOrders = data.orders;
            } else if (Array.isArray(data)) {
              remoteOrders = data;
            }
          }
        } catch (e) {
          console.warn('[ProfileScreen] Error fetching remote user orders:', e);
        }
      }

      let localOrders: any[] = [];
      try {
        const localData = await AsyncStorage.getItem('@placed_orders_history');
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed)) {
            localOrders = [...localOrders, ...parsed];
          }
        }
      } catch (e) {}

      try {
        const altLocal = await AsyncStorage.getItem('@order_history');
        if (altLocal) {
          const parsed = JSON.parse(altLocal);
          if (Array.isArray(parsed)) {
            localOrders = [...localOrders, ...parsed];
          }
        }
      } catch (e) {}

      const mergedMap = new Map<string, any>();
      localOrders.forEach(o => {
        if (o && (o.id || o.orderId)) {
          const id = String(o.id || o.orderId);
          mergedMap.set(id, o);
        }
      });
      remoteOrders.forEach(o => {
        if (o && (o.id || o.orderId)) {
          const id = String(o.id || o.orderId);
          const existing = mergedMap.get(id) || {};
          mergedMap.set(id, { ...existing, ...o });
        }
      });

      const combined = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });

      setOrdersList(combined);
    } catch (err) {
      console.warn('[ProfileScreen] Error loading orders:', err);
    }
  };

  useEffect(() => {
    fetchUserOrders();
    if (authState.type === 'Authenticated') {
      setEditName(authState.username || (authState as any).user?.name || '');
      setEditEmail(authState.email || (authState as any).user?.email || '');
      setEditPhone((authState as any).phone || (authState as any).user?.phone || '');
    }
  }, [authState, currentView]);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleRate = (orderId: string, type: 'food' | 'delivery', rating: number) => {
    setRatings((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || { food: 0, delivery: 0 }),
        [type]: rating,
      },
    }));
    showToast(`Rated ${type === 'food' ? 'food' : 'delivery'} ${rating} star${rating > 1 ? 's' : ''}`);
  };

  const handleReorder = (order: any) => {
    if (!order) return;
    let itemsArr: any[] = [];
    if (Array.isArray(order.items)) {
      itemsArr = order.items;
    } else if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        if (Array.isArray(parsed)) itemsArr = parsed;
      } catch (e) {}
    }

    if (itemsArr.length > 0) {
      const restId = order.restaurantId || order.restaurant_id || 'restaurant_1';
      const restName = order.restaurantName || order.restaurant_name || 'Restaurant';

      const itemsToAdd = itemsArr.map((it: any) => {
        const resolvedPrice = getItemPrice(it);
        const resolvedQty = Math.max(1, parseInt(String(it.quantity || it.qty || 1), 10));
        const matchedFood = foodItems && foodItems.length > 0 ? foodItems.find((f: any) => f.id === it.id || f.id === it.menuItemId || f.name === (it.name || it.menuItemName)) : undefined;

        return {
          id: it.id || it.menuItemId || (matchedFood ? matchedFood.id : `reorder_${Date.now()}_${Math.random()}`),
          name: it.name || it.menuItemName || it.itemName || (matchedFood ? matchedFood.name : 'Food Item'),
          price: resolvedPrice > 0 ? resolvedPrice : (matchedFood && typeof matchedFood.price === 'number' ? matchedFood.price : 150),
          quantity: resolvedQty,
          restaurantId: restId,
          restaurantName: restName,
          image: it.image || it.imageUrl || it.coverUrl || matchedFood?.image || undefined,
          isVeg: it.isVeg ?? it.is_veg ?? matchedFood?.isVeg ?? false,
          description: it.description || matchedFood?.description || '',
          variantId: it.variantId || it.variant_id || null,
        };
      });

      if (itemsToAdd.length > 0) {
        addMultipleToCart(itemsToAdd);
        const totalItemsCount = itemsToAdd.reduce((sum, item) => sum + item.quantity, 0);
        showToast(`Added ${totalItemsCount} item${totalItemsCount > 1 ? 's' : ''} from ${restName} to your cart!`);
      } else {
        showToast(`No items could be added to cart.`);
      }
    } else {
      showToast(`No items found in this order to reorder.`);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      updateProfile(editName, editEmail);
      showToast('Profile updated successfully!');
      setCurrentView('main');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayOrders = ordersList;

  // ─── SUB-VIEWS ROUTING ───

  if (currentView === 'edit_profile') {
    return (
      <EditProfileSubView
        isDarkMode={isDarkMode}
        isLoading={isLoading}
        editName={editName}
        setEditName={setEditName}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        handleSaveProfile={handleSaveProfile}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'addresses') {
    return (
      <AddressesSubView
        isDarkMode={isDarkMode}
        authState={authState}
        savedAddresses={savedAddresses}
        addSavedAddress={addSavedAddress}
        updateSavedAddress={updateSavedAddress}
        deleteSavedAddress={deleteSavedAddress}
        onBack={() => setCurrentView('main')}
        editName={editName}
        editPhone={editPhone}
        showToast={showToast}
      />
    );
  }

  if (currentView === 'payments') {
    return (
      <PaymentsSubView
        isDarkMode={isDarkMode}
        paymentsList={[]}
        onBack={() => setCurrentView('main')}
        showToast={showToast}
      />
    );
  }

  if (currentView === 'help') {
    return (
      <HelpSubView
        isDarkMode={isDarkMode}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'favourites') {
    return (
      <FavouritesSubView
        isDarkMode={isDarkMode}
        favouriteRestaurantsList={favouriteRestaurantsList || []}
        toggleFavourite={toggleFavourite}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'vouchers') {
    return (
      <VouchersSubView
        isDarkMode={isDarkMode}
        vouchers={[]}
        onBack={() => setCurrentView('main')}
        showToast={showToast}
      />
    );
  }

  if (currentView === 'statement') {
    return (
      <StatementSubView
        email={editEmail}
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'student_rewards') {
    return (
      <StudentRewardsSubView
        onBack={() => setCurrentView('main')}
      />
    );
  }

  if (currentView === 'settings') {
    return (
      <SettingsSubView
        onBack={() => setCurrentView('main')}
        showToast={showToast}
        logout={() => {
          logout();
          setCurrentView('main');
          if (onBackToHome) onBackToHome();
        }}
        deleteAccount={async () => {
          await deleteAccount();
          setCurrentView('main');
          if (onBackToHome) onBackToHome();
        }}
      />
    );
  }

  if (currentView === 'logout') {
    return (
      <LogoutSubView
        onBack={() => setCurrentView('main')}
        showToast={showToast}
        logout={() => {
          logout();
          setCurrentView('main');
          if (onBackToHome) onBackToHome();
        }}
      />
    );
  }

  if (currentView === 'refunds') {
    return (
      <RefundScreen
        orders={ordersList}
        onBack={() => setCurrentView('main')}
        onNavigateToOrder={(ordId) => {
          const matching = ordersList.find((o) => String(o.id || o.orderId) === String(ordId));
          if (matching) {
            setSelectedOrderForDetails(matching);
            setCurrentView('order_details');
          } else {
            showToast(`Order #${ordId}`);
          }
        }}
      />
    );
  }

  if (currentView === 'order_details') {
    return (
      <OrderDetailsSubView
        order={selectedOrderForDetails}
        onBack={() => {
          setSelectedOrderForDetails(null);
          setCurrentView('main');
        }}
        onHelp={() => setCurrentView('help')}
        onReorder={(ord) => {
          handleReorder(ord);
        }}
      />
    );
  }

  // ─── MAIN FIGMA PROFILE SCREEN VIEW (NODE 3025:799) ───
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* ─── [1] TOP HEADER ROW (NO LOGO, CLEAN BACK ARROW + HELP & HAMBURGER) ─── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {onBackToHome && (
            <TouchableOpacity onPress={onBackToHome} activeOpacity={0.7} style={styles.backBtn}>
              <ArrowLeft size={22} color="#DDDDDC" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.helpBtn}
            activeOpacity={0.8}
            onPress={() => setCurrentView('help')}
          >
            <Image source={profHeadphones} style={styles.helpIcon} />
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>

          {/* Proper Hamburger Icon besides Help */}
          <TouchableOpacity
            style={styles.hamburgerBtn}
            activeOpacity={0.7}
            onPress={() => setShowMenuOptions(!showMenuOptions)}
          >
            <Menu size={18} color="#D4AF37" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── QUICK ACCOUNT OPTIONS POPUP MODAL ─── */}
      {showMenuOptions && (
        <View style={styles.menuDropdownOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowMenuOptions(false)}
          />
          <View style={styles.menuDropdownCard}>
            {/* Option 1: Edit Profile */}
            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('edit_profile');
              }}
            >
              <User size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Option 2: Settings */}
            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('settings');
              }}
            >
              <Settings size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>Settings</Text>
            </TouchableOpacity>

            {/* Option 3: Log Out */}
            <TouchableOpacity
              style={[styles.menuDropdownItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('logout');
              }}
            >
              <LogOut size={16} color="#EF4444" style={{ marginRight: 10 }} />
              <Text style={[styles.menuDropdownItemText, { color: '#EF4444' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── [2] USER INFO BANNER (WITH GOLD SPIRAL ARTWORK) ─── */}
        <View style={styles.userBannerContainer}>
          <Image source={headerArtLarge} style={styles.userBannerBgArtwork} resizeMode="contain" />
          <Image source={headerArtCircle} style={styles.userBannerBgArtwork2} resizeMode="contain" />

          <View style={styles.userBannerContent}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setCurrentView('edit_profile')}
            >
              <Text style={styles.userNameText}>{editName || 'Yash'}</Text>
            </TouchableOpacity>

            <View style={styles.userPhoneRow}>
              <Image source={profPhoneIcon} style={styles.userPhoneIcon} />
              <Text style={styles.userPhoneText}>{editPhone || '+91 - 9777653495'}</Text>
            </View>
          </View>
        </View>

        {/* ─── [3] QURO MEMBERSHIP BANNER ─── */}
        <TouchableOpacity
          style={styles.oneBannerCard}
          activeOpacity={0.85}
          onPress={() => showToast('MyQURO: Unlimited FREE Delivery on all orders!')}
        >
          <View style={styles.oneBannerTopRow}>
            <View style={styles.oneLogoRow}>
              <Image source={quroBadgeImg} style={styles.quroProfileBadgeImg} resizeMode="contain" />
              <View style={styles.oneActiveBadge}>
                <View style={styles.oneActiveDot} />
                <Text style={styles.oneActiveText}>ACTIVE</Text>
              </View>
            </View>
            <Image source={profChevron} style={styles.oneChevronIcon} />
          </View>

          <Text style={styles.oneSavedText}>₹90 saved in 88 days</Text>
          <Text style={styles.oneBenefitsText}>Explore all MyQURO benefits</Text>
        </TouchableOpacity>

        {/* ─── [4] APP UPDATE AVAILABLE BANNER ─── */}
        <View style={styles.updateCard}>
          <View style={styles.updateLeft}>
            <Image source={profUpdatePhone} style={styles.updateIcon} />
            <View style={styles.updateTextGroup}>
              <Text style={styles.updateTitle}>App Update Available</Text>
              <Text style={styles.updateSubtitle}>Version8.4.0</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.updateBtn}
            activeOpacity={0.8}
            onPress={() => showToast('Checking Google Play / App Store for latest update...')}
          >
            <Text style={styles.updateBtnText}>Update</Text>
          </TouchableOpacity>
        </View>

        {/* ─── [5] 4 BIG QUICK ACTION CARDS ─── */}
        <View style={styles.quickActionsRow}>
          {/* Card 1: Saved Address */}
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => setCurrentView('addresses')}
          >
            <Image source={profSavedAddress} style={styles.quickCardIcon} />
            <Text style={styles.quickCardText}>Saved{'\n'}Address</Text>
          </TouchableOpacity>

          {/* Card 2: Payment Modes */}
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => setCurrentView('payments')}
          >
            <Image source={profPaymentModes} style={styles.quickCardIcon} />
            <Text style={styles.quickCardText}>Payment{'\n'}Modes</Text>
          </TouchableOpacity>

          {/* Card 3: My Refunds */}
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => setCurrentView('refunds')}
          >
            <Image source={profMyRefunds} style={styles.quickCardIcon} />
            <Text style={styles.quickCardText}>My{'\n'}Refunds</Text>
          </TouchableOpacity>

          {/* Card 4: My Quro Money */}
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => showToast('My Quro Money: Balance ₹0.00')}
          >
            <Image source={profMyQuroMoney} style={styles.quickCardIcon} />
            <Text style={styles.quickCardText}>My Quro{'\n'}Money</Text>
          </TouchableOpacity>
        </View>

        {/* ─── [6] GROUPED SERVICES LIST ─── */}
        <View style={styles.servicesGroupedCard}>
          {/* Row 1: My Vouchers */}
          <TouchableOpacity
            style={styles.serviceRow}
            activeOpacity={0.7}
            onPress={() => setCurrentView('vouchers')}
          >
            <View style={styles.serviceRowLeft}>
              <Image source={profVouchers} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>My Vouchers</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>

          {/* Row 2: Account Statement */}
          <TouchableOpacity
            style={styles.serviceRow}
            activeOpacity={0.7}
            onPress={() => setCurrentView('statement')}
          >
            <View style={styles.serviceRowLeft}>
              <Image source={profAccountStatement} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>Account Statement</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>

          {/* Row 3: Student Rewards */}
          <TouchableOpacity
            style={styles.serviceRow}
            activeOpacity={0.7}
            onPress={() => setCurrentView('student_rewards')}
          >
            <View style={styles.serviceRowLeft}>
              <Image source={profStudentRewards} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>Student Rewards</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>

          {/* Row 4: Favourites */}
          <TouchableOpacity
            style={[styles.serviceRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => setCurrentView('favourites')}
          >
            <View style={styles.serviceRowLeft}>
              <Heart size={20} color="#DEA430" fill="#DEA43033" style={{ marginRight: 14, marginLeft: 1 }} />
              <Text style={styles.serviceTitle}>Favourites</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>
        </View>

        {/* ─── [7] PAST ORDERS SECTION (FIGMA NODE 3029:1729) ─── */}
        <View style={styles.pastOrdersHeaderRow}>
          <Text style={styles.pastOrdersSectionTitle}>PAST ORDERS</Text>
          {displayOrders.length > 0 && (
            <Text style={styles.pastOrdersCountBadge}>
              {displayOrders.length} {displayOrders.length === 1 ? 'Order' : 'Orders'}
            </Text>
          )}
        </View>

        {/* Order Cards Preview */}
        {displayOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={34} color="#D4AF37" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your placed food and dining orders will appear here in real-time.
            </Text>
          </View>
        ) : (
          <>
            {displayOrders.slice(0, visibleOrdersCount).map((order, orderIdx) => {
              const orderId = order.id || order.orderId || `order_${orderIdx}`;
              const currentRating = ratings[orderId] || { food: 0, delivery: 0 };
              const resImage = typeof order.image === 'string'
                ? { uri: order.image }
                : (order.restaurantBanner ? { uri: order.restaurantBanner } : orderResAsiaSeven);

              const statusStr = (order.status || 'placed').toLowerCase();
              const isActive = ['placed', 'confirmed', 'preparing', 'ready', 'assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'active', 'pending'].includes(statusStr);
              const isDelivered = statusStr === 'delivered' || statusStr === 'completed';

              const handleCardPress = () => {
                if (isActive && onNavigateToTracking) {
                  onNavigateToTracking(orderId);
                } else {
                  setSelectedOrderForDetails(order);
                  setCurrentView('order_details');
                }
              };

              return (
                <View key={orderId} style={[styles.orderCard, isActive && styles.orderCardActive]}>
                  {/* Active Live Tracking Banner */}
                  {isActive && (
                    <TouchableOpacity
                      style={styles.activeTrackingBanner}
                      activeOpacity={0.85}
                      onPress={() => onNavigateToTracking && onNavigateToTracking(orderId)}
                    >
                      <View style={styles.livePulseDot} />
                      <Text style={styles.activeTrackingBannerText}>ORDER IS LIVE — TAP TO TRACK</Text>
                      <Navigation size={14} color="#000000" />
                    </TouchableOpacity>
                  )}

                  {/* Card Header (Image + Name + Loc + Status) */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCardPress}
                    style={styles.cardHeader}
                  >
                    <Image source={resImage} style={styles.restaurantThumb} />

                    <View style={styles.restaurantInfo}>
                      <Text style={styles.restaurantName} numberOfLines={1}>
                        {order.restaurantName || 'Restaurant'}
                      </Text>
                      <View style={styles.locationRow}>
                        <MapPin size={12} color="#747474" style={{ marginRight: 4 }} />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {order.location || order.restaurantAddress || order.city || order.deliveryAddress || 'Bhubaneswar'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
                      <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                        {isActive ? 'Ongoing' : (isDelivered ? 'Delivered' : (order.status || 'Delivered'))}
                      </Text>
                      {isActive ? (
                        <Clock size={14} color="#D4AF37" style={{ marginLeft: 4 }} />
                      ) : (
                        <CheckCircle2 size={15} color="#468152" style={{ marginLeft: 5 }} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Items List */}
                  <View style={styles.divider} />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCardPress}
                    style={styles.itemsList}
                  >
                    {order.items && order.items.length > 0 ? (
                      order.items.map((it: any, itIdx: number) => {
                        const itPrice = getItemPrice(it);
                        const itQty = Math.max(1, parseInt(String(it.quantity || it.qty || 1), 10));
                        return (
                          <View key={itIdx} style={styles.itemRow}>
                            <View style={styles.qtyBadge}>
                              <Text style={styles.qtyText}>{itQty}x</Text>
                            </View>
                            <Text style={styles.itemName} numberOfLines={1}>
                              {it.name || it.menuItemName || it.itemName || 'Food Item'}
                            </Text>
                            {itPrice > 0 && (
                              <Text style={styles.itemPriceText}>
                                {formatOrderAmount(itPrice * itQty)}
                              </Text>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.itemRow}>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyText}>1x</Text>
                        </View>
                        <Text style={styles.itemName}>Order Summary</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Active Track Button or Delivered Rating */}
                  {isActive ? (
                    <TouchableOpacity
                      style={styles.trackOrderBtn}
                      activeOpacity={0.85}
                      onPress={() => onNavigateToTracking && onNavigateToTracking(orderId)}
                    >
                      <Navigation size={16} color="#000000" />
                      <Text style={styles.trackOrderBtnText}>Track Live Order</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.ratingsRow}>
                        {/* Food Rating */}
                        <View style={styles.ratingCol}>
                          <Text style={styles.ratingLabel}>Food Rating</Text>
                          <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((starVal) => {
                              const isFilled = starVal <= currentRating.food;
                              return (
                                <TouchableOpacity
                                  key={starVal}
                                  activeOpacity={0.7}
                                  onPress={() => handleRate(orderId, 'food', starVal)}
                                  style={{ padding: 2 }}
                                >
                                  <Star
                                    size={18}
                                    color="#D4AF37"
                                    fill={isFilled ? '#D4AF37' : 'transparent'}
                                  />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        <View style={styles.ratingVerticalDivider} />

                        {/* Delivery Rating */}
                        <View style={styles.ratingCol}>
                          <Text style={styles.ratingLabel}>Delivery Rating</Text>
                          <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((starVal) => {
                              const isFilled = starVal <= currentRating.delivery;
                              return (
                                <TouchableOpacity
                                  key={starVal}
                                  activeOpacity={0.7}
                                  onPress={() => handleRate(orderId, 'delivery', starVal)}
                                  style={{ padding: 2 }}
                                >
                                  <Star
                                    size={18}
                                    color="#D4AF37"
                                    fill={isFilled ? '#D4AF37' : 'transparent'}
                                  />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {/* Reorder Button */}
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        activeOpacity={0.8}
                        onPress={() => handleReorder(order)}
                      >
                        <RotateCcw size={16} color="#A88733" />
                        <Text style={styles.reorderText}>Reorder</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Order Footer (Ordered Date & Total) */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCardPress}
                    style={styles.orderFooter}
                  >
                    <Text style={styles.orderedDateText}>
                      Ordered: {order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recently')}
                    </Text>
                    <View style={styles.billTotalRow}>
                      <Text style={styles.billTotalLabel}>Bill Total: </Text>
                      <Text style={styles.billTotalAmount}>
                        {formatOrderAmount(getOrderTotalAmount(order))}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* View More Orders Button */}
            {displayOrders.length > visibleOrdersCount && (
              <TouchableOpacity
                style={styles.viewMoreOrdersBtn}
                activeOpacity={0.8}
                onPress={() => setVisibleOrdersCount((prev) => prev + 5)}
              >
                <Text style={styles.viewMoreOrdersText}>
                  View More Orders ({displayOrders.length - visibleOrdersCount} remaining)
                </Text>
                <ChevronDown size={17} color="#BA9237" />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ─── [1] HEADER ───
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 10,
    backgroundColor: '#000000',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0A05',
    borderWidth: 1,
    borderColor: '#2A241A',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  helpIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    marginRight: 6,
  },
  helpText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    color: '#A68437',
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0C0A05',
    borderWidth: 1,
    borderColor: '#2A241A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── MENU DROPDOWN OVERLAY ───
  menuDropdownOverlay: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  menuDropdownCard: {
    position: 'absolute',
    top: 10,
    right: 16,
    backgroundColor: '#0F0E0E',
    borderWidth: 1,
    borderColor: '#262421',
    borderRadius: 16,
    width: 220,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  menuDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1817',
  },
  menuDropdownItemText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5,
    color: '#DDDDDC',
  },

  // ─── [2] USER BANNER ───
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },
  userBannerContainer: {
    position: 'relative',
    minHeight: 110,
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  userBannerBgArtwork: {
    position: 'absolute',
    top: -25,
    right: -15,
    width: 280,
    height: 160,
    opacity: 0.95,
  },
  userBannerBgArtwork2: {
    position: 'absolute',
    top: 12,
    right: 18,
    width: 90,
    height: 90,
    opacity: 0.9,
  },
  userBannerContent: {
    zIndex: 2,
  },
  userNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 36,
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  userPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhoneIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
    marginRight: 6,
  },
  userPhoneText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14.5,
    color: '#8A8A8A',
  },

  // ─── [3] ONE MEMBERSHIP BANNER ───
  oneBannerCard: {
    backgroundColor: '#0D0D0C',
    borderWidth: 1,
    borderColor: '#2E271B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  oneBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  oneLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quroProfileBadgeImg: {
    width: 68,
    height: 22,
  },
  oneActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060604',
    borderWidth: 1,
    borderColor: '#3F3523',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  oneActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A238',
    marginRight: 6,
  },
  oneActiveText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#997F3C',
    letterSpacing: 0.5,
  },
  oneChevronIcon: {
    width: 8,
    height: 14,
    resizeMode: 'contain',
  },
  oneSavedText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#C5C5C5',
    marginBottom: 4,
  },
  oneBenefitsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#7E7E7E',
  },

  // ─── [4] APP UPDATE BANNER ───
  updateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0C0C0C',
    borderWidth: 1,
    borderColor: '#262520',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  updateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateIcon: {
    width: 24,
    height: 32,
    resizeMode: 'contain',
    marginRight: 12,
  },
  updateTextGroup: {},
  updateTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#BEBEBE',
    marginBottom: 3,
  },
  updateSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#6F6F6F',
  },
  updateBtn: {
    backgroundColor: '#1B180D',
    borderWidth: 1,
    borderColor: '#5B4A23',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  updateBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#AA8636',
  },

  // ─── [5] 4 QUICK ACTIONS ROW ───
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#0C0C0C',
    borderWidth: 1,
    borderColor: '#282827',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  quickCardIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  quickCardText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 15,
  },

  // ─── [6] SERVICES GROUPED CARD ───
  servicesGroupedCard: {
    backgroundColor: '#0C0C0C',
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 24,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  serviceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  serviceIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    marginRight: 14,
  },
  serviceTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#B8B8B8',
  },
  serviceChevron: {
    width: 8,
    height: 14,
    resizeMode: 'contain',
  },

  // ─── [7] PAST ORDERS SECTION ───
  pastOrdersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  pastOrdersSectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#9B7F33',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  pastOrdersCountBadge: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#747474',
  },

  // ─── ORDER CARD STYLES ───
  orderCard: {
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1D1D1D',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    resizeMode: 'cover',
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
    paddingRight: 8,
  },
  restaurantName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#C1C1C1',
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    color: '#747474',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5,
    color: '#468152',
  },

  divider: {
    height: 1,
    backgroundColor: '#161616',
    marginVertical: 12,
  },

  // ─── ITEMS LIST ───
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBadge: {
    backgroundColor: '#2C220C',
    borderWidth: 1,
    borderColor: '#3D2F12',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 10,
  },
  qtyText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#9A7D30',
  },
  itemName: {
    flex: 1,
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5,
    color: '#8E8E8E',
  },
  itemPriceText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5,
    color: '#D4AF37',
    marginLeft: 8,
  },

  // ─── RATINGS ROW ───
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  ratingCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  ratingLabel: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    color: '#969696',
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingVerticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 12,
  },

  // ─── REORDER BUTTON ───
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0C07',
    borderWidth: 1,
    borderColor: '#4F4120',
    borderRadius: 12,
    height: 46,
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  reorderText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#A88733',
  },

  // ─── ORDER FOOTER ───
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  orderedDateText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#696969',
  },
  billTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billTotalLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#6A6A6A',
  },
  billTotalAmount: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#9E7F2E',
  },

  // ─── ACTIVE ORDER STYLES ───
  orderCardActive: {
    borderColor: '#DEA430',
    backgroundColor: '#0F0E09',
  },
  activeTrackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DEA430',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
  },
  activeTrackingBannerText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#000000',
    letterSpacing: 0.5,
  },
  statusBadgeActive: {
    backgroundColor: '#26200A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#634E17',
  },
  statusTextActive: {
    color: '#DEA430',
    fontWeight: '700',
  },
  trackOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 12,
    height: 44,
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  trackOrderBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#000000',
  },

  // ─── EMPTY STATE ───
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#070707',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1D1D1D',
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#171408',
    borderWidth: 1,
    borderColor: '#382D10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    color: '#E0E0E0',
    marginBottom: 5,
  },
  emptySubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 18,
  },

  // ─── VIEW MORE ORDERS BUTTON ───
  viewMoreOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121008',
    borderWidth: 1,
    borderColor: '#382D10',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: -4,
    marginBottom: 26,
  },
  viewMoreOrdersText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#BA9237',
    marginRight: 6,
    letterSpacing: 0.3,
  },
});
