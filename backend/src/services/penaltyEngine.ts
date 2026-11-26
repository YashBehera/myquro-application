import { and, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db/db.js";
import {
  deliveryRiders,
  merchantPenalties,
  orderDeliveries,
  restaurants,
  riderPenalties,
} from "../db/schema.js";
import { RiderPenaltyType } from "../db/schema/rider-penalties.js";
import { emitToOrder, emitToRestaurant } from "../lib/socket.js";

export type MerchantPenaltyType =
  | "unresponsive_cancellation"
  | "rider_wait_delay"
  | "late_merchant_cancellation"
  | "out_of_stock_cancellation"
  | "rush_cancellation"
  | "complaint_refund_fault";

// Configurable penalty rules in paise / minutes
export const PENALTY_CONFIG = {
  merchant: {
    unresponsiveAmountPaise: Number(process.env.MERCHANT_UNRESPONSIVE_PENALTY_PAISE || 5000),
    rushCancelAmountPaise: Number(process.env.MERCHANT_RUSH_PENALTY_PAISE || 5000),
    outOfStockAmountPaise: Number(process.env.MERCHANT_OOS_PENALTY_PAISE || 3500),
    lateCancelAmountPaise: Number(process.env.MERCHANT_LATE_CANCEL_PENALTY_PAISE || 7500),
    riderWaitFeePaise: Number(process.env.MERCHANT_RIDER_WAIT_PENALTY_PAISE || 3000),
    riderDispatchedCompPaise: Number(process.env.MERCHANT_DISPATCHED_COMP_PAISE || 3000),
    baseAutoPauseMinutes: Number(process.env.MERCHANT_BASE_PAUSE_MINUTES || 30),
    escalatedAutoPauseMinutes: Number(process.env.MERCHANT_ESCALATED_PAUSE_MINUTES || 60),
    riderWaitThresholdMinutes: Number(process.env.RIDER_WAIT_PENALTY_THRESHOLD_MINUTES || 12),
  },
  rider: {
    postAcceptCancelPaise: Number(process.env.RIDER_POST_ACCEPT_CANCEL_PAISE || 2500),
    arrivedStoreCancelPaise: Number(process.env.RIDER_ARRIVED_CANCEL_PAISE || 5000),
    repeatedTimeoutPaise: Number(process.env.RIDER_TIMEOUT_PENALTY_PAISE || 2000),
    deliveryDelayPaise: Number(process.env.RIDER_DELIVERY_DELAY_PAISE || 2500),
    postAcceptCooldownMinutes: Number(process.env.RIDER_POST_ACCEPT_COOLDOWN_MINUTES || 15),
    arrivedCooldownMinutes: Number(process.env.RIDER_ARRIVED_COOLDOWN_MINUTES || 30),
    timeoutCooldownMinutes: Number(process.env.RIDER_TIMEOUT_COOLDOWN_MINUTES || 10),
    maxConsecutiveTimeouts: Number(process.env.RIDER_MAX_CONSECUTIVE_TIMEOUTS || 3),
  },
} as const;

export function computeFaultPenaltyPaise(refundAmountPaise: number): number {
  const half = Math.round(Math.max(0, refundAmountPaise) * 0.5);
  return Math.min(10000, Math.max(2500, half));
}

/**
 * Releases any non-offered assigned/arrived rider on a cancelled order back to available
 * and optionally credits compensation to their walletBalance + totalEarnings.
 */
export async function compensateAndReleaseAssignedRider(params: {
  orderId: string;
  compensationPaise: number;
  reason: string;
}): Promise<{ riderId: string | null; compensationPaise: number }> {
  const { orderId, compensationPaise, reason } = params;
  const activeDeliveries = await db
    .select()
    .from(orderDeliveries)
    .where(
      and(
        eq(orderDeliveries.orderId, orderId),
        inArray(orderDeliveries.status, ["assigned", "arrived_at_store"])
      )
    );

  if (activeDeliveries.length === 0) {
    return { riderId: null, compensationPaise: 0 };
  }

  const del = activeDeliveries[0];
  const riderId = del.riderId;
  const compRupees = Math.round(compensationPaise) / 100;

  if (riderId) {
    if (compRupees > 0) {
      await db
        .update(deliveryRiders)
        .set({
          status: "available",
          walletBalance: sql`COALESCE(${deliveryRiders.walletBalance}, 0) + ${compRupees}`,
          totalEarnings: sql`COALESCE(${deliveryRiders.totalEarnings}, 0) + ${compRupees}`,
          updatedAt: new Date(),
        })
        .where(eq(deliveryRiders.id, riderId));
    } else {
      await db
        .update(deliveryRiders)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(deliveryRiders.id, riderId));
    }
  }

  await db.delete(orderDeliveries).where(eq(orderDeliveries.id, del.id));

  if (riderId && compensationPaise > 0) {
    emitToOrder(orderId, "rider-compensation", {
      orderId,
      riderId,
      compensationPaise,
      compensationRupees: compRupees,
      reason,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    riderId: riderId || null,
    compensationPaise: riderId ? compensationPaise : 0,
  };
}

/**
 * Applies an idempotent merchant penalty record, increments strikeCount if configured,
 * applies auto-pause (escalated on every 3rd strike), and credits rider compensation when applicable.
 */
export async function applyMerchantPenalty(params: {
  restaurantId: string;
  orderId?: string | null;
  penaltyType: MerchantPenaltyType;
  amountPaise: number;
  riderCompensationPaise?: number;
  strikeDelta?: number;
  pauseMinutes?: number;
  reason: string;
  targetRiderId?: string | null;
  releaseAssignedRider?: boolean;
}): Promise<{
  applied: boolean;
  penalty?: any;
  newStrikes?: number;
  autoPausedUntil?: Date | null;
  riderCompensationPaise: number;
}> {
  const {
    restaurantId,
    orderId,
    penaltyType,
    amountPaise,
    riderCompensationPaise = 0,
    strikeDelta = 1,
    pauseMinutes = 0,
    reason,
    targetRiderId,
    releaseAssignedRider = false,
  } = params;

  // Idempotency guard per (restaurantId, orderId, penaltyType)
  if (orderId) {
    const existing = await db
      .select()
      .from(merchantPenalties)
      .where(
        and(
          eq(merchantPenalties.restaurantId, restaurantId),
          eq(merchantPenalties.orderId, orderId),
          eq(merchantPenalties.penaltyType, penaltyType)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      return {
        applied: false,
        penalty: existing[0],
        riderCompensationPaise: existing[0].riderCompensationAmount || 0,
      };
    }
  }

  const now = new Date();
  let newStrikes: number | undefined;
  let pauseUntil: Date | null = null;

  if (strikeDelta > 0 || pauseMinutes > 0) {
    const [rest] = await db
      .select({
        strikeCount: restaurants.strikeCount,
        autoPausedUntil: restaurants.autoPausedUntil,
      })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    const currentStrikes = rest?.strikeCount || 0;
    newStrikes = currentStrikes + Math.max(0, strikeDelta);

    const effectivePauseMins =
      pauseMinutes > 0
        ? newStrikes > 0 && newStrikes % 3 === 0
          ? Math.max(pauseMinutes, PENALTY_CONFIG.merchant.escalatedAutoPauseMinutes)
          : pauseMinutes
        : newStrikes > 0 && strikeDelta > 0 && newStrikes % 3 === 0
        ? PENALTY_CONFIG.merchant.escalatedAutoPauseMinutes
        : 0;

    if (effectivePauseMins > 0) {
      const candidate = new Date(now.getTime() + effectivePauseMins * 60 * 1000);
      const existingPauseMs = rest?.autoPausedUntil ? new Date(rest.autoPausedUntil).getTime() : 0;
      pauseUntil = candidate.getTime() > existingPauseMs ? candidate : new Date(existingPauseMs);
    }

    await db
      .update(restaurants)
      .set({
        ...(strikeDelta > 0 ? { strikeCount: newStrikes } : {}),
        ...(pauseUntil ? { autoPausedUntil: pauseUntil } : {}),
        updatedAt: now,
      })
      .where(eq(restaurants.id, restaurantId));
  }

  // Credit rider wallet (once) and optionally release assigned/arrived rider back to available
  let creditedCompPaise = 0;
  if (releaseAssignedRider && orderId) {
    const released = await compensateAndReleaseAssignedRider({
      orderId,
      compensationPaise: riderCompensationPaise,
      reason,
    });
    creditedCompPaise = released.compensationPaise;
  } else if (riderCompensationPaise > 0 && targetRiderId) {
    const compRupees = Math.round(riderCompensationPaise) / 100;
    await db
      .update(deliveryRiders)
      .set({
        walletBalance: sql`COALESCE(${deliveryRiders.walletBalance}, 0) + ${compRupees}`,
        totalEarnings: sql`COALESCE(${deliveryRiders.totalEarnings}, 0) + ${compRupees}`,
        updatedAt: now,
      })
      .where(eq(deliveryRiders.id, targetRiderId));
    creditedCompPaise = riderCompensationPaise;
  } else if (riderCompensationPaise > 0 && !targetRiderId && orderId) {
    const [del] = await db
      .select({ riderId: orderDeliveries.riderId })
      .from(orderDeliveries)
      .where(eq(orderDeliveries.orderId, orderId))
      .limit(1);
    if (del?.riderId) {
      const compRupees = Math.round(riderCompensationPaise) / 100;
      await db
        .update(deliveryRiders)
        .set({
          walletBalance: sql`COALESCE(${deliveryRiders.walletBalance}, 0) + ${compRupees}`,
          totalEarnings: sql`COALESCE(${deliveryRiders.totalEarnings}, 0) + ${compRupees}`,
          updatedAt: now,
        })
        .where(eq(deliveryRiders.id, del.riderId));
      creditedCompPaise = riderCompensationPaise;
    }
  }

  const penaltyRow = {
    id: `mpen_${nanoid(10)}`,
    restaurantId,
    orderId: orderId || null,
    penaltyType,
    amount: Math.max(0, Math.round(amountPaise)),
    riderCompensationAmount: Math.max(0, Math.round(creditedCompPaise)),
    customerVoucherAmount: 0,
    status: "pending" as const,
    reason,
    createdAt: now,
  };

  await db.insert(merchantPenalties).values(penaltyRow);

  emitToRestaurant(restaurantId, "merchant-penalty", {
    penalty: penaltyRow,
    strikeCount: newStrikes,
    autoPausedUntil: pauseUntil ? pauseUntil.toISOString() : null,
  });

  return {
    applied: true,
    penalty: penaltyRow,
    newStrikes,
    autoPausedUntil: pauseUntil,
    riderCompensationPaise: creditedCompPaise,
  };
}

/**
 * Applies an idempotent rider penalty, deducts from rider walletBalance, increments strikeCount,
 * sets cooldown window when applicable, and moves rider offline if forceOffline is true.
 */
export async function applyRiderPenalty(params: {
  riderId: string;
  orderId?: string | null;
  complaintId?: string | null;
  penaltyType: RiderPenaltyType;
  amountPaise: number;
  cooldownMinutes?: number;
  strikeDelta?: number;
  forceOffline?: boolean;
  reason: string;
}): Promise<{
  applied: boolean;
  penalty?: any;
  walletBalance?: number;
  strikeCount?: number;
  cooldownUntil?: Date | null;
}> {
  const {
    riderId,
    orderId,
    complaintId,
    penaltyType,
    amountPaise,
    cooldownMinutes = 0,
    strikeDelta = 1,
    forceOffline = false,
    reason,
  } = params;

  // Idempotency guard per (riderId, orderId/complaintId, penaltyType)
  if (complaintId) {
    const existing = await db
      .select()
      .from(riderPenalties)
      .where(
        and(
          eq(riderPenalties.riderId, riderId),
          eq(riderPenalties.complaintId, complaintId),
          eq(riderPenalties.penaltyType, penaltyType)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      return { applied: false, penalty: existing[0] };
    }
  } else if (orderId && penaltyType !== "repeated_offer_timeout") {
    const existing = await db
      .select()
      .from(riderPenalties)
      .where(
        and(
          eq(riderPenalties.riderId, riderId),
          eq(riderPenalties.orderId, orderId),
          eq(riderPenalties.penaltyType, penaltyType)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      return { applied: false, penalty: existing[0] };
    }
  }

  const [rider] = await db
    .select({
      walletBalance: deliveryRiders.walletBalance,
      strikeCount: deliveryRiders.strikeCount,
      penaltyCooldownUntil: deliveryRiders.penaltyCooldownUntil,
    })
    .from(deliveryRiders)
    .where(eq(deliveryRiders.id, riderId))
    .limit(1);

  if (!rider) {
    return { applied: false };
  }

  const now = new Date();
  const deductRupees = Math.max(0, Math.round(amountPaise)) / 100;
  const newStrikes = (rider.strikeCount || 0) + Math.max(0, strikeDelta);

  // Double cooldown on every 3rd strike
  const effectiveCooldownMins =
    cooldownMinutes > 0
      ? newStrikes > 0 && newStrikes % 3 === 0
        ? cooldownMinutes * 2
        : cooldownMinutes
      : 0;

  let cooldownUntil: Date | null = null;
  if (effectiveCooldownMins > 0) {
    const candidate = new Date(now.getTime() + effectiveCooldownMins * 60 * 1000);
    const prevMs = rider.penaltyCooldownUntil ? new Date(rider.penaltyCooldownUntil).getTime() : 0;
    cooldownUntil = candidate.getTime() > prevMs ? candidate : new Date(prevMs);
  }

  const [updatedRider] = await db
    .update(deliveryRiders)
    .set({
      walletBalance: sql`COALESCE(${deliveryRiders.walletBalance}, 0) - ${deductRupees}`,
      ...(strikeDelta > 0 ? { strikeCount: newStrikes } : {}),
      ...(cooldownUntil ? { penaltyCooldownUntil: cooldownUntil } : {}),
      ...(forceOffline ? { status: "offline" } : {}),
      updatedAt: now,
    })
    .where(eq(deliveryRiders.id, riderId))
    .returning({
      walletBalance: deliveryRiders.walletBalance,
      strikeCount: deliveryRiders.strikeCount,
      penaltyCooldownUntil: deliveryRiders.penaltyCooldownUntil,
    });

  const penaltyRow = {
    id: `rpen_${nanoid(10)}`,
    riderId,
    orderId: orderId || null,
    complaintId: complaintId || null,
    penaltyType,
    amount: Math.max(0, Math.round(amountPaise)),
    cooldownMinutes: effectiveCooldownMins,
    status: "deducted" as const,
    reason,
    createdAt: now,
  };

  await db.insert(riderPenalties).values(penaltyRow);

  if (orderId) {
    emitToOrder(orderId, "rider-penalty", {
      penalty: penaltyRow,
      walletBalance: updatedRider?.walletBalance,
      strikeCount: updatedRider?.strikeCount,
      cooldownUntil: updatedRider?.penaltyCooldownUntil,
    });
  }

  return {
    applied: true,
    penalty: penaltyRow,
    walletBalance: Number(updatedRider?.walletBalance ?? 0),
    strikeCount: updatedRider?.strikeCount ?? newStrikes,
    cooldownUntil: updatedRider?.penaltyCooldownUntil ?? cooldownUntil,
  };
}
