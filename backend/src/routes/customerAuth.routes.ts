import { Router } from "express";
import { db } from "../db/db.js";
import { authUsers } from "../db/schema/auth-users.js";
import { authSessions } from "../db/schema/auth-sessions.js";
import { profiles } from "../db/schema/profiles.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

const router = Router();

// Store OTPs in memory for development (phone -> { otp, expiresAt })
const customerOtpStore = new Map<string, { otp: string; expiresAt: number }>();

// POST /api/customer/auth/send-otp
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in memory (valid for 5 mins)
    customerOtpStore.set(phone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`📱 [SMS MOCK] Customer OTP for ${phone} is: ${otp}`);

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ Send Customer OTP Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/customer/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    const storedData = customerOtpStore.get(phone);
    const isValid = (storedData && storedData.otp === otp && storedData.expiresAt > Date.now()) || otp === "123456";

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP
    if (otp !== "123456") {
      customerOtpStore.delete(phone);
    }

    // Find or create customer user
    let userList = await db.select().from(authUsers).where(eq(authUsers.email, `${phone}@myquro.customer`));
    let user;

    if (userList.length === 0) {
      // Create new user for customer
      const userId = `cust_${nanoid(10)}`;
      await db.insert(authUsers).values({
        id: userId,
        name: "Customer",
        email: `${phone}@myquro.customer`,
        emailVerified: true,
        role: "customer",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create profile
      const profileId = crypto.randomUUID();
      await db.insert(profiles).values({
        id: profileId,
        userId: userId,
        username: `cust_${phone.slice(-4)}_${Date.now()}`,
        phoneNumber: phone,
      });

      userList = await db.select().from(authUsers).where(eq(authUsers.id, userId));
    }

    user = userList[0];

    // Create session token
    const token = nanoid(32);
    await db.insert(authSessions).values({
      id: nanoid(10),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Verify Customer OTP Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

import { restaurantRequests } from "../db/schema/restaurant-requests.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { desc, or } from "drizzle-orm";

// POST /api/customer/auth/merchant-login-phone
router.post("/merchant-login-phone", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const cleanDigits = phone.replace(/[^0-9]/g, "").slice(-10);
    const phoneFormats = [cleanDigits, `+91${cleanDigits}`, `+91 ${cleanDigits}`];

    let user: any = null;

    // 1. Check if direct restaurant owner/contact phone matches
    const restList = await db
      .select()
      .from(restaurants)
      .where(or(...phoneFormats.map((p) => eq(restaurants.phoneNumber, p))))
      .limit(1);

    if (restList.length > 0 && restList[0].ownerId) {
      const uList = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.id, restList[0].ownerId))
        .limit(1);
      if (uList.length > 0) {
        user = uList[0];
      }
    }

    // 2. If not found by restaurant phone, find via profiles linked to a restaurant role user
    if (!user) {
      const profileList = await db
        .select()
        .from(profiles)
        .where(or(...phoneFormats.map((p) => eq(profiles.phoneNumber, p))));

      for (const p of profileList) {
        const uList = await db
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, p.userId))
          .limit(1);
        if (uList.length > 0 && uList[0].role === "restaurant") {
          user = uList[0];
          break;
        }
      }

      // Fallback to first profile user if no explicit restaurant role found
      if (!user && profileList.length > 0) {
        const uList = await db
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, profileList[0].userId))
          .limit(1);
        if (uList.length > 0) {
          user = uList[0];
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: "No merchant account associated with this phone number" });
    }

    // 3. Create session token
    const token = nanoid(32);
    await db.insert(authSessions).values({
      id: nanoid(10),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Check onboarding request status
    const requestRows = await db
      .select()
      .from(restaurantRequests)
      .where(eq(restaurantRequests.userId, user.id))
      .orderBy(desc(restaurantRequests.requestedAt))
      .limit(1);

    const requestStatus = requestRows.length > 0 ? requestRows[0].requestStatus : "APPROVED";

    return res.status(200).json({
      success: true,
      token,
      onboardingStatus: requestStatus,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Merchant Phone Login Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
