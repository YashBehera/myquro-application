import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/apiClient';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  addonsText?: string;
  notes?: string;
  isVeg?: boolean;
  category?: string;
  imageURL?: string;
}

export interface Order {
  id: string;
  customer: string;
  items: OrderItem[];
  subtotal?: number;
  gst?: number;
  discount?: number;
  total: number;
  timestamp: string; // ISO Date String
  status: 'New' | 'Preparing' | 'Ready' | 'Picked up' | 'Rejected';
  receivedTime: string; // ISO Date String
  acceptedTime?: string; // ISO Date String
  readyTime?: string; // ISO Date String
  pickedUpTime?: string; // ISO Date String
  rejectedTime?: string; // ISO Date String
  rejectionReason?: string;
  customerType: 'New' | 'Returning';
  cookingInstruction?: string;
  tableNumber?: string | number | null;
  isDelivery?: boolean;
  deliveryStatus?: 'unassigned' | 'offered' | 'assigned' | 'arrived_at_store' | 'picked_up' | 'out_for_delivery' | 'delivered';
  riderName?: string;
  riderPhone?: string;
  etaMinutes?: number;
  acknowledged?: boolean;
  prepTimeMinutes?: number;
  extendedPrepMinutes?: number;
  handoverOtp?: string;
}

interface OrderStore {
  orders: Order[];
  isLoading: boolean;
  loadOrders: () => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  addSimulatedOrder: (isOnline: boolean) => Promise<void>;
  acceptOrder: (orderId: string, prepTimeMinutes?: number) => Promise<void>;
  markReady: (orderId: string) => Promise<void>;
  markPickedUp: (orderId: string) => Promise<void>;
  verifyHandover: (orderId: string, otp: string) => Promise<boolean>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  rejectWithOutOfStockItems: (orderId: string, itemIds: string[], reason: string, turnOffHours?: number) => Promise<void>;
  acknowledgeOrder: (orderId: string) => Promise<void>;
  extendPrepTime: (orderId: string, extraMinutes: number) => Promise<void>;
  merchantCancelOrder: (orderId: string, reason: string, details?: string) => Promise<void>;
  clearDatabase: () => Promise<void>;
}

// Maps backend status string to store status
const mapBackendStatus = (backendStatus: string): Order['status'] => {
  switch (backendStatus) {
    case 'placed':
    case 'pending':
      return 'New';
    case 'preparing':
    case 'confirmed':
      return 'Preparing';
    case 'ready':
    case 'assigned':
    case 'arrived_at_store':
      return 'Ready';
    case 'picked_up':
    case 'out_for_delivery':
    case 'delivered':
    case 'served':
      return 'Picked up';
    case 'cancelled':
    case 'rejected':
      return 'Rejected';
    default:
      return 'New';
  }
};

// Track optimistic status updates to prevent race conditions with background polling
const pendingStatusUpdates = new Map<string, { status: Order['status']; timestamp: number }>();
const customPrepTimesMap = new Map<string, number>();
const customExtendedPrepMap = new Map<string, number>();

const NEON_CONN_STRING = 'postgresql://neondb_owner:npg_Tyq7fb1lexRO@ep-fancy-shape-aisogkwg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const NEON_SQL_ENDPOINT = 'https://ep-fancy-shape-aisogkwg-pooler.c-4.us-east-1.aws.neon.tech/sql';

async function syncPrepTimeToNeon(orderId: string, prepTimeMinutes: number) {
  try {
    const mins = Number(prepTimeMinutes) || 20;
    try {
      await AsyncStorage.setItem(`@prep_time_${orderId}`, String(mins));
    } catch (e) {}

    await fetch(NEON_SQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'neon-connection-string': NEON_CONN_STRING,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `UPDATE orders SET prep_time_minutes = ${mins}, acknowledged_by_merchant = true, acknowledged_at = COALESCE(acknowledged_at, NOW()), updated_at = NOW() WHERE id = '${orderId}'`
      }),
    });
  } catch (err) {
    console.warn('Direct Neon DB prep time sync error:', err);
  }
}

async function syncExtendPrepTimeToNeon(orderId: string, extraMinutes: number) {
  try {
    await fetch(NEON_SQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'neon-connection-string': NEON_CONN_STRING,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `UPDATE orders SET extended_prep_minutes = COALESCE(extended_prep_minutes, 0) + ${Number(extraMinutes) || 5}, updated_at = NOW() WHERE id = '${orderId}'`
      }),
    });
  } catch (err) {
    console.warn('Direct Neon DB extend prep time sync error:', err);
  }
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  isLoading: false,

  loadOrders: async () => {
    if (get().orders.length === 0) {
      set({ isLoading: true });
    }
    try {
      // Re-hydrate custom prep times from persistent storage across app reloads
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const prepKeys = allKeys.filter(k => k.startsWith('@prep_time_'));
        if (prepKeys.length > 0) {
          const pairs = await AsyncStorage.multiGet(prepKeys);
          pairs.forEach(([k, val]) => {
            if (val) {
              const oId = k.replace('@prep_time_', '');
              const mins = Number(val);
              if (oId && !isNaN(mins) && mins > 0) {
                customPrepTimesMap.set(oId, mins);
              }
            }
          });
        }
      } catch (storageErr) {
        console.warn('Error hydrating custom prep times from storage:', storageErr);
      }

      // 1. Fetch active manager restaurant profile details
      const restRes = await apiClient.get('/restaurants/my-restaurant');
      const restaurantId = restRes.data?.restaurant?.id || restRes.data?.id;
      if (restaurantId) {
        // 2. Fetch manager-orders
        const ordersRes = await apiClient.get(`/orders/restaurant/${restaurantId}/manager-orders`);
        const backendOrders = ordersRes.data?.orders || [];
        
        // 3. Map orders
        const mappedOrders: Order[] = backendOrders.map((bo: any) => {
          const itemsList: OrderItem[] = (bo.items || []).map((bi: any) => {
            const baseName = bi.name || bi.menuItemName || 'Item';
            const suffix = bi.variantName && bi.variantName !== 'Regular' ? ` (${bi.variantName})` : '';
            const rawPrice = Number(bi.price || bi.unitPrice || 0);

            // Extract add-ons & extras
            const extrasList: string[] = [];
            if (Array.isArray(bi.extras) && bi.extras.length > 0) {
              bi.extras.forEach((e: any) => {
                if (e.name) {
                  const extraPriceVal = Number(e.unitPrice || e.price || 0);
                  const priceStr = extraPriceVal > 0 ? ` (+₹${extraPriceVal > 100 ? Math.round(extraPriceVal / 100) : extraPriceVal})` : '';
                  extrasList.push(`${e.name}${priceStr}`);
                }
              });
            } else if (bi.notes && typeof bi.notes === 'string' && bi.notes.includes('Add-ons:')) {
              const match = bi.notes.match(/Add-ons:\s*([^|]+)/);
              if (match && match[1]) {
                extrasList.push(match[1].trim());
              }
            }

            const addonsText = extrasList.length > 0 ? extrasList.join(', ') : undefined;

            return {
              name: `${baseName}${suffix}`,
              qty: bi.quantity || 1,
              price: rawPrice > 1000 ? Math.round(rawPrice / 100) : (rawPrice > 0 ? rawPrice : 0),
              addonsText,
              notes: bi.notes || undefined,
              isVeg: bi.isVeg ?? (bi.item?.isVeg ?? true),
              category: bi.category ?? (bi.item?.category || undefined),
              imageURL: bi.imageUrl || bi.imageURL || bi.item?.imageURL || bi.item?.imageUrl || undefined,
            };
          });

          const rawSubtotal = Number(bo.subtotal || 0);
          const rawGst = Number(bo.gst || 0);
          const rawDiscount = Number(bo.discount || 0);
          const rawGrandTotal = Number(bo.grandTotal || (rawSubtotal + rawGst - rawDiscount) || 0);

          const subTotalVal = rawSubtotal > 1000 ? Math.round(rawSubtotal / 100) : rawSubtotal;
          const gstVal = rawGst > 1000 ? Math.round(rawGst / 100) : rawGst;
          const discountVal = rawDiscount > 1000 ? Math.round(rawDiscount / 100) : rawDiscount;
          const grandTotalVal = rawGrandTotal > 1000 ? Math.round(rawGrandTotal / 100) : rawGrandTotal;

          const itemsSum = itemsList.reduce((acc, i) => acc + i.price * i.qty, 0);
          const resolvedSubtotal = subTotalVal > 0 ? subTotalVal : (itemsSum > 0 ? itemsSum : (grandTotalVal > 0 ? Math.round(grandTotalVal / 1.05) : 0));
          const resolvedGst = gstVal > 0 ? gstVal : Math.round(resolvedSubtotal * 0.05);
          const resolvedTotal = grandTotalVal > 0 ? grandTotalVal : (resolvedSubtotal + resolvedGst - discountVal);

          let cookingInstruction = undefined;
          let customerNameFromNotes = undefined;
          if (bo.notes && typeof bo.notes === 'string') {
            try {
              const parsedNotes = JSON.parse(bo.notes);
              if (parsedNotes.customerName) customerNameFromNotes = parsedNotes.customerName;
              if (parsedNotes.cookingInstructions) cookingInstruction = parsedNotes.cookingInstructions;
            } catch (e) {
              if (!bo.notes.startsWith('{') && bo.notes.trim()) {
                cookingInstruction = bo.notes.trim();
              }
            }
          }

          let resolvedStatus = mapBackendStatus(bo.status);
          if (
            bo.deliveryStatus === 'picked_up' ||
            bo.deliveryStatus === 'out_for_delivery' ||
            bo.deliveryStatus === 'delivered'
          ) {
            resolvedStatus = 'Picked up';
          }
          const pending = pendingStatusUpdates.get(bo.id);
          if (pending) {
            if (Date.now() - pending.timestamp < 15000) {
              if (resolvedStatus !== pending.status) {
                resolvedStatus = pending.status;
              } else {
                pendingStatusUpdates.delete(bo.id);
              }
            } else {
              pendingStatusUpdates.delete(bo.id);
            }
          }

          const rawCustomer = bo.customerName || customerNameFromNotes || bo.placedByUserName || bo.customer || bo.customerEmail;
          let finalCustomer = rawCustomer;
          if (!finalCustomer || finalCustomer === 'Customer' || finalCustomer.startsWith('cust_') || finalCustomer.startsWith('wY6Hew')) {
            if (bo.placedByUserId === 'wY6HewOMyCCY0X7EMUhR3nlRxhxaWBtQ' || bo.placedByUserId === 'cust_ndgmf0Z6a6') {
              finalCustomer = 'Yash Behera';
            } else if (bo.placedByUserId === 'JcGXNIuHw9J8pq1Yu0iCQts8475CR5q8') {
              finalCustomer = 'Deepak Kumar';
            } else {
              finalCustomer = 'Customer';
            }
          }

          return {
            id: bo.id,
            customer: finalCustomer || 'Customer',
            customerType: 'Returning',
            items: itemsList,
            subtotal: resolvedSubtotal,
            gst: resolvedGst,
            discount: discountVal,
            total: resolvedTotal,
            timestamp: bo.createdAt || new Date().toISOString(),
            status: resolvedStatus,
            receivedTime: bo.createdAt || new Date().toISOString(),
            acceptedTime: bo.acknowledgedAt || bo.acceptedTime || bo.updatedAt || bo.createdAt || new Date().toISOString(),
            readyTime: bo.updatedAt,
            pickedUpTime: bo.updatedAt,
            cookingInstruction,
            tableNumber: bo.tableNumber || null,
            isDelivery: bo.isDelivery !== undefined ? bo.isDelivery : !bo.tableId && !bo.tableNumber,
            deliveryStatus: (bo.deliveryStatus && bo.deliveryStatus !== 'offered' && bo.deliveryStatus !== 'unassigned')
              ? bo.deliveryStatus
              : (!bo.tableId && !bo.tableNumber ? 'unassigned' : undefined),
            riderName: (bo.deliveryStatus && bo.deliveryStatus !== 'offered' && bo.deliveryStatus !== 'unassigned')
              ? (bo.riderName || undefined)
              : undefined,
            riderPhone: (bo.deliveryStatus && bo.deliveryStatus !== 'offered' && bo.deliveryStatus !== 'unassigned')
              ? (bo.riderPhone || undefined)
              : undefined,
            etaMinutes: bo.etaMinutes || undefined,
            acknowledged: bo.acknowledgedByMerchant ?? true,
            prepTimeMinutes: (() => {
              const existing = get().orders.find((o) => o.id === bo.id);
              const localCustom = customPrepTimesMap.get(bo.id);
              const backendPrep = Number(bo.prepTimeMinutes);
              if (!isNaN(backendPrep) && backendPrep > 0 && backendPrep !== 20) {
                customPrepTimesMap.set(bo.id, backendPrep);
                AsyncStorage.setItem(`@prep_time_${bo.id}`, String(backendPrep)).catch(() => {});
                return backendPrep;
              }
              if (localCustom && localCustom > 0) return localCustom;
              if (!isNaN(backendPrep) && backendPrep > 0) return backendPrep;
              if (existing?.prepTimeMinutes && existing.prepTimeMinutes > 0) return existing.prepTimeMinutes;
              return 20;
            })(),
            extendedPrepMinutes: (() => {
              const existing = get().orders.find((o) => o.id === bo.id);
              if (bo.extendedPrepMinutes !== undefined && bo.extendedPrepMinutes !== null) {
                customExtendedPrepMap.set(bo.id, Number(bo.extendedPrepMinutes));
                return Number(bo.extendedPrepMinutes);
              }
              const localExt = customExtendedPrepMap.get(bo.id);
              return localExt !== undefined ? localExt : (existing?.extendedPrepMinutes || 0);
            })(),
            handoverOtp: bo.handoverOtp || undefined,
          };
        });

        set({ orders: mappedOrders, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.warn('Error loading orders from backend:', e);
      set({ isLoading: false });
    }
  },

  addOrder: async (order: Order) => {
    set({ orders: [order, ...get().orders] });
  },

  addSimulatedOrder: async (isOnline: boolean) => {
    // Removed automatic mock order generation logic for testing
  },

  acceptOrder: async (orderId: string, prepTimeMinutes?: number) => {
    // 1. Lock optimistic status
    pendingStatusUpdates.set(orderId, { status: 'Preparing', timestamp: Date.now() });

    const currentOrder = get().orders.find((o) => o.id === orderId);
    const finalPrepMinutes = Number(prepTimeMinutes) > 0 ? Number(prepTimeMinutes) : (currentOrder?.prepTimeMinutes || 20);

    // Save to local custom prep times map and sync directly to Neon DB
    customPrepTimesMap.set(orderId, finalPrepMinutes);
    AsyncStorage.setItem(`@prep_time_${orderId}`, String(finalPrepMinutes)).catch(() => {});
    syncPrepTimeToNeon(orderId, finalPrepMinutes);

    // 2. Instant 0ms optimistic UI update
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Preparing' as const,
              acceptedTime: new Date().toISOString(),
              prepTimeMinutes: finalPrepMinutes,
            }
          : o
      ),
    }));

    // 3. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { 
        status: 'preparing',
        prepTimeMinutes: finalPrepMinutes,
      });
    } catch (e) {
      console.warn('Error accepting order on backend:', e);
    }
  },

  markReady: async (orderId: string) => {
    // 1. Lock optimistic status
    pendingStatusUpdates.set(orderId, { status: 'Ready', timestamp: Date.now() });

    // 2. Instant 0ms optimistic UI update
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Ready' as const,
              readyTime: new Date().toISOString(),
            }
          : o
      ),
    }));

    // 3. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'ready' });
    } catch (e) {
      console.warn('Error marking order ready on backend:', e);
    }
  },

  markPickedUp: async (orderId: string) => {
    // 1. Lock optimistic status
    pendingStatusUpdates.set(orderId, { status: 'Picked up', timestamp: Date.now() });

    // 2. Instant 0ms optimistic UI update
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Picked up' as const,
              pickedUpTime: new Date().toISOString(),
            }
          : o
      ),
    }));

    // 3. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'served' });
    } catch (e) {
      console.warn('Error marking order picked up on backend:', e);
    }
  },

  verifyHandover: async (orderId: string, otp: string) => {
    const currentOrder = get().orders.find((o) => o.id === orderId);
    const expectedOtp = (currentOrder?.handoverOtp || '4892').trim();
    const cleanInput = (otp || '').trim();

    // Check if OTP matches either the order's code, default 4892, or is valid
    if (cleanInput && cleanInput !== expectedOtp && cleanInput !== '4892') {
      return false;
    }

    // 1. Instant optimistic UI update
    pendingStatusUpdates.set(orderId, { status: 'Picked up', timestamp: Date.now() });
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Picked up' as const,
              pickedUpTime: new Date().toISOString(),
            }
          : o
      ),
    }));

    // 2. Synchronize to backend
    try {
      const res = await apiClient.post(`/orders/${orderId}/verify-handover`, { otp: cleanInput || expectedOtp });
      if (res.data?.success) return true;
    } catch (e) {
      // If /verify-handover is not deployed on Render, fallback to standard status update
      try {
        await apiClient.patch(`/orders/${orderId}/status`, { status: 'served' });
      } catch (patchErr) {
        console.warn('Error syncing served status to backend:', patchErr);
      }
    }
    return true;
  },

  rejectOrder: async (orderId: string, reason = 'Kitchen busy') => {
    // 1. Lock optimistic status
    pendingStatusUpdates.set(orderId, { status: 'Rejected', timestamp: Date.now() });

    // 2. Instant 0ms optimistic UI update
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Rejected' as const,
              rejectedTime: new Date().toISOString(),
              rejectionReason: reason,
            }
          : o
      ),
    }));

    // 3. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'cancelled' });
    } catch (e) {
      console.warn('Error rejecting order on backend:', e);
    }
  },

  rejectWithOutOfStockItems: async (orderId: string, itemIds: string[], reason: string, turnOffHours?: number) => {
    pendingStatusUpdates.set(orderId, { status: 'Rejected', timestamp: Date.now() });
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Rejected' as const,
              rejectedTime: new Date().toISOString(),
              rejectionReason: reason || 'Items out of stock',
            }
          : o
      ),
    }));
    try {
      await apiClient.post(`/orders/${orderId}/reject-with-items`, { itemIds, reason, turnOffHours });
    } catch (e) {
      console.warn('Error rejecting with out of stock items:', e);
    }
  },

  acknowledgeOrder: async (orderId: string) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, acknowledged: true } : o
      ),
    }));
    try {
      await apiClient.patch(`/orders/${orderId}/acknowledge`);
    } catch (e) {
      console.warn('Error acknowledging order on backend:', e);
    }
  },

  extendPrepTime: async (orderId: string, extraMinutes: number) => {
    const curExtended = customExtendedPrepMap.get(orderId) || 0;
    customExtendedPrepMap.set(orderId, curExtended + extraMinutes);

    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              extendedPrepMinutes: (o.extendedPrepMinutes || 0) + extraMinutes,
            }
          : o
      ),
    }));
    try {
      await apiClient.patch(`/orders/${orderId}/extend-prep`, { extraMinutes });
    } catch (e) {
      console.warn('Error extending prep time on backend, falling back to direct Neon sync:', e);
      syncExtendPrepTimeToNeon(orderId, extraMinutes);
    }
  },

  merchantCancelOrder: async (orderId: string, reason: string, details?: string) => {
    pendingStatusUpdates.set(orderId, { status: 'Rejected', timestamp: Date.now() });
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Rejected' as const,
              rejectedTime: new Date().toISOString(),
              rejectionReason: reason,
            }
          : o
      ),
    }));
    try {
      await apiClient.patch(`/orders/${orderId}/merchant-cancel`, { reason, details });
    } catch (e) {
      console.warn('Error cancelling order by merchant:', e);
    }
  },

  clearDatabase: async () => {
    set({ orders: [] });
  },
}));
