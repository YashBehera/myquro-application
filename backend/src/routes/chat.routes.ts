import { Router } from "express";
import { db } from "../db/db.js";
import { chatMessages } from "../db/schema/chat-messages.js";
import { requireAuth } from "../auth/requireAuth.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitToOrder } from "../lib/socket.js";

const router = Router();

// GET /api/chat/:orderId/messages
router.get("/:orderId/messages", requireAuth, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const list = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.orderId, orderId))
      .orderBy(chatMessages.createdAt);

    return res.status(200).json({ success: true, messages: list });
  } catch (err) {
    console.error("❌ GET chat messages error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/chat/:orderId/messages
router.post("/:orderId/messages", requireAuth, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const { text, sender } = req.body;

    if (!text || !sender || !["customer", "rider"].includes(sender)) {
      return res.status(400).json({ message: "Invalid message payload" });
    }

    const messageId = `msg_${nanoid(10)}`;
    const msg = {
      id: messageId,
      orderId,
      sender: sender as "customer" | "rider",
      text,
      createdAt: new Date(),
    };

    await db.insert(chatMessages).values(msg);

    // Broadcast in real-time to the order room via socket
    emitToOrder(orderId, "new-message", msg);

    return res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error("❌ POST chat message error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
