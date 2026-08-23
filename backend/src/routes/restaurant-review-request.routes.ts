import { Router } from "express";
import { db } from "../db/db.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantRequests } from "../db/schema/restaurant-requests.js";
import { authUsers } from "../db/schema/auth-users.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { requireAuth } from "../auth/requireAuth.js";
import { nanoid } from "nanoid";
import { isAdmin } from "../lib/checkRoles.js";
import { eq } from "drizzle-orm";


const router = Router();

// Middleware to allow only localhost access
const requireLocalhost = (req: any, res: any, next: any) => {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
    return res.status(403).json({ message: "Access denied: localhost only" });
  }
  next();
};

// GET /api/restaurants/requests
router.get("/restaurants/requests", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;

    // ✅ Admin check using isAdmin
    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }

    const pendingRequests = await db
      .select({
        requestId: restaurantRequests.id,
        requestStatus: restaurantRequests.requestStatus,
        requestedAt: restaurantRequests.requestedAt,

        restaurantId: restaurants.id,
        restaurantName: restaurants.restaurantName,
        city: restaurants.city,
        state: restaurants.state,
        phoneNumber: restaurants.phoneNumber,
        email: restaurants.email,

        ownerId: authUsers.id,
        ownerEmail: authUsers.email,
        ownerName: authUsers.name,
      })
      .from(restaurantRequests)
      .innerJoin(
        restaurants,
        eq(restaurantRequests.restaurantId, restaurants.id)
      )
      .innerJoin(authUsers, eq(restaurantRequests.userId, authUsers.id))
      .where(eq(restaurantRequests.requestStatus, "PENDING"));

    return res.json(pendingRequests);
  } catch (error) {
    console.error("ADMIN FETCH REQUESTS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch requests" });
  }
});

// POST /api/restaurants/:requestId/approve
router.post(
  "/restaurants/:requestId/approve",
  requireAuth,
  async (req: any, res) => {
    const user = req.user;

    // ✅ Admin check using isAdmin
    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }

    const { requestId } = req.params;

    try {
      // 1. Get request
      const requests = await db
        .select()
        .from(restaurantRequests)
        .where(eq(restaurantRequests.id, requestId));
      const request = requests[0];

      if (!request || request.requestStatus !== "PENDING") {
        return res
          .status(400)
          .json({ message: "Invalid or already processed request" });
      }

      // 2. Update request
      await db
        .update(restaurantRequests)
        .set({
          requestStatus: "APPROVED",
          reviewedAt: new Date(),
          reviewedByAdminId: user.id,
        })
        .where(eq(restaurantRequests.id, requestId));

      // 3. Activate restaurant
      await db
        .update(restaurants)
        .set({ restaurantStatus: "active" })
        .where(eq(restaurants.id, request.restaurantId));

      // 4. Create owner manager entry
      await db.insert(restaurantManagers).values({
        id: nanoid(),
        userId: request.userId,
        restaurantId: request.restaurantId,
        role: "owner",
        status: "active",
      });

      // 5. Promote user role
      await db
        .update(authUsers)
        .set({ role: "restaurant" })
        .where(eq(authUsers.id, request.userId));

      return res.json({ message: "Restaurant approved successfully" });
    } catch (error) {
      console.error("APPROVE ERROR:", error);
      return res.status(400).json({ message: (error as Error).message });
    }
  }
);

// POST /api/restaurants/:requestId/reject
router.post(
  "/restaurants/:requestId/reject",
  requireAuth,
  async (req: any, res) => {
    const user = req.user;
    const { requestId } = req.params;
    const { adminRemark } = req.body;

    // ✅ Admin check using isAdmin
    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }

    try {
      const requests = await db
        .select()
        .from(restaurantRequests)
        .where(eq(restaurantRequests.id, requestId));
      const request = requests[0];

      if (!request || request.requestStatus !== "PENDING") {
        return res.status(400).json({ message: "Invalid request" });
      }

      await db
        .update(restaurantRequests)
        .set({
          requestStatus: "REJECTED",
          reviewedAt: new Date(),
          reviewedByAdminId: user.id,
          adminRemark,
        })
        .where(eq(restaurantRequests.id, requestId));

      return res.json({ message: "Restaurant request rejected" });
    } catch (error) {
      console.error("REJECT ERROR:", error);
      return res.status(500).json({ message: "Failed to reject request" });
    }
  }
);

// POST /api/restaurants/:requestId/accept-localhost (localhost only)
router.post(
  "/restaurants/:requestId/accept-localhost",
  requireLocalhost,
  async (req: any, res) => {
    const { requestId } = req.params;

    try {
      // 1. Get request
      const requests = await db
        .select()
        .from(restaurantRequests)
        .where(eq(restaurantRequests.id, requestId));
      const request = requests[0];

      if (!request || request.requestStatus !== "PENDING") {
        return res
          .status(400)
          .json({ message: "Invalid or already processed request" });
      }

      // 2. Update request
      await db
        .update(restaurantRequests)
        .set({
          requestStatus: "APPROVED",
          reviewedAt: new Date(),
          reviewedByAdminId: null, // No admin user for localhost
        })
        .where(eq(restaurantRequests.id, requestId));

      // 3. Activate restaurant
      await db
        .update(restaurants)
        .set({ restaurantStatus: "active" })
        .where(eq(restaurants.id, request.restaurantId));

      // 4. Create owner manager entry
      await db.insert(restaurantManagers).values({
        id: nanoid(),
        userId: request.userId,
        restaurantId: request.restaurantId,
        role: "owner",
        status: "active",
      });

      // 5. Promote user role
      await db
        .update(authUsers)
        .set({ role: "restaurant" })
        .where(eq(authUsers.id, request.userId));

      return res.json({ message: "Restaurant accepted successfully via localhost" });
    } catch (error) {
      console.error("ACCEPT LOCALHOST ERROR:", error);
      return res.status(400).json({ message: (error as Error).message });
    }
  }
);

export default router;
