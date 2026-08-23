import { Router } from "express";
import { db } from "../db/db.js";

import { reservations } from "../db/schema/reservations.js";
import { tables } from "../db/schema/tables.js";
import { restaurants } from "../db/schema/restaurants.js";
import { authUsers } from "../db/schema/auth-users.js";

import { and, eq, gte, lte, sql, desc } from "drizzle-orm";

import { requireAuth } from "../auth/requireAuth.js";
import {
  isRestaurantOwnerOrManager,
  isRestaurantOwnerManagerOrStaff,
} from "../lib/checkRoles.js";

import { sendNotification } from "../lib/sendNotification.js";
import { emitToRestaurant } from "../lib/socket.js";
import { reservationCache } from "../lib/reservation-cache.js";


const router = Router();

// GET /api/reservations/availability
router.get("/availability", async (req: any, res) => {
  try {
    const { restaurantId, date, time, guests } = req.query;

    if (!restaurantId || !date || !time || !guests) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const reservationDateTime = new Date(`${date}T${time}`);
    const startWindow = new Date(reservationDateTime.getTime() - 2 * 60 * 60 * 1000); // -2 hours
    const endWindow = new Date(reservationDateTime.getTime() + 2 * 60 * 60 * 1000); // +2 hours

    // 1. Get all tables with sufficient capacity (capacity >= requested guests)
    const allTables = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.restaurantId, restaurantId),
          gte(tables.capacity, parseInt(guests as string)),
          eq(tables.isActive, true)
        )
      );

    // 2. Get conflicting reservations
    // We check for reservations that start within +/- 2 hours of the requested time
    const conflictingReservations = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.restaurantId, restaurantId),
          sql`${reservations.status} IN ('confirmed', 'pending')`,
          gte(reservations.reservationTime, startWindow),
          lte(reservations.reservationTime, endWindow)
        )
      );

    const reservedTableIds = new Set(
      conflictingReservations
        .map((r) => r.tableId)
        .filter((id): id is string => !!id)
    );

    // 3. Filter available tables and sort by capacity (smallest suitable table first)
    const availableTables = allTables
      .map((table) => ({
        ...table,
        isAvailable: !reservedTableIds.has(table.id),
      }))
      .sort((a: any, b: any) => a.capacity - b.capacity); // Sort by capacity ascending

    return res.status(200).json({ tables: availableTables });
  } catch (error) {
    console.error("Error checking availability:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// POST /api/reservations/:reservationId/create
router.post("/:reservationId/create", requireAuth, async (req: any, res) => {
  console.log('🆕 POST /api/reservations/:reservationId/create - START');
  console.log('📥 Request params:', req.params);
  console.log('📥 Request body:', req.body);
  console.log('👤 User:', req.user);

  try {
    const user = req.user;
    const { reservationId } = req.params;
    const { tableId, restaurantId, numberOfGuests, reservationTime, reservationEndTime, occasion, specialRequests, guestName, guestPhone, guestEmail } = req.body;

    console.log('📊 Parsed data:', {
      reservationId,
      restaurantId,
      numberOfGuests,
      reservationTime,
      reservationEndTime,
      occasion,
      tableId: tableId || 'none',
      hasSpecialRequests: !!specialRequests,
      guestName,
      userId: user?.id
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('🔔 CREATE RESERVATION:', { reservationId, user: user.id, body: req.body });
    }

    // 1. AUTH CHECK
    console.log('🔐 Checking authentication...');
    if (!user) {
      console.log('❌ No user - 401');
      return res.status(401).json({ message: "Authentication required" });
    }
    console.log('✅ User authenticated:', user.id);

    // 2. CHECK AVAILABILITY (if tableId is provided)
    if (tableId) {
      console.log('🪑 Validating table and checking availability...');
      const rTime = new Date(reservationTime);
      const startWindow = new Date(rTime.getTime() - 2 * 60 * 60 * 1000);
      const endWindow = new Date(rTime.getTime() + 2 * 60 * 60 * 1000);

      console.log('⏰ Time window:', {
        requested: rTime.toISOString(),
        windowStart: startWindow.toISOString(),
        windowEnd: endWindow.toISOString()
      });

      const conflicts = await db.select().from(reservations).where(
        and(
          eq(reservations.tableId, tableId),
          sql`${reservations.status} IN ('confirmed', 'pending')`,
          gte(reservations.reservationTime, startWindow),
          lte(reservations.reservationTime, endWindow)
        )
      );

      console.log('⏰ Conflicts found:', conflicts.length);

      if (conflicts.length > 0) {
        console.log('❌ Table has conflicts:', conflicts);
        return res.status(409).json({ message: "Table is already reserved for this time" });
      }
      console.log('✅ No conflicts - table available');
    } else {
      console.log('ℹ️ No table specified - will be assigned later');
    }

    // 3. CREATE RESERVATION
    console.log('💾 Creating reservation in database...');
    const newReservation = await db
      .insert(reservations)
      .values({
        id: reservationId,
        restaurantId,
        numberOfGuests,
        reservationTime: new Date(reservationTime),
        reservationEndTime: reservationEndTime ? new Date(reservationEndTime) : null,
        occasion: occasion || null,
        reservedBy: user.id,
        specialRequests: specialRequests || null,
        tableId: tableId || null,
        guestName: guestName || null,
        guestPhone: guestPhone || null,
        guestEmail: guestEmail || null,
      })
      .returning();

    console.log('✅ Reservation created:', newReservation[0]);

    // 4. SEND NOTIFICATION TO RESTAURANT
    console.log('📧 Sending notification...');
    await sendNotification(
      restaurantId,
      `New reservation created by ${user.name} for ${numberOfGuests} guests.`,
      "order-update"
    );
    console.log('✅ Notification sent');

    // Emit WebSocket event for real-time update
    emitToRestaurant(restaurantId, 'reservation-created', {
      ...newReservation[0],
      guestName: guestName || user.name,
      guestEmail: guestEmail || user.email,
      guestPhone: guestPhone,
    });

    // Invalidate Cache
    reservationCache.invalidate(restaurantId);

    console.log('🏁 Reservation creation complete');
    return res.status(201).json({ message: "Reservation created successfully" });

  } catch (error) {
    console.error("Error creating reservation:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// POST /api/reservations/:reservationId/assign-table
router.post(
  "/:reservationId/assign-table",
  requireAuth,
  async (req: any, res) => {
    console.log('🪑 POST /api/reservations/:reservationId/assign-table - START');
    console.log('📥 Request params:', req.params);
    console.log('📥 Request body:', req.body);
    console.log('👤 User:', req.user?.id);

    try {
      const user = req.user;
      const { reservationId } = req.params;
      const { tableId, restaurantId, status } = req.body;

      console.log('📊 Parsed data:', {
        reservationId,
        tableId: tableId || 'none',
        restaurantId,
        status: status || 'confirmed',
        userId: user?.id
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('🪑 ASSIGN TABLE TO RESERVATION:', { reservationId, tableId, status, user: user.id });
      }

      // 1. AUTH CHECK
      console.log('🔐 Checking authentication...');
      if (!user) {
        console.log('❌ No user - 401');
        return res.status(401).json({ message: "Authentication required" });
      }
      console.log('✅ User authenticated:', user.id);

      console.log('🔐 Checking permissions...');
      const hasPermission = await isRestaurantOwnerManagerOrStaff(user.id, req.body.restaurantId);
      console.log('🔐 Permission check result:', hasPermission);

      if (!hasPermission) {
        console.log('❌ No permission - 403');
        return res
          .status(403)
          .json({ message: "You do not have permission to assign tables" });
      }
      console.log('✅ Permission granted');

      // 2. ASSIGN TABLE TO RESERVATION (if tableId provided)
      if (tableId) {
        console.log('🪑 Updating table status...');
        await db
          .update(tables)
          .set({
            isReserved: true,
            reservationId: reservationId,
            liveStatus: "reserved",
          })
          .where(eq(tables.id, tableId));

        console.log('✅ Table updated:', tableId);
      } else {
        console.log('ℹ️ No table to assign');
      }

      // 3. UPDATE RESERVATION STATUS
      console.log('💾 Updating reservation status...');
      await db
        .update(reservations)
        .set({
          status: status || "confirmed",
          ...(tableId ? { tableId } : {})
        })
        .where(eq(reservations.id, reservationId));

      console.log('✅ Reservation updated:', reservationId, 'status:', status || 'confirmed');

      // 3. SEND NOTIFICATION
      console.log('📧 Sending notification...');
      await sendNotification(
        req.body.restaurantId,
        `Reservation has been assigned to table ${tableId}.`,
        "order-update"
      );
      console.log('✅ Notification sent');

      // Invalidate Cache
      reservationCache.invalidate(restaurantId);

      console.log('🏁 Table assignment complete');
      return res.status(200).json({
        message: "Table assigned to reservation successfully",
      });
    } catch (error) {
      console.error("Error assigning table to reservation:", error);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

// GET /api/reservations/my
router.get("/my", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;

    // 1. AUTH CHECK
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // 2. FETCH USER RESERVATIONS WITH RESTAURANT AND TABLE INFO
    const userReservations = await db
      .select({
        id: reservations.id,
        restaurantId: reservations.restaurantId,
        restaurantName: restaurants.restaurantName,
        numberOfGuests: reservations.numberOfGuests,
        reservationTime: reservations.reservationTime,
        reservationEndTime: reservations.reservationEndTime,
        occasion: reservations.occasion,
        tableId: reservations.tableId,
        tableNumber: tables.tableNumber,
        specialRequests: reservations.specialRequests,
        status: reservations.status,
        createdAt: reservations.createdAt,
        guestNameOrig: reservations.guestName,
        guestEmailOrig: reservations.guestEmail,
        guestPhoneOrig: reservations.guestPhone,
        authName: authUsers.name,
        authEmail: authUsers.email,
      })
      .from(reservations)
      .leftJoin(restaurants, eq(reservations.restaurantId, restaurants.id))
      .leftJoin(tables, eq(reservations.tableId, tables.id))
      .leftJoin(authUsers, eq(reservations.reservedBy, authUsers.id))
      .where(eq(reservations.reservedBy, user.id))
      .orderBy(desc(reservations.reservationTime));

    const formattedReservations = userReservations.map(r => ({
      ...r,
      guestName: r.guestNameOrig || r.authName,
      guestEmail: r.guestEmailOrig || r.authEmail,
      guestPhone: r.guestPhoneOrig,
    }));

    return res.status(200).json({ reservations: formattedReservations });
  } catch (error) {
    console.error("Error fetching user reservations:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// GET /api/reservations/:reservationId
router.get("/:reservationId", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { reservationId } = req.params;

    // 1. AUTH CHECK
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // 2. FETCH RESERVATION DETAILS
    const reservation = (
      await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, reservationId))
        .limit(1)
    )[0];

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    // 3. AUTHORIZATION CHECK
    if (reservation.reservedBy !== user.id || !(await isRestaurantOwnerOrManager(user.id, reservation.restaurantId))) {
      return res
        .status(403)
        .json({ message: "You do not have access to this reservation" });
    }

    return res.status(200).json({ reservation });
  } catch (error) {
    console.error("Error fetching reservation details:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// GET /api/:restaurantId/reservations
router.get("/:restaurantId/reservations", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { restaurantId } = req.params;

    console.log('📋 GET RESTAURANT RESERVATIONS - START:', {
      restaurantId,
      userId: user?.id,
      hasUser: !!user
    });

    // 1. AUTH CHECK
    if (!user) {
      console.log('❌ No user - 401');
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log('🔐 Checking permissions for user:', user.id, 'restaurant:', restaurantId);
    const hasPermission = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    console.log('🔐 Permission check result:', hasPermission);

    if (!hasPermission) {
      console.log('❌ No permission - 403');
      return res
        .status(403)
        .json({ message: "You do not have permission to view reservations" });
    }

    // Check Cache
    const cached = reservationCache.get(restaurantId);
    if (cached.hit) {
      return res.status(200).json(cached.data);
    }

    // 2. FETCH RESTAURANT RESERVATIONS WITH USER INFO
    console.log('📡 Fetching reservations from database...');
    const restaurantReservations = await db
      .select({
        id: reservations.id,
        restaurantId: reservations.restaurantId,
        reservationTime: reservations.reservationTime,
        reservationEndTime: reservations.reservationEndTime,
        numberOfGuests: reservations.numberOfGuests,
        occasion: reservations.occasion,
        reservedBy: reservations.reservedBy,
        tableId: reservations.tableId,
        reservedAt: reservations.reservedAt,
        specialRequests: reservations.specialRequests,
        status: reservations.status,
        createdAt: reservations.createdAt,
        guestNameOrig: reservations.guestName,
        guestEmailOrig: reservations.guestEmail,
        guestPhoneOrig: reservations.guestPhone,
        authName: authUsers.name,
        authEmail: authUsers.email,
        // Add phone if it exists in your auth schema
      })
      .from(reservations)
      .leftJoin(authUsers, eq(reservations.reservedBy, authUsers.id))
      .where(eq(reservations.restaurantId, restaurantId));

    console.log('✅ Database query complete - Found:', restaurantReservations.length, 'reservations');

    const formattedReservations = restaurantReservations.map(r => ({
      ...r,
      guestName: r.guestNameOrig || r.authName,
      guestEmail: r.guestEmailOrig || r.authEmail,
      guestPhone: r.guestPhoneOrig,
      // Ensure any necessary transformations are done here
    }));

    const responseData = { reservations: formattedReservations };
    reservationCache.set(restaurantId, responseData);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("❌ Error fetching restaurant reservations:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});


// PATCH /api/reservations/:reservationId/cancel
router.patch("/:reservationId/cancel", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { reservationId } = req.params;

    // 1. AUTH CHECK
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // 2. CANCEL RESERVATION
    const result = await db
      .update(reservations)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.reservedBy, user.id)
        )
      )
      .returning();

    await sendNotification(
      req.body.restaurantId,
      `Reservation ${reservationId} has been cancelled by the user.`,
      "order-update"
    );

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "Reservation not found or not owned by user" });
    }

    await db
      .update(tables)
      .set({
        isReserved: false,
        reservationId: null,
        liveStatus: "available",
      })
      .where(eq(tables.reservationId, reservationId));

    // Invalidate Cache
    reservationCache.invalidate(req.body.restaurantId || result[0].restaurantId);

    return res.status(200).json({
      message: "Reservation cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// PATCH /api/reservations/:reservationId/reject
router.patch("/:reservationId/reject", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { reservationId } = req.params;
    const { restaurantId } = req.body;

    if (process.env.NODE_ENV !== 'production') {
      console.log('❌ REJECT RESERVATION:', { reservationId, restaurantId, user: user.id });
    }

    // 1. AUTH CHECK
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    // 2. RESERVATION CHECK
    if (!(await isRestaurantOwnerManagerOrStaff(user.id, restaurantId))) {
      return res
        .status(403)
        .json({ message: "You do not have permission to reject reservations" });
    }

    // 3. REJECT RESERVATION
    const result = await db
      .update(reservations)
      .set({ status: "rejected" })
      .where(eq(reservations.id, reservationId))
      .returning();

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Reservation rejected successfully');
    }

    await sendNotification(
      restaurantId,
      `Reservation ${reservationId} has been rejected.`,
      "order-update"
    );

    // Invalidate Cache
    reservationCache.invalidate(restaurantId);

    if (result.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    return res.status(200).json({
      message: "Reservation rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting reservation:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// PATCH /api/reservations/:reservationId/status
router.patch("/:reservationId/status", requireAuth, async (req: any, res) => {
  console.log('🔄 PATCH /api/reservations/:reservationId/status - START');
  console.log('📥 Request params:', req.params);
  console.log('📥 Request body:', req.body);
  console.log('👤 User:', req.user?.id);

  try {
    const user = req.user;
    const { reservationId } = req.params;
    const { restaurantId, status } = req.body;

    console.log('🔄 UPDATE RESERVATION STATUS:', {
      reservationId,
      restaurantId,
      newStatus: status,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    // 1. AUTH CHECK
    console.log('🔐 Checking authentication...');
    if (!user) {
      console.log('❌ No user - 401');
      return res.status(401).json({ message: "Authentication required" });
    }
    console.log('✅ User authenticated:', user.id);

    // 2. VALIDATE STATUS
    console.log('✔️ Validating status...');
    const validStatuses = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({ message: "Invalid status value" });
    }
    console.log('✅ Status valid:', status);

    // 3. PERMISSION CHECK
    console.log('🔐 Checking permissions...');
    const hasPermission = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    console.log('🔐 Permission check result:', hasPermission);

    if (!hasPermission) {
      console.log('❌ No permission - 403');
      return res
        .status(403)
        .json({ message: "You do not have permission to update reservation status" });
    }
    console.log('✅ Permission granted');

    // 4. UPDATE RESERVATION STATUS
    console.log('💾 Updating reservation status in database...');
    const result = await db
      .update(reservations)
      .set({ status })
      .where(eq(reservations.id, reservationId))
      .returning();

    console.log('📊 Update result:', result);

    if (result.length === 0) {
      console.log('❌ Reservation not found');
      return res.status(404).json({ message: "Reservation not found" });
    }
    console.log('✅ Reservation status updated');

    // 5. UPDATE TABLE STATUS IF NEEDED
    const reservation = result[0];
    console.log('🪑 Checking if table update needed...', {
      hasTableId: !!reservation.tableId,
      tableId: reservation.tableId,
      status
    });

    if (reservation.tableId) {
      if (status === 'cancelled' || status === 'rejected' || status === 'completed') {
        console.log('🪑 Freeing up table...');
        // Free up the table
        await db
          .update(tables)
          .set({
            isReserved: false,
            reservationId: null,
            liveStatus: "available",
          })
          .where(eq(tables.id, reservation.tableId));
        console.log('✅ Table freed:', reservation.tableId);
      } else if (status === 'confirmed') {
        console.log('🪑 Marking table as reserved...');
        // Mark table as reserved
        await db
          .update(tables)
          .set({
            isReserved: true,
            reservationId: reservationId,
            liveStatus: "reserved",
          })
          .where(eq(tables.id, reservation.tableId));
        console.log('✅ Table marked as reserved:', reservation.tableId);
      }
    } else {
      console.log('ℹ️ No table assigned to this reservation');
    }

    // 6. SEND NOTIFICATION
    console.log('📧 Sending notification...');
    const statusMessages: Record<string, string> = {
      confirmed: 'confirmed',
      pending: 'moved back to pending',
      rejected: 'rejected',
      completed: 'marked as completed',
      cancelled: 'cancelled'
    };

    await sendNotification(
      restaurantId,
      `Reservation ${reservationId} has been ${statusMessages[status]}.`,
      "order-update"
    );
    console.log('✅ Notification sent');

    // 7. EMIT WEBSOCKET EVENT
    console.log('📡 Emitting WebSocket event for reservation update...');
    emitToRestaurant(restaurantId, 'reservation-updated', {
      type: 'status-change',
      reservationId,
      status,
      reservation: result[0],
      timestamp: new Date().toISOString()
    });
    console.log('✅ WebSocket event emitted');

    // Invalidate Cache
    reservationCache.invalidate(restaurantId);

    console.log('🏁 Reservation status update complete');
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Reservation status updated successfully to:', status);
    }

    return res.status(200).json({
      message: "Reservation status updated successfully",
      reservation: result[0]
    });
  } catch (error) {
    console.error("❌ Error updating reservation status:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;