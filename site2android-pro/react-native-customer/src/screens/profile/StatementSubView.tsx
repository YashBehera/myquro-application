import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';

interface StatementSubViewProps {
  email: string;
  onBack: () => void;
}

export const StatementSubView: React.FC<StatementSubViewProps> = ({
  email,
  onBack,
}) => {
  const [statementDuration, setStatementDuration] = useState('');
  const [statementCategory, setStatementCategory] = useState('');
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const isReportEnabled = statementDuration.length > 0 && statementCategory.length > 0;

  return (
    <View style={styles.profileFigmaStatementScreenContainer}>
      {/* Custom Header */}
      <View style={styles.profileFigmaStatementHeader}>
        <TouchableOpacity onPress={onBack} style={styles.profileFigmaStatementHeaderBackBtn}>
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.profileFigmaStatementHeaderTitle}>Account Statement</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Screen Content */}
      <ScrollView style={styles.profileFigmaStatementScrollView} contentContainerStyle={styles.profileFigmaStatementScrollContent}>
        {/* Main Titles */}
        <Text style={styles.profileFigmaStatementMainTitleWhite}>Account</Text>
        <Text style={styles.profileFigmaStatementMainTitleGold}>Statements</Text>
        <Text style={styles.profileFigmaStatementSubtitle}>Invoices for reimbursements or record-keeping</Text>

        {/* Form Fields */}
        <TouchableOpacity
          style={styles.profileFigmaStatementDropdownBtn}
          activeOpacity={0.7}
          onPress={() => setShowDurationModal(true)}
        >
          <Text style={[styles.profileFigmaStatementDropdownBtnText, !statementDuration && styles.profileFigmaStatementDropdownBtnPlaceholderText]}>
            {statementDuration || 'Select Duration'}
          </Text>
          <ChevronDown size={18} color="#f2ca50" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileFigmaStatementDropdownBtn}
          activeOpacity={0.7}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={[styles.profileFigmaStatementDropdownBtnText, !statementCategory && styles.profileFigmaStatementDropdownBtnPlaceholderText]}>
            {statementCategory || 'Select Category'}
          </Text>
          <ChevronDown size={18} color="#f2ca50" />
        </TouchableOpacity>

        {/* Get Report Button */}
        <TouchableOpacity
          style={[styles.profileFigmaStatementSubmitBtn, isReportEnabled && styles.profileFigmaStatementSubmitBtnActive]}
          activeOpacity={isReportEnabled ? 0.7 : 1}
          onPress={() => {
            if (!isReportEnabled) return;
            if (!email || !email.includes('@')) {
              Alert.alert(
                'Email Required',
                'Please set a valid email address in your profile to receive account statements.',
                [{ text: 'OK' }]
              );
              return;
            }
            Alert.alert(
              'Statement Requested',
              `Detailed report requested for ${statementDuration} (${statementCategory}). It will be delivered to ${email} within 3 hours.`,
              [{ text: 'OK', onPress: onBack }]
            );
          }}
          accessibilityRole="button"
          accessibilityLabel="Get account statement report"
        >
          <Text style={[styles.profileFigmaStatementSubmitBtnText, isReportEnabled && styles.profileFigmaStatementSubmitBtnTextActive]}>
            Get Report
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.profileFigmaStatementInfoText}>
          You will receive your statement within the next 3 hours at{' '}
          <Text style={styles.profileFigmaStatementInfoTextBold}>{email || 'your registered email address'}</Text>
        </Text>

        {/* How statements work button */}
        <TouchableOpacity
          style={styles.profileFigmaStatementHowItWorksBtn}
          onPress={() => {
            Alert.alert(
              'How Account Statements Work',
              'Account statements aggregate your order invoices, including food items, delivery fees, and dine-out payments, formatted for easy business reimbursement or personal expense tracking.',
              [{ text: 'Got it' }]
            );
          }}
        >
          <Text style={styles.profileFigmaStatementHowItWorksBtnText}>How account statements work?</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Duration Modal */}
      <Modal
        visible={showDurationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDurationModal(false)}
      >
        <TouchableOpacity
          style={styles.profileFigmaModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDurationModal(false)}
        >
          <View style={styles.profileFigmaModalContent}>
            <Text style={styles.profileFigmaModalTitle}>Select Duration</Text>
            {[
              'Last 1 Month',
              'Last 3 Months',
              'Last 6 Months',
              'Last 1 Year',
              'Custom Range'
            ].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.profileFigmaModalItem}
                onPress={() => {
                  setStatementDuration(item);
                  setShowDurationModal(false);
                }}
              >
                <Text style={[styles.profileFigmaModalItemText, statementDuration === item && styles.profileFigmaModalItemTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.profileFigmaModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={styles.profileFigmaModalContent}>
            <Text style={styles.profileFigmaModalTitle}>Select Category</Text>
            {[
              'Food Delivery',
              'Dineout',
              'All Transactions'
            ].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.profileFigmaModalItem}
                onPress={() => {
                  setStatementCategory(item);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[styles.profileFigmaModalItemText, statementCategory === item && styles.profileFigmaModalItemTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  profileFigmaStatementScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  profileFigmaStatementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1817',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    justifyContent: 'space-between',
  },
  profileFigmaStatementHeaderBackBtn: {
    padding: 6,
  },
  profileFigmaStatementHeaderTitle: {
    fontSize: 18,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaStatementScrollView: {
    flex: 1,
  },
  profileFigmaStatementScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 60,
  },
  profileFigmaStatementMainTitleWhite: {
    fontSize: 36,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaStatementMainTitleGold: {
    fontSize: 36,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    marginTop: -6,
  },
  profileFigmaStatementSubtitle: {
    fontSize: 15,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    marginTop: 8,
    marginBottom: 32,
  },
  profileFigmaStatementDropdownBtn: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 18,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
    marginBottom: 16,
  },
  profileFigmaStatementDropdownBtnText: {
    fontSize: 16,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaStatementDropdownBtnPlaceholderText: {
    color: '#c3c3c3',
  },
  profileFigmaStatementSubmitBtn: {
    backgroundColor: '#2a2a2a',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  profileFigmaStatementSubmitBtnActive: {
    backgroundColor: '#d4af37',
  },
  profileFigmaStatementSubmitBtnText: {
    fontSize: 18,
    color: '#868e96',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaStatementSubmitBtnTextActive: {
    color: '#554300',
  },
  profileFigmaStatementInfoText: {
    fontSize: 14,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
    marginBottom: 40,
  },
  profileFigmaStatementInfoTextBold: {
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaStatementHowItWorksBtn: {
    alignItems: 'center',
  },
  profileFigmaStatementHowItWorksBtnText: {
    fontSize: 16,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  profileFigmaModalContent: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  profileFigmaModalTitle: {
    fontSize: 18,
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 16,
  },
  profileFigmaModalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  profileFigmaModalItemText: {
    fontSize: 16,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Regular',
  },
  profileFigmaModalItemTextActive: {
    color: '#f2ca50',
    fontFamily: 'Urbanist-Bold',
  },
});
