import { Router } from "express";
import { requireAuth } from "../auth/requireAuth.js";
import { db } from "../db/db.js";
import { nanoid } from "nanoid";

import { payments } from "../db/schema/payments.js";
import { tableSession } from "../db/schema/table-session.js";
import { customerVouchers, sessionDiscounts } from "../db/schema/loyalty.js";

import { and, eq, desc } from "drizzle-orm";
import { emitToRestaurant } from "../lib/socket.js";
import { restaurants } from "../db/schema/restaurants.js";

const router = Router();

router.post("/:tableSessionId/pay", requireAuth, async (req: any, res) => {
  try {
    const { tableSessionId } = req.params;
    const { amount, method, referenceNumber } = req.body;
    const paidByUserId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Valid payment amount is required",
      });
    }

    if (!method) {
      return res.status(400).json({
        error: "Payment method is required",
      });
    }

    // ✅ 1. Fetch table session
    const session = (
      await db
        .select()
        .from(tableSession)
        .where(eq(tableSession.id, tableSessionId))
        .limit(1)
    )[0];

    if (!session) {
      return res.status(404).json({ error: "Table session not found" });
    }

    // ✅ 2. Hard lifecycle blocks
    if (session.status === "cancelled") {
      return res.status(400).json({
        error: "Cannot accept payment on a cancelled session",
      });
    }

    if (session.paymentStatus === "paid") {
      return res.status(400).json({
        error: "This session is already fully paid",
      });
    }

    // ✅ 3. Bill must be frozen
    if (session.status !== "payment_pending") {
      return res.status(400).json({
        error: "Bill must be frozen before accepting payment",
      });
    }

    if (!session.finalBillAmount) {
      return res.status(400).json({
        error: "Final bill not found on session",
      });
    }

    const finalAmount = session.finalBillAmount; // ✅ PAISE

    // ✅ 4. Sum existing successful payments
    const existingPayments = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.tableSessionId, tableSessionId),
          eq(payments.status, "success")
        )
      );

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    // ✅ 5. Overpayment protection
    if (totalPaid + amount > finalAmount) {
      return res.status(400).json({
        error: "Payment exceeds remaining bill amount",
        remaining: finalAmount - totalPaid,
      });
    }

    // ✅ 6. Insert payment
    const payment = (
      await db
        .insert(payments)
        .values({
          id: nanoid(),
          tableSessionId,
          restaurantId: session.restaurantId,
          amount, // ✅ PAISE
          method,
          status: "success",
          referenceNumber,
          paidByUserId,
          isRefund: false,
        })
        .returning()
    )[0];

    // ✅ 7. Update session payment state
    const newTotalPaid = totalPaid + amount;

    let newPaymentStatus: "unpaid" | "partial" | "paid" = "partial";
    let newSessionStatus: "payment_pending" | "closed" = session.status;

    if (newTotalPaid === finalAmount) {
      newPaymentStatus = "paid";
      newSessionStatus = "closed";

      // ✅ 8. Mark vouchers as used and award loyalty points
      try {
        // Get session discounts to mark vouchers as used
        const discounts = await db
          .select()
          .from(sessionDiscounts)
          .where(eq(sessionDiscounts.sessionId, tableSessionId));

        for (const discount of discounts) {
          if (discount.discountType === "voucher" && discount.discountSourceId) {
            await db
              .update(customerVouchers)
              .set({
                status: "used",
                usedAt: new Date(),
                usedInSessionId: tableSessionId,
              })
              .where(eq(customerVouchers.id, discount.discountSourceId));
          }
        }

        // Award loyalty points (1 point per Rs 10 spent)
        const pointsEarned = Math.floor(finalAmount / 1000);

        // Try to find loyalty record
        const { customerLoyalty } = await import("../db/schema/loyalty.js");
        const existingLoyalty = await db
          .select()
          .from(customerLoyalty)
          .where(
            and(
              eq(customerLoyalty.userId, paidByUserId),
              eq(customerLoyalty.restaurantId, session.restaurantId)
            )
          )
          .limit(1);

        if (existingLoyalty.length === 0) {
          // Create new loyalty record
          await db.insert(customerLoyalty).values({
            id: nanoid(),
            userId: paidByUserId,
            restaurantId: session.restaurantId,
            points: pointsEarned,
            totalVisits: 1,
            totalSpent: finalAmount,
            tier: "bronze",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          // Update existing loyalty record
          const current = existingLoyalty[0];
          const newPoints = current.points + pointsEarned;

          // Calculate tier
          let newTier = "bronze";
          if (newPoints >= 10000) newTier = "platinum";
          else if (newPoints >= 5000) newTier = "gold";
          else if (newPoints >= 2000) newTier = "silver";

          await db
            .update(customerLoyalty)
            .set({
              points: newPoints,
              totalVisits: current.totalVisits + 1,
              totalSpent: current.totalSpent + finalAmount,
              tier: newTier,
              updatedAt: new Date(),
            })
            .where(eq(customerLoyalty.id, current.id));

          // Issue tier upgrade voucher
          if (newTier !== current.tier) {
            const voucherValue = newTier === "silver" ? 10000 : newTier === "gold" ? 20000 : 50000;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            await db.insert(customerVouchers).values({
              id: nanoid(),
              code: `${newTier.toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              userId: paidByUserId,
              restaurantId: session.restaurantId,
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
        }
      } catch (loyaltyError) {
        console.error("Error processing loyalty/vouchers:", loyaltyError);
        // Don't fail payment if loyalty update fails
      }
    }

    await db
      .update(tableSession)
      .set({
        paymentStatus: newPaymentStatus,
        status: newSessionStatus,
      })
      .where(eq(tableSession.id, tableSessionId));

    // ✅ 8. Emit WebSocket event for real-time dashboard update
    emitToRestaurant(session.restaurantId, "payment-recorded", {
      type: "payment-completed",
      sessionId: tableSessionId,
      restaurantId: session.restaurantId,
      tableNumber: session.tableId, // Assuming tableId stores the number/name
      amount,
      paymentStatus: newPaymentStatus,
      sessionStatus: newSessionStatus,
    });

    return res.status(200).json({
      message: "Payment recorded successfully",
      payment,
      paymentStatus: newPaymentStatus,
      sessionStatus: newSessionStatus,
      remainingAmount: finalAmount - newTotalPaid,
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return res.status(500).json({
      error: "Failed to process payment",
    });
  }
});

router.get("/my-payments", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const userPayments = await db
      .select({
        id: payments.id,
        tableSessionId: payments.tableSessionId,
        restaurantId: payments.restaurantId,
        amount: payments.amount,
        method: payments.method,
        status: payments.status,
        referenceNumber: payments.referenceNumber,
        isRefund: payments.isRefund,
        createdAt: payments.createdAt,
        restaurantName: restaurants.restaurantName,
      })
      .from(payments)
      .leftJoin(restaurants, eq(payments.restaurantId, restaurants.id))
      .where(eq(payments.paidByUserId, userId))
      .orderBy(desc(payments.createdAt));

    return res.status(200).json({ success: true, payments: userPayments });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/payments/order/:orderId/pay
router.post("/order/:orderId/pay", requireAuth, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const { amount, method } = req.body;
    const paidByUserId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid payment amount is required" });
    }
    if (!method) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    // Import orders schema to locate order details
    const { orders } = await import("../db/schema/orders.js");

    // 1. Fetch order
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (orderList.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    const order = orderList[0];
    const tableSessionId = order.tableSessionId;
    if (!tableSessionId) {
      return res.status(400).json({ error: "Order has no linked session" });
    }

    // 2. Fetch/update table session
    const sessionList = await db.select().from(tableSession).where(eq(tableSession.id, tableSessionId)).limit(1);
    if (sessionList.length === 0) {
      return res.status(404).json({ error: "Table session not found" });
    }
    const session = sessionList[0];

    // If session is active/unpaid, freeze bill first
    if (session.status === "active") {
      await db
        .update(tableSession)
        .set({
          status: "payment_pending",
          paymentStatus: "payment_pending",
          finalBillAmount: session.grandTotal,
          billedAt: new Date(),
          invoiceNumber: `INV-${Date.now()}-${tableSessionId.slice(0, 8)}`,
        })
        .where(eq(tableSession.id, tableSessionId));
    }

    // Insert payment record
    const payment = (
      await db
        .insert(payments)
        .values({
          id: nanoid(),
          tableSessionId,
          restaurantId: session.restaurantId,
          amount, // in paise
          method,
          status: "success",
          referenceNumber: `REF-${nanoid(8).toUpperCase()}`,
          paidByUserId,
          isRefund: false,
        })
        .returning()
    )[0];

    // Update session payment status
    await db
      .update(tableSession)
      .set({
        paymentStatus: "paid",
        status: "closed",
      })
      .where(eq(tableSession.id, tableSessionId));

    // Notify restaurant via WebSockets
    emitToRestaurant(session.restaurantId, "payment-recorded", {
      type: "payment-completed",
      sessionId: tableSessionId,
      restaurantId: session.restaurantId,
      amount,
      paymentStatus: "paid",
      sessionStatus: "closed",
    });

    return res.status(200).json({
      success: true,
      message: "Payment recorded successfully against order",
      payment,
    });
  } catch (error) {
    console.error("Order payment processing error:", error);
    return res.status(500).json({ error: "Failed to process order payment" });
  }
});

export default router;
