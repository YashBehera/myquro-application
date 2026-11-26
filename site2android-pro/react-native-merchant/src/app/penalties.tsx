import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/services/apiClient';

interface MerchantPenaltyRow {
  id: string;
  restaurantId: string;
  orderId?: string | null;
  penaltyType: string;
  amount: number;
  riderCompensationAmount: number;
  customerVoucherAmount: number;
  status: 'pending' | 'deducted' | 'waived' | 'disputed';
  reason: string;
  disputeNotes?: string | null;
  createdAt: string;
}

const MERCHANT_PENALTY_LABELS: Record<string, string> = {
  unresponsive_cancellation: '5-Min Unresponsive Order Timeout',
  rush_cancellation: 'Kitchen Overload / Rush Cancellation',
  late_merchant_cancellation: 'Post-Acceptance Late Cancellation',
  out_of_stock_cancellation: 'Out-of-Stock Item Rejection',
  rider_wait_delay: 'Rider Kitchen Wait Compensation',
  complaint_refund_fault: 'Customer Refund Fault Attribution',
};

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'rgba(245, 158, 11, 0.14)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.4)' },
  deducted: { bg: 'rgba(239, 68, 68, 0.14)', text: '#F87171', border: 'rgba(239, 68, 68, 0.4)' },
  disputed: { bg: 'rgba(232, 197, 71, 0.14)', text: '#E8C547', border: 'rgba(232, 197, 71, 0.4)' },
  waived: { bg: 'rgba(34, 197, 94, 0.14)', text: '#4ADE80', border: 'rgba(34, 197, 94, 0.4)' },
};

export default function MerchantPenaltiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [strikeCount, setStrikeCount] = useState(0);
  const [autoPausedUntil, setAutoPausedUntil] = useState<string | null>(null);
  const [penalties, setPenalties] = useState<MerchantPenaltyRow[]>([]);
  const [summary, setSummary] = useState({
    totalPendingPaise: 0,
    totalDeductedPaise: 0,
    totalRiderCompensationPaise: 0,
  });

  const [selectedPenalty, setSelectedPenalty] = useState<MerchantPenaltyRow | null>(null);
  const [disputeNotes, setDisputeNotes] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const loadPenalties = useCallback(async () => {
    try {
      const restRes = await apiClient.get('/restaurants/my-restaurant');
      const restId = restRes.data?.restaurant?.id || restRes.data?.id;
      if (!restId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setRestaurantId(restId);

      const penRes = await apiClient.get(`/restaurants/${restId}/penalties`);
      setPenalties(Array.isArray(penRes.data?.penalties) ? penRes.data.penalties : []);
      setStrikeCount(Number(penRes.data?.strikeCount || 0));
      setAutoPausedUntil(penRes.data?.autoPausedUntil || null);
      setSummary({
        totalPendingPaise: Number(penRes.data?.summary?.totalPendingPaise || 0),
        totalDeductedPaise: Number(penRes.data?.summary?.totalDeductedPaise || 0),
        totalRiderCompensationPaise: Number(penRes.data?.summary?.totalRiderCompensationPaise || 0),
      });
    } catch (e) {
      console.warn('Error fetching merchant penalties:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPenalties();
  }, [loadPenalties]);

  const handleResumeOutlet = async () => {
    if (!restaurantId) return;
    try {
      await apiClient.post(`/restaurants/${restaurantId}/unsnooze`);
      setAutoPausedUntil(null);
      Alert.alert('Outlet Resumed', 'Your outlet is live again to accept orders.');
    } catch {
      Alert.alert('Error', 'Unable to resume outlet right now.');
    }
  };

  const handleSubmitDispute = async () => {
    if (!restaurantId || !selectedPenalty) return;
    if (!disputeNotes.trim()) {
      Alert.alert('Reason Required', 'Please explain why this penalty should be reviewed.');
      return;
    }

    setSubmittingDispute(true);
    try {
      const res = await apiClient.post(
        `/restaurants/${restaurantId}/penalties/${selectedPenalty.id}/dispute`,
        { disputeNotes: disputeNotes.trim() }
      );
      if (res.data?.success) {
        setSelectedPenalty(null);
        setDisputeNotes('');
        await loadPenalties();
        Alert.alert('Dispute Submitted', res.data.message || 'Dispute ticket registered with MyQuro Support.');
      }
    } catch (e: any) {
      Alert.alert('Dispute Failed', e?.response?.data?.message || 'Could not submit penalty dispute.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const pauseDate = autoPausedUntil ? new Date(autoPausedUntil) : null;
  const isPausedNow = Boolean(pauseDate && pauseDate.getTime() > Date.now());

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more' as any))}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#E8C547" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Penalties & SLA Strikes</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>STRIKES</Text>
          <Text style={[styles.summaryVal, { color: strikeCount > 0 ? '#F87171' : '#4ADE80' }]}>
            {strikeCount}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>PENDING FINES</Text>
          <Text style={styles.summaryVal}>₹{Math.round(summary.totalPendingPaise / 100)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>RIDER COMP</Text>
          <Text style={[styles.summaryVal, { color: '#E8C547' }]}>
            ₹{Math.round(summary.totalRiderCompensationPaise / 100)}
          </Text>
        </View>
      </View>

      {isPausedNow && pauseDate && (
        <View style={styles.pauseBanner}>
          <Ionicons name="warning" size={18} color="#F87171" />
          <View style={{ flex: 1 }}>
            <Text style={styles.pauseTitle}>Outlet Auto-Paused</Text>
            <Text style={styles.pauseSub}>
              Resumes at {pauseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <TouchableOpacity onPress={handleResumeOutlet} style={styles.resumeBtn}>
            <Text style={styles.resumeBtnText}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#E8C547" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPenalties();
              }}
              tintColor="#E8C547"
            />
          }
        >
          {penalties.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={40} color="#4ADE80" />
              <Text style={styles.emptyTitle}>Clean SLA Record</Text>
              <Text style={styles.emptySub}>No penalties or SLA violations recorded for your outlet.</Text>
            </View>
          ) : (
            penalties.map((p) => {
              const badge = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
              return (
                <View key={p.id} style={styles.penaltyCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardType}>{MERCHANT_PENALTY_LABELS[p.penaltyType] || p.penaltyType}</Text>
                      <Text style={styles.cardMeta}>
                        {new Date(p.createdAt).toLocaleString()}
                        {p.orderId ? ` • Order #${String(p.orderId).slice(-6).toUpperCase()}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.cardAmount}>₹{Math.round((p.amount || 0) / 100)}</Text>
                      <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>{p.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.cardReason}>{p.reason}</Text>

                  {p.riderCompensationAmount > 0 && (
                    <Text style={styles.compText}>
                      Includes ₹{Math.round(p.riderCompensationAmount / 100)} credited to rider for wait/travel time
                    </Text>
                  )}

                  {p.status === 'disputed' && p.disputeNotes ? (
                    <Text style={styles.disputeText}>Dispute submitted: {p.disputeNotes}</Text>
                  ) : p.status !== 'waived' ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPenalty(p);
                        setDisputeNotes('');
                      }}
                      style={styles.disputeBtn}
                    >
                      <Text style={styles.disputeBtnText}>Dispute Penalty</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={Boolean(selectedPenalty)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Dispute Penalty</Text>
              <TouchableOpacity onPress={() => setSelectedPenalty(null)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              {selectedPenalty
                ? `${MERCHANT_PENALTY_LABELS[selectedPenalty.penaltyType] || selectedPenalty.penaltyType} (₹${Math.round((selectedPenalty.amount || 0) / 100)})`
                : ''}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Explain why this penalty should be waived..."
              placeholderTextColor="#787878"
              multiline
              value={disputeNotes}
              onChangeText={setDisputeNotes}
            />
            <TouchableOpacity
              disabled={submittingDispute}
              onPress={handleSubmitDispute}
              style={[styles.submitBtn, submittingDispute && { opacity: 0.65 }]}
            >
              <Text style={styles.submitBtnText}>{submittingDispute ? 'SUBMITTING...' : 'SUBMIT DISPUTE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  backBtn: { width: 38, height: 38, justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 14,
    padding: 12,
  },
  summaryLabel: { color: '#8E8E8E', fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  summaryVal: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 4 },
  pauseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  pauseTitle: { color: '#FCA5A5', fontSize: 13, fontWeight: '700' },
  pauseSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  resumeBtn: { backgroundColor: '#F87171', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resumeBtnText: { color: '#0B0B0B', fontSize: 12, fontWeight: '700' },
  emptyBox: {
    marginTop: 40,
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 18,
    padding: 28,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 10 },
  emptySub: { color: '#9CA3AF', fontSize: 13, marginTop: 4, textAlign: 'center' },
  penaltyCard: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardType: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cardMeta: { color: '#8E8E8E', fontSize: 11, marginTop: 3 },
  cardAmount: { color: '#F87171', fontSize: 16, fontWeight: '800' },
  badge: { marginTop: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardReason: { color: '#D1D5DB', fontSize: 12, marginTop: 8, lineHeight: 17 },
  compText: { color: '#E8C547', fontSize: 11, marginTop: 6, fontWeight: '600' },
  disputeText: { color: '#E8C547', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  disputeBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E8C547',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  disputeBtnText: { color: '#E8C547', fontSize: 11, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#141210',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#292929',
  },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  modalDesc: { color: '#E8C547', fontSize: 12, marginBottom: 12 },
  modalInput: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#292929',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitBtn: { backgroundColor: '#E8C547', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#000000', fontSize: 14, fontWeight: '800' },
});
