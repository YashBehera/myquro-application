import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';
import { CustomAlertModal, ModalType } from '../components/CustomAlertModal';
import { submitRiderSupportTicket } from '../utils/supportTicketApi';

interface RiderPenaltyRow {
  id: string;
  riderId: string;
  orderId?: string | null;
  complaintId?: string | null;
  penaltyType: string;
  amount: number;
  cooldownMinutes: number;
  status: 'pending' | 'deducted' | 'waived' | 'disputed';
  reason: string;
  disputeNotes?: string | null;
  createdAt: string;
}

const PENALTY_TYPE_LABELS: Record<string, string> = {
  post_accept_cancellation: 'Cancelled After Accepting Trip',
  arrived_store_cancellation: 'Abandoned After Arriving at Store',
  repeated_offer_timeout: 'Consecutive Ignored Offers (SLA)',
  pickup_delay: 'Late Pickup Delay',
  delivery_delay: 'Severe Delivery Delay',
  order_damage_or_missing: 'Order Damage / Missing Fault',
  undelivered_order_complaint: 'Undelivered Order Complaint Fault',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  deducted: { bg: 'rgba(239, 68, 68, 0.14)', text: '#F87171', border: 'rgba(239, 68, 68, 0.35)' },
  disputed: { bg: 'rgba(242, 202, 80, 0.14)', text: '#F2CA50', border: 'rgba(242, 202, 80, 0.4)' },
  waived: { bg: 'rgba(34, 197, 94, 0.14)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.35)' },
  pending: { bg: 'rgba(245, 158, 11, 0.14)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.35)' },
};

export default function PenaltyIssueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken } = useRider();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [penalties, setPenalties] = useState<RiderPenaltyRow[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [strikeCount, setStrikeCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [totalDeductedPaise, setTotalDeductedPaise] = useState(0);

  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedDayName, setSelectedDayName] = useState('');
  const [selectedPenalty, setSelectedPenalty] = useState<RiderPenaltyRow | null>(null);
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
    setCustomAlert({ ...config, visible: true });
  };

  const hideAlertModal = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

  const fetchPenalties = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/penalties`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPenalties(Array.isArray(data.penalties) ? data.penalties : []);
        setWalletBalance(Number(data.walletBalance || 0));
        setStrikeCount(Number(data.strikeCount || 0));
        setCooldownUntil(data.penaltyCooldownUntil || null);
        setTotalDeductedPaise(Number(data.summary?.totalDeductedPaise || 0));
      }
    } catch (e) {
      console.error('Error loading rider penalties:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchPenalties();
  }, [fetchPenalties]);

  const formatDayKey = (dateObj: Date) =>
    `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

  const daysList = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped: Record<string, RiderPenaltyRow[]> = {};
    for (const p of penalties) {
      const key = formatDayKey(new Date(p.createdAt));
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    }

    const list = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayKey = formatDayKey(d);
      const dayName = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
      list.push({
        id: `day_${i}`,
        dayKey,
        dayName,
        items: grouped[dayKey] || [],
      });
    }
    return list;
  }, [penalties]);

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

  const handleOpenDispute = (dayName: string, penalty: RiderPenaltyRow | null = null) => {
    setSelectedDayName(dayName);
    setSelectedPenalty(penalty);
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

    setSubmitting(true);
    try {
      if (selectedPenalty && sessionToken) {
        const res = await fetch(`${BACKEND_URL}/api/delivery/rider/penalties/${selectedPenalty.id}/dispute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ disputeNotes: disputeReason.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          showAlertModal({
            type: 'warning',
            title: 'Dispute Failed',
            subtitle: data?.message || 'Could not submit dispute.',
            primaryButtonText: 'Okay',
            onPrimaryPress: hideAlertModal,
          });
          return;
        }
        setDisputeModalVisible(false);
        await fetchPenalties();
        showAlertModal({
          type: 'success_online',
          title: 'Penalty Disputed',
          subtitle: data.message || 'Your penalty dispute has been submitted to support.',
          primaryButtonText: 'Got It',
          onPrimaryPress: () => {
            hideAlertModal();
            setDisputeReason('');
            setSelectedPenalty(null);
          },
        });
        return;
      }

      const result = await submitRiderSupportTicket({
        sessionToken,
        category: 'penalty_deduction',
        subject: `Penalty / Deduction Inquiry for ${selectedDayName}`,
        description: disputeReason.trim(),
        metadata: { day: selectedDayName },
      });

      if (!result.success || !result.ticket?.id) {
        showAlertModal({
          type: 'warning',
          title: 'Submission Failed',
          subtitle: result.error || 'Could not register penalty dispute on server.',
          primaryButtonText: 'Okay',
          onPrimaryPress: hideAlertModal,
        });
        return;
      }

      setDisputeModalVisible(false);
      showAlertModal({
        type: 'success_online',
        title: 'Ticket Submitted',
        subtitle: `Your inquiry (Ticket #${result.ticket.id}) for ${selectedDayName} has been registered.`,
        primaryButtonText: 'Got It',
        onPrimaryPress: () => {
          hideAlertModal();
          setDisputeReason('');
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeCooldownMins = cooldownUntil
    ? Math.max(0, Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / 60000))
    : 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F2CA50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Penalties & Deductions</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>WALLET</Text>
            <Text style={styles.summaryVal}>₹{walletBalance.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>DEDUCTED</Text>
            <Text style={[styles.summaryVal, { color: totalDeductedPaise > 0 ? '#F87171' : '#FFFFFF' }]}>
              ₹{Math.round(totalDeductedPaise / 100)}
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>STRIKES</Text>
            <Text style={[styles.summaryVal, { color: strikeCount > 0 ? '#F2CA50' : '#4ADE80' }]}>
              {strikeCount}
            </Text>
          </View>
        </View>

        {activeCooldownMins > 0 && (
          <View style={styles.cooldownBanner}>
            <Ionicons name="time-outline" size={18} color="#F87171" />
            <Text style={styles.cooldownBannerText}>
              Penalty cooldown active: {activeCooldownMins}m remaining before receiving new offers.
            </Text>
          </View>
        )}

        <Text style={styles.subtitleText}>Tap a date below to inspect recorded deductions or dispute a charge</Text>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F2CA50" />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchPenalties();
                }}
                tintColor="#F2CA50"
              />
            }
          >
            <View style={styles.daysContainer}>
              {daysList.map((day) => {
                const isExpanded = expandedDay === day.dayName;
                const dayTotalPaise = day.items
                  .filter((x) => x.status !== 'waived')
                  .reduce((s, x) => s + (x.amount || 0), 0);

                return (
                  <View
                    key={day.id}
                    style={[
                      styles.dayCard,
                      isExpanded ? styles.dayCardExpanded : styles.dayCardCollapsed,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleDay(day.dayName)}
                      style={styles.dayHeaderRow}
                      activeOpacity={0.85}
                    >
                      <View>
                        <Text style={styles.dayTitleText}>{day.dayName}</Text>
                        <Text style={styles.daySubCount}>
                          {day.items.length === 0
                            ? '0 penalties'
                            : `${day.items.length} ${day.items.length === 1 ? 'penalty' : 'penalties'} • ₹${Math.round(dayTotalPaise / 100)}`}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#F2CA50"
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedContentBox}>
                        {day.items.length === 0 ? (
                          <>
                            <View style={styles.warningIconCircle}>
                              <Ionicons name="checkmark" size={26} color="#4ADE80" />
                            </View>
                            <Text style={styles.emptyStateText}>No automated penalties recorded on this day.</Text>
                            <TouchableOpacity
                              onPress={() => handleOpenDispute(day.dayName, null)}
                              style={styles.raiseDisputeBtn}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.raiseDisputeBtnText}>Report Other Deduction</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={{ width: '100%', gap: 10 }}>
                            {day.items.map((p) => {
                              const badge = STATUS_COLORS[p.status] || STATUS_COLORS.deducted;
                              return (
                                <View key={p.id} style={styles.penaltyItemCard}>
                                  <View style={styles.penaltyItemTop}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.penaltyTypeTitle}>
                                        {PENALTY_TYPE_LABELS[p.penaltyType] || p.penaltyType}
                                      </Text>
                                      {p.orderId && (
                                        <Text style={styles.penaltyOrderMeta}>
                                          Order #{String(p.orderId).slice(-6).toUpperCase()}
                                          {p.cooldownMinutes > 0 ? ` • ${p.cooldownMinutes}m Cooldown` : ''}
                                        </Text>
                                      )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                      <Text style={styles.penaltyAmountText}>-₹{Math.round((p.amount || 0) / 100)}</Text>
                                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                                          {p.status.toUpperCase()}
                                        </Text>
                                      </View>
                                    </View>
                                  </View>

                                  <Text style={styles.penaltyReasonText}>{p.reason}</Text>

                                  {p.status === 'disputed' && p.disputeNotes ? (
                                    <Text style={styles.disputeNoteText}>Dispute note: {p.disputeNotes}</Text>
                                  ) : p.status !== 'waived' ? (
                                    <TouchableOpacity
                                      onPress={() => handleOpenDispute(day.dayName, p)}
                                      style={styles.disputePenaltyBtn}
                                      activeOpacity={0.8}
                                    >
                                      <Text style={styles.disputePenaltyBtnText}>Dispute This Penalty</Text>
                                    </TouchableOpacity>
                                  ) : null}
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

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
              <TouchableWithoutFeedback
                onPress={(e) => {
                  e.stopPropagation?.();
                  Keyboard.dismiss();
                }}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {selectedPenalty
                        ? `Dispute ₹${Math.round((selectedPenalty.amount || 0) / 100)} Penalty`
                        : 'Dispute Deduction'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setDisputeModalVisible(false);
                      }}
                    >
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalSub}>
                    {selectedPenalty
                      ? `${PENALTY_TYPE_LABELS[selectedPenalty.penaltyType] || selectedPenalty.penaltyType}`
                      : selectedDayName}
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Explain why this penalty/deduction should be reviewed..."
                    placeholderTextColor="#787878"
                    multiline
                    numberOfLines={4}
                    value={disputeReason}
                    onChangeText={setDisputeReason}
                    blurOnSubmit={true}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <TouchableOpacity
                    onPress={handleSubmitDispute}
                    disabled={submitting}
                    style={[styles.modalSubmitBtn, submitting && { opacity: 0.65 }]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalSubmitBtnText}>
                      {submitting ? 'SUBMITTING...' : 'SUBMIT DISPUTE'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

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
  container: { flex: 1, backgroundColor: '#000000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontFamily: 'Urbanist-Bold', fontWeight: '700', color: '#FFFFFF', flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 6, marginBottom: 12 },
  summaryBox: {
    flex: 1,
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  summaryLabel: { fontSize: 10, color: '#8E8E8E', fontFamily: 'Urbanist-Bold', letterSpacing: 0.8 },
  summaryVal: { fontSize: 18, fontFamily: 'Urbanist-Bold', fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  cooldownBannerText: { color: '#FCA5A5', fontSize: 12, fontFamily: 'Urbanist-Medium', flex: 1 },
  subtitleText: { fontSize: 13, fontFamily: 'Urbanist-Regular', color: '#A6A6A6', paddingHorizontal: 16, marginBottom: 14 },
  scrollContent: { flex: 1 },
  scrollContentContainer: { paddingHorizontal: 16, paddingBottom: 32 },
  daysContainer: { gap: 12 },
  dayCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  dayCardCollapsed: { backgroundColor: '#141210', borderColor: '#2E2923' },
  dayCardExpanded: { backgroundColor: '#141210', borderColor: '#F2CA50' },
  dayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18 },
  dayTitleText: { fontSize: 15, fontFamily: 'Urbanist-Bold', fontWeight: '700', color: '#FFFFFF' },
  daySubCount: { fontSize: 12, color: '#A6A6A6', marginTop: 2 },
  expandedContentBox: {
    backgroundColor: '#0E0C0A',
    borderTopWidth: 1,
    borderTopColor: '#2E2923',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  warningIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 222, 128, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyStateText: { color: '#A6A6A6', fontSize: 13, textAlign: 'center', marginBottom: 14 },
  raiseDisputeBtn: {
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  raiseDisputeBtnText: { color: '#F2CA50', fontSize: 12, fontWeight: '700' },
  penaltyItemCard: {
    backgroundColor: '#181512',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 14,
    padding: 12,
  },
  penaltyItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  penaltyTypeTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  penaltyOrderMeta: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  penaltyAmountText: { color: '#F87171', fontSize: 15, fontWeight: '800' },
  statusBadge: { marginTop: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  penaltyReasonText: { color: '#D1D5DB', fontSize: 12, marginTop: 8, lineHeight: 17 },
  disputeNoteText: { color: '#F2CA50', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  disputePenaltyBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  disputePenaltyBtnText: { color: '#F2CA50', fontSize: 11, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#141210',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#2E2923',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  modalSub: { color: '#F2CA50', fontSize: 12, marginBottom: 12 },
  modalInput: {
    backgroundColor: '#0E0C0A',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalSubmitBtn: { backgroundColor: '#F2CA50', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSubmitBtnText: { color: '#000000', fontSize: 14, fontWeight: '800' },
});
