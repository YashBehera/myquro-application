import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useComplaintStore } from '../state/complaintStore';
import { Complaint, ComplaintPriority, ComplaintStatus, ComplaintCategory } from '../types/complaint';

const { width } = Dimensions.get('window');

const STATUS_TABS: { key: 'ALL' | ComplaintStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'AWAITING_CUSTOMER', label: 'Awaiting Customer' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'REOPENED', label: 'Reopened' },
];

export default function ComplaintsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    complaints,
    isLoading,
    loadComplaints,
    searchQuery,
    setSearchQuery,
    selectedStatusTab,
    setSelectedStatusTab,
    selectedPriorityFilter,
    setSelectedPriorityFilter,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedDateFilter,
    setSelectedDateFilter,
    getActiveComplaintsCount,
    getFilteredComplaints,
    getComplaintStats,
  } = useComplaintStore();

  useEffect(() => {
    loadComplaints();
  }, []);

  const activeCount = getActiveComplaintsCount();
  const stats = getComplaintStats();
  const filteredList = getFilteredComplaints();

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just Now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getPriorityBadge = (priority: ComplaintPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return { label: 'CRITICAL', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: 'flame' };
      case 'HIGH':
        return { label: 'HIGH', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', icon: 'alert-circle' };
      case 'MEDIUM':
        return { label: 'MEDIUM', color: '#E8C547', bg: 'rgba(232, 197, 71, 0.15)', icon: 'time-outline' };
      case 'LOW':
        return { label: 'LOW', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', icon: 'information-circle-outline' };
      default:
        return { label: 'MEDIUM', color: '#E8C547', bg: 'rgba(232, 197, 71, 0.15)', icon: 'time-outline' };
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)' };
      case 'AWAITING_CUSTOMER':
        return { label: 'Awaiting Customer', color: '#E8C547', bg: 'rgba(232, 197, 71, 0.12)' };
      case 'ESCALATED':
        return { label: 'Escalated to Support', color: '#DC2626', bg: 'rgba(220, 38, 38, 0.18)' };
      case 'RESOLVED':
        return { label: 'Resolved', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.12)' };
      case 'REOPENED':
        return { label: 'Reopened', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
      default:
        return { label: status, color: '#E8C547', bg: 'rgba(232, 197, 71, 0.12)' };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0B" translucent />

      {/* TOP STATUS & HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color="#E8C547" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Issue Resolution</Text>
          <Text style={styles.headerSubtitle}>Customer feedback & resolution metrics</Text>
        </View>

        {/* Active Complaints Counter Pill */}
        <View style={[styles.activeCounterPill, activeCount === 0 && styles.activeCounterPillZero]}>
          <View style={[styles.activeDot, activeCount === 0 && styles.activeDotZero]} />
          <Text style={[styles.activeCounterText, activeCount === 0 && styles.activeCounterTextZero]}>
            {activeCount} {activeCount === 1 ? 'Active' : 'Active'}
          </Text>
        </View>
      </View>

      {/* Operational Metrics Bar */}
      <View style={styles.metricsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsScroll}>
          <View style={[styles.metricCard, { borderColor: '#E8C547' }]}>
            <Text style={[styles.metricValue, { color: '#E8C547' }]}>{stats.activeComplaints}</Text>
            <Text style={styles.metricLabel}>Unresolved</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>{stats.openCount}</Text>
            <Text style={styles.metricLabel}>Open</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#38BDF8' }]}>{stats.inProgressCount}</Text>
            <Text style={styles.metricLabel}>In Progress</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#DC2626' }]}>{stats.escalatedCount}</Text>
            <Text style={styles.metricLabel}>Escalated</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#16A34A' }]}>{stats.resolvedCount}</Text>
            <Text style={styles.metricLabel}>Resolved</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#16A34A' }]}>{stats.resolutionRatePercent}%</Text>
            <Text style={styles.metricLabel}>Resolution Rate</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>{stats.avgFirstResponseTimeMinutes}m</Text>
            <Text style={styles.metricLabel}>Avg Response</Text>
          </View>
        </ScrollView>
      </View>

      {/* Quality Insight Banner (if any) */}
      {stats.repeatedInsights.length > 0 && (
        <View style={styles.repeatedInsightBox}>
          <View style={styles.speakerIconCircle}>
            <Ionicons name="warning-outline" size={18} color="#E8C547" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.repeatedInsightTitle}>QUALITY INSIGHT: REPEATED ISSUE</Text>
            <Text style={styles.repeatedInsightText}>
              "{stats.repeatedInsights[0].itemName}" received multiple complaints regarding{' '}
              {stats.repeatedInsights[0].primaryReason.toLowerCase()}. Please review kitchen prep.
            </Text>
          </View>
        </View>
      )}

      {/* Search & Filter Controls */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#E8C547" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Complaint ID, Order #, Customer..."
            placeholderTextColor="#8E8E8E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#8E8E8E" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Tabs Navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusTabsRow} contentContainerStyle={{ gap: 6 }}>
          {STATUS_TABS.map((tab) => {
            const isActive = selectedStatusTab === tab.key;
            const count =
              tab.key === 'ALL'
                ? complaints.length
                : complaints.filter((c) => c.status === tab.key).length;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.statusTab, isActive && styles.statusTabActive]}
                onPress={() => setSelectedStatusTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusTabText, isActive && styles.statusTabTextActive]}>
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Complaints List / Empty State */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredList.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-done-circle" size={42} color="#16A34A" />
            </View>
            <Text style={styles.emptyStateTitle}>You're All Clear!</Text>
            <Text style={styles.emptyStateSubtitle}>
              {selectedStatusTab === 'ALL'
                ? 'No customer complaints found. All orders are running smoothly!'
                : `No complaints currently in ${selectedStatusTab.replace('_', ' ')} status.`}
            </Text>
          </View>
        ) : (
          filteredList.map((complaint) => {
            const priorityBadge = getPriorityBadge(complaint.priority);
            const statusBadge = getStatusBadge(complaint.status);
            const isUnresolved = complaint.status !== 'RESOLVED';

            return (
              <TouchableOpacity
                key={complaint.id}
                style={[styles.complaintCard, isUnresolved && styles.complaintCardUnresolved]}
                onPress={() => router.push(`/complaint-details?id=${complaint.id}`)}
                activeOpacity={0.85}
              >
                {/* Card Header: Customer & Order */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.customerRow}>
                    {complaint.customerAvatar ? (
                      <Image source={{ uri: complaint.customerAvatar }} style={styles.customerAvatar} />
                    ) : (
                      <View style={styles.customerAvatarPlaceholder}>
                        <Text style={styles.customerInitials}>
                          {complaint.customerName.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.customerNameText}>{complaint.customerName}</Text>
                      <Text style={styles.orderNumberText}>
                        {complaint.orderNumber} • ₹{complaint.orderAmount}
                      </Text>
                    </View>
                  </View>

                  {/* Priority Badge */}
                  <View style={[styles.priorityPill, { backgroundColor: priorityBadge.bg }]}>
                    <Ionicons name={priorityBadge.icon as any} size={11} color={priorityBadge.color} />
                    <Text style={[styles.priorityPillText, { color: priorityBadge.color }]}>
                      {priorityBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Complaint Category & Reason Banner */}
                <View style={styles.reasonBadgeRow}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{complaint.categoryLabel}</Text>
                  </View>
                  <Text style={styles.reasonTitleText} numberOfLines={1}>
                    {complaint.reason}
                  </Text>
                </View>

                {/* Description Snippet */}
                <Text style={styles.descriptionSnippet} numberOfLines={2}>
                  "{complaint.description}"
                </Text>

                {/* Related Item (if specified) */}
                {complaint.relatedItem && (
                  <View style={styles.relatedItemRow}>
                    <Ionicons name="fast-food-outline" size={13} color="#E8C547" />
                    <Text style={styles.relatedItemText}>Item: {complaint.relatedItem}</Text>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.cardDivider} />

                {/* Card Footer: Status, SLA & Action */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.statusWithTime}>
                    <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
                      <Text style={[styles.statusPillText, { color: statusBadge.color }]}>
                        {statusBadge.label}
                      </Text>
                    </View>
                    <Text style={styles.timeAgoText}>{formatTimeAgo(complaint.createdAt)}</Text>
                  </View>

                  <View style={styles.viewActionBtn}>
                    <Text style={styles.viewActionBtnText}>Resolve</Text>
                    <View style={styles.chevronCircleDark}>
                      <Ionicons name="chevron-forward" size={12} color="#E8C547" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },

  /* TOP BAR */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0B0B0B',
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
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 1,
  },
  activeCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeCounterPillZero: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderColor: 'rgba(22, 163, 74, 0.4)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 5,
  },
  activeDotZero: {
    backgroundColor: '#16A34A',
  },
  activeCounterText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  activeCounterTextZero: {
    color: '#16A34A',
  },

  /* METRICS BAR */
  metricsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  metricsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  metricCard: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 85,
  },
  metricValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 2,
  },

  /* REPEATED INSIGHTS BANNER */
  repeatedInsightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    gap: 10,
  },
  speakerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatedInsightTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#E8C547',
    letterSpacing: 0.8,
  },
  repeatedInsightText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: 3,
    lineHeight: 17,
  },

  /* FILTER & SEARCH SECTION */
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  statusTabsRow: {
    flexDirection: 'row',
  },
  statusTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statusTabActive: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderColor: '#E8C547',
  },
  statusTabText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  statusTabTextActive: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },

  /* MAIN SCROLL & CARDS */
  mainScroll: {
    flex: 1,
    paddingTop: 6,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyStateSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E8E',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  complaintCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 12,
  },
  complaintCardUnresolved: {
    borderColor: 'rgba(232, 197, 71, 0.35)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  customerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitials: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0B0B',
  },
  customerNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderNumberText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E8E',
    marginTop: 1,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
    letterSpacing: 0.3,
  },
  reasonBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryTag: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 8,
  },
  categoryTagText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8E8E8E',
  },
  reasonTitleText: {
    flex: 1,
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  descriptionSnippet: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#E0E0E0',
    lineHeight: 18,
  },
  relatedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  relatedItemText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#E8C547',
    marginLeft: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusWithTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
  timeAgoText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E8E',
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232, 197, 71, 0.3)',
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 4,
  },
  viewActionBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#E8C547',
  },
  chevronCircleDark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0B0B0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


