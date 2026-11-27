import { db } from "../db/db.js";
import { orders } from "../db/schema/orders.js";
import { orderItems } from "../db/schema/order-items.js";
import { and, desc, eq, gte, like } from "drizzle-orm";

interface CachedOrderResponse {
  order: any;
  items: any[];
  expiresAt: number;
}

const IDEMPOTENCY_TTL_MS = 15 * 60 * 1000;
const completedCache = new Map<string, CachedOrderResponse>();
const inFlightRequests = new Map<string, Promise<{ order: any; items: any[] } | null>>();

export function sanitizeIdempotencyKey(rawKey: unknown): string | null {
  if (typeof rawKey !== "string") return null;
  const trimmed = rawKey.trim();
  if (!trimmed || trimmed.length > 128) return null;
  if (!/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) return null;
  return trimmed;
}

export function buildIdempotencyScopeKey(restaurantId: string, key: string): string {
  return `${restaurantId}:${key}`;
}

export async function findExistingIdempotentOrder(
  restaurantId: string,
  key: string
): Promise<{ order: any; items: any[] } | null> {
  const scopeKey = buildIdempotencyScopeKey(restaurantId, key);
  const now = Date.now();
  const cached = completedCache.get(scopeKey);
  if (cached && cached.expiresAt > now) {
    return { order: cached.order, items: cached.items };
  }

  // Fallback DB lookup across process restarts (scoped to last 24h)
  const lookback = new Date(now - 24 * 60 * 60 * 1000);
  const needle = `%"idempotencyKey":"${key}"%`;
  const existingRows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, lookback),
        like(orders.notes, needle)
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(1);

  if (existingRows.length === 0) return null;

  const existingOrder = existingRows[0];
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, existingOrder.id));

  completedCache.set(scopeKey, {
    order: existingOrder,
    items,
    expiresAt: now + IDEMPOTENCY_TTL_MS,
  });
  return { order: existingOrder, items };
}

export function getInFlightIdempotentOrder(
  scopeKey: string
): Promise<{ order: any; items: any[] } | null> | undefined {
  return inFlightRequests.get(scopeKey);
}

export function registerInFlightIdempotentOrder(
  scopeKey: string,
  promise: Promise<{ order: any; items: any[] } | null>
): void {
  inFlightRequests.set(scopeKey, promise);
}

export function clearInFlightIdempotentOrder(scopeKey: string): void {
  inFlightRequests.delete(scopeKey);
}

export function cacheCompletedIdempotentOrder(
  scopeKey: string,
  result: { order: any; items: any[] }
): void {
  completedCache.set(scopeKey, {
    order: result.order,
    items: result.items,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}
