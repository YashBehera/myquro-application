import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../config';

export type TripStatus = 'NAVIGATING_TO_PICKUP' | 'ARRIVED_AT_PICKUP' | 'TRIP_IN_PROGRESS' | 'COMPLETED';

export interface TripOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerRating: number;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords: { latitude: number; longitude: number };
  dropoffCoords: { latitude: number; longitude: number };
  distanceKm: number;
  estimatedMinutes: number;
  fareAmount: number;
  surgeMultiplier?: string;
  packageType: string;
  status: TripStatus;
  createdAt: string;
  paymentMode?: 'COD' | 'ONLINE';
  items?: Array<{ name: string; qty: number }>;
}

export interface DriverProfile {
  id?: string;
  deId?: string;
  name: string;
  phone?: string;
  joiningDate?: string;
  city?: string;
  zone?: string;
  orderCategory?: string;
  appLanguage?: string;
  preferredLanguage?: string;
  rating: number;
  totalTrips: number;
  acceptanceRate: string;
  completionRate: string;
  vehicleName: string;
  vehiclePlate: string;
  vehicleType: 'scooter' | 'bike' | 'car' | 'suv';
  avatarUrl: string;
  bankAccount?: string;
  bankName?: string;
  bankIfsc?: string;
  bankHolderName?: string;
  bankAccountStatus?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  autoAccept: boolean;
  soundAlerts: boolean;
}

export interface RiderContextType {
  isOnline: boolean;
  toggleOnlineStatus: () => Promise<void>;
  driverProfile: DriverProfile;
  updateDriverProfile: (updates: Partial<DriverProfile>) => void;
  incomingRequest: TripOrder | null;
  acceptIncomingRequest: () => Promise<void>;
  declineIncomingRequest: () => Promise<void>;
  dismissIncomingRequest: () => void;
  activeTrip: TripOrder | null;
  advanceTripStatus: () => Promise<void>;
  cancelActiveTrip: () => Promise<void>;
  todayEarnings: number;
  weeklyEarnings: number;
  tripsToday: number;
  onlineHours: number;
  tripHistory: TripOrder[];
  triggerDemoRequest: () => void;
  cashoutBalance: () => void;
  refreshRiderProfile: () => Promise<void>;
  loginHistory: any | null;
  fetchLoginHistory: (tokenOverride?: string) => Promise<any>;
  sessionToken: string | null;
  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; onboardingCompleted: boolean }>;
  logout: () => Promise<void>;
  completeOnboarding: (data: any) => Promise<boolean>;
  chatMessages: any[];
  sendChatMessage: (text: string) => Promise<void>;
}

const DEFAULT_PROFILE: DriverProfile = {
  name: '',
  deId: '',
  phone: '',
  joiningDate: '',
  city: '',
  zone: '',
  orderCategory: '',
  appLanguage: 'English',
  preferredLanguage: 'English',
  rating: 0,
  totalTrips: 0,
  acceptanceRate: '100%',
  completionRate: '100%',
  vehicleName: '',
  vehiclePlate: '',
  vehicleType: 'bike',
  avatarUrl: '',
  autoAccept: false,
  soundAlerts: true,
};

const RiderContext = createContext<RiderContextType | undefined>(undefined);

export const RiderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [driverProfile, setDriverProfile] = useState<DriverProfile>(DEFAULT_PROFILE);
  const [incomingRequest, setIncomingRequest] = useState<TripOrder | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripOrder | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState<number>(0);
  const [tripsToday, setTripsToday] = useState<number>(0);
  const [onlineHours, setOnlineHours] = useState<number>(0);
  const [tripHistory, setTripHistory] = useState<TripOrder[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any | null>(null);

  const socketRef = useRef<any>(null);
  const declinedOrderIdsRef = useRef<Map<string, number>>(new Map());

  // Load token and profile on startup
  useEffect(() => {
    const loadState = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('@rider_profile');
        if (storedProfile) {
          setDriverProfile((prev) => ({ ...prev, ...JSON.parse(storedProfile) }));
        }

        const stored = await AsyncStorage.getItem('@rider_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSessionToken(parsed.token);
          fetchRiderProfile(parsed.token);
          fetchDashboardStats(parsed.token);
          fetchActiveTask(parsed.token);
          fetchOffers(parsed.token);
          fetchLoginHistory(parsed.token);
        }
      } catch (e) {
        console.error('Error loading stored rider state', e);
      }
    };
    loadState();
  }, []);

  // Periodic polling for active task and offers when logged in
  useEffect(() => {
    if (!sessionToken) return;

    // Initial fetch on mount / token change
    fetchActiveTask(sessionToken);
    fetchOffers(sessionToken);
    fetchDashboardStats(sessionToken);

    const interval = setInterval(() => {
      fetchActiveTask(sessionToken);
      fetchOffers(sessionToken);
      fetchDashboardStats(sessionToken);
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionToken, isOnline]);

  // Periodic background location streaming
  useEffect(() => {
    if (!sessionToken || !isOnline) return;

    let locationSubscription: any = null;

    const startWatching = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 4000,
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            streamLocation(latitude, longitude);
          }
        );
      } catch (e) {
        console.warn('Error starting location updates', e);
      }
    };

    startWatching();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [sessionToken, isOnline, activeTrip?.id]);

  const fetchRiderProfile = async (token: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rider) {
          const profile = data.rider;
          const deId = profile.id ? String(Math.abs(profile.id.split('-').reduce((acc: number, str: string) => acc + str.charCodeAt(0), 10000000))).slice(0, 8) : '10651338';
          const formattedDate = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB') : '22/07/2026';
          
          setDriverProfile((prev) => {
            const resolvedAvatar = profile.selfieUrl || prev.avatarUrl || '';
            const resolvedPhone = profile.phone ? profile.phone.replace('+91', '').trim() : (prev.phone || '');
            const deId = profile.id ? String(Math.abs(profile.id.split('-').reduce((acc: number, str: string) => acc + str.charCodeAt(0), 10000000))).slice(0, 8) : prev.deId;
            const formattedDate = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB') : prev.joiningDate;

            const formatOrderCategory = (cat: string) => {
              if (!cat) return '';
              if (cat === 'food_delivery') return 'Food Delivery';
              if (cat === 'package_delivery') return 'Package Delivery';
              if (cat.includes('_')) return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              return cat.charAt(0).toUpperCase() + cat.slice(1);
            };

            const merged = {
              ...prev,
              id: profile.id || prev.id,
              deId: deId,
              name: profile.name || prev.name,
              phone: resolvedPhone,
              joiningDate: formattedDate,
              city: profile.cityName || profile.cityId || prev.city || '',
              zone: profile.zoneName || profile.zoneId || prev.zone || '',
              orderCategory: formatOrderCategory(profile.orderType) || prev.orderCategory || 'Food Delivery',
              appLanguage: prev.appLanguage || 'English',
              preferredLanguage: prev.preferredLanguage || 'English',
              rating: profile.rating || prev.rating || 5.0,
              totalTrips: profile.totalDeliveries || prev.totalTrips || 0,
              acceptanceRate: profile.acceptanceCount ? `${Math.round((profile.acceptanceCount / (profile.acceptanceCount + (profile.rejectionCount || 0) || 1)) * 100)}%` : (prev.acceptanceRate || '100%'),
              completionRate: prev.completionRate || '100%',
              vehicleName: profile.vehicleType === 'bike' ? 'Petrol Bike' : (prev.vehicleName || 'Electric Scooter'),
              vehiclePlate: profile.vehiclePlate || prev.vehiclePlate || '',
              vehicleType: (profile.vehicleType === 'bike' ? 'bike' : prev.vehicleType || 'scooter') as any,
              avatarUrl: resolvedAvatar,
              bankAccount: profile.bankAccount || prev.bankAccount || '',
              bankName: profile.bankName || prev.bankName || '',
              bankIfsc: profile.bankIfsc || prev.bankIfsc || '',
              bankHolderName: profile.bankHolderName || prev.bankHolderName || '',
              bankAccountStatus: profile.bankAccountStatus || prev.bankAccountStatus || 'pending',
              emergencyContactName: profile.emergencyContactName || prev.emergencyContactName || '',
              emergencyContactPhone: profile.emergencyContactPhone || prev.emergencyContactPhone || '',
              emergencyContactRelationship: profile.emergencyContactRelationship || prev.emergencyContactRelationship || '',
              autoAccept: prev.autoAccept,
              soundAlerts: prev.soundAlerts,
            };
            AsyncStorage.setItem('@rider_profile', JSON.stringify(merged)).catch((e) => console.error(e));
            return merged;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardStats = async (token: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setIsOnline(data.stats.status === 'available');
          setTodayEarnings(data.stats.todayEarnings || 0);
          setWeeklyEarnings(data.stats.weekEarnings || 0);
          setTripsToday(data.stats.todayDeliveries || 0);
          setOnlineHours(6.2);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const mapBackendStatusToTripStatus = (status: string): TripStatus => {
    switch (status) {
      case 'offered':
        return 'NAVIGATING_TO_PICKUP';
      case 'assigned':
        return 'NAVIGATING_TO_PICKUP';
      case 'arrived_at_store':
        return 'ARRIVED_AT_PICKUP';
      case 'picked_up':
        return 'TRIP_IN_PROGRESS';
      case 'out_for_delivery':
        return 'TRIP_IN_PROGRESS';
      case 'delivered':
        return 'COMPLETED';
      default:
        return 'NAVIGATING_TO_PICKUP';
    }
  };

  const mapBackendTaskToTripOrder = (task: any): TripOrder => {
    const rawAmount = Number(task.orderAmount || 60);
    const fare = rawAmount > 1000 ? Math.round(rawAmount / 100) : (rawAmount > 0 ? rawAmount : 60);
    return {
      id: task.orderId,
      customerName: task.customerName || '',
      customerPhone: task.customerPhone || '',
      customerRating: 4.9,
      pickupAddress: task.restaurantName ? `${task.restaurantName}, ${task.restaurantAddress}` : task.restaurantAddress,
      dropoffAddress: task.customerAddress || '',
      pickupCoords: { latitude: task.restaurantLat || 22.8046, longitude: task.restaurantLng || 86.2029 },
      dropoffCoords: { latitude: task.customerLat || 22.8046, longitude: task.customerLng || 86.2029 },
      distanceKm: task.distanceKm ? Number(task.distanceKm) : 4.8,
      estimatedMinutes: task.etaMinutes || 15,
      fareAmount: fare,
      surgeMultiplier: task.surgeMultiplier || '1.0x Surge',
      packageType: task.orderNotes || 'Standard Delivery',
      status: mapBackendStatusToTripStatus(task.status),
      createdAt: task.createdAt ? new Date(task.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Just Now',
      paymentMode: task.paymentMode || 'ONLINE',
      items: (task.items || []).map((i: any) => ({
        name: `${i.menuItemName || 'Item'}${i.variantName && i.variantName !== 'Regular' ? ` (${i.variantName})` : ''}`,
        qty: i.quantity || 1,
      })),
    };
  };

  const fetchActiveTask = async (token: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/active-task`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.task) {
          const trip = mapBackendTaskToTripOrder(data.task);
          setActiveTrip(trip);
          fetchChatMessages(data.task.orderId, token);
          connectSocket(data.task.orderId, token);
        } else {
          setActiveTrip((prev) => (prev?.id?.startsWith('demo_order_') ? prev : null));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOffers = async (token: string) => {
    // If rider is already on an active delivery trip, do not fetch or display incoming offers
    if (activeTrip) {
      setIncomingRequest(null);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/offers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.offers && data.offers.length > 0) {
          const now = Date.now();
          const validOffers = data.offers.filter((offer: any) => {
            const declinedTime = declinedOrderIdsRef.current.get(offer.orderId);
            if (declinedTime && now - declinedTime < 15 * 60 * 1000) {
              return false;
            }
            return true;
          });

          if (validOffers.length > 0) {
            const mapped = validOffers.map((offer: any) => {
              const rawOfferAmount = Number(offer.orderAmount || 50);
              const offerFare = rawOfferAmount > 1000 ? Math.round(rawOfferAmount / 100) : (rawOfferAmount > 0 ? rawOfferAmount : 50);
              return {
                id: offer.orderId,
                customerName: offer.customerName || '',
                customerPhone: offer.customerPhone || '',
                customerRating: 4.8,
                pickupAddress: offer.restaurantName ? `${offer.restaurantName}, ${offer.restaurantAddress}` : offer.restaurantAddress,
                dropoffAddress: offer.customerAddress || '',
                pickupCoords: { latitude: offer.restaurantLat || 22.8046, longitude: offer.restaurantLng || 86.2029 },
                dropoffCoords: { latitude: offer.customerLat || 22.8046, longitude: offer.customerLng || 86.2029 },
                distanceKm: offer.distanceKm ? Number(offer.distanceKm) : 3.4,
                estimatedMinutes: offer.etaMinutes || 12,
                fareAmount: offerFare,
                surgeMultiplier: offer.surgeMultiplier || '1.0x Surge',
                packageType: offer.orderNotes || 'Standard Delivery',
                status: 'NAVIGATING_TO_PICKUP' as TripStatus,
                createdAt: offer.createdAt ? new Date(offer.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Just Now',
              };
            });
            setIncomingRequest(mapped[0]);
          } else {
            setIncomingRequest((prev) => {
              if (prev?.id?.startsWith('demo_order_')) {
                return prev;
              }
              return null;
            });
          }
        } else {
          setIncomingRequest((prev) => {
            if (prev?.id?.startsWith('demo_order_')) {
              return prev;
            }
            return null;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const streamLocation = async (lat: number, lng: number) => {
    if (!sessionToken) return;
    try {
      await fetch(`${BACKEND_URL}/api/delivery/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          orderId: activeTrip?.id,
        }),
      });
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/toggle-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        await fetchDashboardStats(sessionToken);
        await fetchLoginHistory(sessionToken);
        await fetchOffers(sessionToken);
        await fetchActiveTask(sessionToken);
      }
    } catch (err) {
      console.error('Toggle status network error', err);
    }
  };

  const fetchLoginHistory = async (tokenOverride?: string) => {
    let token = tokenOverride || sessionToken;
    if (!token) {
      const stored = await AsyncStorage.getItem('@rider_auth');
      if (stored) token = JSON.parse(stored).token;
    }
    if (!token) return null;

    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/login-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLoginHistory(data);
          if (data.today?.totalSeconds !== undefined) {
            setOnlineHours(Math.round((data.today.totalSeconds / 3600) * 10) / 10);
          }
          return data;
        }
      }
    } catch (e) {
      console.error('fetchLoginHistory error', e);
    }
    return null;
  };

  const acceptIncomingRequest = async () => {
    if (!incomingRequest) return;
    
    // Support offline demo orders
    if (incomingRequest.id.startsWith('demo_order_')) {
      setActiveTrip(incomingRequest);
      setIncomingRequest(null);
      return;
    }

    if (!sessionToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({ orderId: incomingRequest.id }),
      });
      if (res.ok) {
        setIncomingRequest(null);
        fetchActiveTask(sessionToken);
      }
    } catch (err) {
      console.error('Accept offer error', err);
    }
  };

  const declineIncomingRequest = async () => {
    if (!incomingRequest) return;
    const targetId = incomingRequest.id;
    declinedOrderIdsRef.current.set(targetId, Date.now());
    setIncomingRequest(null);

    if (targetId.startsWith('demo_order_')) {
      return;
    }
    if (!sessionToken) return;
    try {
      await fetch(`${BACKEND_URL}/api/delivery/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({ orderId: targetId }),
      });
    } catch (err) {
      console.error('Decline offer error', err);
    }
  };

  const advanceTripStatus = async () => {
    if (!activeTrip) return;

    // Support offline demo order advancement
    if (activeTrip.id.startsWith('demo_order_')) {
      let nextStatus: TripStatus = 'NAVIGATING_TO_PICKUP';
      if (activeTrip.status === 'NAVIGATING_TO_PICKUP') {
        nextStatus = 'ARRIVED_AT_PICKUP';
      } else if (activeTrip.status === 'ARRIVED_AT_PICKUP') {
        nextStatus = 'TRIP_IN_PROGRESS';
      } else if (activeTrip.status === 'TRIP_IN_PROGRESS') {
        setActiveTrip(null);
        setChatMessages([]);
        return;
      }
      setActiveTrip({ ...activeTrip, status: nextStatus });
      return;
    }

    if (!sessionToken) return;
    let nextStatus = '';
    if (activeTrip.status === 'NAVIGATING_TO_PICKUP') {
      nextStatus = 'arrived_at_store';
    } else if (activeTrip.status === 'ARRIVED_AT_PICKUP') {
      nextStatus = 'picked_up';
    } else if (activeTrip.status === 'TRIP_IN_PROGRESS') {
      nextStatus = 'delivered';
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/status/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          orderId: activeTrip.id,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        if (nextStatus === 'delivered') {
          setActiveTrip(null);
          setChatMessages([]);
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
          fetchDashboardStats(sessionToken);
          fetchRiderProfile(sessionToken);
        } else {
          fetchActiveTask(sessionToken);
        }
      }
    } catch (err) {
      console.error('Update status error', err);
    }
  };

  const cancelActiveTrip = async () => {
    if (!activeTrip) return;

    // Support offline demo cancel
    if (activeTrip.id.startsWith('demo_order_')) {
      setActiveTrip(null);
      setChatMessages([]);
      return;
    }

    if (!sessionToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({ orderId: activeTrip.id }),
      });
      if (res.ok) {
        setActiveTrip(null);
        setChatMessages([]);
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      }
    } catch (e) {
      console.error('Cancel trip error', e);
    }
  };

  const updateDriverProfile = (updates: Partial<DriverProfile>) => {
    setDriverProfile((prev) => {
      const nextProfile = { ...prev, ...updates };
      AsyncStorage.setItem('@rider_profile', JSON.stringify(nextProfile)).catch((e) =>
        console.error('Failed to save profile to AsyncStorage', e)
      );
      return nextProfile;
    });
  };

  const triggerDemoRequest = () => {
    setIncomingRequest({
      id: 'demo_order_' + Date.now(),
      customerName: 'Ashok Kumar',
      customerPhone: '+919876543210',
      customerRating: 4.9,
      pickupAddress: 'Sindhi Sweets, Cosmopolis Mall, Khandagiri',
      dropoffAddress: 'Patia, Bhubaneswar',
      pickupCoords: { latitude: 20.2462, longitude: 85.7865 },
      dropoffCoords: { latitude: 20.3500, longitude: 85.8200 },
      distanceKm: 5.09,
      estimatedMinutes: 19,
      fareAmount: 50,
      surgeMultiplier: '₹25 Surge',
      packageType: 'Food Delivery',
      status: 'NAVIGATING_TO_PICKUP',
      createdAt: new Date().toISOString(),
      paymentMode: 'COD',
    });
  };
  const dismissIncomingRequest = () => {
    if (incomingRequest) {
      declinedOrderIdsRef.current.set(incomingRequest.id, Date.now());
      declineIncomingRequest().catch(() => {});
    } else {
      setIncomingRequest(null);
    }
  };

  const cashoutBalance = () => {};

  // Auth helper methods
  const sendOtp = async (phone: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({ phone }),
      });
      return res.ok;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const refreshRiderProfile = async () => {
    try {
      let token = sessionToken;
      if (!token) {
        const stored = await AsyncStorage.getItem('@rider_auth');
        if (stored) token = JSON.parse(stored).token;
      }
      if (token) {
        await fetchRiderProfile(token);
      }
    } catch (e) {
      console.error('refreshRiderProfile error:', e);
    }
  };

  const verifyOtp = async (phone: string, otp: string): Promise<{ success: boolean; onboardingCompleted: boolean }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({ phone, otp }),
      });
      if (res.ok) {
        const data = await res.json();
        const token = data.token;
        setSessionToken(token);
        await AsyncStorage.setItem('@rider_auth', JSON.stringify({ token }));

        // Await profile fetch so driverProfile is completely populated in memory & AsyncStorage before returning
        await fetchRiderProfile(token);
        fetchDashboardStats(token);

        let onboardingCompleted =
          data.onboardingCompleted === true ||
          data.rider?.onboardingCompleted === true ||
          (data.rider?.name && data.rider.name !== 'Delivery Rider');

        return { success: true, onboardingCompleted };
      }
      return { success: false, onboardingCompleted: false };
    } catch (e) {
      console.error(e);
      return { success: false, onboardingCompleted: false };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['@rider_auth', '@onboarding_step', '@rider_profile']);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setSessionToken(null);
      setIsOnline(false);
      setActiveTrip(null);
      setIncomingRequest(null);
      setDriverProfile(DEFAULT_PROFILE);
    } catch (e) {
      console.error(e);
    }
  };

  const completeOnboarding = async (data: any): Promise<boolean> => {
    try {
      // Get the latest token — either from state or AsyncStorage
      let token = sessionToken;
      if (!token) {
        const stored = await AsyncStorage.getItem('@rider_auth');
        if (stored) token = JSON.parse(stored).token;
      }

      const res = await fetch(`${BACKEND_URL}/api/rider/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          riderId: driverProfile?.id || undefined, // backend will resolve from token if missing
          name: data.name,
          cityId: data.cityId,
          zoneId: data.zoneId,
          orderType: data.orderType,
          vehicleType: data.vehicleType,
          selfieBase64: data.selfieBase64,
          aadhaarNumber: data.aadhaar,
          panNumber: data.pan,
          joiningFeePaid: true,
        }),
      });
      if (token) {
        fetchRiderProfile(token);
      }
      if (!res.ok) {
        console.error('[completeOnboarding] API error:', res.status, await res.text());
      }
      return res.ok;
    } catch (e) {
      console.error('[completeOnboarding] error:', e);
      return false;
    }
  };

  // Socket chat implementation
  const connectSocket = (orderId: string, token: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      auth: { sessionToken: token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-order', orderId);
    });

    socket.on('new-message', (msg: any) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
  };

  const fetchChatMessages = async (orderId: string, token: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/${orderId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.messages) {
          setChatMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const sendChatMessage = async (text: string) => {
    if (!activeTrip || !text.trim() || !sessionToken) return;
    try {
      await fetch(`${BACKEND_URL}/api/chat/${activeTrip.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          text: text.trim(),
          sender: 'rider',
        }),
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <RiderContext.Provider
      value={{
        isOnline,
        toggleOnlineStatus,
        driverProfile,
        updateDriverProfile,
        incomingRequest,
        acceptIncomingRequest,
        declineIncomingRequest,
        dismissIncomingRequest,
        activeTrip,
        advanceTripStatus,
        cancelActiveTrip,
        todayEarnings,
        weeklyEarnings,
        tripsToday,
        onlineHours,
        tripHistory,
        triggerDemoRequest,
        cashoutBalance,
        refreshRiderProfile,
        loginHistory,
        fetchLoginHistory,
        sessionToken,
        sendOtp,
        verifyOtp,
        logout,
        completeOnboarding,
        chatMessages,
        sendChatMessage,
      }}
    >
      {children}
    </RiderContext.Provider>
  );
};

export const useRider = (): RiderContextType => {
  const context = useContext(RiderContext);
  if (!context) {
    throw new Error('useRider must be used within a RiderProvider');
  }
  return context;
};
