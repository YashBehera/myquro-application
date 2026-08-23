import { Router } from "express";
import { db } from "../db/db.js";
import { customerLoyalty, customerVouchers, sessionDiscounts } from "../db/schema/loyalty.js";
import { tableSession } from "../db/schema/table-session.js";
import { restaurants } from "../db/schema/restaurants.js";
import { orders } from "../db/schema/orders.js";
import { nanoid } from "nanoid";
import { eq, and, gte, or, isNull, desc } from "drizzle-orm";
import { requireAuth } from "../auth/requireAuth.js";

const router = Router();

// Calculate loyalty tier based on points
function calculateTier(points: number): string {
  if (points >= 10000) return "platinum";
  if (points >= 5000) return "gold";
  if (points >= 2000) return "silver";
  return "bronze";
}

// Generate unique voucher code
function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /loyalty/:restaurantId/my-status - Get user's loyalty status at a restaurant
router.get("/loyalty/:restaurantId/my-status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    const loyalty = await db
      .select()
      .from(customerLoyalty)
      .where(
        and(
          eq(customerLoyalty.userId, userId),
          eq(customerLoyalty.restaurantId, restaurantId)
        )
      )
      .limit(1);

    if (loyalty.length === 0) {
      // No loyalty record yet, return default
      return res.json({
        success: true,
        data: {
          points: 0,
          tier: "bronze",
          totalVisits: 0,
          totalSpent: 0,
          isNew: true,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        ...loyalty[0],
        isNew: false,
      },
    });
  } catch (error: any) {
    console.error("Error fetching loyalty status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch loyalty status",
    });
  }
});

// GET /vouchers/my-vouchers/:restaurantId - Get user's vouchers for a restaurant
router.get("/vouchers/my-vouchers/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    const vouchers = await db
      .select()
      .from(customerVouchers)
      .where(
        and(
          eq(customerVouchers.userId, userId),
          eq(customerVouchers.restaurantId, restaurantId),
          eq(customerVouchers.status, "active"),
          or(
            isNull(customerVouchers.expiresAt),
            gte(customerVouchers.expiresAt, new Date())
          )
        )
      )
      .orderBy(desc(customerVouchers.issuedAt));

    return res.json({
      success: true,
      data: vouchers,
    });
  } catch (error: any) {
    console.error("Error fetching vouchers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vouchers",
    });
  }
});

// POST /vouchers/redeem - Redeem a voucher in a session
router.post("/vouchers/redeem", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { voucherCode, sessionId } = req.body;

    if (!voucherCode || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Voucher code and session ID are required",
      });
    }

    // Get voucher
    const vouchers = await db
      .select()
      .from(customerVouchers)
      .where(eq(customerVouchers.code, voucherCode.toUpperCase()))
      .limit(1);

    if (vouchers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid voucher code",
      });
    }

    const voucher = vouchers[0];

    // Validate voucher
    if (voucher.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "This voucher doesn't belong to you",
      });
    }

    if (voucher.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This voucher has already been used",
      });
    }

    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This voucher has expired",
      });
    }

    // Get session
    const sessions = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const session = sessions[0];

    if (session.restaurantId !== voucher.restaurantId) {
      return res.status(400).json({
        success: false,
        message: "This voucher is for a different restaurant",
      });
    }

    // Check if already used in this session
    const existingDiscounts = await db
      .select()
      .from(sessionDiscounts)
      .where(
        and(
          eq(sessionDiscounts.sessionId, sessionId),
          eq(sessionDiscounts.discountSourceId, voucher.id)
        )
      )
      .limit(1);

    if (existingDiscounts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This voucher is already applied to this session",
      });
    }

    // Calculate discount value (will be done in billing, store voucher info)
    const discountRecord = {
      id: nanoid(),
      sessionId,
      discountType: "voucher",
      discountSourceId: voucher.id,
      discountName: `Voucher: ${voucher.code}`,
      discountValue: voucher.discountValue, // Store value, actual calculation in billing
      appliedByUserId: userId,
      appliedAt: new Date(),
    };

    await db.insert(sessionDiscounts).values(discountRecord);

    return res.json({
      success: true,
      message: "Voucher applied successfully",
      data: {
        voucher,
        discount: discountRecord,
      },
    });
  } catch (error: any) {
    console.error("Error redeeming voucher:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to redeem voucher",
    });
  }
});

// POST /loyalty/award-points - Award loyalty points after session completion
router.post("/loyalty/award-points", requireAuth, async (req: any, res) => {
  try {
    const { sessionId, userId, restaurantId, amountSpent } = req.body;

    if (!sessionId || !userId || !restaurantId || amountSpent === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Calculate points (1 point per Rs 10 spent)
    const pointsEarned = Math.floor(amountSpent / 1000); // amountSpent in paise, so /1000 = /10 rupees

    // Get or create loyalty record
    const existing = await db
      .select()
      .from(customerLoyalty)
      .where(
        and(
          eq(customerLoyalty.userId, userId),
          eq(customerLoyalty.restaurantId, restaurantId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new loyalty record
      const newPoints = pointsEarned;
      const newTier = calculateTier(newPoints);

      await db.insert(customerLoyalty).values({
        id: nanoid(),
        userId,
        restaurantId,
        points: newPoints,
        totalVisits: 1,
        totalSpent: amountSpent,
        tier: newTier,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return res.json({
        success: true,
        message: "Loyalty points awarded",
        data: {
          pointsEarned,
          totalPoints: newPoints,
          tier: newTier,
          isNewMember: true,
        },
      });
    } else {
      // Update existing loyalty record
      const current = existing[0];
      const newPoints = current.points + pointsEarned;
      const newTier = calculateTier(newPoints);

      await db
        .update(customerLoyalty)
        .set({
          points: newPoints,
          totalVisits: current.totalVisits + 1,
          totalSpent: current.totalSpent + amountSpent,
          tier: newTier,
          updatedAt: new Date(),
        })
        .where(eq(customerLoyalty.id, current.id));

      // Check if tier upgraded and issue voucher
      if (newTier !== current.tier) {
        // Issue tier upgrade voucher
        const voucherValue = newTier === "silver" ? 10000 : newTier === "gold" ? 20000 : 50000; // in paise
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity

        await db.insert(customerVouchers).values({
          id: nanoid(),
          code: generateVoucherCode(),
          userId,
          restaurantId,
          voucherType: "fixed_amount",
          discountValue: voucherValue,
          minOrderValue: 0,
          maxDiscount: null,
          freeItemId: null,
          status: "active",
          issuedAt: new Date(),
          expiresAt: expiryDate,
          usedAt: null,
          usedInSessionId: null,
          createdAt: new Date(),
        });
      }

      return res.json({
        success: true,
        message: "Loyalty points awarded",
        data: {
          pointsEarned,
          totalPoints: newPoints,
          tier: newTier,
          tierUpgraded: newTier !== current.tier,
          isNewMember: false,
        },
      });
    }
  } catch (error: any) {
    console.error("Error awarding loyalty points:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to award loyalty points",
    });
  }
});

// GET /session/:sessionId/available-discounts - Get all available discounts for a session
router.get("/session/:sessionId/available-discounts", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // Get session
    const sessions = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const session = sessions[0];

    // Get user's vouchers for this restaurant
    const vouchers = await db
      .select()
      .from(customerVouchers)
      .where(
        and(
          eq(customerVouchers.userId, userId),
          eq(customerVouchers.restaurantId, session.restaurantId),
          eq(customerVouchers.status, "active"),
          or(
            isNull(customerVouchers.expiresAt),
            gte(customerVouchers.expiresAt, new Date())
          )
        )
      )
      .orderBy(desc(customerVouchers.issuedAt));

    // Get already applied discounts
    const appliedDiscounts = await db
      .select()
      .from(sessionDiscounts)
      .where(eq(sessionDiscounts.sessionId, sessionId));

    return res.json({
      success: true,
      data: {
        vouchers,
        appliedDiscounts,
      },
    });
  } catch (error: any) {
    console.error("Error fetching available discounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available discounts",
    });
  }
});

// DELETE /session/:sessionId/discount/:discountId - Remove a discount from session
router.delete("/session/:sessionId/discount/:discountId", requireAuth, async (req: any, res) => {
  try {
    const { sessionId, discountId } = req.params;

    const result = await db
      .delete(sessionDiscounts)
      .where(
        and(
          eq(sessionDiscounts.id, discountId),
          eq(sessionDiscounts.sessionId, sessionId)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Discount not found",
      });
    }

    return res.json({
      success: true,
      message: "Discount removed",
    });
  } catch (error: any) {
    console.error("Error removing discount:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove discount",
    });
  }
});

// GET /my-summary - Get user's loyalty summary across all restaurants
router.get("/my-summary", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const loyaltyRecords = await db
      .select({
        points: customerLoyalty.points,
        totalVisits: customerLoyalty.totalVisits,
        totalSpent: customerLoyalty.totalSpent,
        tier: customerLoyalty.tier,
      })
      .from(customerLoyalty)
      .where(eq(customerLoyalty.userId, userId));

    const totalPoints = loyaltyRecords.reduce((sum, r) => sum + r.points, 0);
    const totalVisits = loyaltyRecords.reduce((sum, r) => sum + r.totalVisits, 0);
    const totalSpent = loyaltyRecords.reduce((sum, r) => sum + r.totalSpent, 0);

    // Find highest tier: platinum > gold > silver > bronze
    const tierPriority: Record<string, number> = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
    let highestTier = "bronze";
    loyaltyRecords.forEach(r => {
      if (tierPriority[r.tier] > tierPriority[highestTier]) {
        highestTier = r.tier;
      }
    });

    return res.json({
      success: true,
      data: {
        totalPoints,
        totalVisits,
        totalSpent,
        highestTier,
        restaurantCount: loyaltyRecords.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching loyalty summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch loyalty summary",
    });
  }
});

// GET /vouchers/my - Get all active vouchers of the customer
router.get("/vouchers/my", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const vouchers = await db
      .select({
        id: customerVouchers.id,
        code: customerVouchers.code,
        voucherType: customerVouchers.voucherType,
        discountValue: customerVouchers.discountValue,
        minOrderValue: customerVouchers.minOrderValue,
        status: customerVouchers.status,
        issuedAt: customerVouchers.issuedAt,
        expiresAt: customerVouchers.expiresAt,
        restaurantName: restaurants.restaurantName,
        restaurantId: customerVouchers.restaurantId,
      })
      .from(customerVouchers)
      .leftJoin(restaurants, eq(customerVouchers.restaurantId, restaurants.id))
      .where(
        and(
          eq(customerVouchers.userId, userId),
          eq(customerVouchers.status, "active"),
          or(
            isNull(customerVouchers.expiresAt),
            gte(customerVouchers.expiresAt, new Date())
          )
        )
      )
      .orderBy(desc(customerVouchers.issuedAt));

    return res.json({
      success: true,
      data: vouchers,
    });
  } catch (error: any) {
    console.error("Error fetching customer vouchers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch vouchers",
    });
  }
});

export default router;
