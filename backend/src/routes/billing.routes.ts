import { Router } from "express";
import { requireAuth } from "../auth/requireAuth.js";
import { db } from "../db/db.js";

import { and, eq, inArray } from "drizzle-orm";

import {
  totalBillingAmount,
  finalAmount,
  calculateSubtotal,
  calculateDiscount,
  calculateTaxableBase,
  calculateGST,
  calculateGrandTotal,
  freezeBill,
} from "../lib/billing.js";

import { tableSession } from "../db/schema/table-session.js";
import { orderItems } from "../db/schema/order-items.js";
import { orderItemExtras } from "../db/schema/order-item-extras.js";
import { menuExtras } from "../db/schema/menu-extras.js";
import { sessionDiscounts } from "../db/schema/loyalty.js";

import { isRestaurantOwnerOrManager } from "../lib/checkRoles.js";
import { emitToRestaurant } from "../lib/socket.js";


const router = Router();

// Define your billing routes here
router.get("/:tableSessionId/total", requireAuth, async (req, res) => {
  const { tableSessionId } = req.params;

  try {
    const totalAmount = await totalBillingAmount(tableSessionId);
    res.json({ totalAmount });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

router.get("/:tableSessionId/final-amount", requireAuth, async (req, res) => {
  const { tableSessionId } = req.params;
  const { discountPercentage, taxRate } = req.query;

  try {
    const subtotal = await totalBillingAmount(tableSessionId);

    // Use the updated logic from lib/billing.ts via helper or manual calculation here
    const discPercentage = Number(discountPercentage) || 0;
    const gstRate = Number(taxRate) || 0;

    const gstAmount = calculateGST(subtotal, gstRate);
    const grandTotalBeforeDiscount = subtotal + gstAmount;
    const discountAmount = calculateDiscount(grandTotalBeforeDiscount, discPercentage);
    
    // Discount applied on grand total (subtotal + GST)
    const taxableAmount = subtotal;
    const grandTotal = Math.max(0, grandTotalBeforeDiscount - discountAmount);

    res.json({
      subtotal,
      discountAmount,
      taxableAmount,
      gstAmount,
      grandTotal,
      finalAmount: grandTotal // Maintain backward compatibility
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

router.post("/:tableSessionId/generate-bill", requireAuth, async (req: any, res) => {
  const { tableSessionId } = req.params;
  const user = req.user;
  let { discountPercentage, taxRate } = req.body;
  const { restaurantId } = req.body;
  try {
    // 1️⃣ Fetch session
    const session = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, tableSessionId))
      .limit(1);

    if (session.length === 0) {
      return res.status(404).json({ error: "Table session not found" });
    }

    if (session[0].status === "cancelled") {
      return res.status(400).json({ error: "Cannot bill a cancelled session" });
    }

    if (session[0].paymentStatus === "paid") {
      return res.status(400).json({ error: "Session already paid" });
    }

    if (!(await isRestaurantOwnerOrManager(user.id, restaurantId))) {
      discountPercentage = 0;
    }

    // 2️⃣ Freeze the bill using the centralized function
    const billDetails = await freezeBill(tableSessionId, Number(discountPercentage) || 0);

    // 3️⃣ Emit WebSocket event for real-time dashboard update
    emitToRestaurant(restaurantId, "billing:updated", {
      type: "bill-generated",
      tableSessionId,
      restaurantId,
      ...billDetails,
    });

    // 4️⃣ Response
    return res.status(200).json({
      message: "Bill generated successfully",
      tableSessionId,
      ...billDetails,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
});

// GET /:tableSessionId/e-bill - Generate e-bill for table session
router.get("/:tableSessionId/e-bill", requireAuth, async (req: any, res) => {
  try {
    const { tableSessionId } = req.params;
    const user = req.user;

    // ✅ 1. GET TABLE SESSION
    const session = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, tableSessionId))
      .limit(1);

    if (session.length === 0) {
      return res.status(404).json({ message: "Table session not found" });
    }

    // ✅ 2. PERMISSION CHECK (restaurant staff or customer who owns the session)
    let hasAccess = false;
    if (user.role === "restaurant") {
      hasAccess = await isRestaurantOwnerOrManager(user.id, session[0].restaurantId);
    } else if (user.role === "customer" && session[0].createdByUserId) {
      hasAccess = session[0].createdByUserId === user.id;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. GET ORDER ITEMS FOR THE SESSION
    const sessionOrders = await db
      .select({
        orderId: orderItems.orderId,
        menuItemId: orderItems.menuItemId,
        variantId: orderItems.menuItemVariantId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        total: orderItems.totalPrice,
        notes: orderItems.notes,
        orderItemId: orderItems.id,
      })
      .from(orderItems)
      .innerJoin(tableSession, eq(orderItems.orderId, tableSession.id))
      .where(eq(tableSession.id, tableSessionId));

    // ✅ 3.1 GET ORDER ITEM EXTRAS
    const itemIds = sessionOrders.map(item => item.orderItemId);
    let itemExtras: any[] = [];

    if (itemIds.length > 0) {
      itemExtras = await db
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
    const itemsWithExtras = sessionOrders.map(item => ({
      ...item,
      extras: extrasByItemId[item.orderItemId] || [],
    }));

    // ✅ 4. CALCULATE BILL DETAILS (Use totalPrice which includes extras)
    const subtotal = session[0].frozenSubtotal || sessionOrders.reduce((sum, item) => sum + item.total, 0);
    const extrasTotal = session[0].frozenExtrasTotal || itemExtras.reduce((sum, extra) => sum + extra.totalPrice, 0);
    const discountAmount = session[0].frozenDiscountAmount || 0;
    const taxableAmount = session[0].frozenTaxableAmount || calculateTaxableBase(subtotal);
    const gstAmount = session[0].frozenGstAmount || calculateGST(taxableAmount, session[0].gstRate);
    const grandTotal = session[0].grandTotal || calculateGrandTotal(subtotal, gstAmount, discountAmount);

    // ✅ 5. GENERATE E-BILL DATA
    const eBill = {
      tableSessionId,
      restaurantId: session[0].restaurantId,
      customerId: session[0].createdByUserId,
      startedAt: session[0].startedAt,
      billGeneratedAt: new Date(),
      items: itemsWithExtras,
      billSummary: {
        subtotal: subtotal.toFixed(2),
        extrasTotal: extrasTotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        taxableAmount: taxableAmount.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      },
      paymentStatus: session[0].paymentStatus,
      notes: null,
    };

    // ✅ 6. SUCCESS RESPONSE
    res.status(200).json({
      eBill,
      message: "E-bill generated successfully"
    });
  } catch (error) {
    console.error("E-BILL GENERATION ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
