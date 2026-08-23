import { Router } from "express";
import { db } from "../db/db.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAuth } from "../auth/requireAuth.js";
import { tables } from "../db/schema/tables.js";
import QRCode from "qrcode";
import { tableQR } from "../db/schema/table-qr.js";

import {
  isRestaurantOwnerManagerOrStaff,
  isRestaurantOwnerOrManager,
} from "../lib/checkRoles.js";

import { tableSession } from "../db/schema/table-session.js";
import { orders } from "../db/schema/orders.js";
import { tableCache } from "../lib/table-cache.js";


const router = Router();

// POST /:restaurantId/tables/create - Create a new table
router.post(
  "/:restaurantId/tables/create",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { tableNumber, capacity } = req.body;

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      // basic validation
      if (
        !tableNumber ||
        typeof tableNumber !== "number" ||
        tableNumber <= 0 ||
        !capacity ||
        typeof capacity !== "number" ||
        capacity <= 0
      ) {
        return res
          .status(400)
          .json({ message: "Invalid tableNumber or capacity" });
      }

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res
          .status(403)
          .json({ message: "You do not have permission to add tables" });
      }

      const newTable = {
        id: nanoid(),
        restaurantId,
        tableNumber: String(tableNumber),
        capacity: capacity,
      };

      await db.insert(tables).values(newTable);

      // Invalidate Cache
      tableCache.invalidate(restaurantId);

      return res
        .status(201)
        .json({ message: "Table created", table: newTable });
    } catch (error: any) {
      console.error("Error creating table:", error);

      // Handle unique constraint violation
      if (error.code === '23505' && error.constraint?.includes('tables_unique_restaurant_table_number')) {
        return res.status(400).json({
          message: `Table number ${req.body.tableNumber} already exists in this restaurant`
        });
      }

      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// GET /:restaurantId/tables - Get all tables for a restaurant
router.get("/:restaurantId/tables", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check Cache
    const cached = tableCache.get(restaurantId);
    if (cached.hit) {
      return res.status(200).json(cached.data);
    }

    const tablesList = await db
      .select()
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId))
      .orderBy(desc(tables.createdAt));

    // Enhance tables with active session data
    const enhancedTables = await Promise.all(
      tablesList.map(async (table) => {
        if (table.liveStatus === 'occupied') {
          // Find active session for this table
          const activeSession = await db
            .select({
              id: tableSession.id,
              isBilled: tableSession.billedAt,
            })
            .from(tableSession)
            .where(
              and(
                eq(tableSession.tableId, table.id),
                eq(tableSession.status, 'active')
              )
            )
            .orderBy(desc(tableSession.startedAt));

          if (activeSession.length > 0) {
            // Find the best session: the one with orders, or the latest one
            let sessionToUse = activeSession[0];
            let maxOrderCount = 0;

            // If there are duplicates, look for the one that actually has orders
            if (activeSession.length > 1) {
              console.log(`⚠️ Multiple active sessions found for table ${table.id}. Count: ${activeSession.length}`);

              const sessionStats = await Promise.all(
                activeSession.map(async (s) => {
                  const ordersRes = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(orders)
                    .where(eq(orders.tableSessionId, s.id));
                  return { id: s.id, count: ordersRes[0]?.count || 0, isBilled: !!s.isBilled };
                })
              );

              // Sort by order count (desc) then by latest (implicitly handled by activeSession order)
              const bestSession = sessionStats.sort((a, b) => b.count - a.count)[0];
              sessionToUse = activeSession.find(s => s.id === bestSession.id) || activeSession[0];
              maxOrderCount = bestSession.count;
            } else {
              // Only one session, just count orders for it
              const ordersRes = await db
                .select({ count: sql<number>`count(*)` })
                .from(orders)
                .where(eq(orders.tableSessionId, sessionToUse.id));
              maxOrderCount = ordersRes[0]?.count || 0;
            }

            return {
              ...table,
              activeSession: {
                id: sessionToUse.id,
                orderCount: maxOrderCount,
                isBilled: !!sessionToUse.isBilled,
              },
            };
          }
        }
        return table;
      })
    );

    const responseData = { tables: enhancedTables };
    tableCache.set(restaurantId, responseData);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /tables/:tableId - Update table details
router.patch("/tables/:tableId", requireAuth, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const { tableNumber, capacity, liveStatus, isActive } = req.body;
    const user = req.user;

    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    const table = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (table.length === 0) {
      return res.status(404).json({ message: "Table not found" });
    }

    const restaurantId = table[0].restaurantId;

    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "You do not have permission to update this table" });
    }

    // Optional simple validation
    if (
      tableNumber !== undefined &&
      (typeof tableNumber !== "number" || tableNumber <= 0)
    ) {
      return res.status(400).json({ message: "Invalid tableNumber" });
    }
    if (
      capacity !== undefined &&
      (typeof capacity !== "number" || capacity <= 0)
    ) {
      return res.status(400).json({ message: "Invalid capacity" });
    }

    await db
      .update(tables)
      .set({
        tableNumber: tableNumber ?? table[0].tableNumber,
        capacity: capacity ?? table[0].capacity,
        liveStatus: liveStatus ?? table[0].liveStatus,
        isActive: isActive ?? table[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(tables.id, tableId));

    // Invalidate Cache
    tableCache.invalidate(restaurantId);

    return res.status(200).json({ message: "Table updated successfully" });
  } catch (error) {
    console.error("Error updating table:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /tables/:tableId - Soft delete a table
router.delete("/tables/:tableId", requireAuth, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const user = req.user;

    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    const table = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (table.length === 0) {
      return res.status(404).json({ message: "Table not found" });
    }

    const restaurantId = table[0].restaurantId;

    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this table" });
    }

    // Prevent deleting occupied or reserved tables
    if (
      table[0].liveStatus === "occupied" ||
      table[0].liveStatus === "reserved"
    ) {
      return res.status(400).json({
        message: "Cannot delete a table that is occupied or reserved",
      });
    }

    // Hard delete instead of soft delete
    await db
      .delete(tables)
      .where(eq(tables.id, tableId));

    // Invalidate Cache
    tableCache.invalidate(restaurantId);

    return res.status(200).json({ message: "Table deleted successfully" });
  } catch (error) {
    console.error("Error deleting table:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /tables/:tableId/qrcode - Generate QR code for a table
router.post("/tables/:tableId/qrcode", requireAuth, async (req: any, res) => {
  try {
    const { tableId } = req.params;
    const user = req.user;

    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get table & restaurant
    const table = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (table.length === 0) {
      return res.status(404).json({ message: "Table not found" });
    }

    const restaurantId = table[0].restaurantId;

    // Check if the user is the owner or manager
    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have permission to generate QR for this table",
      });
    }

    // Generate a new QR token
    const qrToken = nanoid(32);

    // Step 1: Delete any existing QR code for the table
    await db.delete(tableQR).where(eq(tableQR.tableId, tableId));

    // Step 2: Insert the new QR code
    await db.insert(tableQR).values({
      id: nanoid(),
      restaurantId,
      tableId,
      qrToken,
      isLocked: false,
      createdAt: new Date(),
    });

    // Step 3: Generate the QR code image with FRONTEND URL
    const frontendUrl = process.env.CLIENT_URL || 'https://myquro.com';
    const scanUrl = `${frontendUrl}/qr/${qrToken}`;
    const qrImageBase64 = await QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Return the response
    return res.status(201).json({
      message: "QR code generated successfully",
      qrToken,
      scanUrl,
      qrImageBase64,
      tableNumber: table[0].tableNumber,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/table-session/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user;

    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    const tableSessionData = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (tableSessionData.length === 0) {
      return res.status(404).json({ message: "Table session not found" });
    }

    const restaurantId = tableSessionData[0].restaurantId;

    return res.status(200).json({ tableSession: tableSessionData[0] });
  } catch (error) {
    console.error("Error fetching table session:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch(
  "/table-session/:sessionId/close",
  requireAuth,
  async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const user = req.user;

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      const tableSessionData = await db
        .select()
        .from(tableSession)
        .where(eq(tableSession.id, sessionId))
        .limit(1);

      if (tableSessionData.length === 0) {
        return res.status(404).json({ message: "Table session not found" });
      }

      const restaurantId = tableSessionData[0].restaurantId;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      await db
        .update(tableSession)
        .set({
          status: "closed",
          endedAt: new Date(),
        })
        .where(eq(tableSession.id, sessionId));

      return res
        .status(200)
        .json({ message: "Table session closed successfully" });
    } catch (error) {
      console.error("Error closing table session:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);
export default router;
