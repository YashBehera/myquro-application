import { db } from "../db/db.js";
import { orders } from "../db/schema/orders.js";
import { orderDeliveries } from "../db/schema/order-deliveries.js";
import { restaurants } from "../db/schema/restaurants.js";
import { and, inArray, sql, eq } from "drizzle-orm";
import { pushOfferToRider } from "./pushNotifications.js";

export interface DispatchCandidate {
  id: string;
  restaurantId: string;
  notes: string | null;
  grandTotal: number | null;
  placedByUserId: string | null;
  createdAt: Date;
  restaurantLat: number | null;
  restaurantLng: number | null;
}

export interface CreateDeliveryOfferParams {
  id: string;
  orderId: string;
  riderId: string;
  etaMinutes: number;
  distanceKm: number;
  deliveryFee: number;
  currentLat: number;
  currentLng: number;
  startLat: number;
  startLng: number;
  customerLat: number;
  customerLng: number;
  restaurantLat: number;
  restaurantLng: number;
}

const DISPATCH_CACHE_TTL_MS = 2000;
let pendingCandidatesCache: { expiresAt: number; data: DispatchCandidate[] } | null = null;

export const RIDER_BASE_PAY_RUPEES = 25;
export const RIDER_BASE_DISTANCE_KM = 2;
export const RIDER_EXTRA_KM_PAY_RUPEES = 7;

/**
 * Computes Tier-2 rider payout: ₹25 base (0-2 km) + ₹7/km beyond 2 km.
 */
export function calculateRiderPayout(distanceKm: number): number {
  const dist = Math.max(0, Number(distanceKm) || 0);
  return Number(
    (
      RIDER_BASE_PAY_RUPEES +
      Math.max(0, dist - RIDER_BASE_DISTANCE_KM) * RIDER_EXTRA_KM_PAY_RUPEES
    ).toFixed(2)
  );
}

/**
 * Converts order amounts stored in paise to INR rupees consistently while
 * tolerating any legacy rupee-denominated fixture rows (<= 1000).
 */
export function toRupeesFromOrderPaise(rawAmount: unknown): number {
  const val = Number(rawAmount || 0);
  if (!Number.isFinite(val) || val <= 0) return 0;
  return val > 1000 ? Number((val / 100).toFixed(2)) : Number(val.toFixed(2));
}

/**
 * Extracts customer-paid extra checkout fees stored in order.notes JSON
 * so restaurant sales reconciliation never deducts rider payout instead.
 */
export function parseCustomerExtraFeesFromNotes(notes: unknown): number {
  if (typeof notes !== "string" || !notes.trim().startsWith("{")) return 0;
  try {
    const parsed = JSON.parse(notes);
    return (
      (Number(parsed.customerDeliveryFee) || 0) +
      (Number(parsed.platformFee) || 0) +
      (Number(parsed.expressFee) || 0)
    );
  } catch {
    return 0;
  }
}

export function invalidateDispatchCache(): void {
  pendingCandidatesCache = null;
}

/**
 * Fetches unassigned preparing/ready delivery orders with batched restaurant GPS coordinates,
 * cached for 2s to eliminate N+1 polling bursts from concurrent riders.
 */
export async function getUnassignedDispatchCandidates(
  lookbackMs = 2 * 60 * 60 * 1000
): Promise<DispatchCandidate[]> {
  const nowMs = Date.now();
  if (pendingCandidatesCache && pendingCandidatesCache.expiresAt > nowMs) {
    return pendingCandidatesCache.data;
  }

  const cutoff = new Date(nowMs - lookbackMs);
  const rows = await db
    .select({
      id: orders.id,
      restaurantId: orders.restaurantId,
      notes: orders.notes,
      grandTotal: orders.grandTotal,
      placedByUserId: orders.placedByUserId,
      createdAt: orders.createdAt,
      restaurantLat: restaurants.latitude,
      restaurantLng: restaurants.longitude,
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .leftJoin(orderDeliveries, eq(orders.id, orderDeliveries.orderId))
    .where(
      and(
        inArray(orders.status, ["preparing", "ready"]),
        sql`${orders.tableId} IS NULL`,
        sql`${orderDeliveries.id} IS NULL`,
        sql`${orders.createdAt} >= ${cutoff}`
      )
    );

  pendingCandidatesCache = {
    expiresAt: nowMs + DISPATCH_CACHE_TTL_MS,
    data: rows,
  };
  return rows;
}

/**
 * Atomically creates an order_deliveries offer row using a single-statement
 * PostgreSQL transaction-scoped advisory lock + NOT EXISTS guard so concurrent
 * rider polls or double-dispatches never create duplicate active offers.
 */
export async function tryCreateDeliveryOffer(
  params: CreateDeliveryOfferParams
): Promise<{ created: boolean; delivery: any | null }> {
  const now = new Date();
  const res = await db.execute(sql`
    WITH lock_ord AS (
      SELECT pg_advisory_xact_lock(hashtext(${params.orderId}))
    ),
    existing AS (
      SELECT id FROM order_deliveries WHERE order_id = ${params.orderId} LIMIT 1
    )
    INSERT INTO order_deliveries (
      id,
      order_id,
      rider_id,
      status,
      eta_minutes,
      distance_km,
      delivery_fee,
      current_lat,
      current_lng,
      start_lat,
      start_lng,
      customer_lat,
      customer_lng,
      restaurant_lat,
      restaurant_lng,
      created_at,
      updated_at
    )
    SELECT
      ${params.id},
      ${params.orderId},
      ${params.riderId},
      'offered',
      ${params.etaMinutes},
      ${params.distanceKm},
      ${params.deliveryFee},
      ${params.currentLat},
      ${params.currentLng},
      ${params.startLat},
      ${params.startLng},
      ${params.customerLat},
      ${params.customerLng},
      ${params.restaurantLat},
      ${params.restaurantLng},
      ${now},
      ${now}
    FROM lock_ord
    WHERE NOT EXISTS (SELECT 1 FROM existing)
    RETURNING *
  `);

  const rows = (res as any)?.rows || [];
  if (rows.length > 0) {
    invalidateDispatchCache();
    void db
      .select({ restaurantName: restaurants.restaurantName })
      .from(orders)
      .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.id, params.orderId))
      .limit(1)
      .then((restRows) =>
        pushOfferToRider({
          riderId: params.riderId,
          orderId: params.orderId,
          deliveryId: params.id,
          distanceKm: params.distanceKm,
          payoutRupees: params.deliveryFee,
          etaMinutes: params.etaMinutes,
          restaurantName: restRows[0]?.restaurantName ?? null,
        })
      )
      .catch((err) => console.warn("⚠️ [Push] Rider offer push failed:", err));
    return { created: true, delivery: rows[0] };
  }
  return { created: false, delivery: null };
}
