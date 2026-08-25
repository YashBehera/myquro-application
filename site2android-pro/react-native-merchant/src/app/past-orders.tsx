import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOrderStore, Order, OrderItem } from '../state/orderStore';

const { width } = Dimensions.get('window');

type DateRange = 'Today' | 'Yesterday' | 'This Week' | 'Last Week' | 'This Month' | 'Last Month';
type ViewType = 'Day' | 'Week' | 'Month';
type SortType = 'Newest' | 'Oldest' | 'Highest Amount' | 'Lowest Amount';

export default function PastOrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orders, isLoading, loadOrders } = useOrderStore();

  // Filters & State
  const [dateRange, setDateRange] = useState<DateRange>('This Month');
  const [viewType, setViewType] = useState<ViewType>('Month');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('Newest');
  
  // Filter parameters state definition

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected Order for detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Load database on mount
  useEffect(() => {
    loadOrders();
  }, []);

  // Centralized Date Range Parser
  const dateLimits = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (dateRange) {
      case 'Today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'Yesterday':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(now.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'This Week':
        // Start of week (Sunday or Monday, let's say Monday)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'Last Week':
        const lastWeekDiff = now.getDate() - now.getDay() - 6;
        startDate.setDate(lastWeekDiff);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(lastWeekDiff + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'This Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'Last Month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  }, [dateRange]);

  // Comparative window parser (For Growth metrics)
  const previousPeriodLimits = useMemo(() => {
    const { startDate, endDate } = dateLimits;
    const durationMs = endDate.getTime() - startDate.getTime();
    
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    
    return { prevStartDate, prevEndDate };
  }, [dateLimits]);

  // Filter Orders by Date Limits
  const ordersInDateRange = useMemo(() => {
    const { startDate, endDate } = dateLimits;
    return orders.filter((order) => {
      const orderTime = new Date(order.timestamp).getTime();
      return orderTime >= startDate.getTime() && orderTime <= endDate.getTime();
    });
  }, [orders, dateLimits]);

  // Filter Orders in previous comparative window
  const ordersInPreviousPeriod = useMemo(() => {
    const { prevStartDate, prevEndDate } = previousPeriodLimits;
    return orders.filter((order) => {
      const orderTime = new Date(order.timestamp).getTime();
      return orderTime >= prevStartDate.getTime() && orderTime <= prevEndDate.getTime();
    });
  }, [orders, previousPeriodLimits]);

  // Completed Sales Helper (picked up status contributes to revenue)
  const computeSales = (orderList: Order[]) => {
    return orderList
      .filter((o) => o.status === 'Picked up')
      .reduce((sum, o) => sum + o.total, 0);
  };

  const computeCompletedCount = (orderList: Order[]) => {
    return orderList.filter((o) => o.status === 'Picked up').length;
  };

  const computeAcceptanceRate = (orderList: Order[]) => {
    const totalReceived = orderList.length;
    if (totalReceived === 0) return 0;
    const acceptedCount = orderList.filter(o => o.status !== 'Rejected' && o.status !== 'New').length;
    return Math.round((acceptedCount / totalReceived) * 100);
  };

  const computeItemsCount = (orderList: Order[]) => {
    return orderList
      .filter(o => o.status === 'Picked up')
      .reduce((sum, o) => sum + o.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0);
  };

  // Analytics Metrics (Derived dynamically)
  const currentMetrics = useMemo(() => {
    const totalOrders = computeCompletedCount(ordersInDateRange);
    const totalSales = computeSales(ordersInDateRange);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
    const itemsSold = computeItemsCount(ordersInDateRange);
    const acceptanceRate = computeAcceptanceRate(ordersInDateRange);

    return { totalOrders, totalSales, avgOrderValue, itemsSold, acceptanceRate };
  }, [ordersInDateRange]);

  const previousMetrics = useMemo(() => {
    const totalOrders = computeCompletedCount(ordersInPreviousPeriod);
    const totalSales = computeSales(ordersInPreviousPeriod);
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

    return { totalOrders, totalSales, avgOrderValue };
  }, [ordersInPreviousPeriod]);

  // Comparison Percentages
  const comparisons = useMemo(() => {
    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      salesGrowth: calcGrowth(currentMetrics.totalSales, previousMetrics.totalSales),
      ordersGrowth: calcGrowth(currentMetrics.totalOrders, previousMetrics.totalOrders),
      aovGrowth: calcGrowth(currentMetrics.avgOrderValue, previousMetrics.avgOrderValue),
    };
  }, [currentMetrics, previousMetrics]);

  // Hourly Order Distribution
  const hourlyDistribution = useMemo(() => {
    const dist: { [key: number]: number } = {};
    for (let h = 9; h <= 23; h++) dist[h] = 0; // Initialize hours 9 AM to 11 PM

    ordersInDateRange.forEach((o) => {
      if (o.status === 'Picked up') {
        const hour = new Date(o.timestamp).getHours();
        if (dist[hour] !== undefined) {
          dist[hour] += 1;
        }
      }
    });

    return Object.keys(dist).map(h => ({
      hourStr: `${parseInt(h) % 12 || 12} ${parseInt(h) >= 12 ? 'PM' : 'AM'}`,
      count: dist[parseInt(h)],
    }));
  }, [ordersInDateRange]);

  // Day distribution for chart (Monday to Sunday)
  const weekdayDistribution = useMemo(() => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dist: { [key: string]: number } = {
      Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
    };

    ordersInDateRange.forEach((o) => {
      if (o.status === 'Picked up') {
        const dayStr = weekdays[new Date(o.timestamp).getDay()];
        dist[dayStr] += 1;
      }
    });

    return Object.keys(dist).map(day => ({
      day,
      count: dist[day]
    }));
  }, [ordersInDateRange]);

  // Items stats calculations (Top Selling and Demanded)
  const itemsStats = useMemo(() => {
    const itemMap: { [key: string]: { qty: number; orderCount: number; revenue: number } } = {};
    
    ordersInDateRange.forEach((order) => {
      if (order.status === 'Picked up') {
        const uniqueItems = new Set(order.items.map(i => i.name));
        order.items.forEach((item) => {
          if (!itemMap[item.name]) {
            itemMap[item.name] = { qty: 0, orderCount: 0, revenue: 0 };
          }
          itemMap[item.name].qty += item.qty;
          itemMap[item.name].revenue += item.price * item.qty;
        });
        uniqueItems.forEach((name) => {
          if (itemMap[name]) itemMap[name].orderCount += 1;
        });
      }
    });

    const totalQtySold = Object.values(itemMap).reduce((sum, item) => sum + item.qty, 0);

    const itemList = Object.keys(itemMap).map((name) => {
      const item = itemMap[name];
      return {
        name,
        qty: item.qty,
        ordersCount: item.orderCount,
        revenue: item.revenue,
        percentageOfSales: totalQtySold > 0 ? Math.round((item.qty / totalQtySold) * 100) : 0,
        demandPercentage: ordersInDateRange.length > 0 ? Math.round((item.orderCount / ordersInDateRange.length) * 100) : 0,
      };
    });

    return {
      topSelling: [...itemList].sort((a, b) => b.qty - a.qty),
      mostDemanded: [...itemList].sort((a, b) => b.demandPercentage - a.demandPercentage),
    };
  }, [ordersInDateRange]);

  // Operational metrics (Prep time, peak hours)
  const operationalMetrics = useMemo(() => {
    let totalPrepMins = 0;
    let prepCount = 0;
    let slowCount = 0; // exceeded expected prep time of 30 mins

    ordersInDateRange.forEach((o) => {
      if (o.status === 'Picked up' && o.readyTime && o.acceptedTime) {
        const prepMs = new Date(o.readyTime).getTime() - new Date(o.acceptedTime).getTime();
        const prepMins = Math.round(prepMs / (60 * 1000));
        if (prepMins > 0) {
          totalPrepMins += prepMins;
          prepCount++;
          if (prepMins > 30) slowCount++;
        }
      }
    });

    const avgPrepTime = prepCount > 0 ? Math.round(totalPrepMins / prepCount) : 0;

    // Peak ordering period calculations
    let lunchCount = 0;
    let lunchSales = 0;
    let dinnerCount = 0;
    let dinnerSales = 0;

    ordersInDateRange.forEach((o) => {
      if (o.status === 'Picked up') {
        const hour = new Date(o.timestamp).getHours();
        if (hour >= 12 && hour <= 14) {
          lunchCount++;
          lunchSales += o.total;
        } else if (hour >= 19 && hour <= 22) {
          dinnerCount++;
          dinnerSales += o.total;
        }
      }
    });

    return { avgPrepTime, slowCount, lunchCount, lunchSales, dinnerCount, dinnerSales };
  }, [ordersInDateRange]);

  // Customer Insights
  const customerInsights = useMemo(() => {
    let newCustCount = 0;
    let retCustCount = 0;
    const completedOrders = ordersInDateRange.filter(o => o.status === 'Picked up');
    
    completedOrders.forEach((o) => {
      if (o.customerType === 'Returning') retCustCount++;
      else newCustCount++;
    });

    const total = completedOrders.length;

    return {
      newCount: newCustCount,
      newPercent: total > 0 ? Math.round((newCustCount / total) * 100) : 0,
      retCount: retCustCount,
      retPercent: total > 0 ? Math.round((retCustCount / total) * 100) : 0,
    };
  }, [ordersInDateRange]);

  // Actionable Insights ("Outlet Insights")
  const dataInsights = useMemo(() => {
    const list: string[] = [];

    // Volume time peak
    if (operationalMetrics.dinnerCount > operationalMetrics.lunchCount && operationalMetrics.dinnerCount > 5) {
      const dinnerPct = Math.round((operationalMetrics.dinnerCount / Math.max(ordersInDateRange.length, 1)) * 100);
      list.push(`Your highest order volume is at dinner peak, driving ${dinnerPct}% of daily orders.`);
    } else if (operationalMetrics.lunchCount > 5) {
      list.push(`Your highest order volume is during lunch period.`);
    }

    // Top item insight
    if (itemsStats.topSelling.length > 0) {
      const top = itemsStats.topSelling[0];
      list.push(`"${top.name}" generated the highest item sales in this period with ${top.qty} sold.`);
    }

    // Prep time alert
    if (operationalMetrics.avgPrepTime > 30) {
      list.push(`Warning: Average preparation time is high (${operationalMetrics.avgPrepTime} mins). This may affect delivery times.`);
    } else if (operationalMetrics.avgPrepTime > 0) {
      list.push(`Great job! Kitchen prep speed is stable at ${operationalMetrics.avgPrepTime} minutes on average.`);
    }

    // Rejection alerts
    const totalReceived = ordersInDateRange.length;
    const rejected = ordersInDateRange.filter(o => o.status === 'Rejected').length;
    if (totalReceived > 0 && (rejected / totalReceived) > 0.15) {
      const rejectPct = Math.round((rejected / totalReceived) * 100);
      list.push(`Rejection rate is high at ${rejectPct}%. Verify menu availability or capacity issues.`);
    }

    return list;
  }, [ordersInDateRange, itemsStats, operationalMetrics]);

  // Filter & Search Table History
  const filteredHistory = useMemo(() => {
    let list = [...ordersInDateRange];

    // Status Filter
    if (statusFilter !== 'All') {
      list = list.filter((o) => o.status === statusFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((o) => 
        o.id.toLowerCase().includes(query) || o.customer.toLowerCase().includes(query)
      );
    }

    // Amount Range Filters
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) list = list.filter(o => o.total >= min);
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) list = list.filter(o => o.total <= max);
    }

    // Sorting
    switch (sortBy) {
      case 'Newest':
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case 'Oldest':
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case 'Highest Amount':
        list.sort((a, b) => b.total - a.total);
        break;
      case 'Lowest Amount':
        list.sort((a, b) => a.total - b.total);
        break;
    }

    return list;
  }, [ordersInDateRange, statusFilter, searchQuery, minAmount, maxAmount, sortBy]);

  // Paginated Table Orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredHistory.slice(startIndex, startIndex + pageSize);
  }, [filteredHistory, currentPage]);

  const totalPages = Math.max(Math.ceil(filteredHistory.length / pageSize), 1);

  // CSV Exporter Action
  const handleExportCSV = async () => {
    if (filteredHistory.length === 0) {
      Alert.alert('No Data', 'No orders found in the current filters to export.');
      return;
    }

    try {
      // Build CSV String
      let csv = 'Order ID,Customer,Customer Type,Date,Status,Total Amount,Items,Accepted Time,Ready Time,Completed Time\n';
      
      filteredHistory.forEach((o) => {
        const itemsStr = o.items.map(i => `${i.qty}x ${i.name}`).join(' | ');
        const dateStr = new Date(o.timestamp).toLocaleDateString();
        
        csv += `"${o.id}","${o.customer}","${o.customerType}","${dateStr}","${o.status}",${o.total},"${itemsStr}","${o.acceptedTime || ''}","${o.readyTime || ''}","${o.pickedUpTime || ''}"\n`;
      });

      // Share CSV content
      await Share.share({
        message: csv,
        title: `MyQuro_Orders_${dateRange}.csv`,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Export Failed', 'Unable to share order history report.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Main Layout Area */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        
        {/* Header bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#E8C547" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Past Orders</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              View history and analyze outlet sales performance
            </Text>
          </View>
          <TouchableOpacity onPress={handleExportCSV} style={styles.exportBtn} activeOpacity={0.75}>
            <Ionicons name="download-outline" size={18} color="#E8C547" />
            <Text style={styles.exportBtnText}>EXPORT</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >

          {/* Quick Date Selectors Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateSelectorRow}
            contentContainerStyle={styles.dateSelectorContent}
          >
            {(['Today', 'Yesterday', 'This Week', 'This Month', 'Last Month'] as DateRange[]).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.dateSelectorBtn, dateRange === r && styles.dateSelectorBtnActive]}
                onPress={() => setDateRange(r)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dateSelectorText, dateRange === r && styles.dateSelectorTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Day / Week / Month Switcher */}
          <View style={styles.viewTypeSwitcher}>
            {(['Day', 'Week', 'Month'] as ViewType[]).map((vt) => (
              <TouchableOpacity
                key={vt}
                style={[styles.viewTypeTab, viewType === vt && styles.viewTypeTabActive]}
                onPress={() => setViewType(vt)}
                activeOpacity={0.75}
              >
                <Text style={[styles.viewTypeText, viewType === vt && styles.viewTypeTextActive]}>
                  {vt} View
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Metric Summary Cards */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Orders</Text>
              <Text style={styles.metricVal}>{currentMetrics.totalOrders}</Text>
              {comparisons.ordersGrowth !== null ? (
                <Text style={[styles.growthLabel, comparisons.ordersGrowth >= 0 ? styles.positiveGrowth : styles.negativeGrowth]}>
                  {comparisons.ordersGrowth >= 0 ? '↑' : '↓'} {Math.abs(comparisons.ordersGrowth)}% vs prev
                </Text>
              ) : (
                <Text style={styles.noGrowthLabel}>No comparison data</Text>
              )}
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Sales</Text>
              <Text style={styles.metricVal}>₹{currentMetrics.totalSales.toLocaleString()}</Text>
              {comparisons.salesGrowth !== null ? (
                <Text style={[styles.growthLabel, comparisons.salesGrowth >= 0 ? styles.positiveGrowth : styles.negativeGrowth]}>
                  {comparisons.salesGrowth >= 0 ? '↑' : '↓'} {Math.abs(comparisons.salesGrowth)}% vs prev
                </Text>
              ) : (
                <Text style={styles.noGrowthLabel}>No comparison data</Text>
              )}
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Average Order Value</Text>
              <Text style={styles.metricVal}>₹{currentMetrics.avgOrderValue}</Text>
              {comparisons.aovGrowth !== null ? (
                <Text style={[styles.growthLabel, comparisons.aovGrowth >= 0 ? styles.positiveGrowth : styles.negativeGrowth]}>
                  {comparisons.aovGrowth >= 0 ? '↑' : '↓'} {Math.abs(comparisons.aovGrowth)}% vs prev
                </Text>
              ) : (
                <Text style={styles.noGrowthLabel}>No comparison data</Text>
              )}
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Acceptance Rate</Text>
              <Text style={styles.metricVal}>{currentMetrics.acceptanceRate}%</Text>
              <Text style={styles.noGrowthLabel}>Items Sold: {currentMetrics.itemsSold}</Text>
            </View>
          </View>

          {/* Actionable Outlet Insights Card */}
          {dataInsights.length > 0 && (
            <View style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Ionicons name="bulb-outline" size={18} color="#E8C547" />
                <Text style={styles.insightsTitle}>Outlet Operational Insights</Text>
              </View>
              {dataInsights.map((insight, idx) => (
                <Text key={idx} style={styles.insightStatement}>• {insight}</Text>
              ))}
            </View>
          )}

          {/* Day View Specific Layout Details */}
          {viewType === 'Day' && (
            <View style={styles.analyticsSection}>
              <Text style={styles.sectionHeaderTitle}>Today's Operational distribution</Text>
              
              {/* Hourly Chart Bar Representation */}
              <View style={styles.chartContainer}>
                {hourlyDistribution.map((h, idx) => {
                  const maxCount = Math.max(...hourlyDistribution.map(item => item.count), 1);
                  const fillPct = (h.count / maxCount) * 100;
                  return (
                    <View key={idx} style={styles.chartBarRow}>
                      <Text style={styles.chartBarLabel}>{h.hourStr}</Text>
                      <View style={styles.chartBarTrack}>
                        <View style={[styles.chartBarFill, { width: `${fillPct}%` }]} />
                      </View>
                      <Text style={styles.chartBarValue}>{h.count} ord</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Week View Specific Layout Details */}
          {viewType === 'Week' && (
            <View style={styles.analyticsSection}>
              <Text style={styles.sectionHeaderTitle}>Weekly Orders by Day</Text>

              {/* Day Chart Bar Representation */}
              <View style={styles.chartContainer}>
                {weekdayDistribution.map((d, idx) => {
                  const maxCount = Math.max(...weekdayDistribution.map(item => item.count), 1);
                  const fillPct = (d.count / maxCount) * 100;
                  return (
                    <View key={idx} style={styles.chartBarRow}>
                      <Text style={styles.chartBarLabel}>{d.day}</Text>
                      <View style={styles.chartBarTrack}>
                        <View style={[styles.chartBarFill, { width: `${fillPct}%` }]} />
                      </View>
                      <Text style={styles.chartBarValue}>{d.count} ord</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Month View Specific Layout Details */}
          {viewType === 'Month' && (
            <View style={styles.analyticsSection}>
              <Text style={styles.sectionHeaderTitle}>Sales & Operational Breakdown</Text>
              
              <View style={styles.operationalGrid}>
                <View style={styles.opCard}>
                  <Text style={styles.opLabel}>Avg Preparation Speed</Text>
                  <Text style={styles.opVal}>{operationalMetrics.avgPrepTime} mins</Text>
                  <Text style={styles.opSubtitle}>Orders exceeding expected: {operationalMetrics.slowCount}</Text>
                </View>

                <View style={styles.opCard}>
                  <Text style={styles.opLabel}>Returning Customers</Text>
                  <Text style={styles.opVal}>{customerInsights.retPercent}%</Text>
                  <Text style={styles.opSubtitle}>{customerInsights.retCount} orders from loyalty</Text>
                </View>
              </View>
            </View>
          )}

          {/* Top Selling Items (With filter capabilities) */}
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionHeaderTitle}>Top Selling Items</Text>
            {itemsStats.topSelling.length > 0 ? (
              <View style={styles.tableBox}>
                {itemsStats.topSelling.slice(0, 5).map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableRank}>{idx + 1}.</Text>
                    <View style={styles.tableNameCol}>
                      <Text style={styles.tableItemName}>{item.name}</Text>
                      <Text style={styles.tableItemSub}>{item.ordersCount} orders contain this</Text>
                    </View>
                    <View style={styles.tableValueCol}>
                      <Text style={styles.tableItemVal}>{item.qty} sold</Text>
                      <Text style={styles.tableItemRev}>₹{item.revenue}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noDataPlaceholder}>No item sales data in this date range.</Text>
            )}
          </View>

          {/* Most Demanded Items (Frequency based demand) */}
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionHeaderTitle}>Most Demanded Items</Text>
            {itemsStats.mostDemanded.length > 0 ? (
              <View style={styles.tableBox}>
                {itemsStats.mostDemanded.slice(0, 5).map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableRank}>{idx + 1}.</Text>
                    <View style={styles.tableNameCol}>
                      <Text style={styles.tableItemName}>{item.name}</Text>
                      <Text style={styles.tableItemSub}>In {item.ordersCount} of received orders</Text>
                    </View>
                    <View style={styles.tableValueCol}>
                      <Text style={styles.tableItemVal}>{item.demandPercentage}%</Text>
                      <Text style={styles.tableItemRev}>Demand rate</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noDataPlaceholder}>No item demand rate stats available.</Text>
            )}
          </View>

          {/* Operational Peak Ordering Hours */}
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionHeaderTitle}>Peak Ordering Hours</Text>
            <View style={styles.peakContainer}>
              <View style={styles.peakBox}>
                <Ionicons name="sunny-outline" size={18} color="#E8C547" />
                <Text style={styles.peakLabel}>Lunch Peak (12-2 PM)</Text>
                <Text style={styles.peakVal}>{operationalMetrics.lunchCount} orders completed</Text>
                <Text style={styles.peakRevenue}>Sales: ₹{operationalMetrics.lunchSales}</Text>
              </View>
              
              <View style={styles.peakBox}>
                <Ionicons name="moon-outline" size={18} color="#E8C547" />
                <Text style={styles.peakLabel}>Dinner Peak (7-10 PM)</Text>
                <Text style={styles.peakVal}>{operationalMetrics.dinnerCount} orders completed</Text>
                <Text style={styles.peakRevenue}>Sales: ₹{operationalMetrics.dinnerSales}</Text>
              </View>
            </View>
          </View>

          {/* Order Performance (Rejection statistics) */}
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionHeaderTitle}>Order Status Performance</Text>
            <View style={styles.statusBreakdownContainer}>
              {['Picked up', 'Rejected', 'Preparing', 'Ready', 'New'].map((status) => {
                const count = ordersInDateRange.filter(o => o.status === status).length;
                const pct = ordersInDateRange.length > 0 ? Math.round((count / ordersInDateRange.length) * 100) : 0;
                return (
                  <View key={status} style={styles.statusRow}>
                    <Text style={styles.statusLabel}>{status}</Text>
                    <View style={styles.statusTrack}>
                      <View style={[styles.statusFill, { width: `${pct}%`, backgroundColor: status === 'Picked up' ? '#16A34A' : status === 'Rejected' ? '#EF4444' : '#E8C547' }]} />
                    </View>
                    <Text style={styles.statusPct}>{count} ({pct}%)</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Complete Order History Section */}
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionHeaderTitle}>Order Records Database</Text>
            
            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#E8C547" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ID or customer name..."
                placeholderTextColor="#8E8E8E"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter controls */}
            <View style={styles.filterControlsBox}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilterRow}>
                {['All', 'Picked up', 'Rejected', 'Preparing', 'Ready', 'New'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusFilterBtn, statusFilter === s && styles.statusFilterBtnActive]}
                    onPress={() => {
                      setStatusFilter(s);
                      setCurrentPage(1);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.statusFilterText, statusFilter === s && styles.statusFilterTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.amountRangeRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Min Amount (₹)"
                  placeholderTextColor="#8E8E8E"
                  keyboardType="numeric"
                  value={minAmount}
                  onChangeText={(val) => { setMinAmount(val); setCurrentPage(1); }}
                />
                <TextInput
                  style={styles.amountInput}
                  placeholder="Max Amount (₹)"
                  placeholderTextColor="#8E8E8E"
                  keyboardType="numeric"
                  value={maxAmount}
                  onChangeText={(val) => { setMaxAmount(val); setCurrentPage(1); }}
                />
              </View>

              {/* Sorting Row */}
              <View style={styles.sortingRow}>
                <Text style={styles.sortingLabel}>Sort by:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(['Newest', 'Oldest', 'Highest Amount', 'Lowest Amount'] as SortType[]).map((sort) => (
                    <TouchableOpacity
                      key={sort}
                      style={[styles.sortBtn, sortBy === sort && styles.sortBtnActive]}
                      onPress={() => setSortBy(sort)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.sortBtnText, sortBy === sort && styles.sortBtnTextActive]}>
                        {sort}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Database Table Records */}
            {paginatedOrders.length > 0 ? (
              <View style={styles.tableContainer}>
                {paginatedOrders.map((order) => (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.tableOrderRow}
                    activeOpacity={0.7}
                    onPress={() => setSelectedOrder(order)}
                  >
                    <View style={styles.orderLeftMeta}>
                      <Text style={styles.tableOrderId}>{order.id}</Text>
                      <Text style={styles.tableOrderDate}>{new Date(order.timestamp).toLocaleDateString()}</Text>
                    </View>
                    
                    <View style={styles.orderMiddleMeta}>
                      <Text style={styles.tableCustomerName} numberOfLines={1}>{order.customer}</Text>
                      <Text style={styles.tableItemsCount} numberOfLines={1}>
                        {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </Text>
                    </View>

                    <View style={styles.orderRightMeta}>
                      <Text style={styles.tableTotal}>₹{order.total}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: order.status === 'Picked up' ? 'rgba(22,163,74,0.15)' : order.status === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(232,197,71,0.15)' }]}>
                        <Text style={[styles.statusBadgeText, { color: order.status === 'Picked up' ? '#16A34A' : order.status === 'Rejected' ? '#EF4444' : '#E8C547' }]}>
                          {order.status === 'Picked up' ? 'Delivered' : order.status === 'Rejected' ? 'Rejected' : order.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Pagination Controls */}
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  >
                    <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#8E8E8E' : '#E8C547'} />
                  </TouchableOpacity>
                  
                  <Text style={styles.pageIndicator}>
                    Page {currentPage} of {totalPages}
                  </Text>
                  
                  <TouchableOpacity
                    disabled={currentPage === totalPages}
                    onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  >
                    <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#8E8E8E' : '#E8C547'} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataPlaceholder}>No orders match search or filter query.</Text>
            )}

          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Detailed Order view Modal */}
      {selectedOrder && (
        <Modal
          visible={selectedOrder !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedOrder(null)}
        >
          <View style={styles.detailsModalBackdrop}>
            <View style={styles.detailsModalContent}>
              <View style={styles.detailsModalHeader}>
                <Text style={styles.detailsTitle}>Order Receipt - {selectedOrder.id}</Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalScroll}>
                {/* Customer information */}
                <Text style={styles.receiptSectionTitle}>Customer Information</Text>
                <View style={styles.receiptBox}>
                  <Text style={styles.receiptText}>Customer: {selectedOrder.customer}</Text>
                  <Text style={styles.receiptText}>Loyalty: {selectedOrder.customerType} Customer</Text>
                  <Text style={styles.receiptText}>Date: {new Date(selectedOrder.timestamp).toLocaleDateString()}</Text>
                </View>

                {/* Items List */}
                <Text style={styles.receiptSectionTitle}>Items Ordered</Text>
                <View style={styles.receiptBox}>
                  {selectedOrder.items.map((item, idx) => (
                    <View key={idx} style={{ marginBottom: 6 }}>
                      <View style={styles.receiptItemRow}>
                        <Text style={styles.receiptItemQty}>{item.qty}x</Text>
                        <Text style={styles.receiptItemName}>{item.name}</Text>
                        <Text style={styles.receiptItemPrice}>₹{item.price * item.qty}</Text>
                      </View>
                      {item.addonsText ? (
                        <Text style={{ fontSize: 11, color: '#E8C547', marginLeft: 24, marginTop: 1 }}>
                          ✨ {item.addonsText}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Final receipt summary */}
                <Text style={styles.receiptSectionTitle}>Receipt Summary</Text>
                <View style={styles.receiptBox}>
                  <View style={styles.receiptSumRow}>
                    <Text style={styles.receiptSumLabel}>Subtotal</Text>
                    <Text style={styles.receiptSumValue}>₹{selectedOrder.subtotal || (selectedOrder.total - (selectedOrder.gst || Math.round(selectedOrder.total * 5 / 105)))}</Text>
                  </View>
                  <View style={styles.receiptSumRow}>
                    <Text style={styles.receiptSumLabel}>Discount</Text>
                    <Text style={styles.receiptSumValue}>-₹{selectedOrder.discount || 0}</Text>
                  </View>
                  <View style={styles.receiptSumRow}>
                    <Text style={styles.receiptSumLabel}>Taxes (GST 5%)</Text>
                    <Text style={styles.receiptSumValue}>₹{selectedOrder.gst || Math.round((selectedOrder.subtotal || selectedOrder.total) * 0.05)}</Text>
                  </View>
                  <View style={styles.dividerLine} />
                  <View style={styles.receiptSumRow}>
                    <Text style={styles.receiptSumGrand}>Grand Total</Text>
                    <Text style={styles.receiptSumGrandVal}>₹{selectedOrder.total}</Text>
                  </View>
                </View>

                {/* Timeline */}
                <Text style={styles.receiptSectionTitle}>Order Timeline</Text>
                <View style={styles.timelineContainer}>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineDotActive} />
                    <Text style={styles.timelineText}>Order Received: {new Date(selectedOrder.receivedTime).toLocaleTimeString()}</Text>
                  </View>
                  
                  {selectedOrder.acceptedTime && (
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDotActive} />
                      <Text style={styles.timelineText}>Accepted: {new Date(selectedOrder.acceptedTime).toLocaleTimeString()}</Text>
                    </View>
                  )}

                  {selectedOrder.readyTime && (
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDotActive} />
                      <Text style={styles.timelineText}>Ready: {new Date(selectedOrder.readyTime).toLocaleTimeString()}</Text>
                    </View>
                  )}

                  {selectedOrder.pickedUpTime && (
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDotActive} />
                      <Text style={styles.timelineText}>Picked Up / Completed: {new Date(selectedOrder.pickedUpTime).toLocaleTimeString()}</Text>
                    </View>
                  )}

                  {selectedOrder.status === 'Rejected' && (
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineDotError} />
                      <Text style={styles.timelineTextError}>Rejected: {selectedOrder.rejectionReason || 'Out of stock'}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#000000',
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
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  exportBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 6,
  },
  mainScroll: {
    flex: 1,
  },

  /* Date selector styles */
  dateSelectorRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  dateSelectorContent: {
    paddingHorizontal: 16,
  },
  dateSelectorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#191919',
    marginRight: 8,
  },
  dateSelectorBtnActive: {
    borderColor: '#E8C547',
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
  },
  dateSelectorText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  dateSelectorTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },

  /* Day/Week/Month ViewType switcher */
  viewTypeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  viewTypeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewTypeTabActive: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#E8C547',
  },
  viewTypeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  viewTypeTabActiveText: {},
  viewTypeTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },

  /* Metrics Summary Cards */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginTop: 16,
  },
  metricCard: {
    width: (width - 40) / 2,
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginHorizontal: 5,
    marginVertical: 5,
  },
  metricLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  metricVal: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  growthLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  positiveGrowth: {
    color: '#16A34A',
  },
  negativeGrowth: {
    color: '#EF4444',
  },
  noGrowthLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 9.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },

  /* Insights Card */
  insightsCard: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightsTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#E8C547',
    marginLeft: 8,
  },
  insightStatement: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF',
    marginVertical: 3,
    lineHeight: 16,
  },

  /* Charts & Distribution Section styling */
  analyticsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
  },
  chartBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  chartBarLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
    width: 60,
  },
  chartBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#141414',
    marginHorizontal: 10,
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#E8C547',
  },
  chartBarValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    width: 45,
    textAlign: 'right',
  },

  /* Operational grid details */
  operationalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  opCard: {
    flex: 1,
    backgroundColor: '#191919',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginRight: 8,
  },
  opLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  opVal: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  opSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 9.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },

  /* Table listing styled rows */
  tableBox: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  tableRank: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E8C547',
    width: 24,
  },
  tableNameCol: {
    flex: 1,
  },
  tableItemName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tableItemSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 1,
  },
  tableValueCol: {
    alignItems: 'flex-end',
  },
  tableItemVal: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tableItemRev: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#E8C547',
    marginTop: 1,
  },
  noDataPlaceholder: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    textAlign: 'center',
    paddingVertical: 18,
  },

  /* Peak box hours layouts */
  peakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  peakBox: {
    flex: 1,
    backgroundColor: '#191919',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginRight: 6,
    alignItems: 'center',
  },
  peakLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  peakVal: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  peakRevenue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#E8C547',
    marginTop: 2,
  },

  /* Status breakdown block styling */
  statusBreakdownContainer: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  statusLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    width: 70,
  },
  statusTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#141414',
    marginHorizontal: 10,
  },
  statusFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusPct: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E8E',
    width: 60,
    textAlign: 'right',
  },

  /* Complete Database Table History styling */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
  },
  filterControlsBox: {
    backgroundColor: '#191919',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
  },
  statusFilterRow: {
    paddingVertical: 4,
  },
  statusFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 6,
  },
  statusFilterBtnActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  statusFilterText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  statusFilterTextActive: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  amountRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    marginHorizontal: 3,
  },
  sortingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
    paddingTop: 8,
  },
  sortingLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginRight: 8,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginRight: 6,
  },
  sortBtnActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderColor: '#E8C547',
  },
  sortBtnText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  sortBtnTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },

  /* Database table listing cards style sheet */
  tableContainer: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  tableOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'space-between',
  },
  orderLeftMeta: {
    width: 75,
  },
  tableOrderId: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#E8C547',
  },
  tableOrderDate: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  orderMiddleMeta: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tableCustomerName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tableItemsCount: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },
  orderRightMeta: {
    alignItems: 'flex-end',
    width: 80,
  },
  tableTotal: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9,
    fontWeight: '700',
  },

  /* Pagination */
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  pageBtnDisabled: {
    opacity: 0.35,
  },
  pageIndicator: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Detailed modal sheets styles */
  detailsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsModalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  detailsTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  modalScroll: {
    padding: 16,
  },
  receiptSectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#E8C547',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  receiptBox: {
    backgroundColor: '#141414',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginBottom: 14,
  },
  receiptText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  receiptItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  receiptItemQty: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E8C547',
    width: 22,
  },
  receiptItemName: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#FFFFFF',
    flex: 1,
  },
  receiptItemPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  receiptSumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  receiptSumLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  receiptSumValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 8,
  },
  receiptSumGrand: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  receiptSumGrandVal: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#E8C547',
  },

  /* Timeline */
  timelineContainer: {
    paddingLeft: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingLeft: 14,
    position: 'relative',
  },
  timelineDotActive: {
    position: 'absolute',
    left: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8C547',
  },
  timelineDotError: {
    position: 'absolute',
    left: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  timelineText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  timelineTextError: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
  },
});

