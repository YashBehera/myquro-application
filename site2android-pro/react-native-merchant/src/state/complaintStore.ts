import { create } from 'zustand';
import {
  Complaint,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory,
  ResolutionType,
  ResolutionRecord,
  Message,
  AuditLog,
  ComplaintStats,
  RepeatedComplaintInsight,
} from '../types/complaint';
import apiClient from '../services/apiClient';

// Helper to resolve active restaurantId directly from authenticated backend session
async function resolveRestaurantId(explicitId?: string): Promise<string | null> {
  if (explicitId) return explicitId;

  try {
    const res = await apiClient.get('/restaurants/my-restaurant');
    return res.data?.restaurant?.id || res.data?.id || null;
  } catch (err) {
    console.warn('Could not resolve restaurant ID from API:', err);
    return null;
  }
}

// Helper to normalize backend records to Complaint interface
function normalizeComplaint(c: any): Complaint {
  const parseJsonField = (val: any, fallback: any) => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return val;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  return {
    id: c.id,
    ticketType: c.ticketType || 'order_complaint',
    orderId: c.orderId || '',
    orderNumber: c.orderNumber || (c.orderId ? `#${String(c.orderId).slice(-5).toUpperCase()}` : '#ORDER'),
    customerId: c.customerId || '',
    customerName: c.customerName || 'Customer',
    customerPhone: c.customerPhone || undefined,
    customerAvatar: c.customerAvatar || undefined,
    customerPastOrdersCount: c.customerPastOrdersCount !== undefined ? Number(c.customerPastOrdersCount) : 0,
    customerPastComplaintsCount: c.customerPastComplaintsCount !== undefined ? Number(c.customerPastComplaintsCount) : 0,
    outletId: c.outletId || '',
    outletName: c.outletName || 'Restaurant Outlet',
    riderId: c.riderId || undefined,
    metadata: parseJsonField(c.metadata, undefined),
    orderDate: c.orderDate ? new Date(c.orderDate).toISOString() : (c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()),
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    firstResponseAt: c.firstResponseAt ? new Date(c.firstResponseAt).toISOString() : undefined,
    resolvedAt: c.resolvedAt ? new Date(c.resolvedAt).toISOString() : undefined,
    category: (c.category || 'FOOD_QUALITY') as ComplaintCategory,
    categoryLabel: c.categoryLabel || (c.category ? String(c.category).replace(/_/g, ' ') : 'Food Quality'),
    reason: c.reason || 'Order Issue',
    description: c.description || '',
    relatedItem: c.relatedItem || undefined,
    orderAmount: Number(c.orderAmount || 0),
    priority: (c.priority || 'MEDIUM') as ComplaintPriority,
    status: (c.status || 'OPEN') as ComplaintStatus,
    evidence: parseJsonField(c.evidence, []),
    messages: parseJsonField(c.messages, []),
    resolution: parseJsonField(c.resolution, undefined),
    refundStatus: c.refundStatus || 'NOT_REQUESTED',
    auditLogs: parseJsonField(c.auditLogs, []),
    responseSlaMinutes: Number(c.responseSlaMinutes || 30),
  };
}

export interface ComplaintStoreState {
  complaints: Complaint[];
  isLoading: boolean;
  searchQuery: string;
  selectedStatusTab: 'ALL' | ComplaintStatus;
  selectedPriorityFilter: 'ALL' | ComplaintPriority;
  selectedCategoryFilter: 'ALL' | ComplaintCategory;
  selectedDateFilter: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH';

  // Core Actions
  loadComplaints: (forceRestaurantId?: string, silent?: boolean) => Promise<void>;
  loadComplaintById: (complaintId: string) => Promise<Complaint | null>;
  createComplaint: (complaintData: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'auditLogs' | 'messages'>) => Promise<Complaint>;
  sendMessage: (
    complaintId: string,
    senderType: 'CUSTOMER' | 'RESTAURANT' | 'RIDER' | 'MYQURO_SUPPORT',
    senderName: string,
    messageText: string,
    attachmentUrl?: string
  ) => Promise<void>;
  updateStatus: (
    complaintId: string,
    newStatus: ComplaintStatus,
    user: string,
    notes?: string
  ) => Promise<void>;
  proposeResolution: (
    complaintId: string,
    resolution: {
      resolutionType: ResolutionType;
      refundAmount?: number;
      replacementItem?: string;
      compensationCode?: string;
      actionTaken: string;
      note: string;
      resolvedBy: string;
    },
    directResolve?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  acceptResolution: (complaintId: string, feedback?: string) => Promise<void>;
  rejectResolution: (complaintId: string, reason: string) => Promise<void>;
  escalateComplaint: (complaintId: string, reason: string, user: string) => Promise<void>;

  // Filters & Selection
  setSearchQuery: (query: string) => void;
  setSelectedStatusTab: (tab: ComplaintStoreState['selectedStatusTab']) => void;
  setSelectedPriorityFilter: (filter: ComplaintStoreState['selectedPriorityFilter']) => void;
  setSelectedCategoryFilter: (filter: ComplaintStoreState['selectedCategoryFilter']) => void;
  setSelectedDateFilter: (filter: ComplaintStoreState['selectedDateFilter']) => void;

  // Query Helpers
  getActiveComplaintsCount: () => number;
  getFilteredComplaints: () => Complaint[];
  getComplaintById: (id: string) => Complaint | undefined;
  getComplaintStats: () => ComplaintStats;
  resetToDefaultComplaints: () => Promise<void>;
}

export const useComplaintStore = create<ComplaintStoreState>((set, get) => ({
  complaints: [],
  isLoading: false,
  searchQuery: '',
  selectedStatusTab: 'ALL',
  selectedPriorityFilter: 'ALL',
  selectedCategoryFilter: 'ALL',
  selectedDateFilter: 'ALL',

  loadComplaints: async (forceRestaurantId, silent = false) => {
    if (!silent) set({ isLoading: true });
    try {
      const restId = await resolveRestaurantId(forceRestaurantId);
      if (!restId) {
        if (!silent) set({ complaints: [], isLoading: false });
        return;
      }

      const res = await apiClient.get(`/complaints/merchant/${restId}?ticketType=order_complaint`);
      if (res.data?.success && Array.isArray(res.data?.complaints)) {
        const normalized = res.data.complaints.map(normalizeComplaint);
        set({ complaints: normalized, isLoading: false });
        return;
      }
      if (!silent) set({ isLoading: false });
    } catch (e) {
      console.error('Error in loadComplaints:', e);
      if (!silent) set({ isLoading: false });
    }
  },

  loadComplaintById: async (complaintId) => {
    try {
      const res = await apiClient.get(`/complaints/${complaintId}`);
      if (res.data?.success && res.data?.complaint) {
        const normalized = normalizeComplaint(res.data.complaint);
        const existingList = get().complaints;
        const exists = existingList.some((c) => c.id === normalized.id);
        const updated = exists
          ? existingList.map((c) => (c.id === normalized.id ? { ...c, ...normalized, customerPastOrdersCount: normalized.customerPastOrdersCount || c.customerPastOrdersCount } : c))
          : [normalized, ...existingList];
        set({ complaints: updated });
        return normalized;
      }
      return null;
    } catch (err) {
      console.warn('Error fetching single complaint:', err);
      return null;
    }
  },

  createComplaint: async (complaintData) => {
    const res = await apiClient.post('/complaints', complaintData);
    if (!res.data?.success || !res.data?.complaint) {
      throw new Error(res.data?.error || 'Failed to register complaint on server');
    }
    const createdComplaint = normalizeComplaint(res.data.complaint);
    set({ complaints: [createdComplaint, ...get().complaints] });
    return createdComplaint;
  },

  sendMessage: async (complaintId, senderType, senderName, messageText, attachmentUrl) => {
    const target = get().complaints.find((c) => c.id === complaintId);
    const resolvedSenderId =
      senderType === 'RESTAURANT'
        ? target?.outletId || 'RESTAURANT'
        : senderType === 'CUSTOMER'
        ? target?.customerId || 'CUSTOMER'
        : senderType === 'RIDER'
        ? target?.riderId || 'RIDER'
        : 'MYQURO_SUPPORT';

    const res = await apiClient.post(`/complaints/${complaintId}/message`, {
      senderId: resolvedSenderId,
      senderName,
      senderType,
      message: messageText,
      attachmentUrl,
    });

    if (!res.data?.success || !res.data?.complaint) {
      throw new Error(res.data?.error || 'Failed to send complaint message');
    }

    const updatedRecord = normalizeComplaint(res.data.complaint);
    set({
      complaints: get().complaints.map((c) =>
        c.id === complaintId
          ? { ...updatedRecord, customerPastOrdersCount: c.customerPastOrdersCount }
          : c
      ),
    });
  },

  updateStatus: async (complaintId, newStatus, user, notes) => {
    const res = await apiClient.patch(`/complaints/${complaintId}/status`, {
      newStatus,
      user,
      notes,
    });
    if (!res.data?.success || !res.data?.complaint) {
      throw new Error(res.data?.error || 'Failed to update complaint status');
    }
    const updatedRecord = normalizeComplaint(res.data.complaint);
    set({
      complaints: get().complaints.map((c) =>
        c.id === complaintId
          ? { ...updatedRecord, customerPastOrdersCount: c.customerPastOrdersCount }
          : c
      ),
    });
  },

  proposeResolution: async (complaintId, resolutionData, directResolve = false) => {
    const target = get().complaints.find((c) => c.id === complaintId);
    if (!target) return { success: false, error: 'Complaint not found' };

    if (resolutionData.resolutionType === 'REFUND') {
      const refundAmt = resolutionData.refundAmount || 0;
      if (refundAmt <= 0) {
        return { success: false, error: 'Refund amount must be greater than ₹0' };
      }
      if (target.orderAmount > 0 && refundAmt > target.orderAmount) {
        return {
          success: false,
          error: `Refund amount (₹${refundAmt}) cannot exceed total order amount (₹${target.orderAmount})`,
        };
      }
    }

    try {
      const res = await apiClient.post(`/complaints/${complaintId}/resolve`, {
        ...resolutionData,
        directResolve,
      });
      if (!res.data?.success || !res.data?.complaint) {
        return { success: false, error: res.data?.error || 'Failed to submit resolution' };
      }
      const updatedRecord = normalizeComplaint(res.data.complaint);
      set({
        complaints: get().complaints.map((c) =>
          c.id === complaintId
            ? { ...updatedRecord, customerPastOrdersCount: c.customerPastOrdersCount }
            : c
        ),
      });
      return { success: true };
    } catch (apiErr: any) {
      return {
        success: false,
        error: apiErr?.response?.data?.error || apiErr?.message || 'Failed to reach backend server',
      };
    }
  },

  acceptResolution: async (complaintId, feedback) => {
    const res = await apiClient.post(`/complaints/${complaintId}/accept-resolution`, { feedback });
    if (!res.data?.success || !res.data?.complaint) {
      throw new Error(res.data?.error || 'Failed to accept resolution');
    }
    const updatedRecord = normalizeComplaint(res.data.complaint);
    set({
      complaints: get().complaints.map((c) =>
        c.id === complaintId
          ? { ...updatedRecord, customerPastOrdersCount: c.customerPastOrdersCount }
          : c
      ),
    });
  },

  rejectResolution: async (complaintId, reason) => {
    const res = await apiClient.post(`/complaints/${complaintId}/reject-resolution`, { reason });
    if (!res.data?.success || !res.data?.complaint) {
      throw new Error(res.data?.error || 'Failed to reject resolution');
    }
    const updatedRecord = normalizeComplaint(res.data.complaint);
    set({
      complaints: get().complaints.map((c) =>
        c.id === complaintId
          ? { ...updatedRecord, customerPastOrdersCount: c.customerPastOrdersCount }
          : c
      ),
    });
  },

  escalateComplaint: async (complaintId, reason, user) => {
    const res = await apiClient.patch(`/complaints/${complaintId}/status`, {
      newStatus: 'ESCALATED',
      user,
      notes: reason,
    });
    if (!res.data?.success || !res.data?.complaint) {
      throw new Error(res.data?.error || 'Failed to escalate complaint');
    }
    const updatedRecord = normalizeComplaint(res.data.complaint);
    set({
      complaints: get().complaints.map((c) =>
        c.id === complaintId
          ? { ...updatedRecord, customerPastOrdersCount: c.customerPastOrdersCount }
          : c
      ),
    });
  },

  // ---------------- Selection & Filters ----------------
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedStatusTab: (tab) => set({ selectedStatusTab: tab }),
  setSelectedPriorityFilter: (filter) => set({ selectedPriorityFilter: filter }),
  setSelectedCategoryFilter: (filter) => set({ selectedCategoryFilter: filter }),
  setSelectedDateFilter: (filter) => set({ selectedDateFilter: filter }),

  // ---------------- Query Helpers ----------------
  getActiveComplaintsCount: () => {
    return get().complaints.filter((c) => c.status !== 'RESOLVED').length;
  },

  getComplaintById: (id) => {
    return get().complaints.find((c) => c.id === id);
  },

  getFilteredComplaints: () => {
    const {
      complaints,
      searchQuery,
      selectedStatusTab,
      selectedPriorityFilter,
      selectedCategoryFilter,
      selectedDateFilter,
    } = get();

    const q = searchQuery.trim().toLowerCase();

    return complaints.filter((c) => {
      // Search
      if (q) {
        const matchId = c.id.toLowerCase().includes(q);
        const matchOrder = c.orderNumber.toLowerCase().includes(q) || c.orderId.toLowerCase().includes(q);
        const matchCustomer = c.customerName.toLowerCase().includes(q) || c.customerId.toLowerCase().includes(q);
        const matchReason = c.reason.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
        if (!matchId && !matchOrder && !matchCustomer && !matchReason) return false;
      }

      // Status Tab
      if (selectedStatusTab !== 'ALL') {
        if (c.status !== selectedStatusTab) return false;
      }

      // Priority
      if (selectedPriorityFilter !== 'ALL') {
        if (c.priority !== selectedPriorityFilter) return false;
      }

      // Category
      if (selectedCategoryFilter !== 'ALL') {
        if (c.category !== selectedCategoryFilter) return false;
      }

      // Date Range
      if (selectedDateFilter !== 'ALL') {
        const created = new Date(c.createdAt).getTime();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        if (selectedDateFilter === 'TODAY') {
          if (created < startOfToday) return false;
        } else if (selectedDateFilter === 'YESTERDAY') {
          const startOfYesterday = startOfToday - 86400000;
          if (created < startOfYesterday || created >= startOfToday) return false;
        } else if (selectedDateFilter === 'THIS_WEEK') {
          const startOfWeek = startOfToday - now.getDay() * 86400000;
          if (created < startOfWeek) return false;
        } else if (selectedDateFilter === 'THIS_MONTH') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          if (created < startOfMonth) return false;
        }
      }

      return true;
    });
  },

  getComplaintStats: () => {
    const complaints = get().complaints;
    const totalComplaints = complaints.length;

    const openCount = complaints.filter((c) => c.status === 'OPEN').length;
    const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
    const awaitingCustomerCount = complaints.filter((c) => c.status === 'AWAITING_CUSTOMER').length;
    const escalatedCount = complaints.filter((c) => c.status === 'ESCALATED').length;
    const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;
    const reopenedCount = complaints.filter((c) => c.status === 'REOPENED').length;
    const activeComplaints = openCount + inProgressCount + awaitingCustomerCount + escalatedCount + reopenedCount;

    // Response time calculation
    const withResponse = complaints.filter((c) => c.firstResponseAt);
    let totalResponseMins = 0;
    withResponse.forEach((c) => {
      const diffMs = new Date(c.firstResponseAt!).getTime() - new Date(c.createdAt).getTime();
      totalResponseMins += Math.max(1, Math.round(diffMs / 60000));
    });
    const avgFirstResponseTimeMinutes = withResponse.length > 0 ? Math.round(totalResponseMins / withResponse.length) : 0;

    // Resolution time calculation
    const resolved = complaints.filter((c) => c.status === 'RESOLVED' && c.resolvedAt);
    let totalResolutionMins = 0;
    resolved.forEach((c) => {
      const diffMs = new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime();
      totalResolutionMins += Math.max(1, Math.round(diffMs / 60000));
    });
    const avgResolutionTimeMinutes = resolved.length > 0 ? Math.round(totalResolutionMins / resolved.length) : 0;

    const resolutionRatePercent = totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 100;

    // Repeated complaint item detection
    const itemMap = new Map<string, { count: number; primaryReason: string; category: string }>();
    complaints.forEach((c) => {
      if (c.relatedItem) {
        const existing = itemMap.get(c.relatedItem) || { count: 0, primaryReason: c.reason, category: c.categoryLabel };
        existing.count += 1;
        itemMap.set(c.relatedItem, existing);
      }
    });

    const repeatedInsights: RepeatedComplaintInsight[] = [];
    itemMap.forEach((val, key) => {
      if (val.count >= 1) {
        repeatedInsights.push({
          itemName: key,
          complaintCount: val.count,
          primaryReason: val.primaryReason,
          category: val.category,
        });
      }
    });

    return {
      activeComplaints,
      openCount,
      inProgressCount,
      awaitingCustomerCount,
      escalatedCount,
      resolvedCount,
      reopenedCount,
      totalComplaints,
      avgFirstResponseTimeMinutes,
      avgResolutionTimeMinutes,
      resolutionRatePercent,
      repeatedInsights,
    };
  },

  resetToDefaultComplaints: async () => {
    await get().loadComplaints();
  },
}));
