import { Router } from "express";
import { db } from "../db/db.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { requireAuth } from "../auth/requireAuth.js";
import {
  isRestaurantOwnerOrManager,
  getRestaurantRole,
} from "../lib/checkRoles.js";
import { eq, and, gte, sql, ne } from "drizzle-orm";
import { reservations } from "../db/schema/reservations.js";
import { tables } from "../db/schema/tables.js";
import { tableSession } from "../db/schema/table-session.js";
import { orders } from "../db/schema/orders.js";


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

export default router;