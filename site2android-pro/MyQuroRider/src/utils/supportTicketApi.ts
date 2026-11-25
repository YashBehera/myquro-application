import { BACKEND_URL } from '@/config';

export interface SubmitRiderTicketParams {
  sessionToken: string | null | undefined;
  category: string;
  subject: string;
  description: string;
  orderId?: string | null;
  outletId?: string | null;
  relatedItem?: string | null;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface RiderTicketResult {
  success: boolean;
  ticket?: any;
  error?: string;
}

/**
 * Submit a real rider support ticket to the backend database.
 * Never returns fabricated local ticket IDs on network or auth failure.
 */
export async function submitRiderSupportTicket(
  params: SubmitRiderTicketParams
): Promise<RiderTicketResult> {
  if (!params.sessionToken) {
    return {
      success: false,
      error: 'You are not signed in. Please sign in to submit a support ticket.',
    };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/delivery/rider/support-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.sessionToken}`,
        Origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        category: params.category,
        subject: params.subject,
        description: params.description,
        ...(params.orderId ? { orderId: params.orderId } : {}),
        ...(params.outletId ? { outletId: params.outletId } : {}),
        ...(params.relatedItem ? { relatedItem: params.relatedItem } : {}),
        ...(params.attachments && params.attachments.length > 0 ? { attachments: params.attachments } : {}),
        metadata: params.metadata || {},
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.ticket?.id) {
      return {
        success: false,
        error: data?.error || data?.message || 'Could not submit your support ticket to the server.',
      };
    }

    return { success: true, ticket: data.ticket };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while submitting support ticket. Please try again.',
    };
  }
}

/**
 * Append a real rider message or photo attachment to an existing complaint/ticket.
 */
export async function sendRiderTicketMessage(params: {
  sessionToken: string | null | undefined;
  ticketId: string;
  senderId?: string | null;
  senderName?: string | null;
  message: string;
  attachmentUrl?: string | null;
}): Promise<{ success: boolean; complaint?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/complaints/${params.ticketId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(params.sessionToken ? { Authorization: `Bearer ${params.sessionToken}` } : {}),
      },
      body: JSON.stringify({
        senderId: params.senderId || 'RIDER',
        senderName: params.senderName || 'Delivery Partner',
        senderType: 'RIDER',
        message: params.message,
        ...(params.attachmentUrl ? { attachmentUrl: params.attachmentUrl } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.complaint) {
      return {
        success: false,
        error: data?.error || 'Could not send reply to server.',
      };
    }

    return { success: true, complaint: data.complaint };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while sending reply.',
    };
  }
}

export function formatDynamicFullDate(d: Date = new Date()): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

export function formatPreviousWeekDateRange(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${start.getDate()} ${months[start.getMonth()]} to ${end.getDate()} ${months[end.getMonth()]}`;
}
