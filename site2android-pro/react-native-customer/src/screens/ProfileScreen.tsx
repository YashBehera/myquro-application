import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Clipboard,
  Image,
  Alert,
  Platform,
  StatusBar,
  ToastAndroid,
  RefreshControl,
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
  ChevronUp,
  ChevronRight,
  Search,
  X,
  Copy,
  Receipt,
  Headphones,
  Sparkles,
  Tag,
  AlertCircle,
  Utensils,
  Check,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BACKEND_URL, NEON_SQL_ENDPOINT, NEON_CONN_STRING } from '../config';
import { useViewModel } from '../state/MainViewModel';
import { isTablet, getSafeTopPadding, getSafeBottomPadding } from '../utils/responsive';

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
  onNavigateToCart?: () => void;
  onNavigateToRestaurant?: (restaurantId: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBackToHome,
  onNavigateToTracking,
  onNavigateToCart,
  onNavigateToRestaurant,
}) => {
  const insets = useSafeAreaInsets();
  const {
    isDarkMode,
    authState,
    savedAddresses,
    refreshSavedAddresses,
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

  // Orders list state strictly reflecting real database orders
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setOrdersList(userOrders);
  }, [userOrders]);

  useEffect(() => {
    if (refreshUserOrders) {
      refreshUserOrders().catch(() => {});
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (refreshUserOrders) {
        await refreshUserOrders();
      }
    } catch (err) {
      console.warn('[ProfileScreen] Error refreshing orders:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Interactive Ratings state per order
  const [ratings, setRatings] = useState<Record<string, { food: number; delivery: number }>>({});
  const [searchOrderQuery, setSearchOrderQuery] = useState('');
  const [orderFilterTab, setOrderFilterTab] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [reorderSuccessPill, setReorderSuccessPill] = useState<{ visible: boolean; restaurantName: string; count: number } | null>(null);
  const [ratingCompliments, setRatingCompliments] = useState<Record<string, string[]>>({});

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
          console.warn('[ProfileScreen] Error fetching remote user orders from server:', e);
        }
      }

      // Resilient fallback: Direct Neon PostgreSQL query if backend API had network latency or cold-start
      if (remoteOrders.length === 0 && userId) {
        try {
          const neonQuery = `SELECT o.id, o.restaurant_id as "restaurantId", o.notes, o.status, o.prep_time_minutes as "prepTimeMinutes", o.extended_prep_minutes as "extendedPrepMinutes", o.grand_total as "grandTotal", o.created_at as "createdAt", r.restaurant_name as "restaurantName", r.restaurant_banner as "restaurantBanner" FROM orders o LEFT JOIN restaurants r ON o.restaurant_id = r.id WHERE o.placed_by_user_id = '${userId}' ORDER BY o.created_at DESC;`;
          const neonResp = await fetch(NEON_SQL_ENDPOINT, {
            method: 'POST',
            headers: {
              'Neon-Connection-String': NEON_CONN_STRING,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: neonQuery }),
          });
          if (neonResp.ok) {
            const neonData = await neonResp.json();
            if (neonData.rows && Array.isArray(neonData.rows)) {
              remoteOrders = neonData.rows;
            }
          }
        } catch (neonErr) {
          console.warn('[ProfileScreen] Error fetching orders directly from Neon DB:', neonErr);
        }
      }

      // Purge any legacy offline order caches from AsyncStorage
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const orderKeys = allKeys.filter(k => 
          (k.toLowerCase().includes('order') || k.toLowerCase().includes('placed')) && 
          k !== '@auth_state' && 
          k !== '@cart_items'
        );
        if (orderKeys.length > 0) {
          await AsyncStorage.multiRemove(orderKeys);
        }
      } catch (e) {}

      // Strictly show ONLY real database orders from the server
      const sorted = remoteOrders.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });

      setOrdersList(sorted);
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
        setReorderSuccessPill({
          visible: true,
          restaurantName: restName,
          count: totalItemsCount,
        });
        setTimeout(() => {
          setReorderSuccessPill(null);
        }, 5000);
      } else {
        showToast(`No items could be added to cart.`);
      }
    } else {
      showToast(`No items found in this order to reorder.`);
    }
  };

  const handleCopyOrderId = (idStr: string) => {
    Clipboard.setString(idStr);
    setCopiedOrderId(idStr);
    showToast(`Order #${String(idStr).slice(-8).toUpperCase()} copied!`);
    setTimeout(() => {
      setCopiedOrderId(null);
    }, 2000);
  };

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleComplimentTag = (orderId: string, tag: string) => {
    setRatingCompliments((prev) => {
      const current = prev[orderId] || [];
      const updated = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
      return { ...prev, [orderId]: updated };
    });
    showToast(`Added compliment: ${tag}`);
  };

  const formatOrderDate = (rawDate: any): string => {
    if (!rawDate) return 'Recently';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return String(rawDate);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return String(rawDate);
    }
  };

  // Counts for filter tabs
  const activeOrdersCount = useMemo(() => {
    return ordersList.filter((o) => {
      const statusStr = (o.status || 'placed').toLowerCase();
      const delStatusStr = (o.deliveryStatus || o.delivery?.status || '').toLowerCase();
      const isCancelled = statusStr === 'cancelled' || statusStr === 'rejected' || delStatusStr === 'cancelled';
      const isDelivered = delStatusStr === 'delivered' || statusStr === 'delivered' || (statusStr === 'served' || statusStr === 'completed');
      return !isCancelled && !isDelivered;
    }).length;
  }, [ordersList]);

  const deliveredOrdersCount = useMemo(() => {
    return ordersList.filter((o) => {
      const statusStr = (o.status || 'placed').toLowerCase();
      const delStatusStr = (o.deliveryStatus || o.delivery?.status || '').toLowerCase();
      const isCancelled = statusStr === 'cancelled' || statusStr === 'rejected' || delStatusStr === 'cancelled';
      const isDelivered = delStatusStr === 'delivered' || statusStr === 'delivered' || (statusStr === 'served' || statusStr === 'completed');
      return isDelivered && !isCancelled;
    }).length;
  }, [ordersList]);

  const cancelledOrdersCount = useMemo(() => {
    return ordersList.filter((o) => {
      const statusStr = (o.status || 'placed').toLowerCase();
      const delStatusStr = (o.deliveryStatus || o.delivery?.status || '').toLowerCase();
      return statusStr === 'cancelled' || statusStr === 'rejected' || delStatusStr === 'cancelled';
    }).length;
  }, [ordersList]);

  const displayOrders = useMemo(() => {
    return ordersList.filter((order) => {
      const statusStr = (order.status || 'placed').toLowerCase();
      const delStatusStr = (order.deliveryStatus || order.delivery?.status || '').toLowerCase();
      const isCancelled = statusStr === 'cancelled' || statusStr === 'rejected' || delStatusStr === 'cancelled';
      const isDelivered = delStatusStr === 'delivered' || statusStr === 'delivered' || (statusStr === 'served' || statusStr === 'completed');
      const isActive = !isCancelled && !isDelivered;

      if (orderFilterTab === 'active' && !isActive) return false;
      if (orderFilterTab === 'delivered' && !isDelivered) return false;
      if (orderFilterTab === 'cancelled' && !isCancelled) return false;

      if (searchOrderQuery.trim().length > 0) {
        const q = searchOrderQuery.toLowerCase().trim();
        const resName = (order.restaurantName || '').toLowerCase();
        const orderIdStr = String(order.id || order.orderId || '').toLowerCase();

        let itemsArr: any[] = [];
        if (Array.isArray(order.items)) itemsArr = order.items;
        else if (typeof order.items === 'string') {
          try { itemsArr = JSON.parse(order.items); } catch (e) {}
        }
        const itemMatch = itemsArr.some((it: any) =>
          (it.name || it.menuItemName || it.itemName || '').toLowerCase().includes(q)
        );

        if (!resName.includes(q) && !orderIdStr.includes(q) && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [ordersList, orderFilterTab, searchOrderQuery]);

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
        refreshSavedAddresses={refreshSavedAddresses}
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
        onNavigateToTracking={onNavigateToTracking ? (ordId) => {
          setSelectedOrderForDetails(null);
          setCurrentView('main');
          onNavigateToTracking(ordId);
        } : undefined}
      />
    );
  }

  // ─── MAIN FIGMA PROFILE SCREEN VIEW (NODE 3025:799) ───
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* ─── [1] TOP HEADER ROW (NO LOGO, CLEAN BACK ARROW + HELP & HAMBURGER) ─── */}
      <View style={[styles.headerRow, { paddingTop: getSafeTopPadding(insets.top, 8) }]}>
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
        <View style={[styles.menuDropdownOverlay, { top: getSafeTopPadding(insets.top, 8) + 44 }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 30 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
          />
        }
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

        {/* ─── [7] PAST ORDERS SECTION (FIGMA NODE 3029:1729 - ELEVATED PAST ORDERS) ─── */}
        <View style={styles.pastOrdersHeaderRow}>
          <View style={styles.pastOrdersTitleCol}>
            <View style={styles.pastOrdersTitleBadgeRow}>
              <Text style={styles.pastOrdersSectionTitle}>PAST ORDERS</Text>
              {ordersList.length > 0 && (
                <View style={styles.pastOrdersTotalCountPill}>
                  <Text style={styles.pastOrdersTotalCountText}>{ordersList.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.pastOrdersSubtitle}>
              Reorder in 1 tap, track live orders & view receipts
            </Text>
          </View>
        </View>

        {/* Search & Status Filter Controls */}
        {ordersList.length > 0 && (
          <View style={styles.ordersControlsCard}>
            {/* Search Input */}
            <View style={styles.orderSearchInputRow}>
              <Search size={16} color="#888888" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.orderSearchInput}
                placeholder="Search dish, restaurant or order ID..."
                placeholderTextColor="#666666"
                value={searchOrderQuery}
                onChangeText={setSearchOrderQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {searchOrderQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchOrderQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ padding: 4 }}
                >
                  <X size={15} color="#AAAAAA" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.orderFilterTabsRow}
            >
              <TouchableOpacity
                style={[
                  styles.orderFilterTabChip,
                  orderFilterTab === 'all' && styles.orderFilterTabChipActive,
                ]}
                activeOpacity={0.75}
                onPress={() => setOrderFilterTab('all')}
              >
                <Text
                  style={[
                    styles.orderFilterTabText,
                    orderFilterTab === 'all' && styles.orderFilterTabTextActive,
                  ]}
                >
                  All
                </Text>
                <View
                  style={[
                    styles.orderFilterCountBadge,
                    orderFilterTab === 'all' && styles.orderFilterCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.orderFilterCountText,
                      orderFilterTab === 'all' && styles.orderFilterCountTextActive,
                    ]}
                  >
                    {ordersList.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {activeOrdersCount > 0 && (
                <TouchableOpacity
                  style={[
                    styles.orderFilterTabChip,
                    styles.orderFilterTabChipLive,
                    orderFilterTab === 'active' && styles.orderFilterTabChipActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setOrderFilterTab('active')}
                >
                  <View style={styles.liveGreenPillDot} />
                  <Text
                    style={[
                      styles.orderFilterTabText,
                      orderFilterTab === 'active' && styles.orderFilterTabTextActive,
                      { color: '#DEA430' },
                    ]}
                  >
                    Live Active
                  </Text>
                  <View
                    style={[
                      styles.orderFilterCountBadge,
                      orderFilterTab === 'active' && styles.orderFilterCountBadgeActive,
                      { backgroundColor: '#3A2B0E' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderFilterCountText,
                        orderFilterTab === 'active' && styles.orderFilterCountTextActive,
                        { color: '#DEA430' },
                      ]}
                    >
                      {activeOrdersCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.orderFilterTabChip,
                  orderFilterTab === 'delivered' && styles.orderFilterTabChipActive,
                ]}
                activeOpacity={0.75}
                onPress={() => setOrderFilterTab('delivered')}
              >
                <Text
                  style={[
                    styles.orderFilterTabText,
                    orderFilterTab === 'delivered' && styles.orderFilterTabTextActive,
                  ]}
                >
                  Delivered
                </Text>
                <View
                  style={[
                    styles.orderFilterCountBadge,
                    orderFilterTab === 'delivered' && styles.orderFilterCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.orderFilterCountText,
                      orderFilterTab === 'delivered' && styles.orderFilterCountTextActive,
                    ]}
                  >
                    {deliveredOrdersCount}
                  </Text>
                </View>
              </TouchableOpacity>

              {cancelledOrdersCount > 0 && (
                <TouchableOpacity
                  style={[
                    styles.orderFilterTabChip,
                    orderFilterTab === 'cancelled' && styles.orderFilterTabChipActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => setOrderFilterTab('cancelled')}
                >
                  <Text
                    style={[
                      styles.orderFilterTabText,
                      orderFilterTab === 'cancelled' && styles.orderFilterTabTextActive,
                    ]}
                  >
                    Cancelled
                  </Text>
                  <View
                    style={[
                      styles.orderFilterCountBadge,
                      orderFilterTab === 'cancelled' && styles.orderFilterCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderFilterCountText,
                        orderFilterTab === 'cancelled' && styles.orderFilterCountTextActive,
                      ]}
                    >
                      {cancelledOrdersCount}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Order Cards Preview */}
        {ordersList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={34} color="#D4AF37" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySubtitle}>
              You haven't placed any food or dining orders yet. Explore our top restaurants!
            </Text>
            {onBackToHome && (
              <TouchableOpacity
                style={styles.emptyExploreBtn}
                activeOpacity={0.8}
                onPress={onBackToHome}
              >
                <Utensils size={15} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.emptyExploreBtnText}>Explore Restaurants</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : displayOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Search size={30} color="#DEA430" />
            </View>
            <Text style={styles.emptyTitle}>No Matching Orders</Text>
            <Text style={styles.emptySubtitle}>
              We couldn't find any orders matching "{searchOrderQuery || orderFilterTab}". Try a different keyword or reset filters.
            </Text>
            <TouchableOpacity
              style={styles.resetFiltersBtnModern}
              activeOpacity={0.8}
              onPress={() => {
                setSearchOrderQuery('');
                setOrderFilterTab('all');
              }}
            >
              <RotateCcw size={14} color="#DEA430" style={{ marginRight: 6 }} />
              <Text style={styles.resetFiltersBtnModernText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {displayOrders.slice(0, visibleOrdersCount).map((order, orderIdx) => {
              const orderId = String(order.id || order.orderId || `order_${orderIdx}`);
              const shortId = orderId.length > 8 ? orderId.slice(-8).toUpperCase() : orderId.toUpperCase();
              const currentRating = ratings[orderId] || { food: 0, delivery: 0 };
              const resImage = typeof order.image === 'string'
                ? { uri: order.image }
                : (order.restaurantBanner ? { uri: order.restaurantBanner } : orderResAsiaSeven);

              const statusStr = (order.status || 'placed').toLowerCase();
              const delStatusStr = (order.deliveryStatus || order.delivery?.status || '').toLowerCase();
              const isDelivery = Boolean(
                order.deliveryAddress || 
                order.address || 
                delStatusStr || 
                (order.notes && typeof order.notes === 'string' && order.notes.includes('address')) ||
                (!order.tableId && !order.tableNumber)
              );

              const isCancelled = statusStr === 'cancelled' || statusStr === 'rejected' || delStatusStr === 'cancelled';
              const isDelivered = delStatusStr === 'delivered' || statusStr === 'delivered' || (!isDelivery && (statusStr === 'served' || statusStr === 'completed'));
              const isActive = !isCancelled && !isDelivered;

              let displayStatusText = 'Ongoing';
              if (isCancelled) {
                displayStatusText = 'Cancelled';
              } else if (isDelivered) {
                displayStatusText = 'Delivered';
              } else if (delStatusStr === 'out_for_delivery' || delStatusStr === 'picked_up' || (isDelivery && statusStr === 'served')) {
                displayStatusText = 'Out for Delivery';
              } else if (delStatusStr === 'assigned' || delStatusStr === 'arrived_at_store') {
                displayStatusText = 'Partner Assigned';
              } else if (statusStr === 'ready') {
                displayStatusText = 'Food Ready';
              } else if (statusStr === 'preparing') {
                displayStatusText = 'Preparing';
              } else if (statusStr === 'placed') {
                displayStatusText = 'Order Placed';
              }

              // Extract parsed items safely
              let itemsListSafe: any[] = [];
              if (Array.isArray(order.items)) {
                itemsListSafe = order.items;
              } else if (typeof order.items === 'string') {
                try {
                  const parsed = JSON.parse(order.items);
                  if (Array.isArray(parsed)) itemsListSafe = parsed;
                } catch (e) {}
              }

              const isExpanded = !!expandedOrderIds[orderId];
              const visibleItems = (itemsListSafe.length > 2 && !isExpanded)
                ? itemsListSafe.slice(0, 2)
                : itemsListSafe;
              const hasHiddenItems = itemsListSafe.length > 2;

              const handleCardPress = () => {
                if (isActive && onNavigateToTracking) {
                  onNavigateToTracking(orderId);
                } else {
                  setSelectedOrderForDetails(order);
                  setCurrentView('order_details');
                }
              };

              const handleRestaurantPress = () => {
                const restId = order.restaurantId || order.restaurant_id;
                if (restId && onNavigateToRestaurant) {
                  onNavigateToRestaurant(restId);
                } else {
                  handleCardPress();
                }
              };

              return (
                <View key={orderId} style={[styles.orderCard, isActive && styles.orderCardActive]}>


                  {/* Card Header (Image + Name + Loc + Status) */}
                  <View style={styles.cardHeader}>
                    <TouchableOpacity activeOpacity={0.8} onPress={handleRestaurantPress}>
                      <Image source={resImage} style={styles.restaurantThumb} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleRestaurantPress}
                      style={styles.restaurantInfo}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.restaurantName} numberOfLines={1}>
                          {order.restaurantName || 'Restaurant'}
                        </Text>
                        <ChevronRight size={14} color="#DEA430" style={{ marginLeft: 2 }} />
                      </View>
                      <View style={styles.locationRow}>
                        <MapPin size={11} color="#747474" style={{ marginRight: 4 }} />
                        <Text style={styles.locationText} numberOfLines={1}>
                          {order.location || order.restaurantAddress || order.city || order.deliveryAddress || 'Bhubaneswar'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View
                      style={[
                        styles.statusBadge,
                        isActive && styles.statusBadgeActive,
                        isCancelled && styles.statusBadgeCancelled,
                      ]}
                    >
                      {isActive ? (
                        <Clock size={12} color="#DEA430" style={{ marginRight: 4 }} />
                      ) : isCancelled ? (
                        <AlertCircle size={12} color="#E57373" style={{ marginRight: 4 }} />
                      ) : (
                        <CheckCircle2 size={13} color="#468152" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.statusText,
                          isActive && styles.statusTextActive,
                          isCancelled && styles.statusTextCancelled,
                        ]}
                      >
                        {displayStatusText}
                      </Text>
                    </View>
                  </View>

                  {/* Order Meta Bar (Order ID + 1-Tap Copy + Date) */}
                  <View style={styles.orderMetaBar}>
                    <TouchableOpacity
                      style={styles.orderIdBadge}
                      activeOpacity={0.7}
                      onPress={() => handleCopyOrderId(orderId)}
                    >
                      <Text style={styles.orderIdText}>#{shortId}</Text>
                      <Copy size={11} color={copiedOrderId === orderId ? '#46C263' : '#888888'} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <View style={styles.orderDateRow}>
                      <Clock size={11} color="#696969" style={{ marginRight: 4 }} />
                      <Text style={styles.orderedDateText}>
                        {formatOrderDate(order.createdAt || order.date)}
                      </Text>
                    </View>
                  </View>

                  {/* Items List */}
                  <View style={styles.divider} />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleCardPress}
                    style={styles.itemsList}
                  >
                    {visibleItems.length > 0 ? (
                      visibleItems.map((it: any, itIdx: number) => {
                        const itPrice = getItemPrice(it);
                        const itQty = Math.max(1, parseInt(String(it.quantity || it.qty || 1), 10));
                        const isVeg = it.isVeg ?? it.is_veg ?? false;

                        return (
                          <View key={itIdx} style={styles.itemRow}>
                            {/* Veg / Non-Veg Icon */}
                            <View
                              style={[
                                styles.vegSquareSmall,
                                { borderColor: isVeg ? '#34A853' : '#EA4335' },
                              ]}
                            >
                              <View
                                style={[
                                  styles.vegCircleSmall,
                                  { backgroundColor: isVeg ? '#34A853' : '#EA4335' },
                                ]}
                              />
                            </View>

                            <View style={styles.qtyBadge}>
                              <Text style={styles.qtyText}>{itQty}x</Text>
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName} numberOfLines={1}>
                                {it.name || it.menuItemName || it.itemName || 'Food Item'}
                              </Text>
                              {it.customization || it.variantName ? (
                                <Text style={styles.itemCustomizationText} numberOfLines={1}>
                                  {it.variantName || it.customization}
                                </Text>
                              ) : null}
                            </View>

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

                    {/* Expand/Collapse Items Toggle */}
                    {hasHiddenItems && (
                      <TouchableOpacity
                        style={styles.expandItemsBtn}
                        activeOpacity={0.7}
                        onPress={() => toggleExpandOrder(orderId)}
                      >
                        <Text style={styles.expandItemsBtnText}>
                          {isExpanded
                            ? 'Show less items'
                            : `+ ${itemsListSafe.length - 2} more items`}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={13} color="#DEA430" style={{ marginLeft: 3 }} />
                        ) : (
                          <ChevronDown size={13} color="#DEA430" style={{ marginLeft: 3 }} />
                        )}
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  {/* Bill Summary & Payment Method Bar */}
                  <View style={styles.billSummaryBar}>
                    <View style={styles.billTotalRow}>
                      <Text style={styles.billTotalLabel}>Bill Total: </Text>
                      <Text style={styles.billTotalAmount}>
                        {formatOrderAmount(getOrderTotalAmount(order))}
                      </Text>
                    </View>

                    <View style={styles.paymentMethodPill}>
                      <CreditCard size={12} color="#DEA430" style={{ marginRight: 5 }} />
                      <Text style={styles.paymentMethodPillText}>
                        {order.paymentMethod || order.paymentMode || (order.paymentStatus === 'completed' ? 'Paid Online' : 'Paid')}
                      </Text>
                    </View>
                  </View>

                  {/* Card Actions Row: Reorder + Help */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.reorderBtnModern}
                      activeOpacity={0.8}
                      onPress={() => handleReorder(order)}
                    >
                      <RotateCcw size={14} color="#000000" strokeWidth={2.5} style={{ marginRight: 6 }} />
                      <Text style={styles.reorderBtnModernText}>Reorder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.helpBtnModern}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedOrderForDetails(order);
                        setCurrentView('help');
                      }}
                    >
                      <Headphones size={13} color="#999999" style={{ marginRight: 5 }} />
                      <Text style={styles.helpBtnModernText}>Help</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Interactive Star Ratings & Compliment Chips for Delivered Orders */}
                  {isDelivered && (
                    <View style={styles.ratingSectionWrap}>
                      <View style={styles.dividerThin} />
                      <View style={styles.ratingsRow}>
                        {/* Food Rating */}
                        <View style={styles.ratingCol}>
                          <Text style={styles.ratingLabel}>Rate Food</Text>
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
                                    size={17}
                                    color="#DEA430"
                                    fill={isFilled ? '#DEA430' : 'transparent'}
                                  />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        <View style={styles.ratingVerticalDivider} />

                        {/* Delivery Rating */}
                        <View style={styles.ratingCol}>
                          <Text style={styles.ratingLabel}>Rate Delivery</Text>
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
                                    size={17}
                                    color="#DEA430"
                                    fill={isFilled ? '#DEA430' : 'transparent'}
                                  />
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {/* Compliments Chips Row */}
                      {(currentRating.food > 0 || currentRating.delivery > 0) && (
                        <View style={styles.complimentsContainer}>
                          <Text style={styles.complimentsPromptText}>What did you love most?</Text>
                          <View style={styles.complimentsChipsRow}>
                            {['Delicious 😋', 'Super Fast ⚡', 'Hot & Fresh ♨️', 'Neat Packaging 🛍️', 'Great Value 🌟'].map((tag) => {
                              const isSelected = (ratingCompliments[orderId] || []).includes(tag);
                              return (
                                <TouchableOpacity
                                  key={tag}
                                  style={[
                                    styles.complimentChip,
                                    isSelected && styles.complimentChipSelected,
                                  ]}
                                  activeOpacity={0.7}
                                  onPress={() => handleComplimentTag(orderId, tag)}
                                >
                                  <Text
                                    style={[
                                      styles.complimentChipText,
                                      isSelected && styles.complimentChipTextSelected,
                                    ]}
                                  >
                                    {tag}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Active Order Large Track Button */}
                  {isActive && (
                    <TouchableOpacity
                      style={styles.trackOrderBtnLarge}
                      activeOpacity={0.85}
                      onPress={() => onNavigateToTracking && onNavigateToTracking(orderId)}
                    >
                      <Navigation size={15} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={styles.trackOrderBtnLargeText}>Track Live Order on Map</Text>
                      <ChevronRight size={15} color="#000000" />
                    </TouchableOpacity>
                  )}
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

  // ─── ELEVATED PAST ORDERS (BETTER THAN SWIGGY) ───
  pastOrdersTitleCol: {
    flex: 1,
  },
  pastOrdersTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pastOrdersSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#777777',
    marginTop: 2,
  },
  pastOrdersTotalCountPill: {
    backgroundColor: '#211806',
    borderWidth: 1,
    borderColor: '#48350F',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 8,
  },
  pastOrdersTotalCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#DEA430',
  },

  // Controls card
  ordersControlsCard: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1D1D1D',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  orderSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  orderSearchInput: {
    flex: 1,
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  orderFilterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  orderFilterTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  orderFilterTabChipActive: {
    backgroundColor: '#211806',
    borderColor: '#DEA430',
  },
  orderFilterTabChipLive: {
    borderColor: '#3A2E12',
  },
  liveGreenPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34A853',
    marginRight: 6,
  },
  orderFilterTabText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12.5,
    color: '#888888',
    marginRight: 6,
  },
  orderFilterTabTextActive: {
    color: '#DEA430',
    fontWeight: '700',
  },
  orderFilterCountBadge: {
    backgroundColor: '#242424',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  orderFilterCountBadgeActive: {
    backgroundColor: '#3A2B0E',
  },
  orderFilterCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#888888',
  },
  orderFilterCountTextActive: {
    color: '#DEA430',
  },

  // Status badges
  statusBadgeCancelled: {
    backgroundColor: '#2A1414',
    borderColor: '#4A2222',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTextCancelled: {
    color: '#E57373',
    fontWeight: '600',
    fontSize: 12,
  },

  // Meta row
  orderMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#141414',
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  orderIdText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#888888',
    letterSpacing: 0.5,
  },
  orderDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Veg / Non-veg
  vegSquareSmall: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  vegCircleSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemCustomizationText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#9E8850',
    marginTop: 1,
  },

  // Expand items
  expandItemsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginTop: 2,
  },
  expandItemsBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    color: '#DEA430',
  },

  // Bill summary & savings
  billSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16140A',
    borderWidth: 1,
    borderColor: '#3D3110',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  paymentMethodPillText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11.5,
    color: '#DEA430',
  },

  // Card action buttons
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  reorderBtnModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 12,
    height: 42,
  },
  reorderBtnModernText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#000000',
  },
  helpBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 16,
  },
  helpBtnModernText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    color: '#999999',
  },

  // Ratings & compliments
  ratingSectionWrap: {
    marginTop: 4,
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#141414',
    marginVertical: 10,
  },
  complimentsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#141414',
  },
  complimentsPromptText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#888888',
    marginBottom: 6,
  },
  complimentsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  complimentChip: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  complimentChipSelected: {
    backgroundColor: '#2B200A',
    borderColor: '#DEA430',
  },
  complimentChipText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11.5,
    color: '#A0A0A0',
  },
  complimentChipTextSelected: {
    color: '#DEA430',
    fontWeight: '700',
  },

  // Large Track Button
  trackOrderBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 12,
    height: 44,
    marginTop: 12,
  },
  trackOrderBtnLargeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#000000',
  },

  // Empty & Filter Reset buttons
  emptyExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 14,
  },
  emptyExploreBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#000000',
  },
  resetFiltersBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171408',
    borderWidth: 1,
    borderColor: '#382D10',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 14,
  },
  resetFiltersBtnModernText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#DEA430',
  },

  // Floating Toast
  reorderFloatingPill: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#14120A',
    borderWidth: 1.5,
    borderColor: '#DEA430',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  reorderFloatingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reorderFloatingCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reorderFloatingTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  reorderFloatingSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#A0A0A0',
  },
  reorderViewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEA430',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reorderViewCartText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#000000',
    letterSpacing: 0.5,
  },
});
