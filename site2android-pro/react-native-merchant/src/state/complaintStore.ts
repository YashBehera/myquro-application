import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const STORAGE_KEY = '@myquro_restaurant_complaints_v1';
const RESTAURANT_CACHE_KEY = '@myquro_active_restaurant_id';

// Helper to resolve active restaurantId
async function resolveRestaurantId(explicitId?: string): Promise<string | null> {
  if (explicitId) {
    await AsyncStorage.setItem(RESTAURANT_CACHE_KEY, explicitId);
    return explicitId;
  }

  try {
    const res = await apiClient.get('/restaurants/my-restaurant');
    const id = res.data?.restaurant?.id || res.data?.id;
    if (id) {
      await AsyncStorage.setItem(RESTAURANT_CACHE_KEY, id);
      return id;
    }
  } catch (err) {
    console.warn('Could not resolve restaurant ID from API:', err);
  }

  return await AsyncStorage.getItem(RESTAURANT_CACHE_KEY);
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
    orderId: c.orderId || '',
    orderNumber: c.orderNumber || (c.orderId ? `#${c.orderId.slice(-5).toUpperCase()}` : '#MQ-ORDER'),
    customerId: c.customerId || 'CUST',
    customerName: c.customerName || 'Customer',
    customerPhone: c.customerPhone || undefined,
    customerAvatar: c.customerAvatar || undefined,
    customerPastOrdersCount: Number(c.customerPastOrdersCount || 0),
    customerPastComplaintsCount: Number(c.customerPastComplaintsCount || 0),
    outletId: c.outletId || '',
    outletName: c.outletName || 'Restaurant Outlet',
    orderDate: c.orderDate ? new Date(c.orderDate).toISOString() : (c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()),
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    firstResponseAt: c.firstResponseAt ? new Date(c.firstResponseAt).toISOString() : undefined,
    resolvedAt: c.resolvedAt ? new Date(c.resolvedAt).toISOString() : undefined,
    category: (c.category || 'FOOD_QUALITY') as ComplaintCategory,
    categoryLabel: c.categoryLabel || (c.category ? c.category.replace(/_/g, ' ') : 'Food Quality'),
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
  loadComplaints: (forceRestaurantId?: string) => Promise<void>;
  createComplaint: (complaintData: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'auditLogs' | 'messages'>) => Promise<Complaint>;
  sendMessage: (
    complaintId: string,
    senderType: 'CUSTOMER' | 'RESTAURANT' | 'MYQURO_SUPPORT',
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

  loadComplaints: async (forceRestaurantId) => {
    set({ isLoading: true });
    try {
      const restId = await resolveRestaurantId(forceRestaurantId);
      if (restId) {
        try {
          const res = await apiClient.get(`/complaints/merchant/${restId}`);
          if (res.data?.success && Array.isArray(res.data?.complaints)) {
            const normalized = res.data.complaints.map(normalizeComplaint);
            set({ complaints: normalized, isLoading: false });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            return;
          }
        } catch (apiErr) {
          console.warn('Backend /complaints/merchant error, falling back to cache:', apiErr);
        }
      }

      // Fallback to cached data if offline or network unavailable
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            set({ complaints: parsed.map(normalizeComplaint), isLoading: false });
            return;
          }
        } catch {
          // ignore parsing error
        }
      }

      set({ complaints: [], isLoading: false });
    } catch (e) {
      console.error('Error in loadComplaints:', e);
      set({ complaints: [], isLoading: false });
    }
  },

  createComplaint: async (complaintData) => {
    const nowStr = new Date().toISOString();
    let createdComplaint: Complaint;

    try {
      const res = await apiClient.post('/complaints', complaintData);
      if (res.data?.success && res.data?.complaint) {
        createdComplaint = normalizeComplaint(res.data.complaint);
      } else {
        throw new Error('Invalid backend response');
      }
    } catch (err) {
      console.warn('API error creating complaint, creating locally:', err);
      createdComplaint = {
        ...complaintData,
        id: `CMP-${Math.floor(10000 + Math.random() * 90000)}`,
        createdAt: nowStr,
        updatedAt: nowStr,
        messages: [],
        auditLogs: [
          {
            id: `aud-${Date.now()}`,
            complaintId: '',
            user: `Customer (${complaintData.customerName})`,
            action: 'Complaint Created',
            timestamp: nowStr,
            newStatus: 'OPEN',
            notes: complaintData.reason,
          },
        ],
      };
      createdComplaint.auditLogs[0].complaintId = createdComplaint.id;
    }

    const updated = [createdComplaint, ...get().complaints];
    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return createdComplaint;
  },

  sendMessage: async (complaintId, senderType, senderName, messageText, attachmentUrl) => {
    const nowStr = new Date().toISOString();
    const complaints = get().complaints;
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return;

    const resolvedSenderId =
      senderType === 'RESTAURANT'
        ? target.outletId || 'RESTAURANT'
        : senderType === 'CUSTOMER'
        ? target.customerId
        : 'MYQURO_SUPPORT';

    // Call backend API
    try {
      await apiClient.post(`/complaints/${complaintId}/message`, {
        senderId: resolvedSenderId,
        senderName,
        senderType,
        message: messageText,
        attachmentUrl,
      });
    } catch (apiErr) {
      console.warn('API error in sendMessage, applying optimistic local state:', apiErr);
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      complaintId,
      senderId: resolvedSenderId,
      senderName,
      senderType,
      message: messageText,
      timestamp: nowStr,
      attachmentUrl,
    };

    let nextStatus: ComplaintStatus = target.status;
    let firstResponse = target.firstResponseAt;

    if (senderType === 'RESTAURANT') {
      if (!firstResponse) {
        firstResponse = nowStr;
      }
      if (target.status === 'OPEN' || target.status === 'REOPENED') {
        nextStatus = 'IN_PROGRESS';
      }
    } else if (senderType === 'CUSTOMER') {
      if (target.status === 'AWAITING_CUSTOMER') {
        nextStatus = 'IN_PROGRESS';
      }
    }

    const newAuditLog: AuditLog = {
      id: `aud-${Date.now()}`,
      complaintId,
      user: senderName,
      action: `${senderType === 'RESTAURANT' ? 'Restaurant' : senderType === 'CUSTOMER' ? 'Customer' : 'Support'} Message Sent`,
      timestamp: nowStr,
      previousStatus: target.status,
      newStatus: nextStatus,
    };

    const updated = complaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: nextStatus,
          firstResponseAt: firstResponse,
          updatedAt: nowStr,
          messages: [...c.messages, newMessage],
          auditLogs: [...c.auditLogs, newAuditLog],
        };
      }
      return c;
    });

    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  updateStatus: async (complaintId, newStatus, user, notes) => {
    const nowStr = new Date().toISOString();
    const complaints = get().complaints;
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return;

    try {
      await apiClient.patch(`/complaints/${complaintId}/status`, {
        newStatus,
        user,
        notes,
      });
    } catch (apiErr) {
      console.warn('API error in updateStatus, applying optimistic local state:', apiErr);
    }

    const newAuditLog: AuditLog = {
      id: `aud-${Date.now()}`,
      complaintId,
      user,
      action: `Status Changed to ${newStatus}`,
      timestamp: nowStr,
      previousStatus: target.status,
      newStatus,
      notes,
    };

    const updated = complaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: newStatus,
          updatedAt: nowStr,
          resolvedAt: newStatus === 'RESOLVED' ? nowStr : c.resolvedAt,
          auditLogs: [...c.auditLogs, newAuditLog],
        };
      }
      return c;
    });

    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  proposeResolution: async (complaintId, resolutionData, directResolve = false) => {
    const complaints = get().complaints;
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return { success: false, error: 'Complaint not found' };

    // 🛡️ Refund Safety Cap: Backend validation ensuring refund <= order amount
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
      await apiClient.post(`/complaints/${complaintId}/resolve`, {
        ...resolutionData,
        directResolve,
      });
    } catch (apiErr) {
      console.warn('API error in proposeResolution, applying local resolution:', apiErr);
    }

    const nowStr = new Date().toISOString();
    const newStatus: ComplaintStatus = directResolve ? 'RESOLVED' : 'AWAITING_CUSTOMER';

    const resolutionRecord: ResolutionRecord = {
      id: `res-${Date.now()}`,
      ...resolutionData,
      resolvedAt: nowStr,
      customerAccepted: directResolve ? true : undefined,
    };

    const systemMessage: Message = {
      id: `msg-sys-${Date.now()}`,
      complaintId,
      senderId: target.outletId || 'RESTAURANT',
      senderName: resolutionData.resolvedBy || 'Restaurant Manager',
      senderType: 'RESTAURANT',
      message: `Resolution Proposed: ${resolutionData.actionTaken}. Note: ${resolutionData.note}${
        resolutionData.refundAmount ? ` (Refund: ₹${resolutionData.refundAmount})` : ''
      }`,
      timestamp: nowStr,
    };

    const newAuditLog: AuditLog = {
      id: `aud-${Date.now()}`,
      complaintId,
      user: resolutionData.resolvedBy,
      action: directResolve ? 'Complaint Resolved' : 'Resolution Proposed to Customer',
      timestamp: nowStr,
      previousStatus: target.status,
      newStatus,
      notes: `${resolutionData.actionTaken}: ${resolutionData.note}`,
    };

    const updated = complaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: newStatus,
          resolution: resolutionRecord,
          refundStatus:
            resolutionData.resolutionType === 'REFUND'
              ? directResolve
                ? ('COMPLETED' as const)
                : ('REQUESTED' as const)
              : c.refundStatus,
          resolvedAt: directResolve ? nowStr : c.resolvedAt,
          updatedAt: nowStr,
          messages: [...c.messages, systemMessage],
          auditLogs: [...c.auditLogs, newAuditLog],
        };
      }
      return c;
    });

    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { success: true };
  },

  acceptResolution: async (complaintId, feedback) => {
    const nowStr = new Date().toISOString();
    const complaints = get().complaints;
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return;

    try {
      await apiClient.post(`/complaints/${complaintId}/accept-resolution`, { feedback });
    } catch (apiErr) {
      console.warn('API error in acceptResolution:', apiErr);
    }

    const newAuditLog: AuditLog = {
      id: `aud-${Date.now()}`,
      complaintId,
      user: `Customer (${target.customerName})`,
      action: 'Customer Accepted Resolution',
      timestamp: nowStr,
      previousStatus: target.status,
      newStatus: 'RESOLVED',
      notes: feedback || 'Customer marked resolution as accepted',
    };

    const customerMsg: Message = {
      id: `msg-acc-${Date.now()}`,
      complaintId,
      senderId: target.customerId,
      senderName: target.customerName,
      senderType: 'CUSTOMER',
      message: `I have accepted the resolution. ${feedback ? `Feedback: "${feedback}"` : 'Thank you for resolving this.'}`,
      timestamp: nowStr,
    };

    const updated = complaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: 'RESOLVED' as const,
          resolvedAt: nowStr,
          updatedAt: nowStr,
          refundStatus: c.refundStatus === 'REQUESTED' ? ('COMPLETED' as const) : c.refundStatus,
          resolution: c.resolution
            ? { ...c.resolution, customerAccepted: true, customerFeedback: feedback }
            : undefined,
          messages: [...c.messages, customerMsg],
          auditLogs: [...c.auditLogs, newAuditLog],
        };
      }
      return c;
    });

    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  rejectResolution: async (complaintId, reason) => {
    const nowStr = new Date().toISOString();
    const complaints = get().complaints;
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return;

    try {
      await apiClient.post(`/complaints/${complaintId}/reject-resolution`, { reason });
    } catch (apiErr) {
      console.warn('API error in rejectResolution:', apiErr);
    }

    const newAuditLog: AuditLog = {
      id: `aud-${Date.now()}`,
      complaintId,
      user: `Customer (${target.customerName})`,
      action: 'Customer Reopened Complaint',
      timestamp: nowStr,
      previousStatus: target.status,
      newStatus: 'REOPENED',
      notes: reason,
    };

    const customerMsg: Message = {
      id: `msg-rej-${Date.now()}`,
      complaintId,
      senderId: target.customerId,
      senderName: target.customerName,
      senderType: 'CUSTOMER',
      message: `I request further assistance: "${reason}"`,
      timestamp: nowStr,
    };

    const updated = complaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: 'REOPENED' as const,
          updatedAt: nowStr,
          resolution: c.resolution ? { ...c.resolution, customerAccepted: false } : undefined,
          messages: [...c.messages, customerMsg],
          auditLogs: [...c.auditLogs, newAuditLog],
        };
      }
      return c;
    });

    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  escalateComplaint: async (complaintId, reason, user) => {
    const nowStr = new Date().toISOString();
    const complaints = get().complaints;
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return;

    try {
      await apiClient.patch(`/complaints/${complaintId}/status`, {
        newStatus: 'ESCALATED',
        user,
        notes: reason,
      });
    } catch (apiErr) {
      console.warn('API error in escalateComplaint:', apiErr);
    }

    const newAuditLog: AuditLog = {
      id: `aud-${Date.now()}`,
      complaintId,
      user,
      action: 'Complaint Escalated to MyQuro Central Support',
      timestamp: nowStr,
      previousStatus: target.status,
      newStatus: 'ESCALATED',
      notes: reason,
    };

    const escalationMsg: Message = {
      id: `msg-esc-${Date.now()}`,
      complaintId,
      senderId: 'MYQURO_SUPPORT',
      senderName: 'MyQuro Central Support',
      senderType: 'MYQURO_SUPPORT',
      message: `Ticket escalated to Central Escalations Team. Reason: "${reason}". Senior manager assigned.`,
      timestamp: nowStr,
    };

    const updated = complaints.map((c) => {
      if (c.id === complaintId) {
        return {
          ...c,
          status: 'ESCALATED' as const,
          updatedAt: nowStr,
          messages: [...c.messages, escalationMsg],
          auditLogs: [...c.auditLogs, newAuditLog],
        };
      }
      return c;
    });

    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
    await AsyncStorage.removeItem(STORAGE_KEY);
    await get().loadComplaints();
  },
}));
