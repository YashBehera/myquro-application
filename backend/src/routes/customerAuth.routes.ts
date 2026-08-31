import { Router } from "express";
import { db } from "../db/db.js";
import { authUsers } from "../db/schema/auth-users.js";
import { authSessions } from "../db/schema/auth-sessions.js";
import { profiles } from "../db/schema/profiles.js";
import { restaurantRequests } from "../db/schema/restaurant-requests.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { eq, desc, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { sendFast2SmsOtp } from "../services/fast2sms.service.js";

const router = Router();

// Store OTPs in memory for verification (phone -> { otp, expiresAt })
const customerOtpStore = new Map<string, { otp: string; expiresAt: number }>();

// Helper: Find or create user & profile
async function findOrCreateCustomerUser(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  let userList = await db.select().from(authUsers).where(eq(authUsers.email, `${cleanPhone}@myquro.customer`));
  let user;

  if (userList.length === 0) {
    const userId = `cust_${nanoid(10)}`;
    await db.insert(authUsers).values({
      id: userId,
      name: "Customer",
      email: `${cleanPhone}@myquro.customer`,
      emailVerified: true,
      role: "customer",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profileId = crypto.randomUUID();
    await db.insert(profiles).values({
      id: profileId,
      userId: userId,
      username: `cust_${cleanPhone.slice(-4)}_${Date.now()}`,
      phoneNumber: cleanPhone,
    });

    userList = await db.select().from(authUsers).where(eq(authUsers.id, userId));
  }

  user = userList[0];

  const token = nanoid(32);
  await db.insert(authSessions).values({
    id: nanoid(10),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { user, token };
}

// POST /api/customer/auth/send-otp
// Dispatches real-time SMS OTP via Fast2SMS
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
    }

    // Generate a secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in memory (valid for 5 minutes)
    customerOtpStore.set(cleanPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Dispatch via Fast2SMS API
    const dispatchResult = await sendFast2SmsOtp({
      phone: cleanPhone,
      otp,
    });

    console.log(`📱 [Fast2SMS Auth] OTP generated for ${cleanPhone}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your mobile number",
      deliveryStatus: dispatchResult.success ? "delivered" : "gateway_error",
      gatewayMessage: dispatchResult.message || dispatchResult.error,
    });
  } catch (err: any) {
    console.error("❌ Send Customer Fast2SMS OTP Error:", err);
    return res.status(500).json({ message: "Internal server error: " + err.message });
  }
});

// POST /api/customer/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const storedData = customerOtpStore.get(cleanPhone);
    const isValid = Boolean(storedData && storedData.otp === otp && storedData.expiresAt > Date.now());

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired OTP. Please try again." });
    }

    // Clear used OTP
    customerOtpStore.delete(cleanPhone);

    const { user, token } = await findOrCreateCustomerUser(cleanPhone);

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
  } catch (err: any) {
    console.error("❌ Verify Customer OTP Error:", err);
    return res.status(500).json({ message: "Internal server error: " + err.message });
  }
});

// GET /api/customer/auth/me
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const sessionList = await db.select().from(authSessions).where(eq(authSessions.token, token));

    if (sessionList.length === 0 || sessionList[0].expiresAt < new Date()) {
      return res.status(401).json({ message: "Unauthorized: Invalid or expired session" });
    }

    const userId = sessionList[0].userId;
    const userList = await db.select().from(authUsers).where(eq(authUsers.id, userId));

    if (userList.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userList[0];
    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err: any) {
    console.error("❌ Customer Get Profile Error:", err);
    return res.status(500).json({ message: "Internal server error: " + err.message });
  }
});

// POST /api/customer/auth/logout
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      await db.delete(authSessions).where(eq(authSessions.token, token));
    }
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err: any) {
    console.error("❌ Customer Logout Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
