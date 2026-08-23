import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/apiClient';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  addonsText?: string;
  notes?: string;
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
}

interface OrderStore {
  orders: Order[];
  isLoading: boolean;
  loadOrders: () => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  addSimulatedOrder: (isOnline: boolean) => Promise<void>;
  acceptOrder: (orderId: string) => Promise<void>;
  markReady: (orderId: string) => Promise<void>;
  markPickedUp: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
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
    case 'picked_up':
      return 'Ready';
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

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  isLoading: false,

  loadOrders: async () => {
    set({ isLoading: true });
    try {
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
          if (bo.notes && typeof bo.notes === 'string') {
            try {
              const parsedNotes = JSON.parse(bo.notes);
              if (parsedNotes.cookingInstructions) cookingInstruction = parsedNotes.cookingInstructions;
            } catch (e) {
              if (!bo.notes.startsWith('{') && bo.notes.trim()) {
                cookingInstruction = bo.notes.trim();
              }
            }
          }

          return {
            id: bo.id,
            customer: bo.customerName || bo.placedByUserId || 'Customer',
            customerType: 'Returning',
            items: itemsList,
            subtotal: resolvedSubtotal,
            gst: resolvedGst,
            discount: discountVal,
            total: resolvedTotal,
            timestamp: bo.createdAt || new Date().toISOString(),
            status: mapBackendStatus(bo.status),
            receivedTime: bo.createdAt || new Date().toISOString(),
            acceptedTime: bo.updatedAt,
            readyTime: bo.updatedAt,
            pickedUpTime: bo.updatedAt,
            cookingInstruction,
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

  acceptOrder: async (orderId: string) => {
    // 1. Instant 0ms optimistic UI update
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Preparing' as const,
              acceptedTime: new Date().toISOString(),
            }
          : o
      ),
    }));

    // 2. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'preparing' });
    } catch (e) {
      console.warn('Error accepting order on backend:', e);
    }
  },

  markReady: async (orderId: string) => {
    // 1. Instant 0ms optimistic UI update
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

    // 2. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'ready' });
    } catch (e) {
      console.warn('Error marking order ready on backend:', e);
    }
  },

  markPickedUp: async (orderId: string) => {
    // 1. Instant 0ms optimistic UI update
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

    // 2. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'served' });
    } catch (e) {
      console.warn('Error marking order picked up on backend:', e);
    }
  },

  rejectOrder: async (orderId: string, reason = 'Kitchen busy') => {
    // 1. Instant 0ms optimistic UI update
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

    // 2. Non-blocking backend synchronization
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'cancelled' });
    } catch (e) {
      console.warn('Error rejecting order on backend:', e);
    }
  },

  clearDatabase: async () => {
    set({ orders: [] });
  },
}));
