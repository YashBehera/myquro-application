import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 160;

type TimeRange = '7d' | '30d' | '90d' | 'ytd';

interface ChartBarData {
  day: string;
  date: string;
  revenue: number;
  orders: number;
}

const WEEKLY_DATA: ChartBarData[] = [
  { day: 'Mon', date: '11 Aug', revenue: 16400, orders: 84 },
  { day: 'Tue', date: '12 Aug', revenue: 14800, orders: 76 },
  { day: 'Wed', date: '13 Aug', revenue: 18200, orders: 92 },
  { day: 'Thu', date: '14 Aug', revenue: 19600, orders: 98 },
  { day: 'Fri', date: '15 Aug', revenue: 26400, orders: 136 },
  { day: 'Sat', date: '16 Aug', revenue: 31200, orders: 158 },
  { day: 'Sun', date: '17 Aug', revenue: 28200, orders: 142 },
];

const TOP_DISHES = [
  {
    id: 'dish_1',
    rank: 1,
    name: 'Special Chicken Dum Biryani',
    isVeg: false,
    category: 'Biryani & Rice',
    orders: 342,
    revenue: 95760,
    portion: '38% of sales',
  },
  {
    id: 'dish_2',
    rank: 2,
    name: 'Paneer Butter Masala Combo',
    isVeg: true,
    category: 'Main Course',
    orders: 218,
    revenue: 52320,
    portion: '21% of sales',
  },
  {
    id: 'dish_3',
    rank: 3,
    name: 'Crispy Dragon Chilli Chicken',
    isVeg: false,
    category: 'Starters',
    orders: 174,
    revenue: 38280,
    portion: '15% of sales',
  },
  {
    id: 'dish_4',
    rank: 4,
    name: 'Butter Garlic Naan (2 Pcs)',
    isVeg: true,
    category: 'Breads',
    orders: 290,
    revenue: 23200,
    portion: '9% of sales',
  },
  {
    id: 'dish_5',
    rank: 5,
    name: 'Gulab Jamun with Rabdi (2 Pcs)',
    isVeg: true,
    category: 'Desserts',
    orders: 146,
    revenue: 14600,
    portion: '6% of sales',
  },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number>(5); // Default to Saturday (Peak)

  const activeBar = WEEKLY_DATA[selectedBarIndex];
  const maxRevenue = Math.max(...WEEKLY_DATA.map(d => d.revenue));

  const totalWeeklyRevenue = WEEKLY_DATA.reduce((acc, d) => acc + d.revenue, 0);
  const totalWeeklyOrders = WEEKLY_DATA.reduce((acc, d) => acc + d.orders, 0);
  const avgOrderValue = Math.round(totalWeeklyRevenue / totalWeeklyOrders);

  const handleShareReport = async () => {
    try {
      await Share.share({
        title: 'MyQuro_Sales_Analytics_Report',
        message: `MyQuro Restaurant Performance Report\nStore: Biryani Box & Co.\nTotal Revenue: ₹${totalWeeklyRevenue.toLocaleString('en-IN')}\nOrders Delivered: ${totalWeeklyOrders}\nAverage Order Value: ₹${avgOrderValue}\nTop Dish: Special Chicken Dum Biryani (342 orders)`,
      });
    } catch (_) {
      Alert.alert('Report Exported', 'Sales analytics report has been generated.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" translucent />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* TOP HEADER */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color="#E8C547" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle}>Business Analytics</Text>
            <Text style={styles.headerSubtitle}>Sales, Order Velocity & Menu Insights</Text>
          </View>

          <TouchableOpacity
            onPress={handleShareReport}
            style={styles.exportReportBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={17} color="#0B0B0B" style={{ marginRight: 4 }} />
            <Text style={styles.exportReportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: Math.max(insets.bottom, 20) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. TIME RANGE FILTER TABS */}
          <View style={styles.timeRangeContainer}>
            {[
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: '90 Days' },
              { id: 'ytd', label: 'This Year' },
            ].map(item => {
              const isSelected = timeRange === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setTimeRange(item.id as TimeRange)}
                  style={[styles.rangeTab, isSelected && styles.rangeTabActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rangeTabText, isSelected && styles.rangeTabTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. 4-GRID KEY PERFORMANCE METRIC CARDS */}
          <View style={styles.kpiGrid}>
            {/* Card 1: Total Revenue */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconRow}>
                <View style={styles.kpiIconBadge}>
                  <Ionicons name="wallet-outline" size={18} color="#E8C547" />
                </View>
                <View style={styles.trendPillGreen}>
                  <Ionicons name="arrow-up" size={10} color="#22C55E" />
                  <Text style={styles.trendTextGreen}>+14.2%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <Text style={styles.kpiValue}>
                ₹{totalWeeklyRevenue.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Card 2: Total Orders */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconRow}>
                <View style={styles.kpiIconBadge}>
                  <Ionicons name="bag-handle-outline" size={18} color="#E8C547" />
                </View>
                <View style={styles.trendPillGreen}>
                  <Ionicons name="arrow-up" size={10} color="#22C55E" />
                  <Text style={styles.trendTextGreen}>+8.5%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Orders Delivered</Text>
              <Text style={styles.kpiValue}>{totalWeeklyOrders}</Text>
            </View>

            {/* Card 3: Average Order Value */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconRow}>
                <View style={styles.kpiIconBadge}>
                  <Ionicons name="receipt-outline" size={18} color="#E8C547" />
                </View>
                <View style={styles.trendPillGreen}>
                  <Ionicons name="arrow-up" size={10} color="#22C55E" />
                  <Text style={styles.trendTextGreen}>+4.1%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Avg Order Value</Text>
              <Text style={styles.kpiValue}>₹{avgOrderValue}</Text>
            </View>

            {/* Card 4: Kitchen Prep Time */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiIconRow}>
                <View style={styles.kpiIconBadge}>
                  <Ionicons name="stopwatch-outline" size={18} color="#E8C547" />
                </View>
                <View style={styles.trendPillGreen}>
                  <Ionicons name="flash" size={10} color="#22C55E" />
                  <Text style={styles.trendTextGreen}>-2m faster</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Avg Kitchen Prep</Text>
              <Text style={styles.kpiValue}>14m 10s</Text>
            </View>
          </View>

          {/* 3. REVENUE TREND BAR CHART */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <View>
                <Text style={styles.chartTitle}>Revenue Trend</Text>
                <Text style={styles.chartSubtitle}>Tap on any bar to inspect daily breakdown</Text>
              </View>

              {/* Selected Day Info Badge */}
              <View style={styles.selectedDayBadge}>
                <Text style={styles.selectedDayText}>
                  {activeBar.day}, {activeBar.date}: <Text style={styles.selectedDayAmount}>₹{activeBar.revenue.toLocaleString('en-IN')}</Text>
                </Text>
              </View>
            </View>

            {/* Interactive SVG Bar Chart */}
            <View style={styles.svgChartWrapper}>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                {/* Horizontal Grid lines */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                  const y = CHART_HEIGHT - ratio * (CHART_HEIGHT - 35) - 20;
                  return (
                    <Line
                      key={idx}
                      x1={0}
                      y1={y}
                      x2={CHART_WIDTH}
                      y2={y}
                      stroke="#2A2A2A"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Bars */}
                {WEEKLY_DATA.map((item, index) => {
                  const barCount = WEEKLY_DATA.length;
                  const slotWidth = CHART_WIDTH / barCount;
                  const barWidth = 24;
                  const x = index * slotWidth + (slotWidth - barWidth) / 2;
                  
                  const availableHeight = CHART_HEIGHT - 45;
                  const barHeight = Math.max(12, (item.revenue / maxRevenue) * availableHeight);
                  const y = CHART_HEIGHT - barHeight - 22;
                  const isSelected = selectedBarIndex === index;

                  return (
                    <G key={item.day} onPress={() => setSelectedBarIndex(index)}>
                      {/* Interactive Bar */}
                      <Rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx={6}
                        fill={isSelected ? '#E8C547' : '#262626'}
                      />

                      {/* Day Label */}
                      <SvgText
                        x={x + barWidth / 2}
                        y={CHART_HEIGHT - 4}
                        fontSize="11"
                        fontWeight={isSelected ? '700' : '400'}
                        fontFamily="Urbanist-SemiBold"
                        fill={isSelected ? '#E8C547' : '#8E8E8E'}
                        textAnchor="middle"
                      >
                        {item.day}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>

            {/* Active Day Detail Footer */}
            <View style={styles.chartDetailFooter}>
              <View style={styles.chartFooterCol}>
                <Text style={styles.chartFooterLabel}>Date</Text>
                <Text style={styles.chartFooterValue}>{activeBar.day}, {activeBar.date}</Text>
              </View>
              <View style={styles.chartFooterDivider} />
              <View style={styles.chartFooterCol}>
                <Text style={styles.chartFooterLabel}>Total Orders</Text>
                <Text style={styles.chartFooterValue}>{activeBar.orders} orders</Text>
              </View>
              <View style={styles.chartFooterDivider} />
              <View style={styles.chartFooterCol}>
                <Text style={styles.chartFooterLabel}>Day Revenue</Text>
                <Text style={[styles.chartFooterValue, { color: '#E8C547' }]}>
                  ₹{activeBar.revenue.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. HOURLY RUSH HOURS HEATMAP */}
          <View style={styles.rushCard}>
            <View style={styles.rushHeaderRow}>
              <View style={styles.rushIconBadge}>
                <Ionicons name="flame" size={18} color="#E8C547" />
              </View>
              <View>
                <Text style={styles.rushTitle}>Order Volume by Time of Day</Text>
                <Text style={styles.rushSubtitle}>Peak order slots for staff preparation</Text>
              </View>
            </View>

            {/* Slot 1: Lunch Rush */}
            <View style={styles.rushSlotRow}>
              <View style={styles.rushSlotHeader}>
                <Text style={styles.rushSlotName}>Lunch Peak (12:00 PM – 03:30 PM)</Text>
                <Text style={styles.rushSlotPercent}>44% of orders (282 orders)</Text>
              </View>
              <View style={styles.rushProgressBarBg}>
                <View style={[styles.rushProgressBarFill, { width: '88%', backgroundColor: '#E8C547' }]} />
              </View>
            </View>

            {/* Slot 2: Dinner Rush */}
            <View style={styles.rushSlotRow}>
              <View style={styles.rushSlotHeader}>
                <Text style={styles.rushSlotName}>Dinner Rush (07:00 PM – 11:30 PM)</Text>
                <Text style={styles.rushSlotPercent}>48% of orders (308 orders)</Text>
              </View>
              <View style={styles.rushProgressBarBg}>
                <View style={[styles.rushProgressBarFill, { width: '96%', backgroundColor: '#E8C547' }]} />
              </View>
            </View>

            {/* Slot 3: Evening Snacks */}
            <View style={styles.rushSlotRow}>
              <View style={styles.rushSlotHeader}>
                <Text style={styles.rushSlotName}>Evening Tea & Snacks (04:00 PM – 06:30 PM)</Text>
                <Text style={styles.rushSlotPercent}>8% of orders (52 orders)</Text>
              </View>
              <View style={styles.rushProgressBarBg}>
                <View style={[styles.rushProgressBarFill, { width: '16%', backgroundColor: '#8E8E8E' }]} />
              </View>
            </View>
          </View>

          {/* 5. TOP PERFORMING DISHES RANKING */}
          <View style={styles.dishesCard}>
            <View style={styles.dishesHeaderRow}>
              <Text style={styles.dishesTitle}>Top 5 Bestselling Dishes</Text>
              <TouchableOpacity
                onPress={() => router.push('/menu-management' as any)}
                style={styles.manageMenuLink}
              >
                <Text style={styles.manageMenuLinkText}>Edit Menu</Text>
                <Ionicons name="chevron-forward" size={14} color="#E8C547" />
              </TouchableOpacity>
            </View>

            {TOP_DISHES.map((dish, index) => {
              const isLast = index === TOP_DISHES.length - 1;
              return (
                <View key={dish.id}>
                  <View style={styles.dishRow}>
                    {/* Rank Circle */}
                    <View style={[styles.rankCircle, dish.rank === 1 && styles.rankCircleGold]}>
                      <Text style={[styles.rankText, dish.rank === 1 && styles.rankTextGold]}>
                        #{dish.rank}
                      </Text>
                    </View>

                    {/* Dish Info */}
                    <View style={styles.dishInfoCol}>
                      <View style={styles.dishNameRow}>
                        {/* Veg / Non-Veg Icon */}
                        <View style={[styles.vegBadge, dish.isVeg ? styles.vegBorder : styles.nonVegBorder]}>
                          <View style={[styles.vegDot, dish.isVeg ? styles.vegDotColor : styles.nonVegDotColor]} />
                        </View>
                        <Text style={styles.dishNameText} numberOfLines={1}>
                          {dish.name}
                        </Text>
                      </View>
                      <Text style={styles.dishCategoryText}>
                        {dish.category} • {dish.portion}
                      </Text>
                    </View>

                    {/* Orders & Revenue */}
                    <View style={styles.dishRevenueCol}>
                      <Text style={styles.dishRevenueText}>
                        ₹{dish.revenue.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.dishOrdersText}>{dish.orders} ordered</Text>
                    </View>
                  </View>
                  {!isLast && <View style={styles.dishDivider} />}
                </View>
              );
            })}
          </View>

          {/* 6. CUSTOMER SATISFACTION & LOYALTY CARD */}
          <View style={styles.loyaltyCard}>
            <Text style={styles.loyaltyTitle}>Customer Loyalty & Fulfillment</Text>

            <View style={styles.loyaltyRow}>
              {/* Left: Repeat vs New Customers */}
              <View style={styles.loyaltyCol}>
                <View style={styles.loyaltyMetricHeader}>
                  <Text style={styles.loyaltyLabel}>Repeat Diners</Text>
                  <Text style={styles.loyaltyValueGold}>64%</Text>
                </View>
                <View style={styles.loyaltyBarBg}>
                  <View style={[styles.loyaltyBarFill, { width: '64%' }]} />
                </View>
                <Text style={styles.loyaltySubtext}>36% new customers acquired</Text>
              </View>

              <View style={styles.loyaltyDivider} />

              {/* Right: Order Success Rate */}
              <View style={styles.loyaltyCol}>
                <View style={styles.loyaltyMetricHeader}>
                  <Text style={styles.loyaltyLabel}>Fulfillment Rate</Text>
                  <Text style={[styles.loyaltyValueGold, { color: '#22C55E' }]}>99.2%</Text>
                </View>
                <View style={styles.loyaltyBarBg}>
                  <View style={[styles.loyaltyBarFill, { width: '99.2%', backgroundColor: '#22C55E' }]} />
                </View>
                <Text style={styles.loyaltySubtext}>Only 0.8% cancellation rate</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#191919',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginTop: 1,
  },
  exportReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  exportReportBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#0B0B0B',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* Time Range Filter */
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#191919',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 14,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
  },
  rangeTabActive: {
    backgroundColor: '#E8C547',
  },
  rangeTabText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12,
    color: '#8E8E8E',
  },
  rangeTabTextActive: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  /* 4-KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: (width - 42) / 2,
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
  },
  kpiIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kpiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendTextGreen: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5,
    color: '#22C55E',
    marginLeft: 2,
  },
  kpiLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginBottom: 2,
  },
  kpiValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  /* Revenue Chart Card */
  chartCard: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 14,
  },
  chartHeaderRow: {
    marginBottom: 14,
  },
  chartTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  chartSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginTop: 2,
  },
  selectedDayBadge: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  selectedDayText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11.5,
    color: '#8E8E8E',
  },
  selectedDayAmount: {
    fontFamily: 'Urbanist-Bold',
    color: '#E8C547',
  },
  svgChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  chartDetailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  chartFooterCol: {
    flex: 1,
    alignItems: 'center',
  },
  chartFooterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#2A2A2A',
  },
  chartFooterLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#8E8E8E',
    marginBottom: 1,
  },
  chartFooterValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Rush Hours Heatmap */
  rushCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 14,
  },
  rushHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rushIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rushTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  rushSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginTop: 1,
  },
  rushSlotRow: {
    marginBottom: 12,
  },
  rushSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rushSlotName: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  rushSlotPercent: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
  },
  rushProgressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#141414',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rushProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Dishes Ranking Card */
  dishesCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 14,
  },
  dishesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dishesTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  manageMenuLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageMenuLinkText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#E8C547',
    marginRight: 2,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rankCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankCircleGold: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  rankText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#8E8E8E',
  },
  rankTextGold: {
    color: '#0B0B0B',
  },
  dishInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  dishNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  vegBadge: {
    width: 13,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  vegBorder: {
    borderColor: '#22C55E',
  },
  nonVegBorder: {
    borderColor: '#EF4444',
  },
  vegDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  vegDotColor: {
    backgroundColor: '#22C55E',
  },
  nonVegDotColor: {
    backgroundColor: '#EF4444',
  },
  dishNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  dishCategoryText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
  },
  dishRevenueCol: {
    alignItems: 'flex-end',
  },
  dishRevenueText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#E8C547',
  },
  dishOrdersText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#8E8E8E',
    marginTop: 1,
  },
  dishDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 4,
  },

  /* Customer Loyalty Card */
  loyaltyCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
  },
  loyaltyTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 14,
  },
  loyaltyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  loyaltyCol: {
    flex: 1,
  },
  loyaltyDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 14,
  },
  loyaltyMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  loyaltyLabel: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12,
    color: '#8E8E8E',
  },
  loyaltyValueGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#E8C547',
  },
  loyaltyBarBg: {
    width: '100%',
    height: 5,
    backgroundColor: '#141414',
    borderRadius: 2.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  loyaltyBarFill: {
    height: '100%',
    backgroundColor: '#E8C547',
    borderRadius: 2.5,
  },
  loyaltySubtext: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#8E8E8E',
  },
});
