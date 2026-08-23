import { Router } from "express";
import { db } from "../db/db.js";
import { staffInvites } from "../db/schema/staff-invites.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { authUsers } from "../db/schema/auth-users.js";
import { and, eq, or } from "drizzle-orm";
import { requireAuth } from "../auth/requireAuth.js";
import { nanoid } from "nanoid";
import {
  isRestaurantOwner,
  isRestaurantOwnerOrManager,
} from "../lib/checkRoles.js";


const router = Router();

// POST /api/restaurants/:restaurantId/invite-staff
router.post(
  "/:restaurantId/invite-staff",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { invitedEmail } = req.body;

      // 1. AUTH CHECK
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // 2. ROLE CHECK (Fix: await the async function)
      const isOwner = await isRestaurantOwner(user.id, restaurantId);
      if (!isOwner) {
        return res
          .status(403)
          .json({ message: "You do not own this restaurant" });
      }

      // 3. FETCH MANAGER RECORD
      const managerRecord = (
        await db
          .select()
          .from(restaurantManagers)
          .where(
            and(
              eq(restaurantManagers.userId, user.id),
              eq(restaurantManagers.restaurantId, restaurantId)
            )
          )
          .limit(1)
      )[0];

      if (!managerRecord) {
        return res
          .status(403)
          .json({ message: "Manager record not found for this user" });
      }

      // 4. CREATE INVITE
      const inviteToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // Expires in 1 day
      const role = req.body.role;

      await db.insert(staffInvites).values({
        id: nanoid(),
        restaurantId,
        invitedByManagerId: managerRecord.id, // Use the manager ID here
        invitedEmail,
        role,
        inviteToken,
        expiresAt,
      });

      // 5. SUCCESS RESPONSE
      return res
        .status(201)
        .json({ message: "Staff invite created", inviteToken });
    } catch (error) {
      console.error("INVITE STAFF ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/restaurants/:restaurantId/staff-invites
router.get(
  "/:restaurantId/staff-invites",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;

      // 1. AUTH CHECK
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // 2. ROLE CHECK (Fix: await the async function)
      const isOwner = await isRestaurantOwner(user.id, restaurantId);
      if (!isOwner) {
        return res
          .status(403)
          .json({ message: "You do not own this restaurant" });
      }

      // 3. FETCH INVITES
      const invites = await db
        .select()
        .from(staffInvites)
        .where(eq(staffInvites.restaurantId, restaurantId));

      // 4. SUCCESS RESPONSE
      return res.status(200).json({ invites });
    } catch (error) {
      console.error("FETCH STAFF INVITES ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /api/restaurants/:restaurantId/staff - Get all active staff members
router.get(
  "/:restaurantId/staff",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user has permission (owner or manager)
      const hasPermission = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to view staff" });
      }

      // Fetch all active staff members with user details
      const staffMembers = await db
        .select({
          id: restaurantManagers.id,
          userId: restaurantManagers.userId,
          role: restaurantManagers.role,
          status: restaurantManagers.status,
          createdAt: restaurantManagers.createdAt,
          userName: authUsers.name,
          userEmail: authUsers.email,
        })
        .from(restaurantManagers)
        .innerJoin(authUsers, eq(restaurantManagers.userId, authUsers.id))
        .where(
          and(
            eq(restaurantManagers.restaurantId, restaurantId),
            eq(restaurantManagers.status, "active")
          )
        );

      return res.status(200).json({ staff: staffMembers });
    } catch (error) {
      console.error("FETCH STAFF ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// PATCH /api/restaurants/:restaurantId/staff/:staffId/role - Update staff role
router.patch(
  "/:restaurantId/staff/:staffId/role",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, staffId } = req.params;
      const { role } = req.body;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only owner can update roles
      const isOwner = await isRestaurantOwner(user.id, restaurantId);
      if (!isOwner) {
        return res.status(403).json({ message: "Only restaurant owner can update staff roles" });
      }

      // Validate role
      if (!['manager', 'staff', 'kitchen'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be 'manager', 'staff', or 'kitchen'" });
      }

      // Update the role
      await db
        .update(restaurantManagers)
        .set({ 
          role: role as 'manager' | 'staff' | 'kitchen',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(restaurantManagers.id, staffId),
            eq(restaurantManagers.restaurantId, restaurantId)
          )
        );

      return res.status(200).json({ message: "Staff role updated successfully" });
    } catch (error) {
      console.error("UPDATE STAFF ROLE ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// DELETE /api/restaurants/:restaurantId/staff/:staffId - Remove staff member
router.delete(
  "/:restaurantId/staff/:staffId",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, staffId } = req.params;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only owner can remove staff
      const isOwner = await isRestaurantOwner(user.id, restaurantId);
      if (!isOwner) {
        return res.status(403).json({ message: "Only restaurant owner can remove staff members" });
      }

      // Update status to suspended instead of deleting
      await db
        .update(restaurantManagers)
        .set({ 
          status: 'suspended',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(restaurantManagers.id, staffId),
            eq(restaurantManagers.restaurantId, restaurantId)
          )
        );

      return res.status(200).json({ message: "Staff member removed successfully" });
    } catch (error) {
      console.error("REMOVE STAFF ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// DELETE /api/restaurants/:restaurantId/staff-invites/:inviteId - Revoke/cancel invite
router.delete(
  "/:restaurantId/staff-invites/:inviteId",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, inviteId } = req.params;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Only owner or manager can revoke invites
      const hasPermission = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasPermission) {
        return res.status(403).json({ message: "You don't have permission to revoke invites" });
      }

      // Delete the invite
      await db
        .delete(staffInvites)
        .where(
          and(
            eq(staffInvites.id, inviteId),
            eq(staffInvites.restaurantId, restaurantId)
          )
        );

      return res.status(200).json({ message: "Invite revoked successfully" });
    } catch (error) {
      console.error("REVOKE INVITE ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
