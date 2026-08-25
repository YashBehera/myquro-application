import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import {
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

export default function TripEarningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken, tripHistory } = useRider();

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

  // Dynamically generate the past 7 days
  const daysList = React.useMemo(() => {
    const list = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      list.push({
        id: `day_${i}`,
        dayName: dayNames[d.getDay()],
        dateText: `${d.getDate()} ${monthNames[d.getMonth()]}`,
        fullDateStr: `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`,
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
      router.replace('/help-support');
    }
  };

  const toggleDay = (dayName: string) => {
    Keyboard.dismiss();
    setExpandedDay((prev) => (prev === dayName ? null : dayName));
  };

  const handleOpenDispute = (fullDateStr: string) => {
    setSelectedDayName(fullDateStr);
    setDisputeReason('');
    setDisputeModalVisible(true);
  };

  const handleSubmitDispute = async () => {
    Keyboard.dismiss();
    if (!disputeReason.trim()) {
      showAlertModal({
        type: 'warning',
        title: 'Description Required',
        subtitle: 'Please describe the order fare or distance discrepancy before submitting.',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }

    setDisputeModalVisible(false);
    let ticketId = `TRIP-${Date.now().toString().slice(-5)}`;

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
            category: 'trip_earning',
            subject: `Trip Earning Issue on ${selectedDayName}`,
            description: disputeReason,
            metadata: { day: selectedDayName },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ticket?.id) ticketId = data.ticket.id;
        }
      } catch (err) {
        console.error('Trip earning dispute error:', err);
      }
    }

    showAlertModal({
      type: 'success_online',
      title: 'Dispute Submitted 🎉',
      subtitle: `Your trip earning dispute (Ticket #${ticketId}) for ${selectedDayName} has been submitted. Our team will verify the trip distance & fare breakdown within 2-4 hours.`,
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
          <Text style={styles.headerTitle}>Trip earning</Text>
        </View>

        {/* SUBTITLE */}
        <Text style={styles.subtitleText}>Select the order for which you faced the issue</Text>

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
                  style={[styles.dayCard, isExpanded ? styles.dayCardExpanded : styles.dayCardCollapsed]}
                >
                  {/* Header Row */}
                  <TouchableOpacity
                    onPress={() => toggleDay(item.dayName)}
                    style={styles.dayHeaderRow}
                    activeOpacity={0.85}
                  >
                    <View style={styles.dayLeftGroup}>
                      <Text style={styles.dayTitleText}>
                        {item.dayName}
                      </Text>
                      <Text style={styles.dateText}>
                        {item.dateText}
                      </Text>
                    </View>

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
                      <Text style={styles.emptyStateText}>No orders assigned on this day</Text>
                      <TouchableOpacity
                        onPress={() => handleOpenDispute(item.fullDateStr)}
                        style={styles.raiseDisputeBtn}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.raiseDisputeBtnText}>Dispute trip fare on this day</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* BOTTOM SKYLINE FOOTER */}
          <Image
            source={require('../../assets/images/skyline_footer.jpg')}
            style={styles.skylineImage}
            resizeMode="contain"
          />
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
                // Prevent modal close on content tap, but allow dismissing keyboard if tapping non-input
                e.stopPropagation?.();
                Keyboard.dismiss();
              }}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Trip Fare Dispute</Text>
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
                    placeholder="Describe the trip/order number and fare discrepancy..."
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
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 4,
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
    padding: 16,
  },
  dayLeftGroup: {
    flex: 1,
  },
  dayTitleText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningExclamation: {
    fontSize: 28,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
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
  skylineImage: {
    width: '100%',
    height: 120,
    marginTop: 10,
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
