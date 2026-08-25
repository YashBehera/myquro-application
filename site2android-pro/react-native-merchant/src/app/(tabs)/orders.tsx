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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOrderStore, Order } from '../../state/orderStore';

const { width } = Dimensions.get('window');

export default function LiveOrdersTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders, isLoading, loadOrders, acceptOrder, markReady, markPickedUp, rejectOrder } = useOrderStore();
  
  const [activeFilter, setActiveFilter] = useState<'All' | 'New' | 'Preparing' | 'Ready'>('All');

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
            <Ionicons name="time-outline" size={16} color="#E8C547" style={{ marginRight: 4 }} />
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
                style={[styles.filterTab, isActive && styles.filterTabActive]}
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
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
                      <View>
                        <Text style={styles.orderIdText}>{order.id}</Text>
                        <Text style={styles.customerName}>{order.customer}</Text>
                      </View>
                      <View style={styles.timeBadgeContainer}>
                        {delayed && <Ionicons name="alert-circle" size={16} color="#EF4444" style={{ marginRight: 4 }} />}
                        <Text style={[styles.timeText, delayed && styles.timeTextWarning]}>
                          {getWaitingTime(order.timestamp)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Items List */}
                    <View style={styles.itemsBox}>
                      {order.items.map((item, idx) => (
                        <View key={idx} style={{ marginBottom: 4 }}>
                          <View style={styles.itemRow}>
                            <Text style={styles.itemQty}>{item.qty}x</Text>
                            <Text style={styles.itemName}>{item.name}</Text>
                          </View>
                          {item.addonsText ? (
                            <Text style={{ fontSize: 11, color: '#E8C547', marginLeft: 24, marginTop: 1 }}>
                              ✨ {item.addonsText}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>

                    <View style={styles.divider} />

                    {/* Actions and Status Row */}
                    <View style={styles.footerRow}>
                      <View style={styles.statusIndicator}>
                        <View style={[styles.statusDot, { backgroundColor: order.status === 'New' ? '#E8C547' : order.status === 'Preparing' ? '#3B82F6' : '#16A34A' }]} />
                        <Text style={styles.statusLabelText}>{order.status}</Text>
                      </View>

                      <View style={styles.actionsGroup}>
                        {order.status === 'New' && (
                          <>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={styles.actionDeclineBtn}
                              onPress={() => rejectOrder(order.id, 'Kitchen busy')}
                            >
                              <Text style={styles.declineBtnText}>Reject</Text>
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
                            style={styles.actionPrepareBtn}
                            onPress={() => markReady(order.id)}
                          >
                            <Text style={styles.prepareBtnText}>Ready to Dispatch</Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'Ready' && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={styles.actionDeliverBtn}
                            onPress={() => markPickedUp(order.id)}
                          >
                            <Text style={styles.deliverBtnText}>Hand Over</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#000000',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  historyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
  },

  /* Filter Tabs */
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#191919',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterTabActive: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
  },
  filterTabText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  filterTabTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },

  /* Main Scroll */
  mainScroll: {
    flex: 1,
    marginTop: 10,
  },
  gridContainer: {
    paddingTop: 6,
  },
  orderCard: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginBottom: 12,
  },
  orderCardWarning: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#E8C547',
    letterSpacing: 0.3,
  },
  customerName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  timeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  timeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  timeTextWarning: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 10,
  },
  itemsBox: {
    marginVertical: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  itemQty: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#E8C547',
    width: 22,
  },
  itemName: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabelText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E8E',
    textTransform: 'uppercase',
  },
  actionsGroup: {
    flexDirection: 'row',
  },
  actionDeclineBtn: {
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 6,
  },
  declineBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  actionAcceptBtn: {
    backgroundColor: '#E8C547',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  acceptBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0B0B0B',
  },
  actionPrepareBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  prepareBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionDeliverBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deliverBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
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
});
