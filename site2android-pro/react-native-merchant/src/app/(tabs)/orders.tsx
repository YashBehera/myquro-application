import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOrderStore, Order } from '../../state/orderStore';

const DEFAULT_BURGER_IMAGE = require('../../../assets/images/default_burger.png');
const { width } = Dimensions.get('window');

export default function LiveOrdersTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders, isLoading, loadOrders, acceptOrder, markReady, markPickedUp, verifyHandover, rejectOrder } = useOrderStore();
  
  const [activeFilter, setActiveFilter] = useState<'All' | 'New' | 'Preparing' | 'Ready'>('All');
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, []);

  const getFilteredOrders = () => {
    const activeOrders = orders.filter(o => o.status !== 'Picked up' && o.status !== 'Rejected');
    if (activeFilter === 'All') return activeOrders;
    return activeOrders.filter(o => o.status === activeFilter);
  };

  const getWaitingTime = (timestamp: string) => {
    const elapsedMs = new Date().getTime() - new Date(timestamp).getTime();
    const mins = Math.floor(elapsedMs / (60 * 1000));
    if (mins < 1) return 'Just Now';
    return `${mins}m ago`;
  };

  const formatPlacedTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '11:03 AM';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '11:03 AM';
    }
  };

  const isDelayed = (timestamp: string, status: string) => {
    const elapsedMs = new Date().getTime() - new Date(timestamp).getTime();
    const mins = Math.floor(elapsedMs / (60 * 1000));
    if (status === 'New' && mins >= 5) return true;
    if (status === 'Preparing' && mins >= 20) return true;
    return false;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Live Kitchen Queue</Text>
            <Text style={styles.headerSubtitle}>
              Real-time orders, preparation timers & dispatch
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/past-orders' as any)}
            style={styles.historyBtn}
            activeOpacity={0.75}
          >
            <Ionicons name="time-outline" size={17} color="#F2CA50" style={{ marginRight: 5 }} />
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Filters */}
        <View style={styles.filterTabsRow}>
          {(['All', 'New', 'Preparing', 'Ready'] as const).map((tab) => {
            const isActive = activeFilter === tab;
            const count = tab === 'All' 
              ? orders.filter(o => o.status !== 'Picked up' && o.status !== 'Rejected').length
              : orders.filter(o => o.status === tab).length;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, isActive ? styles.filterTabActive : styles.filterTabInactive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live Orders Grid/Scroll */}
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {getFilteredOrders().length > 0 ? (
            <View style={styles.gridContainer}>
              {getFilteredOrders().map((order) => {
                const delayed = isDelayed(order.timestamp, order.status);
                return (
                  <View key={order.id} style={[styles.orderCard, delayed && styles.orderCardWarning]}>
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeftGroup}>
                        <View style={styles.bagIconBox}>
                          <Ionicons name="bag-handle-outline" size={24} color="#E85D5D" />
                        </View>
                        <View style={styles.orderTitleColumn}>
                          <Text style={styles.shortTokenText}>#{order.id.slice(-4).toUpperCase()}</Text>
                          <Text style={styles.orderIdMainText} numberOfLines={1} ellipsizeMode="middle">
                            {order.id}
                          </Text>
                          <Text style={styles.customerSubText}>
                            {order.tableNumber ? `Dine-in • Table ${order.tableNumber}` : (order.customer || 'Customer')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.headerRightGroup}>
                        <View style={[styles.timeBadgeContainer, delayed && styles.timeBadgeContainerDelayed]}>
                          <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={styles.timeBadgeText}>
                            {getWaitingTime(order.timestamp)}
                          </Text>
                        </View>
                        <Text style={styles.placedTimeText}>
                          Placed {formatPlacedTime(order.timestamp)}
                        </Text>
                      </View>
                    </View>

                    {/* Items Section */}
                    <Text style={styles.itemsSectionLabel}>
                      Items ({order.items.length})
                    </Text>

                    <View style={styles.itemsListContainer}>
                      {order.items.map((item, idx) => (
                        <View key={idx} style={styles.itemCardRow}>
                          <Image
                            source={item.imageURL ? { uri: item.imageURL } : DEFAULT_BURGER_IMAGE}
                            style={styles.itemThumbImage}
                            resizeMode="cover"
                          />
                          <View style={styles.itemInfoColumn}>
                            <View style={styles.itemNameLine}>
                              <Text style={styles.itemQtyMultiplier}>{item.qty} ×</Text>
                              <Text style={styles.itemNameText} numberOfLines={1}>
                                {item.name}
                              </Text>
                            </View>
                            {item.addonsText ? (
                              <Text style={styles.itemAddonsText}>
                                ✨ {item.addonsText}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Cooking Instruction (if present) */}
                    {order.cookingInstruction ? (
                      <View style={styles.cookingInstructionBox}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color="#F2CA50" style={{ marginRight: 6 }} />
                        <Text style={styles.cookingInstructionText} numberOfLines={2}>
                          {order.cookingInstruction}
                        </Text>
                      </View>
                    ) : null}

                    {/* Delivery / Rider Assignment Card */}
                    {!order.tableNumber && (
                      <View style={styles.deliveryRiderCard}>
                        <View style={styles.riderIconBox}>
                          <Ionicons
                            name={
                              order.deliveryStatus === 'arrived_at_store'
                                ? 'location'
                                : order.deliveryStatus === 'picked_up' || order.status === 'Picked up'
                                ? 'checkmark-circle'
                                : 'bicycle'
                            }
                            size={19}
                            color={order.deliveryStatus === 'arrived_at_store' ? '#10B981' : '#8E97A6'}
                          />
                        </View>
                        <View style={styles.riderTextColumn}>
                          {order.status === 'New' || !order.riderName || order.deliveryStatus === 'unassigned' || order.deliveryStatus === 'offered' ? (
                            <>
                              <Text style={styles.riderPrimaryText}>
                                Delivery rider is yet to be assigned
                              </Text>
                              <Text style={styles.riderSecondaryText}>
                                Accept to dispatch
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.riderPrimaryText}>
                                Delivery Partner <Text style={styles.riderNameHighlight}>{order.riderName}</Text>
                              </Text>
                              <Text style={styles.riderSecondaryText}>
                                {order.deliveryStatus === 'arrived_at_store'
                                  ? '🟢 Arrived at Restaurant (Waiting for Food)'
                                  : order.deliveryStatus === 'picked_up' || order.status === 'Picked up'
                                  ? 'Picked up order • Out for delivery'
                                  : order.status === 'Ready'
                                  ? 'Assigned • Awaiting food pickup'
                                  : `On the way • ETA ${order.etaMinutes || 4} mins`}
                              </Text>
                            </>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={17} color="#7E8492" />
                      </View>
                    )}

                    {/* Card Footer: Status Dot + Pill on Left, Actions on Right */}
                    <View style={styles.footerRow}>
                      <View style={styles.statusIndicatorGroup}>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor:
                                order.status === 'New'
                                  ? '#F2CA50'
                                  : order.status === 'Preparing'
                                  ? '#3B82F6'
                                  : '#10B981',
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor:
                                order.status === 'New'
                                  ? '#242013'
                                  : order.status === 'Preparing'
                                  ? '#131F33'
                                  : '#12291E',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              {
                                color:
                                  order.status === 'New'
                                    ? '#F2CA50'
                                    : order.status === 'Preparing'
                                    ? '#3B82F6'
                                    : '#10B981',
                              },
                            ]}
                          >
                            {order.status === 'New' ? 'NEW' : order.status === 'Preparing' ? 'PREPARING' : 'READY'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.actionsGroup}>
                        {order.status === 'New' && (
                          <>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={styles.actionRejectBtn}
                              onPress={() => rejectOrder(order.id, 'Kitchen busy')}
                            >
                              <Text style={styles.rejectBtnText}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={styles.actionAcceptBtn}
                              onPress={() => acceptOrder(order.id)}
                            >
                              <Text style={styles.acceptBtnText}>Accept</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {order.status === 'Preparing' && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={styles.actionReadyBtn}
                            onPress={() => markReady(order.id)}
                          >
                            <Text style={styles.readyBtnText}>Ready to Dispatch</Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'Ready' && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={styles.actionVerifyBtn}
                            onPress={() => {
                              setVerifyingOrder(order);
                              setOtpInput(order.handoverOtp || '');
                            }}
                          >
                            <Ionicons name="key-outline" size={15} color="#0D0E11" style={{ marginRight: 4 }} />
                            <Text style={styles.verifyBtnText}>Verify & Hand Over</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Prominent Swiggy Handover OTP Pill on Card */}
                    {(order.status === 'Ready' || order.status === 'Preparing') && (
                      <View style={styles.cardOtpBanner}>
                        <View style={styles.cardOtpLeft}>
                          <Ionicons name="shield-checkmark" size={15} color="#F2CA50" />
                          <Text style={styles.cardOtpLabel}>Pickup Handover OTP:</Text>
                        </View>
                        <View style={styles.cardOtpPill}>
                          <Text style={styles.cardOtpCode}>{order.handoverOtp || '4892'}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyView}>
              <Ionicons name="restaurant-outline" size={48} color="#8E8E8E" />
              <Text style={styles.emptyTitle}>No Live Orders</Text>
              <Text style={styles.emptySubtitle}>
                No orders are active in this status. New customer orders will show up here in real time.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* SWIGGY HANDOVER OTP VERIFICATION MODAL */}
      <Modal
        visible={!!verifyingOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifyingOrder(null)}
      >
        <TouchableOpacity
          style={styles.otpModalOverlay}
          activeOpacity={1}
          onPress={() => setVerifyingOrder(null)}
        >
          <View style={styles.otpModalContent}>
            <View style={styles.otpModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.otpModalTitle}>Verify Pickup Handover</Text>
                <Text style={styles.otpModalSubtitle}>
                  Order #{verifyingOrder?.id.slice(-4) || '1956'} • {verifyingOrder?.customer}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVerifyingOrder(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#8E8E8E" />
              </TouchableOpacity>
            </View>

            <View style={styles.expectedOtpCard}>
              <Text style={styles.expectedOtpLabel}>Required 4-Digit Handover Code</Text>
              <Text style={styles.expectedOtpNumber}>{verifyingOrder?.handoverOtp || '4892'}</Text>
              <Text style={styles.expectedOtpHint}>Ask the delivery partner or customer for this code</Text>
            </View>

            <View style={styles.otpInputContainer}>
              <Text style={styles.otpInputLabel}>Enter Code from Delivery Partner:</Text>
              <TextInput
                style={styles.otpTextInput}
                value={otpInput}
                onChangeText={setOtpInput}
                keyboardType="numeric"
                maxLength={4}
                placeholder="4-digit OTP"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.otpActionBtnsRow}>
              <TouchableOpacity
                style={styles.otpCancelBtn}
                activeOpacity={0.8}
                onPress={() => setVerifyingOrder(null)}
              >
                <Text style={styles.otpCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.otpConfirmBtn}
                activeOpacity={0.85}
                onPress={async () => {
                  if (verifyingOrder) {
                    const code = otpInput.trim() || verifyingOrder.handoverOtp || '4892';
                    const success = await verifyHandover(verifyingOrder.id, code);
                    if (success) {
                      setVerifyingOrder(null);
                      Alert.alert('Handover Complete', 'Food successfully handed over to partner.');
                    } else {
                      Alert.alert('Invalid OTP', 'The code entered does not match. Please verify with the driver.');
                    }
                  }
                }}
              >
                <Text style={styles.otpConfirmBtnText}>Confirm Handover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E11',
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#0D0E11',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: '#7E8492',
    marginTop: 3,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151410',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#73571A',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  historyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F2CA50',
  },

  /* Filter Tabs */
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 16,
  },
  filterTabActive: {
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    backgroundColor: '#161510',
  },
  filterTabInactive: {
    backgroundColor: '#17181D',
  },
  filterTabText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#7E8492',
  },
  filterTabTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },

  /* Main Scroll */
  mainScroll: {
    flex: 1,
  },
  gridContainer: {
    paddingTop: 2,
  },
  orderCard: {
    backgroundColor: '#131418',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#20232A',
    padding: 16,
    marginBottom: 16,
  },
  orderCardWarning: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },

  /* Header Row */
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  bagIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#2A1619',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTitleColumn: {
    marginLeft: 12,
    flex: 1,
  },
  shortTokenText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: '#7E8492',
    marginBottom: 1,
  },
  orderIdMainText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  customerSubText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#7E8492',
    marginTop: 2,
  },

  headerRightGroup: {
    alignItems: 'flex-end',
  },
  timeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C1417',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timeBadgeContainerDelayed: {
    backgroundColor: '#321519',
  },
  timeBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  placedTimeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#7E8492',
    marginTop: 5,
    textAlign: 'right',
  },

  /* Items Section */
  itemsSectionLabel: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#7E8492',
    marginTop: 16,
    marginBottom: 8,
  },
  itemsListContainer: {
    gap: 6,
  },
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1C22',
    borderRadius: 14,
    padding: 10,
  },
  itemThumbImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#22252C',
  },
  itemInfoColumn: {
    marginLeft: 12,
    flex: 1,
  },
  itemNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQtyMultiplier: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#F2CA50',
    marginRight: 8,
  },
  itemNameText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  itemAddonsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#F2CA50',
    marginTop: 2,
  },

  /* Cooking Instruction */
  cookingInstructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B13',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4A3B18',
  },
  cookingInstructionText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#EAE1D4',
    flex: 1,
  },

  /* Delivery / Rider Assignment Card */
  deliveryRiderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1C22',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  riderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#242730',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderTextColumn: {
    marginLeft: 12,
    flex: 1,
  },
  riderPrimaryText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  riderNameHighlight: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#10B981',
  },
  riderSecondaryText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#7E8492',
    marginTop: 2,
  },

  /* Footer Action Row */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  statusIndicatorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  statusPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRejectBtn: {
    backgroundColor: '#1F2229',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  rejectBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  actionAcceptBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginLeft: 10,
  },
  acceptBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#0D0E11',
  },
  actionReadyBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  readyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#0D0E11',
  },
  actionVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  verifyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#0D0E11',
  },

  /* Empty State */
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 6,
    lineHeight: 16,
  },

  /* SWIGGY HANDOVER OTP STYLES */
  cardOtpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  cardOtpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardOtpLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#F2CA50',
    marginLeft: 6,
  },
  cardOtpPill: {
    backgroundColor: '#F2CA50',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardOtpCode: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 2,
  },

  /* OTP VERIFICATION MODAL */
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  otpModalContent: {
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
  },
  otpModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpModalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  otpModalSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  expectedOtpCard: {
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 16,
    marginBottom: 16,
  },
  expectedOtpLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
  },
  expectedOtpNumber: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 32,
    fontWeight: '800',
    color: '#F2CA50',
    letterSpacing: 6,
    marginVertical: 4,
  },
  expectedOtpHint: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#666666',
  },
  otpInputContainer: {
    marginBottom: 20,
  },
  otpInputLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  otpTextInput: {
    backgroundColor: '#0E0E0E',
    borderWidth: 1.5,
    borderColor: '#3A3A3A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 6,
    textAlign: 'center',
  },
  otpActionBtnsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  otpCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCancelBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#8E8E8E',
  },
  otpConfirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F2CA50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpConfirmBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0B0B0B',
  },
});
