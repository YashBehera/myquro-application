import express from "express";
import { db } from "../db/db.js";
import { complaints, orders, restaurants } from "../db/schema.js";
import { eq, desc, and, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitToRestaurant } from "../lib/socket.js";

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
      customerId,
      customerName = "Customer",
      customerPhone,
      customerAvatar,
      outletId: rawOutletId,
      outletName: rawOutletName,
      riderId,
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

    let outletId = rawOutletId;
    let outletName = rawOutletName;
    let finalOrderAmount = rawOrderAmount ? String(rawOrderAmount) : "0";
    let finalOrderNumber = orderNumber;
    let orderDate: Date | null = null;

    // If orderId is provided, enrich from orders table if needed
    if (orderId) {
      try {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (order) {
          if (!outletId) outletId = order.restaurantId;
          if (!finalOrderNumber) finalOrderNumber = `#MQ-${order.id.slice(-5).toUpperCase()}`;
          if (!rawOrderAmount && (order.grandTotal || order.subtotal)) {
            finalOrderAmount = String(order.grandTotal ?? order.subtotal);
          }
          if (order.createdAt) orderDate = new Date(order.createdAt);
          if (!outletName && order.restaurantId) {
            try {
              const [rest] = await db.select().from(restaurants).where(eq(restaurants.id, order.restaurantId)).limit(1);
              if (rest?.restaurantName) outletName = rest.restaurantName;
            } catch {}
          }
        }
      } catch (enrichErr) {
        console.warn("⚠️ Could not auto-enrich order details for complaint:", enrichErr);
      }
    }

    const prefix = ticketType === "rider_issue" ? "TKT" : "CMP";
    const complaintId = `${prefix}-${nanoid(6).toUpperCase()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    const messages = [
      {
        id: `msg-${nanoid(6)}`,
        complaintId,
        senderId: customerId || riderId || "USER",
        senderName: customerName || (ticketType === "rider_issue" ? "Rider" : "Customer"),
        senderType: ticketType === "rider_issue" ? "MYQURO_SUPPORT" : "CUSTOMER",
        message: initialMessage || description,
        timestamp: nowIso,
      },
    ];

    const auditLogs = [
      {
        id: `aud-${nanoid(6)}`,
        complaintId,
        user: customerName || (ticketType === "rider_issue" ? "Rider" : "Customer"),
        action: "Complaint Created",
        timestamp: nowIso,
        newStatus: "OPEN",
        notes: `Initial complaint filed: ${reason}`,
      },
    ];

    const newRecord = {
      id: complaintId,
      ticketType,
      orderId: orderId || null,
      orderNumber: finalOrderNumber || (orderId ? `#${orderId.slice(-5).toUpperCase()}` : null),
      customerId: customerId || null,
      customerName,
      customerPhone: customerPhone || null,
      customerAvatar: customerAvatar || null,
      outletId: outletId || null,
      outletName: outletName || "Restaurant Partner",
      riderId: riderId || null,
      orderDate: orderDate || now,
      category,
      categoryLabel: categoryLabel || category.replace(/_/g, " "),
      reason,
      description,
      relatedItem: relatedItem || null,
      orderAmount: finalOrderAmount,
      priority,
      status: "OPEN",
      evidence: Array.isArray(evidence) ? evidence : [],
      messages,
      resolution: null,
      refundStatus: "NOT_REQUESTED",
      auditLogs,
      responseSlaMinutes: 30,
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(complaints).values(newRecord as any);

    // If linked to a restaurant, emit live WebSocket alert
    if (outletId) {
      try {
        emitToRestaurant(outletId, "complaint-created", newRecord);
      } catch (wsErr) {
        console.warn("⚠️ Could not emit complaint-created event:", wsErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Complaint registered successfully",
      complaint: newRecord,
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
    if (!restaurantId) {
      return res.status(400).json({ error: "restaurantId is required" });
    }

    const records = await db
      .select()
      .from(complaints)
      .where(eq(complaints.outletId, restaurantId))
      .orderBy(desc(complaints.createdAt));

    return res.json({
      success: true,
      count: records.length,
      complaints: records,
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
    const records = await db
      .select()
      .from(complaints)
      .where(eq(complaints.orderId, orderId))
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

// 7. POST /api/complaints/:id/message - Add message to complaint thread
router.post("/:id/message", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      senderId = "SUPPORT",
      senderName = "Staff",
      senderType = "RESTAURANT",
      message,
      attachmentUrl,
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const currentMessages = ensureArray(existing.messages);

    const newMessage = {
      id: `msg-${nanoid(6)}`,
      complaintId: id,
      senderId,
      senderName,
      senderType,
      message: message.trim(),
      timestamp: nowIso,
      ...(attachmentUrl ? { attachmentUrl } : {}),
    };

    const updatedMessages = [...currentMessages, newMessage];
    const updatePayload: any = {
      messages: updatedMessages,
      updatedAt: now,
    };

    // If restaurant / support replied and firstResponseAt is null, record it
    if ((senderType === "RESTAURANT" || senderType === "MYQURO_SUPPORT") && !existing.firstResponseAt) {
      updatePayload.firstResponseAt = now;
      if (existing.status === "OPEN") {
        updatePayload.status = "IN_PROGRESS";
      }
    }

    await db.update(complaints).set(updatePayload).where(eq(complaints.id, id));

    const updatedRecord = { ...existing, ...updatePayload };

    // Emit live WebSocket update
    if (existing.outletId) {
      try {
        emitToRestaurant(existing.outletId, "complaint-message", {
          complaintId: id,
          message: newMessage,
        });
      } catch (wsErr) {
        console.warn("⚠️ WebSocket emit error on message:", wsErr);
      }
    }

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
    const { newStatus, user = "Staff", notes } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: "newStatus is required" });
    }

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const currentLogs = ensureArray(existing.auditLogs);

    const newLog = {
      id: `aud-${nanoid(6)}`,
      complaintId: id,
      user,
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

    if (existing.outletId) {
      try {
        emitToRestaurant(existing.outletId, "complaint-status-updated", updatedRecord);
      } catch (wsErr) {
        console.warn("⚠️ WebSocket emit error on status update:", wsErr);
      }
    }

    return res.json({
      success: true,
      complaint: updatedRecord,
    });
  } catch (err: any) {
    console.error("❌ Error updating complaint status:", err);
    return res.status(500).json({ error: "Failed to update status", details: err?.message });
  }
});

// 9. POST /api/complaints/:id/resolve - Propose or Direct Resolve
router.post("/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resolutionType,
      refundAmount,
      replacementItem,
      compensationCode,
      actionTaken = "Issue resolved by restaurant staff",
      note = "",
      resolvedBy = "Staff",
      directResolve = false,
    } = req.body;

    if (!resolutionType) {
      return res.status(400).json({ error: "resolutionType is required" });
    }

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const resolutionRecord = {
      id: `res-${nanoid(6)}`,
      resolutionType,
      refundAmount: refundAmount !== undefined ? Number(refundAmount) : undefined,
      replacementItem: replacementItem || undefined,
      compensationCode: compensationCode || undefined,
      actionTaken,
      note,
      resolvedBy,
      resolvedAt: nowIso,
      customerAccepted: directResolve ? true : undefined,
    };

    const newStatus = directResolve ? "RESOLVED" : "AWAITING_CUSTOMER";
    const currentLogs = ensureArray(existing.auditLogs);

    const newLog = {
      id: `aud-${nanoid(6)}`,
      complaintId: id,
      user: resolvedBy,
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

    const updatedRecord = { ...existing, ...updatePayload };

    if (existing.outletId) {
      try {
        emitToRestaurant(existing.outletId, "complaint-resolved", updatedRecord);
      } catch (wsErr) {
        console.warn("⚠️ WebSocket emit error on resolve:", wsErr);
      }
    }

    return res.json({
      success: true,
      complaint: updatedRecord,
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
    const { feedback, user = "Customer" } = req.body;

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

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
      user,
      action: "Resolution Accepted by Customer",
      timestamp: nowIso,
      previousStatus: existing.status,
      newStatus: "RESOLVED",
      notes: feedback || "Customer accepted proposed resolution",
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

    const updatedRecord = { ...existing, ...updatePayload };

    if (existing.outletId) {
      try {
        emitToRestaurant(existing.outletId, "complaint-status-updated", updatedRecord);
      } catch (wsErr) {}
    }

    return res.json({
      success: true,
      complaint: updatedRecord,
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
    const { reason = "Resolution unsatisfactory", user = "Customer" } = req.body;

    const [existing] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

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
      user,
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

    if (existing.outletId) {
      try {
        emitToRestaurant(existing.outletId, "complaint-status-updated", updatedRecord);
      } catch (wsErr) {}
    }

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
