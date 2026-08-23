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

const STORAGE_KEY = '@myquro_restaurant_complaints_v1';

export interface ComplaintStoreState {
  complaints: Complaint[];
  isLoading: boolean;
  searchQuery: string;
  selectedStatusTab: 'ALL' | ComplaintStatus;
  selectedPriorityFilter: 'ALL' | ComplaintPriority;
  selectedCategoryFilter: 'ALL' | ComplaintCategory;
  selectedDateFilter: 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH';

  // Core Actions
  loadComplaints: () => Promise<void>;
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

// Initial Rich Default Seed Data
const DEFAULT_COMPLAINTS: Complaint[] = [
  // 1. Rahul Kumar - Open Food Quality (Cold Food)
  {
    id: 'CMP-10492',
    orderId: 'MQ-9082',
    orderNumber: '#MQ-9082',
    customerId: 'CUST-8812',
    customerName: 'Rahul Kumar',
    customerPhone: '+91 98765 43210',
    customerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    customerPastOrdersCount: 14,
    customerPastComplaintsCount: 0,
    outletId: 'OUTLET-01',
    outletName: 'MyQuro Bistro (Indiranagar)',
    orderDate: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    category: 'FOOD_QUALITY',
    categoryLabel: 'Food Quality',
    reason: 'Food was cold on arrival',
    description: 'The Paneer Butter Masala and Butter Naan were completely cold when delivered. The gravy had separated and was not edible.',
    relatedItem: 'Paneer Butter Masala & Butter Naan',
    orderAmount: 420,
    priority: 'HIGH',
    status: 'OPEN',
    evidence: [
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    ],
    messages: [
      {
        id: 'msg-1',
        complaintId: 'CMP-10492',
        senderId: 'CUST-8812',
        senderName: 'Rahul Kumar',
        senderType: 'CUSTOMER',
        message: 'The food was completely cold when I received it. The Paneer Butter Masala was solid cold.',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
    ],
    refundStatus: 'NOT_REQUESTED',
    auditLogs: [
      {
        id: 'aud-1',
        complaintId: 'CMP-10492',
        user: 'Customer (Rahul Kumar)',
        action: 'Complaint Created',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        newStatus: 'OPEN',
        notes: 'Initial complaint filed for Cold Food',
      },
    ],
    responseSlaMinutes: 30,
  },

  // 2. Sneha Reddy - In Progress (Missing Item)
  {
    id: 'CMP-10491',
    orderId: 'MQ-9081',
    orderNumber: '#MQ-9081',
    customerId: 'CUST-7741',
    customerName: 'Sneha Reddy',
    customerPhone: '+91 98451 12345',
    customerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    customerPastOrdersCount: 28,
    customerPastComplaintsCount: 1,
    outletId: 'OUTLET-01',
    outletName: 'MyQuro Bistro (Indiranagar)',
    orderDate: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    firstResponseAt: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
    category: 'ORDER_PACKAGING',
    categoryLabel: 'Order & Packaging',
    reason: 'Missing Garlic Naan and Beverage',
    description: 'Ordered 2x Dal Makhani with 2x Garlic Naan and 1x Masala Lemonade. The Naan and beverage were completely missing from the parcel.',
    relatedItem: 'Garlic Naan & Masala Lemonade',
    orderAmount: 360,
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    evidence: [
      'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&auto=format&fit=crop&q=80',
    ],
    messages: [
      {
        id: 'msg-201',
        complaintId: 'CMP-10491',
        senderId: 'CUST-7741',
        senderName: 'Sneha Reddy',
        senderType: 'CUSTOMER',
        message: 'Hi, 2 items were missing from my order bag: 2x Garlic Naan and 1x Masala Lemonade.',
        timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-202',
        complaintId: 'CMP-10491',
        senderId: 'REST-01',
        senderName: 'MyQuro Kitchen Team',
        senderType: 'RESTAURANT',
        message: 'Hello Sneha, we sincerely apologize for the packing oversight! We are verifying with our dispatch station immediately.',
        timestamp: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-203',
        complaintId: 'CMP-10491',
        senderId: 'CUST-7741',
        senderName: 'Sneha Reddy',
        senderType: 'CUSTOMER',
        message: 'Okay, please issue a refund for the missing items worth ₹130.',
        timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
    ],
    refundStatus: 'NOT_REQUESTED',
    auditLogs: [
      {
        id: 'aud-201',
        complaintId: 'CMP-10491',
        user: 'Customer (Sneha Reddy)',
        action: 'Complaint Created',
        timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
        newStatus: 'OPEN',
      },
      {
        id: 'aud-202',
        complaintId: 'CMP-10491',
        user: 'Restaurant Staff',
        action: 'Restaurant Responded',
        timestamp: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
        previousStatus: 'OPEN',
        newStatus: 'IN_PROGRESS',
        notes: 'First response sent within 15 minutes',
      },
    ],
    responseSlaMinutes: 60,
  },

  // 3. Vikram Singh - Critical Escalated (Hygiene / Food Safety)
  {
    id: 'CMP-10490',
    orderId: 'MQ-9077',
    orderNumber: '#MQ-9077',
    customerId: 'CUST-9022',
    customerName: 'Vikram Singh',
    customerPhone: '+91 99000 88776',
    customerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    customerPastOrdersCount: 6,
    customerPastComplaintsCount: 0,
    outletId: 'OUTLET-01',
    outletName: 'MyQuro Bistro (Indiranagar)',
    orderDate: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    firstResponseAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    category: 'FOOD_QUALITY',
    categoryLabel: 'Food Quality',
    reason: 'Foreign object / Hair found in Salad',
    description: 'Found hair embedded deep inside the dressing of Greek Salad. Highly unacceptable hygiene standard.',
    relatedItem: 'Mediterranean Greek Salad',
    orderAmount: 280,
    priority: 'CRITICAL',
    status: 'ESCALATED',
    evidence: [
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    ],
    messages: [
      {
        id: 'msg-301',
        complaintId: 'CMP-10490',
        senderId: 'CUST-9022',
        senderName: 'Vikram Singh',
        senderType: 'CUSTOMER',
        message: 'There was hair in the salad! This is a serious hygiene violation.',
        timestamp: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-302',
        complaintId: 'CMP-10490',
        senderId: 'REST-01',
        senderName: 'Outlet Manager',
        senderType: 'RESTAURANT',
        message: 'We are deeply concerned and escalating this directly to our central Food Quality audit lead for immediate kitchen station inspection.',
        timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-303',
        complaintId: 'CMP-10490',
        senderId: 'SUPPORT-01',
        senderName: 'MyQuro Safety Team',
        senderType: 'MYQURO_SUPPORT',
        message: 'MyQuro Trust & Safety Team has taken over this ticket. Case ID: #SAFE-9921.',
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      },
    ],
    refundStatus: 'REQUESTED',
    auditLogs: [
      {
        id: 'aud-301',
        complaintId: 'CMP-10490',
        user: 'Customer (Vikram Singh)',
        action: 'Complaint Created',
        timestamp: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
        newStatus: 'OPEN',
      },
      {
        id: 'aud-302',
        complaintId: 'CMP-10490',
        user: 'Outlet Manager',
        action: 'Complaint Escalated',
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        previousStatus: 'IN_PROGRESS',
        newStatus: 'ESCALATED',
        notes: 'Escalated due to critical food safety protocol',
      },
    ],
    responseSlaMinutes: 15,
  },

  // 4. Neha Sharma - Resolved (Taste issue with Full Refund)
  {
    id: 'CMP-10488',
    orderId: 'MQ-9065',
    orderNumber: '#MQ-9065',
    customerId: 'CUST-5519',
    customerName: 'Neha Sharma',
    customerPhone: '+91 98111 22334',
    customerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    customerPastOrdersCount: 42,
    customerPastComplaintsCount: 2,
    outletId: 'OUTLET-01',
    outletName: 'MyQuro Bistro (Indiranagar)',
    orderDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2 + 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2 + 120 * 60 * 1000).toISOString(),
    firstResponseAt: new Date(Date.now() - 86400000 * 2 + 45 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 2 + 120 * 60 * 1000).toISOString(),
    category: 'FOOD_QUALITY',
    categoryLabel: 'Food Quality',
    reason: 'Food taste issue / Excess Salt',
    description: 'The Butterscotch Ice Cream was melted and the pasta was extremely salty.',
    relatedItem: 'Butterscotch & White Sauce Pasta',
    orderAmount: 380,
    priority: 'MEDIUM',
    status: 'RESOLVED',
    evidence: [],
    messages: [
      {
        id: 'msg-401',
        complaintId: 'CMP-10488',
        senderId: 'CUST-5519',
        senderName: 'Neha Sharma',
        senderType: 'CUSTOMER',
        message: 'The pasta was way too salty and ice cream was melted liquid.',
        timestamp: new Date(Date.now() - 86400000 * 2 + 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-402',
        complaintId: 'CMP-10488',
        senderId: 'REST-01',
        senderName: 'MyQuro Bistro',
        senderType: 'RESTAURANT',
        message: 'We are very sorry for this experience Neha. We have processed a 100% full refund of ₹380 directly to your original payment method.',
        timestamp: new Date(Date.now() - 86400000 * 2 + 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-403',
        complaintId: 'CUST-5519',
        senderId: 'CUST-5519',
        senderName: 'Neha Sharma',
        senderType: 'CUSTOMER',
        message: 'Thank you for the prompt resolution. Much appreciated.',
        timestamp: new Date(Date.now() - 86400000 * 2 + 120 * 60 * 1000).toISOString(),
      },
    ],
    resolution: {
      id: 'res-401',
      resolutionType: 'REFUND',
      refundAmount: 380,
      actionTaken: 'Full order refund processed',
      note: 'Processed full ₹380 refund on UPI due to taste and melting issue during delivery.',
      resolvedBy: 'Store Manager (Karan)',
      resolvedAt: new Date(Date.now() - 86400000 * 2 + 120 * 60 * 1000).toISOString(),
      customerAccepted: true,
      customerFeedback: 'Satisfied with quick refund.',
    },
    refundStatus: 'COMPLETED',
    auditLogs: [
      {
        id: 'aud-401',
        complaintId: 'CMP-10488',
        user: 'Customer (Neha Sharma)',
        action: 'Complaint Created',
        timestamp: new Date(Date.now() - 86400000 * 2 + 30 * 60 * 1000).toISOString(),
        newStatus: 'OPEN',
      },
      {
        id: 'aud-402',
        complaintId: 'CMP-10488',
        user: 'Store Manager (Karan)',
        action: 'Resolution Proposed & Refund Issued',
        timestamp: new Date(Date.now() - 86400000 * 2 + 60 * 60 * 1000).toISOString(),
        previousStatus: 'OPEN',
        newStatus: 'AWAITING_CUSTOMER',
        notes: 'Issued ₹380 full refund',
      },
      {
        id: 'aud-403',
        complaintId: 'CMP-10488',
        user: 'Customer (Neha Sharma)',
        action: 'Customer Accepted Resolution',
        timestamp: new Date(Date.now() - 86400000 * 2 + 120 * 60 * 1000).toISOString(),
        previousStatus: 'AWAITING_CUSTOMER',
        newStatus: 'RESOLVED',
      },
    ],
    responseSlaMinutes: 60,
  },

  // 5. Amit Patel - Resolved (Packaging Issue with Replacement Coupon)
  {
    id: 'CMP-10475',
    orderId: 'MQ-9051',
    orderNumber: '#MQ-9051',
    customerId: 'CUST-3310',
    customerName: 'Amit Patel',
    customerPhone: '+91 97777 55443',
    customerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    customerPastOrdersCount: 19,
    customerPastComplaintsCount: 0,
    outletId: 'OUTLET-01',
    outletName: 'MyQuro Bistro (Indiranagar)',
    orderDate: new Date(Date.now() - 86400000 * 4).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 4 + 40 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4 + 90 * 60 * 1000).toISOString(),
    firstResponseAt: new Date(Date.now() - 86400000 * 4 + 50 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 4 + 90 * 60 * 1000).toISOString(),
    category: 'ORDER_PACKAGING',
    categoryLabel: 'Order & Packaging',
    reason: 'Packaging box crushed in transit',
    description: 'Burger box was crushed causing sauce to spill inside bag.',
    relatedItem: 'Signature Crispy Veg Burger',
    orderAmount: 219,
    priority: 'LOW',
    status: 'RESOLVED',
    evidence: [],
    messages: [
      {
        id: 'msg-501',
        complaintId: 'CMP-10475',
        senderId: 'CUST-3310',
        senderName: 'Amit Patel',
        senderType: 'CUSTOMER',
        message: 'The outer box was smashed and sauce leaked everywhere.',
        timestamp: new Date(Date.now() - 86400000 * 4 + 40 * 60 * 1000).toISOString(),
      },
    ],
    resolution: {
      id: 'res-501',
      resolutionType: 'COMPENSATION',
      compensationCode: 'MYQURO100FREE',
      actionTaken: '₹100 courtesy wallet credit issued',
      note: 'Issued ₹100 credit code for packaging inconvenience.',
      resolvedBy: 'Kitchen Support',
      resolvedAt: new Date(Date.now() - 86400000 * 4 + 90 * 60 * 1000).toISOString(),
      customerAccepted: true,
    },
    refundStatus: 'NOT_REQUESTED',
    auditLogs: [
      {
        id: 'aud-501',
        complaintId: 'CMP-10475',
        user: 'Customer (Amit Patel)',
        action: 'Complaint Created',
        timestamp: new Date(Date.now() - 86400000 * 4 + 40 * 60 * 1000).toISOString(),
        newStatus: 'OPEN',
      },
      {
        id: 'aud-502',
        complaintId: 'CMP-10475',
        user: 'Kitchen Support',
        action: 'Complaint Resolved with Coupon',
        timestamp: new Date(Date.now() - 86400000 * 4 + 90 * 60 * 1000).toISOString(),
        previousStatus: 'OPEN',
        newStatus: 'RESOLVED',
      },
    ],
    responseSlaMinutes: 120,
  },
];

export const useComplaintStore = create<ComplaintStoreState>((set, get) => ({
  complaints: [],
  isLoading: true,
  searchQuery: '',
  selectedStatusTab: 'ALL',
  selectedPriorityFilter: 'ALL',
  selectedCategoryFilter: 'ALL',
  selectedDateFilter: 'ALL',

  loadComplaints: async () => {
    set({ isLoading: true });
    try {
      const dataStr = await AsyncStorage.getItem(STORAGE_KEY);
      if (dataStr) {
        set({ complaints: JSON.parse(dataStr), isLoading: false });
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COMPLAINTS));
        set({ complaints: DEFAULT_COMPLAINTS, isLoading: false });
      }
    } catch (e) {
      console.error('Error loading complaints:', e);
      set({ complaints: DEFAULT_COMPLAINTS, isLoading: false });
    }
  },

  createComplaint: async (complaintData) => {
    const nowStr = new Date().toISOString();
    const newComplaint: Complaint = {
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
    newComplaint.auditLogs[0].complaintId = newComplaint.id;

    const updated = [newComplaint, ...get().complaints];
    set({ complaints: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newComplaint;
  },

  sendMessage: async (complaintId, senderType, senderName, messageText, attachmentUrl) => {
    const nowStr = new Date().toISOString();
    const complaints = get().complaints;
    const target = complaints.find((c) => c.id === complaintId);
    if (!target) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      complaintId,
      senderId: senderType === 'RESTAURANT' ? 'REST-01' : senderType === 'CUSTOMER' ? target.customerId : 'SUPPORT-01',
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
      if (refundAmt > target.orderAmount) {
        return {
          success: false,
          error: `Refund amount (₹${refundAmt}) cannot exceed total order amount (₹${target.orderAmount})`,
        };
      }
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
      senderId: 'REST-01',
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
      senderId: 'SUPPORT-01',
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
  // ⚡ Active Complaints: STRICTLY calculating UNRESOLVED complaints (Excluding RESOLVED)
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
    const avgFirstResponseTimeMinutes = withResponse.length > 0 ? Math.round(totalResponseMins / withResponse.length) : 18;

    // Resolution time calculation
    const resolved = complaints.filter((c) => c.status === 'RESOLVED' && c.resolvedAt);
    let totalResolutionMins = 0;
    resolved.forEach((c) => {
      const diffMs = new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime();
      totalResolutionMins += Math.max(1, Math.round(diffMs / 60000));
    });
    const avgResolutionTimeMinutes = resolved.length > 0 ? Math.round(totalResolutionMins / resolved.length) : 138;

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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COMPLAINTS));
    set({ complaints: DEFAULT_COMPLAINTS });
  },
}));
