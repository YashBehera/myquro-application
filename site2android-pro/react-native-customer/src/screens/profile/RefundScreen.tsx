import React from 'react';
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
import { ArrowLeft, CheckCircle, ChevronRight } from 'lucide-react-native';

interface RefundScreenProps {
  onBack: () => void;
}

export const RefundScreen: React.FC<RefundScreenProps> = ({ onBack }) => {
  const [selectedRefund, setSelectedRefund] = React.useState<any>(null);

  // ─── REFUND DETAIL VIEW ───
  if (selectedRefund) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedRefund(null)} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#eae1d4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refund</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Top Info Card */}
          <View style={styles.refundCard}>
            <View style={styles.refundCardHeader}>
              <Text style={styles.restaurantName}>Chai Kings</Text>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>Completed</Text>
                <CheckCircle size={16} color="#10b981" />
              </View>
            </View>

            <View style={styles.refundCardBody}>
              <View style={styles.refundDetailsLeft}>
                <Text style={styles.detailsLabel}>To: UPI</Text>
                <Text style={[styles.detailsLabel, { marginTop: 8 }]}>Completed On: 23 Sep, 2025</Text>
              </View>
              <Text style={styles.refundAmount}>₹1226.0</Text>
            </View>

            <View style={styles.divider} />

            {/* Order ID row */}
            <TouchableOpacity 
              style={styles.orderIdRow}
              onPress={() => Alert.alert('Order Info', 'Navigating to Order #217592318773743 details...')}
            >
              <Text style={styles.orderIdText}>Order ID: #217592318773743</Text>
              <ChevronRight size={18} color="#f2ca50" />
            </TouchableOpacity>
          </View>

          {/* Timeline steps card */}
          <View style={styles.timelineCard}>
            {/* Step 1 */}
            <View style={styles.timelineStepRow}>
              <View style={styles.timelineLeftCol}>
                <View style={styles.timelineRing} />
                <View style={styles.timelineVerticalLine} />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.stepTitle}>My Quro has initiated your refund</Text>
                <Text style={styles.stepDate}>23 Sep, 2025</Text>
                <Text style={styles.stepStatusGreen}>Completed</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.timelineStepRow}>
              <View style={styles.timelineLeftCol}>
                <View style={styles.timelineRing} />
                <View style={styles.timelineVerticalLine} />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.stepTitle}>Your bank has processed your refund</Text>
                <Text style={styles.stepDate}>23 Sep, 2025</Text>
                <Text style={styles.stepStatusGreen}>Completed</Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={[styles.timelineStepRow, { marginBottom: 0 }]}>
              <View style={styles.timelineLeftCol}>
                <View style={styles.timelineRing} />
              </View>
              <View style={styles.timelineRightCol}>
                <Text style={styles.stepTitle}>Refund credited to your account</Text>
                <Text style={styles.stepDate}>23 Sep, 2025</Text>
                <Text style={styles.stepDescription}>
                  Completed - The refund amount should reflect in your account by now. If there is an issue, please contact your bank's customer care. Your RRN is: 723692242665
                </Text>
                <TouchableOpacity onPress={() => Alert.alert('What is RRN?', 'Retrieval Reference Number (RRN) is a unique 12-digit number used to track banking transactions with your bank.')}>
                  <Text style={styles.rrnLink}>What is RRN?</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Feedback Card */}
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackCardText}>Did you receive your Refund?</Text>
            <View style={styles.feedbackActionsRow}>
              <TouchableOpacity onPress={() => Alert.alert('Thank you!', 'Glad to hear your refund arrived safely.')}>
                <Text style={styles.feedbackBtnText}>YES 👍</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Support Ticket', 'We have logged your issue. A support agent will contact you shortly.')}>
                <Text style={styles.feedbackBtnText}>NO 👎</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Show Older Refunds Button */}
          <TouchableOpacity 
            style={styles.showOlderBtn}
            onPress={() => Alert.alert('Refund History', 'No older refund transactions found.')}
          >
            <Text style={styles.showOlderBtnText}>Show Older Refunds</Text>
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Content Area */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Refund Status */}
        <Text style={styles.sectionTitle}>Refund Status</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusCardText}>
            Due to some ongoing enhancements to My Quro Wallet, your refunds will be directed to the original payment source.
          </Text>
          <View style={styles.rupeeCircle}>
            <Text style={styles.rupeeCircleText}>₹</Text>
          </View>
        </View>

        {/* Completed Refunds */}
        <Text style={styles.sectionTitle}>Completed Refunds</Text>
        <View style={styles.refundCard}>
          <View style={styles.refundCardHeader}>
            <Text style={styles.restaurantName}>Chai Kings</Text>
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed</Text>
              <CheckCircle size={16} color="#10b981" />
            </View>
          </View>

          <View style={styles.refundCardBody}>
            <View style={styles.refundDetailsLeft}>
              <Text style={styles.detailsLabel}>To: UPI</Text>
              <Text style={[styles.detailsLabel, { marginTop: 8 }]}>Completed On: 23 Sep, 2025</Text>
            </View>
            <Text style={styles.refundAmount}>₹1226.0</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => setSelectedRefund({ id: 'r1' })}
          >
            <Text style={styles.detailsBtnText}>See Details</Text>
          </TouchableOpacity>
        </View>

        {/* End of list footer */}
        <Text style={styles.endOfListText}>You've reached the end of the list</Text>
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
    marginBottom: 24,
  },
  refundCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadgeText: {
    fontSize: 14,
    color: '#10b981',
    fontFamily: 'Urbanist-Bold',
    marginRight: 6,
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
    fontSize: 14,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
  },
  refundAmount: {
    fontSize: 22,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 16,
  },
  orderIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  orderIdText: {
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
  },
  detailsBtn: {
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 16,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  timelineCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
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
    fontSize: 16,
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
    fontSize: 14,
    color: '#10b981',
    fontFamily: 'Urbanist-Bold',
    marginTop: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 20,
    marginTop: 8,
  },
  rrnLink: {
    fontSize: 14,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    marginTop: 12,
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
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    flex: 1,
  },
  feedbackActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  feedbackBtnText: {
    fontSize: 14,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  showOlderBtn: {
    backgroundColor: '#d4af37',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  showOlderBtnText: {
    fontSize: 18,
    color: '#554300',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.2,
  },
});
