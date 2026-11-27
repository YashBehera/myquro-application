export const MAX_DELIVERY_RADIUS_KM = 10;

export const PLATFORM_FEE_RUPEES = 5;
export const FREE_DELIVERY_MIN_ORDER_RUPEES = 299;
export const FREE_DELIVERY_MAX_DISTANCE_KM = 3;
export const BASE_DELIVERY_FEE_RUPEES = 12;
export const MID_RANGE_BASE_FEE_RUPEES = 10;
export const MID_RANGE_KM_FEE_RUPEES = 6;
export const MID_RANGE_MAX_DISTANCE_KM = 6;
export const LONG_RANGE_BASE_FEE_RUPEES = 28;
export const LONG_RANGE_KM_FEE_RUPEES = 7;
export const MAX_DELIVERY_FEE_RUPEES = 56;
export const EXPRESS_DELIVERY_FEE_RUPEES = 19;

export interface OrderFeeBreakdown {
  deliveryFee: number;
  platformFee: number;
  expressFee: number;
}

/**
 * Computes transparent Stage-1 customer delivery, platform, and express fees (in whole INR)
 * aligned identically with the backend checkout calculation (FREE when food > ₹299 and distance < 3 km).
 */
export function calculateOrderFees(params: {
  itemTotalRupees: number;
  distanceKm?: number | null;
  deliveryType?: string | null;
}): OrderFeeBreakdown {
  const itemTotal = Math.max(0, Number(params.itemTotalRupees) || 0);
  const expressFee = params.deliveryType === 'express' ? EXPRESS_DELIVERY_FEE_RUPEES : 0;

  if (itemTotal <= 0) {
    return { deliveryFee: 0, platformFee: 0, expressFee: 0 };
  }

  const dist =
    typeof params.distanceKm === 'number' && Number.isFinite(params.distanceKm) && params.distanceKm >= 0
      ? params.distanceKm
      : null;

  let deliveryFee = 0;
  if (dist !== null && dist >= FREE_DELIVERY_MAX_DISTANCE_KM) {
    if (dist <= MID_RANGE_MAX_DISTANCE_KM) {
      const midKm = Math.max(1, Math.ceil(dist - FREE_DELIVERY_MAX_DISTANCE_KM));
      deliveryFee = MID_RANGE_BASE_FEE_RUPEES + midKm * MID_RANGE_KM_FEE_RUPEES;
    } else {
      const longKm = Math.ceil(dist - MID_RANGE_MAX_DISTANCE_KM);
      deliveryFee = Math.min(
        MAX_DELIVERY_FEE_RUPEES,
        LONG_RANGE_BASE_FEE_RUPEES + longKm * LONG_RANGE_KM_FEE_RUPEES
      );
    }
  } else if (itemTotal <= FREE_DELIVERY_MIN_ORDER_RUPEES) {
    deliveryFee = BASE_DELIVERY_FEE_RUPEES;
  }

  return {
    deliveryFee,
    platformFee: PLATFORM_FEE_RUPEES,
    expressFee,
  };
}

export function isValidCoordPair(lat: any, lng: any): boolean {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (nLat === 0 && nLng === 0) return false;
  if (Math.abs(nLat) > 90 || Math.abs(nLng) > 180) return false;
  return true;
}

export function computeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

export function isKitchenOffline(restaurant: any): boolean {
  if (!restaurant) return false;
  if (restaurant.isOpen === false || restaurant.isClosed === true) return true;
  if (
    restaurant.restaurantStatus &&
    String(restaurant.restaurantStatus).toLowerCase() !== 'active'
  ) {
    return true;
  }
  const now = Date.now();
  if (restaurant.snoozedUntil) {
    const snoozeMs = new Date(restaurant.snoozedUntil).getTime();
    if (!Number.isNaN(snoozeMs) && snoozeMs > now) return true;
  }
  if (restaurant.autoPausedUntil) {
    const pauseMs = new Date(restaurant.autoPausedUntil).getTime();
    if (!Number.isNaN(pauseMs) && pauseMs > now) return true;
  }
  return false;
}

export function formatOfflineReopenMessage(restaurant: any): string {
  const now = Date.now();
  const resumeRaw = restaurant?.snoozedUntil || restaurant?.autoPausedUntil;
  if (resumeRaw) {
    const resumeDate = new Date(resumeRaw);
    if (!Number.isNaN(resumeDate.getTime()) && resumeDate.getTime() > now) {
      const timeStr = resumeDate.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const isSameDay = resumeDate.toDateString() === new Date(now).toDateString();
      return `Uh-oh! Outlet is not accepting orders at the moment. They should be back by ${timeStr}${isSameDay ? '' : ' tomorrow'}.`;
    }
  }
  return 'Uh-oh! Outlet is not accepting orders at the moment. They should be back soon.';
}

export interface ClientServiceabilityResult {
  isServiceable: boolean;
  distanceKm: number | null;
  estimatedDeliveryMinutes: number | null;
  code?:
    | 'RESTAURANT_CLOSED'
    | 'RESTAURANT_INACTIVE'
    | 'RESTAURANT_SNOOZED'
    | 'RESTAURANT_PAUSED'
    | 'RESTAURANT_COORDS_MISSING'
    | 'MISSING_DELIVERY_LOCATION'
    | 'OUT_OF_DELIVERY_RANGE';
  reason?: string;
}

export function checkCustomerServiceability(
  restaurant: any,
  customerLat?: any,
  customerLng?: any,
  maxRadiusKm: number = MAX_DELIVERY_RADIUS_KM
): ClientServiceabilityResult {
  if (!restaurant) {
    return {
      isServiceable: false,
      distanceKm: null,
      estimatedDeliveryMinutes: null,
      code: 'RESTAURANT_CLOSED',
      reason: 'Restaurant details unavailable',
    };
  }

  const now = Date.now();

  if (restaurant.isOpen === false || restaurant.isClosed === true) {
    return {
      isServiceable: false,
      distanceKm: null,
      estimatedDeliveryMinutes: null,
      code: 'RESTAURANT_CLOSED',
      reason: restaurant.closedReason || formatOfflineReopenMessage(restaurant),
    };
  }

  if (
    restaurant.restaurantStatus &&
    String(restaurant.restaurantStatus).toLowerCase() !== 'active'
  ) {
    return {
      isServiceable: false,
      distanceKm: null,
      estimatedDeliveryMinutes: null,
      code: 'RESTAURANT_INACTIVE',
      reason: formatOfflineReopenMessage(restaurant),
    };
  }

  if (restaurant.snoozedUntil) {
    const snoozeMs = new Date(restaurant.snoozedUntil).getTime();
    if (!Number.isNaN(snoozeMs) && snoozeMs > now) {
      return {
        isServiceable: false,
        distanceKm: null,
        estimatedDeliveryMinutes: null,
        code: 'RESTAURANT_SNOOZED',
        reason: formatOfflineReopenMessage(restaurant),
      };
    }
  }

  if (restaurant.autoPausedUntil) {
    const pauseMs = new Date(restaurant.autoPausedUntil).getTime();
    if (!Number.isNaN(pauseMs) && pauseMs > now) {
      return {
        isServiceable: false,
        distanceKm: null,
        estimatedDeliveryMinutes: null,
        code: 'RESTAURANT_PAUSED',
        reason: formatOfflineReopenMessage(restaurant),
      };
    }
  }

  if (!isValidCoordPair(restaurant.latitude, restaurant.longitude)) {
    return {
      isServiceable: false,
      distanceKm: null,
      estimatedDeliveryMinutes: null,
      code: 'RESTAURANT_COORDS_MISSING',
      reason: 'Restaurant delivery coordinates are missing',
    };
  }

  if (!isValidCoordPair(customerLat, customerLng)) {
    return {
      isServiceable: false,
      distanceKm: null,
      estimatedDeliveryMinutes: null,
      code: 'MISSING_DELIVERY_LOCATION',
      reason: 'Select a delivery address with GPS location to verify serviceability',
    };
  }

  const distanceKm = computeHaversineKm(
    Number(restaurant.latitude),
    Number(restaurant.longitude),
    Number(customerLat),
    Number(customerLng)
  );

  const estimatedDeliveryMinutes = Math.max(15, Math.min(60, Math.round(14 + distanceKm * 3.5)));

  if (distanceKm > maxRadiusKm) {
    return {
      isServiceable: false,
      distanceKm,
      estimatedDeliveryMinutes,
      code: 'OUT_OF_DELIVERY_RANGE',
      reason: `${restaurant.name || 'This restaurant'} is ${distanceKm.toFixed(1)} km away and does not deliver beyond ${maxRadiusKm} km.`,
    };
  }

  return {
    isServiceable: true,
    distanceKm,
    estimatedDeliveryMinutes,
  };
}
