import { Router } from "express";
import { db } from "../db/db.js";

import { tableQR } from "../db/schema/table-qr.js";
import { tables } from "../db/schema/tables.js";
import { tableSession } from "../db/schema/table-session.js";

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";


const router = Router();
router.get("/scan/:qrToken", async (req, res) => {
  try {
    const qrToken = req.params.qrToken;
    const qr = await db
      .select()
      .from(tableQR)
      .where(and(eq(tableQR.qrToken, qrToken), eq(tableQR.isLocked, false)))
      .limit(1);

    if (!qr.length) {
      return res.status(404).json({ message: "Invalid or locked QR code" });
    }

    const { restaurantId, tableId } = qr[0];
    const table = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.id, tableId),
          eq(tables.restaurantId, restaurantId),
          eq(tables.isActive, true)
        )
      )
      .limit(1);

    if (!table.length) {
      return res.status(400).json({
        message: "Invalid table for this QR",
      });
    }

    const existingSession = await db
      .select()
      .from(tableSession)
      .where(
        and(
          eq(tableSession.tableId, tableId),
          eq(tableSession.status, "active")
        )
      )
      .limit(1);

    let sessionId: string;
    if (existingSession.length) {
      sessionId = existingSession[0].id;
    } else {
      sessionId = nanoid();
      await db.insert(tableSession).values({
        id: sessionId,
        tableId,
        restaurantId,
        qrToken,
        status: "active",
        paymentStatus: "unpaid",
      });

      // Send a redirect response and return immediately
      const redirectUrl = `${process.env.CLIENT_URL || 'https://myquro.com'}/dashboard`;
      return res.redirect(redirectUrl);
    }

    // Send a JSON response if no redirect is needed
    return res.status(200).json({
      restaurantId,
      tableId,
      tableSessionId: sessionId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
