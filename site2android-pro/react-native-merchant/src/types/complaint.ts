export type ComplaintStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'AWAITING_CUSTOMER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'REOPENED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintCategory =
  | 'FOOD_QUALITY'
  | 'RESTAURANT_OUTLET'
  | 'ORDER_PACKAGING'
  | 'OTHER';

export type ResolutionType =
  | 'REFUND'
  | 'REPLACEMENT'
  | 'COMPENSATION'
  | 'APOLOGY_EXPLANATION'
  | 'INVESTIGATION';

export type RefundStatus =
  | 'NOT_REQUESTED'
  | 'REQUESTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface Message {
  id: string;
  complaintId: string;
  senderId: string;
  senderName: string;
  senderType: 'CUSTOMER' | 'RESTAURANT' | 'MYQURO_SUPPORT';
  message: string;
  timestamp: string; // ISO String
  attachmentUrl?: string;
}

export interface AuditLog {
  id: string;
  complaintId: string;
  user: string;
  action: string;
  timestamp: string; // ISO String
  previousStatus?: ComplaintStatus;
  newStatus?: ComplaintStatus;
  notes?: string;
}

export interface ResolutionRecord {
  id: string;
  resolutionType: ResolutionType;
  refundAmount?: number;
  replacementItem?: string;
  compensationCode?: string;
  actionTaken: string;
  note: string;
  resolvedBy: string;
  resolvedAt: string; // ISO String
  customerAccepted?: boolean;
  customerFeedback?: string;
}

export interface Complaint {
  id: string;
  orderId: string;
  orderNumber: string; // e.g. "#MQ-10294"
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  customerPastOrdersCount?: number;
  customerPastComplaintsCount?: number;
  outletId: string;
  outletName: string;
  orderDate: string; // ISO String
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  firstResponseAt?: string; // ISO String
  resolvedAt?: string; // ISO String
  category: ComplaintCategory;
  categoryLabel: string;
  reason: string;
  description: string;
  relatedItem?: string;
  orderAmount: number;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  evidence: string[]; // Image URLs
  messages: Message[];
  resolution?: ResolutionRecord;
  refundStatus: RefundStatus;
  auditLogs: AuditLog[];
  responseSlaMinutes: number; // e.g. 15, 30, 60, 120
}

export interface RepeatedComplaintInsight {
  itemName: string;
  complaintCount: number;
  primaryReason: string;
  category: string;
}

export interface ComplaintStats {
  activeComplaints: number;
  openCount: number;
  inProgressCount: number;
  awaitingCustomerCount: number;
  escalatedCount: number;
  resolvedCount: number;
  reopenedCount: number;
  totalComplaints: number;
  avgFirstResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  resolutionRatePercent: number;
  repeatedInsights: RepeatedComplaintInsight[];
}
