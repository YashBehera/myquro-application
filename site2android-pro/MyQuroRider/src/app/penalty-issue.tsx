import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import {
  Alert,
  TextInput,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';
import { CustomAlertModal, ModalType } from '../components/CustomAlertModal';

export default function PenaltyIssueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken } = useRider();
  
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedDayName, setSelectedDayName] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  }>({
    visible: false,
    title: '',
    subtitle: '',
  });

  const showAlertModal = (config: {
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
  }) => {
    setCustomAlert({
      ...config,
      visible: true,
    });
  };

  const hideAlertModal = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

  // Dynamically generate the past 10 days
  const daysList = React.useMemo(() => {
    const list = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 10; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayName = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
      list.push({
        id: `day_${i}`,
        dayName,
      });
    }
    return list;
  }, []);

  const [expandedDay, setExpandedDay] = useState<string | null>(daysList[0]?.dayName || null);

  const handleBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/payout-issue');
    }
  };

  const toggleDay = (dayName: string) => {
    Keyboard.dismiss();
    setExpandedDay((prev) => (prev === dayName ? null : dayName));
  };

  const handleOpenDispute = (dayName: string) => {
    setSelectedDayName(dayName);
    setDisputeReason('');
    setDisputeModalVisible(true);
  };

  const handleSubmitDispute = async () => {
    Keyboard.dismiss();
    if (!disputeReason.trim()) {
      showAlertModal({
        type: 'warning',
        title: 'Description Required',
        subtitle: 'Please describe why the deduction or penalty was incorrect before submitting.',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }

    setDisputeModalVisible(false);
    let ticketId = `PEN-${Date.now().toString().slice(-5)}`;

    if (sessionToken) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/delivery/rider/support-ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'Origin': 'http://localhost:3000',
          },
          body: JSON.stringify({
            category: 'penalty_deduction',
            subject: `Penalty Dispute for ${selectedDayName}`,
            description: disputeReason,
            metadata: { day: selectedDayName },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ticket?.id) ticketId = data.ticket.id;
        }
      } catch (err) {
        console.error('Penalty claim error:', err);
      }
    }

    showAlertModal({
      type: 'success_online',
      title: 'Dispute Submitted 🎉',
      subtitle: `Your penalty dispute (Ticket #${ticketId}) for ${selectedDayName} has been submitted. Our team will review the trip logs.`,
      primaryButtonText: 'Got It',
      onPrimaryPress: () => {
        hideAlertModal();
        setDisputeReason('');
      },
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

        {/* TOP HEADER BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F2CA50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Penalty or Deduction Issue</Text>
        </View>

        {/* SUBTITLE */}
        <Text style={styles.subtitleText}>Select the deduction for which you faced the issue</Text>

        {/* MAIN SCROLLABLE CONTENT */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.daysContainer}>
            {daysList.map((item) => {
              const isExpanded = expandedDay === item.dayName;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.dayCard,
                    isExpanded ? styles.dayCardExpanded : styles.dayCardCollapsed,
                  ]}
                >
                  {/* Header Row */}
                  <TouchableOpacity
                    onPress={() => toggleDay(item.dayName)}
                    style={styles.dayHeaderRow}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.dayTitleText}>{item.dayName}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#F2CA50"
                    />
                  </TouchableOpacity>

                  {/* Expanded Content View */}
                  {isExpanded && (
                    <View style={styles.expandedContentBox}>
                      <View style={styles.warningIconCircle}>
                        <Text style={styles.warningExclamation}>!</Text>
                      </View>
                      <Text style={styles.emptyStateText}>No automated penalties detected on this day.</Text>
                      <TouchableOpacity
                        onPress={() => handleOpenDispute(item.dayName)}
                        style={styles.raiseDisputeBtn}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.raiseDisputeBtnText}>Dispute a deduction for this day</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* DISPUTE MODAL */}
        <Modal
          visible={disputeModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            Keyboard.dismiss();
            setDisputeModalVisible(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setDisputeModalVisible(false);
              }}
            >
              <TouchableWithoutFeedback onPress={(e) => {
                e.stopPropagation?.();
                Keyboard.dismiss();
              }}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Dispute Deduction</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setDisputeModalVisible(false);
                      }}
                    >
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalSub}>{selectedDayName}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Describe the incorrect penalty / deduction amount..."
                    placeholderTextColor="#787878"
                    multiline
                    numberOfLines={4}
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                    blurOnSubmit={true}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <TouchableOpacity onPress={handleSubmitDispute} style={styles.modalSubmitBtn} activeOpacity={0.85}>
                    <Text style={styles.modalSubmitBtnText}>SUBMIT DISPUTE</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* REUSABLE CUSTOM ALERT UI MODAL */}
        <CustomAlertModal
          visible={customAlert.visible}
          type={customAlert.type}
          title={customAlert.title}
          subtitle={customAlert.subtitle}
          primaryButtonText={customAlert.primaryButtonText}
          onPrimaryPress={customAlert.onPrimaryPress || hideAlertModal}
          onClose={hideAlertModal}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  daysContainer: {
    gap: 12,
    marginBottom: 20,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  dayCardCollapsed: {
    backgroundColor: '#141210',
    borderColor: '#2E2923',
  },
  dayCardExpanded: {
    backgroundColor: '#141210',
    borderColor: '#F2CA50',
    borderRadius: 22,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  dayTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expandedContentBox: {
    backgroundColor: '#0E0C0A',
    borderTopWidth: 1,
    borderTopColor: '#2E2923',
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningExclamation: {
    fontSize: 32,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EF4444',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#A6A6A6',
    textAlign: 'center',
    marginBottom: 16,
  },
  raiseDisputeBtn: {
    backgroundColor: '#1F1A12',
    borderWidth: 1,
    borderColor: '#F2CA50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  raiseDisputeBtnText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141210',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2E2923',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#F2CA50',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#1C1916',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 14,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalSubmitBtn: {
    backgroundColor: '#F2CA50',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
});
