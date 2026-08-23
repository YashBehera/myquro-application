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
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config';
import { useViewModel } from '../state/MainViewModel';

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
import { PastOrdersSubView } from './profile/PastOrdersSubView';

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
const profHdfcCard           = require('../assets/profile/profHdfcCard.png');
const profVouchers           = require('../assets/profile/profVouchers.png');
const profAccountStatement   = require('../assets/profile/profAccountStatement.png');
const profOrderTrain         = require('../assets/profile/profOrderTrain.png');
const profCorporateRewards   = require('../assets/profile/profCorporateRewards.png');
const profStudentRewards     = require('../assets/profile/profStudentRewards.png');
const profInstamartWishlist  = require('../assets/profile/profInstamartWishlist.png');

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
    updateProfile,
    favouriteRestaurantsList,
    toggleFavourite,
    addToCart,
    allRestaurants,
  } = useViewModel();

  // Navigation states
  const [currentView, setCurrentView] = useState<
    'main' | 'past_orders' | 'edit_profile' | 'addresses' | 'payments' | 'help' | 'favourites' | 'vouchers' | 'statement' | 'student_rewards' | 'settings' | 'logout'
  >('main');

  // Menu popup state
  const [showMenuOptions, setShowMenuOptions] = useState(false);

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

  // Orders list state
  const [ordersList, setOrdersList] = useState<any[]>([]);

  // Interactive Ratings state per order
  const [ratings, setRatings] = useState<Record<string, { food: number; delivery: number }>>({});

  const fetchUserOrders = async () => {
    try {
      let remoteOrders: any[] = [];
      const userId = authState.type === 'Authenticated' ? ((authState as any).userId || (authState as any).user?.id) : null;
      const sessionToken = authState.type === 'Authenticated' ? authState.sessionToken : '';

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
          localOrders = JSON.parse(localData);
        }
      } catch (e) {}

      const mergedMap = new Map<string, any>();
      localOrders.forEach(o => {
        if (o && (o.id || o.orderId)) {
          mergedMap.set(o.id || o.orderId, o);
        }
      });
      remoteOrders.forEach(o => {
        if (o && (o.id || o.orderId)) {
          mergedMap.set(o.id || o.orderId, o);
        }
      });

      const combined = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
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
  }, [authState]);

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
    if (order.items && order.items.length > 0) {
      order.items.forEach((it: any) => {
        addToCart({
          id: it.id || `reorder_${Date.now()}_${Math.random()}`,
          name: it.name || it.menuItemName || 'Food Item',
          price: it.price || it.unitPrice || 150,
          quantity: it.quantity || 1,
          restaurantId: order.restaurantId || 'restaurant_1',
          restaurantName: order.restaurantName || 'Restaurant',
          isVeg: it.isVeg ?? false,
        });
      });
      showToast(`Added items from ${order.restaurantName || 'Restaurant'} to your cart!`);
    } else {
      showToast(`Reordering from ${order.restaurantName || 'Restaurant'}...`);
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
  if (currentView === 'past_orders') {
    return (
      <PastOrdersSubView
        ordersList={ordersList}
        onBack={() => setCurrentView('main')}
        onNavigateToTracking={onNavigateToTracking}
        onSelectOrderDetails={(order: any) => {
          const isActive = ['placed', 'confirmed', 'preparing', 'ready', 'assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'active', 'pending'].includes((order.status || '').toLowerCase());
          if (isActive && onNavigateToTracking) {
            onNavigateToTracking(order.id || order.orderId);
          }
        }}
        onReorder={(order: any) => handleReorder(order)}
        onHelp={() => setCurrentView('help')}
      />
    );
  }

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

            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('addresses');
              }}
            >
              <MapPinned size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>Saved Addresses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('payments');
              }}
            >
              <CreditCard size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>Payment Modes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('vouchers');
              }}
            >
              <Ticket size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>My Vouchers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('favourites');
              }}
            >
              <Heart size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>Favourites</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('statement');
              }}
            >
              <FileText size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>Account Statement</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuDropdownItem}
              onPress={() => {
                setShowMenuOptions(false);
                setCurrentView('student_rewards');
              }}
            >
              <GraduationCap size={16} color="#DEB853" style={{ marginRight: 10 }} />
              <Text style={styles.menuDropdownItemText}>Student Rewards</Text>
            </TouchableOpacity>

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

        {/* ─── [3] ONE MEMBERSHIP BANNER ─── */}
        <TouchableOpacity
          style={styles.oneBannerCard}
          activeOpacity={0.85}
          onPress={() => showToast('My Quro One: Unlimited FREE Delivery on all orders!')}
        >
          <View style={styles.oneBannerTopRow}>
            <View style={styles.oneLogoRow}>
              <Text style={styles.oneLogoText}>one</Text>
              <View style={styles.oneActiveBadge}>
                <View style={styles.oneActiveDot} />
                <Text style={styles.oneActiveText}>ACTIVE</Text>
              </View>
            </View>
            <Image source={profChevron} style={styles.oneChevronIcon} />
          </View>

          <Text style={styles.oneSavedText}>₹90 saved in 88 days</Text>
          <Text style={styles.oneBenefitsText}>Explore all My Quro One benefits</Text>
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
            onPress={() => showToast('My Refunds: No active pending refunds.')}
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
          {/* Row 1: My Quro HDFC Bank Credit Card */}
          <TouchableOpacity
            style={styles.serviceRow}
            activeOpacity={0.7}
            onPress={() => showToast('My Quro HDFC Card: 5% Cashback on dining & food delivery!')}
          >
            <View style={styles.serviceRowLeft}>
              <Image source={profHdfcCard} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>My Quro HDFC Bank Credit Card</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>

          {/* Row 2: My Vouchers */}
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

          {/* Row 3: Account Statement */}
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

          {/* Row 4: Order Food on Train */}
          <TouchableOpacity
            style={styles.serviceRow}
            activeOpacity={0.7}
            onPress={() => showToast('Order on Train: IRCTC meal delivery directly to your berth!')}
          >
            <View style={styles.serviceRowLeft}>
              <Image source={profOrderTrain} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>Order Food on Train</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>

          {/* Row 5: Corporate Rewards */}
          <TouchableOpacity
            style={styles.serviceRow}
            activeOpacity={0.7}
            onPress={() => showToast('Corporate Rewards: Link work email for tax-free meal vouchers.')}
          >
            <View style={styles.serviceRowLeft}>
              <Image source={profCorporateRewards} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>Corporate Rewards</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>

          {/* Row 6: Student Rewards */}
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

          {/* Row 7: My Instamart Wishlist */}
          <TouchableOpacity
            style={[styles.serviceRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => showToast('My Instamart Wishlist: 3 saved items.')}
          >
            <View style={styles.serviceRowLeft}>
              <Image source={profInstamartWishlist} style={styles.serviceIcon} />
              <Text style={styles.serviceTitle}>My Instamart Wishlist</Text>
            </View>
            <Image source={profChevron} style={styles.serviceChevron} />
          </TouchableOpacity>
        </View>

        {/* ─── [7] PAST ORDERS SECTION (FIGMA NODE 3029:1729) ─── */}
        <View style={styles.pastOrdersHeaderRow}>
          <Text style={styles.pastOrdersSectionTitle}>PAST ORDERS</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCurrentView('past_orders')}
          >
            <Text style={styles.pastOrdersViewAllText}>View All</Text>
          </TouchableOpacity>
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
          displayOrders.slice(0, 3).map((order, orderIdx) => {
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
                setCurrentView('past_orders');
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
                <View style={styles.itemsList}>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it: any, itIdx: number) => (
                      <View key={itIdx} style={styles.itemRow}>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyText}>{it.quantity || 1}x</Text>
                        </View>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {it.name || it.menuItemName}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.itemRow}>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>1x</Text>
                      </View>
                      <Text style={styles.itemName}>Order Summary</Text>
                    </View>
                  )}
                </View>

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
                <View style={styles.orderFooter}>
                  <Text style={styles.orderedDateText}>
                    Ordered: {order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recently')}
                  </Text>
                  <View style={styles.billTotalRow}>
                    <Text style={styles.billTotalLabel}>Bill Total: </Text>
                    <Text style={styles.billTotalAmount}>
                      {order.billTotal || `₹${order.grandTotal || order.totalAmount || order.subtotal || 0}`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
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
  oneLogoText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 26,
    color: '#D4A238',
    letterSpacing: -0.5,
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
  pastOrdersViewAllText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#BA9237',
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
});
