import { db } from "../db/db.js";
import { and, eq, ne, sql } from "drizzle-orm";
import { tableSession } from "../db/schema/table-session.js";
import { orderItems } from "../db/schema/order-items.js";
import { orderItemExtras } from "../db/schema/order-item-extras.js";
import { restaurants } from "../db/schema/restaurants.js";
import { sessionDiscounts } from "../db/schema/loyalty.js";
import { offers } from "../db/schema/offers.js";
import { menuItems } from "../db/schema/menu-items.js";

export async function totalBillingAmount(
  tableSessionId: string
): Promise<number> {
  const session = await db
    .select()
    .from(tableSession)
    .where(eq(tableSession.id, tableSessionId))
    .limit(1);

  if (session.length === 0) {
    throw new Error("Table session not found");
  }

  if (session[0].status === "cancelled") {
    throw new Error("Cannot bill a cancelled session");
  }

  // ✅ Optimized: Removed unnecessary join with 'orders' table
  // orderItems already has tableSessionId
  const sessionOrders = await db
    .select({
      quantity: orderItems.quantity,
      totalPrice: orderItems.totalPrice, // ✅ Use totalPrice which includes extras
    })
    .from(orderItems)
    .where(
      and(
        eq(orderItems.tableSessionId, tableSessionId),
        eq(orderItems.status, "served")
      )
    );

  let totalAmount = 0;
  for (const item of sessionOrders) {
    totalAmount += item.totalPrice; // ✅ totalPrice already includes quantity * (unitPrice + extras)
  }

  return totalAmount; // ✅ paise
}

export async function freezeBill(
  tableSessionId: string,
  discountPercentage: number = 0
): Promise<{
  subtotal: number;
  extrasTotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  gstRate: number;
  invoiceNumber: string;
}> {
  // 1. Validate session exists and is not cancelled
  const session = await db
    .select({
      id: tableSession.id,
      status: tableSession.status,
      restaurantId: tableSession.restaurantId,
    })
    .from(tableSession)
    .where(eq(tableSession.id, tableSessionId))
    .limit(1);

  if (session.length === 0) {
    throw new Error("Table session not found");
  }

  if (session[0].status === "cancelled") {
    throw new Error("Cannot bill a cancelled session");
  }

  // 2. Get restaurant's default GST rate
  const restaurant = await db
    .select({
      defaultGstPercentage: restaurants.defaultGstPercentage,
    })
    .from(restaurants)
    .where(eq(restaurants.id, session[0].restaurantId))
    .limit(1);

  if (restaurant.length === 0) {
    throw new Error("Restaurant not found");
  }

  const gstRate = Number(restaurant[0].defaultGstPercentage) || 0;

  // 3. Calculate subtotal from served order items (includes extras)
  const subtotal = await totalBillingAmount(tableSessionId);

  // 3.1 Calculate extras total separately
  const extrasTotalResult = await db
    .select({ total: sql<number>`sum(${orderItemExtras.totalPrice})` })
    .from(orderItemExtras)
    .leftJoin(orderItems, eq(orderItemExtras.orderItemId, orderItems.id))
    .where(
      and(
        eq(orderItems.tableSessionId, tableSessionId),
        eq(orderItems.status, "served")
      )
    );

  const extrasTotal = extrasTotalResult[0]?.total || 0;

  // 4. Get session discounts (vouchers, offers, loyalty)
  const sessionDiscountsData = await db
    .select()
    .from(sessionDiscounts)
    .where(eq(sessionDiscounts.sessionId, tableSessionId));

  const totalSessionDiscount = sessionDiscountsData.reduce((sum, d) => sum + d.discountValue, 0);

  // 6. Calculate GST on full subtotal (before discount)
  const gstAmount = calculateGST(subtotal, gstRate);

  // 7. Calculate discount amount (manual discount + session discounts)
  // NEW LOGIC: Percentage discount is calculated on the GRAND TOTAL (subtotal + GST)
  const grandTotalBeforeDiscount = subtotal + gstAmount;
  const manualDiscountAmount = Math.floor((grandTotalBeforeDiscount * discountPercentage) / 100);
  const discountAmount = manualDiscountAmount + totalSessionDiscount;

  // 8. Final amount = grand total - discount
  const taxableAmount = subtotal; // For record-keeping: taxable base = full subtotal
  const grandTotal = Math.max(0, grandTotalBeforeDiscount - discountAmount);

  // 8. Generate invoice number
  const invoiceNumber = `INV-${Date.now()}-${tableSessionId.slice(0, 8)}`;

  // 9. Update table session with frozen values
  await db
    .update(tableSession)
    .set({
      frozenSubtotal: subtotal,
      frozenExtrasTotal: extrasTotal,
      frozenDiscountAmount: discountAmount,
      frozenTaxableAmount: taxableAmount,
      frozenGstAmount: gstAmount,
      frozenGstRate: gstRate,
      grandTotal,
      finalBillAmount: grandTotal,
      paymentStatus: "payment_pending",
      status: "payment_pending",
      billedAt: new Date(),
      invoiceNumber,
    })
    .where(eq(tableSession.id, tableSessionId));

  return {
    subtotal,
    extrasTotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    grandTotal,
    gstRate,
    invoiceNumber,
  };
}

export async function finalAmount(
  tableSessionId: string,
  amount: number, // paise
  discountPercentage: number,
  taxRate: number
): Promise<number> {
  const session = await db
    .select()
    .from(tableSession)
    .where(eq(tableSession.id, tableSessionId))
    .limit(1);

  if (session.length === 0) {
    throw new Error("Table session not found");
  }

  if (session[0].status === "cancelled") {
    throw new Error("Cannot bill a cancelled session");
  }

  // GST on full amount (before discount)
  const taxAmount = calculateGST(amount, taxRate);
  const totalBeforeDiscount = amount + taxAmount;
  
  // NEW LOGIC: Percentage discount on the GRAND TOTAL
  const discountAmount = Math.floor((totalBeforeDiscount * discountPercentage) / 100);
  
  // Discount applied on grand total (amount + GST)
  const finalAmt = Math.max(0, totalBeforeDiscount - discountAmount);

  return finalAmt;
}

// Helper functions for billing calculations
export function calculateSubtotal(
  items: Array<{ unitPrice: number; quantity: number }>
): number {
  return items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
}

export function calculateDiscount(
  subtotal: number,
  discountPercentage: number
): number {
  // ✅ Calculate percentage: (amount * percentage) / 100
  // Using Math.floor to keep it an integer (paise)
  return Math.floor((subtotal * discountPercentage) / 100);
}

export function calculateTaxableBase(
  subtotal: number
): number {
  // NEW LOGIC: Taxable base for GST is now the full subtotal (before discount)
  return subtotal;
}

export function calculateGST(
  taxableBase: number,
  gstPercentage: number
): number {
  // ✅ Calculate percentage: (amount * percentage) / 100
  // Using Math.floor to keep it an integer (paise)
  return Math.floor((taxableBase * gstPercentage) / 100);
}

export function calculateGrandTotal(
  subtotal: number,
  taxAmount: number,
  discountAmount: number = 0
): number {
  // NEW LOGIC: (Subtotal + Tax) - Discount
  return Math.max(0, subtotal + taxAmount - discountAmount);
}

/**
 * Recalculates all applied offers for a session based on current items.
 * Updates the sessionDiscounts table with new values.
 * Returns the total recalculated discount amount.
 */
export async function recalculateSessionDiscounts(
  sessionId: string,
  subtotal: number,
  gstAmount: number
): Promise<number> {
  const grandTotalBeforeDiscount = subtotal + gstAmount;
  const gstRate = subtotal > 0 ? (gstAmount / subtotal) : 0;

  // 1. Get session discounts with offer details
  const appliedDiscounts = await db
    .select({
      sessionDiscountId: sessionDiscounts.id,
      offerId: offers.id,
      offerType: offers.offerType,
      discountValue: offers.discountValue,
      applicableCategoryId: offers.applicableCategoryId,
      minOrderValue: offers.minOrderValue,
      maxDiscountAmount: offers.maxDiscountAmount,
    })
    .from(sessionDiscounts)
    .innerJoin(offers, eq(sessionDiscounts.discountSourceId, offers.id))
    .where(eq(sessionDiscounts.sessionId, sessionId));

  if (appliedDiscounts.length === 0) return 0;

  // 2. Get order items with category info
  const items = await db
    .select({
      id: orderItems.id,
      menuItemId: orderItems.menuItemId,
      variantId: orderItems.menuItemVariantId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      categoryId: menuItems.categoryId,
    })
    .from(orderItems)
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(
      and(
        eq(orderItems.tableSessionId, sessionId), 
        ne(orderItems.status, "cancelled")
      )
    );

  let totalOfferDiscount = 0;

  for (const discount of appliedDiscounts) {
    let calculatedValue = 0;

    // Check min order value (on subtotal)
    if (subtotal < (discount.minOrderValue || 0)) {
      calculatedValue = 0;
    } else {
      switch (discount.offerType) {
        case "percentage":
          calculatedValue = Math.floor((grandTotalBeforeDiscount * (discount.discountValue || 0)) / 100);
          break;
        case "flat_discount":
          calculatedValue = (discount.discountValue || 0) * 100; // stored in rupees
          break;
        case "buy_1_get_1":
          // Collect all eligible item prices into a flat list based on their quantity
          // B1G1 applies across all items in the session (or restricted by category)
          const eligiblePrices: number[] = [];
          items.forEach(item => {
            // If offer has a category restriction, only include items from that category
            if (!discount.applicableCategoryId || item.categoryId === discount.applicableCategoryId) {
              for (let i = 0; i < item.quantity; i++) {
                eligiblePrices.push(item.unitPrice);
              }
            }
          });
          
          // Sort prices descending: [300, 250, 200, 150]
          eligiblePrices.sort((a, b) => b - a);
          
          let b1g1DiscountSubtotal = 0;
          // Every second item is free (the cheaper one of each pair)
          for (let i = 1; i < eligiblePrices.length; i += 2) {
            b1g1DiscountSubtotal += eligiblePrices[i];
          }
          
          // B1G1 is on subtotal items, but our discount applies to (Subtotal + Tax)
          // Add GST share to be consistent with fixed manual discount pattern
          calculatedValue = Math.floor(b1g1DiscountSubtotal * (1 + gstRate));
          break;
        case "category_discount":
          const categorySubtotal = items
            .filter(item => item.categoryId === discount.applicableCategoryId)
            .reduce((sum, item) => sum + item.totalPrice, 0);
          
          // Apply percentage to category total including its share of GST
          calculatedValue = Math.floor((categorySubtotal * (1 + gstRate)) * (discount.discountValue || 0) / 100);
          break;
        default:
          // Fallback to stored value if type is unknown but rule exists
          calculatedValue = 0;
      }
    }

    // Cap at max discount
    if (discount.maxDiscountAmount && calculatedValue > discount.maxDiscountAmount) {
      calculatedValue = discount.maxDiscountAmount;
    }

    // Update the session discount record
    await db
      .update(sessionDiscounts)
      .set({ discountValue: calculatedValue })
      .where(eq(sessionDiscounts.id, discount.sessionDiscountId));

    totalOfferDiscount += calculatedValue;
  }

  return totalOfferDiscount;
}
