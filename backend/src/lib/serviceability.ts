import { haversineDistance, calculateSwiggyETA } from "./delivery-simulation.js";

export const MAX_DELIVERY_RADIUS_KM = Number(process.env.MAX_DELIVERY_RADIUS_KM || 10);
export const MAX_RIDER_PICKUP_RADIUS_KM = Number(process.env.MAX_RIDER_PICKUP_RADIUS_KM || 25);

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
 * Computes Stage-1 customer delivery, platform, and express fees (in whole INR)
 * across 0-10 km trips: FREE only when food > ₹299 and distance < 3 km.
 */
export function calculateOrderFees(params: {
  itemTotalRupees: number;
  distanceKm?: number | null;
  deliveryType?: string | null;
}): OrderFeeBreakdown {
  const itemTotal = Math.max(0, Number(params.itemTotalRupees) || 0);
  const expressFee = params.deliveryType === "express" ? EXPRESS_DELIVERY_FEE_RUPEES : 0;

  if (itemTotal <= 0) {
    return { deliveryFee: 0, platformFee: 0, expressFee: 0 };
  }

  const dist =
    typeof params.distanceKm === "number" && Number.isFinite(params.distanceKm) && params.distanceKm >= 0
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

export function isValidCoordinatePair(lat: unknown, lng: unknown): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (Math.abs(nLat) > 90 || Math.abs(nLng) > 180) return false;
  if (Math.abs(nLat) < 0.001 && Math.abs(nLng) < 0.001) return false;
  return true;
}

export function parseDeliveryCoordinates(
  notes: unknown,
  explicitLat?: unknown,
  explicitLng?: unknown
): { latitude: number | null; longitude: number | null; address?: string } {
  let address: string | undefined;
  let lat: number | null = isValidCoordinatePair(explicitLat, explicitLng) ? Number(explicitLat) : null;
  let lng: number | null = isValidCoordinatePair(explicitLat, explicitLng) ? Number(explicitLng) : null;

  if (typeof notes === "string" && notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(notes);
      address = parsed.address || parsed.mapAddress || parsed.deliveryAddress || undefined;
      if (lat === null && isValidCoordinatePair(parsed.latitude, parsed.longitude)) {
        lat = Number(parsed.latitude);
        lng = Number(parsed.longitude);
      }
    } catch {
      // Ignore non-JSON notes
    }
  }

  return { latitude: lat, longitude: lng, address };
}

export interface ServiceabilityCheckResult {
  serviceable: boolean;
  code?:
    | "RESTAURANT_INACTIVE"
    | "RESTAURANT_CLOSED"
    | "RESTAURANT_SNOOZED"
    | "RESTAURANT_PAUSED"
    | "MISSING_CUSTOMER_LOCATION"
    | "MISSING_RESTAURANT_LOCATION"
    | "OUT_OF_DELIVERY_RANGE";
  reason?: string;
  distanceKm?: number;
  maxRadiusKm: number;
  estimatedDeliveryMinutes?: number;
}

/**
 * Validates whether a restaurant can accept a delivery (or dine-in) order right now,
 * enforcing live open/snooze/pause state and maximum delivery radius.
 */
export function checkRestaurantServiceability(
  restaurant: {
    restaurantName?: string | null;
    city?: string | null;
    restaurantStatus?: string | null;
    isOpen?: boolean | null;
    snoozedUntil?: Date | string | null;
    snoozeReason?: string | null;
    autoPausedUntil?: Date | string | null;
    latitude?: number | null;
    longitude?: number | null;
    defaultPrepTimeMinutes?: number | null;
    isBusyMode?: boolean | null;
  },
  customerLat?: unknown,
  customerLng?: unknown,
  options: { isDelivery?: boolean; maxRadiusKm?: number } = {}
): ServiceabilityCheckResult {
  const maxRadiusKm = options.maxRadiusKm ?? MAX_DELIVERY_RADIUS_KM;
  const isDelivery = options.isDelivery !== false;
  const name = restaurant.restaurantName || "Restaurant";
  const now = Date.now();

  if (restaurant.restaurantStatus && restaurant.restaurantStatus !== "active") {
    return {
      serviceable: false,
      code: "RESTAURANT_INACTIVE",
      reason: `${name} is not active on the platform right now.`,
      maxRadiusKm,
    };
  }

  if (restaurant.autoPausedUntil && new Date(restaurant.autoPausedUntil).getTime() > now) {
    const mins = Math.ceil((new Date(restaurant.autoPausedUntil).getTime() - now) / 60000);
    return {
      serviceable: false,
      code: "RESTAURANT_PAUSED",
      reason: `${name} is temporarily paused due to high order volume or kitchen SLA. Resuming in ${mins} mins.`,
      maxRadiusKm,
    };
  }

  if (restaurant.snoozedUntil && new Date(restaurant.snoozedUntil).getTime() > now) {
    const mins = Math.ceil((new Date(restaurant.snoozedUntil).getTime() - now) / 60000);
    return {
      serviceable: false,
      code: "RESTAURANT_SNOOZED",
      reason: `${name} has temporarily snoozed incoming orders (${restaurant.snoozeReason || "Kitchen break"}). Try again in ${mins} mins.`,
      maxRadiusKm,
    };
  }

  if (restaurant.isOpen === false) {
    return {
      serviceable: false,
      code: "RESTAURANT_CLOSED",
      reason: `${name} is currently closed and not accepting online orders.`,
      maxRadiusKm,
    };
  }

  if (!isDelivery) {
    return { serviceable: true, maxRadiusKm };
  }

  if (!isValidCoordinatePair(restaurant.latitude, restaurant.longitude)) {
    return {
      serviceable: false,
      code: "MISSING_RESTAURANT_LOCATION",
      reason: `${name} does not have verified GPS coordinates configured for delivery.`,
      maxRadiusKm,
    };
  }

  if (!isValidCoordinatePair(customerLat, customerLng)) {
    return {
      serviceable: false,
      code: "MISSING_CUSTOMER_LOCATION",
      reason: "Please select a valid delivery address with GPS coordinates before placing a delivery order.",
      maxRadiusKm,
    };
  }

  const distKm = Number(
    haversineDistance(
      Number(restaurant.latitude),
      Number(restaurant.longitude),
      Number(customerLat),
      Number(customerLng)
    ).toFixed(2)
  );

  if (distKm > maxRadiusKm) {
    const restCity = restaurant.city ? ` (${restaurant.city})` : "";
    return {
      serviceable: false,
      code: "OUT_OF_DELIVERY_RANGE",
      distanceKm: distKm,
      maxRadiusKm,
      reason: `${name}${restCity} is ${distKm.toFixed(1)} km away from your delivery location and does not deliver beyond ${maxRadiusKm} km. Please choose a nearby restaurant or switch your delivery address.`,
    };
  }

  const baseEta = calculateSwiggyETA(
    Number(restaurant.latitude),
    Number(restaurant.longitude),
    Number(customerLat),
    Number(customerLng),
    1
  );
  const busyBuffer = restaurant.isBusyMode ? 15 : 0;

  return {
    serviceable: true,
    distanceKm: distKm,
    maxRadiusKm,
    estimatedDeliveryMinutes: Math.max(15, baseEta + busyBuffer),
  };
}
