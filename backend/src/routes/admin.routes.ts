import { Router } from "express";

import { isAdmin, isSuperAdminOrCompanyAdmin, getCompanyForAdmin } from "../lib/checkRoles.js";
import { getClientIp } from "../lib/getIpAddress.js";

import { adminAuditLogs } from "../db/schema/admin-audit-logs.js";
import { restaurants } from "../db/schema/restaurants.js";
import { authUsers } from "../db/schema/auth-users.js";
import { reservations } from "../db/schema/reservations.js";
import { restaurantRequests } from "../db/schema/restaurant-requests.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { tables } from "../db/schema/tables.js";
import { payments } from "../db/schema/payments.js";
import { orders } from "../db/schema/orders.js";
import { orderItems } from "../db/schema/order-items.js";
import { menuItems } from "../db/schema/menu-items.js";
import { menuCategories } from "../db/schema/menu-categories.js";
import { tableQR } from "../db/schema/table-qr.js";

import { requireAuth } from "../auth/requireAuth.js";
import { db } from "../db/db.js";

import { nanoid } from "nanoid";
import { eq, sql, gte, lte, and, inArray, desc } from "drizzle-orm";

const router = Router();

/**
 * ✅ GET ALL RESTAURANTS (ADMIN ONLY)
 */
router.get("/restaurants", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const companyId = await getCompanyForAdmin(user.id);
    const superAdmin = await isAdmin(user.id);

    // Build the query
    let query = db
      .select({
        id: restaurants.id,
        name: restaurants.restaurantName,
        email: restaurants.email,
        phone: restaurants.phoneNumber,
        status: sql<string>`CASE 
          WHEN ${restaurants.restaurantStatus} = 'active' THEN 'approved'
          WHEN ${restaurants.restaurantStatus} = 'suspended' THEN 'suspended'
          ELSE 'pending'
        END`,
        createdAt: restaurants.createdAt,
        ownerName: authUsers.name,
      })
      .from(restaurants)
      .leftJoin(restaurantManagers, and(
        eq(restaurantManagers.restaurantId, restaurants.id),
        eq(restaurantManagers.role, "owner")
      ))
      .leftJoin(authUsers, eq(restaurantManagers.userId, authUsers.id));

    // Filter by company if not super admin
    if (!superAdmin && companyId) {
      // @ts-ignore - dynamic where
      query = query.where(eq(restaurants.companyId, companyId));
    } else if (!superAdmin && !companyId) {
      // Company admin with no company? Should not happen but safety first
      return res.status(200).json({ restaurants: [] });
    }

    const restaurantList = await query;

    // ✅ Correct IP extraction
    const ipAddress = getClientIp(req);

    // ✅ FIXED AUDIT LOG VALUES (ENUM SAFE + NO FAKE TARGET ID)
    const details = req.details;
    const adminAuditLog = {
      id: nanoid(),
      adminUserId: user.id,
      action: "VIEW_RESTAURANTS" as const,
      targetType: "restaurant",
      targetId: null, // ✅ NOT "all"
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"] as string | undefined,
      details: details,
    };

    await db.insert(adminAuditLogs).values(adminAuditLog);

    return res.status(200).json({ restaurants: restaurantList });
  } catch (err) {
    console.error("Error fetching restaurants:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ SUSPEND RESTAURANT
 */
router.patch("/restaurants/suspend/:id", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const restaurantId = req.params.id;
    const superAdmin = await isAdmin(user.id);
    const companyId = await getCompanyForAdmin(user.id);

    // Ownership check for company admins
    if (!superAdmin) {
      const targetRest = await db.select({ companyId: restaurants.companyId }).from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
      if (targetRest.length === 0 || targetRest[0].companyId !== companyId) {
        return res.status(403).json("You do not have permission to manage this restaurant");
      }
    }

    const { reason } = req.body;

    // ✅ LOGIC FIX: reason is now mandatory
    if (!reason || reason.trim().length < 5) {
      return res
        .status(400)
        .json({ message: "Valid suspension reason is required" });
    }

    const restaurant = await db
      .update(restaurants)
      .set({
        restaurantStatus: "suspended",
        suspendedAt: new Date(),
        suspendedReason: reason,
      })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (restaurant.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // ✅ Correct IP extraction
    const ipAddress = getClientIp(req);

    // ✅ FIXED AUDIT LOG VALUES
    const adminAuditLog = {
      id: nanoid(),
      adminUserId: user.id,
      action: "SUSPEND_RESTAURANT" as const,
      targetType: "restaurant",
      targetId: restaurantId,
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"] as string | undefined,
      details: JSON.stringify({
        reason,
        previousStatus: "active",
        newStatus: "suspended",
      }),
    };

    await db.insert(adminAuditLogs).values(adminAuditLog);

    return res.status(200).json({ restaurant: restaurant[0] });
  } catch (err) {
    console.error("Error suspending restaurant:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ REACTIVATE RESTAURANT
 */
router.patch(
  "/restaurants/reactivate/:id",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

      if (!isAllowedUser) {
        return res.status(403).json("You are not authorized to do this");
      }

      const restaurantId = req.params.id;
      const superAdmin = await isAdmin(user.id);
      const companyId = await getCompanyForAdmin(user.id);

      // Ownership check for company admins
      if (!superAdmin) {
        const targetRest = await db.select({ companyId: restaurants.companyId }).from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
        if (targetRest.length === 0 || targetRest[0].companyId !== companyId) {
          return res.status(403).json("You do not have permission to manage this restaurant");
        }
      }

      const restaurant = await db
        .update(restaurants)
        .set({
          restaurantStatus: "active",
          suspendedAt: null,
          suspendedReason: null,
        })
        .where(eq(restaurants.id, restaurantId))
        .returning();

      if (restaurant.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // ✅ Correct IP extraction
      const ipAddress = getClientIp(req);

      // ✅ FIXED AUDIT LOG VALUES
      const adminAuditLog = {
        id: nanoid(),
        adminUserId: user.id,
        action: "UNSUSPEND_RESTAURANT" as const,
        targetType: "restaurant",
        targetId: restaurantId,
        ipAddress: ipAddress,
        userAgent: req.headers["user-agent"] as string | undefined,
        details: JSON.stringify({
          previousStatus: "suspended",
          newStatus: "active",
        }),
      };

      await db.insert(adminAuditLogs).values(adminAuditLog);

      return res.status(200).json({ restaurant: restaurant[0] });
    } catch (err) {
      console.error("Error reactivating restaurant:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);


/**
 * ✅ APPROVE RESTAURANT REQUEST
 */
router.patch("/restaurants/:id/approve", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const restaurantId = req.params.id;

    // First, get the pending request to get the userId
    const pendingRequest = await db
      .select()
      .from(restaurantRequests)
      .where(and(
        eq(restaurantRequests.restaurantId, restaurantId),
        eq(restaurantRequests.requestStatus, "PENDING")
      ))
      .limit(1);

    if (pendingRequest.length === 0) {
      return res.status(404).json({ message: "No pending request found for this restaurant" });
    }

    const requestUserId = pendingRequest[0].userId;

    // Update restaurant status to active
    const restaurant = await db
      .update(restaurants)
      .set({
        restaurantStatus: "active",
      })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (restaurant.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Update the request status to approved
    await db
      .update(restaurantRequests)
      .set({
        requestStatus: "APPROVED",
        reviewedAt: new Date(),
        reviewedByAdminId: user.id,
      })
      .where(and(
        eq(restaurantRequests.restaurantId, restaurantId),
        eq(restaurantRequests.requestStatus, "PENDING")
      ));

    // Create owner manager entry
    console.log(`[APPROVE] Inserting manager entry for user ${requestUserId}`);
    await db.insert(restaurantManagers).values({
      id: nanoid(),
      userId: requestUserId,
      restaurantId: restaurantId,
      role: "owner",
      status: "active",
    }).onConflictDoUpdate({
      target: [restaurantManagers.userId, restaurantManagers.restaurantId],
      set: { role: "owner", status: "active" }
    });

    // Promote user role
    console.log(`[APPROVE] Promoting user ${requestUserId} to restaurant role`);
    await db
      .update(authUsers)
      .set({ role: "restaurant" })
      .where(eq(authUsers.id, requestUserId));

    // ✅ Correct IP extraction
    const ipAddress = getClientIp(req);

    // ✅ FIXED AUDIT LOG VALUES
    console.log(`[APPROVE] Logging audit event`);
    const adminAuditLog = {
      id: nanoid(),
      adminUserId: user.id,
      action: "APPROVE_RESTAURANT" as const,
      targetType: "restaurant",
      targetId: restaurantId,
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"] as string | undefined,
      details: JSON.stringify({
        previousStatus: "inactive",
        newStatus: "active",
        requestStatus: "APPROVED",
      }),
    };

    await db.insert(adminAuditLogs).values(adminAuditLog);

    console.log(`[APPROVE] Successfully approved restaurant ${restaurantId}`);
    return res.status(200).json({ restaurant: restaurant[0] });
  } catch (err) {
    console.error("Error approving restaurant:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }
});

/**
 * ✅ REJECT RESTAURANT REQUEST
 */
router.patch("/restaurants/:id/reject", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const restaurantId = req.params.id;
    const { reason } = req.body;

    // ✅ LOGIC FIX: reason is now mandatory
    if (!reason || reason.trim().length < 5) {
      return res
        .status(400)
        .json({ message: "Valid rejection reason is required" });
    }

    // Update the request status to rejected
    const updatedRequest = await db
      .update(restaurantRequests)
      .set({
        requestStatus: "REJECTED",
        reviewedAt: new Date(),
        reviewedByAdminId: user.id,
        adminRemark: reason,
      })
      .where(and(
        eq(restaurantRequests.restaurantId, restaurantId),
        eq(restaurantRequests.requestStatus, "PENDING")
      ))
      .returning();

    if (updatedRequest.length === 0) {
      return res.status(404).json({ message: "Pending request not found" });
    }

    // ✅ Correct IP extraction
    const ipAddress = getClientIp(req);

    // ✅ FIXED AUDIT LOG VALUES
    const adminAuditLog = {
      id: nanoid(),
      adminUserId: user.id,
      action: "REJECT_RESTAURANT" as const,
      targetType: "restaurant",
      targetId: restaurantId,
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"] as string | undefined,
      details: JSON.stringify({
        reason,
        requestStatus: "REJECTED",
      }),
    };

    await db.insert(adminAuditLogs).values(adminAuditLog);

    return res.status(200).json({ message: "Restaurant request rejected" });
  } catch (err) {
    console.error("Error rejecting restaurant:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// Update Restaurant Details
router.put("/restaurants/:id", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const restaurantId = req.params.id;
    const { name, address, contactEmail } = req.body;

    const restaurant = await db
      .update(restaurants)
      .set({
        restaurantName: name,
        restaurantAddress: address,
        email: contactEmail,
      })
      .where(eq(restaurants.id, restaurantId))
      .returning();

    if (restaurant.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // ✅ Correct IP extraction
    const ipAddress = getClientIp(req);

    // ✅ FIXED AUDIT LOG VALUES
    const adminAuditLog = {
      id: nanoid(),
      adminUserId: user.id,
      action: "UPDATE_RESTAURANT" as const,
      targetType: "restaurant",
      targetId: restaurantId,
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"] as string | undefined,
      details: JSON.stringify({
        updatedFields: { name, address, contactEmail },
      }),
    };

    await db.insert(adminAuditLogs).values(adminAuditLog);

    return res.status(200).json({ restaurant: restaurant[0] });
  } catch (err) {
    console.error("Error updating restaurant:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// QR Generation for Admin
router.post("/tables/:tableId/qrcode", requireAuth, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const { restaurantId } = req.body;
    const user = req.user;

    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);
    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const superAdmin = await isAdmin(user.id);
    const companyId = await getCompanyForAdmin(user.id);

    // Ownership check for company admins
    if (!superAdmin) {
      const targetRest = await db.select({ companyId: restaurants.companyId }).from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
      if (targetRest.length === 0 || targetRest[0].companyId !== companyId) {
        return res.status(403).json("You do not have permission to manage this restaurant");
      }
    }

    // Get table & restaurant
    const table = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.id, tableId),
          eq(tables.restaurantId, restaurantId)
        )
      )
      .limit(1);

    if (table.length === 0) {
      return res.status(404).json({ message: "Table not found" });
    }

    // Generate a new QR token
    const qrToken = nanoid(32);

    // Step 1: Delete any existing QR code for the table
    await db.delete(tableQR).where(eq(tableQR.tableId, tableId));

    // Step 2: Insert the new QR code
    await db.insert(tableQR).values({
      id: nanoid(),
      restaurantId,
      tableId,
      qrToken,
      isLocked: false,
      createdAt: new Date(),
    });

    // Step 3: Generate the QR code image
    const scanUrl = `${process.env.BACKEND_URL}/api/qr/scan/${qrToken}`;

    // Return the response
    return res.status(201).json({
      message: "QR code generated successfully",
      qrToken,
      scanUrl,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// Get all tables for a specific restaurant (Admin)
router.get("/restaurants/:restaurantId/tables", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const { restaurantId } = req.params;
    const superAdmin = await isAdmin(user.id);
    const companyId = await getCompanyForAdmin(user.id);

    // Ownership check for company admins
    if (!superAdmin) {
      const targetRest = await db.select({ companyId: restaurants.companyId }).from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
      if (targetRest.length === 0 || targetRest[0].companyId !== companyId) {
        return res.status(403).json("You do not have permission to manage this restaurant");
      }
    }

    const tablesList = await db
      .select()
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId))
      .orderBy(sql`${tables.tableNumber} ASC`);

    return res.status(200).json({ tables: tablesList });
  } catch (err) {
    console.error("Error fetching restaurant tables for admin:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// Admin analytics

router.get("/analytics/restaurants/count", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const superAdmin = await isAdmin(user.id);
    const companyId = await getCompanyForAdmin(user.id);

    let query = db.select().from(restaurants);

    if (!superAdmin && companyId) {
      // @ts-ignore - dynamic where
      query = query.where(eq(restaurants.companyId, companyId));
    }

    const result = await query;
    const totalRestaurants = result.length;

    return res.status(200).json({ totalRestaurants });
  } catch (err) {
    console.error("Error fetching restaurant count:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/analytics/orders/count", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const superAdmin = await isAdmin(user.id);
    const companyId = await getCompanyForAdmin(user.id);

    let query = db.select().from(orders);

    if (!superAdmin && companyId) {
      // Join with restaurants to filter by companyId
      // @ts-ignore - dynamic join/where
      query = query.innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
        .where(eq(restaurants.companyId, companyId));
    }

    const totalOrders = await query;
    const countTotalOrders = totalOrders.length;
    return res.status(200).json({ countTotalOrders });
  } catch (err) {
    console.error("Error fetching order count:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/analytics/failed-payments", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const superAdmin = await isAdmin(user.id);
    const companyId = await getCompanyForAdmin(user.id);

    let query = db.select().from(payments);
    const conditions = [eq(payments.status, "failed")];

    if (!superAdmin && companyId) {
      // @ts-ignore - dynamic join/where
      query = query.innerJoin(restaurants, eq(payments.restaurantId, restaurants.id));
      conditions.push(eq(restaurants.companyId, companyId));
    }

    // @ts-ignore
    const failedPayments = await query.where(and(...conditions));

    return res.status(200).json({ failedPayments });
  } catch (err) {
    console.error("Error fetching failed payments:", err);
    return res.status(500).json({ message: "Internal server error" });
  }

});

/**
 * ✅ ADMIN DASHBOARD OVERVIEW
 */
router.get("/dashboard/overview", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const companyId = await getCompanyForAdmin(user.id);
    const superAdmin = await isAdmin(user.id);

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter helpers
    const restaurantFilter = (!superAdmin && companyId) ? eq(restaurants.companyId, companyId) : undefined;

    // For tables that don't have companyId, we need to join with restaurants
    const getJoinFilter = (table: any) => {
      if (!superAdmin && companyId) {
        return inArray(
          table.restaurantId,
          db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.companyId, companyId))
        );
      }
      return undefined;
    };

    const orderFilter = getJoinFilter(orders);
    const paymentFilter = getJoinFilter(payments);
    const reservationFilter = getJoinFilter(reservations);

    // 1. Total restaurants
    const totalRestConditions = [];
    if (restaurantFilter) totalRestConditions.push(restaurantFilter);
    let totalRestQuery = db.select({ count: sql<number>`COUNT(*)` }).from(restaurants);
    if (totalRestConditions.length > 0) totalRestQuery = totalRestQuery.where(and(...totalRestConditions)) as any;
    const totalRestaurants = await totalRestQuery;

    // 2. Active restaurants
    const activeRestConditions = [eq(restaurants.restaurantStatus, "active")];
    if (restaurantFilter) activeRestConditions.push(restaurantFilter);
    let activeRestQuery = db.select({ count: sql<number>`COUNT(*)` }).from(restaurants).where(and(...activeRestConditions));
    const activeRestaurants = await activeRestQuery;

    // 3. Total users - For company admins, we'll show users linked to their restaurants
    let totalUsers;
    if (!superAdmin && companyId) {
      totalUsers = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${authUsers.id})` })
        .from(authUsers)
        .innerJoin(restaurantManagers, eq(restaurantManagers.userId, authUsers.id))
        .innerJoin(restaurants, and(eq(restaurants.id, restaurantManagers.restaurantId), eq(restaurants.companyId, companyId)));
    } else {
      totalUsers = await db.select({ count: sql<number>`COUNT(*)` }).from(authUsers);
    }

    // 4. Today's orders
    const todayOrdersConditions = [gte(orders.createdAt, today), sql`${orders.createdAt} < ${tomorrow}`];
    if (orderFilter) todayOrdersConditions.push(orderFilter);
    let todayOrdersQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(and(...todayOrdersConditions));
    const todayOrders = await todayOrdersQuery;

    // 5. Today's revenue
    const todayRevConditions = [gte(orders.createdAt, today), sql`${orders.createdAt} < ${tomorrow}`];
    if (orderFilter) todayRevConditions.push(orderFilter);
    let todayRevQuery = db
      .select({ revenue: sql<number>`COALESCE(SUM(CAST(${orders.grandTotal} AS DECIMAL)), 0)` })
      .from(orders)
      .where(and(...todayRevConditions));
    const todayRevenue = await todayRevQuery;

    // 6. Today's reservations
    const todayResConditions = [gte(reservations.reservationTime, today), sql`${reservations.reservationTime} < ${tomorrow}`];
    if (reservationFilter) todayResConditions.push(reservationFilter);
    let todayResQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reservations)
      .where(and(...todayResConditions));
    const todayReservations = await todayResQuery;

    // 7. Recent orders
    let recentOrdersQuery = db
      .select({
        id: orders.id,
        restaurantId: orders.restaurantId,
        status: orders.status,
        totalAmount: orders.grandTotal,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(sql`${orders.createdAt} DESC`);
    if (orderFilter) recentOrdersQuery = recentOrdersQuery.where(orderFilter) as any;
    const recentOrders = await recentOrdersQuery.limit(10);

    // 8. Recent payments
    let recentPaymentsQuery = db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
        restaurantId: payments.restaurantId,
      })
      .from(payments)
      .orderBy(sql`${payments.createdAt} DESC`);
    if (paymentFilter) recentPaymentsQuery = recentPaymentsQuery.where(paymentFilter) as any;
    const recentPayments = await recentPaymentsQuery.limit(10);

    // 9. Failed payments
    const failedPaymentsConditions = [eq(payments.status, "failed")];
    if (paymentFilter) failedPaymentsConditions.push(paymentFilter);
    let failedPaymentsQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payments)
      .where(and(...failedPaymentsConditions));
    const failedPayments = await failedPaymentsQuery;

    return res.status(200).json({
      overview: {
        totalRestaurants: Number(totalRestaurants[0]?.count || 0),
        activeRestaurants: Number(activeRestaurants[0]?.count || 0),
        totalUsers: Number(totalUsers[0]?.count || 0),
        todayOrders: Number(todayOrders[0]?.count || 0),
        todayRevenue: Number(todayRevenue[0]?.revenue || 0),
        todayReservations: Number(todayReservations[0]?.count || 0),
        failedPayments: Number(failedPayments[0]?.count || 0),
      },
      recentActivity: {
        orders: recentOrders.map(o => ({ ...o, totalAmount: Number(o.totalAmount || 0) })),
        payments: recentPayments.map(p => ({ ...p, amount: Number(p.amount || 0) })),
      },
    });
  } catch (err) {
    console.error("Error fetching admin dashboard overview:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ ADMIN ANALYTICS - PLATFORM WIDE
 */
/**
 * ✅ ADMIN ANALYTICS - PLATFORM WIDE / COMPREHENSIVE
 */
router.get("/analytics/platform", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);
    const { period = "30", restaurantId, startDate: qStartDate, endDate: qEndDate } = req.query;

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const companyId = await getCompanyForAdmin(user.id);
    const superAdmin = await isAdmin(user.id);

    // 1. Resolve Data Range
    let startDate: Date;
    let endDate: Date = qEndDate ? new Date(qEndDate as string) : new Date();

    if (qStartDate) {
      startDate = new Date(qStartDate as string);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period as string));
    }

    // 2. Auth Scoping & Filters
    let allowedIds: string[] | null = null;
    const baseConditions: any[] = [
      gte(orders.createdAt, startDate),
      lte(orders.createdAt, endDate),
      inArray(orders.status, ['placed', 'preparing', 'ready', 'served'])
    ];

    if (!superAdmin) {
      if (!companyId) {
        return res.status(403).json("Company ID not found for admin");
      }

      // Get list of restaurants belonging to this company
      const companyRestros = await db
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(eq(restaurants.companyId, companyId));

      allowedIds = companyRestros.map(r => r.id);

      if (restaurantId) {
        // Check if the requested restaurantId is in the allowed list
        if (!allowedIds.includes(restaurantId as string)) {
          return res.status(403).json("You do not have permission to view analytics for this restaurant");
        }
        baseConditions.push(eq(orders.restaurantId, restaurantId as string));
      } else {
        // Scope to all company restaurants
        if (allowedIds.length === 0) {
          return res.status(200).json({
            orderMetrics: { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, avgDailyRevenue: 0, estMonthlyRevenue: 0, estYearlyRevenue: 0 },
            timeSeries: [],
            categoryPerformance: [],
            topItems: [],
            paymentDistribution: [],
            peakHours: [],
            peakDays: []
          });
        }
        baseConditions.push(inArray(orders.restaurantId, allowedIds));
      }
    } else if (restaurantId) {
      baseConditions.push(eq(orders.restaurantId, restaurantId as string));
    }

    // --- 3. METRICS CALCULATIONS ---

    // A. Summary Metrics
    const summaryMetrics = await db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(${orders.grandTotal}), 0)`,
        avgOrderValue: sql<number>`AVG(${orders.grandTotal})`,
      })
      .from(orders)
      .where(and(...baseConditions));

    // B. Time Series (Daily Revenue)
    const timeSeries = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sql<number>`SUM(${orders.grandTotal})`,
        orders: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(...baseConditions))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt}) ASC`);

    // C. Category Performance
    const categoryPerformance = await db
      .select({
        categoryName: menuCategories.category,
        revenue: sql<number>`SUM(${orderItems.totalPrice})`,
        quantity: sql<number>`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(and(...baseConditions))
      .groupBy(menuCategories.category)
      .orderBy(desc(sql`SUM(${orderItems.totalPrice})`));

    // D. Top Menu Items
    const topItems = await db
      .select({
        itemName: menuItems.name,
        revenue: sql<number>`SUM(${orderItems.totalPrice})`,
        quantity: sql<number>`SUM(${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(...baseConditions))
      .groupBy(menuItems.name)
      .orderBy(desc(sql`SUM(${orderItems.totalPrice})`))
      .limit(10);

    // E. Payment Method Distribution
    const paymentDistribution = await db
      .select({
        method: payments.method,
        revenue: sql<number>`SUM(${payments.finalAmount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.tableSessionId, orders.tableSessionId)) // Approximating session linking
      .where(and(
        gte(payments.createdAt, startDate),
        lte(payments.createdAt, endDate),
        eq(payments.status, 'success'),
        restaurantId ? eq(payments.restaurantId, restaurantId as string) : (allowedIds?.length > 0 ? inArray(payments.restaurantId, allowedIds) : sql`TRUE`),
      ))
      .groupBy(payments.method);

    // F. Peak Hours Analysis
    const peakHours = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${orders.createdAt})`,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`SUM(${orders.grandTotal})`,
      })
      .from(orders)
      .where(and(...baseConditions))
      .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt}) ASC`);

    // H. Peak Day (Day of Week) Analysis
    const peakDays = await db
      .select({
        day: sql<number>`EXTRACT(DOW FROM ${orders.createdAt})`, // 0 (Sun) to 6 (Sat)
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`SUM(${orders.grandTotal})`,
      })
      .from(orders)
      .where(and(...baseConditions))
      .groupBy(sql`EXTRACT(DOW FROM ${orders.createdAt})`)
      .orderBy(sql`EXTRACT(DOW FROM ${orders.createdAt}) ASC`);

    // G. Top Performing Restaurants (for multi-restaurant views)
    let topPerformingRestaurants = [];
    if (!restaurantId) {
      topPerformingRestaurants = await db
        .select({
          restaurantId: orders.restaurantId,
          restaurantName: restaurants.restaurantName,
          totalRevenue: sql<number>`SUM(${orders.grandTotal})`,
          totalOrders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
        .where(and(...baseConditions))
        .groupBy(orders.restaurantId, restaurants.restaurantName)
        .orderBy(desc(sql`SUM(${orders.grandTotal})`))
        .limit(10);
    }

    const totalRevenue = Number(summaryMetrics[0]?.totalRevenue || 0);
    const dayCount = Math.max(Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)), 1);
    const avgDailyRevenue = totalRevenue / dayCount;

    return res.status(200).json({
      period: qStartDate ? 'custom' : `${period} days`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      orderMetrics: {
        totalOrders: Number(summaryMetrics[0]?.totalOrders || 0),
        totalRevenue: totalRevenue,
        avgOrderValue: Number(summaryMetrics[0]?.avgOrderValue || 0),
        avgDailyRevenue: avgDailyRevenue,
        estMonthlyRevenue: avgDailyRevenue * 30,
        estYearlyRevenue: avgDailyRevenue * 365,
      },
      timeSeries: timeSeries.map(ts => ({ ...ts, revenue: Number(ts.revenue || 0), orders: Number(ts.orders || 0) })),
      categoryPerformance: categoryPerformance.map(cp => ({ ...cp, revenue: Number(cp.revenue || 0), quantity: Number(cp.quantity || 0) })),
      topItems: topItems.map(ti => ({ ...ti, revenue: Number(ti.revenue || 0), quantity: Number(ti.quantity || 0) })),
      paymentDistribution: paymentDistribution.map(pd => ({ ...pd, revenue: Number(pd.revenue || 0), count: Number(pd.count || 0) })),
      peakHours: peakHours.map(ph => ({ ...ph, hour: Number(ph.hour), count: Number(ph.count || 0), revenue: Number(ph.revenue || 0) })),
      peakDays: peakDays.map(pd => ({ ...pd, day: Number(pd.day), count: Number(pd.count || 0), revenue: Number(pd.revenue || 0) })),
      topPerformingRestaurants: topPerformingRestaurants.map(r => ({ ...r, totalRevenue: Number(r.totalRevenue || 0), totalOrders: Number(r.totalOrders || 0) }))
    });

  } catch (err) {
    console.error("Error fetching comprehensive platform analytics:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ GET ADMIN STATS (ADMIN ONLY)
 */
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isSuperAdminOrCompanyAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json({ message: "You are not authorized to do this" });
    }

    const companyId = await getCompanyForAdmin(user.id);
    const superAdmin = await isAdmin(user.id);

    // Filter helpers
    const restaurantFilter = (!superAdmin && companyId) ? eq(restaurants.companyId, companyId) : undefined;

    // 1. Total restaurants
    const totalRestConditions = [];
    if (restaurantFilter) totalRestConditions.push(restaurantFilter);
    let totalRestQuery = db.select({ count: sql<number>`count(*)` }).from(restaurants);
    if (totalRestConditions.length > 0) totalRestQuery = totalRestQuery.where(and(...totalRestConditions)) as any;
    const [totalRestaurantsResult] = await totalRestQuery;

    // 2. Active restaurants
    const activeRestConditions = [eq(restaurants.restaurantStatus, "active")];
    if (restaurantFilter) activeRestConditions.push(restaurantFilter);
    let activeRestQuery = db.select({ count: sql<number>`count(*)` }).from(restaurants).where(and(...activeRestConditions));
    const [activeRestaurantsResult] = await activeRestQuery;

    // 3. Total users
    let totalUsers;
    if (!superAdmin && companyId) {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${authUsers.id})` })
        .from(authUsers)
        .innerJoin(restaurantManagers, eq(restaurantManagers.userId, authUsers.id))
        .innerJoin(restaurants, and(eq(restaurants.id, restaurantManagers.restaurantId), eq(restaurants.companyId, companyId)));
      totalUsers = countResult.count;
    } else {
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(authUsers);
      totalUsers = countResult.count;
    }

    // 4. Total revenue
    let totalRevenue = 0;
    if (!superAdmin && companyId) {
      const [revResult] = await db
        .select({ revenue: sql<number>`COALESCE(SUM(CAST(${orders.grandTotal} AS DECIMAL)), 0)` })
        .from(orders)
        .innerJoin(restaurants, and(eq(restaurants.id, orders.restaurantId), eq(restaurants.companyId, companyId)));
      totalRevenue = revResult.revenue;
    } else {
      // Super admin revenue view? For now let's leave as 0 or implement globally
      const [revResult] = await db.select({ revenue: sql<number>`COALESCE(SUM(CAST(${orders.grandTotal} AS DECIMAL)), 0)` }).from(orders);
      totalRevenue = revResult.revenue;
    }

    const stats = {
      totalRestaurants: Number(totalRestaurantsResult.count || 0),
      activeRestaurants: Number(activeRestaurantsResult.count || 0),
      totalUsers: Number(totalUsers || 0),
      totalRevenue: Number(totalRevenue || 0),
    };

    // ✅ Audit log
    const ipAddress = getClientIp(req);
    const adminAuditLog = {
      id: nanoid(),
      adminUserId: user.id,
      action: "VIEW_RESTAURANTS" as const,
      targetType: "system",
      targetId: null,
      ipAddress: ipAddress,
      userAgent: req.headers["user-agent"] as string | undefined,
      details: "Viewed admin dashboard stats",
    };

    await db.insert(adminAuditLogs).values(adminAuditLog);

    return res.status(200).json(stats);
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ GET AUDIT LOGS
 */
router.get("/audit-logs", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const logs = await db
      .select({
        id: adminAuditLogs.id,
        action: adminAuditLogs.action,
        adminUserId: adminAuditLogs.adminUserId,
        adminName: authUsers.name,
        targetType: adminAuditLogs.targetType,
        targetId: adminAuditLogs.targetId,
        ipAddress: adminAuditLogs.ipAddress,
        timestamp: adminAuditLogs.timestamp,
        details: adminAuditLogs.details,
      })
      .from(adminAuditLogs)
      .leftJoin(authUsers, eq(adminAuditLogs.adminUserId, authUsers.id))
      .orderBy(desc(adminAuditLogs.timestamp))
      .limit(100);

    return res.status(200).json({ logs });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ GET ALL USERS (ADMIN ONLY)
 */
router.get("/users", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const platformUsers = await db
      .select({
        id: authUsers.id,
        name: authUsers.name,
        email: authUsers.email,
        role: authUsers.role,
        image: authUsers.image,
        createdAt: authUsers.createdAt,
      })
      .from(authUsers)
      .orderBy(desc(authUsers.createdAt));

    return res.status(200).json({ users: platformUsers });
  } catch (err) {
    console.error("Error fetching platform users:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ✅ UPDATE USER ROLE
 */
router.patch("/users/:id/role", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const isAllowedUser = await isAdmin(user.id);

    if (!isAllowedUser) {
      return res.status(403).json("You are not authorized to do this");
    }

    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!["admin", "customer", "restaurant", "company_admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const updatedUser = await db
      .update(authUsers)
      .set({ role })
      .where(eq(authUsers.id, targetUserId))
      .returning();

    if (updatedUser.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: updatedUser[0] });
  } catch (err) {
    console.error("Error updating user role:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

