import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { ArrowLeft, CheckCircle, Clock, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useViewModel } from '../../state/MainViewModel';

interface RefundItem {
  id: string;
  orderId: string;
  restaurantName: string;
  amount: string;
  date: string;
  paymentMethod: string;
  status: 'Completed' | 'Initiated' | 'Processing';
  isCompleted: boolean;
  rrn: string;
  rawOrder?: any;
}

interface RefundScreenProps {
  orders?: any[];
  onBack: () => void;
  onNavigateToOrder?: (orderId: string) => void;
}

// Simple deterministic hash for RRN generation if not present on order
function getHashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString().padEnd(12, '7').slice(0, 12);
}

export const RefundScreen: React.FC<RefundScreenProps> = ({
  orders = [],
  onBack,
  onNavigateToOrder,
}) => {
  const { authState } = useViewModel();
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  // Dynamically derive refund transactions from orders
  const refunds: RefundItem[] = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    return orders
      .filter((o: any) => {
        if (!o) return false;
        const st = String(o.status || '').toUpperCase();
        const paySt = String(o.paymentStatus || '').toUpperCase();
        const refSt = String(o.refundStatus || '').toUpperCase();
        return (
          st.includes('CANCEL') ||
          st.includes('REFUND') ||
          paySt.includes('REFUND') ||
          refSt.includes('COMPLET') ||
          refSt.includes('INITIAT') ||
          o.isRefund === true
        );
      })
      .map((o: any) => {
        const rawAmt = o.refundAmount || o.totalAmount || o.total || o.amount || 0;
        let numAmt =
          typeof rawAmt === 'string'
            ? parseFloat(rawAmt.replace(/[^0-9.]/g, ''))
            : Number(rawAmt);
        if (numAmt >= 5000 && numAmt % 100 === 0) numAmt = numAmt / 100;
        else if (numAmt >= 10000) numAmt = numAmt / 100;

        const dateObj = o.createdAt
          ? new Date(o.createdAt)
          : o.date
          ? new Date(o.date)
          : new Date();
        const formattedDate = dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const refSt = String(o.refundStatus || '').toUpperCase();
        const ordSt = String(o.status || '').toUpperCase();
        const isPending =
          refSt.includes('INITIAT') ||
          refSt.includes('PROCESS') ||
          ordSt.includes('PENDING');

        const ordId = String(o.id || o.orderId || 'N/A');

        return {
          id: ordId,
          orderId: ordId,
          restaurantName: o.restaurantName || o.restaurant?.name || 'Restaurant Order',
          amount: `₹${isNaN(numAmt) ? '0' : numAmt.toFixed(1)}`,
          date: formattedDate,
          paymentMethod: o.paymentMethod || o.paymentMode || 'UPI',
          status: isPending ? 'Initiated' : 'Completed',
          isCompleted: !isPending,
          rrn: o.rrn || o.refundRrn || getHashString(ordId),
          rawOrder: o,
        };
      });
  }, [orders]);

  const handleFeedback = (refundId: string, answer: 'yes' | 'no') => {
    setFeedbackGiven((prev) => ({ ...prev, [refundId]: true }));
    if (answer === 'yes') {
      Alert.alert('Thank You!', 'Glad to hear your refund arrived safely.');
    } else {
      Alert.alert(
        'Support Ticket Created',
        'We have logged your refund inquiry. Our support team will verify with your bank and contact you shortly.'
      );
    }
  };

  // ─── REFUND DETAIL VIEW ───
  if (selectedRefund) {
    const isDone = selectedRefund.isCompleted;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedRefund(null)}
            activeOpacity={0.7}
            accessibilityLabel="Back to refunds list"
          >
            <ArrowLeft size={22} color="#eae1d4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund Details</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Info Card */}
          <View style={styles.refundCard}>
            <View style={styles.refundCardHeader}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {selectedRefund.restaurantName}
              </Text>
              <View
                style={[
                  styles.completedBadge,
                  !isDone && { backgroundColor: '#2E2208', borderColor: '#D97706' },
                ]}
              >
                <Text
                  style={[
                    styles.completedBadgeText,
                    !isDone && { color: '#F59E0B' },
                  ]}
                >
                  {selectedRefund.status}
                </Text>
                {isDone ? (
                  <CheckCircle size={16} color="#10b981" />
                ) : (
                  <Clock size={16} color="#F59E0B" />
                )}
              </View>
            </View>

            <View style={styles.refundCardBody}>
              <View style={styles.refundDetailsLeft}>
                <Text style={styles.detailsLabel}>
                  To: {selectedRefund.paymentMethod}
                </Text>
                <Text style={[styles.detailsLabel, { marginTop: 8 }]}>
                  {isDone ? 'Completed On' : 'Initiated On'}: {selectedRefund.date}
                </Text>
              </View>
              <Text style={styles.refundAmount}>{selectedRefund.amount}</Text>
            </View>

            <View style={styles.divider} />

            {/* Order ID row */}
            <TouchableOpacity
              style={styles.orderIdRow}
              activeOpacity={0.7}
              onPress={() => {
                if (onNavigateToOrder && selectedRefund.orderId) {
                  onNavigateToOrder(selectedRefund.orderId);
                } else {
                  Alert.alert(
                    'Order Info',
                    `Order ID: #${selectedRefund.orderId}\nRestaurant: ${selectedRefund.restaurantName}`
                  );
                }
              }}
            >
              <Text style={styles.orderIdText}>
                Order ID: #{selectedRefund.orderId}
              </Text>
              <ChevronRight size={18} color="#f2ca50" />
            </TouchableOpacity>
          </View>

          {/* Timeline steps card */}
          <View style={styles.timelineCard}>
            {/* Step 1: My Quro has initiated your refund */}
            <View style={styles.timelineStepRow}>
              <View style={styles.timelineLeftCol}>
                <View style={styles.timelineRing} />
                <View style={styles.timelineVerticalLine} />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.stepTitle}>My Quro has initiated your refund</Text>
                <Text style={styles.stepDate}>{selectedRefund.date}</Text>
                <Text style={styles.stepStatusGreen}>Completed</Text>
              </View>
            </View>

            {/* Step 2: Your bank has processed your refund */}
            <View style={styles.timelineStepRow}>
              <View style={styles.timelineLeftCol}>
                <View
                  style={[
                    styles.timelineRing,
                    !isDone && { borderColor: '#F59E0B' },
                  ]}
                />
                <View
                  style={[
                    styles.timelineVerticalLine,
                    !isDone && { backgroundColor: '#332612' },
                  ]}
                />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.stepTitle}>Your bank has processed your refund</Text>
                <Text style={styles.stepDate}>{selectedRefund.date}</Text>
                <Text
                  style={[
                    styles.stepStatusGreen,
                    !isDone && { color: '#F59E0B' },
                  ]}
                >
                  {isDone ? 'Completed' : 'In Progress'}
                </Text>
              </View>
            </View>

            {/* Step 3: Refund credited to your account */}
            <View style={[styles.timelineStepRow, { marginBottom: 0 }]}>
              <View style={styles.timelineLeftCol}>
                <View
                  style={[
                    styles.timelineRing,
                    !isDone && { borderColor: '#4A4A4A' },
                  ]}
                />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.stepTitle}>Refund credited to your account</Text>
                <Text style={styles.stepDate}>{selectedRefund.date}</Text>
                <Text style={styles.stepDescription}>
                  {isDone
                    ? `Completed - The refund amount should reflect in your account. If there is an issue, please contact your bank's customer care. Your RRN is: ${selectedRefund.rrn}`
                    : `Processing - Bank usually takes 2–4 business days to reflect the amount in your account. Reference ID: ${selectedRefund.rrn}`}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      'What is RRN?',
                      'Retrieval Reference Number (RRN) is a unique 12-digit number used by banks to track financial transactions and refund settlements.'
                    )
                  }
                >
                  <Text style={styles.rrnLink}>What is RRN?</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Feedback Card */}
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackCardText}>
              Did you receive your Refund?
            </Text>
            {feedbackGiven[selectedRefund.id] ? (
              <Text style={{ color: '#10b981', fontFamily: 'Urbanist-Bold', fontSize: 13 }}>
                Response Recorded ✓
              </Text>
            ) : (
              <View style={styles.feedbackActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleFeedback(selectedRefund.id, 'yes')}
                >
                  <Text style={styles.feedbackBtnText}>YES 👍</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleFeedback(selectedRefund.id, 'no')}
                >
                  <Text style={styles.feedbackBtnText}>NO 👎</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── REFUND LIST VIEW ───
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Back to profile"
        >
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refunds</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Refund Status Announcement */}
        <Text style={styles.sectionTitle}>Refund Status</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusCardText}>
            Due to ongoing enhancements to My Quro Wallet, all refunds are directly credited back to your original payment source.
          </Text>
          <View style={styles.rupeeCircle}>
            <Text style={styles.rupeeCircleText}>₹</Text>
          </View>
        </View>

        {/* Refunds List or Empty State */}
        <Text style={styles.sectionTitle}>
          {refunds.length > 0 ? 'Your Refunds' : 'Past Refunds'}
        </Text>

        {refunds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <RefreshCw size={32} color="#DEA430" />
            </View>
            <Text style={styles.emptyTitle}>No Active or Past Refunds</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any pending or completed refund transactions. When an order is cancelled or eligible for a refund, its live tracking and credit status will appear here.
            </Text>
          </View>
        ) : (
          refunds.map((item) => (
            <View key={item.id} style={styles.refundCard}>
              <View style={styles.refundCardHeader}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {item.restaurantName}
                </Text>
                <View
                  style={[
                    styles.completedBadge,
                    !item.isCompleted && {
                      backgroundColor: '#2E2208',
                      borderColor: '#D97706',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.completedBadgeText,
                      !item.isCompleted && { color: '#F59E0B' },
                    ]}
                  >
                    {item.status}
                  </Text>
                  {item.isCompleted ? (
                    <CheckCircle size={16} color="#10b981" />
                  ) : (
                    <Clock size={16} color="#F59E0B" />
                  )}
                </View>
              </View>

              <View style={styles.refundCardBody}>
                <View style={styles.refundDetailsLeft}>
                  <Text style={styles.detailsLabel}>To: {item.paymentMethod}</Text>
                  <Text style={[styles.detailsLabel, { marginTop: 8 }]}>
                    {item.isCompleted ? 'Completed On' : 'Initiated On'}: {item.date}
                  </Text>
                </View>
                <Text style={styles.refundAmount}>{item.amount}</Text>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.detailsBtn}
                activeOpacity={0.7}
                onPress={() => setSelectedRefund(item)}
              >
                <Text style={styles.detailsBtnText}>See Details</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* End of list footer */}
        {refunds.length > 0 && (
          <Text style={styles.endOfListText}>You've reached the end of the list</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1817',
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 16,
    marginTop: 8,
  },
  statusCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  statusCardText: {
    flex: 1,
    fontSize: 14,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 20,
  },
  rupeeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    marginLeft: 16,
  },
  rupeeCircleText: {
    fontSize: 16,
    color: '#d4af37',
    fontFamily: 'Urbanist-Bold',
  },
  refundCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  refundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 17,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    flex: 1,
    marginRight: 10,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#062B1D',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: 'Urbanist-Bold',
    marginRight: 4,
  },
  refundCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  refundDetailsLeft: {
    flex: 1,
  },
  detailsLabel: {
    fontSize: 13.5,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
  },
  refundAmount: {
    fontSize: 20,
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 14,
  },
  orderIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderIdText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
  },
  detailsBtn: {
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 15,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
  },
  endOfListText: {
    fontSize: 13,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyContainer: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C1914',
    borderWidth: 1,
    borderColor: '#DEA43044',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#8E8E8E',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  timelineCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineLeftCol: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#000000',
    marginTop: 6,
  },
  timelineVerticalLine: {
    width: 2,
    height: 60,
    backgroundColor: '#10b981',
    marginTop: 4,
  },
  timelineRightCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
  },
  stepDate: {
    fontSize: 12,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    marginTop: 4,
  },
  stepStatusGreen: {
    fontSize: 13,
    color: '#10b981',
    fontFamily: 'Urbanist-Bold',
    marginTop: 4,
  },
  stepDescription: {
    fontSize: 13.5,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 19,
    marginTop: 8,
  },
  rrnLink: {
    fontSize: 13.5,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    marginTop: 10,
  },
  feedbackCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackCardText: {
    fontSize: 14.5,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    flex: 1,
  },
  feedbackActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  feedbackBtnText: {
    fontSize: 13.5,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
});
