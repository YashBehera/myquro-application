import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Dimensions,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useOrderStore, Order } from '../../state/orderStore';
import { useComplaintStore } from '../../state/complaintStore';

const { width } = Dimensions.get('window');

export default function RestaurantDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'New' | 'Preparing' | 'Ready' | 'Picked up'>('New');
  const [activeBottomTab, setActiveBottomTab] = useState<'Orders' | 'Menu' | 'Business' | 'Complaints' | 'More'>('Orders');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Animated speech bubble for "Hello Partner!" badge
  const bubbleOpacity = useRef(new Animated.Value(1)).current;

  // Searching dots animation
  const [searchingDots, setSearchingDots] = useState('...');

  const {
    orders,
    loadOrders,
    addSimulatedOrder,
    acceptOrder,
    markReady,
    markPickedUp,
    rejectOrder,
  } = useOrderStore();

  const { complaints, loadComplaints, getActiveComplaintsCount } = useComplaintStore();

  // Load orders and complaints on mount and poll for live updates
  useEffect(() => {
    loadOrders();
    loadComplaints();

    const pollInterval = setInterval(() => {
      loadOrders();
    }, 4000);

    return () => clearInterval(pollInterval);
  }, []);

  // Fade out speech bubble after 5s
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Animate dots continuously when online
  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        setSearchingDots((prev) => {
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '.';
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const activeComplaintsCount = getActiveComplaintsCount();

  // Automatically generate new orders every 15 seconds (only when online)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        addSimulatedOrder(isOnline);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isOnline, addSimulatedOrder]);

  // Prevent going offline if there are active accepted orders in preparation or ready
  const handleToggleOnline = () => {
    if (isOnline) {
      const hasActiveOrders = orders.some(o => o.status === 'Preparing' || o.status === 'Ready');
      if (hasActiveOrders) {
        Alert.alert(
          'Active Orders In Progress',
          'You cannot go offline while you have active orders being prepared or waiting for delivery. Please complete all accepted orders first.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setIsOnline(!isOnline);
  };

  const subTabs: ('New' | 'Preparing' | 'Ready' | 'Picked up')[] = ['New', 'Preparing', 'Ready', 'Picked up'];

  // Handle transitioning order statuses
  const updateOrderStatus = (orderId: string, nextStatus: 'Preparing' | 'Ready' | 'Picked up' | 'Rejected') => {
    if (nextStatus === 'Rejected') {
      rejectOrder(orderId, 'Kitchen busy');
    } else if (nextStatus === 'Preparing') {
      acceptOrder(orderId);
      setActiveSubTab(nextStatus);
    } else if (nextStatus === 'Ready') {
      markReady(orderId);
      setActiveSubTab(nextStatus);
    } else if (nextStatus === 'Picked up') {
      markPickedUp(orderId);
      setActiveSubTab(nextStatus);
    }
  };

  const getFilteredOrders = () => {
    return orders.filter(o => o.status === activeSubTab);
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = new Date().getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      
      if (diffMins < 1) return 'Just Now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const hours = date.getHours();
      const mins = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMins = mins < 10 ? `0${mins}` : mins;
      
      return `${formattedHours}:${formattedMins} ${ampm}`;
    } catch (e) {
      return 'Just Now';
    }
  };

  const getEmptyStateMessage = () => {
    switch (activeSubTab) {
      case 'New':
        return 'New orders will appear here';
      case 'Preparing':
        return 'Orders that are getting prepared will be shown here';
      case 'Ready':
        return 'Orders that are ready for pickup will be shown here';
      case 'Picked up':
        return 'Orders that have been picked up will be shown here';
      default:
        return '';
    }
  };

  // Compute metrics
  const todayRevenue = orders
    .filter(o => o.status === 'Picked up')
    .reduce((sum, o) => sum + o.total, 0);
  const todayOrders = orders.filter(o => o.status === 'Picked up').length;
  const preparingCount = orders.filter(o => o.status === 'Preparing').length;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" translucent />

      {/* TOP STATUS & HELP BAR */}
      <View style={styles.topBar}>
        {/* Left Interactive Online/Offline Status Pill */}
        <TouchableOpacity
          onPress={handleToggleOnline}
          activeOpacity={0.8}
          style={styles.statusPill}
        >
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>

        {/* Right Controls: HELP & SETTINGS */}
        <View style={styles.topRightControls}>
          {/* HELP Pill */}
          <TouchableOpacity
            onPress={() => router.push('/help-support' as any)}
            style={styles.helpPill}
            activeOpacity={0.8}
          >
            <Ionicons name="headset-outline" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.helpText}>HELP</Text>
          </TouchableOpacity>

          {/* SETTINGS Pill */}
          <TouchableOpacity
            onPress={() => router.push('/app-settings' as any)}
            style={styles.settingsPill}
            activeOpacity={0.8}
          >
            <Ionicons name="cog-outline" size={13} color="#F2CA50" style={{ marginRight: 3 }} />
            <Text style={styles.settingsText}>SETTINGS</Text>
          </TouchableOpacity>

          {/* QR Scan */}
          <TouchableOpacity style={styles.topIconBtn} activeOpacity={0.8}>
            <Ionicons name="scan-outline" size={17} color="#EAE1D4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* FULL-LENGTH SCROLLABLE DASHBOARD CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>

        {/* 1. HERO SECTION — Conditional Online / Offline */}
        {isOnline ? (
          <View style={styles.searchingCard}>
            <View style={styles.searchingLeftCol}>
              {/* Restaurant icon badge */}
              <View style={styles.searchIconBadge}>
                <Ionicons name="restaurant" size={20} color="#F2CA50" />
              </View>

              {/* Title */}
              <Text style={styles.searchingTitle}>
                Waiting for{'\n'}orders{searchingDots}
              </Text>

              {/* Subtitle */}
              <Text style={styles.searchingSubtitle}>
                We'll notify you when{'\n'}a new order comes in.
              </Text>

              {/* View Menu link */}
              <TouchableOpacity
                onPress={() => router.push('/menu-management')}
                style={styles.exploreZoneLink}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreZoneText}>Manage your menu</Text>
                <View style={styles.exploreArrowCircle}>
                  <Ionicons name="chevron-forward" size={12} color="#000000" style={{ transform: [{ translateX: 0.5 }] }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Right side — Restaurant illustration */}
            <View style={styles.searchingRightCol}>
              <Image
                source={require('../../../assets/image copy 8.png')}
                style={styles.searchingIllustration}
                resizeMode="contain"
              />
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              {/* Go Online Title */}
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>
                  Go <Text style={styles.heroAmountGold}>Online</Text> to start{'\n'}receiving orders
                </Text>
              </View>

              {/* Illustration */}
              <Image
                source={require('../../../assets/image copy 8.png')}
                style={styles.heroGiftBoxImage}
                resizeMode="contain"
              />
            </View>

            {/* Gold CTA Button */}
            <TouchableOpacity
              onPress={handleToggleOnline}
              activeOpacity={0.85}
              style={styles.goOnlineBtn}
            >
              <Text style={styles.goOnlineBtnText}>Go online and accept orders</Text>
              <View style={styles.chevronCircleDark}>
                <Ionicons name="chevron-forward" size={14} color="#F2CA50" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. TODAY'S PROGRESS CARD */}
        <View style={styles.progressCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={styles.progressSectionTitle}>TODAY'S PROGRESS</Text>
            <TouchableOpacity
              onPress={() => router.push('/analytics' as any)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'Urbanist-Bold', fontSize: 11.5, color: '#E8C547', marginRight: 2 }}>Analytics</Text>
              <Ionicons name="chevron-forward" size={12} color="#E8C547" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressMetricsRow}>
            {/* Metric 1: Revenue -> Links to Finance */}
            <TouchableOpacity
              onPress={() => router.push('/finance' as any)}
              style={styles.progressMetricCol}
              activeOpacity={0.85}
            >
              <Text style={styles.progressValueText}>₹{todayRevenue}</Text>
              <View style={styles.metricLabelRow}>
                <Ionicons name="wallet-outline" size={13} color="#E8C547" style={{ marginRight: 3 }} />
                <Text style={[styles.metricLabelText, { color: '#FFFFFF' }]}>Finance &gt;</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.progressVertDivider} />

            {/* Metric 2: Online Time */}
            <TouchableOpacity style={styles.progressMetricCol} activeOpacity={0.85}>
              <Text style={styles.progressValueText}>0h 0m</Text>
              <View style={styles.metricLabelRow}>
                <Ionicons name="time-outline" size={13} color="#A6A6A6" style={{ marginRight: 3 }} />
                <Text style={styles.metricLabelText}>Online time</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.progressVertDivider} />

            {/* Metric 3: Orders Completed -> Links to Analytics */}
            <TouchableOpacity
              onPress={() => router.push('/analytics' as any)}
              style={styles.progressMetricCol}
              activeOpacity={0.85}
            >
              <Text style={styles.progressValueText}>{todayOrders}</Text>
              <View style={styles.metricLabelRow}>
                <Ionicons name="bag-handle-outline" size={13} color="#E8C547" style={{ marginRight: 3 }} />
                <Text style={[styles.metricLabelText, { color: '#FFFFFF' }]}>Analytics &gt;</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. QUICK UTILITY GRID BAR */}
        <View style={styles.utilityGridBar}>
          <TouchableOpacity
            onPress={() => router.push('/menu-management')}
            style={styles.utilityItem}
            activeOpacity={0.8}
          >
            <Ionicons name="restaurant-outline" size={22} color="#F2CA50" />
            <Text style={styles.utilityText}>Menu</Text>
          </TouchableOpacity>

          <View style={styles.utilityDivider} />

          <TouchableOpacity
            onPress={() => router.push('/ratings')}
            style={styles.utilityItem}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={22} color="#F2CA50" />
            <Text style={styles.utilityText}>Reviews</Text>
          </TouchableOpacity>

          <View style={styles.utilityDivider} />

          <TouchableOpacity
            onPress={() => router.push('/past-orders')}
            style={styles.utilityItem}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={22} color="#F2CA50" />
            <Text style={styles.utilityText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* 4. ACTIVE ORDERS SECTION — Sub-Tabs + Order Cards */}
        <View style={styles.ordersSection}>
          <View style={styles.ordersSectionHeader}>
            <Text style={styles.ordersSectionTitle}>ACTIVE ORDERS</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {/* Horizontal Sub-Tabs */}
          <View style={styles.tabBar}>
            {subTabs.map((tab) => {
              const isTabActive = activeSubTab === tab;
              const count = isOnline ? orders.filter(o => o.status === tab).length : 0;
              
              return (
                <TouchableOpacity
                  key={tab}
                  activeOpacity={0.75}
                  style={[styles.tabItem, isTabActive && styles.tabItemActive]}
                  onPress={() => setActiveSubTab(tab)}
                >
                  <View style={styles.tabLabelWrapper}>
                    <Text style={[styles.tabText, isTabActive && styles.tabTextActive]}>
                      {tab}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.tabCountBadge, isTabActive && styles.tabCountBadgeActive]}>
                        <Text style={[styles.tabCountText, isTabActive && styles.tabCountTextActive]}>{count}</Text>
                      </View>
                    )}
                  </View>
                  {isTabActive && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Live Orders List / Empty State */}
          {(isOnline && getFilteredOrders().length > 0) ? (
            <View style={styles.ordersListContainer}>
              {getFilteredOrders().map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  
                  {/* Order Top info */}
                  <View style={styles.orderCardHeader}>
                    <View>
                      <Text style={styles.orderId}>{order.id}</Text>
                      <Text style={styles.customerName}>{order.customer}</Text>
                    </View>
                    <View style={styles.orderTimePill}>
                      <Ionicons name="time-outline" size={11} color="#A6A6A6" style={{ marginRight: 3 }} />
                      <Text style={styles.orderTime}>{formatTime(order.timestamp)}</Text>
                    </View>
                  </View>

                  {/* Items Separator */}
                  <View style={styles.cardSeparator} />

                  {/* Items List */}
                  <View style={styles.itemsList}>
                    {order.items.map((item, idx) => (
                      <View key={idx} style={{ marginBottom: 6 }}>
                        <View style={styles.itemRow}>
                          <View style={styles.itemQtyBadge}>
                            <Text style={styles.itemQtyText}>{item.qty}x</Text>
                          </View>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemPrice}>₹{item.price * item.qty}</Text>
                        </View>
                        {item.addonsText ? (
                          <View style={{ marginLeft: 34, marginTop: 2, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: '#1A1811', borderRadius: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#3D3216' }}>
                            <Text style={{ fontSize: 11, color: '#E8C547', fontFamily: 'Urbanist-Medium' }}>
                              ✨ {item.addonsText}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  {order.cookingInstruction ? (
                    <View style={{ backgroundColor: '#1C1A14', padding: 8, borderRadius: 8, marginVertical: 6, borderWidth: 1, borderColor: '#332A15' }}>
                      <Text style={{ fontSize: 11, color: '#DEA430', fontFamily: 'Urbanist-Bold' }}>
                        🍳 Chef Note: <Text style={{ color: '#DDD', fontFamily: 'Urbanist-Regular' }}>{order.cookingInstruction}</Text>
                      </Text>
                    </View>
                  ) : null}

                  {/* Card Separator */}
                  <View style={styles.cardSeparator} />

                  {/* Total Row */}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalPrice}>₹{order.total}</Text>
                  </View>

                  {/* Actions Button */}
                  <View style={styles.actionsRow}>
                    {order.status === 'New' && (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.rejectBtn}
                          onPress={() => updateOrderStatus(order.id, 'Rejected')}
                        >
                          <Text style={styles.rejectBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={styles.acceptBtn}
                          onPress={() => updateOrderStatus(order.id, 'Preparing')}
                        >
                          <Text style={styles.acceptBtnText}>Accept Order</Text>
                          <View style={styles.acceptChevron}>
                            <Ionicons name="chevron-forward" size={13} color="#F2CA50" />
                          </View>
                        </TouchableOpacity>
                      </>
                    )}

                    {order.status === 'Preparing' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.prepareBtn}
                        onPress={() => updateOrderStatus(order.id, 'Ready')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.prepareBtnText}>Mark as Ready</Text>
                      </TouchableOpacity>
                    )}

                    {order.status === 'Ready' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.readyBtn}
                        onPress={() => updateOrderStatus(order.id, 'Picked up')}
                      >
                        <Ionicons name="bicycle-outline" size={16} color="#0E0C0A" style={{ marginRight: 6 }} />
                        <Text style={styles.readyBtnText}>Complete Delivery</Text>
                      </TouchableOpacity>
                    )}

                    {order.status === 'Picked up' && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                        <Text style={styles.completedBadgeText}>Delivered & Completed</Text>
                      </View>
                    )}
                  </View>

                </View>
              ))}
            </View>
          ) : (
            /* Empty State */
            <View style={styles.emptyView}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="bag-handle-outline" size={48} color="rgba(242, 202, 80, 0.3)" />
              </View>
              <Text style={styles.emptyTitle}>No Orders!</Text>
              <Text style={styles.emptySubtitle}>{getEmptyStateMessage()}</Text>
            </View>
          )}
        </View>

        {/* 5. IMPORTANT MESSAGES BANNER */}
        <View style={styles.importantMsgCard}>
          <View style={styles.msgTopRow}>
            <View style={styles.speakerIconCircle}>
              <Ionicons name="megaphone-outline" size={22} color="#F2CA50" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.msgSectionHeader}>IMPORTANT MESSAGES</Text>
              <Text style={styles.msgBodyText}>Keep your menu updated!</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.msgLinkText}>View more</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* View All Messages Button */}
          <TouchableOpacity style={styles.viewAllMsgBtn} activeOpacity={0.8}>
            <Text style={styles.viewAllMsgBtnText}>View all messages</Text>
            <Ionicons name="chevron-forward" size={15} color="#F2CA50" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* 6. 2X2 FEATURE GRID CARDS */}
        <View style={styles.featureGridContainer}>
          {/* ROW 1 */}
          <View style={styles.featureGridRow}>
            {/* Card 1: Menu Management */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/menu-management')}
            >
              <Text style={styles.featureCardTitle}>Menu{'\n'}Management</Text>
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <View style={styles.featureIconBg}>
                  <Ionicons name="restaurant" size={28} color="rgba(242, 202, 80, 0.4)" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Card 2: Order History */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/past-orders')}
            >
              <Text style={styles.featureCardTitle}>Order{'\n'}History</Text>
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <View style={styles.featureIconBg}>
                  <Ionicons name="receipt" size={28} color="rgba(242, 202, 80, 0.4)" />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ROW 2 */}
          <View style={styles.featureGridRow}>
            {/* Card 3: Complaints */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/complaints')}
            >
              <Text style={styles.featureCardTitle}>Customer{'\n'}Complaints</Text>
              {activeComplaintsCount > 0 && (
                <View style={styles.featureCardBadgePill}>
                  <Text style={styles.featureCardBadgeText}>{activeComplaintsCount} active</Text>
                </View>
              )}
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <View style={styles.featureIconBg}>
                  <Ionicons name="warning" size={28} color="rgba(242, 202, 80, 0.4)" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Card 4: Ratings */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/ratings')}
            >
              <Text style={styles.featureCardTitle}>Ratings &{'\n'}Reviews</Text>
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <View style={styles.featureIconBg}>
                  <Ionicons name="star" size={28} color="rgba(242, 202, 80, 0.4)" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. SHORTCUTS SECTION */}
        <View style={styles.shortcutsSectionContainer}>
          <Text style={styles.shortcutsHeaderTitle}>SHORTCUTS</Text>

          <View style={styles.shortcutsGridRow}>
            <TouchableOpacity
              onPress={() => router.push('/menu-preview')}
              style={styles.shortcutItem}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={24} color="#F2CA50" />
              <Text style={styles.shortcutLabelText}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/order-section')}
              style={styles.shortcutItem}
              activeOpacity={0.8}
            >
              <Ionicons name="clipboard-outline" size={24} color="#F2CA50" />
              <Text style={styles.shortcutLabelText}>Sections</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/restaurant-information')}
              style={styles.shortcutItem}
              activeOpacity={0.8}
            >
              <Ionicons name="information-circle-outline" size={24} color="#F2CA50" />
              <Text style={styles.shortcutLabelText}>Info</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* More Options Menu Modal Overlay */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={styles.modalContentContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreMenu(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            {/* Menu Items */}
            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/complaints');
              }}
            >
              <Ionicons name="warning-outline" size={20} color="#F2CA50" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Customer Complaints & Issues ({activeComplaintsCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/menu-management');
              }}
            >
              <Ionicons name="restaurant-outline" size={20} color="#F2CA50" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Menu Management (Categories & Dishes)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/menu-preview');
              }}
            >
              <Ionicons name="eye-outline" size={20} color="#F2CA50" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Preview Customer Menu</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/past-orders');
              }}
            >
              <Ionicons name="receipt-outline" size={20} color="#F2CA50" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Past Orders / Order History</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/order-section');
              }}
            >
              <Ionicons name="clipboard-outline" size={20} color="#F2CA50" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Order Section</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                router.push('/ratings');
              }}
            >
              <Ionicons name="star-outline" size={20} color="#F2CA50" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Ratings & Reviews</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                Alert.alert('Outlet Settings', 'Settings page is coming soon.');
              }}
            >
              <Ionicons name="cog-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Outlet Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalMenuItem} 
              onPress={() => {
                setShowMoreMenu(false);
                Alert.alert('Help & Support', 'Support number: (080) 1234 5678');
              }}
            >
              <Ionicons name="help-circle-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.modalMenuIcon} />
              <Text style={styles.modalMenuText}>Help & Support</Text>
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
    backgroundColor: '#0E0C0A',
  },

  /* TOP BAR */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0E0C0A',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#3D3934',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    gap: 7,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOffline: {
    backgroundColor: '#F2CA50',
  },
  dotOnline: {
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#787878',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#0E0C0A',
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#161410',
  },
  settingsText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  topIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#3D3934',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* SCROLL CONTENT */
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /* HERO CARD — OFFLINE STATE */
  heroCard: {
    backgroundColor: '#0E0C0A',
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  heroAmountGold: {
    color: '#F2CA50',
    fontSize: 26,
  },
  heroGiftBoxImage: {
    width: 110,
    height: 82,
  },
  goOnlineBtn: {
    backgroundColor: '#F2CA50',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  goOnlineBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  chevronCircleDark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* HERO CARD — ONLINE / SEARCHING STATE */
  searchingCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 14,
    minHeight: 170,
  },
  searchingLeftCol: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
  },
  searchIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchingTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    lineHeight: 26,
    marginBottom: 6,
  },
  searchingSubtitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
    lineHeight: 17,
    marginBottom: 14,
  },
  exploreZoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exploreZoneText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  exploreArrowCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingRightCol: {
    width: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.04)',
  },
  searchingIllustration: {
    width: 120,
    height: 120,
  },

  /* TODAY'S PROGRESS */
  progressCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  progressSectionTitle: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 14,
  },
  progressMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  progressMetricCol: {
    alignItems: 'center',
    flex: 1,
  },
  progressValueText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 3,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabelText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  progressVertDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2E2923',
  },

  /* QUICK UTILITY GRID BAR */
  utilityGridBar: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  utilityItem: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  utilityText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  utilityDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2E2923',
  },

  /* ACTIVE ORDERS SECTION */
  ordersSection: {
    marginBottom: 14,
  },
  ordersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ordersSectionTitle: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#16A34A',
    letterSpacing: 0.6,
  },

  /* Horizontal Sub-Tabs */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
    backgroundColor: '#191715',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {},
  tabLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  tabTextActive: {
    color: '#F2CA50',
  },
  tabCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 4,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
  },
  tabCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  tabCountTextActive: {
    color: '#F2CA50',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#F2CA50',
    borderRadius: 2.5,
  },

  /* Live Orders List Cards */
  ordersListContainer: {
    marginVertical: 4,
  },
  orderCard: {
    backgroundColor: '#191715',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E2923',
    padding: 16,
    marginBottom: 14,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5,
    color: '#F2CA50',
    letterSpacing: 0.3,
  },
  customerName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },
  orderTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12100E',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#26221D',
  },
  orderTime: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11,
    color: '#A6A6A6',
  },
  cardSeparator: {
    height: 1,
    backgroundColor: '#26221D',
    marginVertical: 12,
  },
  itemsList: {
    marginVertical: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  itemQtyBadge: {
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 10,
  },
  itemQtyText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#F2CA50',
  },
  itemName: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
  },
  itemPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#EAE1D4',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  totalLabel: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    color: '#A6A6A6',
  },
  totalPrice: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 16,
    color: '#F2CA50',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#12100E',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#3D3934',
  },
  rejectBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#EAE1D4',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#0E0C0A',
  },
  acceptChevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0E0C0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prepareBtn: {
    flex: 1,
    backgroundColor: '#1E6FBF',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepareBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  readyBtn: {
    flex: 1,
    backgroundColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#0E0C0A',
  },
  completedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  completedBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#16A34A',
    marginLeft: 6,
  },

  /* Empty State */
  emptyView: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(242, 202, 80, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 22,
    color: '#EAE1D4',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    color: '#A6A6A6',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },

  /* IMPORTANT MESSAGES CARD */
  importantMsgCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  msgTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  speakerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgSectionHeader: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  msgBodyText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 3,
  },
  msgLinkText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  viewAllMsgBtn: {
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.05)',
  },
  viewAllMsgBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },

  /* 2x2 FEATURE GRID CARDS */
  featureGridContainer: {
    marginBottom: 14,
    gap: 10,
  },
  featureGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  featureCardTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    lineHeight: 20,
    marginBottom: 8,
  },
  featureCardBadgePill: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  featureCardBadgeText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EF4444',
  },
  featureCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#29241D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIconBg: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },

  /* SHORTCUTS SECTION */
  shortcutsSectionContainer: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  shortcutsHeaderTitle: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.2,
    marginBottom: 14,
    textAlign: 'center',
  },
  shortcutsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  shortcutItem: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  shortcutLabelText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },

  /* Custom Floating Bottom Tab Bar */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161410',
    borderTopWidth: 1,
    borderColor: '#2E2923',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTabLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 4,
  },
  bottomTabLabelActive: {
    color: '#F2CA50',
  },
  raisedTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -15,
  },
  raisedCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#3D3934',
    backgroundColor: '#161410',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  raisedCircleActive: {
    borderColor: '#F2CA50',
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  raisedUnderline: {
    width: 14,
    height: 2,
    backgroundColor: 'transparent',
    borderRadius: 1,
    marginTop: 3,
  },
  raisedUnderlineActive: {
    backgroundColor: '#F2CA50',
  },
  complaintsTabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  complaintsTabBadgeText: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 9.5,
    color: '#FFFFFF',
  },

  /* More Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContentContainer: {
    backgroundColor: '#161410',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    borderColor: '#2E2923',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    color: '#F2CA50',
    letterSpacing: 0.2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#2E2923',
    marginVertical: 14,
  },
  modalMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalMenuIcon: {
    marginRight: 12,
  },
  modalMenuText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#EAE1D4',
  },
});
