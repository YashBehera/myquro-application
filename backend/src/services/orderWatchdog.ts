import { db } from "../db/db.js";
import {
  orders,
  restaurants,
  tableSession,
  payments,
  orderDeliveries,
  deliveryRiders,
  merchantPenalties,
  customerVouchers,
  complaints,
} from "../db/schema.js";
import { eq, and, or, ne, inArray, isNull, lte, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitToOrder, emitToRestaurant } from "../lib/socket.js";
import { orderCache } from "../lib/order-cache.js";
import { haversineDistance } from "../lib/delivery-simulation.js";
import { parseDeliveryCoordinates } from "../lib/serviceability.js";
import {
  applyMerchantPenalty,
  applyRiderPenalty,
  compensateAndReleaseAssignedRider,
  MerchantPenaltyType,
  PENALTY_CONFIG,
} from "./penaltyEngine.js";

export const ACCEPTANCE_WARNING_MS = Number(process.env.ORDER_ACCEPTANCE_WARNING_MS || 2 * 60 * 1000); // 2 mins
export const ACCEPTANCE_TIMEOUT_MS = Number(process.env.ORDER_ACCEPTANCE_TIMEOUT_MS || 5 * 60 * 1000); // 5 mins
export const RIDER_OFFER_EXPIRY_MS = Number(process.env.RIDER_OFFER_EXPIRY_MS || 90 * 1000); // 90 secs
export const NO_RIDER_DELAY_WARNING_MS = Number(process.env.NO_RIDER_DELAY_WARNING_MS || 10 * 60 * 1000); // 10 mins
export const MERCHANT_AUTO_PAUSE_MS = 30 * 60 * 1000; // 30 mins
export const APOLOGY_VOUCHER_AMOUNT_PAISE = 5000; // ₹50

let isWatchdogRunning = false;
let watchdogInterval: NodeJS.Timeout | null = null;
const warnedAcceptanceOrders = new Set<string>();
const warnedNoRiderOrders = new Set<string>();

function ensureArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Ensures an automatic refund ledger entry exists when a paid order is cancelled.
 * Idempotent: avoids creating duplicate refunds for the same tableSession.
 */
export async function ensureAutomaticOrderRefund(order: {
  id: string;
  restaurantId: string;
  tableSessionId?: string | null;
  placedByUserId?: string | null;
  grandTotal?: number | null;
  notes?: string | null;
}): Promise<{ refunded: boolean; refundAmountPaise: number; referenceNumber?: string }> {
  const sessionId = order.tableSessionId;
  if (!sessionId) {
    return { refunded: false, refundAmountPaise: 0 };
  }

  try {
    // Check if an automatic refund was already recorded for this session
    const existingRefunds = await db
      .select()
      .from(payments)
      .where(and(eq(payments.tableSessionId, sessionId), eq(payments.isRefund, true)))
      .limit(1);

    if (existingRefunds.length > 0) {
      return {
        refunded: true,
        refundAmountPaise: existingRefunds[0].amount,
        referenceNumber: existingRefunds[0].referenceNumber || undefined,
      };
    }

    const [sessionRow] = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    const paidRows = await db
      .select()
      .from(payments)
      .where(and(eq(payments.tableSessionId, sessionId), eq(payments.status, "success")));

    let isCodOrder = false;
    let parsedPaymentMethod: "upi" | "card" | "bank" | "cash" | "gateway" = "gateway";
    if (order.notes && order.notes.startsWith("{")) {
      try {
        const parsed = JSON.parse(order.notes);
        if (parsed.paymentMethod) {
          const pm = String(parsed.paymentMethod).toLowerCase();
          if (pm.includes("cod") || pm === "cash") {
            isCodOrder = true;
            parsedPaymentMethod = "cash";
          } else if (pm.includes("card")) {
            parsedPaymentMethod = "card";
          } else if (pm.includes("bank") || pm.includes("net")) {
            parsedPaymentMethod = "bank";
          } else if (pm.includes("upi")) {
            parsedPaymentMethod = "upi";
          }
        }
      } catch {}
    }

    const paidTotal = paidRows.reduce((acc, p) => acc + (p.isRefund ? 0 : p.amount), 0);
    const shouldRefund =
      paidTotal > 0 ||
      sessionRow?.paymentStatus === "paid" ||
      (!isCodOrder && Number(order.grandTotal || 0) > 0 && Boolean(order.notes?.includes("paymentMethod")));

    if (!shouldRefund) {
      await db
        .update(tableSession)
        .set({ status: "cancelled" })
        .where(eq(tableSession.id, sessionId));
      return { refunded: false, refundAmountPaise: 0 };
    }

    const refundAmount = paidTotal > 0 ? paidTotal : Number(order.grandTotal || sessionRow?.grandTotal || 0);
    if (refundAmount <= 0) {
      return { refunded: false, refundAmountPaise: 0 };
    }

    let referenceNumber = `AUTO-REF-${order.id.slice(-6).toUpperCase()}`;
    const originalGatewayRef = paidRows.find((p) => p.referenceNumber && p.referenceNumber.startsWith("pay_"))?.referenceNumber;
    const rzpKey = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;

    if (originalGatewayRef && rzpKey && rzpSecret) {
      try {
        const authHeader = Buffer.from(`${rzpKey}:${rzpSecret}`).toString("base64");
        const gatewayAmountPaise = refundAmount >= 100 ? refundAmount : Math.round(refundAmount * 100);
        const rzpResp = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(originalGatewayRef)}/refund`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: gatewayAmountPaise,
            notes: { orderId: order.id, reason: "automatic_refund" },
          }),
        });
        if (rzpResp.ok) {
          const rzpData: any = await rzpResp.json();
          if (rzpData?.id) {
            referenceNumber = rzpData.id;
          }
        } else {
          console.error(`⚠️ Razorpay refund API failed for ${originalGatewayRef}: HTTP ${rzpResp.status}`);
        }
      } catch (gwErr) {
        console.error("⚠️ Razorpay refund dispatch error:", gwErr);
      }
    }

    await db.insert(payments).values({
      id: nanoid(),
      tableSessionId: sessionId,
      restaurantId: order.restaurantId,
      amount: refundAmount,
      method: (paidRows[0]?.method || parsedPaymentMethod) as any,
      status: "refunded",
      referenceNumber,
      paidByUserId: order.placedByUserId || paidRows[0]?.paidByUserId || null,
      isRefund: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db
      .update(tableSession)
      .set({ status: "cancelled" })
      .where(eq(tableSession.id, sessionId));

    return { refunded: true, refundAmountPaise: refundAmount, referenceNumber };
  } catch (err) {
    console.warn("⚠️ Error recording auto-refund:", err);
    return { refunded: false, refundAmountPaise: 0 };
  }
}

async function issueAutoCompensationVoucher(order: {
  id: string;
  restaurantId: string;
  placedByUserId?: string | null;
}): Promise<string | null> {
  if (!order.placedByUserId) return null;
  const code = `CARE50-${order.id.slice(-5).toUpperCase()}`;
  try {
    const existing = await db
      .select({ code: customerVouchers.code })
      .from(customerVouchers)
      .where(eq(customerVouchers.code, code))
      .limit(1);
    if (existing.length > 0) return existing[0].code;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(customerVouchers).values({
      id: `vch_${nanoid(10)}`,
      code,
      userId: order.placedByUserId,
      restaurantId: order.restaurantId,
      voucherType: "fixed_amount",
      discountValue: APOLOGY_VOUCHER_AMOUNT_PAISE,
      minOrderValue: 14900,
      status: "active",
      issuedAt: new Date(),
      expiresAt,
      createdAt: new Date(),
    });
    return code;
  } catch (err) {
    console.warn("⚠️ Could not issue compensation voucher:", err);
    return null;
  }
}

async function resolveOpenComplaintsForAutoCancelledOrder(params: {
  orderId: string;
  restaurantId: string;
  refundReference?: string;
  refundAmountPaise: number;
  voucherCode?: string | null;
  reasonMessage: string;
}) {
  try {
    const openTickets = await db
      .select()
      .from(complaints)
      .where(
        and(
          eq(complaints.orderId, params.orderId),
          inArray(complaints.status, ["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER"])
        )
      );

    if (openTickets.length === 0) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const refundRupees = Math.round(params.refundAmountPaise / 100);
    const voucherNote = params.voucherCode ? ` Courtesy voucher ${params.voucherCode} (₹50 OFF) added to your account.` : "";
    const refundNote = params.refundAmountPaise > 0
      ? `100% automatic refund (₹${refundRupees}, Ref: ${params.refundReference || "AUTO"}) has been initiated to your original payment method.`
      : "No charge was captured or any pending hold has been released automatically.";

    const fullReply = `${params.reasonMessage} ${refundNote}${voucherNote}`;

    for (const ticket of openTickets) {
      const msgs = ensureArray(ticket.messages);
      const logs = ensureArray(ticket.auditLogs);
      const supportMsg = {
        id: `msg-${nanoid(6)}`,
        complaintId: ticket.id,
        senderId: "MYQURO_SUPPORT",
        senderName: "MyQuro Automated Care",
        senderType: "MYQURO_SUPPORT",
        message: fullReply,
        timestamp: nowIso,
      };
      const resolution = {
        id: `res-${nanoid(6)}`,
        resolutionType: params.refundAmountPaise > 0 ? "REFUND" : "COMPENSATION",
        ...(params.refundAmountPaise > 0 ? { refundAmount: refundRupees } : {}),
        ...(params.voucherCode ? { compensationCode: params.voucherCode } : {}),
        actionTaken: "Order automatically cancelled & resolved by MyQuro SLA Watchdog",
        note: fullReply,
        resolvedBy: "MyQuro Autonomous SLA Watchdog",
        resolvedAt: nowIso,
        customerAccepted: true,
      };
      const logEntry = {
        id: `aud-${nanoid(6)}`,
        complaintId: ticket.id,
        user: "MyQuro SLA Watchdog",
        action: "Auto-Resolved via Autonomous Order Watchdog",
        timestamp: nowIso,
        previousStatus: ticket.status,
        newStatus: "RESOLVED",
        notes: fullReply,
      };

      const updatedPayload = {
        status: "RESOLVED",
        refundStatus: params.refundAmountPaise > 0 ? "COMPLETED" : "NOT_REQUESTED",
        messages: [...msgs, supportMsg],
        resolution,
        auditLogs: [...logs, logEntry],
        firstResponseAt: ticket.firstResponseAt || now,
        resolvedAt: now,
        updatedAt: now,
      };

      await db.update(complaints).set(updatedPayload).where(eq(complaints.id, ticket.id));

      const mergedRecord = { ...ticket, ...updatedPayload };
      emitToRestaurant(params.restaurantId, "complaint-resolved", mergedRecord);
      emitToOrder(params.orderId, "complaint-resolved", mergedRecord);
    }
  } catch (err) {
    console.warn("⚠️ Error auto-resolving open complaints:", err);
  }
}

/**
 * Cancels an unaccepted or failed order atomically, refunds the customer, issues
 * compensation voucher when warranted, pauses an unresponsive restaurant, and resolves
 * related customer complaints without human intervention.
 */
export async function cancelOrderAutonomously(params: {
  order: any;
  cancelledBy: "system" | "customer" | "merchant";
  reason: string;
  details?: string;
  applyMerchantPenalty?: boolean;
  merchantPenaltyType?: MerchantPenaltyType;
  merchantPenaltyAmountPaise?: number;
  merchantPauseMinutes?: number;
  riderCompensationPaise?: number;
  issueCompensationVoucher?: boolean;
}): Promise<{
  cancelled: boolean;
  refunded: boolean;
  refundAmountPaise: number;
  refundReference?: string;
  voucherCode?: string | null;
  isAutoPaused?: boolean;
  penaltyApplied?: any;
  riderCompensationPaise?: number;
}> {
  const {
    order,
    cancelledBy,
    reason,
    details,
    applyMerchantPenalty: shouldPenalizeMerchant,
    merchantPenaltyType = "unresponsive_cancellation",
    merchantPenaltyAmountPaise = PENALTY_CONFIG.merchant.unresponsiveAmountPaise,
    merchantPauseMinutes,
    riderCompensationPaise = 0,
    issueCompensationVoucher,
  } = params;
  const now = new Date();
  const allowedSourceStatuses =
    cancelledBy === "system"
      ? (["placed"] as const)
      : (["placed", "preparing", "ready"] as const);

  // Atomic guard: transition only once
  const updatedRows = await db
    .update(orders)
    .set({
      status: "cancelled",
      cancelledBy,
      cancellationReason: reason,
      updatedAt: now,
    })
    .where(and(eq(orders.id, order.id), inArray(orders.status, allowedSourceStatuses)))
    .returning();

  if (updatedRows.length === 0) {
    return { cancelled: false, refunded: false, refundAmountPaise: 0 };
  }

  // Clean up unaccepted rider offers for this order
  try {
    await db
      .delete(orderDeliveries)
      .where(and(eq(orderDeliveries.orderId, order.id), eq(orderDeliveries.status, "offered")));
  } catch {}

  const refundResult = await ensureAutomaticOrderRefund(order);

  // Only issue voucher + active merchant pause for fresh SLA failures (within last 35 mins)
  const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();
  const isFreshSlaTimeout = orderAgeMs <= 35 * 60 * 1000;

  const voucherCode =
    issueCompensationVoucher && isFreshSlaTimeout
      ? await issueAutoCompensationVoucher(order)
      : null;

  let isAutoPaused = false;
  let appliedPenaltyResult: any = null;
  let creditedRiderCompPaise = 0;

  const shouldApplyMerchantPenalty =
    shouldPenalizeMerchant && (cancelledBy !== "system" || isFreshSlaTimeout);

  if (shouldApplyMerchantPenalty) {
    try {
      const effectivePauseMins =
        merchantPauseMinutes !== undefined
          ? merchantPauseMinutes
          : merchantPenaltyType === "unresponsive_cancellation" || merchantPenaltyType === "rush_cancellation"
          ? PENALTY_CONFIG.merchant.baseAutoPauseMinutes
          : 0;

      const penRes = await applyMerchantPenalty({
        restaurantId: order.restaurantId,
        orderId: order.id,
        penaltyType: merchantPenaltyType,
        amountPaise: merchantPenaltyAmountPaise,
        riderCompensationPaise,
        strikeDelta: 1,
        pauseMinutes: effectivePauseMins,
        releaseAssignedRider: true,
        reason: details || `Cancellation (${reason}) triggered automated SLA penalty.`,
      });
      appliedPenaltyResult = penRes.penalty || null;
      creditedRiderCompPaise = penRes.riderCompensationPaise;
      isAutoPaused = Boolean(penRes.autoPausedUntil && penRes.autoPausedUntil.getTime() > Date.now());
    } catch (penErr) {
      console.warn("⚠️ Could not apply merchant penalty:", penErr);
      const released = await compensateAndReleaseAssignedRider({
        orderId: order.id,
        compensationPaise: 0,
        reason: details || reason,
      }).catch(() => ({ compensationPaise: 0 }));
      creditedRiderCompPaise = released.compensationPaise;
    }
  } else {
    // Release any assigned/arrived rider back to available so they are never stuck busy
    const released = await compensateAndReleaseAssignedRider({
      orderId: order.id,
      compensationPaise: riderCompensationPaise,
      reason: details || reason,
    }).catch(() => ({ compensationPaise: 0 }));
    creditedRiderCompPaise = released.compensationPaise;
  }

  const customerFacingMessage =
    cancelledBy === "system"
      ? `Your order was automatically cancelled because the restaurant did not confirm within 5 minutes.`
      : `Your order has been cancelled (${reason}).`;

  await resolveOpenComplaintsForAutoCancelledOrder({
    orderId: order.id,
    restaurantId: order.restaurantId,
    refundReference: refundResult.referenceNumber,
    refundAmountPaise: refundResult.refundAmountPaise,
    voucherCode,
    reasonMessage: customerFacingMessage,
  });

  orderCache.invalidate(order.restaurantId);
  warnedAcceptanceOrders.delete(order.id);
  warnedNoRiderOrders.delete(order.id);

  const refundText = refundResult.refunded
    ? `100% refund (₹${Math.round(refundResult.refundAmountPaise / 100)}) initiated automatically (Ref: ${refundResult.referenceNumber}).${voucherCode ? ` Apology voucher ${voucherCode} added!` : ""}`
    : voucherCode
    ? `Order cancelled automatically. Apology voucher ${voucherCode} added to your account.`
    : "Order cancelled with no charge captured.";

  const payload = {
    orderId: order.id,
    status: "cancelled",
    cancelledBy,
    reason,
    details: details || customerFacingMessage,
    isAutoPaused,
    autoCancelled: cancelledBy === "system",
    refundInitiated: refundResult.refunded,
    refundAmountPaise: refundResult.refundAmountPaise,
    refundReference: refundResult.referenceNumber,
    voucherCode,
    refundMessage: refundText,
    updatedAt: now.toISOString(),
  };

  emitToOrder(order.id, "order-status", payload);
  emitToOrder(order.id, "order-status-update", payload);
  emitToOrder(order.id, "order-cancelled", payload);
  emitToOrder(order.id, "order-update", { ...payload, order: updatedRows[0] });
  emitToRestaurant(order.restaurantId, "order-cancelled", payload);
  if (cancelledBy === "system") {
    emitToRestaurant(order.restaurantId, "order-auto-cancelled", payload);
  }

  return {
    cancelled: true,
    refunded: refundResult.refunded,
    refundAmountPaise: refundResult.refundAmountPaise,
    refundReference: refundResult.referenceNumber,
    voucherCode,
    isAutoPaused,
    penaltyApplied: appliedPenaltyResult,
    riderCompensationPaise: creditedRiderCompPaise,
  };
}

/**
 * Evaluates a single order right now against autonomous SLA rules (called on demand by
 * support/tracking endpoints and periodically by the background watchdog).
 */
export async function evaluateOrderAutonomously(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const ageMs = Date.now() - new Date(order.createdAt).getTime();

  // Delivery order stuck unaccepted by restaurant past 5 minutes -> auto-cancel + refund
  if (
    order.status === "placed" &&
    !order.tableId &&
    !order.acknowledgedByMerchant &&
    ageMs >= ACCEPTANCE_TIMEOUT_MS
  ) {
    return await cancelOrderAutonomously({
      order,
      cancelledBy: "system",
      reason: "restaurant_unresponsive_timeout",
      details: "Auto-cancelled: Restaurant did not accept within 5 minutes.",
      applyMerchantPenalty: true,
      issueCompensationVoucher: false,
    });
  }

  return { checked: true, status: order.status, ageMs };
}

/**
 * Background tick checking restaurant pauses/snoozes, unaccepted orders (2m warn / 5m auto-cancel),
 * and stale unaccepted rider offers (>90s).
 */
export async function runWatchdogTick() {
  if (isWatchdogRunning) return;
  isWatchdogRunning = true;

  try {
    const now = new Date();

    // 1. Auto-unsnooze / unpause restaurants & clear expired rider cooldowns
    await db
      .update(restaurants)
      .set({ isOpen: true, snoozedUntil: null, snoozeReason: null, updatedAt: now })
      .where(lte(restaurants.snoozedUntil, now));

    await db
      .update(restaurants)
      .set({ autoPausedUntil: null, updatedAt: now })
      .where(lte(restaurants.autoPausedUntil, now));

    await db
      .update(deliveryRiders)
      .set({ penaltyCooldownUntil: null, updatedAt: now })
      .where(lte(deliveryRiders.penaltyCooldownUntil, now));

    // 2. Monitor unaccepted online delivery orders in "placed" state
    const unacceptedOrders = await db
      .select({
        id: orders.id,
        restaurantId: orders.restaurantId,
        tableSessionId: orders.tableSessionId,
        tableId: orders.tableId,
        placedByUserId: orders.placedByUserId,
        notes: orders.notes,
        status: orders.status,
        grandTotal: orders.grandTotal,
        acknowledgedByMerchant: orders.acknowledgedByMerchant,
        createdAt: orders.createdAt,
        restaurantName: restaurants.restaurantName,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(
        and(
          eq(orders.status, "placed"),
          isNull(orders.tableId),
          eq(orders.acknowledgedByMerchant, false)
        )
      );

    for (const ord of unacceptedOrders) {
      const ageMs = now.getTime() - new Date(ord.createdAt).getTime();

      if (ageMs >= ACCEPTANCE_TIMEOUT_MS) {
        console.log(`⏱️ [Watchdog] Order ${ord.id} unaccepted for ${Math.round(ageMs / 1000)}s — auto-cancelling with refund.`);
        await cancelOrderAutonomously({
          order: ord,
          cancelledBy: "system",
          reason: "restaurant_unresponsive_timeout",
          details: "Auto-cancelled: Restaurant did not accept within 5 minutes.",
          applyMerchantPenalty: true,
          issueCompensationVoucher: false,
        });
      } else if (ageMs >= ACCEPTANCE_WARNING_MS && !warnedAcceptanceOrders.has(ord.id)) {
        warnedAcceptanceOrders.add(ord.id);
        const remainingSecs = Math.max(0, Math.ceil((ACCEPTANCE_TIMEOUT_MS - ageMs) / 1000));
        emitToRestaurant(ord.restaurantId, "order-acceptance-warning", {
          orderId: ord.id,
          secondsRemaining: remainingSecs,
          message: `Urgent: Customer has been waiting ${Math.floor(ageMs / 60000)}m+. Accept within ${remainingSecs}s to avoid auto-cancellation and penalty.`,
        });
        emitToOrder(ord.id, "order-sla-update", {
          orderId: ord.id,
          phase: "AWAITING_ACCEPTANCE",
          secondsRemaining: remainingSecs,
          autoCancelAt: new Date(new Date(ord.createdAt).getTime() + ACCEPTANCE_TIMEOUT_MS).toISOString(),
          message: `Following up urgently with ${ord.restaurantName || "restaurant"} to confirm your order.`,
        });
      }
    }

    // 3. Rotate stale rider offers (> 90s unaccepted or offered to an offline rider)
    const expiryCutoff = new Date(now.getTime() - RIDER_OFFER_EXPIRY_MS);
    const staleOffers = await db
      .select({
        deliveryId: orderDeliveries.id,
        orderId: orderDeliveries.orderId,
        riderId: orderDeliveries.riderId,
        riderStatus: deliveryRiders.status,
        createdAt: orderDeliveries.createdAt,
      })
      .from(orderDeliveries)
      .leftJoin(deliveryRiders, eq(orderDeliveries.riderId, deliveryRiders.id))
      .where(
        and(
          eq(orderDeliveries.status, "offered"),
          or(
            lte(orderDeliveries.updatedAt, expiryCutoff),
            ne(deliveryRiders.status, "available")
          )
        )
      );

    for (const stale of staleOffers) {
      await db.delete(orderDeliveries).where(eq(orderDeliveries.id, stale.deliveryId));
      console.log(`🔄 [Watchdog] Cleared stale rider offer ${stale.deliveryId} for Order ${stale.orderId}`);

      // Track ignored offers only when rider stayed online ('available') and timed out past 90s
      if (stale.riderId && stale.riderStatus === "available") {
        try {
          const [updatedRider] = await db
            .update(deliveryRiders)
            .set({
              rejectionCount: sql`COALESCE(${deliveryRiders.rejectionCount}, 0) + 1`,
              consecutiveOfferTimeouts: sql`COALESCE(${deliveryRiders.consecutiveOfferTimeouts}, 0) + 1`,
              updatedAt: now,
            })
            .where(eq(deliveryRiders.id, stale.riderId))
            .returning({
              consecutiveOfferTimeouts: deliveryRiders.consecutiveOfferTimeouts,
            });

          if (
            updatedRider &&
            updatedRider.consecutiveOfferTimeouts >= PENALTY_CONFIG.rider.maxConsecutiveTimeouts
          ) {
            await db
              .update(deliveryRiders)
              .set({ consecutiveOfferTimeouts: 0, updatedAt: now })
              .where(eq(deliveryRiders.id, stale.riderId));

            await applyRiderPenalty({
              riderId: stale.riderId,
              orderId: stale.orderId,
              penaltyType: "repeated_offer_timeout",
              amountPaise: PENALTY_CONFIG.rider.repeatedTimeoutPaise,
              cooldownMinutes: PENALTY_CONFIG.rider.timeoutCooldownMinutes,
              strikeDelta: 1,
              forceOffline: true,
              reason: `Ignored ${PENALTY_CONFIG.rider.maxConsecutiveTimeouts} consecutive delivery offers without accepting or declining.`,
            });
          }
        } catch (timeoutErr) {
          console.warn("⚠️ Error recording rider offer timeout strike:", timeoutErr);
        }
      }
    }

    // 4. Warn when a ready delivery order has been waiting > 10 mins with no assigned rider
    const delayCutoff = new Date(now.getTime() - NO_RIDER_DELAY_WARNING_MS);
    const delayedReadyOrders = await db
      .select({
        id: orders.id,
        restaurantId: orders.restaurantId,
        notes: orders.notes,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(orderDeliveries, eq(orders.id, orderDeliveries.orderId))
      .where(
        and(
          eq(orders.status, "ready"),
          isNull(orders.tableId),
          lt(orders.updatedAt, delayCutoff),
          or(isNull(orderDeliveries.id), eq(orderDeliveries.status, "offered"))
        )
      );

    for (const delOrd of delayedReadyOrders) {
      if (warnedNoRiderOrders.has(delOrd.id)) continue;
      warnedNoRiderOrders.add(delOrd.id);
      const parsed = parseDeliveryCoordinates(delOrd.notes);
      emitToOrder(delOrd.id, "order-sla-update", {
        orderId: delOrd.id,
        phase: "NO_RIDER_DELAY",
        hasCoordinates: Boolean(parsed.latitude && parsed.longitude),
        message: "High rider demand near your restaurant right now. Our dispatch team is actively assigning the nearest available partner.",
      });
      emitToRestaurant(delOrd.restaurantId, "rider-search-delayed", {
        orderId: delOrd.id,
        message: "Searching wider radius for an available delivery partner.",
      });
    }

    // 5. Penalize excessive kitchen hold when a rider has already arrived at store ('arrived_at_store')
    const waitThresholdMs = PENALTY_CONFIG.merchant.riderWaitThresholdMinutes * 60 * 1000;
    const waitCutoff = new Date(now.getTime() - waitThresholdMs);
    const waitingAtStore = await db
      .select({
        orderId: orders.id,
        restaurantId: orders.restaurantId,
        prepTimeMinutes: orders.prepTimeMinutes,
        extendedPrepMinutes: orders.extendedPrepMinutes,
        acknowledgedAt: orders.acknowledgedAt,
        riderId: orderDeliveries.riderId,
        deliveryUpdatedAt: orderDeliveries.updatedAt,
      })
      .from(orderDeliveries)
      .innerJoin(orders, eq(orderDeliveries.orderId, orders.id))
      .where(
        and(
          eq(orderDeliveries.status, "arrived_at_store"),
          eq(orders.status, "preparing"),
          isNull(orders.tableId),
          lte(orderDeliveries.updatedAt, waitCutoff)
        )
      );

    for (const row of waitingAtStore) {
      const arrivedWaitMs = now.getTime() - new Date(row.deliveryUpdatedAt).getTime();
      const promisedPrepMs =
        ((Number(row.prepTimeMinutes) || 20) + (Number(row.extendedPrepMinutes) || 0) + 10) * 60 * 1000;
      const kitchenElapsedMs = row.acknowledgedAt
        ? now.getTime() - new Date(row.acknowledgedAt).getTime()
        : arrivedWaitMs;

      if (kitchenElapsedMs >= promisedPrepMs || arrivedWaitMs >= 15 * 60 * 1000) {
        await applyMerchantPenalty({
          restaurantId: row.restaurantId,
          orderId: row.orderId,
          penaltyType: "rider_wait_delay",
          amountPaise: PENALTY_CONFIG.merchant.riderWaitFeePaise,
          riderCompensationPaise: PENALTY_CONFIG.merchant.riderWaitFeePaise,
          strikeDelta: 0,
          pauseMinutes: 0,
          targetRiderId: row.riderId,
          releaseAssignedRider: false,
          reason: `Delivery partner waited ${Math.round(arrivedWaitMs / 60000)}m at outlet past preparation time.`,
        });
      }
    }
  } catch (err) {
    console.error("❌ [Watchdog] Tick error:", err);
  } finally {
    isWatchdogRunning = false;
  }
}

/**
 * Autonomous rule engine invoked immediately when a customer opens/updates a complaint.
 * Resolves unresponsive/delayed-order support requests without human intervention.
 */
export async function runAutonomousComplaintRules(complaintRecord: any): Promise<any> {
  if (!complaintRecord?.orderId || complaintRecord.ticketType !== "order_complaint") {
    return complaintRecord;
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, complaintRecord.orderId))
    .limit(1);

  if (!order) return complaintRecord;

  const [rest] = await db
    .select({ restaurantName: restaurants.restaurantName })
    .from(restaurants)
    .where(eq(restaurants.id, order.restaurantId))
    .limit(1);

  const restaurantName = rest?.restaurantName || complaintRecord.outletName || "the restaurant";
  const ageMs = Date.now() - new Date(order.createdAt).getTime();

  // Case A: Restaurant never accepted within 5 mins -> Auto-cancel + refund + Resolve ticket now
  if (
    order.status === "placed" &&
    !order.tableId &&
    !order.acknowledgedByMerchant &&
    ageMs >= ACCEPTANCE_TIMEOUT_MS
  ) {
    await cancelOrderAutonomously({
      order,
      cancelledBy: "system",
      reason: "restaurant_unresponsive_timeout",
      details: "Auto-cancelled upon SLA breach (5+ mins unaccepted).",
      applyMerchantPenalty: true,
      issueCompensationVoucher: false,
    });

    const [refreshed] = await db
      .select()
      .from(complaints)
      .where(eq(complaints.id, complaintRecord.id))
      .limit(1);
    return refreshed || complaintRecord;
  }

  // Case B: Customer complaining while order is still awaiting acceptance (< 5 mins)
  const now = new Date();
  const nowIso = now.toISOString();
  let autoReplyText: string | null = null;
  let shouldResolveTicket = false;

  if (order.status === "placed" && !order.tableId && !order.acknowledgedByMerchant) {
    const remainingSecs = Math.max(0, Math.ceil((ACCEPTANCE_TIMEOUT_MS - ageMs) / 1000));
    emitToRestaurant(order.restaurantId, "order-acceptance-warning", {
      orderId: order.id,
      secondsRemaining: remainingSecs,
      message: `Customer contacted support while waiting! Accept within ${remainingSecs}s or order auto-cancels with penalty.`,
    });
    autoReplyText = `We have alerted ${restaurantName} urgently to confirm your order. If the kitchen cannot respond within ${remainingSecs} seconds, the order will automatically close with a full refund—no manual follow-up needed.`;
  } else if (order.status === "cancelled") {
    const refund = await ensureAutomaticOrderRefund(order);
    const refundInfo = refund.refunded
      ? `100% refund of ₹${Math.round(refund.refundAmountPaise / 100)} (Ref: ${refund.referenceNumber}) is active.`
      : "No amount was charged (or pending authorization released).";
    autoReplyText = `This order was cancelled (${order.cancellationReason || "cancelled"}). ${refundInfo}`;
    const lowerReason = `${complaintRecord.reason || ""} ${complaintRecord.description || ""}`.toLowerCase();
    if (lowerReason.includes("not receive") || lowerReason.includes("delay") || lowerReason.includes("accept")) {
      shouldResolveTicket = true;
    }
  } else if ((order.status === "preparing" || order.status === "ready") && !order.tableId) {
    const [del] = await db
      .select()
      .from(orderDeliveries)
      .where(eq(orderDeliveries.orderId, order.id))
      .limit(1);

    if (!del || del.status === "offered") {
      autoReplyText = `${restaurantName} is currently preparing/holding your order (${order.status}). Our dispatch engine is actively broadcasting to nearby delivery partners.`;
    } else if (del.status === "assigned" || del.status === "arrived_at_store") {
      autoReplyText = `A delivery partner is already assigned (status: ${del.status.replace(/_/g, " ")}) with an estimated ${del.etaMinutes || 20} mins delivery window.`;
    }
  }

  if (!autoReplyText) return complaintRecord;

  const currentMessages = ensureArray(complaintRecord.messages);
  const supportMsg = {
    id: `msg-${nanoid(6)}`,
    complaintId: complaintRecord.id,
    senderId: "MYQURO_SUPPORT",
    senderName: "MyQuro Automated Care",
    senderType: "MYQURO_SUPPORT",
    message: autoReplyText,
    timestamp: nowIso,
  };

  const updateData: any = {
    messages: [...currentMessages, supportMsg],
    firstResponseAt: complaintRecord.firstResponseAt || now,
    status: shouldResolveTicket ? "RESOLVED" : "IN_PROGRESS",
    updatedAt: now,
    ...(shouldResolveTicket
      ? {
          resolvedAt: now,
          refundStatus: "COMPLETED",
        }
      : {}),
  };

  await db.update(complaints).set(updateData).where(eq(complaints.id, complaintRecord.id));
  const updated = { ...complaintRecord, ...updateData };
  emitToOrder(order.id, "complaint-message", { complaintId: complaintRecord.id, message: supportMsg, complaint: updated });
  if (complaintRecord.outletId) {
    emitToRestaurant(complaintRecord.outletId, "complaint-message", { complaintId: complaintRecord.id, message: supportMsg, complaint: updated });
  }
  return updated;
}

export function startOrderWatchdog(intervalMs = 30_000) {
  if (watchdogInterval) return;
  console.log("🛡️ [Watchdog] Autonomous Order SLA Watchdog started (interval:", intervalMs, "ms)");
  // Run initial sweep shortly after startup, then periodically
  setTimeout(() => {
    runWatchdogTick().catch((err) => console.warn("⚠️ Watchdog startup sweep error:", err));
  }, 4000);
  watchdogInterval = setInterval(() => {
    runWatchdogTick().catch((err) => console.warn("⚠️ Watchdog tick error:", err));
  }, intervalMs);
}

export function stopOrderWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
  }
}

export { haversineDistance };
