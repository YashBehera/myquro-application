import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type PeriodFilter = 'this_week' | 'last_week' | 'this_month' | 'last_month';
type TabType = 'all' | 'settled' | 'processing';

interface SettlementItem {
  id: string;
  payoutId: string;
  period: string;
  payoutDate: string;
  orderCount: number;
  grossSales: number;
  customerDeliveryFee: number;
  discountsSubsidized: number;
  commissionRate: number;
  commissionAmount: number;
  gstOnCommission: number;
  tcsDeduction: number;
  netPayout: number;
  status: 'settled' | 'processing' | 'on_hold';
  utrNumber?: string;
  bankName: string;
  accountLast4: string;
}

const MOCK_SETTLEMENTS: SettlementItem[] = [
  {
    id: 'set_1',
    payoutId: 'MQ-PAY-20260817-9102',
    period: '11 Aug 2026 – 17 Aug 2026',
    payoutDate: '18 Aug 2026, 09:30 AM',
    orderCount: 142,
    grossSales: 58400,
    customerDeliveryFee: 4260,
    discountsSubsidized: 1800,
    commissionRate: 15,
    commissionAmount: 8760,
    gstOnCommission: 1576.8,
    tcsDeduction: 584,
    netPayout: 49279.2,
    status: 'settled',
    utrNumber: 'HDFCR5202608189874102',
    bankName: 'HDFC Bank',
    accountLast4: '4821',
  },
  {
    id: 'set_2',
    payoutId: 'MQ-PAY-20260824-9481',
    period: '18 Aug 2026 – 24 Aug 2026',
    payoutDate: 'Expected 25 Aug 2026',
    orderCount: 98,
    grossSales: 41250,
    customerDeliveryFee: 2940,
    discountsSubsidized: 1200,
    commissionRate: 15,
    commissionAmount: 6187.5,
    gstOnCommission: 1113.75,
    tcsDeduction: 412.5,
    netPayout: 34736.25,
    status: 'processing',
    bankName: 'HDFC Bank',
    accountLast4: '4821',
  },
  {
    id: 'set_3',
    payoutId: 'MQ-PAY-20260810-8714',
    period: '04 Aug 2026 – 10 Aug 2026',
    payoutDate: '11 Aug 2026, 10:15 AM',
    orderCount: 168,
    grossSales: 72800,
    customerDeliveryFee: 5040,
    discountsSubsidized: 2400,
    commissionRate: 15,
    commissionAmount: 10920,
    gstOnCommission: 1965.6,
    tcsDeduction: 728,
    netPayout: 61586.4,
    status: 'settled',
    utrNumber: 'HDFCR5202608110943811',
    bankName: 'HDFC Bank',
    accountLast4: '4821',
  },
  {
    id: 'set_4',
    payoutId: 'MQ-PAY-20260803-7629',
    period: '28 Jul 2026 – 03 Aug 2026',
    payoutDate: '04 Aug 2026, 09:45 AM',
    orderCount: 155,
    grossSales: 64900,
    customerDeliveryFee: 4650,
    discountsSubsidized: 1950,
    commissionRate: 15,
    commissionAmount: 9735,
    gstOnCommission: 1752.3,
    tcsDeduction: 649,
    netPayout: 54713.7,
    status: 'settled',
    utrNumber: 'HDFCR5202608047712390',
    bankName: 'HDFC Bank',
    accountLast4: '4821',
  },
];

export default function FinanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<PeriodFilter>('this_month');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [expandedId, setExpandedId] = useState<string | null>('set_2');
  const [isStatementModalVisible, setIsStatementModalVisible] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const filteredSettlements = MOCK_SETTLEMENTS.filter(item => {
    if (activeTab === 'settled') return item.status === 'settled';
    if (activeTab === 'processing') return item.status === 'processing';
    return true;
  });

  const totalEarningsMonth = MOCK_SETTLEMENTS.reduce((acc, cur) => acc + cur.netPayout, 0);
  const nextPayoutItem = MOCK_SETTLEMENTS.find(item => item.status === 'processing');

  const handleDownloadStatement = async (format: 'pdf' | 'csv') => {
    setIsStatementModalVisible(false);
    try {
      await Share.share({
        title: `MyQuro_Settlement_Statement_${period}.${format}`,
        message: `MyQuro Restaurant Partner Settlement Statement for Biryani Box & Co. (ID: MQ-REST-4089)\nTotal Payout: ₹${totalEarningsMonth.toLocaleString('en-IN')}\nStatus: Verified`,
      });
    } catch (_) {
      Alert.alert('Statement Exported', `Your ${format.toUpperCase()} statement has been generated.`);
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
            <Text style={styles.headerTitle}>Finance & Settlements</Text>
            <Text style={styles.headerSubtitle}>Earnings, Commissions & Bank Payouts</Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsStatementModalVisible(true)}
            style={styles.statementButton}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color="#0B0B0B" style={{ marginRight: 4 }} />
            <Text style={styles.statementButtonText}>Statement</Text>
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
          {/* 1. PERIOD SELECTOR CHIPS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodChipsRow}
          >
            {[
              { id: 'this_week', label: 'This Week' },
              { id: 'last_week', label: 'Last Week' },
              { id: 'this_month', label: 'This Month (August)' },
              { id: 'last_month', label: 'Last Month (July)' },
            ].map(item => {
              const isSelected = period === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.periodChip, isSelected && styles.periodChipActive]}
                  onPress={() => setPeriod(item.id as PeriodFilter)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.periodChipText, isSelected && styles.periodChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 2. HERO OVERVIEW CARD */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>Total Net Settlements</Text>
                <Text style={styles.heroAmount}>
                  ₹{totalEarningsMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={styles.growthBadge}>
                <Ionicons name="trending-up" size={14} color="#22C55E" style={{ marginRight: 3 }} />
                <Text style={styles.growthText}>+18.4% vs last mo</Text>
              </View>
            </View>

            {/* Next Payout Highlight Banner */}
            {nextPayoutItem && (
              <View style={styles.nextPayoutBanner}>
                <View style={styles.nextPayoutLeft}>
                  <View style={styles.clockIconBadge}>
                    <Ionicons name="time" size={16} color="#E8C547" />
                  </View>
                  <View>
                    <Text style={styles.nextPayoutTitle}>Next Scheduled Payout</Text>
                    <Text style={styles.nextPayoutDate}>Monday, 25 Aug 2026 • In Processing</Text>
                  </View>
                </View>
                <Text style={styles.nextPayoutAmount}>
                  ₹{nextPayoutItem.netPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            )}

            {/* Summary Metrics 3-Col Row */}
            <View style={styles.summaryMetricsRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryColLabel}>Gross Sales</Text>
                <Text style={styles.summaryColValue}>₹2,37,350</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryColLabel}>Commission (15%)</Text>
                <Text style={[styles.summaryColValue, { color: '#EF4444' }]}>-₹35,602</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryColLabel}>Orders Delivered</Text>
                <Text style={styles.summaryColValue}>563</Text>
              </View>
            </View>
          </View>

          {/* 3. REGISTERED BANK ACCOUNT CARD */}
          <View style={styles.bankCard}>
            <View style={styles.bankCardHeader}>
              <View style={styles.bankIconCircle}>
                <Ionicons name="business" size={18} color="#E8C547" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.bankVerifiedRow}>
                  <Text style={styles.bankNameText}>HDFC Bank Primary Payout Account</Text>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#22C55E" style={{ marginRight: 3 }} />
                    <Text style={styles.verifiedPillText}>Verified</Text>
                  </View>
                </View>
                <Text style={styles.bankDetailsText}>
                  A/C: •••••••••••• 4821 • IFSC: HDFC0002419 • Auto-credit: Enabled
                </Text>
              </View>
            </View>
          </View>

          {/* 4. SETTLEMENT LEDGER SECTION */}
          <View style={styles.ledgerHeaderRow}>
            <Text style={styles.sectionTitle}>Settlement History</Text>
            
            {/* Filter Tabs */}
            <View style={styles.tabPillsContainer}>
              {(['all', 'settled', 'processing'] as TabType[]).map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SETTLEMENT CARDS LIST */}
          {filteredSettlements.map(item => {
            const isExpanded = expandedId === item.id;
            const isSettled = item.status === 'settled';

            return (
              <View key={item.id} style={styles.settlementCard}>
                {/* Header Clickable Row */}
                <TouchableOpacity
                  onPress={() => toggleExpand(item.id)}
                  style={styles.settlementCardHeader}
                  activeOpacity={0.85}
                >
                  <View style={styles.settlementCardLeft}>
                    <View style={[styles.statusIconCircle, isSettled ? styles.statusSettledBg : styles.statusProcessingBg]}>
                      <Ionicons
                        name={isSettled ? 'checkmark-circle' : 'hourglass-outline'}
                        size={20}
                        color={isSettled ? '#22C55E' : '#E8C547'}
                      />
                    </View>

                    <View>
                      <View style={styles.periodRow}>
                        <Text style={styles.settlementPeriod}>{item.period}</Text>
                        <View style={[styles.statusBadge, isSettled ? styles.badgeSettled : styles.badgeProcessing]}>
                          <Text style={[styles.statusBadgeText, isSettled ? styles.statusSettledText : styles.statusProcessingText]}>
                            {isSettled ? 'SETTLED' : 'PROCESSING'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.payoutSubtext}>
                        {item.orderCount} orders • {item.payoutDate}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.settlementCardRight}>
                    <Text style={styles.netPayoutAmount}>
                      ₹{item.netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#8E8E8E"
                    />
                  </View>
                </TouchableOpacity>

                {/* EXPANDABLE BREAKDOWN ACCORDION */}
                {isExpanded && (
                  <View style={styles.breakdownContainer}>
                    <View style={styles.breakdownDivider} />
                    
                    <Text style={styles.breakdownTitle}>Settlement Calculation Details</Text>

                    {/* Row 1: Gross Sales */}
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Gross Food Sales ({item.orderCount} items)</Text>
                      <Text style={styles.calcValue}>+₹{item.grossSales.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Row 2: Customer Delivery Charges */}
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Customer Delivery Collected</Text>
                      <Text style={styles.calcValue}>+₹{item.customerDeliveryFee.toLocaleString('en-IN')}</Text>
                    </View>

                    {/* Row 3: Platform Commission */}
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>MyQuro Commission ({item.commissionRate}%)</Text>
                      <Text style={[styles.calcValue, { color: '#EF4444' }]}>
                        -₹{item.commissionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {/* Row 4: GST on Commission */}
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>GST on Commission (18%)</Text>
                      <Text style={[styles.calcValue, { color: '#EF4444' }]}>
                        -₹{item.gstOnCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {/* Row 5: TCS Deduction */}
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>TCS / TDS u/s 194-O (1%)</Text>
                      <Text style={[styles.calcValue, { color: '#EF4444' }]}>
                        -₹{item.tcsDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {/* Row 6: Discounts Subsidized */}
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Merchant Promo Discounts</Text>
                      <Text style={[styles.calcValue, { color: '#EF4444' }]}>
                        -₹{item.discountsSubsidized.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <View style={styles.breakdownSubtotalDivider} />

                    {/* Total Net Transferred */}
                    <View style={styles.calcTotalRow}>
                      <Text style={styles.calcTotalLabel}>Net Bank Transfer</Text>
                      <Text style={styles.calcTotalValue}>
                        ₹{item.netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>

                    {/* UTR Reference Tag */}
                    {item.utrNumber && (
                      <View style={styles.utrBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.utrLabel}>Bank UTR Reference ID</Text>
                          <Text style={styles.utrValue}>{item.utrNumber}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => Alert.alert('Copied', `UTR ${item.utrNumber} copied to clipboard.`)}
                          style={styles.copyBtn}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="copy-outline" size={14} color="#E8C547" style={{ marginRight: 4 }} />
                          <Text style={styles.copyBtnText}>Copy</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* 5. PAYOUT CYCLE FAQ & HELP CARD */}
          <View style={styles.faqCard}>
            <View style={styles.faqHeaderRow}>
              <Ionicons name="information-circle" size={20} color="#E8C547" />
              <Text style={styles.faqHeaderTitle}>How MyQuro Settlements Work</Text>
            </View>
            <Text style={styles.faqBodyText}>
              • Settlement cycles run from <Text style={styles.faqBold}>Monday to Sunday</Text> every week.{'\n'}
              • Net payouts are automatically initiated every <Text style={styles.faqBold}>Monday at 09:00 AM</Text> directly to your registered bank account via NEFT/IMPS.{'\n'}
              • GST & TDS reports for your chartered accountant can be downloaded from the statement menu.
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/help-support' as any)}
              style={styles.financeSupportBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="headset-outline" size={16} color="#0B0B0B" style={{ marginRight: 6 }} />
              <Text style={styles.financeSupportText}>Need help with Payouts? Contact Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* 6. DOWNLOAD STATEMENT MODAL */}
        <Modal
          visible={isStatementModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsStatementModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.statementModalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Download Statement</Text>
                <TouchableOpacity onPress={() => setIsStatementModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#8E8E8E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Select the format to download detailed financial summaries and GST breakdown for {period.replace('_', ' ')}.
              </Text>

              {/* PDF Option */}
              <TouchableOpacity
                onPress={() => handleDownloadStatement('pdf')}
                style={styles.exportOptionCard}
                activeOpacity={0.85}
              >
                <View style={styles.exportIconBadge}>
                  <Ionicons name="document-text" size={22} color="#E8C547" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportTitle}>PDF Invoice & Statement</Text>
                  <Text style={styles.exportDesc}>Formatted statement with official seals for tax filing</Text>
                </View>
                <Ionicons name="download" size={18} color="#E8C547" />
              </TouchableOpacity>

              {/* CSV Option */}
              <TouchableOpacity
                onPress={() => handleDownloadStatement('csv')}
                style={styles.exportOptionCard}
                activeOpacity={0.85}
              >
                <View style={styles.exportIconBadge}>
                  <Ionicons name="grid" size={22} color="#E8C547" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exportTitle}>Excel / CSV Raw Data</Text>
                  <Text style={styles.exportDesc}>Order-by-order itemized breakdown for spreadsheet analysis</Text>
                </View>
                <Ionicons name="download" size={18} color="#E8C547" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsStatementModalVisible(false)}
                style={styles.cancelModalBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  statementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  statementButtonText: {
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

  /* Period Chips */
  periodChipsRow: {
    flexDirection: 'row',
    paddingBottom: 12,
    gap: 8,
  },
  periodChip: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  periodChipActive: {
    backgroundColor: '#E8C547',
    borderColor: '#E8C547',
  },
  periodChipText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12,
    color: '#8E8E8E',
  },
  periodChipTextActive: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroLabel: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#8E8E8E',
  },
  heroAmount: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  growthText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#22C55E',
  },
  nextPayoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  nextPayoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nextPayoutTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  nextPayoutDate: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#E8C547',
    marginTop: 1,
  },
  nextPayoutAmount: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#E8C547',
    marginLeft: 8,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A2A',
  },
  summaryColLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginBottom: 2,
  },
  summaryColValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* Bank Card */
  bankCard: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginBottom: 16,
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
    flex: 1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  verifiedPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    color: '#22C55E',
  },
  bankDetailsText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 2,
  },

  /* Ledger Section */
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  tabPillsContainer: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  tabPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  tabPillActive: {
    backgroundColor: '#E8C547',
  },
  tabPillText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11,
    color: '#8E8E8E',
  },
  tabPillTextActive: {
    color: '#0B0B0B',
    fontFamily: 'Urbanist-Bold',
  },

  /* Settlement Card */
  settlementCard: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 12,
    overflow: 'hidden',
  },
  settlementCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settlementCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusSettledBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusProcessingBg: {
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.3)',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementPeriod: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSettled: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  badgeProcessing: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
  },
  statusBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9.5,
  },
  statusSettledText: {
    color: '#22C55E',
  },
  statusProcessingText: {
    color: '#E8C547',
  },
  payoutSubtext: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 2,
  },
  settlementCardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  netPayoutAmount: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },

  /* Breakdown Accordion */
  breakdownContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: '#141414',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 12,
  },
  breakdownTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#8E8E8E',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  calcLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
  },
  calcValue: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  breakdownSubtotalDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 8,
  },
  calcTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    marginBottom: 10,
  },
  calcTotalLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  calcTotalValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#E8C547',
  },
  utrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#191919',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  utrLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#8E8E8E',
  },
  utrValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5,
    color: '#FFFFFF',
    marginTop: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#E8C547',
  },

  /* FAQ Card */
  faqCard: {
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginTop: 6,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  faqHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  faqBodyText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    lineHeight: 18,
    marginBottom: 12,
  },
  faqBold: {
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
  },
  financeSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 12,
    paddingVertical: 10,
  },
  financeSupportText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0B0B0B',
  },

  /* Statement Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  statementModalContent: {
    backgroundColor: '#191919',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    paddingBottom: 32,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#8E8E8E',
    lineHeight: 18,
    marginBottom: 16,
  },
  exportOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  exportIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exportTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  exportDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginTop: 2,
  },
  cancelModalBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  cancelModalBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#8E8E8E',
  },
});
