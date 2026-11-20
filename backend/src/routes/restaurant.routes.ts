import { Router } from "express";
import { db } from "../db/db.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { requireAuth } from "../auth/requireAuth.js";
import {
  isRestaurantOwnerOrManager,
  getRestaurantRole,
} from "../lib/checkRoles.js";
import { eq, and, gte, sql, ne, desc } from "drizzle-orm";
import { reservations } from "../db/schema/reservations.js";
import { tables } from "../db/schema/tables.js";
import { tableSession } from "../db/schema/table-session.js";
import { orders } from "../db/schema/orders.js";
import { merchantPenalties } from "../db/schema/merchant-penalties.js";
import { menuItems } from "../db/schema/menu-items.js";


import { analyticsCache } from "../lib/analytics-cache.js";

const router = Router();

// Get all restaurants
router.get("/", async (req: any, res) => {
  try {
    const allRestaurants = await db.select().from(restaurants);
    res.status(200).json({ restaurants: allRestaurants });
  } catch (error) {
    console.error("FETCH RESTAURANTS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get my restaurant with role-based access control
router.get("/my-restaurant", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    console.log("MY RESTAURANT REQUEST - User:", user);

    // ✅ 1. AUTH CHECK
    if (!user || user.role !== "restaurant") {
      console.log("MY RESTAURANT - Auth failed, user role:", user?.role);
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log("MY RESTAURANT - User ID:", user.id);

    // ✅ 2. CHECK IF USER IS RESTAURANT OWNER (legacy)
    let restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerId, user.id))
      .limit(1);

    console.log("MY RESTAURANT - Owner query result:", restaurant);

    // ✅ 3. IF NOT OWNER, CHECK RESTAURANT_MANAGERS TABLE (staff/manager/kitchen)
    if (restaurant.length === 0) {
      console.log("MY RESTAURANT - Not owner, checking restaurantManagers...");

      const managerRecord = await db
        .select({
          restaurantId: restaurantManagers.restaurantId,
          role: restaurantManagers.role,
          status: restaurantManagers.status,
        })
        .from(restaurantManagers)
        .where(
          and(
            eq(restaurantManagers.userId, user.id),
            eq(restaurantManagers.status, "active")
          )
        )
        .limit(1);

      console.log("MY RESTAURANT - Manager record:", managerRecord);

      if (managerRecord.length === 0) {
        console.log("MY RESTAURANT - No restaurant found for user:", user.id);
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get the restaurant details
      restaurant = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, managerRecord[0].restaurantId))
        .limit(1);

      console.log("MY RESTAURANT - Restaurant from manager lookup:", restaurant);

      if (restaurant.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
    }

    // ✅ 4. SUCCESS RESPONSE
    return res.status(200).json({ restaurant: restaurant[0] });
  } catch (error) {
    console.error("FETCH MY RESTAURANT ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get restaurant by ID
router.get("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1);

    if (restaurant.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.status(200).json({ restaurant: restaurant[0] });
  } catch (error) {
    console.error("FETCH RESTAURANT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get restaurant stats for dashboard
router.get("/:id/stats", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const restaurantId = req.params.id;

    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have permission to view restaurant stats",
      });
    }

    // Check Cache
    const cacheKey = `dashboard:stats:${restaurantId}`;
    const cached = analyticsCache.get(cacheKey);
    if (cached.hit) {
      return res.status(200).json(cached.data);
    }

    // Calculate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run queries in parallel
    const [
      todayStats,
      activeReservationsCount,
      occupiedTablesCount,
      todaySessionStats
    ] = await Promise.all([
      // Today's orders and revenue (Gross - sum of all orders)
      db
        .select({
          count: sql<number>`count(*)`,
          revenue: sql<number>`sum(${orders.grandTotal})`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, today),
            sql`${orders.createdAt} < ${tomorrow}`,
            ne(orders.status, "cancelled") // Exclude cancelled orders
          )
        ),

      // Active reservations (today, confirmed, future time)
      db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurantId),
            eq(reservations.status, "confirmed"),
            gte(reservations.reservationTime, today) // Show all confirmed for today+future
          )
        ),

      // Occupied tables
      db
        .select({ count: sql<number>`count(*)` })
        .from(tables)
        .where(
          and(
            eq(tables.restaurantId, restaurantId),
            eq(tables.liveStatus, "occupied")
          )
        ),

      // Today's session stats (billed sessions) - For Net Revenue and Discounts
      db
        .select({
          discount: sql<number>`sum(${tableSession.discountAmount})`,
          netRevenue: sql<number>`sum(${tableSession.finalAmount})`,
        })
        .from(tableSession)
        .where(
          and(
            eq(tableSession.restaurantId, restaurantId),
            gte(tableSession.billedAt, today),
            sql`${tableSession.billedAt} < ${tomorrow}`
          )
        )
    ]);

    const stats = {
      todayOrders: Number(todayStats[0]?.count || 0),
      todayRevenue: Number(todayStats[0]?.revenue || 0), // Gross from orders
      todayNetRevenue: Number(todaySessionStats[0]?.netRevenue || 0), // Net from billed sessions
      todayDiscount: Number(todaySessionStats[0]?.discount || 0), // Discounts given
      activeReservations: Number(activeReservationsCount[0]?.count || 0),
      occupiedTables: Number(occupiedTablesCount[0]?.count || 0)
    };

    // Cache for 10 seconds (near real-time)
    analyticsCache.set(cacheKey, stats, 10);

    res.status(200).json(stats);
  } catch (error) {
    console.error("FETCH RESTAURANT STATS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = req.params.id;
    const {
      restaurantName,
      restaurantType,
      restaurantAddress,
      restaurantLogo,
      restaurantBanner,
      establishmentYear,
      seatingCapacity,
      city,
      state,
      postalCode,
      description,
      phoneNumber,
      email,
      website,
      cuisine,
      defaultGstPercentage
    } = req.body;
    const user = req.user;
    const updatedAt = new Date();

    // ✅ 1. AUTH CHECK
    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }
    // ✅ 2. VERIFY OWNER OR MANAGER ACCESS
    const hasAccess = await isRestaurantOwnerOrManager(
      user.id,
      restaurantId
    );
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. PERFORM UPDATE
    const [updatedRestaurant] = await db
      .update(restaurants)
      .set({
        ...(restaurantName !== undefined && { restaurantName }),
        ...(restaurantType !== undefined && { restaurantType }),
        ...(restaurantAddress !== undefined && { restaurantAddress }),
        ...(restaurantLogo !== undefined && { restaurantLogo }),
        ...(restaurantBanner !== undefined && { restaurantBanner }),
        ...(establishmentYear !== undefined && { establishmentYear }),
        ...(seatingCapacity !== undefined && { seatingCapacity }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(postalCode !== undefined && { postalCode }),
        ...(description !== undefined && { description }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(cuisine !== undefined && { cuisine }),
        ...(defaultGstPercentage !== undefined && { defaultGstPercentage }),
        updatedAt,
      })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (!updatedRestaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // ✅ 4. SUCCESS RESPONSE
    res.status(200).json({ restaurant: updatedRestaurant });
  } catch (error) {
    console.error("UPDATE RESTAURANT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/close", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = req.params.id;
    const user = req.user;

    // ✅ 1. AUTH CHECK
    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }
    // ✅ 2. VERIFY OWNER OR MANAGER ACCESS
    const hasAccess = await isRestaurantOwnerOrManager(
      user.id,
      restaurantId
    );
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. PERFORM UPDATE
    const [updatedRestaurant] = await db
      .update(restaurants)
      .set({
        isOpen: false,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (!updatedRestaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // ✅ 4. SUCCESS RESPONSE
    res.status(200).json({ restaurant: updatedRestaurant });
  } catch (error) {
    console.error("CLOSE RESTAURANT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:id/open", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = req.params.id;
    const user = req.user;

    // ✅ 1. AUTH CHECK
    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }
    // ✅ 2. VERIFY OWNER OR MANAGER ACCESS
    const hasAccess = await isRestaurantOwnerOrManager(
      user.id,
      restaurantId
    );
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. PERFORM UPDATE
    const [updatedRestaurant] = await db
      .update(restaurants)
      .set({
        isOpen: true,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (!updatedRestaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // ✅ 4. SUCCESS RESPONSE
    res.status(200).json({ restaurant: updatedRestaurant });
  } catch (error) {
    console.error("OPEN RESTAURANT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id/status", async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const restaurant = await db
      .select({ isOpen: restaurants.isOpen })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (restaurant.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.status(200).json({ isOpen: restaurant[0].isOpen });
  } catch (error) {
    console.error("FETCH RESTAURANT STATUS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user's restaurant role
router.get("/:id/my-role", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = req.params.id;
    const user = req.user;
    console.log("MY ROLE REQUEST - User:", user);
    console.log("MY ROLE REQUEST - Restaurant ID:", restaurantId);

    // ✅ 1. AUTH CHECK
    if (!user || user.role !== "restaurant") {
      console.log("MY ROLE - Auth failed, user role:", user?.role);
      return res.status(401).json({ message: "Authentication required" });
    }

    // ✅ 2. GET ROLE
    console.log("MY ROLE - Calling getRestaurantRole for user:", user.id, "restaurant:", restaurantId);
    const role = await getRestaurantRole(user.id, restaurantId);
    console.log("MY ROLE - Role result:", role);

    if (!role) {
      console.log("MY ROLE - No role found for user:", user.id, "in restaurant:", restaurantId);
      return res.status(403).json({ message: "You are not a member of this restaurant" });
    }

    // ✅ 3. SUCCESS RESPONSE
    console.log("MY ROLE - Returning role:", role);
    res.status(200).json({ role });
  } catch (error) {
    console.error("FETCH RESTAURANT ROLE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get restaurant dashboard stats
router.get("/:id/dashboard/stats", requireAuth, async (req: any, res) => {
  try {
    const restaurantId = req.params.id;
    const user = req.user;

    // ✅ 1. AUTH CHECK
    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ✅ 2. PERMISSION CHECK
    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. GET TODAY'S STATS
    // ✅ 3. PREPARE DATES
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ✅ 4. EXECUTE QUERIES IN PARALLEL
    const [
      todayOrders,
      todayReservations,
      totalTables,
      occupiedTables
    ] = await Promise.all([
      // Today's orders count and revenue
      db
        .select({
          count: sql<number>`count(*)`,
          revenue: sql<number>`sum(${tableSession.finalBillAmount})`,
        })
        .from(tableSession)
        .where(
          and(
            eq(tableSession.restaurantId, restaurantId),
            gte(tableSession.billedAt, today),
            sql`${tableSession.billedAt} < ${tomorrow}`
          )
        ),

      // Today's reservations count
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurantId),
            gte(reservations.reservationTime, today),
            sql`${reservations.reservationTime} < ${tomorrow}`
          )
        ),

      // Total tables count
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(tables)
        .where(eq(tables.restaurantId, restaurantId)),

      // Occupied tables count
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(tables)
        .where(
          and(
            eq(tables.restaurantId, restaurantId),
            eq(tables.liveStatus, "occupied")
          )
        )
    ]);

    // ✅ 5. SUCCESS RESPONSE
    res.status(200).json({
      stats: {
        todayOrders: todayOrders[0]?.count || 0,
        todayRevenue: todayOrders[0]?.revenue || 0,
        todayReservations: todayReservations[0]?.count || 0,
        totalTables: totalTables[0]?.count || 0,
        occupiedTables: occupiedTables[0]?.count || 0,
        availableTables: (totalTables[0]?.count || 0) - (occupiedTables[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("FETCH DASHBOARD STATS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /restaurants/:id/heartbeat (Device presence ping every 60s)
router.post("/:id/heartbeat", async (req: any, res) => {
  try {
    const { id } = req.params;
    await db
      .update(restaurants)
      .set({
        lastHeartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id));

    res.status(200).json({ success: true, timestamp: new Date() });
  } catch (error) {
    console.error("HEARTBEAT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /restaurants/:id/auto-accept (Toggle Auto-Accept mode)
router.patch("/:id/auto-accept", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { autoAcceptOrders } = req.body;

    if (typeof autoAcceptOrders !== "boolean") {
      return res.status(400).json({ message: "autoAcceptOrders must be a boolean" });
    }

    const updated = await db
      .update(restaurants)
      .set({
        autoAcceptOrders,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id))
      .returning();

    res.status(200).json({
      success: true,
      autoAcceptOrders: updated[0]?.autoAcceptOrders,
      message: `Auto-accept orders ${autoAcceptOrders ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error("AUTO-ACCEPT TOGGLE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /restaurants/:id/busy-mode (Toggle Dining Rush Busy Mode)
router.patch("/:id/busy-mode", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { isBusyMode } = req.body;

    if (typeof isBusyMode !== "boolean") {
      return res.status(400).json({ message: "isBusyMode must be a boolean" });
    }

    const updated = await db
      .update(restaurants)
      .set({
        isBusyMode,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id))
      .returning();

    res.status(200).json({
      success: true,
      isBusyMode: updated[0]?.isBusyMode,
      message: isBusyMode
        ? "Busy Mode activated: +15 mins buffer added to new orders"
        : "Busy Mode deactivated: standard prep time restored"
    });
  } catch (error) {
    console.error("BUSY-MODE TOGGLE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /restaurants/:id/unpause (Early unpause from dining rush pause)
router.patch("/:id/unpause", async (req: any, res) => {
  try {
    const { id } = req.params;
    await db
      .update(restaurants)
      .set({
        autoPausedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id));

    res.status(200).json({ success: true, message: "Restaurant unpaused and ready to accept orders" });
  } catch (error) {
    console.error("UNPAUSE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /restaurants/:id/penalties (Fetch penalty history and strikes)
router.get("/:id/penalties", async (req: any, res) => {
  try {
    const { id } = req.params;
    const penalties = await db
      .select()
      .from(merchantPenalties)
      .where(eq(merchantPenalties.restaurantId, id))
      .orderBy(desc(merchantPenalties.createdAt));

    const restaurant = await db
      .select({
        strikeCount: restaurants.strikeCount,
        autoPausedUntil: restaurants.autoPausedUntil,
      })
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1);

    res.status(200).json({
      penalties,
      strikeCount: restaurant[0]?.strikeCount || 0,
      autoPausedUntil: restaurant[0]?.autoPausedUntil || null,
    });
  } catch (error) {
    console.error("FETCH PENALTIES ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /restaurants/:id/snooze (Custom Outlet Snooze / Pause)
router.post("/:id/snooze", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { durationMinutes = 30, reason = "Heavy Dining Rush" } = req.body;
    const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    const updated = await db
      .update(restaurants)
      .set({
        isOpen: false,
        snoozedUntil,
        snoozeReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: `Outlet snoozed for ${durationMinutes} minutes: ${reason}`,
      restaurant: updated[0],
    });
  } catch (error) {
    console.error("SNOOZE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /restaurants/:id/unsnooze (Early resume from snooze)
router.post("/:id/unsnooze", async (req: any, res) => {
  try {
    const { id } = req.params;
    const updated = await db
      .update(restaurants)
      .set({
        isOpen: true,
        snoozedUntil: null,
        snoozeReason: null,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Outlet unsnoozed and live for orders",
      restaurant: updated[0],
    });
  } catch (error) {
    console.error("UNSNOOZE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /restaurants/:id/menu/items/:itemId/availability (1-Tap Stock Action)
router.patch("/:id/menu/items/:itemId/availability", async (req: any, res) => {
  try {
    const { itemId } = req.params;
    const { status, reason } = req.body; // 'in_stock' | 'paused_2h' | 'paused_today' | 'out_of_stock'

    let isAvailable = true;
    let pausedUntil: Date | null = null;
    let pauseReason: string | null = null;

    if (status === "paused_2h") {
      isAvailable = false;
      pausedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000);
      pauseReason = reason || "Paused for 2 hours";
    } else if (status === "paused_today") {
      isAvailable = false;
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      pausedUntil = endOfDay;
      pauseReason = reason || "Turned off for today";
    } else if (status === "out_of_stock") {
      isAvailable = false;
      pausedUntil = null;
      pauseReason = reason || "Out of stock";
    } else {
      isAvailable = true;
      pausedUntil = null;
      pauseReason = null;
    }

    const updated = await db
      .update(menuItems)
      .set({
        isAvailable,
        pausedUntil,
        pauseReason,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, itemId))
      .returning();

    res.status(200).json({
      success: true,
      item: updated[0],
    });
  } catch (error) {
    console.error("ITEM AVAILABILITY ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /restaurants/:id/scorecard (Operational Scorecard & Lost Sales Analytics)
router.get("/:id/scorecard", async (req: any, res) => {
  try {
    const { id } = req.params;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const allOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        grandTotal: orders.grandTotal,
        prepTimeMinutes: orders.prepTimeMinutes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        cancellationReason: orders.cancellationReason,
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, id),
          gte(orders.createdAt, sevenDaysAgo)
        )
      );

    const totalOrders = allOrders.length;
    const acceptedOrders = allOrders.filter((o) => o.status !== "cancelled").length;
    const cancelledOrders = allOrders.filter((o) => o.status === "cancelled");

    const acceptanceRate =
      totalOrders > 0
        ? Math.round((acceptedOrders / totalOrders) * 1000) / 10
        : 100;

    // Lost sales in rupees
    const lostSalesPaise = cancelledOrders.reduce(
      (acc, o) => acc + (o.grandTotal || 0),
      0
    );
    const lostSales =
      lostSalesPaise > 1000
        ? Math.round(lostSalesPaise / 100)
        : lostSalesPaise;

    // Prep on-time estimate (orders completed within target prepTimeMinutes + 5 min buffer)
    const readyOrders = allOrders.filter(
      (o) => o.status === "ready" || o.status === "served"
    );
    let onTimeCount = 0;
    for (const ro of readyOrders) {
      const diffMins =
        (ro.updatedAt.getTime() - ro.createdAt.getTime()) / 60000;
      if (diffMins <= (ro.prepTimeMinutes || 20) + 5) {
        onTimeCount++;
      }
    }
    const onTimeRate =
      readyOrders.length > 0
        ? Math.round((onTimeCount / readyOrders.length) * 1000) / 10
        : 96.5;

    res.status(200).json({
      success: true,
      scorecard: {
        acceptanceRate,
        onTimeRate,
        lostSales,
        cancelledCount: cancelledOrders.length,
        totalOrders,
        period: "Last 7 Days",
      },
    });
  } catch (error) {
    console.error("SCORECARD ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;