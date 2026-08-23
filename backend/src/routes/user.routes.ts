import { Router } from "express";
import { db } from "../db/db.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { tableSession } from "../db/schema/table-session.js";
import { tables } from "../db/schema/tables.js";
import { requireAuth } from "../auth/requireAuth.js";
import { eq, and, or, inArray, desc } from "drizzle-orm";


import { companies } from "../db/schema/companies.js";

const router = Router();

// Get user's restaurant status - all restaurants they have access to
router.get("/restaurant-status", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;

    // ✅ 1. AUTH CHECK
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = user.id;
    let companyRestaurants: any[] = [];

    // ✅ 2. IF COMPANY ADMIN, GET ALL RESTAURANTS IN THEIR COMPANY
    if (user.role === 'company_admin') {
      const userCompany = await db.select().from(companies).where(eq(companies.ownerId, userId)).limit(1);
      if (userCompany.length > 0) {
        const companyId = userCompany[0].id;
        const companyRestaurantsRaw = await db
          .select({
            id: restaurants.id,
            name: restaurants.restaurantName,
            type: restaurants.restaurantType,
            address: restaurants.restaurantAddress,
            city: restaurants.city,
            state: restaurants.state,
            status: restaurants.restaurantStatus,
            defaultGstPercentage: restaurants.defaultGstPercentage,
          })
          .from(restaurants)
          .where(eq(restaurants.companyId, companyId));

        companyRestaurants = companyRestaurantsRaw.map(r => ({ ...r, role: 'company_admin' as const }));
      }
    }

    // ✅ 3. GET RESTAURANTS WHERE USER IS OWNER (legacy/independent)
    const ownedRestaurantsRaw = await db
      .select({
        id: restaurants.id,
        name: restaurants.restaurantName,
        type: restaurants.restaurantType,
        address: restaurants.restaurantAddress,
        city: restaurants.city,
        state: restaurants.state,
        status: restaurants.restaurantStatus,
        defaultGstPercentage: restaurants.defaultGstPercentage,
      })
      .from(restaurants)
      .where(eq(restaurants.ownerId, userId));

    const ownedRestaurants = ownedRestaurantsRaw.map(r => ({ ...r, role: 'owner' as const }));

    // ✅ 4. GET RESTAURANTS WHERE USER IS MANAGER/STAFF
    const managerRelationships = await db
      .select({
        restaurantId: restaurantManagers.restaurantId,
        role: restaurantManagers.role,
      })
      .from(restaurantManagers)
      .where(eq(restaurantManagers.userId, userId));

    console.log(`✅ Step 2 complete: Found ${managerRelationships.length} manager relationships`);

    // Then fetch the actual restaurant data for those IDs
    let managedRestaurants: any[] = [];
    if (managerRelationships.length > 0) {
      console.log("🔍 Step 3: Fetching restaurant data for managed restaurants...");
      const restaurantIds = managerRelationships.map(r => r.restaurantId);
      const restaurantData = await db
        .select({
          id: restaurants.id,
          name: restaurants.restaurantName,
          type: restaurants.restaurantType,
          address: restaurants.restaurantAddress,
          city: restaurants.city,
          state: restaurants.state,
          status: restaurants.restaurantStatus,
          defaultGstPercentage: restaurants.defaultGstPercentage,
        })
        .from(restaurants)
        .where(inArray(restaurants.id, restaurantIds));

      console.log(`✅ Step 3 complete: Found ${restaurantData.length} restaurants`);

      // Combine with roles
      managedRestaurants = restaurantData.map(restaurant => {
        const relationship = managerRelationships.find(r => r.restaurantId === restaurant.id);
        return {
          ...restaurant,
          role: relationship?.role || 'staff',
        };
      });
    }

    // ✅ 5. COMBINE RESULTS
    const allRestaurants = [...companyRestaurants, ...ownedRestaurants, ...managedRestaurants];

    // ✅ 6. REMOVE DUPLICATES (if user is both owner and manager)
    const uniqueRestaurants = allRestaurants.filter(
      (restaurant, index, self) =>
        index === self.findIndex((r) => r.id === restaurant.id)
    );

    // ✅ 6. SUCCESS RESPONSE
    if (uniqueRestaurants.length === 0) {
      return res.status(200).json({
        success: true,
        hasRestaurant: false,
        restaurant: null,
        role: null,
        restaurantRole: null,
      });
    }

    // Return first restaurant (primary one)
    const primaryRestaurant = uniqueRestaurants[0];

    return res.status(200).json({
      success: true,
      hasRestaurant: true,
      restaurant: {
        id: primaryRestaurant.id,
        restaurantName: primaryRestaurant.name,
        type: primaryRestaurant.type,
        address: primaryRestaurant.address,
        city: primaryRestaurant.city,
        state: primaryRestaurant.state,
        isOpen: primaryRestaurant.status === 'active',
        defaultGstPercentage: primaryRestaurant.defaultGstPercentage ? Number(primaryRestaurant.defaultGstPercentage) : 0,
      },
      role: primaryRestaurant.role,
      restaurantRole: primaryRestaurant.role,
      // Include all restaurants for future use
      allRestaurants: uniqueRestaurants,
      totalCount: uniqueRestaurants.length,
    });
  } catch (error) {
    console.error("GET USER RESTAURANT STATUS ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get user's role for a specific restaurant
router.get("/restaurants/:id/my-role", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const restaurantId = req.params.id;

    // ✅ 1. AUTH CHECK
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = user.id;

    // ✅ 2. CHECK IF USER IS OWNER
    const ownerCheck = await db
      .select()
      .from(restaurants)
      .where(and(eq(restaurants.id, restaurantId), eq(restaurants.ownerId, userId)))
      .limit(1);

    if (ownerCheck.length > 0) {
      return res.status(200).json({ role: "owner" });
    }

    // ✅ 3. CHECK IF USER IS MANAGER/STAFF
    const managerCheck = await db
      .select({
        role: restaurantManagers.role,
      })
      .from(restaurantManagers)
      .where(and(
        eq(restaurantManagers.restaurantId, restaurantId),
        eq(restaurantManagers.userId, userId)
      ))
      .limit(1);

    if (managerCheck.length > 0) {
      return res.status(200).json({ role: managerCheck[0].role });
    }

    // ✅ 4. NO ACCESS
    return res.status(403).json({ message: "No access to this restaurant" });
  } catch (error) {
    console.error("GET USER RESTAURANT ROLE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get user's active session
router.get("/active-session", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = user.id;

    // Find active session for this user
    const activeSession = await db
      .select({
        id: tableSession.id,
        tableId: tableSession.tableId,
        restaurantId: tableSession.restaurantId,
        qrToken: tableSession.qrToken,
        status: tableSession.status,
        paymentStatus: tableSession.paymentStatus,
        startedAt: tableSession.startedAt,
        tableNumber: tables.tableNumber,
      })
      .from(tableSession)
      .innerJoin(tables, eq(tableSession.tableId, tables.id))
      .where(and(
        eq(tableSession.createdByUserId, userId),
        eq(tableSession.status, "active")
      ))
      .orderBy(desc(tableSession.startedAt))
      .limit(1);

    if (activeSession.length === 0) {
      return res.status(200).json({
        success: true,
        hasActiveSession: false,
        session: null,
      });
    }

    const session = activeSession[0];

    return res.status(200).json({
      success: true,
      hasActiveSession: true,
      session: {
        sessionId: session.id,
        tableId: session.tableId,
        tableNumber: session.tableNumber,
        restaurantId: session.restaurantId,
        qrToken: session.qrToken,
        status: session.status,
        paymentStatus: session.paymentStatus,
        startedAt: session.startedAt,
      },
    });
  } catch (error) {
    console.error("GET USER ACTIVE SESSION ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;