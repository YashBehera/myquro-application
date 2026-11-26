import { Router } from "express";
import { db } from "../db/db.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { requireAuth } from "../auth/requireAuth.js";
import {
  isRestaurantOwnerOrManager,
  getRestaurantRole,
} from "../lib/checkRoles.js";
import { eq, and, gte, sql, ne, desc, inArray } from "drizzle-orm";
import {
  checkRestaurantServiceability,
  isValidCoordinatePair,
  MAX_DELIVERY_RADIUS_KM,
} from "../lib/serviceability.js";
import { reservations } from "../db/schema/reservations.js";
import { tables } from "../db/schema/tables.js";
import { tableSession } from "../db/schema/table-session.js";
import { orders } from "../db/schema/orders.js";
import { orderDeliveries } from "../db/schema/order-deliveries.js";
import { merchantPenalties } from "../db/schema/merchant-penalties.js";
import { complaints } from "../db/schema/complaints.js";
import { menuItems } from "../db/schema/menu-items.js";
import { nanoid } from "nanoid";


import { analyticsCache } from "../lib/analytics-cache.js";

const router = Router();

// Get all restaurants (optionally filtered & sorted by customer delivery location radius)
router.get("/", async (req: any, res) => {
  try {
    const allRestaurants = await db.select().from(restaurants);
    const { lat, lng, maxDistanceKm, includeAll } = req.query as {
      lat?: string;
      lng?: string;
      maxDistanceKm?: string;
      includeAll?: string;
    };

    const hasCustomerCoords = isValidCoordinatePair(lat, lng);
    const radiusKm = maxDistanceKm ? Math.max(1, Number(maxDistanceKm)) : MAX_DELIVERY_RADIUS_KM;

    if (!hasCustomerCoords) {
      return res.status(200).json({ restaurants: allRestaurants, maxRadiusKm: radiusKm });
    }

    const enriched = allRestaurants.map((r) => {
      const svc = checkRestaurantServiceability(r, lat, lng, {
        isDelivery: true,
        maxRadiusKm: radiusKm,
      });
      return {
        ...r,
        distanceKm: svc.distanceKm ?? null,
        estimatedDeliveryMinutes: svc.estimatedDeliveryMinutes ?? null,
        isServiceable: svc.serviceable,
        unserviceableReason: svc.reason || null,
      };
    });

    const filtered =
      includeAll === "true"
        ? enriched
        : enriched.filter(
            (r) =>
              r.restaurantStatus === "active" &&
              r.distanceKm !== null &&
              r.distanceKm <= radiusKm
          );

    filtered.sort((a, b) => {
      if (a.isServiceable !== b.isServiceable) return a.isServiceable ? -1 : 1;
      return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
    });

    return res.status(200).json({
      restaurants: filtered,
      totalRestaurantsCount: allRestaurants.length,
      maxRadiusKm: radiusKm,
    });
  } catch (error) {
    console.error("FETCH RESTAURANTS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Check whether a specific restaurant serves a delivery address / coordinates
router.get("/:id/serviceability", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.query as { lat?: string; lng?: string };
    const [rest] = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
    if (!rest) {
      return res.status(404).json({ serviceable: false, message: "Restaurant not found" });
    }

    const result = checkRestaurantServiceability(rest, lat, lng, { isDelivery: true });
    return res.status(200).json({
      restaurantId: id,
      restaurantName: rest.restaurantName,
      city: rest.city,
      ...result,
    });
  } catch (error) {
    console.error("CHECK SERVICEABILITY ERROR:", error);
    return res.status(500).json({ serviceable: false, message: "Internal server error" });
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

// GET /restaurants/:id/penalties (Fetch penalty history, breakdown & strikes)
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
        restaurantName: restaurants.restaurantName,
        strikeCount: restaurants.strikeCount,
        autoPausedUntil: restaurants.autoPausedUntil,
        lastHeartbeatAt: restaurants.lastHeartbeatAt,
      })
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1);

    let totalPendingPaise = 0;
    let totalDeductedPaise = 0;
    let totalRiderCompensationPaise = 0;
    for (const p of penalties) {
      if (p.status === "pending") totalPendingPaise += p.amount || 0;
      if (p.status === "deducted") totalDeductedPaise += p.amount || 0;
      if (p.status !== "waived") totalRiderCompensationPaise += p.riderCompensationAmount || 0;
    }

    res.status(200).json({
      success: true,
      penalties,
      restaurantName: restaurant[0]?.restaurantName || null,
      strikeCount: restaurant[0]?.strikeCount || 0,
      autoPausedUntil: restaurant[0]?.autoPausedUntil || null,
      lastHeartbeatAt: restaurant[0]?.lastHeartbeatAt || null,
      summary: {
        totalCount: penalties.length,
        totalPendingPaise,
        totalDeductedPaise,
        totalRiderCompensationPaise,
      },
    });
  } catch (error) {
    console.error("FETCH PENALTIES ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /restaurants/:id/penalties/:penaltyId/dispute (Merchant disputes a penalty)
router.post("/:id/penalties/:penaltyId/dispute", requireAuth, async (req: any, res) => {
  try {
    const { id, penaltyId } = req.params;
    const { disputeNotes } = req.body || {};
    const user = req.user;

    if (!disputeNotes || !String(disputeNotes).trim()) {
      return res.status(400).json({ message: "Please provide a reason to dispute this penalty." });
    }

    const hasAccess = await isRestaurantOwnerOrManager(user.id, id);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [existing] = await db
      .select()
      .from(merchantPenalties)
      .where(and(eq(merchantPenalties.id, penaltyId), eq(merchantPenalties.restaurantId, id)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Penalty record not found" });
    }

    const cleanNote = String(disputeNotes).trim();
    const now = new Date();

    const [updatedPenalty] = await db
      .update(merchantPenalties)
      .set({
        status: "disputed",
        disputeNotes: cleanNote,
      })
      .where(eq(merchantPenalties.id, penaltyId))
      .returning();

    const [rest] = await db
      .select({ restaurantName: restaurants.restaurantName })
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1);

    const ticketId = `TKT-${nanoid(7).toUpperCase()}`;
    const nowIso = now.toISOString();
    await db.insert(complaints).values({
      id: ticketId,
      ticketType: "merchant_issue",
      orderId: existing.orderId || null,
      orderNumber: existing.orderId ? `#MQ-${existing.orderId.slice(-5).toUpperCase()}` : null,
      outletId: id,
      outletName: rest?.restaurantName || "Merchant Partner",
      customerName: user.name || rest?.restaurantName || "Restaurant Partner",
      category: "penalty_dispute",
      categoryLabel: `Merchant Penalty Dispute (${existing.penaltyType})`,
      reason: `Dispute for penalty ${existing.id} (₹${Math.round((existing.amount || 0) / 100)})`,
      description: cleanNote,
      priority: "HIGH",
      status: "OPEN",
      metadata: {
        penaltyId: existing.id,
        penaltyType: existing.penaltyType,
        amountPaise: existing.amount,
      },
      messages: [
        {
          id: `msg-${nanoid(6)}`,
          complaintId: ticketId,
          senderId: user.id,
          senderName: user.name || rest?.restaurantName || "Restaurant Partner",
          senderType: "RESTAURANT",
          message: cleanNote,
          timestamp: nowIso,
        },
      ],
      createdAt: now,
      updatedAt: now,
    } as any);

    res.status(200).json({
      success: true,
      message: `Dispute registered under ticket #${ticketId}`,
      penalty: updatedPenalty,
      ticketId,
    });
  } catch (error) {
    console.error("DISPUTE MERCHANT PENALTY ERROR:", error);
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
        autoPausedUntil: null,
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
        : 100;

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

// GET /api/restaurants/:id/settlements — Real weekly settlement ledger computed from orders, deliveries & penalties
router.get("/:id/settlements", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const period = String(req.query?.period || "all");

    const hasAccess = await isRestaurantOwnerOrManager(user.id, id);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [restaurant] = await db
      .select({
        id: restaurants.id,
        restaurantName: restaurants.restaurantName,
        gstNumber: restaurants.gstNumber,
        phoneNumber: restaurants.phoneNumber,
        email: restaurants.email,
      })
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const commissionRate = Number(process.env.PLATFORM_COMMISSION_PERCENT) || 15;
    const now = new Date();
    const startOfCurrentWeek = new Date(now);
    const day = startOfCurrentWeek.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + diffToMon);
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfCurrentWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let rangeStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    let rangeEnd = now;

    if (period === "this_week") {
      rangeStart = startOfCurrentWeek;
    } else if (period === "last_week") {
      rangeStart = startOfLastWeek;
      rangeEnd = startOfCurrentWeek;
    } else if (period === "this_month") {
      rangeStart = startOfThisMonth;
    } else if (period === "last_month") {
      rangeStart = startOfLastMonth;
      rangeEnd = startOfThisMonth;
    }

    // Fetch last ~90 days of completed/active non-cancelled orders + deliveries + penalties so month growth & weekly cycles work
    const lookbackStart = rangeStart < startOfLastMonth ? rangeStart : startOfLastMonth;

    const allOrders = await db
      .select({
        id: orders.id,
        subtotal: orders.subtotal,
        discount: orders.discount,
        gst: orders.gst,
        grandTotal: orders.grandTotal,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, id),
          ne(orders.status, "cancelled"),
          gte(orders.createdAt, lookbackStart)
        )
      )
      .orderBy(desc(orders.createdAt));

    const orderIds = allOrders.map((o) => o.id);
    const deliveryFeeByOrderId = new Map<string, number>();
    if (orderIds.length > 0) {
      const delRows = await db
        .select({
          orderId: orderDeliveries.orderId,
          deliveryFee: orderDeliveries.deliveryFee,
        })
        .from(orderDeliveries)
        .where(inArray(orderDeliveries.orderId, orderIds));
      for (const d of delRows) {
        deliveryFeeByOrderId.set(d.orderId, Number(d.deliveryFee || 0));
      }
    }

    const penaltyRows = await db
      .select({
        id: merchantPenalties.id,
        amount: merchantPenalties.amount,
        status: merchantPenalties.status,
        createdAt: merchantPenalties.createdAt,
      })
      .from(merchantPenalties)
      .where(
        and(
          eq(merchantPenalties.restaurantId, id),
          ne(merchantPenalties.status, "waived"),
          gte(merchantPenalties.createdAt, lookbackStart)
        )
      );

    // Helper: get Monday 00:00 key for a given date
    const getWeekStart = (dt: Date) => {
      const d = new Date(dt);
      const wDay = d.getDay();
      const diff = wDay === 0 ? -6 : 1 - wDay;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const formatShortDate = (dt: Date) =>
      dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

    // Group orders in selected [rangeStart, rangeEnd] into weekly settlement cycles
    const weekBuckets = new Map<
      string,
      {
        weekStart: Date;
        grossSales: number;
        customerDeliveryFee: number;
        discountsSubsidized: number;
        orderCount: number;
        penaltiesDeducted: number;
      }
    >();

    const inPeriod = (dt: Date) =>
      dt.getTime() >= rangeStart.getTime() &&
      (period === "last_week" || period === "last_month"
        ? dt.getTime() < rangeEnd.getTime()
        : dt.getTime() <= rangeEnd.getTime());

    for (const o of allOrders) {
      const created = new Date(o.createdAt);
      if (!inPeriod(created)) continue;
      const ws = getWeekStart(created);
      const key = ws.toISOString().slice(0, 10);
      if (!weekBuckets.has(key)) {
        weekBuckets.set(key, {
          weekStart: ws,
          grossSales: 0,
          customerDeliveryFee: 0,
          discountsSubsidized: 0,
          orderCount: 0,
          penaltiesDeducted: 0,
        });
      }
      const bucket = weekBuckets.get(key)!;
      const grandTotalRupees = Number(o.grandTotal ?? o.subtotal ?? 0);
      const discountRupees = Number(o.discount || 0);
      const deliveryRupees = Math.round(deliveryFeeByOrderId.get(o.id) || 0);
      bucket.grossSales += Math.max(0, grandTotalRupees - deliveryRupees + discountRupees);
      bucket.customerDeliveryFee += deliveryRupees;
      bucket.discountsSubsidized += discountRupees;
      bucket.orderCount += 1;
    }

    for (const p of penaltyRows) {
      const created = new Date(p.createdAt);
      if (!inPeriod(created)) continue;
      const ws = getWeekStart(created);
      const key = ws.toISOString().slice(0, 10);
      if (!weekBuckets.has(key)) {
        weekBuckets.set(key, {
          weekStart: ws,
          grossSales: 0,
          customerDeliveryFee: 0,
          discountsSubsidized: 0,
          orderCount: 0,
          penaltiesDeducted: 0,
        });
      }
      const bucket = weekBuckets.get(key)!;
      bucket.penaltiesDeducted += Math.round((Number(p.amount || 0)) / 100);
    }

    const settlements = Array.from(weekBuckets.entries())
      .sort((a, b) => b[1].weekStart.getTime() - a[1].weekStart.getTime())
      .map(([key, b]) => {
        const weekEnd = new Date(b.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const payoutMonday = new Date(b.weekStart);
        payoutMonday.setDate(payoutMonday.getDate() + 7);

        const commissionAmount = Number(((b.grossSales * commissionRate) / 100).toFixed(2));
        const gstOnCommission = Number((commissionAmount * 0.18).toFixed(2));
        const tcsDeduction = Number((b.grossSales * 0.01).toFixed(2));
        const netPayout = Number(
          Math.max(
            0,
            b.grossSales -
              commissionAmount -
              gstOnCommission -
              tcsDeduction -
              b.discountsSubsidized -
              b.penaltiesDeducted
          ).toFixed(2)
        );
        const isCurrentWeek = b.weekStart.getTime() >= startOfCurrentWeek.getTime();
        const status: "settled" | "processing" = isCurrentWeek ? "processing" : "settled";

        return {
          id: `SET-${key.replace(/-/g, "")}`,
          cycleLabel: `${formatShortDate(b.weekStart)} – ${formatShortDate(weekEnd)}`,
          payoutDate: isCurrentWeek
            ? `Scheduled ${formatShortDate(payoutMonday)} ${payoutMonday.getFullYear()}`
            : `Cycle Ended ${formatShortDate(weekEnd)} ${weekEnd.getFullYear()}`,
          status,
          grossSales: Number(b.grossSales.toFixed(2)),
          customerDeliveryFee: Number(b.customerDeliveryFee.toFixed(2)),
          commissionRate,
          commissionAmount,
          gstOnCommission,
          tcsDeduction,
          discountsSubsidized: Number(b.discountsSubsidized.toFixed(2)),
          penaltiesDeducted: Number(b.penaltiesDeducted.toFixed(2)),
          netPayout,
          orderCount: b.orderCount,
          utrNumber: null,
        };
      });

    // Compute month-over-month growth % cleanly from real orders
    const sumMonthSales = (start: Date, end: Date) =>
      allOrders
        .filter((o) => {
          const t = new Date(o.createdAt).getTime();
          return t >= start.getTime() && t < end.getTime();
        })
        .reduce((acc, o) => acc + Number(o.grandTotal ?? o.subtotal ?? 0), 0);

    const thisMonthTotal = sumMonthSales(startOfThisMonth, new Date(now.getTime() + 1000));
    const lastMonthTotal = sumMonthSales(startOfLastMonth, startOfThisMonth);
    const growthPercent =
      lastMonthTotal > 0
        ? Number((((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1))
        : null;

    const totalGross = settlements.reduce((a, s) => a + s.grossSales, 0);
    const totalCommission = settlements.reduce((a, s) => a + s.commissionAmount, 0);
    const totalNetPayout = settlements.reduce((a, s) => a + s.netPayout, 0);
    const totalOrdersCount = settlements.reduce((a, s) => a + s.orderCount, 0);
    const totalPenalties = settlements.reduce((a, s) => a + s.penaltiesDeducted, 0);

    res.status(200).json({
      success: true,
      period,
      commissionRate,
      restaurantName: restaurant.restaurantName,
      gstNumber: restaurant.gstNumber || null,
      summary: {
        totalNetPayout: Number(totalNetPayout.toFixed(2)),
        grossSales: Number(totalGross.toFixed(2)),
        commissionAmount: Number(totalCommission.toFixed(2)),
        totalOrders: totalOrdersCount,
        penaltiesDeducted: Number(totalPenalties.toFixed(2)),
        growthPercent,
      },
      settlements,
    });
  } catch (error) {
    console.error("SETTLEMENTS FETCH ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;