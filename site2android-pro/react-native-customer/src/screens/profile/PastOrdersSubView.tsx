import React, { useState } from 'react';
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
  Headphones,
  MoreVertical,
  MapPin,
  CheckCircle2,
  Star,
  RotateCcw,
  Navigation,
  Clock,
  ShoppingBag,
} from 'lucide-react-native';

const orderResAsiaSeven = require('../../assets/profile/orderResAsiaSeven.png');

interface PastOrdersSubViewProps {
  ordersList?: any[];
  onBack: () => void;
  onSelectOrderDetails?: (order: any) => void;
  onNavigateToTracking?: (orderId: string) => void;
  onReorder?: (order: any) => void;
  onHelp?: () => void;
}

export const PastOrdersSubView: React.FC<PastOrdersSubViewProps> = ({
  ordersList = [],
  onBack,
  onSelectOrderDetails,
  onNavigateToTracking,
  onReorder,
  onHelp,
}) => {
  const [activeTab, setActiveTab] = useState<'food' | 'instamart' | 'genie'>('food');
  const [ratings, setRatings] = useState<Record<string, { food: number; delivery: number }>>({});

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
    showToast(`Rated ${type === 'food' ? 'the food' : 'the delivery'} ${rating} star${rating > 1 ? 's' : ''}`);
  };

  const displayOrders = activeTab === 'food'
    ? ordersList.filter(o => !o.type || o.type === 'food')
    : activeTab === 'instamart'
      ? ordersList.filter(o => o.type === 'instamart')
      : ordersList.filter(o => o.type === 'genie');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      {/* ─── [1] TOP HEADER ─── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
            <ArrowLeft size={22} color="#DDDDDC" />
          </TouchableOpacity>
          <Text style={styles.logoText}>
            <Text style={styles.logoScript}>My</Text>Quro.
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.helpBtn}
            activeOpacity={0.8}
            onPress={onHelp ? onHelp : () => showToast('Connecting to MyQuro 24/7 care...')}
          >
            <Headphones size={15} color="#DEB853" style={{ marginRight: 5 }} />
            <Text style={styles.helpText}>HELP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dotsBtn}
            activeOpacity={0.7}
            onPress={() => showToast('Past orders invoices & options')}
          >
            <MoreVertical size={18} color="#999999" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── [2] TITLES ─── */}
        <Text style={styles.myAccountTitle}>My Account</Text>
        <Text style={styles.pastOrdersSubheader}>PAST ORDERS</Text>

        {/* ─── [3] TAB SWITCHER (FOOD / INSTAMART / GENIE) ─── */}
        <View style={styles.tabContainer}>
          {/* Tab 1: Food */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'food' && styles.tabBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('food')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'food' && styles.tabTextActive,
              ]}
            >
              Food
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Instamart */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'instamart' && styles.tabBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('instamart')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'instamart' && styles.tabTextActive,
              ]}
            >
              Instamart
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Genie */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'genie' && styles.tabBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('genie')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'genie' && styles.tabTextActive,
              ]}
            >
              Genie
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── [4] PAST ORDERS CARDS LIST ─── */}
        {displayOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={36} color="#D4AF37" />
            </View>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'food'
                ? 'Your placed food and dining orders will appear here in real-time.'
                : activeTab === 'instamart'
                ? 'No grocery orders found in Instamart.'
                : 'No delivery tasks found in Genie.'}
            </Text>
          </View>
        ) : (
          displayOrders.map((order: any, orderIdx: number) => {
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
              } else if (onSelectOrderDetails) {
                onSelectOrderDetails(order);
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
                      onPress={() => {
                        if (onReorder) {
                          onReorder(order);
                        } else {
                          showToast(`Adding items from ${order.restaurantName} to cart...`);
                        }
                      }}
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
    paddingBottom: 12,
    backgroundColor: '#000000',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  logoText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 22,
    color: '#DEB853',
    letterSpacing: -0.5,
  },
  logoScript: {
    fontStyle: 'italic',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000001',
    borderWidth: 1,
    borderColor: '#5E3B12',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  helpText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#A28330',
    letterSpacing: 0.8,
  },
  dotsBtn: {
    padding: 6,
  },

  // ─── [2] SCROLL VIEW & TITLES ───
  scrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  myAccountTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 26,
    color: '#DBDBDB',
    marginTop: 8,
    marginBottom: 4,
  },
  pastOrdersSubheader: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#9B7F33',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // ─── [3] TAB SWITCHER ───
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#191919',
    borderRadius: 20,
    height: 48,
    padding: 3,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabBtnActive: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#AA8735',
  },
  tabText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
    color: '#7F7F7F',
  },
  tabTextActive: {
    fontFamily: 'Urbanist-Bold',
    color: '#AA8630',
  },

  // ─── [4] ORDER CARDS ───
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
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#171408',
    borderWidth: 1,
    borderColor: '#382D10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    color: '#E0E0E0',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 20,
  },
});
