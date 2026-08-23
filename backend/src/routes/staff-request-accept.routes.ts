import { Router } from "express";
import { db } from "../db/db.js";
import { staffInvites } from "../db/schema/staff-invites.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../auth/requireAuth.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { nanoid } from "nanoid";
import { authUsers } from "../db/schema/auth-users.js";
import { restaurants } from "../db/schema/restaurants.js";
import { isRestaurantOwner } from "../lib/checkRoles.js";

const router = Router();

router.get("/view-invite/:inviteToken", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { inviteToken } = req.params;

    // ✅ 1. AUTH CHECK
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ✅ 2. FETCH INVITE BY TOKEN
    const invite = (
      await db
        .select()
        .from(staffInvites)
        .where(eq(staffInvites.inviteToken, inviteToken))
    )[0];

    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    // ✅ 3. OWNERSHIP CHECK (EMAIL FIRST, THEN USER_ID)
    const isEmailOwner = invite.invitedEmail === user.email;
    const isLinkedUser = invite.user_id && invite.user_id === user.id;

    if (!isEmailOwner && !isLinkedUser) {
      return res.status(403).json({ message: "Invalid invite access" });
    }

    // ✅ 4. STATUS CHECK
    if (invite.respondedAt) {
      return res.status(400).json({ message: "Invite already used" });
    }

    // ✅ 5. EXPIRY CHECK
    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ message: "Invite has expired" });
    }

    // ✅ 6. SUCCESS RESPONSE
    return res.status(200).json({ invite });
  } catch (error) {
    console.error("VIEW INVITE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/:inviteToken/accept-invite",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { inviteToken } = req.params;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const invite = (
        await db
          .select()
          .from(staffInvites)
          .where(eq(staffInvites.inviteToken, inviteToken))
      )[0];

      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }

      if (invite.inviteStatus !== "PENDING") {
        return res.status(400).json({ message: "Invite already responded to" });
      }

      if (new Date() > invite.expiresAt) {
        return res.status(400).json({ message: "Invite has expired" });
      }

      // Ownership check
      if (invite.invitedEmail !== user.email && invite.user_id !== user.id) {
        return res
          .status(403)
          .json({ message: "You are not allowed to accept this invite" });
      }

      // 1. Create staff access
      await db.insert(restaurantManagers).values({
        id: nanoid(),
        userId: user.id,
        restaurantId: invite.restaurantId,
        role: invite.role as any,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // 2. Mark invite as accepted
      await db
        .update(staffInvites)
        .set({
          inviteStatus: "ACCEPTED",
          respondedAt: new Date(),
          user_id: user.id,
        })
        .where(eq(staffInvites.inviteToken, inviteToken));

      await db
        .update(authUsers)
        .set({
          role: "restaurant",
        })
        .where(eq(authUsers.id, user.id));

      return res.status(200).json({ message: "Invite accepted successfully" });
    } catch (error) {
      console.error("Error accepting invite:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/my-invites", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || !user.email) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const invites = await db
      .select()
      .from(staffInvites)
      .where(eq(staffInvites.invitedEmail, user.email));

    return res.status(200).json({ invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/my-invites/detail", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;

    if (!user || !user.email) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const detailedInvites = await db
      .select({
        // Invite details
        id: staffInvites.id,
        invitedEmail: staffInvites.invitedEmail,
        role: staffInvites.role,
        inviteToken: staffInvites.inviteToken,
        inviteStatus: staffInvites.inviteStatus,
        invitedAt: staffInvites.invitedAt,
        respondedAt: staffInvites.respondedAt,
        expiresAt: staffInvites.expiresAt,
        // Restaurant details
        restaurantId: restaurants.id,
        restaurantName: restaurants.restaurantName,
        restaurantType: restaurants.restaurantType,
        restaurantAddress: restaurants.restaurantAddress,
        city: restaurants.city,
        state: restaurants.state,
        restaurantLogo: restaurants.restaurantLogo,
        restaurantBanner: restaurants.restaurantBanner,
        // Invited by user details
        invitedByUserId: authUsers.id,
        invitedByUserName: authUsers.name,
        invitedByUserEmail: authUsers.email,
      })
      .from(staffInvites)
      .innerJoin(restaurants, eq(staffInvites.restaurantId, restaurants.id))
      .innerJoin(restaurantManagers, eq(staffInvites.invitedByManagerId, restaurantManagers.id))
      .innerJoin(authUsers, eq(restaurantManagers.userId, authUsers.id))
      .where(eq(staffInvites.invitedEmail, user.email));

    return res.status(200).json({ invites: detailedInvites });
  } catch (error) {
    console.error("Error fetching detailed invites:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
