import express from "express";
import { eq } from "drizzle-orm";
import { requireAuth } from "../auth/requireAuth.js";
import { db } from "../db/db.js";
import { devicePushTokens } from "../db/schema/device-push-tokens.js";
import {
  deactivateDevicePushTokens,
  isFirebasePushConfigured,
  sendHighPriorityPush,
  upsertDevicePushToken,
  type PushAppType,
} from "../lib/pushNotifications.js";

const router = express.Router();

const VALID_APP_TYPES = new Set<PushAppType>(["customer", "merchant", "rider"]);

// POST /api/notifications/register-token
router.post("/register-token", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { token, appType, platform, restaurantId, riderId, deviceId } = req.body || {};

    if (typeof token !== "string" || token.trim().length < 10) {
      return res.status(400).json({ message: "Valid device push token is required" });
    }
    if (!VALID_APP_TYPES.has(appType)) {
      return res
        .status(400)
        .json({ message: "appType must be one of: customer, merchant, rider" });
    }

    const saved = await upsertDevicePushToken({
      token,
      appType,
      platform: typeof platform === "string" ? platform : "android",
      userId: user.id,
      restaurantId: typeof restaurantId === "string" ? restaurantId : null,
      riderId: typeof riderId === "string" ? riderId : null,
      deviceId: typeof deviceId === "string" ? deviceId : null,
    });

    return res.status(200).json({
      success: true,
      firebaseConfigured: isFirebasePushConfigured(),
      registration: {
        id: saved.id,
        appType,
        restaurantId: saved.restaurantId,
        riderId: saved.riderId,
      },
    });
  } catch (error) {
    console.error("❌ [Push] Error registering push token:", error);
    return res.status(500).json({ message: "Failed to register push token" });
  }
});

// DELETE /api/notifications/unregister-token
router.delete("/unregister-token", async (req, res) => {
  try {
    const token =
      typeof req.body?.token === "string"
        ? req.body.token
        : typeof req.query?.token === "string"
        ? req.query.token
        : "";

    if (!token.trim()) {
      return res.status(400).json({ message: "Push token is required" });
    }

    await deactivateDevicePushTokens([token]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ [Push] Error unregistering push token:", error);
    return res.status(500).json({ message: "Failed to unregister push token" });
  }
});

// POST /api/notifications/test-push (sends a test high-priority push to caller's own tokens)
router.post("/test-push", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const rows = await db
      .select({
        token: devicePushTokens.token,
        appType: devicePushTokens.appType,
      })
      .from(devicePushTokens)
      .where(eq(devicePushTokens.userId, user.id));

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active push tokens found for this user",
      });
    }

    const appType = (req.body?.appType as PushAppType) || rows[0]?.appType || "customer";
    const channelId =
      appType === "merchant"
        ? "kitchen_orders"
        : appType === "rider"
        ? "rider_offers"
        : "customer_updates";

    const result = await sendHighPriorityPush({
      tokens: rows.map((r) => r.token),
      channelId,
      sound: appType === "customer" ? "default" : "order_alert",
      title: "MyQuro Push Check",
      body: "High-priority FCM push delivery is working on this device.",
      data: { type: "TEST_PUSH", app: appType },
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("❌ [Push] Error sending test push:", error);
    return res.status(500).json({ message: "Failed to send test push" });
  }
});

export default router;
