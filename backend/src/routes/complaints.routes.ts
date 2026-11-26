import express from "express";
import { db } from "../db/db.js";
import {
  complaints,
  orders,
  restaurants,
  orderDeliveries,
  deliveryRiders,
  profiles,
  authUsers,
} from "../db/schema.js";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitToRestaurant, emitToOrder } from "../lib/socket.js";
import { runAutonomousComplaintRules } from "../services/orderWatchdog.js";
import {
  applyMerchantPenalty,
  applyRiderPenalty,
  computeFaultPenaltyPaise,
} from "../services/penaltyEngine.js";

const router = express.Router();

// Helper to sanitize array of JSON items
const ensureArray = <T>(val: any): T[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
};

// 1. POST /api/complaints - Create Complaint or Ticket
router.post("/", async (req, res) => {
  try {
    const {
      ticketType = "order_complaint",
      orderId,
      orderNumber,
      customerId: rawCustomerId,
      customerName: rawCustomerName,
      customerPhone: rawCustomerPhone,
      customerAvatar,
      outletId: rawOutletId,
      outletName: rawOutletName,
      riderId: rawRiderId,
      category = "FOOD_QUALITY",
      categoryLabel,
      reason,
      description,
      relatedItem,
      orderAmount: rawOrderAmount,
      priority = "MEDIUM",
      evidence = [],
      initialMessage,
      metadata = {},
    } = req.body;

    if (!reason || !description) {
      return res.status(400).json({ error: "Reason and description are required" });
    }

    let customerId: string | null = rawCustomerId || null;
    let customerName: string | null = rawCustomerName || null;
    let customerPhone: string | null = rawCustomerPhone || null;
    let outletId: string | null = rawOutletId || null;
    let outletName: string | null = rawOutletName || null;
    let riderId: string | null = rawRiderId || null;
    let finalOrderAmount = rawOrderAmount ? String(rawOrderAmount) : "0";
    let finalOrderNumber = orderNumber || null;
    let orderDate: Date | null = null;
    const enrichedMetadata: Record<string, any> =
      metadata && typeof metadata === "object" ? { ...metadata } : {};

    // If orderId is provided, enrich order, restaurant, delivery rider, and customer from DB
    if (orderId) {
      try {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (order) {
          if (!outletId) outletId = order.restaurantId;
          if (!customerId && order.placedByUserId) customerId = order.placedByUserId;
          if (!finalOrderNumber) finalOrderNumber = `#MQ-${order.id.slice(-5).toUpperCase()}`;
          if (!rawOrderAmount && (order.grandTotal || order.subtotal)) {
            finalOrderAmount = String(order.grandTotal ?? order.subtotal);
          }
          if (order.createdAt) orderDate = new Date(order.createdAt);

          if (!outletName && outletId) {
            try {
              const [rest] = await db.select().from(restaurants).where(eq(restaurants.id, outletId)).limit(1);
              if (rest?.restaurantName) outletName = rest.restaurantName;
            } catch {}
          }

          // Enrich riderId & rider info from orderDeliveries + deliveryRiders
          if (!riderId) {
            try {
              const [deliveryRow] = await db
                .select({
                  riderId: orderDeliveries.riderId,
                  riderName: deliveryRiders.name,
                  riderPhone: deliveryRiders.phone,
                })
                .from(orderDeliveries)
                .leftJoin(deliveryRiders, eq(orderDeliveries.riderId, deliveryRiders.id))
                .where(eq(orderDeliveries.orderId, order.id))
                .orderBy(desc(orderDeliveries.updatedAt))
                .limit(1);
              if (deliveryRow?.riderId) {
                riderId = deliveryRow.riderId;
                if (deliveryRow.riderName) enrichedMetadata.riderName = deliveryRow.riderName;
                if (deliveryRow.riderPhone) enrichedMetadata.riderPhone = deliveryRow.riderPhone;
              }
            } catch {}
          }

          // Check notes JSON for customer contact details if missing
          if (order.notes && typeof order.notes === "string" && order.notes.startsWith("{")) {
            try {
              const parsedNotes = JSON.parse(order.notes);
              if (!customerPhone && parsedNotes.phone) customerPhone = String(parsedNotes.phone);
              if (!customerName && parsedNotes.customerName) customerName = String(parsedNotes.customerName);
            } catch {}
          }
        }
      } catch (enrichErr) {
        console.warn("⚠️ Could not auto-enrich order details for complaint:", enrichErr);
      }
    }

    // If customerId exists but name or phone is missing, enrich from authUsers / profiles
    if (customerId && (!customerName || !customerPhone)) {
      try {
        const [u] = await db.select().from(authUsers).where(eq(authUsers.id, customerId)).limit(1);
        if (u) {
          if (!customerName && u.name) customerName = u.name;
          if (!customerPhone && u.email && u.email.includes("@myquro.customer")) {
            customerPhone = u.email.replace("@myquro.customer", "");
          }
        }
        const [prof] = await db.select().from(profiles).where(eq(profiles.userId, customerId)).limit(1);
        if (prof) {
          if (!customerPhone && prof.phoneNumber) customerPhone = prof.phoneNumber;
          if (!customerName && prof.username) customerName = prof.username;
        }
      } catch {}
    }

    // Deduplicate active order complaints from the same customer on the same order
    // so repeated follow-ups update the live thread & SLA instead of spawning duplicates
    if (ticketType === "order_complaint" && orderId && customerId) {
      const activeExisting = await db
        .select()
        .from(complaints)
        .where(
          and(
            eq(complaints.orderId, orderId),
            eq(complaints.customerId, customerId),
            eq(complaints.ticketType, "order_complaint"),
            inArray(complaints.status, ["OPEN", "IN_PROGRESS", "AWAITING_CUSTOMER"])
          )
        )
        .orderBy(desc(complaints.createdAt))
        .limit(1);

      if (activeExisting.length > 0) {
        const existingTicket = activeExisting[0];
        const existingMsgs = ensureArray<any>(existingTicket.messages);
        const existingEvidence = ensureArray<string>(existingTicket.evidence);
        const now = new Date();
        const nowIso = now.toISOString();
        const followUpMsg = {
          id: `msg-${nanoid(6)}`,
          complaintId: existingTicket.id,
          senderId: customerId,
          senderName: customerName || existingTicket.customerName || "Customer",
          senderType: "CUSTOMER",
          message: initialMessage || `${reason}${description && description !== reason ? `: ${description}` : ""}`,
          timestamp: nowIso,
          ...(Array.isArray(evidence) && evidence[0] ? { attachmentUrl: evidence[0] } : {}),
        };
        const mergedEvidence = Array.isArray(evidence)
          ? Array.from(new Set([...existingEvidence, ...evidence.filter(Boolean)]))
          : existingEvidence;
        const escalatedPriority =
          existingTicket.priority === "HIGH" || existingTicket.priority === "CRITICAL"
            ? "CRITICAL"
            : "HIGH";

        const updatedFields = {
          messages: [...existingMsgs, followUpMsg],
          evidence: mergedEvidence,
          priority: escalatedPriority,
          updatedAt: now,
        };
        await db.update(complaints).set(updatedFields).where(eq(complaints.id, existingTicket.id));

        let updatedRecord: any = { ...existingTicket, ...updatedFields };
        try {
          updatedRecord = await runAutonomousComplaintRules(updatedRecord);
        } catch {}

        if (outletId) {
          try {
            emitToRestaurant(outletId, "complaint-message", {
              complaintId: existingTicket.id,
              message: followUpMsg,
              complaint: updatedRecord,
            });
          } catch {}
        }
        emitToOrder(orderId, "complaint-message", {
          complaintId: existingTicket.id,
          message: followUpMsg,
          complaint: updatedRecord,
        });

        return res.status(200).json({
          success: true,
          deduplicated: true,
          message: "Added update to your active conversation",
          complaint: updatedRecord,
        });
      }
    }

    const prefix = ticketType === "rider_issue" ? "TKT" : ticketType === "merchant_issue" ? "MRCH" : "CMP";
    const complaintId = `${prefix}-${nanoid(6).toUpperCase()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    const initialSenderType =
      ticketType === "rider_issue"
        ? "RIDER"
        : ticketType === "merchant_issue"
        ? "RESTAURANT"
        : "CUSTOMER";

    const resolvedActorName =
      customerName ||
      (ticketType === "rider_issue"
        ? "Rider"
        : ticketType === "merchant_issue"
        ? outletName || "Restaurant Partner"
        : "Customer");

    const cleanEvidence = Array.isArray(evidence) ? evidence.filter(Boolean) : [];

    const messages = Array.isArray(req.body.messages) && req.body.messages.length > 0
      ? req.body.messages
      : [
          {
            id: `msg-${nanoid(6)}`,
            complaintId,
            senderId: customerId || riderId || outletId || "USER",
            senderName: resolvedActorName,
            senderType: initialSenderType,
            message: initialMessage || description,
            timestamp: nowIso,
            ...(cleanEvidence.length > 0 ? { attachmentUrl: cleanEvidence[0] } : {}),
          },
        ];

    const auditLogs = [
      {
        id: `aud-${nanoid(6)}`,
        complaintId,
        user: resolvedActorName,
        action: "Complaint Created",
        timestamp: nowIso,
        newStatus: "OPEN",
        notes: `Initial ticket filed: ${reason}`,
      },
    ];

    const newRecord = {
      id: complaintId,
      ticketType,
      orderId: orderId || null,
      orderNumber: finalOrderNumber || (orderId ? `#${orderId.slice(-5).toUpperCase()}` : null),
      customerId,
      customerName: resolvedActorName,
      customerPhone,
      customerAvatar: customerAvatar || null,
      outletId,
      outletName: outletName || null,
      riderId,
      orderDate: orderDate || now,
      category,
      categoryLabel: categoryLabel || category.replace(/_/g, " "),
      reason,
      description,
      relatedItem: relatedItem || null,
      orderAmount: finalOrderAmount,
      priority,
      status: "OPEN",
      evidence: cleanEvidence,
      messages,
      resolution: null,
      refundStatus: "NOT_REQUESTED",
      auditLogs,
      responseSlaMinutes: 30,
      metadata: enrichedMetadata,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(complaints).values(newRecord as any);

    // Run autonomous SLA & self-healing rules immediately (e.g., auto-cancel & refund if >5m unaccepted)
    let processedRecord: any = newRecord;
    try {
      processedRecord = await runAutonomousComplaintRules(newRecord);
    } catch (autoErr) {
      console.warn("⚠️ Autonomous complaint rule check skipped:", autoErr);
    }

    // Emit live WebSocket alerts to connected Restaurant & Order rooms
    if (outletId) {
      try {
        emitToRestaurant(outletId, "complaint-created", processedRecord);
      } catch (wsErr) {
        console.warn("⚠️ Could not emit complaint-created event:", wsErr);
      }
    }
    if (orderId) {
      try {
        emitToOrder(orderId, "complaint-created", processedRecord);
      } catch {}
    }

    return res.status(201).json({
      success: true,
      message: "Complaint registered successfully",
      complaint: processedRecord,
    });
  } catch (err: any) {
    console.error("❌ Error creating complaint:", err);
    return res.status(500).json({ error: "Failed to create complaint", details: err?.message });
  }
});

// 2. GET /api/complaints/merchant/:restaurantId - Fetch complaints for a restaurant
router.get("/merchant/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { ticketType } = req.query as { ticketType?: string };
    if (!restaurantId) {
      return res.status(400).json({ error: "restaurantId is required" });
    }

    const whereCond = ticketType
      ? and(eq(complaints.outletId, restaurantId), eq(complaints.ticketType, ticketType))
      : eq(complaints.outletId, restaurantId);

    const records = await db
      .select()
      .from(complaints)
      .where(whereCond)
      .orderBy(desc(complaints.createdAt));

    // Enrich real past order counts & past complaint counts per customer
    const customerIds = Array.from(new Set(records.map((r) => r.customerId).filter(Boolean) as string[]));
    const orderCountMap: Record<string, number> = {};
    const complaintCountMap: Record<string, number> = {};

    if (customerIds.length > 0) {
      try {
        const custOrders = await db
          .select({ placedByUserId: orders.placedByUserId })
          .from(orders)
          .where(inArray(orders.placedByUserId, customerIds));
        custOrders.forEach((o) => {
          if (o.placedByUserId) {
            orderCountMap[o.placedByUserId] = (orderCountMap[o.placedByUserId] || 0) + 1;
          }
        });

        const custComplaints = await db
          .select({ customerId: complaints.customerId })
          .from(complaints)
          .where(inArray(complaints.customerId, customerIds));
        custComplaints.forEach((c) => {
          if (c.customerId) {
            complaintCountMap[c.customerId] = (complaintCountMap[c.customerId] || 0) + 1;
          }
        });
      } catch (cntErr) {
        console.warn("⚠️ Could not enrich customer order/complaint counts:", cntErr);
      }
    }

    const enrichedRecords = records.map((r) => ({
      ...r,
      customerPastOrdersCount: r.customerId ? (orderCountMap[r.customerId] || 0) : 0,
      customerPastComplaintsCount: r.customerId ? (complaintCountMap[r.customerId] || 0) : 0,
    }));

    return res.json({
      success: true,
      count: enrichedRecords.length,
      complaints: enrichedRecords,
    });
  } catch (err: any) {
    console.error("❌ Error fetching merchant complaints:", err);
    return res.status(500).json({ error: "Failed to fetch merchant complaints", details: err?.message });
  }
});

// 3. GET /api/complaints/customer/:customerId - Fetch complaints for a customer
router.get("/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      return res.status(400).json({ error: "customerId is required" });
    }

    const records = await db
      .select()
      .from(complaints)
      .where(eq(complaints.customerId, customerId))
      .orderBy(desc(complaints.createdAt));

    return res.json({
      success: true,
      count: records.length,
      complaints: records,
    });
  } catch (err: any) {
    console.error("❌ Error fetching customer complaints:", err);
    return res.status(500).json({ error: "Failed to fetch customer complaints", details: err?.message });
  }
});

// 4. GET /api/complaints/order/:orderId - Fetch complaints for an order
router.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const cleanId = orderId.replace(/^#/, "");
    const records = await db
      .select()
      .from(complaints)
      .where(
        or(
          eq(complaints.orderId, orderId),
          eq(complaints.orderId, cleanId),
          eq(complaints.orderNumber, orderId),
          eq(complaints.orderNumber, `#${cleanId}`),
          eq(complaints.orderNumber, cleanId)
        )
      )
      .orderBy(desc(complaints.createdAt));

    return res.json({
      success: true,
      complaints: records,
    });
  } catch (err: any) {
    console.error("❌ Error fetching order complaints:", err);
    return res.status(500).json({ error: "Failed to fetch order complaints", details: err?.message });
  }
});

// 5. GET /api/complaints/rider/:riderId - Fetch tickets for a rider
router.get("/rider/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const records = await db
      .select()
      .from(complaints)
      .where(eq(complaints.riderId, riderId))
      .orderBy(desc(complaints.createdAt));

    return res.json({
      success: true,
      count: records.length,
      tickets: records,
    });
  } catch (err: any) {
    console.error("❌ Error fetching rider tickets:", err);
    return res.status(500).json({ error: "Failed to fetch rider tickets", details: err?.message });
  }
});

// 6. GET /api/complaints/:id - Fetch single complaint details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [record] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);

    if (!record) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    return res.json({
      success: true,
      complaint: record,
    });
  } catch (err: any) {
    console.error("❌ Error fetching complaint details:", err);
    return res.status(500).json({ error: "Failed to fetch complaint details", details: err?.message });
  }
});

function broadcastComplaintEvent(
  record: { outletId?: string | null; orderId?: string | null },
  event: string,
  payload: unknown
) {
  if (record.outletId) {
    try {
      emitToRestaurant(record.outletId, event, payload);
    } catch (wsErr) {
      console.warn(`⚠️ WebSocket emit error (${event} to restaurant):`, wsErr);
    }
  }
  if (record.orderId) {
    try {
      emitToOrder(record.orderId, event, payload);
    } catch (wsErr) {
      console.warn(`⚠️ WebSocket emit error (${event} to order):`, wsErr);
    }
  }
}

// 7. POST /api/complaints/:id/message - Add message to complaint thread
router.post("/:id/message", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      senderId,
      senderName,
      senderType = "RESTAURANT",
      message,
      attachmentUrl,
    } = req.body;

    const trimmedMsg = typeof message === "string" ? message.trim() : "";
    if (!trimmedMsg && !attachmentUrl) {
      return res.status(400).json({ error: "Message text or attachment is required" });
    }

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const normalizedSenderType = String(senderType || "RESTAURANT").toUpperCase();
    const resolvedSenderId =
      senderId ||
      (normalizedSenderType === "CUSTOMER"
        ? existing.customerId || "CUSTOMER"
        : normalizedSenderType === "RIDER"
          ? existing.riderId || "RIDER"
          : normalizedSenderType === "RESTAURANT"
            ? existing.outletId || "RESTAURANT"
            : "MYQURO_SUPPORT");
    const resolvedSenderName =
      senderName ||
      (normalizedSenderType === "CUSTOMER"
        ? existing.customerName || "Customer"
        : normalizedSenderType === "RIDER"
          ? ((existing.metadata as Record<string, any> | null)?.riderName as string) || "Delivery Partner"
          : normalizedSenderType === "RESTAURANT"
            ? existing.outletName || "Restaurant Partner"
            : "MyQuro Support");

    const now = new Date();
    const nowIso = now.toISOString();
    const currentMessages = ensureArray(existing.messages);

    const newMessage = {
      id: `msg-${nanoid(6)}`,
      complaintId: id,
      senderId: resolvedSenderId,
      senderName: resolvedSenderName,
      senderType: normalizedSenderType,
      message: trimmedMsg || "Attached photo evidence",
      timestamp: nowIso,
      ...(attachmentUrl ? { attachmentUrl } : {}),
    };

    const updatedMessages = [...currentMessages, newMessage];
    const currentEvidence = ensureArray(existing.evidence);
    const updatedEvidence =
      attachmentUrl && !currentEvidence.includes(attachmentUrl)
        ? [...currentEvidence, attachmentUrl]
        : currentEvidence;

    const updatePayload: any = {
      messages: updatedMessages,
      evidence: updatedEvidence,
      updatedAt: now,
    };

    // Track first partner/support response and status transitions across apps
    if (
      (normalizedSenderType === "RESTAURANT" || normalizedSenderType === "MYQURO_SUPPORT") &&
      !existing.firstResponseAt
    ) {
      updatePayload.firstResponseAt = now;
      if (existing.status === "OPEN") {
        updatePayload.status = "IN_PROGRESS";
      }
    } else if (normalizedSenderType === "RIDER" && existing.status === "OPEN") {
      updatePayload.status = "IN_PROGRESS";
    } else if (
      (normalizedSenderType === "CUSTOMER" || normalizedSenderType === "RIDER") &&
      existing.status === "AWAITING_CUSTOMER"
    ) {
      updatePayload.status = "IN_PROGRESS";
    }

    await db.update(complaints).set(updatePayload).where(eq(complaints.id, id));

    const updatedRecord = { ...existing, ...updatePayload };

    broadcastComplaintEvent(existing, "complaint-message", {
      complaintId: id,
      message: newMessage,
      complaint: updatedRecord,
    });

    return res.json({
      success: true,
      message: newMessage,
      complaint: updatedRecord,
    });
  } catch (err: any) {
    console.error("❌ Error adding message to complaint:", err);
    return res.status(500).json({ error: "Failed to add message", details: err?.message });
  }
});

// 8. PATCH /api/complaints/:id/status - Update complaint status
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus, user, notes } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: "newStatus is required" });
    }

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const actor = user || existing.outletName || "Partner";
    const now = new Date();
    const nowIso = now.toISOString();
    const currentLogs = ensureArray(existing.auditLogs);

    const newLog = {
      id: `aud-${nanoid(6)}`,
      complaintId: id,
      user: actor,
      action: `Status updated to ${newStatus}`,
      timestamp: nowIso,
      previousStatus: existing.status,
      newStatus,
      notes: notes || undefined,
    };

    const updatePayload: any = {
      status: newStatus,
      auditLogs: [...currentLogs, newLog],
      updatedAt: now,
    };

    if (newStatus === "RESOLVED" && !existing.resolvedAt) {
      updatePayload.resolvedAt = now;
    }

    await db.update(complaints).set(updatePayload).where(eq(complaints.id, id));

    const updatedRecord = { ...existing, ...updatePayload };

    broadcastComplaintEvent(existing, "complaint-status-updated", updatedRecord);

    return res.json({
      success: true,
      complaint: updatedRecord,
    });
  } catch (err: any) {
    console.error("❌ Error updating complaint status:", err);
    return res.status(500).json({ error: "Failed to update status", details: err?.message });
  }
});

// Helper to attribute financial complaint/refund fault to merchant or rider once resolution completes
async function applyComplaintFaultPenalty(params: {
  complaint: any;
  refundAmount?: any;
  faultParty?: "merchant" | "rider" | "none";
}) {
  const { complaint, refundAmount, faultParty } = params;
  if (!complaint?.orderId || complaint.ticketType !== "order_complaint") return null;

  const refundRupees = Number(refundAmount || 0);
  if (refundRupees <= 0 && (!faultParty || faultParty === "none")) return null;
  if (faultParty === "none") return null;

  const refundPaise =
    refundRupees > 0 ? Math.round(refundRupees * 100) : Math.round(Number(complaint.orderAmount || 0));
  const penaltyPaise = computeFaultPenaltyPaise(refundPaise);
  const categoryUpper = String(complaint.category || "").toUpperCase();
  const textLower = `${complaint.reason || ""} ${complaint.description || ""}`.toLowerCase();

  const isUndelivered = textLower.includes("not receive") || textLower.includes("did not deliver");
  const isDeliveryIssue =
    categoryUpper === "DELIVERY_DELAY" ||
    isUndelivered ||
    textLower.includes("spilled") ||
    textLower.includes("damaged");

  let targetRiderId: string | null = complaint.riderId || null;
  if (!targetRiderId && complaint.orderId) {
    const [del] = await db
      .select({ riderId: orderDeliveries.riderId })
      .from(orderDeliveries)
      .where(eq(orderDeliveries.orderId, complaint.orderId))
      .limit(1);
    targetRiderId = del?.riderId || null;
  }

  const resolvedFault = faultParty || (isDeliveryIssue && targetRiderId ? "rider" : "merchant");

  if (resolvedFault === "rider" && targetRiderId) {
    return await applyRiderPenalty({
      riderId: targetRiderId,
      orderId: complaint.orderId,
      complaintId: complaint.id,
      penaltyType: isUndelivered ? "undelivered_order_complaint" : "order_damage_or_missing",
      amountPaise: penaltyPaise,
      cooldownMinutes: 0,
      strikeDelta: isUndelivered ? 1 : 0,
      forceOffline: false,
      reason: `Customer refund attributed for ${complaint.categoryLabel || complaint.reason || "delivery issue"} (Ticket ${complaint.id}).`,
    });
  }

  if (resolvedFault === "merchant" && complaint.outletId) {
    return await applyMerchantPenalty({
      restaurantId: complaint.outletId,
      orderId: complaint.orderId,
      penaltyType: "complaint_refund_fault",
      amountPaise: penaltyPaise,
      strikeDelta: 0,
      pauseMinutes: 0,
      reason: `Refund fault for ${complaint.categoryLabel || complaint.reason || "order issue"} (Ticket ${complaint.id}).`,
    });
  }

  return null;
}

// 9. POST /api/complaints/:id/resolve - Propose or Direct Resolve
router.post("/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resolutionType,
      refundAmount,
      replacementItem,
      compensationCode,
      actionTaken = "Issue resolved by restaurant partner",
      note = "",
      resolvedBy,
      directResolve = false,
      faultParty,
    } = req.body;

    if (!resolutionType) {
      return res.status(400).json({ error: "resolutionType is required" });
    }

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const actor = resolvedBy || existing.outletName || "Partner";
    const now = new Date();
    const nowIso = now.toISOString();

    const resolutionRecord = {
      id: `res-${nanoid(6)}`,
      resolutionType,
      refundAmount: refundAmount !== undefined ? Number(refundAmount) : undefined,
      replacementItem: replacementItem || undefined,
      compensationCode: compensationCode || undefined,
      faultParty: faultParty || undefined,
      actionTaken,
      note,
      resolvedBy: actor,
      resolvedAt: nowIso,
      customerAccepted: directResolve ? true : undefined,
    };

    const newStatus = directResolve ? "RESOLVED" : "AWAITING_CUSTOMER";
    const currentLogs = ensureArray(existing.auditLogs);

    const newLog = {
      id: `aud-${nanoid(6)}`,
      complaintId: id,
      user: actor,
      action: directResolve ? `Complaint directly resolved with ${resolutionType}` : `Proposed resolution: ${resolutionType}`,
      timestamp: nowIso,
      previousStatus: existing.status,
      newStatus,
      notes: note || actionTaken,
    };

    let refundStatus = existing.refundStatus;
    if (resolutionType === "REFUND") {
      refundStatus = directResolve ? "COMPLETED" : "PROCESSING";
    }

    const updatePayload: any = {
      resolution: resolutionRecord,
      status: newStatus,
      refundStatus,
      auditLogs: [...currentLogs, newLog],
      updatedAt: now,
      ...(directResolve ? { resolvedAt: now } : {}),
    };

    await db.update(complaints).set(updatePayload).where(eq(complaints.id, id));

    let penaltyApplied: any = null;
    if (directResolve && resolutionType === "REFUND") {
      try {
        penaltyApplied = await applyComplaintFaultPenalty({
          complaint: existing,
          refundAmount,
          faultParty,
        });
      } catch (penErr) {
        console.warn("⚠️ Could not apply complaint fault penalty:", penErr);
      }
    }

    const updatedRecord = { ...existing, ...updatePayload };

    broadcastComplaintEvent(existing, "complaint-resolved", updatedRecord);

    return res.json({
      success: true,
      complaint: updatedRecord,
      penaltyApplied,
    });
  } catch (err: any) {
    console.error("❌ Error resolving complaint:", err);
    return res.status(500).json({ error: "Failed to resolve complaint", details: err?.message });
  }
});

// 10. POST /api/complaints/:id/accept-resolution
router.post("/:id/accept-resolution", async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback, user } = req.body;

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const actor = user || existing.customerName || "Customer";
    const now = new Date();
    const nowIso = now.toISOString();

    const currentResolution: any = existing.resolution || {};
    const updatedResolution = {
      ...currentResolution,
      customerAccepted: true,
      customerFeedback: feedback || undefined,
    };

    const currentLogs = ensureArray(existing.auditLogs);
    const newLog = {
      id: `aud-${nanoid(6)}`,
      complaintId: id,
      user: actor,
      action: `Resolution Accepted by ${actor}`,
      timestamp: nowIso,
      previousStatus: existing.status,
      newStatus: "RESOLVED",
      notes: feedback || "Accepted proposed resolution",
    };

    const updatePayload: any = {
      resolution: updatedResolution,
      status: "RESOLVED",
      auditLogs: [...currentLogs, newLog],
      resolvedAt: now,
      updatedAt: now,
    };

    if (existing.refundStatus === "PROCESSING") {
      updatePayload.refundStatus = "COMPLETED";
    }

    await db.update(complaints).set(updatePayload).where(eq(complaints.id, id));

    let penaltyApplied: any = null;
    if (currentResolution?.resolutionType === "REFUND") {
      try {
        penaltyApplied = await applyComplaintFaultPenalty({
          complaint: existing,
          refundAmount: currentResolution.refundAmount,
          faultParty: currentResolution.faultParty,
        });
      } catch (penErr) {
        console.warn("⚠️ Could not apply accepted complaint fault penalty:", penErr);
      }
    }

    const updatedRecord = { ...existing, ...updatePayload };

    broadcastComplaintEvent(existing, "complaint-status-updated", updatedRecord);

    return res.json({
      success: true,
      complaint: updatedRecord,
      penaltyApplied,
    });
  } catch (err: any) {
    console.error("❌ Error accepting resolution:", err);
    return res.status(500).json({ error: "Failed to accept resolution", details: err?.message });
  }
});

// 11. POST /api/complaints/:id/reject-resolution
router.post("/:id/reject-resolution", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Resolution unsatisfactory", user } = req.body;

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const actor = user || existing.customerName || "Customer";
    const now = new Date();
    const nowIso = now.toISOString();

    const currentResolution: any = existing.resolution || {};
    const updatedResolution = {
      ...currentResolution,
      customerAccepted: false,
      customerFeedback: reason,
    };

    const currentLogs = ensureArray(existing.auditLogs);
    const newLog = {
      id: `aud-${nanoid(6)}`,
      complaintId: id,
      user: actor,
      action: "Resolution Rejected - Escalated",
      timestamp: nowIso,
      previousStatus: existing.status,
      newStatus: "ESCALATED",
      notes: reason,
    };

    const updatePayload: any = {
      resolution: updatedResolution,
      status: "ESCALATED",
      auditLogs: [...currentLogs, newLog],
      updatedAt: now,
    };

    await db.update(complaints).set(updatePayload).where(eq(complaints.id, id));

    const updatedRecord = { ...existing, ...updatePayload };

    broadcastComplaintEvent(existing, "complaint-status-updated", updatedRecord);

    return res.json({
      success: true,
      complaint: updatedRecord,
    });
  } catch (err: any) {
    console.error("❌ Error rejecting resolution:", err);
    return res.status(500).json({ error: "Failed to reject resolution", details: err?.message });
  }
});

export default router;
