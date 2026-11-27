import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import { and, eq, inArray, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/db.js";
import { devicePushTokens } from "../db/schema/device-push-tokens.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";

export type PushAppType = "customer" | "merchant" | "rider";

export type PushChannelId = "kitchen_orders" | "rider_offers" | "customer_updates";

interface PushDispatchOptions {
  tokens: string[];
  channelId: PushChannelId;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
  ttlMs?: number;
  collapseKey?: string;
}

const INVALID_FCM_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/mismatched-sender-id",
]);

let cachedApp: App | null | undefined = undefined;
let warnLoggedOnce = false;

function resolveFirebaseApp(): App | null {
  if (cachedApp !== undefined) {
    return cachedApp;
  }

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0] ?? null;
    return cachedApp;
  }

  try {
    let serviceAccountObj: Record<string, any> | null = null;

    const rawJsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (rawJsonEnv) {
      serviceAccountObj = JSON.parse(rawJsonEnv);
    } else {
      const moduleDir = path.dirname(fileURLToPath(import.meta.url));
      const backendRoot = path.resolve(moduleDir, "../..");
      const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

      const candidatePaths = [
        configuredPath ? path.resolve(process.cwd(), configuredPath) : null,
        configuredPath ? path.resolve(backendRoot, configuredPath) : null,
        path.resolve(backendRoot, "firebase-service-account.json"),
      ].filter((p): p is string => Boolean(p));

      const matchedPath = candidatePaths.find((candidate) => fs.existsSync(candidate));
      if (matchedPath) {
        const fileContents = fs.readFileSync(matchedPath, "utf8");
        serviceAccountObj = JSON.parse(fileContents);
      }
    }

    if (!serviceAccountObj) {
      if (!warnLoggedOnce) {
        warnLoggedOnce = true;
        console.warn(
          "⚠️ [Push] Firebase service account not configured (set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH). Native FCM pushes will be skipped."
        );
      }
      cachedApp = null;
      return null;
    }

    cachedApp = initializeApp({
      credential: cert(serviceAccountObj),
    });
    console.log("🔔 [Push] Firebase Admin SDK initialized cleanly for project:", serviceAccountObj.project_id);
    return cachedApp;
  } catch (err) {
    console.error("❌ [Push] Failed to initialize Firebase Admin SDK:", err);
    cachedApp = null;
    return null;
  }
}

export function isFirebasePushConfigured(): boolean {
  return resolveFirebaseApp() !== null;
}

function stringifyDataPayload(
  data?: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!data) return result;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

function isExpoRelayToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

export async function deactivateDevicePushTokens(tokens: string[]): Promise<void> {
  const clean = Array.from(new Set(tokens.map((t) => t.trim()).filter(Boolean)));
  if (clean.length === 0) return;

  await db
    .update(devicePushTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(inArray(devicePushTokens.token, clean));
}

export async function upsertDevicePushToken(params: {
  token: string;
  appType: PushAppType;
  platform?: string;
  userId?: string | null;
  restaurantId?: string | null;
  riderId?: string | null;
  deviceId?: string | null;
}): Promise<{ id: string; token: string; restaurantId: string | null; riderId: string | null }> {
  const cleanToken = params.token.trim();
  const cleanPlatform = (params.platform || "android").trim().toLowerCase();
  const userId = params.userId || null;
  let restaurantId = params.restaurantId?.trim() || null;
  const riderId = params.riderId?.trim() || (params.appType === "rider" ? userId : null);

  // Auto-resolve restaurantId for merchants if client did not supply one explicitly
  if (params.appType === "merchant" && !restaurantId && userId) {
    const owned = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.ownerId, userId))
      .limit(1);

    if (owned.length > 0 && owned[0]) {
      restaurantId = owned[0].id;
    } else {
      const managed = await db
        .select({ restaurantId: restaurantManagers.restaurantId })
        .from(restaurantManagers)
        .where(
          and(
            eq(restaurantManagers.userId, userId),
            eq(restaurantManagers.status, "active")
          )
        )
        .limit(1);
      if (managed.length > 0 && managed[0]) {
        restaurantId = managed[0].restaurantId;
      }
    }
  }

  const now = new Date();
  const id = `dpt_${nanoid(12)}`;

  await db
    .insert(devicePushTokens)
    .values({
      id,
      token: cleanToken,
      appType: params.appType,
      platform: cleanPlatform,
      userId,
      restaurantId,
      riderId,
      deviceId: params.deviceId?.trim() || null,
      isActive: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: devicePushTokens.token,
      set: {
        appType: params.appType,
        platform: cleanPlatform,
        userId,
        restaurantId,
        riderId,
        deviceId: params.deviceId?.trim() || null,
        isActive: true,
        lastSeenAt: now,
        updatedAt: now,
      },
    });

  return { id, token: cleanToken, restaurantId, riderId };
}

export async function sendHighPriorityPush(
  options: PushDispatchOptions
): Promise<{ sentCount: number; failedCount: number; skipped: boolean }> {
  const uniqueTokens = Array.from(
    new Set(options.tokens.map((t) => t.trim()).filter(Boolean))
  );
  if (uniqueTokens.length === 0) {
    return { sentCount: 0, failedCount: 0, skipped: true };
  }

  const fcmTokens = uniqueTokens.filter((t) => !isExpoRelayToken(t));
  const expoTokens = uniqueTokens.filter((t) => isExpoRelayToken(t));
  const dataPayload = stringifyDataPayload(options.data);
  const soundName = options.sound || "default";

  let sentCount = 0;
  let failedCount = 0;
  const invalidTokens: string[] = [];

  const firebaseApp = resolveFirebaseApp();
  if (firebaseApp && fcmTokens.length > 0) {
    const messaging = getMessaging(firebaseApp);

    for (let i = 0; i < fcmTokens.length; i += 500) {
      const batch = fcmTokens.slice(i, i + 500);
      const message: MulticastMessage = {
        tokens: batch,
        notification: {
          title: options.title,
          body: options.body,
        },
        data: dataPayload,
        android: {
          priority: "high",
          ttl: options.ttlMs ?? 5 * 60 * 1000,
          collapseKey: options.collapseKey,
          notification: {
            channelId: options.channelId,
            sound: soundName,
            priority: "max",
            visibility: "public",
            defaultVibrateTimings: true,
            ticker: options.title,
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
          },
          payload: {
            aps: {
              sound: soundName === "default" ? "default" : `${soundName}.wav`,
              contentAvailable: true,
            },
          },
        },
      };

      try {
        const result = await messaging.sendEachForMulticast(message);
        sentCount += result.successCount;
        failedCount += result.failureCount;

        result.responses.forEach((resp, idx) => {
          const targetToken = batch[idx];
          if (!resp.success && targetToken) {
            const code = resp.error?.code;
            if (code && INVALID_FCM_ERROR_CODES.has(code)) {
              invalidTokens.push(targetToken);
            } else {
              console.warn(`⚠️ [Push] FCM delivery error (${code || "unknown"}):`, resp.error?.message);
            }
          }
        });
      } catch (err) {
        failedCount += batch.length;
        console.error("❌ [Push] FCM sendEachForMulticast failed:", err);
      }
    }
  }

  // Fallback support if any dev build registers an Expo Go relay token
  if (expoTokens.length > 0) {
    try {
      const expoMessages = expoTokens.map((to) => ({
        to,
        title: options.title,
        body: options.body,
        data: dataPayload,
        sound: soundName === "default" ? "default" : `${soundName}.wav`,
        priority: "high",
        channelId: options.channelId,
      }));
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expoMessages),
      });
      if (resp.ok) {
        sentCount += expoTokens.length;
      } else {
        failedCount += expoTokens.length;
      }
    } catch (err) {
      failedCount += expoTokens.length;
      console.warn("⚠️ [Push] Expo relay fallback error:", err);
    }
  }

  if (invalidTokens.length > 0) {
    await deactivateDevicePushTokens(invalidTokens).catch((err) =>
      console.warn("⚠️ [Push] Could not deactivate invalid tokens:", err)
    );
  }

  return {
    sentCount,
    failedCount,
    skipped: !firebaseApp && expoTokens.length === 0,
  };
}

async function getMerchantTokensForRestaurant(restaurantId: string): Promise<string[]> {
  const [restRow] = await db
    .select({ ownerId: restaurants.ownerId })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);

  const staffRows = await db
    .select({ userId: restaurantManagers.userId })
    .from(restaurantManagers)
    .where(
      and(
        eq(restaurantManagers.restaurantId, restaurantId),
        eq(restaurantManagers.status, "active")
      )
    );

  const userIds = Array.from(
    new Set([restRow?.ownerId, ...staffRows.map((s) => s.userId)].filter((id): id is string => Boolean(id)))
  );

  const condition =
    userIds.length > 0
      ? or(
          eq(devicePushTokens.restaurantId, restaurantId),
          inArray(devicePushTokens.userId, userIds)
        )
      : eq(devicePushTokens.restaurantId, restaurantId);

  const rows = await db
    .select({ token: devicePushTokens.token })
    .from(devicePushTokens)
    .where(
      and(
        eq(devicePushTokens.appType, "merchant"),
        eq(devicePushTokens.isActive, true),
        condition
      )
    );

  return rows.map((r) => r.token);
}

async function getRiderTokens(riderId: string): Promise<string[]> {
  const rows = await db
    .select({ token: devicePushTokens.token })
    .from(devicePushTokens)
    .where(
      and(
        eq(devicePushTokens.appType, "rider"),
        eq(devicePushTokens.isActive, true),
        or(
          eq(devicePushTokens.riderId, riderId),
          eq(devicePushTokens.userId, riderId)
        )
      )
    );

  return rows.map((r) => r.token);
}

async function getCustomerTokens(userId: string): Promise<string[]> {
  const rows = await db
    .select({ token: devicePushTokens.token })
    .from(devicePushTokens)
    .where(
      and(
        eq(devicePushTokens.appType, "customer"),
        eq(devicePushTokens.isActive, true),
        eq(devicePushTokens.userId, userId)
      )
    );

  return rows.map((r) => r.token);
}

export async function pushNewOrderToMerchant(params: {
  restaurantId: string;
  orderId: string;
  itemCount: number;
  totalPaiseOrRupees: number;
  isDelivery: boolean;
  isAutoAccepted?: boolean;
}) {
  const tokens = await getMerchantTokensForRestaurant(params.restaurantId);
  if (tokens.length === 0) return;

  const amountRupees =
    params.totalPaiseOrRupees > 1000
      ? Math.round(params.totalPaiseOrRupees / 100)
      : Math.round(params.totalPaiseOrRupees);
  const shortId = params.orderId.slice(-6).toUpperCase();

  await sendHighPriorityPush({
    tokens,
    channelId: "kitchen_orders",
    sound: "order_alert",
    title: params.isAutoAccepted
      ? `Urgent: Start Preparing #${shortId}`
      : params.isDelivery
      ? `New Delivery Order #${shortId}!`
      : `New Dine-In Order #${shortId}!`,
    body: `${params.itemCount} item(s) • ₹${amountRupees} — Tap to ${
      params.isAutoAccepted ? "view KOT" : "accept now"
    }`,
    ttlMs: 5 * 60 * 1000,
    collapseKey: `new_order_${params.orderId}`,
    data: {
      type: "NEW_ORDER",
      app: "merchant",
      orderId: params.orderId,
      restaurantId: params.restaurantId,
      screen: "orders",
    },
  });
}

export async function pushMerchantAcceptanceWarning(params: {
  restaurantId: string;
  orderId: string;
  secondsRemaining: number;
}) {
  const tokens = await getMerchantTokensForRestaurant(params.restaurantId);
  if (tokens.length === 0) return;

  const shortId = params.orderId.slice(-6).toUpperCase();
  await sendHighPriorityPush({
    tokens,
    channelId: "kitchen_orders",
    sound: "order_alert",
    title: `Expiring Order #${shortId}!`,
    body: `Accept within ${params.secondsRemaining}s to prevent auto-cancellation & SLA penalty.`,
    ttlMs: 60 * 1000,
    collapseKey: `warn_order_${params.orderId}`,
    data: {
      type: "ORDER_ACCEPTANCE_WARNING",
      app: "merchant",
      orderId: params.orderId,
      restaurantId: params.restaurantId,
      secondsRemaining: params.secondsRemaining,
    },
  });
}

export async function pushOfferToRider(params: {
  riderId: string;
  orderId: string;
  deliveryId: string;
  distanceKm: number;
  payoutRupees: number;
  etaMinutes: number;
  restaurantName?: string | null;
}) {
  const tokens = await getRiderTokens(params.riderId);
  if (tokens.length === 0) return;

  const restLabel = params.restaurantName?.trim() || "Nearby restaurant";
  await sendHighPriorityPush({
    tokens,
    channelId: "rider_offers",
    sound: "order_alert",
    title: `New Delivery Offer — ₹${Math.round(params.payoutRupees)}`,
    body: `${restLabel} • ${Number(params.distanceKm).toFixed(1)} km (${params.etaMinutes} mins). Tap to accept!`,
    ttlMs: 90 * 1000,
    collapseKey: `rider_offer_${params.orderId}`,
    data: {
      type: "NEW_DELIVERY_OFFER",
      app: "rider",
      orderId: params.orderId,
      deliveryId: params.deliveryId,
      payoutRupees: Math.round(params.payoutRupees),
      distanceKm: Number(params.distanceKm).toFixed(1),
    },
  });
}

export async function pushOrderStatusToCustomer(params: {
  userId?: string | null;
  orderId: string;
  status: string;
  restaurantName?: string | null;
  prepTimeMinutes?: number | null;
  reason?: string | null;
}) {
  if (!params.userId) return;
  const tokens = await getCustomerTokens(params.userId);
  if (tokens.length === 0) return;

  const rest = params.restaurantName?.trim() || "the restaurant";
  const shortId = params.orderId.slice(-6).toUpperCase();
  let title = `Order #${shortId} Updated`;
  let body = `Your order from ${rest} is now ${params.status}.`;

  switch (params.status) {
    case "preparing":
      title = `Order Confirmed! #${shortId}`;
      body = `${rest} is preparing your food${
        params.prepTimeMinutes ? ` (~${params.prepTimeMinutes} mins)` : ""
      }.`;
      break;
    case "ready":
      title = `Order Packed & Ready! #${shortId}`;
      body = `Your order from ${rest} is ready for pickup.`;
      break;
    case "picked_up":
      title = `Order Picked Up! #${shortId}`;
      body = `Your delivery partner has picked up your order from ${rest}.`;
      break;
    case "out_for_delivery":
      title = `Rider Is On The Way! #${shortId}`;
      body = `Your order from ${rest} will reach you shortly.`;
      break;
    case "delivered":
      title = `Order Delivered!`;
      body = `Enjoy your meal from ${rest}!`;
      break;
    case "cancelled":
      title = `Order Cancelled #${shortId}`;
      body =
        params.reason?.trim() ||
        `Your order from ${rest} was cancelled. Any online payment is refunded automatically.`;
      break;
  }

  await sendHighPriorityPush({
    tokens,
    channelId: "customer_updates",
    sound: "default",
    title,
    body,
    ttlMs: 10 * 60 * 1000,
    collapseKey: `order_status_${params.orderId}`,
    data: {
      type: "ORDER_STATUS_UPDATE",
      app: "customer",
      orderId: params.orderId,
      status: params.status,
    },
  });
}
