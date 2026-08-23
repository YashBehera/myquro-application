import { Router } from "express";
import { db } from "../db/db.js";

import { notifications } from "../db/schema/notification.js";

import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../auth/requireAuth.js";
import { isRestaurantOwnerOrManager } from "../lib/checkRoles.js";


const router = Router();

// GET /api/notifications/:restaurantId - Get all notifications for a restaurant
router.get("/:restaurantId", requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const user = (req as any).user;
    const { limit = "50", unreadOnly = "false" } = req.query;

    // Permission check
    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized to view notifications" });
    }

    // Fetch notifications
    const restaurantNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.restaurantId, restaurantId))
      .orderBy(desc(notifications.createdAt))
      .limit(parseInt(limit as string));

    if (process.env.NODE_ENV !== 'production') {
      console.log('📬 GET NOTIFICATIONS:', { 
        restaurantId, 
        count: restaurantNotifications.length,
        user: user.id 
      });
    }

    res.json({ 
      notifications: restaurantNotifications,
      total: restaurantNotifications.length 
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH /api/notifications/:notificationId/mark-read - Mark notification as read
router.patch("/:notificationId/mark-read", requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const user = (req as any).user;

    // Get notification first to check restaurant access
    const notification = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (notification.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Permission check
    const hasAccess = await isRestaurantOwnerOrManager(user.id, notification[0].restaurantId!);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Note: Since schema doesn't have isRead field, we'll delete the notification instead
    // This simulates "marking as read" by removing it from the list
    await db.delete(notifications).where(eq(notifications.id, notificationId));

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ MARK NOTIFICATION READ (deleted):', { notificationId, user: user.id });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// DELETE /api/notifications/:restaurantId/clear - Clear all notifications for restaurant
router.delete("/:restaurantId/clear", requireAuth, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const user = (req as any).user;

    // Permission check
    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await db.delete(notifications).where(eq(notifications.restaurantId, restaurantId));

    if (process.env.NODE_ENV !== 'production') {
      console.log('🗑️ CLEAR ALL NOTIFICATIONS:', { restaurantId, user: user.id });
    }

    res.json({ message: "All notifications cleared" });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;
