import { Router } from "express";
import { db } from "../db/db.js";
import { chatMessages } from "../db/schema/chat-messages.js";
import { auth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { authSessions } from "../db/schema/auth-sessions.js";
import { authUsers } from "../db/schema/auth-users.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitToOrder } from "../lib/socket.js";

const router = Router();

// Resilient optional authentication for chat to prevent customer/rider disconnects
const optionalChatAuth = async (req: any, res: any, next: any) => {
  try {
    let session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session?.user) {
      req.user = session.user;
    } else {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const dbSession = await db
          .select({
            id: authSessions.id,
            userId: authSessions.userId,
            expiresAt: authSessions.expiresAt,
            user: {
              id: authUsers.id,
              name: authUsers.name,
              email: authUsers.email,
              emailVerified: authUsers.emailVerified,
              image: authUsers.image,
              role: authUsers.role,
              createdAt: authUsers.createdAt,
              updatedAt: authUsers.updatedAt,
            }
          })
          .from(authSessions)
          .innerJoin(authUsers, eq(authSessions.userId, authUsers.id))
          .where(eq(authSessions.token, token))
          .limit(1)
          .then(res => res[0]);

        if (dbSession) {
          req.user = dbSession.user;
        }
      }
    }
    next();
  } catch (err) {
    next();
  }
};

// GET /api/chat/:orderId/messages
router.get("/:orderId/messages", optionalChatAuth, async (req: any, res) => {
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
router.post("/:orderId/messages", optionalChatAuth, async (req: any, res) => {
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

    // Broadcast in real-time to the order room via socket for both event names
    emitToOrder(orderId, "new-message", msg);
    emitToOrder(orderId, "chat-message", msg);

    return res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error("❌ POST chat message error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
