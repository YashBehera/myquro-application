import { Router } from "express";
import { db } from "../db/db.js";
import fs from 'fs';
import path from 'path';

import { tableSession } from "../db/schema/table-session.js";
import { tableQR } from "../db/schema/table-qr.js";
import { tables } from "../db/schema/tables.js";
import { orders } from "../db/schema/orders.js";
import { orderItems } from "../db/schema/order-items.js";
import { orderItemExtras } from "../db/schema/order-item-extras.js";
import { menuExtras } from "../db/schema/menu-extras.js";
import { menuItemVariants } from "../db/schema/menu-item-variants.js";
import { menuItems } from "../db/schema/menu-items.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { payments } from "../db/schema/payments.js";
import { authUsers } from "../db/schema/auth-users.js";
import { sessionDiscounts, customerVouchers, customerLoyalty } from "../db/schema/loyalty.js";

import { nanoid } from "nanoid";
import { eq, and, desc, inArray, isNotNull, sql, or } from "drizzle-orm";

import { requireAuth } from "../auth/requireAuth.js";
import { auth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";

import {
  isRestaurantOwnerManagerOrStaff,
  isRestaurantOwnerOrManager,
} from "../lib/checkRoles.js";

import { emitToRestaurant } from "../lib/socket.js";
import { tableCache } from "../lib/table-cache.js";
import { recalculateSessionDiscounts, totalBillingAmount } from "../lib/billing.js";


const router = Router();

// Optional auth middleware
const optionalAuth = async (req: any, res: any, next: any) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session?.user) {
      req.user = session.user;
    }
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    next();
  }
};

// GET /active/:restaurantId - Get active session for current user at restaurant
router.get("/active/:restaurantId", optionalAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { restaurantId } = req.params;

    // If user is not authenticated, return no active session
    if (!user?.id) {
      return res.json({
        success: true,
        hasActiveSession: false,
        message: "No authenticated user"
      });
    }

    // Find active session for this user at this restaurant
    const activeSessions = await db
      .select({
        sessionId: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tables.tableNumber,
        restaurantId: tableSession.restaurantId,
        status: tableSession.status,
        paymentStatus: tableSession.paymentStatus,
        billedAt: tableSession.billedAt,
        startedAt: tableSession.startedAt,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .where(
        and(
          eq(tableSession.restaurantId, restaurantId),
          eq(tableSession.createdByUserId, user.id),
          eq(tableSession.status, "active")
        )
      )
      .orderBy(desc(tableSession.startedAt))
      .limit(1);

    if (activeSessions.length === 0) {
      return res.json({
        success: true,
        hasActiveSession: false,
        message: "No active session found"
      });
    }

    const session = activeSessions[0];

    return res.json({
      success: true,
      hasActiveSession: true,
      session: {
        sessionId: session.sessionId,
        tableId: session.tableId,
        tableNumber: session.tableNumber,
        restaurantId: session.restaurantId,
        status: session.status,
        paymentStatus: session.paymentStatus,
        billedAt: session.billedAt,
        startedAt: session.startedAt,
      }
    });
  } catch (error: any) {
    console.error("Error getting active session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check active session"
    });
  }
});

// GET /validate-qr/:token - Validate QR token and return table/restaurant info
router.get("/validate-qr/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log("Validating QR token:", token);

    // First check if QR token exists
    const qrExists = await db
      .select({ id: tableQR.id })
      .from(tableQR)
      .where(eq(tableQR.qrToken, token))
      .limit(1);

    if (qrExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR code"
      });
    }

    // Find QR code record with table info
    const qrRecord = await db
      .select({
        qrId: tableQR.id,
        qrToken: tableQR.qrToken,
        tableId: tableQR.tableId,
        restaurantId: tableQR.restaurantId,
        isLocked: tableQR.isLocked,
        tableNumber: tables.tableNumber,
        tableCapacity: tables.capacity,
        tableStatus: tables.liveStatus,
      })
      .from(tableQR)
      .leftJoin(tables, eq(tableQR.tableId, tables.id))
      .where(eq(tableQR.qrToken, token))
      .limit(1);

    if (qrRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid QR code"
      });
    }

    const qr = qrRecord[0];

    if (qr.isLocked) {
      return res.status(403).json({
        success: false,
        message: "This QR code is currently locked"
      });
    }

    if (qr.tableStatus === "occupied") {
      return res.status(409).json({
        success: false,
        message: "This table is currently occupied"
      });
    }

    return res.json({
      success: true,
      data: {
        qrToken: qr.qrToken,
        tableId: qr.tableId,
        tableNumber: qr.tableNumber,
        capacity: qr.tableCapacity,
        restaurantId: qr.restaurantId,
      },
    });
  } catch (error: any) {
    console.error("Error validating QR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate QR code"
    });
  }
});

// POST /create-session - Create a new table session
router.post("/create-session", async (req: any, res) => {
  console.time('create-session-total');
  try {
    // Log ALL headers to check for Content-Type and proxies
    console.log("📂 [CREATE SESSION] Headers:", JSON.stringify(req.headers, null, 2));

    let { tableId, restaurantId, qrToken } = req.body;

    // Support query params fallback (useful if body-parser is acting up or for quick testing)
    if (!qrToken && req.query.qrToken) {
      console.log("ℹ️ [CREATE SESSION] Found qrToken in query params");
      qrToken = req.query.qrToken;
    }
    if (!restaurantId && req.query.restaurantId) restaurantId = req.query.restaurantId;
    if (!tableId && req.query.tableId) tableId = req.query.tableId;

    // Safety: Handle stringified null/undefined/empty
    const isFalsy = (val: any) => !val || val === "null" || val === "undefined" || val === "";

    if (isFalsy(qrToken)) qrToken = null;
    if (isFalsy(restaurantId)) restaurantId = null;
    if (isFalsy(tableId)) tableId = null;

    console.log("🔍 [CREATE SESSION] Request Body:", req.body);
    console.log("🔍 [CREATE SESSION] Query Params:", req.query);
    console.log("🔍 [CREATE SESSION] Resolved Params:", {
      tableId,
      restaurantId,
      qrToken,
      qrToken_type: typeof qrToken,
      restaurantId_type: typeof restaurantId
    });

    // 1. Parallelize Auth Check and Initial Lookup
    const authPromise = auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    }).catch(e => null);

    let lookupPromise;

    if (qrToken) {
      // Lookup QR + Check for Active Session + Get Table Status in ONE query
      lookupPromise = db
        .select({
          // QR Info
          tableId: tableQR.tableId,
          restaurantId: tableQR.restaurantId,
          isLocked: tableQR.isLocked,
          // Table Info
          liveStatus: tables.liveStatus,
          // Active Session Info (if any)
          activeSessionId: tableSession.id,
          billedAt: tableSession.billedAt,
          sessionStatus: tableSession.status,
          // Restaurant Info
          restaurantStatus: restaurants.restaurantStatus,
          isRestaurantOpen: restaurants.isOpen
        })
        .from(tableQR)
        .leftJoin(tables, eq(tableQR.tableId, tables.id))
        .leftJoin(tableSession, and(
          eq(tableSession.tableId, tableQR.tableId),
          eq(tableSession.status, "active")
        ))
        .leftJoin(restaurants, eq(tableQR.restaurantId, restaurants.id))
        .where(eq(tableQR.qrToken, qrToken))
    } else {
      // Fallback for manual table selection (legacy flow)
      if (!restaurantId) {
        console.warn("⚠️ [CREATE SESSION] Missing restaurantId in manual flow");
        return res.status(400).json({ success: false, message: "Restaurant ID is required (Manual Flow)" });
      }
      // We can't optimize this as much without qrToken, keeping it simple or just resolving promises
      lookupPromise = Promise.resolve(null);
    }

    const [session, qrResult] = await Promise.all([authPromise, lookupPromise]);

    // Process Auth Result
    const user = session?.user || null;
    req.user = user; // Set for compatibility if needed

    // Process Lookup Result
    if (qrToken) {
      if (!qrResult || qrResult.length === 0) {
        return res.status(404).json({ success: false, message: "Invalid QR code" });
      }
      const record = qrResult[0];

      if (record.isLocked) {
        return res.status(403).json({ success: false, message: "This QR code is currently locked" });
      }

      // Check if restaurant is active/open
      if (record.restaurantStatus !== 'active') {
        return res.status(403).json({
          success: false,
          code: "RESTAURANT_OFFLINE",
          message: "Restaurant is currently offline or inactive."
        });
      }

      // Setresolved values
      tableId = record.tableId;
      restaurantId = record.restaurantId;

      // Check for active session from the SAME query result
      if (record.activeSessionId) {
        if (record.billedAt !== null) {
          return res.status(409).json({
            success: false,
            code: "TABLE_OCCUPIED_AWAITING_PAYMENT",
            message: "Table occupied (Awaiting Payment).",
            sessionId: record.activeSessionId,
          });
        }
        return res.status(409).json({
          success: false,
          code: "TABLE_OCCUPIED",
          message: "Table is currently occupied.",
          sessionId: record.activeSessionId,
        });
      }
    } else {
      // Validation for non-QR flow
      if (!restaurantId) {
        console.warn("⚠️ [CREATE SESSION] Missing restaurantId in final validation. Source: Final fallback check");
        return res.status(400).json({
          success: false,
          code: "ERR_CREATE_SESSION_NO_RESTAURANT_ID",
          message: "Restaurant ID is required! (Final check failed)"
        });
      }
      // ... (We would need to do the manual check here if we wanted to support non-QR with same speed, but QR is priority)
      // Check existing session for manual flow
      if (tableId) {
        const existing = await db.select().from(tableSession)
          .where(and(eq(tableSession.tableId, tableId), eq(tableSession.status, "active")))
          .limit(1);

        if (existing.length > 0) {
          console.log("📍 [CREATE SESSION] Table already occupied (manual flow):", tableId);
          return res.status(409).json({ success: false, code: "TABLE_OCCUPIED", message: "Table occupied", sessionId: existing[0].id });
        }
      }
    }

    // 2. Parallelize Write Operations
    const sessionId = nanoid();
    const newSession = {
      id: sessionId,
      tableId: tableId || null,
      restaurantId,
      qrToken: qrToken || null,
      status: "active" as const,
      paymentStatus: "unpaid" as const,
      createdByUserId: user?.id || null,
      startedAt: new Date(),
      endedAt: null,
      discountPercentage: 0,
    };

    const updateTablePromise = tableId ? db.update(tables).set({ liveStatus: "occupied" }).where(eq(tables.id, tableId)) : Promise.resolve();

    // EXTRA SAFETY: Ensure no other active session exists for this table
    if (tableId) {
      await db
        .update(tableSession)
        .set({
          status: "cancelled",
          endedAt: new Date()
        })
        .where(and(
          eq(tableSession.tableId, tableId),
          eq(tableSession.status, "active")
        ));
    }

    const createSessionPromise = db.insert(tableSession).values(newSession);

    await Promise.all([updateTablePromise, createSessionPromise]);

    console.log("Session created:", sessionId);

    // Invalidate Table Cache
    if (restaurantId) {
      tableCache.invalidate(restaurantId);
    }

    console.timeEnd('create-session-total');

    return res.json({
      success: true,
      sessionId,
      message: "Session created successfully",
      data: newSession,
    });

  } catch (error: any) {
    console.error("Error creating session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create session"
    });
  }
});

// GET /:sessionId - Get session details with orders

// GET /active/:restaurantId - Get active session for a user at a restaurant
router.get("/active/:restaurantId", optionalAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const { tableId } = req.query;

    console.log("Finding active session:", { restaurantId, tableId });

    let whereConditions: any[] = [
      eq(tableSession.restaurantId, restaurantId),
      eq(tableSession.status, "active"),
    ];

    if (tableId) {
      whereConditions.push(eq(tableSession.tableId, tableId as string));
    }

    const activeSessions = await db
      .select({
        sessionId: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tables.tableNumber,
        status: tableSession.status,
        startedAt: tableSession.startedAt,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .where(and(...whereConditions))
      .orderBy(desc(tableSession.startedAt))
      .limit(1);

    if (activeSessions.length === 0) {
      return res.json({
        success: true,
        sessionId: null,
        message: "No active session found",
      });
    }

    return res.json({
      success: true,
      sessionId: activeSessions[0].sessionId,
      data: activeSessions[0],
    });
  } catch (error: any) {
    console.error("Error finding active session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to find active session"
    });
  }
});

// GET /available-tables/:restaurantId - Get available tables for a restaurant
router.get("/available-tables/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;

    console.log("Fetching available tables for restaurant:", restaurantId);

    const availableTables = await db
      .select({
        tableId: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        liveStatus: tables.liveStatus,
      })
      .from(tables)
      .where(
        and(
          eq(tables.restaurantId, restaurantId),
          eq(tables.liveStatus, "available")
        )
      )
      .orderBy(tables.tableNumber);

    return res.json({
      success: true,
      data: availableTables,
    });
  } catch (error: any) {
    console.error("Error fetching available tables:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available tables"
    });
  }
});

// PUT /close-session/:sessionId - Close a table session
router.put("/close-session/:sessionId", optionalAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentStatus } = req.body; // Accept optional payment status from request

    console.log("Closing session:", sessionId, "Payment Status:", paymentStatus);

    // Get session details
    const sessionData = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const session = sessionData[0];

    // Validate payment status before closing
    const finalPaymentStatus = paymentStatus || session.paymentStatus;

    if (finalPaymentStatus === "unpaid") {
      return res.status(400).json({
        success: false,
        message: "Cannot close session with unpaid status. Please update payment status first."
      });
    }

    // Update session status
    await db
      .update(tableSession)
      .set({
        status: "closed",
        paymentStatus: finalPaymentStatus,
        endedAt: new Date(),
      })
      .where(eq(tableSession.id, sessionId));

    // Update table status to available and unlock it
    if (session.tableId) {
      await db
        .update(tables)
        .set({ liveStatus: "available" })
        .where(eq(tables.id, session.tableId));

      console.log(`Table ${session.tableId} unlocked and set to available`);
    }

    console.log("Session closed:", sessionId);

    // ✅ Emit WebSocket event for real-time dashboard update
    emitToRestaurant(session.restaurantId, "session:updated", {
      type: "session-closed",
      sessionId,
      tableId: session.tableId,
      status: "closed",
    });

    return res.json({
      success: true,
      message: "Session closed successfully",
    });

    // Invalidate Table Cache
    tableCache.invalidate(session.restaurantId);

  } catch (error: any) {
    console.error("Error closing session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close session"
    });
  }
});

// PUT /update-payment-status/:sessionId - Update payment status of a session
router.put("/update-payment-status/:sessionId", optionalAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentStatus } = req.body; // 'unpaid' | 'partial' | 'paid'

    if (!paymentStatus || !['unpaid', 'partial', 'paid'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status. Must be 'unpaid', 'partial', or 'paid'"
      });
    }

    console.log("Updating payment status for session:", sessionId, "to:", paymentStatus);

    // Get session details
    const sessionData = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const session = sessionData[0];

    if (session.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot update payment status of a closed session"
      });
    }

    // Update payment status
    await db
      .update(tableSession)
      .set({
        paymentStatus,
      })
      .where(eq(tableSession.id, sessionId));

    console.log("Payment status updated:", sessionId, "->", paymentStatus);

    // ✅ Emit WebSocket event for real-time dashboard update
    emitToRestaurant(session.restaurantId, "payment-recorded", {
      type: "payment-status-updated",
      sessionId,
      paymentStatus,
    });

    return res.json({
      success: true,
      message: "Payment status updated successfully",
      data: {
        sessionId,
        paymentStatus,
      }
    });
  } catch (error: any) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment status"
    });
  }
});

// GET /session-discounts/:sessionId - Public: Get applied discounts for a session
router.get("/session-discounts/:sessionId", async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const { sessionDiscounts } = await import("../db/schema/loyalty.js");
    const discounts = await db
      .select()
      .from(sessionDiscounts)
      .where(eq(sessionDiscounts.sessionId, sessionId));
    return res.json({ success: true, data: { appliedDiscounts: discounts } });
  } catch (error: any) {
    console.error("Error fetching session discounts:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch discounts" });
  }
});

// POST /apply-offer/:sessionId - Public: Customer applies an offer code (no auth required)
router.post("/apply-offer/:sessionId", async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const { offerCode, restaurantId, subtotalPaise } = req.body;

    if (!offerCode || !restaurantId) {
      return res.status(400).json({ success: false, message: "Offer code and restaurantId are required" });
    }

    // Validate session is active
    const sessionData = await db
      .select({ id: tableSession.id, status: tableSession.status, restaurantId: tableSession.restaurantId })
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (sessionData[0].status !== "active") {
      return res.status(400).json({ success: false, message: "Session is not active" });
    }

    // Load offers dynamically (same logic as public offers route)
    const { offers } = await import("../db/schema/offers.js");
    const { offerCache } = await import("../lib/offer-cache.js");
    const { or: drizzleOr } = await import("drizzle-orm");

    const restaurantDetail = await db
      .select({ 
        restaurantType: restaurants.restaurantType,
        defaultGstPercentage: restaurants.defaultGstPercentage
      })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    const restaurantType = restaurantDetail[0]?.restaurantType;

    const relevantOffers = await db
      .select()
      .from(offers)
      .where(
        drizzleOr(
          eq(offers.restaurantId, restaurantId),
          and(
            eq(offers.scope, "company"),
            drizzleOr(
              eq(offers.targetType, "all"),
              and(eq(offers.targetType, "category"), eq(offers.targetCategory, restaurantType ?? "")),
            )
          )
        )
      );

    const now = new Date();
    const activeOffers = relevantOffers.filter(o =>
      now >= new Date(o.startDate) && now <= new Date(o.endDate)
    );

    const matchedOffer = activeOffers.find(o =>
      o.code && o.code.toUpperCase() === offerCode.trim().toUpperCase()
    );

    if (!matchedOffer) {
      return res.status(404).json({ success: false, message: "Invalid or expired offer code" });
    }

    // Check minimum order value
    const minOrder = (matchedOffer as any).minOrderValue || 0;
    if (subtotalPaise !== undefined && subtotalPaise < minOrder) {
      return res.status(400).json({
        success: false,
        message: `Minimum order of ₹${Math.ceil(minOrder / 100)} required for this offer`
      });
    }

    // Prevent duplicate offer application
    const appliedDiscountsForCheck = await db
      .select()
      .from(sessionDiscounts)
      .where(
        and(
          eq(sessionDiscounts.sessionId, sessionId),
          eq(sessionDiscounts.discountSourceId, matchedOffer.id)
        )
      );

    if (appliedDiscountsForCheck.length > 0) {
      return res.status(400).json({ success: false, message: "This offer is already applied" });
    }

    // Calculate discount value accurately
    const currentSubtotal = await totalBillingAmount(sessionId);
    const gstRateForCalc = Number(restaurantDetail[0]?.defaultGstPercentage || 0);
    const gstAmountForCalc = Math.floor((currentSubtotal * gstRateForCalc) / 100);

    // Insert session discount record
    const discountId = nanoid();
    const discountRecord = {
      id: discountId,
      sessionId,
      discountType: "offer",
      discountSourceId: matchedOffer.id,
      discountName: matchedOffer.name || matchedOffer.code || "Offer Discount",
      discountValue: 0, // Placeholder, updated below
      appliedByUserId: null as any,
      appliedAt: new Date(),
    };
    await db.insert(sessionDiscounts).values(discountRecord);

    // Run dynamic recalculation
    await recalculateSessionDiscounts(sessionId, currentSubtotal, gstAmountForCalc);
    
    // Fetch the calculated value to return in response
    const updatedDisc = await db
      .select({ discountValue: sessionDiscounts.discountValue })
      .from(sessionDiscounts)
      .where(eq(sessionDiscounts.id, discountId))
      .limit(1);
    
    const discountValuePaise = updatedDisc[0]?.discountValue || 0;

    return res.json({
      success: true,
      message: "Offer applied successfully! 🎉",
      discount: {
        id: discountRecord.id,
        discountType: "offer",
        discountName: discountRecord.discountName,
        discountValue: discountValuePaise,
        discountSourceId: matchedOffer.id,
        offerType: matchedOffer.offerType,
        offerCode: matchedOffer.code,
      }
    });
  } catch (error: any) {
    console.error("Error applying offer:", error);
    return res.status(500).json({ success: false, message: "Failed to apply offer" });
  }
});

// DELETE /remove-offer/:sessionId/:discountId - Public: Customer removes an applied offer
router.delete("/remove-offer/:sessionId/:discountId", async (req: any, res) => {
  try {
    const { sessionId, discountId } = req.params;

    const { sessionDiscounts } = await import("../db/schema/loyalty.js");
    const deleted = await db
      .delete(sessionDiscounts)
      .where(
        and(
          eq(sessionDiscounts.id, discountId),
          eq(sessionDiscounts.sessionId, sessionId),
          eq(sessionDiscounts.discountType, "offer")
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, message: "Applied offer not found" });
    }

    return res.json({ success: true, message: "Offer removed" });
  } catch (error: any) {
    console.error("Error removing offer:", error);
    return res.status(500).json({ success: false, message: "Failed to remove offer" });
  }
});

// GET /public-discounts/:sessionId - Public: List applied discounts for a session
router.get("/public-discounts/:sessionId", async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const { offers } = await import("../db/schema/offers.js");
    
    const appliedDiscounts = await db
      .select({
        id: sessionDiscounts.id,
        discountType: sessionDiscounts.discountType,
        discountName: sessionDiscounts.discountName,
        discountValue: sessionDiscounts.discountValue,
        discountSourceId: sessionDiscounts.discountSourceId,
        offerId: offers.id,
        offerType: offers.offerType,
        offerValue: offers.discountValue,
        applicableCategoryId: offers.applicableCategoryId,
      })
      .from(sessionDiscounts)
      .leftJoin(offers, eq(sessionDiscounts.discountSourceId, offers.id))
      .where(eq(sessionDiscounts.sessionId, sessionId));

    return res.json({
      success: true,
      data: {
        appliedDiscounts
      }
    });
  } catch (error: any) {
    console.error("Error fetching public discounts:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch discounts" });
  }
});

// POST /apply-discount/:sessionId - Apply discount to a session (staff only)
router.post("/apply-discount/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const { discountType, discountValue, discountReason } = req.body;
    const user = req.user;

    console.log("Applying discount to session:", { sessionId, discountType, discountValue, discountReason });

    if (!discountType || discountValue === undefined) {
      return res.status(400).json({
        success: false,
        message: "Discount type and value are required"
      });
    }

    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "Discount type must be 'percentage' or 'fixed'"
      });
    }

    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount must be between 0 and 100"
      });
    }

    if (discountType === 'fixed' && discountValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Fixed discount cannot be negative"
      });
    }

    // Get session details
    const sessionData = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const session = sessionData[0];

    // Check if user has permission to apply discounts for this restaurant
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, session.restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to apply discounts for this restaurant"
      });
    }

    // Check if session is active (can't apply discount to closed sessions)
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: "Can only apply discounts to active sessions"
      });
    }

    // Check if bill is already frozen
    if (session.billedAt) {
      return res.status(400).json({
        success: false,
        message: "Cannot apply discount - bill has already been frozen"
      });
    }

    // Calculate discount amounts
    const sessionUpdate: any = {
      discountApprovedByUserId: user.id,
      discountApprovedAt: new Date(),
      discountReason: discountReason || `Discount applied by ${user.name || user.email}: ${discountType} ${discountValue}${discountType === 'percentage' ? '%' : '₹'}`
    };

    if (discountType === 'percentage') {
      sessionUpdate.discountPercentage = discountValue;
      // Note: discountAmount will be calculated when bill is frozen
    } else if (discountType === 'fixed') {
      sessionUpdate.discountAmount = Math.round(discountValue * 100); // rupees to paise
      // Note: discountPercentage will be calculated when bill is frozen if needed
    }

    // Update session with discount information
    await db
      .update(tableSession)
      .set(sessionUpdate)
      .where(eq(tableSession.id, sessionId));

    console.log("Discount applied successfully:", {
      sessionId,
      discountType,
      discountValue,
      appliedBy: user.id
    });

    // Emit WebSocket event for real-time updates
    emitToRestaurant(session.restaurantId, 'discount-applied', {
      sessionId,
      tableId: session.tableId,
      discountType,
      discountValue,
      discountReason: sessionUpdate.discountReason,
      appliedBy: user.id,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: "Discount applied successfully",
      data: {
        sessionId,
        discountType,
        discountValue,
        discountReason: sessionUpdate.discountReason,
        appliedBy: user.id,
        appliedAt: new Date()
      }
    });

  } catch (error: any) {
    console.error("Error applying discount:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply discount"
    });
  }
});

// POST /freeze-bill/:sessionId - Freeze the bill (customer requests payment)
router.post("/freeze-bill/:sessionId", optionalAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;

    console.log("Freezing bill for session:", sessionId);

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

    // Check if already billed
    if (session.billedAt !== null) {
      return res.status(400).json({
        success: false,
        message: "Bill has already been frozen",
        code: "ALREADY_BILLED",
      });
    }

    // Check if session is active
    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Can only freeze bill for active sessions",
        code: "SESSION_NOT_ACTIVE",
      });
    }

    // Calculate totals from all orders in this session
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.tableSessionId, sessionId));

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot freeze bill - no items ordered",
        code: "NO_ITEMS",
      });
    }

    // Calculate billing amounts - use totalPrice which already includes extras
    const subtotal = items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    // Calculate extras total separately for display purposes
    const itemIds = items.map(item => item.id);
    let extrasTotal = 0;
    if (itemIds.length > 0) {
      const extrasTotalResult = await db
        .select({ total: sql<number>`COALESCE(sum(${orderItemExtras.totalPrice}), 0)` })
        .from(orderItemExtras)
        .where(inArray(orderItemExtras.orderItemId, itemIds));
      extrasTotal = Number(extrasTotalResult[0]?.total) || 0;
    }

    // 1. Fetch restaurant GST percentage
    const restaurantData = await db
      .select({
        defaultGstPercentage: restaurants.defaultGstPercentage
      })
      .from(restaurants)
      .where(eq(restaurants.id, session.restaurantId))
      .limit(1);

    const gstRate = restaurantData.length > 0 ? Number(restaurantData[0].defaultGstPercentage) || 0 : 0;

    // 2. GST is calculated on full subtotal (before discount)
    const gstAmount = Math.floor((subtotal * gstRate) / 100);
    const grandTotalBeforeDiscount = subtotal + gstAmount;

    // 3. Calculate manual discount based on session discount settings (manual staff discounts)
    let manualDiscountAmount = 0;
    // Determine discount type from session
    if (session.discountAmount && session.discountAmount > 0) {
      manualDiscountAmount = session.discountAmount;
    } else if (session.discountPercentage && session.discountPercentage > 0) {
      // NEW LOGIC: Percentage discount is calculated on the GRAND TOTAL
      manualDiscountAmount = Math.floor((grandTotalBeforeDiscount * session.discountPercentage) / 100);
    }

    // 4. Include session discounts (offers, vouchers, loyalty) applied by the customer
    // RECALCULATE all offers (B1G1, Percentage, Category Wise) based on current items
    const offerDiscountAmount = await recalculateSessionDiscounts(sessionId, subtotal, gstAmount);
    let discountAmount = manualDiscountAmount + offerDiscountAmount;

    // 5. Ensure discount doesn't exceed grand total
    discountAmount = Math.min(discountAmount, grandTotalBeforeDiscount);

    const grandTotal = Math.max(0, grandTotalBeforeDiscount - discountAmount);

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${sessionId.slice(0, 8)}`;

    console.log("Freezing bill with values:", {
      subtotal,
      extrasTotal,
      discountAmount,
      gstRate,
      gstAmount,
      grandTotalBeforeDiscount,
      grandTotal,
      frozenSubtotal: subtotal,
      frozenExtrasTotal: extrasTotal,
      frozenDiscountAmount: discountAmount,
      frozenTaxableAmount: subtotal,
      frozenGstRate: gstRate,
      frozenGstAmount: gstAmount,
      finalBillAmount: grandTotal,
      billedAt: new Date(),
      invoiceNumber,
    });

    // Update session with frozen amounts
    await db
      .update(tableSession)
      .set({
        subtotal,
        extrasTotal,
        discountAmount,
        taxableBase: subtotal,
        gstRate,
        gstAmount,
        grandTotal,
        frozenSubtotal: subtotal,
        frozenExtrasTotal: extrasTotal,
        frozenDiscountAmount: discountAmount,
        frozenTaxableAmount: subtotal,
        frozenGstRate: gstRate,
        frozenGstAmount: gstAmount,
        finalBillAmount: grandTotal,
        billedAt: new Date(),
        invoiceNumber,
        status: "payment_pending" as const,
        paymentStatus: "payment_pending" as const,
      })
      .where(eq(tableSession.id, sessionId));

    console.log("Bill frozen successfully:", sessionId, "Amount:", grandTotal);

    // ✅ Emit WebSocket event for real-time dashboard update
    emitToRestaurant(session.restaurantId, "billing:updated", {
      type: "bill-generated",
      tableSessionId: sessionId,
      restaurantId: session.restaurantId,
      grandTotal,
    });

    return res.json({
      success: true,
      message: "Bill frozen successfully. Waiting for payment confirmation.",
      data: {
        sessionId,
        invoiceNumber,
        subtotal,
        discountAmount,
        taxableBase: subtotal,
        gstRate,
        gstAmount,
        finalBillAmount: grandTotal,
        billedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Error freezing bill:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      // Log full error for PG/Drizzle details
      console.error("Full error object:", JSON.stringify(error, null, 2));

      try {
        const logPath = path.join(process.cwd(), 'backend-debug.log');
        const logEntry = `[${new Date().toISOString()}] Error freezing bill: ${error.message}\\nStack: ${error.stack}\\nFull: ${JSON.stringify(error, null, 2)}\\n\\n`;
        fs.appendFileSync(logPath, logEntry);
      } catch (fsError) {
        console.error("Failed to write to log file:", fsError);
      }
    }
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to freeze bill",
    });
  }
});

// POST /close-session/:sessionId - Close session (STAFF ONLY after payment confirmed)
router.post("/close-session/:sessionId", optionalAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    console.log("Closing session:", sessionId, "by user:", user.id);

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

    // Verify user is staff/manager
    const isStaff = await isRestaurantOwnerOrManager(
      user.id,
      session.restaurantId
    );
    if (!isStaff) {
      return res.status(403).json({
        success: false,
        message: "Only restaurant staff can close sessions",
        code: "UNAUTHORIZED",
      });
    }

    // Check if bill has been frozen
    if (session.billedAt === null) {
      return res.status(400).json({
        success: false,
        message: "Cannot close session - bill has not been generated",
        code: "NOT_BILLED",
      });
    }

    // Check if already closed
    if (session.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Session is already closed",
        code: "ALREADY_CLOSED",
      });
    }

    // Check payment status
    if (session.paymentStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot close session - payment not confirmed as paid",
        code: "PAYMENT_NOT_CONFIRMED",
      });
    }

    // Close the session
    await db
      .update(tableSession)
      .set({
        status: "closed" as const,
        endedAt: new Date(),
      })
      .where(eq(tableSession.id, sessionId));

    // ✅ Emit WebSocket event for real-time dashboard update
    emitToRestaurant(session.restaurantId, "session:updated", {
      type: "session-closed",
      sessionId,
      tableId: session.tableId,
      status: "closed",
    });

    // Unlock the table
    if (session.tableId) {
      await db
        .update(tables)
        .set({
          liveStatus: "available",
        })
        .where(eq(tables.id, session.tableId));

      // Unlock QR if present
      if (session.qrToken) {
        await db
          .update(tableQR)
          .set({
            isLocked: false,
          })
          .where(eq(tableQR.qrToken, session.qrToken));
      }

      console.log("Table unlocked:", session.tableId);
    }

    console.log("Session closed successfully:", sessionId);

    return res.json({
      success: true,
      message: "Session closed successfully. Table is now available.",
      data: {
        sessionId,
        closedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Error closing session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close session",
    });
  }
});

// GET /active-session/:tableId - Check if table has an active session
router.get("/active-session/:tableId", async (req, res) => {
  try {
    const { tableId } = req.params;

    console.log("Checking active session for table:", tableId);

    const sessions = await db
      .select()
      .from(tableSession)
      .where(
        and(
          eq(tableSession.tableId, tableId),
          eq(tableSession.status, "active")
        )
      )
      .limit(1);

    if (sessions.length === 0) {
      return res.json({
        success: true,
        hasActiveSession: false,
        message: "No active session for this table",
      });
    }

    const session = sessions[0];

    return res.json({
      success: true,
      hasActiveSession: true,
      message: "Table has an active session",
      data: {
        sessionId: session.id,
        startedAt: session.startedAt,
        billedAt: session.billedAt,
        paymentStatus: session.paymentStatus,
      },
    });
  } catch (error: any) {
    console.error("Error checking active session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check active session",
    });
  }
});

// GET /restaurant/:restaurantId/active-sessions - Get all active sessions for a restaurant (staff only)
router.get("/restaurant/:restaurantId/active-sessions", optionalAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check if user is staff
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get all active and payment_pending sessions
    const sessions = await db
      .select({
        sessionId: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tables.tableNumber,
        status: tableSession.status,
        paymentStatus: tableSession.paymentStatus,
        startedAt: tableSession.startedAt,
        billedAt: tableSession.billedAt,
        grandTotal: tableSession.grandTotal,
        finalBillAmount: tableSession.finalBillAmount,
        invoiceNumber: tableSession.invoiceNumber,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .where(
        and(
          eq(tableSession.restaurantId, restaurantId),
          // Get active or payment_pending sessions
        )
      )
      .orderBy(desc(tableSession.startedAt));

    // Filter for active or payment_pending
    const filteredSessions = sessions.filter(s =>
      s.status === 'active' || s.status === 'payment_pending' || s.paymentStatus === 'payment_pending'
    );

    // Get order counts for each session
    const sessionIds = filteredSessions.map(s => s.sessionId);

    // Get all orders for these sessions with full details
    let orderDetails: any[] = [];
    if (sessionIds.length > 0) {
      orderDetails = await db
        .select({
          orderId: orders.id,
          sessionId: orders.tableSessionId,
          status: orders.status,
          totalAmount: orders.grandTotal,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            inArray(orders.tableSessionId, sessionIds)
          )
        );

      // Get item counts for each order
      const orderIds = orderDetails.map(o => o.orderId);
      const itemCounts = await db
        .select({
          orderId: orderItems.orderId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));

      // Map item counts to orders
      orderDetails = orderDetails.map(order => {
        const items = itemCounts.filter(i => i.orderId === order.orderId);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        return { ...order, itemCount };
      });
    }

    // Build session data with orders
    const sessionData = filteredSessions.map(session => {
      const sessionOrders = orderDetails.filter(o => o.sessionId === session.sessionId);
      const totalAmount = sessionOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      return {
        sessionId: session.sessionId,
        tableNumber: session.tableNumber,
        createdAt: session.startedAt,
        billedAt: session.billedAt,
        totalAmount: session.finalBillAmount || totalAmount,
        orders: sessionOrders.map(o => ({
          orderId: o.orderId,
          status: o.status,
          totalAmount: o.totalAmount,
          createdAt: o.createdAt,
          itemCount: o.itemCount || 0,
        })),
      };
    });

    return res.json({
      success: true,
      sessions: sessionData,
    });
  } catch (error: any) {
    console.error("Error fetching active sessions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active sessions",
    });
  }
});

// POST /mark-payment-complete/:sessionId - Mark session payment as complete (staff only)
router.post("/mark-payment-complete/:sessionId", optionalAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get session
    const sessionRecord = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const session = sessionRecord[0];

    // Check staff permission
    const hasAccess = await isRestaurantOwnerOrManager(user.id, session.restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Check if session is billed
    if (!session.billedAt) {
      return res.status(400).json({
        success: false,
        message: "Session not billed yet. Generate bill first.",
        code: "NOT_BILLED",
      });
    }

    // Check if already paid
    if (session.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: "Payment already completed",
        code: "ALREADY_PAID",
      });
    }

    // Update payment status
    await db
      .update(tableSession)
      .set({
        paymentStatus: "paid" as const,
      })
      .where(eq(tableSession.id, sessionId));

    return res.json({
      success: true,
      message: "Payment marked as complete",
      data: {
        sessionId,
        paymentStatus: "paid",
      },
    });
  } catch (error: any) {
    console.error("Error marking payment complete:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark payment complete",
    });
  }
});

// POST /reset-table/:tableId - Emergency table reset (staff only)
router.post("/reset-table/:tableId", optionalAuth, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get table info
    const tableRecord = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (tableRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    const table = tableRecord[0];

    // Check staff permission
    const hasAccess = await isRestaurantOwnerOrManager(user.id, table.restaurantId);
    if (!hasAccess) {
      console.log("User ID:", user.id, "Table Restaurant ID:", table.restaurantId);

      // Fetch the restaurant and log ownerId
      const restaurant = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, table.restaurantId))
        .limit(1);
      console.log("Restaurant record:", restaurant);

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Close all active sessions for this table
    // Parallelize updates for speed
    const closeSessionsPromise = db
      .update(tableSession)
      .set({
        status: "cancelled" as const,
        endedAt: new Date(),
      })
      .where(
        and(
          eq(tableSession.tableId, tableId),
          eq(tableSession.status, "active")
        )
      );

    // Unlock table
    const unlockTablePromise = db
      .update(tables)
      .set({
        liveStatus: "available",
      })
      .where(eq(tables.id, tableId));

    // Unlock QR codes for this table
    const unlockQrPromise = db
      .update(tableQR)
      .set({
        isLocked: false,
      })
      .where(eq(tableQR.tableId, tableId));

    await Promise.all([closeSessionsPromise, unlockTablePromise, unlockQrPromise]);

    // Invalidate Table Cache to ensure immediate frontend update
    tableCache.invalidate(table.restaurantId);

    return res.json({
      success: true,
      message: "Table reset successfully",
      data: {
        tableId,
        tableNumber: table.tableNumber,
        resetAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("Error resetting table:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset table",
    });
  }
});

// PATCH /:sessionId/mark-paid - Mark session as paid with payment method (STAFF ONLY)
router.patch("/:sessionId/mark-paid", optionalAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentMethod } = req.body; // 'cash' | 'card' | 'upi' | 'online'
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get session
    const sessionRecord = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const session = sessionRecord[0];

    // Check staff permission
    const hasAccess = await isRestaurantOwnerOrManager(user.id, session.restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Check if session is billed
    if (!session.billedAt) {
      return res.status(400).json({
        success: false,
        message: "Session not billed yet",
        code: "NOT_BILLED",
      });
    }

    // Check if already paid
    if (session.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: "Payment already completed",
        code: "ALREADY_PAID",
      });
    }

    // Update payment status
    await db
      .update(tableSession)
      .set({
        paymentStatus: "paid" as const,
      })
      .where(eq(tableSession.id, sessionId));

    console.log(`Session ${sessionId} marked as paid via ${paymentMethod}`);

    return res.json({
      success: true,
      message: "Payment marked as complete",
      data: {
        sessionId,
        paymentMethod,
        paymentStatus: "paid",
      },
    });
  } catch (error: any) {
    console.error("Error marking payment as paid:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark payment as paid",
    });
  }
});

// GET /payment-requests/:restaurantId - Get all sessions with payment pending (STAFF ONLY)
router.get("/payment-requests/:restaurantId", optionalAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check staff permission
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get all sessions where billedAt is not null and payment is still pending
    const paymentRequests = await db
      .select({
        sessionId: tableSession.id,
        tableNumber: tables.tableNumber,
        qrToken: tableSession.qrToken,
        startedAt: tableSession.startedAt,
        billedAt: tableSession.billedAt,
        subtotal: tableSession.subtotal,
        discountAmount: tableSession.discountAmount,
        taxableBase: tableSession.taxableBase,
        gstRate: tableSession.gstRate,
        gstAmount: tableSession.gstAmount,
        grandTotal: tableSession.grandTotal,
        finalBillAmount: tableSession.finalBillAmount,
        invoiceNumber: tableSession.invoiceNumber,
        paymentStatus: tableSession.paymentStatus,
        status: tableSession.status,
        frozenSubtotal: tableSession.frozenSubtotal,
        frozenGstRate: tableSession.frozenGstRate,
        frozenGstAmount: tableSession.frozenGstAmount,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .where(
        and(
          eq(tableSession.restaurantId, restaurantId),
          isNotNull(tableSession.billedAt),
          eq(tableSession.paymentStatus, "payment_pending" as const)
        )
      )
      .orderBy(desc(tableSession.billedAt));

    console.log(`Found ${paymentRequests.length} payment requests for restaurant ${restaurantId}`);

    return res.json({
      success: true,
      data: paymentRequests,
    });
  } catch (error: any) {
    console.error("Error fetching payment requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment requests",
    });
  }
});

// POST /record-payment - Record a payment in the payments table and update session


// Get active sessions with orders for a restaurant
// GET /active-detailed/:restaurantId - Get all active sessions with detailed order items
router.get("/active-detailed/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Fetch all active sessions for the restaurant
    const sessions = await db
      .select({
        sessionId: tableSession.id,
        tableId: tableSession.tableId,
        startedAt: tableSession.startedAt,
        status: tableSession.status,
        paymentStatus: tableSession.paymentStatus,
      })
      .from(tableSession)
      .where(
        and(
          eq(tableSession.restaurantId, restaurantId),
          eq(tableSession.status, "active")
        )
      )
      .orderBy(desc(tableSession.startedAt));

    // For each session, fetch table info and orders
    const activeSessions = await Promise.all(
      sessions.map(async (session) => {
        // Get table info
        const tableInfo = session.tableId
          ? await db
            .select({
              tableNumber: tables.tableNumber,
            })
            .from(tables)
            .where(eq(tables.id, session.tableId))
            .limit(1)
          : [];

        // Get orders with items
        const orderData = await db
          .select({
            orderId: orders.id,
            orderStatus: orders.status,
            itemId: orderItems.id,
            menuItemName: menuItems.name,
            variantName: menuItemVariants.variantName,
            quantity: orderItems.quantity,
            price: orderItems.totalPrice,
            itemStatus: orderItems.status,
          })
          .from(orders)
          .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
          .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
          .where(eq(orders.tableSessionId, session.sessionId))
          .orderBy(desc(orders.createdAt));

        // Format order items
        const orderItemsList = orderData
          .filter((o) => o.itemId !== null)
          .map((o) => ({
            id: o.itemId!,
            menuItemName: o.menuItemName!,
            variantName: o.variantName!,
            quantity: o.quantity!,
            price: o.price!,
            status: o.itemStatus!,
          }));

        const totalAmount = orderItemsList.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        return {
          sessionId: session.sessionId,
          tableNumber: tableInfo[0]?.tableNumber || 0,
          startedAt: session.startedAt,
          totalAmount,
          status: session.status,
          orders: orderItemsList,
        };
      })
    );

    return res.json({
      success: true,
      data: activeSessions,
    });
  } catch (error: any) {
    console.error("Error fetching active sessions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active sessions",
    });
  }
});

// POST /manual-start - Create a session manually (staff initiated)
router.post("/manual-start", optionalAuth, async (req, res) => {
  try {
    const { tableId, restaurantId } = req.body;

    if (!tableId || !restaurantId) {
      return res.status(400).json({
        success: false,
        error: "tableId and restaurantId are required",
      });
    }

    // Check if table exists and is available
    const tableData = await db
      .select()
      .from(tables)
      .where(and(
        eq(tables.id, tableId),
        eq(tables.restaurantId, restaurantId)
      ))
      .limit(1);

    if (tableData.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Table not found",
      });
    }

    // Check if table already has an active session
    const existingSession = await db
      .select()
      .from(tableSession)
      .where(and(
        eq(tableSession.tableId, tableId),
        eq(tableSession.status, "active")
      ))
      .limit(1);

    if (existingSession.length > 0) {
      const session = existingSession[0];

      // OPTIONAL: If we want to ALLOW creating a new session even if one exists
      // (e.g. to recover from a stuck session), we should close the old one here.
      // But for now, let's keep the current logic but make it more robust.

      // Check if session has been billed
      const isBilled = session.billedAt !== null;

      // Return existing session with billed status
      return res.json({
        success: true,
        data: {
          sessionId: session.id,
          message: "Session already exists for this table",
          isExistingSession: true,
          isBilled,
          billedAt: session.billedAt,
        },
      });
    }

    // EXTRA SAFETY: Even if lookup said no session, ensure we don't have a race condition
    // Close any session for this table that might have been created in the last miliseconds
    await db
      .update(tableSession)
      .set({
        status: "cancelled",
        endedAt: new Date()
      })
      .where(and(
        eq(tableSession.tableId, tableId),
        eq(tableSession.status, "active")
      ));

    // Create new session
    const sessionId = nanoid(16);

    await db.insert(tableSession).values({
      id: sessionId,
      tableId,
      restaurantId,
      status: "active",
      startedAt: new Date(),
    });

    // Update table status to occupied
    await db
      .update(tables)
      .set({ liveStatus: "occupied" })
      .where(eq(tables.id, tableId));

    return res.json({
      success: true,
      data: {
        sessionId,
        message: "Session created successfully",
      },
    });
  } catch (error) {
    console.error("Error creating manual session:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create session",
    });
  }
});

// POST /record-payment - Record a payment for a session
router.post("/record-payment", requireAuth, async (req: any, res) => {
  try {
    const {
      sessionId,
      amount,
      originalAmount,
      method,
      referenceNumber,
      discountType,
      discountValue
    } = req.body;
    const user = req.user;

    console.log("Recording payment:", {
      sessionId,
      amount,
      originalAmount,
      method,
      referenceNumber,
      discountType,
      discountValue
    });

    if (!sessionId || !amount || !method) {
      return res.status(400).json({
        success: false,
        message: "Session ID, amount, and payment method are required"
      });
    }

    // Validate payment method
    const validMethods = ['cash', 'upi', 'card', 'bank', 'gateway'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    // Get session details
    const sessionData = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const session = sessionData[0];

    // Check if user has permission to record payment for this restaurant
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, session.restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to record payments for this restaurant"
      });
    }

    // Check if session is billed
    if (!session.billedAt) {
      return res.status(400).json({
        success: false,
        message: "Session not billed yet",
        code: "NOT_BILLED",
      });
    }

    // Check if already paid
    if (session.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: "Payment already completed",
        code: "ALREADY_PAID",
      });
    }

    // Allow recording payments for any session status
    // (previously only allowed for closed sessions)

    // Update payment status and close the session
    const sessionUpdate: any = {
      paymentStatus: "paid",
      status: "closed",
      endedAt: new Date(),
    };

    // Update discount information in table_session if provided
    if (discountType && discountValue !== undefined) {
      // NEW LOGIC: Recalculate bill amounts based on (Subtotal + GST) - Discount
      const gstAmount = Math.floor(((session.frozenSubtotal || 0) * (session.frozenGstRate || 0)) / 100);
      const grandTotalBeforeDiscount = (session.frozenSubtotal || 0) + gstAmount;
      
      // Get existing session discounts (offers/vouchers) to preserve them
      // RECALCULATE them for accurate final payment amount
      const offerDiscountAmount = await recalculateSessionDiscounts(sessionId, session.frozenSubtotal || 0, gstAmount);

      let calculatedManualDiscountAmount = 0;
      if (discountType === 'percentage') {
        sessionUpdate.discountPercentage = discountValue;
        calculatedManualDiscountAmount = Math.floor((grandTotalBeforeDiscount * discountValue) / 100);
      } else if (discountType === 'fixed') {
        calculatedManualDiscountAmount = Math.round(discountValue * 100);
      }

      const totalDiscountAmount = calculatedManualDiscountAmount + offerDiscountAmount;
      const grandTotal = Math.max(0, grandTotalBeforeDiscount - totalDiscountAmount);

      sessionUpdate.discountAmount = totalDiscountAmount;
      sessionUpdate.frozenTaxableAmount = session.frozenSubtotal;
      sessionUpdate.frozenGstAmount = gstAmount;
      sessionUpdate.finalBillAmount = grandTotal;
      sessionUpdate.grandTotal = grandTotal;
      sessionUpdate.finalAmount = grandTotal;

      // Set discount approval info
      sessionUpdate.discountApprovedByUserId = user.id;
      sessionUpdate.discountApprovedAt = new Date();
      sessionUpdate.discountReason = `Payment discount: ${discountType} ${discountValue}${discountType === 'percentage' ? '%' : '₹'}`;
    }

    await db
      .update(tableSession)
      .set(sessionUpdate)
      .where(eq(tableSession.id, sessionId));

    // Update table status to available
    if (session.tableId) {
      await db
        .update(tables)
        .set({
          liveStatus: "available",
        })
        .where(eq(tables.id, session.tableId));

      console.log(`Table ${session.tableId} unlocked and set to available`);
    }

    // Create payment record with discount information
    const paymentData: any = {
      id: nanoid(),
      tableSessionId: sessionId,
      restaurantId: session.restaurantId,
      amount: Math.round(amount * 100), // Convert rupees to paise
      originalAmount: originalAmount ? Math.round(originalAmount * 100) : Math.round(amount * 100), // Store original amount in paise
      finalAmount: Math.round(amount * 100), // Final amount after discount (in paise)
      method,
      referenceNumber: referenceNumber || null,
      paidByUserId: user.id,
      status: "success",
    };

    // Only add discount fields if discount is applied
    if (discountType && discountValue !== undefined) {
      paymentData.discountType = discountType;
      paymentData.discountValue = discountValue;

      // Calculate final amount after discount based on new logic
      const discountAmountPaise = sessionUpdate.discountAmount || 0;
      const subtotalPaise = session.frozenSubtotal || 0;
      const gstAmountPaise = Math.floor((subtotalPaise * (session.frozenGstRate || 0)) / 100);
      const finalAmountInPaise = Math.max(0, (subtotalPaise + gstAmountPaise) - discountAmountPaise);

      paymentData.finalAmount = finalAmountInPaise;
      paymentData.amount = finalAmountInPaise; // Update the amount field to be the final amount
    }

    await db.insert(payments).values(paymentData);

    console.log("Payment recorded successfully:", {
      sessionId,
      amount,
      originalAmount,
      discountType,
      discountValue,
      method
    });

    // Emit WebSocket event for real-time updates
    emitToRestaurant(session.restaurantId, 'payment-recorded', {
      sessionId,
      tableId: session.tableId,
      amount,
      method,
      discountType,
      discountValue,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: "Payment recorded successfully. Session closed and table is now available.",
      data: {
        sessionId,
        amount,
        originalAmount,
        discountType,
        discountValue,
        method,
        referenceNumber
      }
    });
  } catch (error: any) {
    console.error("Error recording payment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record payment"
    });
  }
});

// GET /payment-requests/:restaurantId - Get sessions for bill printing (all statuses)
router.get("/payment-requests/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check if user has permission
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view payment requests for this restaurant"
      });
    }

    console.log("Fetching sessions for bill printing for restaurant:", restaurantId);

    // Get all sessions that have been started (allow printing for any status)
    const paymentRequests = await db
      .select({
        sessionId: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tables.tableNumber,
        restaurantId: tableSession.restaurantId,
        status: tableSession.status,
        paymentStatus: tableSession.paymentStatus,
        startedAt: tableSession.startedAt,
        endedAt: tableSession.endedAt,
        billedAt: tableSession.billedAt,
        finalBillAmount: tableSession.finalBillAmount,
        grandTotal: tableSession.grandTotal,
        invoiceNumber: tableSession.invoiceNumber,
        frozenSubtotal: tableSession.frozenSubtotal,
        frozenGstRate: tableSession.frozenGstRate,
        frozenGstAmount: tableSession.frozenGstAmount,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .where(
        and(
          eq(tableSession.restaurantId, restaurantId),
          isNotNull(tableSession.startedAt) // Only sessions that have actually started
        )
      )
      .orderBy(desc(tableSession.startedAt));

    console.log(`Found ${paymentRequests.length} sessions for bill printing`);

    return res.json({
      success: true,
      data: paymentRequests,
    });
  } catch (error: any) {
    console.error("Error fetching sessions for bill printing:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment requests"
    });
  }
});

// GET /my-orders/:sessionId/details - Get detailed order information
router.get("/my-orders/:sessionId/details", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // Get session details with creator information
    const sessionData = await db
      .select({
        sessionId: tableSession.id,
        restaurantId: tableSession.restaurantId,
        restaurantName: restaurants.restaurantName,
        restaurantLogo: restaurants.restaurantLogo,
        restaurantBanner: restaurants.restaurantBanner,
        restaurantCity: restaurants.city,
        restaurantAddress: restaurants.restaurantAddress,
        restaurantFssai: restaurants.fssaiLicenseNumber,
        tableNumber: tables.tableNumber,
        startedAt: tableSession.startedAt,
        closedAt: tableSession.endedAt,
        billedAt: tableSession.billedAt,
        paymentStatus: tableSession.paymentStatus,
        finalBillAmount: tableSession.finalBillAmount,
        grandTotal: tableSession.grandTotal,
        subtotal: tableSession.frozenSubtotal,
        discountAmount: tableSession.frozenDiscountAmount,
        gstAmount: tableSession.frozenGstAmount,
        status: tableSession.status,
        createdByUserId: tableSession.createdByUserId,
        creatorName: authUsers.name,
        creatorEmail: authUsers.email,
        creatorImage: authUsers.image,
      })
      .from(tableSession)
      .leftJoin(restaurants, eq(tableSession.restaurantId, restaurants.id))
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .leftJoin(authUsers, eq(tableSession.createdByUserId, authUsers.id))
      .where(
        and(
          eq(tableSession.id, sessionId),
          eq(tableSession.createdByUserId, userId)
        )
      )
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const session = sessionData[0];

    // Get order items with menu details
    const items = await db
      .select({
        orderItemId: orderItems.id,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        notes: orderItems.notes,
        status: orderItems.status,
        itemName: menuItems.name,
        itemDescription: menuItems.description,
        itemImage: menuItems.imageURL,
        isVeg: menuItems.isVeg,
        variantName: menuItemVariants.variantName,
        variantSize: menuItemVariants.portionSize,
      })
      .from(orderItems)
      .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.tableSessionId, sessionId));

    // Get order item extras
    const itemExtras = await db
      .select({
        orderItemId: orderItemExtras.orderItemId,
        extraId: orderItemExtras.extraId,
        extraName: menuExtras.name,
        quantity: orderItemExtras.quantity,
        unitPrice: orderItemExtras.unitPrice,
        totalPrice: orderItemExtras.totalPrice,
      })
      .from(orderItemExtras)
      .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
      .where(inArray(orderItemExtras.orderItemId, items.map(item => item.orderItemId)));

    // Group extras by order item
    const extrasByItemId = itemExtras.reduce((acc, extra) => {
      if (!acc[extra.orderItemId]) {
        acc[extra.orderItemId] = [];
      }
      acc[extra.orderItemId].push({
        id: extra.extraId,
        name: extra.extraName,
        quantity: extra.quantity,
        unitPrice: extra.unitPrice,
        totalPrice: extra.totalPrice,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Add extras to items
    const itemsWithExtras = items.map(item => ({
      ...item,
      extras: extrasByItemId[item.orderItemId] || [],
    }));

    // Get payments
    const paymentRecords = await db
      .select()
      .from(payments)
      .where(eq(payments.tableSessionId, sessionId))
      .orderBy(desc(payments.createdAt));

    // Get applied discounts (optional - handle gracefully if table doesn't exist)
    let discounts: any[] = [];
    try {
      const { sessionDiscounts } = await import("../db/schema/loyalty.js");
      discounts = await db
        .select()
        .from(sessionDiscounts)
        .where(eq(sessionDiscounts.sessionId, sessionId));
    } catch (error) {
      console.log("Session discounts table not available, skipping discounts:", error.message);
    }

    // Check if review exists
    const { reviews } = await import("../db/schema/reviews.js");
    const existingReview = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.sessionId, sessionId),
          eq(reviews.userId, userId)
        )
      )
      .limit(1);

    return res.json({
      success: true,
      order: {
        session,
        items: itemsWithExtras,
        payments: paymentRecords,
        discounts,
        hasReview: existingReview.length > 0,
        review: existingReview[0] || null,
      },
    });
  } catch (error: any) {
    console.error("Error fetching order details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
    });
  }
});

// GET /my-orders - Get user's order history
router.get("/my-orders", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get all sessions created by the user
    const userSessions = await db
      .select({
        sessionId: tableSession.id,
        restaurantId: tableSession.restaurantId,
        restaurantName: restaurants.restaurantName,
        restaurantLogo: restaurants.restaurantLogo,
        restaurantCity: restaurants.city,
        tableNumber: tables.tableNumber,
        startedAt: tableSession.startedAt,
        closedAt: tableSession.endedAt,
        paymentStatus: tableSession.paymentStatus,
        finalBillAmount: tableSession.finalBillAmount,
        grandTotal: tableSession.grandTotal,
        status: tableSession.status,
      })
      .from(tableSession)
      .leftJoin(restaurants, eq(tableSession.restaurantId, restaurants.id))
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .where(eq(tableSession.createdByUserId, userId))
      .orderBy(desc(tableSession.startedAt));

    // For each session, get order items count and payment info
    const ordersWithDetails = await Promise.all(
      userSessions.map(async (session) => {
        // Count order items
        const itemsResult = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.tableSessionId, session.sessionId));

        // Get payments
        const paymentsResult = await db
          .select({
            amount: payments.amount,
            method: payments.method,
          })
          .from(payments)
          .where(eq(payments.tableSessionId, session.sessionId))
          .orderBy(desc(payments.createdAt));

        const totalPaid = paymentsResult.reduce((sum, payment) => sum + payment.amount, 0);
        const paymentMethod = paymentsResult.length > 0 ? paymentsResult[0].method : null;

        return {
          sessionId: session.sessionId,
          restaurantId: session.restaurantId,
          restaurantName: session.restaurantName,
          restaurantLogo: session.restaurantLogo,
          restaurantCity: session.restaurantCity,
          tableNumber: session.tableNumber,
          startedAt: session.startedAt,
          closedAt: session.closedAt,
          paymentStatus: session.paymentStatus,
          finalBillAmount: session.finalBillAmount,
          grandTotal: session.grandTotal,
          status: session.status,
          itemsCount: itemsResult.length,
          totalPaid: totalPaid,
          paymentMethod: paymentMethod,
        };
      })
    );

    return res.json({
      success: true,
      orders: ordersWithDetails,
    });
  } catch (error: any) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

// GET /:sessionId - Get session details with orders
router.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log("Fetching session:", sessionId);

    // Get session details
    const sessionData = await db
      .select({
        sessionId: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tables.tableNumber,
        restaurantId: tableSession.restaurantId,
        restaurantName: restaurants.restaurantName,
        defaultGstPercentage: restaurants.defaultGstPercentage,
        qrToken: tableSession.qrToken,
        status: tableSession.status,
        billedAt: tableSession.billedAt,
        startedAt: tableSession.startedAt,
        discountAmount: tableSession.discountAmount,
        discountPercentage: tableSession.discountPercentage,
        frozenSubtotal: tableSession.frozenSubtotal,
        frozenGstRate: tableSession.frozenGstRate,
        frozenGstAmount: tableSession.frozenGstAmount,
        finalBillAmount: tableSession.finalBillAmount,
        grandTotal: tableSession.grandTotal,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .leftJoin(restaurants, eq(tableSession.restaurantId, restaurants.id))
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const session = sessionData[0];

    // Get all orders for this session
    const sessionOrders = await db
      .select({
        orderId: orders.id,
        orderStatus: orders.status,
        orderNotes: orders.notes,
        subtotal: orders.subtotal,
        discount: orders.discount,
        gst: orders.gst,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.tableSessionId, sessionId))
      .orderBy(desc(orders.createdAt));

    // Get all order items for these orders
    const orderIds = sessionOrders.map(o => o.orderId);
    let allItems: any[] = [];

    if (orderIds.length > 0) {
      allItems = await db
        .select({
          orderItemId: orderItems.id,
          orderId: orderItems.orderId,
          menuItemId: orderItems.menuItemId,
          menuItemName: menuItems.name,
          isVeg: menuItems.isVeg,
          variantId: orderItems.menuItemVariantId,
          variantName: menuItemVariants.variantName,
          portionSize: menuItemVariants.portionSize,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          itemStatus: orderItems.status,
          notes: orderItems.notes,
        })
        .from(orderItems)
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
        .where(eq(orderItems.tableSessionId, sessionId));
    }

    // Get all order item extras
    const itemIds = allItems.map(item => item.orderItemId);
    let allExtras: any[] = [];

    if (itemIds.length > 0) {
      allExtras = await db
        .select({
          orderItemId: orderItemExtras.orderItemId,
          extraId: orderItemExtras.extraId,
          extraName: menuExtras.name,
          quantity: orderItemExtras.quantity,
          unitPrice: orderItemExtras.unitPrice,
          totalPrice: orderItemExtras.totalPrice,
        })
        .from(orderItemExtras)
        .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
        .where(inArray(orderItemExtras.orderItemId, itemIds));
    }

    // Group extras by order item
    const extrasByItemId = allExtras.reduce((acc, extra) => {
      if (!acc[extra.orderItemId]) {
        acc[extra.orderItemId] = [];
      }
      acc[extra.orderItemId].push({
        id: extra.extraId,
        name: extra.extraName,
        quantity: extra.quantity,
        unitPrice: extra.unitPrice,
        totalPrice: extra.totalPrice,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Add extras to items
    const itemsWithExtras = allItems.map(item => ({
      ...item,
      extras: extrasByItemId[item.orderItemId] || [],
    }));

    // Group items by order
    const ordersWithItems = sessionOrders.map(order => ({
      ...order,
      items: itemsWithExtras.filter(item => item.orderId === order.orderId),
    }));

    // Calculate session totals
    const sessionExtrasTotal = allExtras.reduce((sum, extra) => sum + (extra.totalPrice || 0), 0);
    const sessionSubtotal = sessionOrders.reduce((sum, order) => sum + (order.subtotal || 0), 0);
    
    // Ensure GST amount is available for recalculation
    const gstRateForCalc = Number(session.defaultGstPercentage) || 0;
    const sessionGstForCalc = Math.floor((sessionSubtotal * gstRateForCalc) / 100);

    // LIVE RECALCULATION: Update all offer-based discounts based on the current session items
    // This ensures that "My Session" and "Management View" always show up-to-date potential savings
    await recalculateSessionDiscounts(sessionId, sessionSubtotal, sessionGstForCalc);

    const sessionBaseSubtotal = sessionSubtotal - sessionExtrasTotal;
    const orderLevelDiscount = sessionOrders.reduce((sum, order) => sum + (order.discount || 0), 0);
    const sessionGst = sessionOrders.reduce((sum, order) => sum + (order.gst || 0), 0);
    const sessionGrandTotal = sessionOrders.reduce((sum, order) => sum + (order.grandTotal || 0), 0);

    // Fetch applied offers/vouchers from sessionDiscounts
    let appliedOffers: any[] = [];
    let offerDiscountTotal = 0;
    try {
      const { sessionDiscounts } = await import("../db/schema/loyalty.js");
      appliedOffers = await db
        .select()
        .from(sessionDiscounts)
        .where(eq(sessionDiscounts.sessionId, sessionId));
      offerDiscountTotal = appliedOffers.reduce((sum, d) => sum + d.discountValue, 0);
    } catch (e) {
      // sessionDiscounts table may not exist yet
    }

    // Manual session-level discount (if any)
    let manualSessionDiscount = 0;
    if (session.discountAmount && session.discountAmount > 0) {
      manualSessionDiscount = session.discountAmount;
    } else if (session.discountPercentage && session.discountPercentage > 0) {
      // For live calculation, we use (subtotal + gst) as base
      manualSessionDiscount = Math.floor(((sessionSubtotal + sessionGst) * session.discountPercentage) / 100);
    }

    const totalSessionDiscount = offerDiscountTotal + manualSessionDiscount;

    return res.json({
      success: true,
      data: {
        session: {
          ...session,
          calculatedSubtotal: sessionSubtotal,
          calculatedExtrasTotal: sessionExtrasTotal,
          calculatedBaseSubtotal: sessionBaseSubtotal,
          calculatedDiscount: totalSessionDiscount + orderLevelDiscount,
          calculatedGst: sessionGst,
          calculatedGrandTotal: Math.max(0, sessionGrandTotal - totalSessionDiscount),
        },
        orders: ordersWithItems,
        appliedOffers: appliedOffers.map(d => ({
          id: d.id,
          discountType: d.discountType,
          discountName: d.discountName,
          discountValue: d.discountValue,
          discountSourceId: d.discountSourceId,
        })),
        summary: {
          totalOrders: sessionOrders.length,
          totalItems: allItems.length,
          subtotal: sessionSubtotal,
          extrasTotal: sessionExtrasTotal,
          baseSubtotal: sessionBaseSubtotal,
          discount: totalSessionDiscount + orderLevelDiscount,
          gst: sessionGst,
          grandTotal: Math.max(0, sessionGrandTotal - totalSessionDiscount),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session details"
    });
  }
});

// GET /past-sessions/:restaurantId - Get all past sessions (paid/closed)
router.get("/past-sessions/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check if user has access to this restaurant
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Pagination params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Base conditions
    const conditions = and(
      eq(tableSession.restaurantId, restaurantId),
      inArray(tableSession.paymentStatus, ["paid"]),
      inArray(tableSession.status, ["closed"])
    );

    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tableSession)
      .where(conditions);

    const total = Number(totalCountResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Get past sessions (paid or closed status)
    const pastSessions = await db
      .select({
        id: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tables.tableNumber,
        restaurantId: tableSession.restaurantId,
        status: tableSession.status,
        paymentStatus: tableSession.paymentStatus,
        startedAt: tableSession.startedAt,
        endedAt: tableSession.endedAt,
        billedAt: tableSession.billedAt,
        invoiceNumber: tableSession.invoiceNumber,
        finalBillAmount: tableSession.finalBillAmount,
        finalAmount: tableSession.finalAmount,
        discountAmount: tableSession.discountAmount,
        gstAmount: tableSession.gstAmount,
        subtotal: tableSession.subtotal,
        createdByUserId: tableSession.createdByUserId,
        createdByName: authUsers.name,
        discountPercentage: tableSession.discountPercentage,
        discountReason: tableSession.discountReason,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .leftJoin(authUsers, eq(tableSession.createdByUserId, authUsers.id))
      .where(conditions)
      .orderBy(desc(tableSession.billedAt))
      .limit(limit)
      .offset(offset);

    // Get order counts for each session
    const sessionIds = pastSessions.map(s => s.id);
    const orderCounts = await db
      .select({
        sessionId: orders.tableSessionId,
        orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
        totalItems: sql<number>`SUM(${orderItems.quantity})`,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          inArray(orders.tableSessionId, sessionIds),
          sql`${orders.status} != 'cancelled'`
        )
      )
      .groupBy(orders.tableSessionId);

    // Combine session data with order counts
    const sessionsWithCounts = pastSessions.map(session => {
      const orderData = orderCounts.find(oc => oc.sessionId === session.id);
      return {
        ...session,
        orderCount: orderData?.orderCount || 0,
        totalItems: orderData?.totalItems || 0,
      };
    });

    return res.json({
      success: true,
      sessions: sessionsWithCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error("Error fetching past sessions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch past sessions"
    });
  }
});



// GET /past-session/:sessionId - Get detailed session info with all orders
router.get("/past-session/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    // Get session details

    // Get session details
    const sessionData = await db
      .select({
        id: tableSession.id,
        tableId: tableSession.tableId,
        tableNumber: tables.tableNumber,
        restaurantId: tableSession.restaurantId,
        restaurantName: restaurants.restaurantName,
        restaurantAddress: restaurants.restaurantAddress,
        restaurantPhone: restaurants.phoneNumber,
        status: tableSession.status,
        paymentStatus: tableSession.paymentStatus,
        startedAt: tableSession.startedAt,
        endedAt: tableSession.endedAt,
        billedAt: tableSession.billedAt,
        invoiceNumber: tableSession.invoiceNumber,
        finalBillAmount: tableSession.finalBillAmount,
        discountAmount: tableSession.discountAmount,
        gstAmount: tableSession.gstAmount,
        subtotal: tableSession.subtotal,
        createdByUserId: tableSession.createdByUserId,
        discountPercentage: tableSession.discountPercentage,
        discountReason: tableSession.discountReason,
        createdByName: authUsers.name,
      })
      .from(tableSession)
      .leftJoin(tables, eq(tableSession.tableId, tables.id))
      .leftJoin(restaurants, eq(tableSession.restaurantId, restaurants.id))
      .leftJoin(authUsers, eq(tableSession.createdByUserId, authUsers.id))
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (sessionData.length === 0) {
      console.log(`❌ [PAST SESSION] Session not found: ${sessionId}`);
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const session = sessionData[0];
    console.log(`✅ [PAST SESSION] Found session:`, { id: session.id, status: session.status, restaurantId: session.restaurantId });

    // Check if user has access to this restaurant
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, session.restaurantId);
    if (!hasAccess) {
      console.log(`❌ [PAST SESSION] Access denied for user ${user.id} to restaurant ${session.restaurantId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }



    // Get all orders for this session
    const sessionOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        subtotal: orders.subtotal,
        discount: orders.discount,
        gst: orders.gst,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        placedByUserId: orders.placedByUserId,
        placedByName: authUsers.name,
        notes: orders.notes,
      })
      .from(orders)
      .leftJoin(authUsers, eq(orders.placedByUserId, authUsers.id))
      .where(eq(orders.tableSessionId, sessionId))
      .orderBy(desc(orders.createdAt));





    // Get order items for each order
    const orderIds = sessionOrders.map(o => o.id);
    const orderItemsData = await db
      .select({
        orderItemId: orderItems.id,
        orderId: orderItems.orderId,
        menuItemId: orderItems.menuItemId,
        menuItemName: menuItems.name,
        variantId: orderItems.menuItemVariantId,
        variantName: menuItemVariants.variantName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        status: orderItems.status,
        notes: orderItems.notes,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(orderItems.createdAt);

    // Get order item extras
    const itemIds = orderItemsData.map(item => item.orderItemId);
    const orderItemExtrasData = await db
      .select({
        orderItemId: orderItemExtras.orderItemId,
        extraId: orderItemExtras.extraId,
        extraName: menuExtras.name,
        quantity: orderItemExtras.quantity,
        unitPrice: orderItemExtras.unitPrice,
        totalPrice: orderItemExtras.totalPrice,
      })
      .from(orderItemExtras)
      .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
      .where(inArray(orderItemExtras.orderItemId, itemIds));

    // Group extras by order item ID
    const extrasByItemId = orderItemExtrasData.reduce((acc, extra) => {
      if (!acc[extra.orderItemId]) {
        acc[extra.orderItemId] = [];
      }
      acc[extra.orderItemId].push({
        id: extra.extraId,
        name: extra.extraName,
        quantity: extra.quantity,
        price: extra.unitPrice,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Add extras to order items
    const itemsWithExtras = orderItemsData.map(item => ({
      ...item,
      extras: extrasByItemId[item.orderItemId] || [],
    }));

    // Group order items by order
    const ordersWithItems = sessionOrders.map(order => ({
      ...order,
      items: itemsWithExtras.filter(item => item.orderId === order.id),
      itemCount: itemsWithExtras.filter(item => item.orderId === order.id).reduce((sum, item) => sum + item.quantity, 0),
    }));

    // Get payment information
    const paymentData = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        method: payments.method,
        status: payments.status,
        transactionId: payments.referenceNumber,
        createdAt: payments.createdAt,
        processedByName: authUsers.name,
      })
      .from(payments)
      .leftJoin(authUsers, eq(payments.paidByUserId, authUsers.id))
      .where(eq(payments.tableSessionId, sessionId))
      .orderBy(desc(payments.createdAt));

    const finalResponse = {
      success: true,
      session: {
        ...session,
        finalBillAmount: Number(session.finalBillAmount || 0),
        discountAmount: Number(session.discountAmount || 0),
        gstAmount: Number(session.gstAmount || 0),
        subtotal: Number(session.subtotal || 0),
      },
      orders: ordersWithItems.map(order => ({
        ...order,
        subtotal: Number(order.subtotal || 0),
        discount: Number(order.discount || 0),
        gst: Number(order.gst || 0),
        grandTotal: Number(order.grandTotal || 0),
        items: order.items.map(item => ({
          orderId: item.orderId,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
          status: item.status,
          notes: item.notes,
          extras: item.extras || [],
        })),
      })),
      payments: paymentData.map(payment => ({
        ...payment,
        amount: Number(payment.amount || 0),
      })),
      summary: {
        totalOrders: sessionOrders.length,
        totalItems: orderItemsData.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: Number(session.finalBillAmount || 0),
        totalPayments: paymentData.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      },
      discounts: (await (async () => {
        const discounts = await db
          .select()
          .from(sessionDiscounts)
          .where(eq(sessionDiscounts.sessionId, sessionId));
        return discounts.map(d => ({
          id: d.id,
          discountType: d.discountType,
          discountName: d.discountName,
          discountValue: Number(d.discountValue || 0),
          appliedAt: d.appliedAt,
        }));
      })())
    };

    fs.appendFileSync('debug-session.log', `📡 Sending response. Summary: ${JSON.stringify(finalResponse.summary)}\n`);

    console.log(`📡 [PAST SESSION] Sending response for ${sessionId}. Summary:`, finalResponse.summary);
    return res.json(finalResponse);

  } catch (error) {
    console.error("Error fetching session details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session details"
    });
  }
});

// GET /past-session/:sessionId/order/:orderId - Get specific order details
router.get("/past-session/:sessionId/order/:orderId", requireAuth, async (req: any, res) => {
  console.log("🚀 ORDER DETAILS ROUTE HIT:", req.params);
  try {
    const { sessionId, orderId } = req.params;
    const user = req.user;

    console.log("🔍 ORDER DETAILS REQUEST:", { sessionId, orderId, userId: user.id });

    // First verify session access
    const sessionCheck = await db
      .select({ restaurantId: tableSession.restaurantId })
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    console.log("🔍 SESSION CHECK RESULT:", sessionCheck);

    if (sessionCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, sessionCheck[0].restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    console.log("✅ ACCESS GRANTED, FETCHING ORDER DATA");

    // Get order details
    const orderData = await db
      .select({
        id: orders.id,
        tableSessionId: orders.tableSessionId,
        status: orders.status,
        subtotal: orders.subtotal,
        discount: orders.discount,
        gst: orders.gst,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        placedByUserId: orders.placedByUserId,
        placedByName: sql<string>`COALESCE(${authUsers.name}, 'Unknown User')`,
        notes: orders.notes,
        tableNumber: tables.tableNumber,
        restaurantName: restaurants.restaurantName,
      })
      .from(orders)
      .innerJoin(tableSession, eq(orders.tableSessionId, tableSession.id))
      .innerJoin(tables, eq(tableSession.tableId, tables.id))
      .innerJoin(restaurants, eq(tableSession.restaurantId, restaurants.id))
      .leftJoin(authUsers, eq(orders.placedByUserId, authUsers.id))
      .where(and(
        eq(orders.id, orderId),
        eq(orders.tableSessionId, sessionId)
      ))
      .limit(1);

    console.log("🔍 ORDER DATA RESULT:", orderData);

    if (orderData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const order = orderData[0];

    // Get order items
    const orderItemsData = await db
      .select({
        id: orderItems.id,
        menuItemId: orderItems.menuItemId,
        menuItemName: menuItems.name,
        variantId: orderItems.menuItemVariantId,
        variantName: menuItemVariants.variantName,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        status: orderItems.status,
        notes: orderItems.notes,
        createdAt: orderItems.createdAt,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.createdAt);

    // Get order item extras
    const itemIds = orderItemsData.map(item => item.id);
    const orderItemExtrasData = await db
      .select({
        orderItemId: orderItemExtras.orderItemId,
        extraId: orderItemExtras.extraId,
        extraName: menuExtras.name,
        quantity: orderItemExtras.quantity,
        unitPrice: orderItemExtras.unitPrice,
        totalPrice: orderItemExtras.totalPrice,
      })
      .from(orderItemExtras)
      .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
      .where(inArray(orderItemExtras.orderItemId, itemIds));

    // Group extras by order item ID
    const extrasByItemId = orderItemExtrasData.reduce((acc, extra) => {
      if (!acc[extra.orderItemId]) {
        acc[extra.orderItemId] = [];
      }
      acc[extra.orderItemId].push({
        id: extra.extraId,
        name: extra.extraName,
        quantity: extra.quantity,
        price: extra.unitPrice,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Add extras to order items
    const itemsWithExtras = orderItemsData.map(item => ({
      ...item,
      extras: extrasByItemId[item.id] || [],
    }));

    return res.json({
      success: true,
      order: {
        ...order,
        subtotal: Number(order.subtotal || 0),
        discount: Number(order.discount || 0),
        gst: Number(order.gst || 0),
        grandTotal: Number(order.grandTotal || 0),
        items: itemsWithExtras.map(item => ({
          id: item.id,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          variantId: item.variantId,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
          status: item.status,
          notes: item.notes,
          createdAt: item.createdAt,
          extras: item.extras || [],
        })),
        itemCount: itemsWithExtras.reduce((sum, item) => sum + item.quantity, 0),
      }
    });

  } catch (error) {
    console.error("Error fetching order details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details"
    });
  }
});


// GET /past-sessions/orders - Get all orders for past sessions
router.get("/past-sessions/orders", requireAuth, async (req: any, res) => {
  try {
    console.log("🔍 [PAST ORDERS] Starting request");
    const user = req.user;
    console.log("🔍 [PAST ORDERS] User:", user?.id);

    // Get user's restaurant
    const userRestaurant = await db
      .select({
        restaurantId: restaurantManagers.restaurantId,
      })
      .from(restaurantManagers)
      .where(eq(restaurantManagers.userId, user.id))
      .limit(1);

    if (userRestaurant.length === 0) {
      return res.status(403).json({
        success: false,
        message: "No restaurant access"
      });
    }

    const restaurantId = userRestaurant[0].restaurantId;
    console.log("🔍 [PAST ORDERS] Restaurant ID:", restaurantId);

    // Get all orders from past sessions (closed sessions)
    const orderRecords = await db
      .select({
        id: orders.id,
        sessionId: orders.tableSessionId,
        sessionTableId: tableSession.tableId,
        sessionTableNumber: tables.tableNumber,
        sessionRestaurantId: tableSession.restaurantId,
        sessionRestaurantName: restaurants.restaurantName,
        sessionRestaurantAddress: restaurants.restaurantAddress,
        sessionRestaurantPhone: restaurants.phoneNumber,
        sessionStartedAt: tableSession.startedAt,
        sessionEndedAt: tableSession.endedAt,
        sessionBilledAt: tableSession.billedAt,
        sessionInvoiceNumber: tableSession.invoiceNumber,
        sessionFinalBillAmount: tableSession.finalBillAmount,
        sessionDiscountAmount: tableSession.discountAmount,
        sessionGstAmount: tableSession.gstAmount,
        sessionSubtotal: tableSession.subtotal,
        sessionDiscountPercentage: tableSession.discountPercentage,
        sessionDiscountReason: tableSession.discountReason,
        status: orders.status,
        subtotal: orders.subtotal,
        discount: orders.discount,
        gst: orders.gst,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        placedByUserId: orders.placedByUserId,
        placedByName: sql<string>`COALESCE(${authUsers.name}, 'Unknown User')`,
        notes: orders.notes,
      })
      .from(orders)
      .innerJoin(tableSession, eq(orders.tableSessionId, tableSession.id))
      .innerJoin(tables, eq(tableSession.tableId, tables.id))
      .innerJoin(restaurants, eq(tableSession.restaurantId, restaurants.id))
      .leftJoin(authUsers, eq(orders.placedByUserId, authUsers.id))
      .where(and(
        eq(tableSession.restaurantId, restaurantId),
        eq(tableSession.status, 'closed')
      ))
      .orderBy(desc(orders.createdAt));

    console.log("🔍 [PAST ORDERS] Found orders:", orderRecords.length);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orderRecords.map(async (order) => {
        const orderItemsData = await db
          .select({
            id: orderItems.id,
            menuItemId: orderItems.menuItemId,
            menuItemName: menuItems.name,
            variantId: orderItems.menuItemVariantId,
            variantName: menuItemVariants.variantName,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            totalPrice: orderItems.totalPrice,
            status: orderItems.status,
            notes: orderItems.notes,
            createdAt: orderItems.createdAt,
          })
          .from(orderItems)
          .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
          .where(eq(orderItems.orderId, order.id))
          .orderBy(orderItems.createdAt);

        // Get extras for these order items
        const orderItemIds = orderItemsData.map(item => item.id);
        const orderItemExtrasData = await db
          .select({
            orderItemId: orderItemExtras.orderItemId,
            extraId: orderItemExtras.extraId,
            quantity: orderItemExtras.quantity,
            unitPrice: orderItemExtras.unitPrice,
            totalPrice: orderItemExtras.totalPrice,
            extraName: menuExtras.name,
            extraPrice: menuExtras.price,
          })
          .from(orderItemExtras)
          .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
          .where(inArray(orderItemExtras.orderItemId, orderItemIds));

        return {
          ...order,
          items: orderItemsData.map(item => ({
            ...item,
            unitPrice: Number(item.unitPrice || 0),
            totalPrice: Number(item.totalPrice || 0),
            extras: orderItemExtrasData
              .filter(extra => extra.orderItemId === item.id)
              .map(extra => ({
                extraId: extra.extraId,
                name: extra.extraName,
                quantity: extra.quantity,
                unitPrice: Number(extra.unitPrice || 0),
                totalPrice: Number(extra.totalPrice || 0),
              })),
          })),
          itemCount: orderItemsData.reduce((sum, item) => sum + item.quantity, 0),
        };
      })
    );

    console.log("🔍 [PAST ORDERS] Orders with items:", ordersWithItems.length);

    return res.json({
      success: true,
      orders: ordersWithItems.map(order => ({
        ...order,
        subtotal: Number(order.subtotal || 0),
        discount: Number(order.discount || 0),
        gst: Number(order.gst || 0),
        grandTotal: Number(order.grandTotal || 0),
        sessionFinalBillAmount: Number(order.sessionFinalBillAmount || 0),
        sessionDiscountAmount: Number(order.sessionDiscountAmount || 0),
        sessionGstAmount: Number(order.sessionGstAmount || 0),
        sessionSubtotal: Number(order.sessionSubtotal || 0),
        sessionDiscountPercentage: Number(order.sessionDiscountPercentage || 0),
      }))
    });

  } catch (error) {
    console.error("Error fetching past session orders:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders"
    });
  }
});

// GET /:sessionId - Get session details by ID

export default router;
