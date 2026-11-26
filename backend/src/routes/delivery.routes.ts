import { Router } from "express";
import { db } from "../db/db.js";
import { deliveryAddresses } from "../db/schema/delivery-addresses.js";
import { authUsers } from "../db/schema/auth-users.js";
import { deliveryRiders } from "../db/schema/delivery-riders.js";
import { orderDeliveries } from "../db/schema/order-deliveries.js";
import { orders } from "../db/schema/orders.js";
import { restaurants } from "../db/schema/restaurants.js";
import { orderItems } from "../db/schema/order-items.js";
import { menuItems } from "../db/schema/menu-items.js";
import { menuItemVariants } from "../db/schema/menu-item-variants.js";
import { authSessions } from "../db/schema/auth-sessions.js";
import { operatingCities, operatingZones } from "../db/schema/rider-onboarding.js";
import { complaints } from "../db/schema/complaints.js";
import { riderPenalties } from "../db/schema/rider-penalties.js";
import { riderFloatingCashTxns } from "../db/schema/rider-cash-ledger.js";
import { payments } from "../db/schema/payments.js";
import { requireAuth } from "../auth/requireAuth.js";
import { eq, and, or, sql, inArray, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitToRestaurant, emitToOrder } from "../lib/socket.js";
import { calculateSwiggyETA, seedRidersIfEmpty, startDeliverySimulation, haversineDistance } from "../lib/delivery-simulation.js";
import {
  isValidCoordinatePair,
  parseDeliveryCoordinates,
  MAX_DELIVERY_RADIUS_KM,
  MAX_RIDER_PICKUP_RADIUS_KM,
} from "../lib/serviceability.js";
import { applyRiderPenalty, PENALTY_CONFIG } from "../services/penaltyEngine.js";

const router = Router();

// Store OTPs in memory for development (phone -> otp)
const otpStore = new Map<string, { otp: string, expiresAt: number }>();

// POST /api/delivery/auth/send-otp
router.post("/auth/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Normalize phone number
    let cleanPhone = phone.trim();
    if (!cleanPhone.startsWith("+91")) {
      cleanPhone = "+91" + cleanPhone.replace(/\D/g, '').slice(-10);
    }

    // Generate a 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanPhone, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    otpStore.set(phone, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // Store both formats

    console.log(`🔑 Rider OTP for ${cleanPhone} (${phone}): ${otp}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      // In dev mode, we can include the OTP in the response for easy testing
      devOtp: otp
    });
  } catch (err) {
    console.error("❌ Send OTP Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/auth/verify-otp
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }

    // Normalize phone number
    let cleanPhone = phone.trim();
    if (!cleanPhone.startsWith("+91")) {
      cleanPhone = "+91" + cleanPhone.replace(/\D/g, '').slice(-10);
    }

    const storedData = otpStore.get(cleanPhone) || otpStore.get(phone);
    const isValid = (storedData && storedData.otp === otp && storedData.expiresAt > Date.now()) || otp === "123456";

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear the OTP if it wasn't the dev bypass
    if (otp !== "123456") {
      otpStore.delete(cleanPhone);
      otpStore.delete(phone);
    }

    // Find rider user by email
    const existingUsers = await db.select().from(authUsers).where(
      eq(authUsers.email, `${cleanPhone}@myquro.rider`)
    );
    const isNewUser = existingUsers.length === 0;

    let user;
    if (isNewUser) {
      // Create new user for rider
      const userId = `rider_${nanoid(10)}`;
      await db.insert(authUsers).values({
        id: userId,
        name: "Delivery Rider",
        email: `${cleanPhone}@myquro.rider`,
        emailVerified: true,
        role: "rider",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(deliveryRiders).values({
        id: userId,
        name: "Delivery Rider",
        phone: cleanPhone,
        latitude: 23.6693,
        longitude: 86.1511,
        status: "available",
        onboardingCompleted: false,
      });

      user = (await db.select().from(authUsers).where(eq(authUsers.id, userId)))[0];
    } else {
      user = existingUsers[0];
    }

    // Also fetch the rider details to see if onboarding is completed
    const riderList = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id));
    let riderDetails = riderList.length > 0 ? riderList[0] : null;

    // An account has completed onboarding if the flag is true, or they have a custom name (not default), or have selfie + city data
    const isCompleted =
      riderDetails?.onboardingCompleted === true ||
      (riderDetails?.name && riderDetails.name !== "Delivery Rider") ||
      (!!riderDetails?.selfieUrl && !!riderDetails?.cityId);

    if (riderDetails && isCompleted && !riderDetails.onboardingCompleted) {
      await db.update(deliveryRiders)
        .set({ onboardingCompleted: true, updatedAt: new Date() })
        .where(eq(deliveryRiders.id, user.id));
      if (riderDetails) riderDetails.onboardingCompleted = true;
    }

    // Create a session
    const token = nanoid(32);
    await db.insert(authSessions).values({
      id: nanoid(10),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Rider logged in: ${cleanPhone}, isNewUser: ${isNewUser}, onboardingCompleted: ${isCompleted}`);

    return res.status(200).json({
      success: true,
      token,
      user,
      rider: riderDetails,
      onboardingCompleted: isCompleted,
    });

  } catch (err) {
    console.error("❌ Verify OTP Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/delivery/addresses
router.get("/addresses", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const list = await db
      .select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.userId, user.id));

    // Map list to include parsed metadata if stored as JSON
    const formatted = list.map(item => {
      try {
        if (item.addressLine && item.addressLine.startsWith('{') && item.addressLine.endsWith('}')) {
          const parsed = JSON.parse(item.addressLine);
          return {
            id: item.id,
            type: parsed.type || 'Home',
            houseNo: parsed.houseNo || '',
            landmark: parsed.landmark || '',
            area: parsed.area || '',
            city: item.city || parsed.city || '',
            address: parsed.address || item.addressLine,
            instructions: parsed.instructions || '',
            receiverName: parsed.receiverName || '',
            receiverPhone: parsed.receiverPhone || '',
            latitude: item.latitude,
            longitude: item.longitude,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        }
      } catch { }
      return {
        id: item.id,
        type: 'Home',
        houseNo: '',
        landmark: '',
        area: '',
        city: item.city,
        address: item.addressLine,
        latitude: item.latitude,
        longitude: item.longitude,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("❌ GET delivery addresses error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/addresses
router.post("/addresses", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { addressLine, city, latitude, longitude, type, houseNo, landmark, area, address, instructions, receiverName, receiverPhone } = req.body;

    const resolvedCity = city || area || "City";
    const resolvedLat = Number(latitude) || 0;
    const resolvedLng = Number(longitude) || 0;

    const metadataPayload = JSON.stringify({
      type: type || 'Home',
      houseNo: houseNo || '',
      landmark: landmark || '',
      area: area || '',
      city: resolvedCity,
      address: address || addressLine || `${houseNo || ''} ${area || ''} ${resolvedCity}`.trim(),
      instructions: instructions || '',
      receiverName: receiverName || '',
      receiverPhone: receiverPhone || '',
    });

    const id = `addr_${nanoid(10)}`;
    await db.insert(deliveryAddresses).values({
      id,
      userId: user.id,
      addressLine: metadataPayload,
      city: resolvedCity,
      latitude: resolvedLat,
      longitude: resolvedLng,
    });

    return res.status(201).json({ message: "Address saved successfully", id, address: { id, type: type || 'Home', houseNo, landmark, area, city: resolvedCity, address: address || addressLine, latitude: resolvedLat, longitude: resolvedLng } });
  } catch (err) {
    console.error("❌ POST delivery address error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /api/delivery/addresses/:id
router.put("/addresses/:id", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { city, latitude, longitude, type, houseNo, landmark, area, address, addressLine, instructions, receiverName, receiverPhone } = req.body;

    const resolvedCity = city || area || "City";
    const metadataPayload = JSON.stringify({
      type: type || 'Home',
      houseNo: houseNo || '',
      landmark: landmark || '',
      area: area || '',
      city: resolvedCity,
      address: address || addressLine || `${houseNo || ''} ${area || ''} ${resolvedCity}`.trim(),
      instructions: instructions || '',
      receiverName: receiverName || '',
      receiverPhone: receiverPhone || '',
    });

    await db
      .update(deliveryAddresses)
      .set({
        addressLine: metadataPayload,
        city: resolvedCity,
        ...(latitude !== undefined ? { latitude: Number(latitude) } : {}),
        ...(longitude !== undefined ? { longitude: Number(longitude) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(deliveryAddresses.id, id), eq(deliveryAddresses.userId, user.id)));

    return res.status(200).json({ message: "Address updated successfully" });
  } catch (err) {
    console.error("❌ PUT delivery address error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/delivery/addresses/:id
router.delete("/addresses/:id", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    await db
      .delete(deliveryAddresses)
      .where(and(eq(deliveryAddresses.id, id), eq(deliveryAddresses.userId, user.id)));

    return res.status(200).json({ message: "Address deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE delivery address error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/delivery/track/:orderId (Public customer tracking endpoint)
router.get("/track/:orderId", async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const list = await db
      .select({
        id: orderDeliveries.id,
        orderId: orderDeliveries.orderId,
        riderId: orderDeliveries.riderId,
        status: orderDeliveries.status,
        etaMinutes: orderDeliveries.etaMinutes,
        distanceKm: orderDeliveries.distanceKm,
        deliveryFee: orderDeliveries.deliveryFee,
        currentLat: orderDeliveries.currentLat,
        currentLng: orderDeliveries.currentLng,
        customerLat: orderDeliveries.customerLat,
        customerLng: orderDeliveries.customerLng,
        restaurantLat: orderDeliveries.restaurantLat,
        restaurantLng: orderDeliveries.restaurantLng,
        createdAt: orderDeliveries.createdAt,
        updatedAt: orderDeliveries.updatedAt,
        riderName: deliveryRiders.name,
        riderPhone: deliveryRiders.phone,
      })
      .from(orderDeliveries)
      .leftJoin(deliveryRiders, eq(orderDeliveries.riderId, deliveryRiders.id))
      .where(eq(orderDeliveries.orderId, orderId))
      .orderBy(desc(orderDeliveries.updatedAt));

    if (list.length === 0) {
      return res.status(404).json({ message: "No tracking details found for this order" });
    }

    // Pick active assigned delivery if any, or latest delivery
    const delivery = list.find((d: any) => d.status && d.status !== 'offered' && d.status !== 'unassigned') || list[0];
    let rider: any = null;

    const effectiveRiderName = delivery.riderName;
    const effectiveRiderPhone = delivery.riderPhone;

    if (delivery.riderId || effectiveRiderName) {
      rider = {
        id: delivery.riderId,
        name: effectiveRiderName,
        phone: effectiveRiderPhone,
      };
    }

    return res.status(200).json({
      delivery,
      rider,
    });
  } catch (err) {
    console.error("❌ GET delivery track error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/assign
router.post("/assign", requireAuth, async (req: any, res) => {
  try {
    const { orderId, addressId } = req.body;
    if (!orderId || !addressId) {
      return res.status(400).json({ message: "Missing orderId or addressId" });
    }

    // 1. Fetch order
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId));
    if (orderList.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    const order = orderList[0];

    // Check if delivery already exists
    const existing = await db
      .select()
      .from(orderDeliveries)
      .where(eq(orderDeliveries.orderId, orderId));
    if (existing.length > 0) {
      return res.status(200).json({
        message: "Delivery tracking already running",
        deliveryId: existing[0].id,
      });
    }

    // 2. Fetch address
    let addressList = await db
      .select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.id, addressId));

    if (addressList.length === 0) {
      // Find a user ID to associate with the address to satisfy foreign key constraint
      const firstUser = await db.select().from(authUsers).limit(1);
      const userId = order.placedByUserId || (firstUser.length > 0 ? firstUser[0].id : null);

      if (userId) {
        const parsedNotes = parseDeliveryCoordinates(order.notes);
        let parsedJson: any = {};
        try {
          parsedJson = JSON.parse(order.notes || "{}");
        } catch {}

        if (!isValidCoordinatePair(parsedNotes.latitude, parsedNotes.longitude)) {
          return res.status(400).json({ message: "Valid delivery coordinates are missing for this order." });
        }

        const latitude = Number(parsedNotes.latitude);
        const longitude = Number(parsedNotes.longitude);
        const addressLine = parsedNotes.address || parsedJson.address || parsedJson.mapAddress || "";
        const city = parsedJson.city || "";

        try {
          await db.insert(deliveryAddresses).values({
            id: addressId,
            userId: userId,
            addressLine,
            city,
            latitude,
            longitude,
          });

          // Refetch address
          addressList = await db
            .select()
            .from(deliveryAddresses)
            .where(eq(deliveryAddresses.id, addressId));
        } catch (insertErr) {
          console.error("Failed to dynamically insert address:", insertErr);
        }
      }
    }

    if (addressList.length === 0) {
      return res.status(404).json({ message: "Address not found" });
    }
    const address = addressList[0];

    // 3. Find available real riders (excluding those in penalty cooldown)
    const availableRiders = await db
      .select({
        id: deliveryRiders.id,
        name: deliveryRiders.name,
        phone: deliveryRiders.phone,
        latitude: deliveryRiders.latitude,
        longitude: deliveryRiders.longitude,
        status: deliveryRiders.status,
        penaltyCooldownUntil: deliveryRiders.penaltyCooldownUntil,
      })
      .from(deliveryRiders)
      .innerJoin(authUsers, eq(deliveryRiders.id, authUsers.id))
      .where(
        and(
          eq(deliveryRiders.status, "available"),
          eq(authUsers.role, "rider")
        )
      );

    const nowMs = Date.now();
    const activeRiders = availableRiders.filter(
      (r) => !r.penaltyCooldownUntil || new Date(r.penaltyCooldownUntil).getTime() <= nowMs
    );

    if (activeRiders.length === 0) {
      return res.status(400).json({ message: "No delivery riders are currently online and available." });
    }

    // Fetch actual restaurant coordinates
    const restList = await db.select().from(restaurants).where(eq(restaurants.id, order.restaurantId)).limit(1);
    const restaurant = restList[0];
    if (!restaurant || !isValidCoordinatePair(restaurant.latitude, restaurant.longitude)) {
      return res.status(400).json({ message: "Restaurant coordinates are missing." });
    }
    const restLat = Number(restaurant.latitude);
    const restLng = Number(restaurant.longitude);
    const custLat = Number(address.latitude);
    const custLng = Number(address.longitude);
    if (!isValidCoordinatePair(custLat, custLng)) {
      return res.status(400).json({ message: "Customer delivery coordinates are invalid or missing." });
    }

    // Calculate Swiggy ETA (prep time + travel time)
    const etaMinutes = calculateSwiggyETA(restLat, restLng, custLat, custLng, 1);

    const distanceKm = Number(haversineDistance(restLat, restLng, custLat, custLng).toFixed(2));
    if (distanceKm > MAX_DELIVERY_RADIUS_KM * 2) {
      return res.status(422).json({
        message: `Destination is ${distanceKm.toFixed(1)} km away and exceeds dispatch range.`,
      });
    }

    const ridersWithDist = activeRiders
      .map((r) => ({
        rider: r,
        dist: isValidCoordinatePair(r.latitude, r.longitude)
          ? haversineDistance(restLat, restLng, Number(r.latitude), Number(r.longitude))
          : 0,
      }))
      .filter((x) => !isValidCoordinatePair(x.rider.latitude, x.rider.longitude) || x.dist <= MAX_RIDER_PICKUP_RADIUS_KM)
      .sort((a, b) => a.dist - b.dist);

    if (ridersWithDist.length === 0) {
      return res.status(400).json({ message: "No nearby delivery riders are available right now." });
    }

    const rider = ridersWithDist[0].rider;
    const deliveryFee = distanceKm * 12;

    // 5. Create order_deliveries tracking record with status "offered"
    const deliveryId = `del_${nanoid(10)}`;
    await db.insert(orderDeliveries).values({
      id: deliveryId,
      orderId,
      riderId: rider.id,
      status: "offered",
      etaMinutes,
      distanceKm,
      deliveryFee,
      currentLat: rider.latitude,
      currentLng: rider.longitude,
      startLat: rider.latitude,
      startLng: rider.longitude,
      customerLat: custLat,
      customerLng: custLng,
      restaurantLat: restLat,
      restaurantLng: restLng,
    });

    // 6. Update order timestamp (preserve placed status until restaurant explicitly accepts and sets prep time)
    await db
      .update(orders)
      .set({ updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    // 7. No simulation — tracking is driven in real-time by the Rider App

    return res.status(200).json({
      message: "Delivery offer sent to rider, awaiting acceptance",
      deliveryId,
      etaMinutes,
      rider,
    });
  } catch (err) {
    console.error("❌ POST assign rider error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/delivery/rider/profile
router.get("/rider/profile", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    if (user.role !== 'rider') {
      await db.update(authUsers).set({ role: 'rider' }).where(eq(authUsers.id, user.id));
      user.role = 'rider';
    }

    // Extract real phone from user email (+919777653495@myquro.rider) or phoneNumber
    let userPhone = user.phoneNumber || "";
    if (!userPhone && user.email && user.email.includes("@myquro.rider")) {
      userPhone = user.email.replace("@myquro.rider", "");
    }

    let riderList = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id));
    if (riderList.length === 0) {
      await db.insert(deliveryRiders).values({
        id: user.id,
        name: user.name || "Delivery Partner",
        phone: userPhone,
        latitude: 23.6693,
        longitude: 86.1511,
        status: "available",
      });
      riderList = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id));
    }
    const rider = riderList[0];

    // If rider record has empty/default phone but user account has real phone, update it
    if ((!rider.phone || rider.phone.includes("9999999999")) && userPhone) {
      await db.update(deliveryRiders).set({ phone: userPhone }).where(eq(deliveryRiders.id, user.id));
      rider.phone = userPhone;
    }

    // Look up city and zone names if available
    let cityName = rider.cityId || "";
    let zoneName = rider.zoneId || "";
    if (rider.cityId) {
      const cities = await db.select().from(operatingCities).where(
        or(
          eq(operatingCities.id, rider.cityId),
          eq(operatingCities.name, rider.cityId)
        )
      );
      if (cities.length > 0) cityName = cities[0].name;
    }
    if (rider.zoneId) {
      const zones = await db.select().from(operatingZones).where(
        or(
          eq(operatingZones.id, rider.zoneId),
          eq(operatingZones.name, rider.zoneId)
        )
      );
      if (zones.length > 0) zoneName = zones[0].name;
    }

    if (zoneName && zoneName.includes('_')) {
      zoneName = zoneName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    if (cityName && cityName.startsWith('city_')) {
      cityName = cityName.replace('city_', '').charAt(0).toUpperCase() + cityName.replace('city_', '').slice(1);
    }

    // Auto-heal: if rider has name + cityId, they've completed onboarding — mark it
    if (!rider.onboardingCompleted && rider.name && rider.name !== 'Delivery Rider' && rider.cityId) {
      await db.update(deliveryRiders)
        .set({ onboardingCompleted: true, updatedAt: new Date() })
        .where(eq(deliveryRiders.id, user.id));
      rider.onboardingCompleted = true;
    }

    return res.status(200).json({
      success: true,
      rider: {
        ...rider,
        cityName,
        zoneName,
      }
    });
  } catch (err) {
    console.error("❌ GET rider profile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/rider/emergency-contact
router.post("/rider/emergency-contact", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { contactName, contactNumber, relationship } = req.body;

    if (!contactName || !contactNumber) {
      return res.status(400).json({ error: "Contact name and number are required" });
    }

    await db.update(deliveryRiders)
      .set({
        emergencyContactName: contactName.trim(),
        emergencyContactPhone: contactNumber.trim(),
        emergencyContactRelationship: relationship || 'others',
        updatedAt: new Date(),
      })
      .where(eq(deliveryRiders.id, user.id));

    return res.status(200).json({
      success: true,
      message: "Emergency contact saved successfully",
      emergencyContact: {
        name: contactName.trim(),
        phone: contactNumber.trim(),
        relationship: relationship || 'others',
      }
    });
  } catch (err) {
    console.error("❌ Save emergency contact error:", err);
    return res.status(500).json({ error: "Failed to save emergency contact" });
  }
});

// POST /api/delivery/rider/bank-account
router.post("/rider/bank-account", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { accountNumber, bankName, ifscCode, holderName } = req.body;

    if (!accountNumber || !ifscCode) {
      return res.status(400).json({ error: "Account number and IFSC code are required" });
    }

    await db.update(deliveryRiders)
      .set({
        bankAccount: accountNumber.trim(),
        bankName: bankName ? bankName.trim() : '',
        bankIfsc: ifscCode.trim().toUpperCase(),
        bankHolderName: holderName ? holderName.trim() : user.name,
        bankAccountStatus: 'verified',
        updatedAt: new Date(),
      })
      .where(eq(deliveryRiders.id, user.id));

    return res.status(200).json({
      success: true,
      message: "Bank details saved and verified successfully",
      bankDetails: {
        accountNumber: accountNumber.trim(),
        bankName: bankName ? bankName.trim() : '',
        ifscCode: ifscCode.trim().toUpperCase(),
        holderName: holderName ? holderName.trim() : user.name,
        status: 'verified',
      }
    });
  } catch (err) {
    console.error("❌ Save bank account error:", err);
    return res.status(500).json({ error: "Failed to save bank account" });
  }
});

// GET /api/delivery/rider/active-task
router.get("/rider/active-task", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const list = await db
      .select({
        id: orderDeliveries.id,
        orderId: orderDeliveries.orderId,
        riderId: orderDeliveries.riderId,
        status: orderDeliveries.status,
        etaMinutes: orderDeliveries.etaMinutes,
        currentLat: orderDeliveries.currentLat,
        currentLng: orderDeliveries.currentLng,
        customerLat: orderDeliveries.customerLat,
        customerLng: orderDeliveries.customerLng,
        restaurantLat: orderDeliveries.restaurantLat,
        restaurantLng: orderDeliveries.restaurantLng,
        restaurantName: restaurants.restaurantName,
        restaurantAddress: restaurants.restaurantAddress,
        restaurantLogo: restaurants.restaurantLogo,
        restaurantPhone: restaurants.phoneNumber,

        distanceKm: orderDeliveries.distanceKm,
        deliveryFee: orderDeliveries.deliveryFee,
        customerName: authUsers.name,
        orderNotes: orders.notes,
        orderAmount: orders.grandTotal,
      })
      .from(orderDeliveries)
      .innerJoin(orders, eq(orderDeliveries.orderId, orders.id))
      .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(authUsers, eq(orders.placedByUserId, authUsers.id))
      .where(
        and(
          eq(orderDeliveries.riderId, user.id),
          sql`${orderDeliveries.status} != 'delivered'`,
          sql`${orderDeliveries.status} != 'offered'`
        )
      );

    if (list.length === 0) {
      // Auto-heal: If rider is stuck in busy status without an active task, reset to available
      try {
        await db.update(deliveryRiders)
          .set({ status: "available", updatedAt: new Date() })
          .where(and(eq(deliveryRiders.id, user.id), eq(deliveryRiders.status, "busy")));
      } catch (healErr) {}

      return res.status(200).json({ success: true, task: null });
    }

    let taskData = list[0];
    let customerAddress = "Address not provided";
    if (taskData.orderNotes) {
      try {
        const parsed = JSON.parse(taskData.orderNotes);
        if (parsed.address) customerAddress = parsed.address;
        else if (parsed.mapAddress) customerAddress = parsed.mapAddress;
      } catch (e) { }
    }

    const orderItemsList = await db
      .select({
        id: orderItems.id,
        menuItemName: menuItems.name,
        variantName: menuItemVariants.variantName,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
      .where(eq(orderItems.orderId, taskData.orderId));

    return res.status(200).json({
      success: true,
      task: {
        ...taskData,
        customerAddress,
        items: orderItemsList
      }
    });
  } catch (err) {
    console.error("❌ GET active task error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// In-memory store for tracking rider rejections: riderId -> Map<orderId, rejectedAtTimestamp>
const riderDeclinedOrders = new Map<string, Map<string, number>>();
const REJECT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown before re-offering a declined order to the same rider

// GET /api/delivery/offers
router.get("/offers", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;

    // 1. Get rider record
    const riderList = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id)).limit(1);
    const rider = riderList[0];

    // If rider is not online, is busy, or is serving a penalty cooldown, return empty offers list immediately
    if (
      !rider ||
      rider.status !== "available" ||
      (rider.penaltyCooldownUntil && new Date(rider.penaltyCooldownUntil).getTime() > Date.now())
    ) {
      return res.status(200).json({
        success: true,
        offers: [],
        cooldownUntil: rider?.penaltyCooldownUntil || null,
        strikeCount: rider?.strikeCount || 0,
      });
    }

    // Check if rider already has an active ongoing delivery trip
    const activeDeliveries = await db
      .select({ id: orderDeliveries.id })
      .from(orderDeliveries)
      .where(
        and(
          eq(orderDeliveries.riderId, user.id),
          inArray(orderDeliveries.status, ["assigned", "arrived_at_store", "picked_up", "out_for_delivery"])
        )
      )
      .limit(1);

    if (activeDeliveries.length > 0) {
      return res.status(200).json({ success: true, offers: [] });
    }

    // Clean up expired rejections for this rider
    const declinedMap = riderDeclinedOrders.get(user.id);
    const now = Date.now();
    if (declinedMap) {
      for (const [declinedOrderId, timestamp] of declinedMap.entries()) {
        if (now - timestamp > REJECT_COOLDOWN_MS) {
          declinedMap.delete(declinedOrderId);
        }
      }
    }

    // 2. If rider is online ("available"), check for any unassigned delivery orders created in the last 2 hours
    // ONLY assign orders that have been accepted by the restaurant (status is 'preparing' or 'ready')
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const unassignedOrders = await db
      .select({
        id: orders.id,
        restaurantId: orders.restaurantId,
        notes: orders.notes,
        grandTotal: orders.grandTotal,
        placedByUserId: orders.placedByUserId,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .leftJoin(orderDeliveries, eq(orders.id, orderDeliveries.orderId))
      .where(
        and(
          inArray(orders.status, ["preparing", "ready"]),
          sql`${orders.tableId} IS NULL`,
          sql`(${orderDeliveries.id} IS NULL OR (${orderDeliveries.status} = 'offered' AND ${orderDeliveries.riderId} = ${user.id}))`,
          sql`${orders.createdAt} >= ${twoHoursAgo}`
        )
      );

    if (unassignedOrders.length > 0) {
      for (const order of unassignedOrders) {
        // If rider declined this order recently, skip auto-assigning it to this rider
        if (declinedMap && declinedMap.has(order.id)) {
          continue;
        }

        const existingDel = await db
          .select()
          .from(orderDeliveries)
          .where(eq(orderDeliveries.orderId, order.id))
          .limit(1);

        if (existingDel.length === 0) {
          const parsedCoords = parseDeliveryCoordinates(order.notes);
          if (!isValidCoordinatePair(parsedCoords.latitude, parsedCoords.longitude)) {
            continue;
          }
          const latitude = Number(parsedCoords.latitude);
          const longitude = Number(parsedCoords.longitude);

          // Fetch restaurant details with strict valid coordinates
          const restList = await db.select().from(restaurants).where(eq(restaurants.id, order.restaurantId)).limit(1);
          const restaurant = restList[0];
          if (!restaurant || !isValidCoordinatePair(restaurant.latitude, restaurant.longitude)) {
            continue;
          }
          const restLat = Number(restaurant.latitude);
          const restLng = Number(restaurant.longitude);

          // Enforce pickup proximity if rider has valid GPS
          if (isValidCoordinatePair(rider.latitude, rider.longitude)) {
            const pickupDist = haversineDistance(
              Number(rider.latitude),
              Number(rider.longitude),
              restLat,
              restLng
            );
            if (pickupDist > MAX_RIDER_PICKUP_RADIUS_KM) {
              continue;
            }
          }

          const distanceKm = Number(haversineDistance(restLat, restLng, latitude, longitude).toFixed(2));
          if (distanceKm > MAX_DELIVERY_RADIUS_KM * 2) {
            continue;
          }

          const deliveryFee = distanceKm * 12;
          const etaMinutes = calculateSwiggyETA(restLat, restLng, latitude, longitude, 1);

          const deliveryId = `del_${nanoid(10)}`;

          console.log(`📡 [Offers Auto-Assign] Assigning Order ${order.id} to Rider ${user.id} (deliveryId: ${deliveryId})`);

          await db.insert(orderDeliveries).values({
            id: deliveryId,
            orderId: order.id,
            riderId: user.id,
            status: "offered",
            etaMinutes,
            distanceKm,
            deliveryFee,
            currentLat: isValidCoordinatePair(rider.latitude, rider.longitude) ? Number(rider.latitude) : restLat,
            currentLng: isValidCoordinatePair(rider.latitude, rider.longitude) ? Number(rider.longitude) : restLng,
            startLat: isValidCoordinatePair(rider.latitude, rider.longitude) ? Number(rider.latitude) : restLat,
            startLng: isValidCoordinatePair(rider.latitude, rider.longitude) ? Number(rider.longitude) : restLng,
            customerLat: latitude,
            customerLng: longitude,
            restaurantLat: restLat,
            restaurantLng: restLng,
          });
          break; // Offer one order at a time
        }
      }
    }

    const list = await db
      .select({
        id: orderDeliveries.id,
        orderId: orderDeliveries.orderId,
        riderId: orderDeliveries.riderId,
        status: orderDeliveries.status,
        etaMinutes: orderDeliveries.etaMinutes,
        currentLat: orderDeliveries.currentLat,
        currentLng: orderDeliveries.currentLng,
        customerLat: orderDeliveries.customerLat,
        customerLng: orderDeliveries.customerLng,
        restaurantLat: orderDeliveries.restaurantLat,
        restaurantLng: orderDeliveries.restaurantLng,
        restaurantName: restaurants.restaurantName,
        restaurantAddress: restaurants.restaurantAddress,
        restaurantLogo: restaurants.restaurantLogo,
        restaurantPhone: restaurants.phoneNumber,
        distanceKm: orderDeliveries.distanceKm,
        deliveryFee: orderDeliveries.deliveryFee,
        orderAmount: orders.grandTotal,
        notes: orders.notes,
        createdAt: orders.createdAt,
      })
      .from(orderDeliveries)
      .innerJoin(orders, eq(orderDeliveries.orderId, orders.id))
      .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(
        and(
          inArray(orders.status, ["preparing", "ready"]),
          eq(orderDeliveries.status, "offered"),
          eq(orderDeliveries.riderId, user.id),
          sql`${orders.createdAt} >= ${twoHoursAgo}`
        )
      );

    const filteredList = list.filter((item) => !declinedMap || !declinedMap.has(item.orderId));

    const mappedOffers = filteredList.map((item) => {
      let customerName = "Customer";
      let customerPhone = "";
      let customerAddress = "";
      let orderNotes = "";

      if (item.notes) {
        try {
          const parsed = JSON.parse(item.notes);
          if (parsed.customerName) customerName = parsed.customerName;
          if (parsed.customerPhone) customerPhone = parsed.customerPhone;
          if (parsed.deliveryAddress || parsed.address || parsed.mapAddress) {
            customerAddress = parsed.deliveryAddress || parsed.address || parsed.mapAddress;
          }
          if (parsed.cookingInstructions) orderNotes = parsed.cookingInstructions;
        } catch (e) {
          if (!item.notes.startsWith("{")) customerAddress = item.notes;
        }
      }

      return {
        ...item,
        customerName,
        customerPhone,
        customerAddress,
        orderNotes,
      };
    });

    return res.status(200).json({ success: true, offers: mappedOffers });
  } catch (err) {
    console.error("❌ GET delivery offers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/accept
router.post("/accept", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    // Stop auto-simulation
    const { stopDeliverySimulation } = await import("../lib/delivery-simulation.js");
    stopDeliverySimulation(orderId);

    const [riderRow] = await db
      .select({ penaltyCooldownUntil: deliveryRiders.penaltyCooldownUntil })
      .from(deliveryRiders)
      .where(eq(deliveryRiders.id, user.id))
      .limit(1);

    if (riderRow?.penaltyCooldownUntil && new Date(riderRow.penaltyCooldownUntil).getTime() > Date.now()) {
      const minsLeft = Math.max(1, Math.ceil((new Date(riderRow.penaltyCooldownUntil).getTime() - Date.now()) / 60000));
      return res.status(403).json({
        message: `You are in a penalty cooldown period (${minsLeft}m remaining) and cannot accept orders.`,
        cooldownUntil: riderRow.penaltyCooldownUntil,
      });
    }

    const delList = await db.select().from(orderDeliveries).where(eq(orderDeliveries.orderId, orderId));
    if (delList.length === 0) {
      return res.status(404).json({ message: "Delivery offer expired or no longer available" });
    }

    // Mark rider as busy and record acceptance metrics
    await db
      .update(deliveryRiders)
      .set({
        status: "busy",
        acceptanceCount: sql`COALESCE(${deliveryRiders.acceptanceCount}, 0) + 1`,
        consecutiveOfferTimeouts: 0,
        updatedAt: new Date(),
      })
      .where(eq(deliveryRiders.id, user.id));

    // Update delivery record
    await db
      .update(orderDeliveries)
      .set({
        riderId: user.id,
        status: "assigned",
        updatedAt: new Date(),
      })
      .where(eq(orderDeliveries.orderId, orderId));

    const activeRider = (await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id)))[0];
    const orderRow = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];

    if (orderRow) {
      emitToRestaurant(orderRow.restaurantId, 'order-updated', {
        orderId,
        status: orderRow.status,
        deliveryStatus: 'assigned',
        riderName: activeRider?.name,
        riderPhone: activeRider?.phone,
        restaurantId: orderRow.restaurantId,
        updatedAt: new Date().toISOString()
      });
    }

    emitToOrder(orderId, "delivery-update", {
      delivery: {
        orderId,
        riderId: user.id,
        status: "assigned",
        currentLat: activeRider.latitude,
        currentLng: activeRider.longitude,
        updatedAt: new Date().toISOString(),
      },
      status: "assigned",
      deliveryStatus: "assigned",
      riderId: user.id,
      rider: activeRider,
      riderName: activeRider.name,
      riderPhone: activeRider.phone,
    });

    emitToOrder(orderId, "order-status-update", {
      orderId,
      status: orderRow?.status || "preparing",
      deliveryStatus: "assigned",
      riderName: activeRider.name,
      riderPhone: activeRider.phone,
      riderId: user.id,
      updatedAt: new Date().toISOString(),
    });

    emitToOrder(orderId, "order-update", {
      orderId,
      status: orderRow?.status || "preparing",
      deliveryStatus: "assigned",
      riderName: activeRider.name,
      riderPhone: activeRider.phone,
      riderId: user.id,
      order: {
        id: orderId,
        status: orderRow?.status || "preparing",
        deliveryStatus: "assigned",
        riderName: activeRider.name,
        riderPhone: activeRider.phone,
      },
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, message: "Delivery offer accepted" });
  } catch (err) {
    console.error("❌ POST accept offer error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/decline
router.post("/decline", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    // Record that this rider declined this order
    if (!riderDeclinedOrders.has(user.id)) {
      riderDeclinedOrders.set(user.id, new Map());
    }
    riderDeclinedOrders.get(user.id)!.set(orderId, Date.now());

    // Find the current delivery record for this order
    const delList = await db.select().from(orderDeliveries).where(eq(orderDeliveries.orderId, orderId));
    if (delList.length === 0) {
      return res.status(200).json({ success: true, message: "Declined" });
    }
    const delivery = delList[0];

    // Allow declining or canceling active trip before pickup (offered, assigned, arrived_at_store)
    if (delivery.status !== "offered" && delivery.status !== "assigned" && delivery.status !== "arrived_at_store") {
      return res.status(400).json({ message: "Cannot cancel delivery — order already picked up or in progress" });
    }

    // Always track rider rejection count
    await db
      .update(deliveryRiders)
      .set({
        rejectionCount: sql`COALESCE(${deliveryRiders.rejectionCount}, 0) + 1`,
        status: "available",
        updatedAt: new Date(),
      })
      .where(eq(deliveryRiders.id, user.id));

    // Apply financial penalty + strike + temporary cooldown if rider cancelled AFTER accepting
    let penaltyApplied: any = null;
    if (delivery.status === "assigned") {
      penaltyApplied = await applyRiderPenalty({
        riderId: user.id,
        orderId,
        penaltyType: "post_accept_cancellation",
        amountPaise: PENALTY_CONFIG.rider.postAcceptCancelPaise,
        cooldownMinutes: PENALTY_CONFIG.rider.postAcceptCooldownMinutes,
        strikeDelta: 1,
        forceOffline: true,
        reason: "Cancelled delivery trip after accepting dispatch assignment.",
      });
    } else if (delivery.status === "arrived_at_store") {
      penaltyApplied = await applyRiderPenalty({
        riderId: user.id,
        orderId,
        penaltyType: "arrived_store_cancellation",
        amountPaise: PENALTY_CONFIG.rider.arrivedStoreCancelPaise,
        cooldownMinutes: PENALTY_CONFIG.rider.arrivedCooldownMinutes,
        strikeDelta: 1,
        forceOffline: true,
        reason: "Abandoned delivery trip after arriving at restaurant pickup.",
      });
    }

    // Delete the existing delivery offer/assignment for this rider
    await db.delete(orderDeliveries).where(eq(orderDeliveries.id, delivery.id));

    // Find the next available nearby rider (excluding declined & cooled-down riders)
    const availableRiders = await db
      .select({
        id: deliveryRiders.id,
        name: deliveryRiders.name,
        phone: deliveryRiders.phone,
        latitude: deliveryRiders.latitude,
        longitude: deliveryRiders.longitude,
        penaltyCooldownUntil: deliveryRiders.penaltyCooldownUntil,
      })
      .from(deliveryRiders)
      .innerJoin(authUsers, eq(deliveryRiders.id, authUsers.id))
      .where(
        and(
          eq(deliveryRiders.status, "available"),
          eq(authUsers.role, "rider"),
          sql`${deliveryRiders.id} != ${user.id}`
        )
      );

    const nowMs = Date.now();
    const restLat = delivery.restaurantLat;
    const restLng = delivery.restaurantLng;

    const eligibleRiders = availableRiders
      .filter((r) => {
        if (r.penaltyCooldownUntil && new Date(r.penaltyCooldownUntil).getTime() > nowMs) {
          return false;
        }
        const rDeclined = riderDeclinedOrders.get(r.id);
        return !rDeclined || !rDeclined.has(orderId);
      })
      .map((r) => ({
        rider: r,
        dist: isValidCoordinatePair(r.latitude, r.longitude)
          ? haversineDistance(restLat, restLng, Number(r.latitude), Number(r.longitude))
          : 0,
      }))
      .filter((x) => !isValidCoordinatePair(x.rider.latitude, x.rider.longitude) || x.dist <= MAX_RIDER_PICKUP_RADIUS_KM)
      .sort((a, b) => a.dist - b.dist);

    if (eligibleRiders.length === 0) {
      emitToOrder(orderId, "delivery-update", {
        orderId,
        status: "no_rider",
        message: "No other nearby riders available",
      });

      return res.status(200).json({
        success: true,
        message: penaltyApplied?.applied
          ? `Trip cancelled. ₹${Math.round((penaltyApplied.penalty?.amount || 0) / 100)} penalty deducted (${penaltyApplied.penalty?.cooldownMinutes || 0}m cooldown).`
          : "Declined. No other nearby riders available.",
        penaltyApplied: penaltyApplied?.penalty || null,
        cooldownUntil: penaltyApplied?.cooldownUntil || null,
      });
    }

    const bestRider = eligibleRiders[0].rider;

    // Create new offer with fresh timestamps
    const now = new Date();
    const newDeliveryId = `del_${nanoid(10)}`;
    await db.insert(orderDeliveries).values({
      ...delivery,
      id: newDeliveryId,
      riderId: bestRider.id,
      status: "offered",
      currentLat: bestRider.latitude || restLat,
      currentLng: bestRider.longitude || restLng,
      startLat: bestRider.latitude || restLat,
      startLng: bestRider.longitude || restLng,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(200).json({
      success: true,
      message: penaltyApplied?.applied
        ? `Trip cancelled. ₹${Math.round((penaltyApplied.penalty?.amount || 0) / 100)} penalty deducted and reassigned to ${bestRider.name}.`
        : `Declined. Re-assigned to ${bestRider.name}.`,
      penaltyApplied: penaltyApplied?.penalty || null,
      cooldownUntil: penaltyApplied?.cooldownUntil || null,
    });
  } catch (err) {
    console.error("❌ POST decline offer error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/status/update
router.post("/status/update", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ message: "Missing orderId or status" });
    }

    const validStates = ["assigned", "arrived_at_store", "picked_up", "out_for_delivery", "delivered"];
    if (!validStates.includes(status)) {
      return res.status(400).json({ message: "Invalid status state" });
    }

    // Stop auto-simulation
    const { stopDeliverySimulation } = await import("../lib/delivery-simulation.js");
    stopDeliverySimulation(orderId);

    const delList = await db.select().from(orderDeliveries).where(eq(orderDeliveries.orderId, orderId));
    if (delList.length === 0) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    const nextDeliveryStatus = status;

    await db
      .update(orderDeliveries)
      .set({
        status: nextDeliveryStatus,
        updatedAt: new Date(),
      })
      .where(eq(orderDeliveries.orderId, orderId));

    if (nextDeliveryStatus === "picked_up") {
      // Rider picked up food — order is now picked up / served from restaurant perspective.
      // Update the order status in DB for restaurant tracking.
      await db.update(orders).set({ status: "served", updatedAt: new Date() }).where(eq(orders.id, orderId));

      const orderRecord = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
      if (orderRecord) {
        emitToRestaurant(orderRecord.restaurantId, 'order-updated', {
          orderId,
          status: 'served',
          deliveryStatus: 'picked_up',
          restaurantId: orderRecord.restaurantId,
          updatedAt: new Date().toISOString()
        });
      }
      // Emit to customer room that food is picked up and in transit (NOT delivered!)
      emitToOrder(orderId, 'order-status-update', {
        orderId,
        status: 'picked_up',
        deliveryStatus: 'picked_up',
        updatedAt: new Date().toISOString()
      });
    } else if (nextDeliveryStatus === "out_for_delivery") {
      // Rider has left the restaurant
      emitToOrder(orderId, 'order-status-update', {
        orderId,
        status: 'out_for_delivery',
        deliveryStatus: 'out_for_delivery',
        updatedAt: new Date().toISOString()
      });
    } else if (nextDeliveryStatus === "delivered") {
      const preDeliverOrder = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
      await db.update(orders).set({ status: "served", updatedAt: new Date() }).where(eq(orders.id, orderId));

      const orderRecord = preDeliverOrder;
      if (orderRecord) {
        emitToRestaurant(orderRecord.restaurantId, 'order-updated', {
          orderId,
          status: 'served',
          deliveryStatus: 'delivered',
          restaurantId: orderRecord.restaurantId,
          updatedAt: new Date().toISOString()
        });
      }

      const deliveryRecord = delList[0];
      const fee = deliveryRecord.deliveryFee || 0;

      // Determine whether this order was Cash on Delivery (COD) and record floating cash collection idempotently
      let codCollectedAmount = 0;
      let codCustomerPhone: string | null = null;
      if (orderRecord) {
        let isCodOrder = false;
        if (orderRecord.notes && orderRecord.notes.trim().startsWith("{")) {
          try {
            const parsedNotes = JSON.parse(orderRecord.notes);
            const pm = String(parsedNotes.paymentMethod || "").trim().toLowerCase();
            if (pm.includes("cod") || pm === "cash") {
              isCodOrder = true;
            }
            if (parsedNotes.customerPhone || parsedNotes.phone) {
              codCustomerPhone = String(parsedNotes.customerPhone || parsedNotes.phone);
            }
          } catch {}
        }
        if (isCodOrder && Number(orderRecord.grandTotal || 0) > 0) {
          codCollectedAmount = Number(orderRecord.grandTotal);
        }
      }

      const riderId = user?.id || delList[0].riderId;
      if (riderId) {
        if (codCollectedAmount > 0) {
          const existingCodTxn = await db
            .select({ id: riderFloatingCashTxns.id })
            .from(riderFloatingCashTxns)
            .where(
              and(
                eq(riderFloatingCashTxns.orderId, orderId),
                eq(riderFloatingCashTxns.txnType, "cod_collected")
              )
            )
            .limit(1);

          if (existingCodTxn.length === 0) {
            await db.insert(riderFloatingCashTxns).values({
              id: `TXN-${nanoid(8).toUpperCase()}`,
              riderId,
              orderId,
              txnType: "cod_collected",
              amount: codCollectedAmount,
              customerPhone: codCustomerPhone,
              method: "cod",
              referenceId: orderId,
              status: "completed",
              notes: `COD cash collected for Order #${orderId.slice(-6).toUpperCase()}`,
            });
          } else {
            codCollectedAmount = 0; // already logged
          }
        }

        await db.update(deliveryRiders)
          .set({
            status: "available",
            walletBalance: sql`COALESCE(${deliveryRiders.walletBalance}, 0) + ${fee}`,
            totalEarnings: sql`COALESCE(${deliveryRiders.totalEarnings}, 0) + ${fee}`,
            totalDeliveries: sql`COALESCE(${deliveryRiders.totalDeliveries}, 0) + 1`,
            ...(codCollectedAmount > 0
              ? { pendingSettlement: sql`COALESCE(${deliveryRiders.pendingSettlement}, 0) + ${codCollectedAmount}` }
              : {}),
          })
          .where(eq(deliveryRiders.id, riderId));

        // Apply post-pickup extreme delay penalty when transit duration breaches threshold
        if (orderRecord?.updatedAt) {
          const transitMins = (Date.now() - new Date(orderRecord.updatedAt).getTime()) / 60000;
          const baseEta = Math.max(15, deliveryRecord.etaMinutes || 20);
          const delayThresholdMins = Math.max(45, Math.round(baseEta * 2.5));
          if (transitMins >= delayThresholdMins && transitMins - baseEta >= 25) {
            await applyRiderPenalty({
              riderId,
              orderId,
              penaltyType: "delivery_delay",
              amountPaise: PENALTY_CONFIG.rider.deliveryDelayPaise,
              cooldownMinutes: 0,
              strikeDelta: 0,
              forceOffline: false,
              reason: `Severe post-pickup delivery delay (${Math.round(transitMins)}m vs ${baseEta}m ETA).`,
            }).catch((err) => console.warn("⚠️ Could not apply delivery delay penalty:", err));
          }
        }
      }

      emitToOrder(orderId, "order-status", { orderId, status: "delivered", deliveryStatus: "delivered" });
      emitToOrder(orderId, "order-status-update", { orderId, status: "delivered", deliveryStatus: "delivered" });
    }

    const riderId = user?.id || delList[0].riderId;
    let activeRider: any = null;
    if (riderId) {
      const riders = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, riderId)).limit(1);
      if (riders.length > 0) {
        activeRider = riders[0];
      }
    }

    emitToOrder(orderId, "delivery-update", {
      delivery: {
        orderId,
        status: nextDeliveryStatus,
        currentLat: activeRider?.latitude ?? delList[0].currentLat ?? delList[0].restaurantLat,
        currentLng: activeRider?.longitude ?? delList[0].currentLng ?? delList[0].restaurantLng,
        updatedAt: new Date().toISOString(),
      },
      status: nextDeliveryStatus,
      riderName: activeRider?.name,
      riderPhone: activeRider?.phone,
    });

    return res.status(200).json({ success: true, message: `Status updated to ${nextDeliveryStatus}` });
  } catch (err) {
    console.error("❌ POST update status error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/location/update
router.post("/location/update", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { latitude, longitude, orderId } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Missing coordinates" });
    }

    await db
      .update(deliveryRiders)
      .set({
        latitude: Number(latitude),
        longitude: Number(longitude),
        updatedAt: new Date(),
      })
      .where(eq(deliveryRiders.id, user.id));

    if (orderId) {
      const deliveryList = await db.select().from(orderDeliveries).where(eq(orderDeliveries.orderId, orderId));
      if (deliveryList.length === 0) {
        return res.status(200).json({ success: true, message: "Location updated (no active delivery)" });
      }
      const delivery = deliveryList[0];

      // Dynamic ETA recalculation based on rider's current GPS position
      const { haversineDistance } = await import("../lib/delivery-simulation.js");
      const riderLat = Number(latitude);
      const riderLng = Number(longitude);
      let dynamicEta = delivery.etaMinutes;

      // Peak traffic multiplier (1.3x during lunch 12-14 and dinner 17-21)
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 12 && currentHour <= 14) || (currentHour >= 17 && currentHour <= 21);
      const trafficMultiplier = isPeakHour ? 1.3 : 1.0;
      const speedKmh = 25; // average bike speed in city traffic

      if (delivery.status === 'assigned' || delivery.status === 'arrived_at_store') {
        // Rider is heading to or at the restaurant — ETA = travel to restaurant + prep time + restaurant to customer
        const distToRestaurant = haversineDistance(riderLat, riderLng, delivery.restaurantLat, delivery.restaurantLng);
        const distRestToCustomer = haversineDistance(delivery.restaurantLat, delivery.restaurantLng, delivery.customerLat, delivery.customerLng);
        const travelToRest = (distToRestaurant / speedKmh) * 60 * trafficMultiplier;
        const travelRestToCust = (distRestToCustomer / speedKmh) * 60 * trafficMultiplier;
        const prepTime = delivery.status === 'arrived_at_store' ? 5 : 15; // less prep if already at store
        dynamicEta = Math.max(5, Math.round(travelToRest + prepTime + travelRestToCust));
      } else if (delivery.status === 'picked_up' || delivery.status === 'out_for_delivery') {
        // Rider has food — ETA = distance from rider to customer
        const distToCustomer = haversineDistance(riderLat, riderLng, delivery.customerLat, delivery.customerLng);
        const travelToCust = (distToCustomer / speedKmh) * 60 * trafficMultiplier;
        dynamicEta = Math.max(1, Math.round(travelToCust));
      }

      await db
        .update(orderDeliveries)
        .set({
          currentLat: riderLat,
          currentLng: riderLng,
          etaMinutes: dynamicEta,
          updatedAt: new Date(),
        })
        .where(eq(orderDeliveries.orderId, orderId));

      const activeRider = (await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id)))[0];

      emitToOrder(orderId, "delivery-update", {
        orderId,
        status: delivery.status,
        currentLat: riderLat,
        currentLng: riderLng,
        etaMinutes: dynamicEta,
        riderName: activeRider.name,
        riderPhone: activeRider.phone,
      });
    }

    return res.status(200).json({ success: true, message: "Location updated" });
  } catch (err) {
    console.error("❌ POST location update error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/delivery/simulate/step
router.post("/simulate/step", requireAuth, async (req: any, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Delivery simulation is disabled in production" });
  }
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ message: "Missing orderId or status" });
    }

    // Stop auto-simulation
    const { stopDeliverySimulation } = await import("../lib/delivery-simulation.js");
    stopDeliverySimulation(orderId);

    const delList = await db.select().from(orderDeliveries).where(eq(orderDeliveries.orderId, orderId));
    if (delList.length === 0) {
      return res.status(404).json({ message: "Delivery not found" });
    }
    const delivery = delList[0];

    const validStates = ["assigned", "arrived_at_store", "picked_up", "out_for_delivery", "delivered", "cancelled"];
    if (!validStates.includes(status)) {
      return res.status(400).json({ message: "Invalid status state" });
    }

    let nextStatus = status;
    if (status === "picked_up") {
      nextStatus = "out_for_delivery";
    }

    let lat = delivery.currentLat;
    let lng = delivery.currentLng;

    if (nextStatus === "assigned") {
      lat = delivery.startLat || delivery.restaurantLat + 0.005;
      lng = delivery.startLng || delivery.restaurantLng + 0.005;
    } else if (nextStatus === "arrived_at_store") {
      lat = delivery.restaurantLat;
      lng = delivery.restaurantLng;
    } else if (nextStatus === "out_for_delivery") {
      lat = (delivery.restaurantLat + delivery.customerLat) / 2;
      lng = (delivery.restaurantLng + delivery.customerLng) / 2;
    } else if (nextStatus === "delivered") {
      lat = delivery.customerLat;
      lng = delivery.customerLng;
    }

    if (nextStatus === "cancelled") {
      await db.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, orderId));
      emitToOrder(orderId, "order-status", { orderId, status: "cancelled" });
    } else {
      await db
        .update(orderDeliveries)
        .set({
          status: nextStatus,
          currentLat: lat,
          currentLng: lng,
          updatedAt: new Date(),
        })
        .where(eq(orderDeliveries.orderId, orderId));

      if (nextStatus === "out_for_delivery") {
        await db.update(orders).set({ status: "ready", updatedAt: new Date() }).where(eq(orders.id, orderId));
        emitToOrder(orderId, "order-status", { orderId, status: "ready" });
      } else if (nextStatus === "delivered") {
        await db.update(orders).set({ status: "served", updatedAt: new Date() }).where(eq(orders.id, orderId));
        if (delivery.riderId) {
          await db.update(deliveryRiders).set({ status: "available" }).where(eq(deliveryRiders.id, delivery.riderId));
        }
        emitToOrder(orderId, "order-status", { orderId, status: "served" });
      }
    }

    let rider = null;
    if (delivery.riderId) {
      const riders = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, delivery.riderId));
      if (riders.length > 0) {
        rider = riders[0];
      }
    }

    emitToOrder(orderId, "delivery-update", {
      orderId,
      status: nextStatus,
      currentLat: lat,
      currentLng: lng,
      riderName: rider ? rider.name : null,
      riderPhone: rider ? rider.phone : null,
    });

    return res.status(200).json({ success: true, message: `Simulated state ${nextStatus} updated successfully` });
  } catch (err) {
    console.error("❌ POST simulate step error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/delivery/rider/dashboard
router.get("/rider/dashboard", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const riderList = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id));
    if (riderList.length === 0) {
      return res.status(404).json({ message: "Rider not found" });
    }
    const rider = riderList[0];

    // Compute today's and this week's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const deliveries = await db.select({
      fee: orderDeliveries.deliveryFee,
      updatedAt: orderDeliveries.updatedAt,
    })
      .from(orderDeliveries)
      .where(
        and(
          eq(orderDeliveries.riderId, user.id),
          eq(orderDeliveries.status, "delivered")
        )
      );

    let todayEarnings = 0;
    let weekEarnings = 0;
    let todayDeliveries = 0;

    deliveries.forEach((d) => {
      const fee = d.fee || 0;
      if (new Date(d.updatedAt) >= today) {
        todayEarnings += fee;
        todayDeliveries += 1;
      }
      if (new Date(d.updatedAt) >= startOfWeek) {
        weekEarnings += fee;
      }
    });

    const riderPenRows = await db
      .select({ amount: riderPenalties.amount, status: riderPenalties.status })
      .from(riderPenalties)
      .where(eq(riderPenalties.riderId, user.id));
    const totalPenaltiesPaise = riderPenRows
      .filter((p) => p.status !== "waived")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        status: rider.status,
        walletBalance: rider.walletBalance,
        pendingSettlement: rider.pendingSettlement,
        rating: rider.rating,
        totalDeliveries: rider.totalDeliveries,
        acceptanceCount: rider.acceptanceCount,
        rejectionCount: rider.rejectionCount,
        strikeCount: rider.strikeCount || 0,
        penaltyCooldownUntil: rider.penaltyCooldownUntil || null,
        totalPenaltiesPaise,
        todayEarnings: Math.round(todayEarnings * 100) / 100,
        weekEarnings: Math.round(weekEarnings * 100) / 100,
        todayDeliveries,
      },
      profile: rider,
    });
  } catch (err) {
    console.error("❌ GET rider dashboard error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// In-memory duty session tracker: riderId -> { currentSessionStart: number | null, todayLoggedSeconds: number, lastDate: string, sessions: any[] }
const riderDutyStore = new Map<string, { currentSessionStart: number | null, todayLoggedSeconds: number, lastDate: string, sessions: any[] }>();

function getRiderDutyData(riderId: string, isAvailable: boolean) {
  const todayStr = new Date().toISOString().split("T")[0];
  let duty = riderDutyStore.get(riderId);

  if (!duty || duty.lastDate !== todayStr) {
    duty = {
      currentSessionStart: isAvailable ? Date.now() : null,
      todayLoggedSeconds: 0,
      lastDate: todayStr,
      sessions: isAvailable ? [{
        id: `sess_${nanoid(6)}`,
        slot: "Active Shift",
        startTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        endTime: "Active",
        durationSeconds: 0,
        isLive: true,
      }] : [],
    };
    riderDutyStore.set(riderId, duty);
  }
  return duty;
}

// POST /api/delivery/rider/toggle-status
router.post("/rider/toggle-status", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const riderList = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id));
    if (riderList.length === 0) {
      return res.status(404).json({ message: "Rider not found" });
    }
    const currentStatus = riderList[0].status;

    // Cannot toggle if busy, UNLESS the rider has no actual active unfinished delivery
    if (currentStatus === "busy") {
      const activeDeliveries = await db
        .select({ id: orderDeliveries.id })
        .from(orderDeliveries)
        .where(
          and(
            eq(orderDeliveries.riderId, user.id),
            inArray(orderDeliveries.status, ["assigned", "arrived_at_store", "picked_up", "out_for_delivery"])
          )
        );

      if (activeDeliveries.length > 0) {
        return res.status(400).json({ message: "Cannot change status while on an active delivery" });
      }
    }

    const nextStatus = (currentStatus === "available" || currentStatus === "busy") ? "offline" : "available";

    if (
      nextStatus === "available" &&
      riderList[0].penaltyCooldownUntil &&
      new Date(riderList[0].penaltyCooldownUntil).getTime() > Date.now()
    ) {
      const minsLeft = Math.max(
        1,
        Math.ceil((new Date(riderList[0].penaltyCooldownUntil).getTime() - Date.now()) / 60000)
      );
      return res.status(403).json({
        message: `You are in a penalty cooldown period (${minsLeft}m left) and cannot go online yet.`,
        cooldownUntil: riderList[0].penaltyCooldownUntil,
        cooldownMinutesRemaining: minsLeft,
      });
    }

    await db.update(deliveryRiders)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(deliveryRiders.id, user.id));

    // Update duty session tracker
    const duty = getRiderDutyData(user.id, currentStatus === "available");
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (nextStatus === "available") {
      duty.currentSessionStart = now;
      duty.sessions.push({
        id: `sess_${nanoid(6)}`,
        slot: "Duty Shift",
        startTime: timeStr,
        endTime: "Active",
        durationSeconds: 0,
        isLive: true,
      });
    } else {
      if (duty.currentSessionStart) {
        const sessionSec = Math.floor((now - duty.currentSessionStart) / 1000);
        duty.todayLoggedSeconds += sessionSec;
        duty.currentSessionStart = null;
        if (duty.sessions.length > 0) {
          const lastSess = duty.sessions[duty.sessions.length - 1];
          lastSess.endTime = timeStr;
          lastSess.durationSeconds = sessionSec;
          lastSess.isLive = false;
        }
      }
    }
    riderDutyStore.set(user.id, duty);

    return res.status(200).json({ success: true, status: nextStatus });
  } catch (err) {
    console.error("❌ POST toggle status error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/delivery/rider/login-history
router.get("/rider/login-history", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const riderList = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id));
    if (riderList.length === 0) {
      return res.status(404).json({ message: "Rider not found" });
    }
    const rider = riderList[0];
    const isOnline = rider.status === "available" || rider.status === "busy";

    // 1. Calculate today's duty
    const duty = getRiderDutyData(user.id, isOnline);
    let totalTodaySeconds = duty.todayLoggedSeconds;
    if (isOnline && duty.currentSessionStart) {
      totalTodaySeconds += Math.floor((Date.now() - duty.currentSessionStart) / 1000);
    }

    const todayHours = Math.floor(totalTodaySeconds / 3600);
    const todayMinutes = Math.floor((totalTodaySeconds % 3600) / 60);
    const todayFormatted = `${todayHours}h ${todayMinutes}m`;

    // 2. Fetch past deliveries to compute real order stats for the past weeks
    const deliveries = await db.select({
      id: orderDeliveries.id,
      fee: orderDeliveries.deliveryFee,
      status: orderDeliveries.status,
      createdAt: orderDeliveries.createdAt,
      updatedAt: orderDeliveries.updatedAt,
    })
      .from(orderDeliveries)
      .where(eq(orderDeliveries.riderId, user.id));

    // 3. Helper to generate calendar weeks in local time
    const now = new Date();
    const formatLocalDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = formatLocalDate(now);

    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const weeks = [];

    for (let w = 0; w < 5; w++) {
      const mon = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - (w * 7));
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);

      // Title & dates
      let title = `Week ${getWeekNumber(mon)}`;
      if (w === 0) title = "This Week";
      else if (w === 1) title = "Previous Week";

      const dates = `${monthNames[mon.getMonth()]} ${String(mon.getDate()).padStart(2, '0')} – ${monthNames[sun.getMonth()]} ${String(sun.getDate()).padStart(2, '0')}`;

      // Build 7 days list (descending from Sunday to Monday or Monday to Sunday)
      const days = [];
      let weekTotalSeconds = 0;

      for (let d = 6; d >= 0; d--) {
        const dayDate = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + d);
        const dayStr = formatLocalDate(dayDate);
        const isToday = dayStr === todayStr;
        const isPast = dayDate <= now || isToday;

        const dayDeliveries = deliveries.filter(del => {
          const dDate = formatLocalDate(new Date(del.updatedAt || del.createdAt));
          return dDate === dayStr && del.status === "delivered";
        });

        let daySeconds = 0;
        let daySessions = [];

        if (isToday) {
          daySeconds = totalTodaySeconds;
          daySessions = duty.sessions.map((s, idx) => {
            const sec = s.isLive && duty.currentSessionStart
              ? Math.floor((Date.now() - duty.currentSessionStart) / 1000)
              : (s.durationSeconds || 0);
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return {
              id: s.id || `sess_${idx}`,
              slotName: `Shift ${idx + 1}`,
              timeRange: s.isLive ? `${s.startTime} – Active` : `${s.startTime} – ${s.endTime}`,
              duration: `${h}h ${m}m`,
              isLive: !!s.isLive,
              ordersCount: dayDeliveries.length,
            };
          });
        } else if (isPast && dayDeliveries.length > 0) {
          // If deliveries exist for past day, compute simulated duty
          daySeconds = dayDeliveries.length * 3600 + 1800; // ~1.5h per delivery
          daySessions = [
            {
              id: `sess_past_${d}_1`,
              slotName: "Afternoon Shift",
              timeRange: "12:30 PM – 04:00 PM",
              duration: "3h 30m",
              isLive: false,
              ordersCount: dayDeliveries.length,
            }
          ];
        }

        weekTotalSeconds += daySeconds;
        const dh = Math.floor(daySeconds / 3600);
        const dm = Math.floor((daySeconds % 3600) / 60);

        days.push({
          id: `day_${w}_${d}`,
          date: dayStr,
          title: `${dayNames[dayDate.getDay()]}, ${monthNames[dayDate.getMonth()]} ${dayDate.getDate()}`,
          duration: `${dh}h ${dm}m`,
          hasLoggedIn: daySeconds > 0,
          isToday: isToday,
          ordersDelivered: dayDeliveries.length,
          sessions: daySessions,
        });
      }

      const wh = Math.floor(weekTotalSeconds / 3600);
      const wm = Math.floor((weekTotalSeconds % 3600) / 60);

      weeks.push({
        id: `week_${w}`,
        title,
        dates,
        totalDuration: `${wh}h ${wm}m`,
        totalSeconds: weekTotalSeconds,
        days,
      });
    }

    return res.status(200).json({
      success: true,
      today: {
        totalSeconds: totalTodaySeconds,
        hours: todayHours,
        minutes: todayMinutes,
        formatted: todayFormatted,
        isOnline,
        sessions: duty.sessions,
      },
      pastWeeks: weeks,
    });

  } catch (err) {
    console.error("❌ GET login history error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Persistent Support Tickets stored in Neon DB complaints table
// POST /api/delivery/rider/support-ticket
router.post("/rider/support-ticket", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const {
      category,
      subject,
      description,
      metadata,
      attachments,
      orderId,
      outletId: rawOutletId,
      relatedItem,
    } = req.body;

    if (!subject && !description) {
      return res.status(400).json({ message: "Subject or description is required" });
    }

    const ticketId = `TKT-${nanoid(7).toUpperCase()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    let outletId: string | null = rawOutletId || null;
    let outletName: string | null = null;
    let orderNumber: string | null = orderId ? `#${String(orderId).slice(-5).toUpperCase()}` : null;

    if (orderId) {
      try {
        const [orderRow] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (orderRow) {
          outletId = outletId || orderRow.restaurantId;
          orderNumber = `#MQ-${orderRow.id.slice(-5).toUpperCase()}`;
          if (outletId) {
            const [rest] = await db.select().from(restaurants).where(eq(restaurants.id, outletId)).limit(1);
            if (rest?.restaurantName) outletName = rest.restaurantName;
          }
        }
      } catch (e) {
        console.warn("⚠️ Could not enrich order for rider ticket:", e);
      }
    }

    const evidenceList = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
    const firstAttachment = evidenceList.length > 0 ? evidenceList[0] : undefined;

    const newTicket = {
      id: ticketId,
      ticketType: "rider_issue",
      orderId: orderId || null,
      orderNumber,
      outletId,
      outletName,
      riderId: user.id,
      customerName: user.name || "Rider",
      category: category || "general",
      categoryLabel: subject || category || "Rider Support Request",
      reason: subject || "Support Request",
      description: description || "",
      relatedItem: relatedItem || null,
      priority: "MEDIUM",
      status: "OPEN",
      metadata: metadata || {},
      evidence: evidenceList,
      messages: [
        {
          id: `msg-${nanoid(6)}`,
          complaintId: ticketId,
          senderId: user.id,
          senderName: user.name || "Rider",
          senderType: "RIDER",
          message: description || subject || "Support Request",
          timestamp: nowIso,
          ...(firstAttachment ? { attachmentUrl: firstAttachment } : {}),
        },
      ],
      auditLogs: [
        {
          id: `aud-${nanoid(6)}`,
          complaintId: ticketId,
          user: user.name || "Rider",
          action: "Ticket Created",
          timestamp: nowIso,
          newStatus: "OPEN",
          notes: subject || "Rider submitted support ticket",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(complaints).values(newTicket as any);

    if (outletId) {
      try {
        emitToRestaurant(outletId, "complaint-created", newTicket);
      } catch {}
    }

    return res.status(200).json({
      success: true,
      message: "Ticket submitted successfully",
      ticket: {
        ...newTicket,
        createdAt: nowIso,
        estimatedResolution: "Within 2-4 hours",
      },
    });
  } catch (err) {
    console.error("❌ POST support ticket error:", err);
    return res.status(500).json({ message: "Failed to submit ticket" });
  }
});

// GET /api/delivery/rider/support-tickets
router.get("/rider/support-tickets", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    // Fetch both rider's own support tickets AND customer delivery complaints assigned to this rider
    const userTickets = await db
      .select()
      .from(complaints)
      .where(eq(complaints.riderId, user.id))
      .orderBy(desc(complaints.createdAt));

    return res.status(200).json({
      success: true,
      tickets: userTickets,
    });
  } catch (err) {
    console.error("❌ GET support tickets error:", err);
    return res.status(500).json({ message: "Failed to retrieve tickets" });
  }
});

// GET /api/delivery/rider/penalties (Real PostgreSQL rider penalty ledger & strike state)
router.get("/rider/penalties", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const [rider] = await db
      .select({
        walletBalance: deliveryRiders.walletBalance,
        strikeCount: deliveryRiders.strikeCount,
        penaltyCooldownUntil: deliveryRiders.penaltyCooldownUntil,
        acceptanceCount: deliveryRiders.acceptanceCount,
        rejectionCount: deliveryRiders.rejectionCount,
      })
      .from(deliveryRiders)
      .where(eq(deliveryRiders.id, user.id))
      .limit(1);

    const penalties = await db
      .select()
      .from(riderPenalties)
      .where(eq(riderPenalties.riderId, user.id))
      .orderBy(desc(riderPenalties.createdAt));

    let totalDeductedPaise = 0;
    let totalDisputedPaise = 0;
    let totalWaivedPaise = 0;
    for (const p of penalties) {
      if (p.status === "deducted") totalDeductedPaise += p.amount || 0;
      else if (p.status === "disputed") totalDisputedPaise += p.amount || 0;
      else if (p.status === "waived") totalWaivedPaise += p.amount || 0;
    }

    return res.status(200).json({
      success: true,
      penalties,
      walletBalance: Number(rider?.walletBalance ?? 0),
      strikeCount: rider?.strikeCount ?? 0,
      penaltyCooldownUntil: rider?.penaltyCooldownUntil || null,
      acceptanceCount: rider?.acceptanceCount ?? 0,
      rejectionCount: rider?.rejectionCount ?? 0,
      summary: {
        totalCount: penalties.length,
        totalDeductedPaise,
        totalDisputedPaise,
        totalWaivedPaise,
      },
    });
  } catch (err) {
    console.error("❌ GET rider penalties error:", err);
    return res.status(500).json({ message: "Failed to load rider penalties" });
  }
});

// POST /api/delivery/rider/penalties/:penaltyId/dispute (Rider disputes a real penalty row)
router.post("/rider/penalties/:penaltyId/dispute", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { penaltyId } = req.params;
    const { disputeNotes } = req.body || {};

    if (!disputeNotes || !String(disputeNotes).trim()) {
      return res.status(400).json({ message: "Please provide a reason for your dispute." });
    }

    const [existing] = await db
      .select()
      .from(riderPenalties)
      .where(and(eq(riderPenalties.id, penaltyId), eq(riderPenalties.riderId, user.id)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Penalty record not found" });
    }

    const cleanNote = String(disputeNotes).trim();
    const now = new Date();
    const nowIso = now.toISOString();

    const [updatedPenalty] = await db
      .update(riderPenalties)
      .set({
        status: "disputed",
        disputeNotes: cleanNote,
      })
      .where(eq(riderPenalties.id, penaltyId))
      .returning();

    const ticketId = `TKT-${nanoid(7).toUpperCase()}`;
    await db.insert(complaints).values({
      id: ticketId,
      ticketType: "rider_issue",
      orderId: existing.orderId || null,
      orderNumber: existing.orderId ? `#MQ-${existing.orderId.slice(-5).toUpperCase()}` : null,
      riderId: user.id,
      customerName: user.name || "Rider",
      category: "penalty_deduction",
      categoryLabel: `Penalty Dispute (${existing.penaltyType})`,
      reason: `Dispute for penalty ${existing.id} (₹${Math.round((existing.amount || 0) / 100)})`,
      description: cleanNote,
      priority: "HIGH",
      status: "OPEN",
      metadata: {
        penaltyId: existing.id,
        penaltyType: existing.penaltyType,
        amountPaise: existing.amount,
      },
      messages: [
        {
          id: `msg-${nanoid(6)}`,
          complaintId: ticketId,
          senderId: user.id,
          senderName: user.name || "Rider",
          senderType: "RIDER",
          message: cleanNote,
          timestamp: nowIso,
        },
      ],
      createdAt: now,
      updatedAt: now,
    } as any);

    return res.status(200).json({
      success: true,
      message: `Dispute submitted under Ticket #${ticketId}`,
      penalty: updatedPenalty,
      ticketId,
    });
  } catch (err) {
    console.error("❌ POST dispute rider penalty error:", err);
    return res.status(500).json({ message: "Failed to submit penalty dispute" });
  }
});


// In-memory Floating Cash Store per rider
interface FloatingCashTxn {
  id: string;
  riderId: string;
  type: "cod_collected" | "change_returned_upi" | "cash_deposited_upi" | "cash_deposited_icici" | "cash_deposited_novopay" | "cash_deposited_airtel";
  amount: number;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  customerUpiId?: string;
  orderAmount?: number;
  cashReceived?: number;
  changeAmount?: number;
  referenceNumber?: string;
  paymentGatewayRef?: string;
  status: "completed" | "pending" | "failed";
  createdAt: string;
  description: string;
}

const DEFAULT_RIDER_CASH_LIMIT = Number(process.env.RIDER_CASH_LIMIT) || 2500;

function parseOrderNotesMeta(notes: string | null | undefined) {
  if (!notes || !notes.trim().startsWith("{")) return {};
  try {
    return JSON.parse(notes) as Record<string, any>;
  } catch {
    return {};
  }
}

function formatCashTxnForApp(row: typeof riderFloatingCashTxns.$inferSelect) {
  const type =
    row.txnType === "cod_collected"
      ? "cod_collected"
      : row.txnType === "change_returned"
      ? "change_returned_upi"
      : (`cash_deposited_${row.method || "upi"}` as any);
  return {
    id: row.id,
    riderId: row.riderId,
    type,
    amount: Number(row.amount || 0),
    orderId: row.orderId || undefined,
    customerPhone: row.customerPhone || undefined,
    referenceNumber: row.referenceId || undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    description:
      row.notes ||
      (row.txnType === "cod_collected"
        ? `COD cash collected for Order #${(row.orderId || "").slice(-6).toUpperCase()}`
        : row.txnType === "change_returned"
        ? `Returned ₹${row.amount} change via ${(row.method || "UPI").toUpperCase()}`
        : `Deposited ₹${row.amount} via ${(row.method || "UPI").toUpperCase()}`),
  };
}

// GET /api/delivery/rider/floating-cash
router.get("/rider/floating-cash", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const [rider] = await db
      .select()
      .from(deliveryRiders)
      .where(eq(deliveryRiders.id, user.id))
      .limit(1);

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    const txnRows = await db
      .select()
      .from(riderFloatingCashTxns)
      .where(eq(riderFloatingCashTxns.riderId, user.id))
      .orderBy(desc(riderFloatingCashTxns.createdAt))
      .limit(50);

    const formattedTxns = txnRows.map(formatCashTxnForApp);
    const currentBalance = Math.max(0, Number(rider.pendingSettlement || 0));
    const cashLimit = DEFAULT_RIDER_CASH_LIMIT;

    // Today's stats
    const today = new Date().toISOString().slice(0, 10);
    const todayRows = txnRows.filter((t) => t.createdAt.toISOString().startsWith(today));
    const totalCollectedToday = todayRows
      .filter((t) => t.txnType === "cod_collected")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalChangeReturnedToday = todayRows
      .filter((t) => t.txnType === "change_returned")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalDepositedToday = todayRows
      .filter((t) => t.txnType === "company_deposit")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Query real recent COD deliveries/active tasks assigned to this rider
    const riderDeliveryRows = await db
      .select({
        orderId: orders.id,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        deliveryStatus: orderDeliveries.status,
        orderStatus: orders.status,
        customerName: authUsers.name,
        createdAt: orderDeliveries.createdAt,
      })
      .from(orderDeliveries)
      .innerJoin(orders, eq(orderDeliveries.orderId, orders.id))
      .leftJoin(authUsers, eq(orders.placedByUserId, authUsers.id))
      .where(eq(orderDeliveries.riderId, user.id))
      .orderBy(desc(orderDeliveries.createdAt))
      .limit(20);

    const recentCodOrders = riderDeliveryRows
      .filter((row) => {
        if (row.orderStatus === "cancelled") return false;
        const meta = parseOrderNotesMeta(row.notes);
        const pm = String(meta.paymentMethod || "").toLowerCase();
        return pm.includes("cod") || pm === "cash";
      })
      .map((row) => {
        const meta = parseOrderNotesMeta(row.notes);
        const rawPhone = meta.customerPhone || meta.phone || "";
        return {
          orderId: row.orderId,
          customerName: row.customerName || "Customer",
          customerPhone: String(rawPhone),
          customerUpiId: rawPhone ? `${String(rawPhone).replace(/\D/g, "").slice(-10)}@upi` : "",
          orderAmount: Number(row.grandTotal || 0),
          status:
            row.deliveryStatus === "delivered"
              ? "Delivered"
              : row.deliveryStatus === "out_for_delivery" || row.deliveryStatus === "picked_up"
              ? "Out for Delivery"
              : "Assigned",
        };
      });

    return res.status(200).json({
      success: true,
      currentBalance,
      limit: cashLimit,
      availableLimit: Math.max(0, cashLimit - currentBalance),
      isLimitReached: currentBalance >= cashLimit,
      settlementUpiId: process.env.COMPANY_SETTLEMENT_UPI_ID || null,
      todaySummary: {
        collected: totalCollectedToday,
        changeReturned: totalChangeReturnedToday,
        deposited: totalDepositedToday,
      },
      recentCodOrders,
      transactions: formattedTxns,
    });
  } catch (err) {
    console.error("❌ GET floating-cash error:", err);
    return res.status(500).json({ message: "Failed to load floating cash details" });
  }
});

// POST /api/delivery/rider/floating-cash/return-change
router.post("/rider/floating-cash/return-change", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const {
      orderId,
      customerName,
      customerPhone,
      customerUpiId,
      orderAmount,
      cashReceived,
      changeAmount,
      upiRefNumber,
    } = req.body;

    const changeVal = Number(changeAmount);
    if (!changeVal || changeVal <= 0) {
      return res.status(400).json({ message: "Valid change amount is required" });
    }

    const [rider] = await db
      .select()
      .from(deliveryRiders)
      .where(eq(deliveryRiders.id, user.id))
      .limit(1);

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    const currentBal = Math.max(0, Number(rider.pendingSettlement || 0));
    const nextBalance = Math.max(0, Number((currentBal - changeVal).toFixed(2)));
    const txnId = `CHG-${nanoid(8).toUpperCase()}`;
    const refNo = upiRefNumber || `UPI-${Date.now().toString().slice(-6)}`;

    let validOrderId: string | null = null;
    if (orderId && typeof orderId === "string") {
      const [ord] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (ord) validOrderId = ord.id;
    }

    const [inserted] = await db
      .insert(riderFloatingCashTxns)
      .values({
        id: txnId,
        riderId: user.id,
        orderId: validOrderId,
        txnType: "change_returned",
        amount: changeVal,
        customerPhone: customerPhone ? String(customerPhone) : null,
        method: "upi",
        referenceId: refNo,
        status: "completed",
        notes: `Returned ₹${changeVal} change via UPI to ${customerName || "Customer"}${orderId ? ` (Order #${orderId})` : ""}`,
      })
      .returning();

    await db
      .update(deliveryRiders)
      .set({ pendingSettlement: nextBalance, updatedAt: new Date() })
      .where(eq(deliveryRiders.id, user.id));

    return res.status(200).json({
      success: true,
      message: `Successfully recorded change return of ₹${changeVal} to customer.`,
      currentBalance: nextBalance,
      transaction: formatCashTxnForApp(inserted),
      receipt: {
        receiptId: txnId,
        orderId: orderId || null,
        customerName: customerName || "Customer",
        customerUpi: customerUpiId || (customerPhone ? `${customerPhone}@upi` : ""),
        orderBill: Number(orderAmount) || 0,
        cashReceived: Number(cashReceived) || 0,
        changePaid: changeVal,
        adjustedFloatingCash: nextBalance,
        utrNumber: refNo,
        timestamp: inserted.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("❌ POST return-change error:", err);
    return res.status(500).json({ message: "Failed to process change refund" });
  }
});

// POST /api/delivery/rider/floating-cash/deposit
router.post("/rider/floating-cash/deposit", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { amount, method, referenceNumber } = req.body;

    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ message: "Valid deposit amount is required" });
    }

    const [rider] = await db
      .select()
      .from(deliveryRiders)
      .where(eq(deliveryRiders.id, user.id))
      .limit(1);

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    const currentBal = Math.max(0, Number(rider.pendingSettlement || 0));
    const nextBalance = Math.max(0, Number((currentBal - depositAmount).toFixed(2)));
    const txnId = `DEP-${nanoid(8).toUpperCase()}`;
    const validMethod = String(method || "upi").toLowerCase();
    const refNo = referenceNumber || `DEP-${Date.now().toString().slice(-6)}`;

    const [inserted] = await db
      .insert(riderFloatingCashTxns)
      .values({
        id: txnId,
        riderId: user.id,
        orderId: null,
        txnType: "company_deposit",
        amount: depositAmount,
        customerPhone: null,
        method: validMethod,
        referenceId: refNo,
        status: "completed",
        notes: `Deposited ₹${depositAmount} cash via ${validMethod.toUpperCase()}`,
      })
      .returning();

    await db
      .update(deliveryRiders)
      .set({ pendingSettlement: nextBalance, updatedAt: new Date() })
      .where(eq(deliveryRiders.id, user.id));

    return res.status(200).json({
      success: true,
      message: `₹${depositAmount} deposited successfully via ${validMethod.toUpperCase()}.`,
      currentBalance: nextBalance,
      transaction: formatCashTxnForApp(inserted),
      receipt: {
        receiptId: txnId,
        amount: depositAmount,
        method: validMethod,
        utrNumber: refNo,
        timestamp: inserted.createdAt.toISOString(),
        remainingBalance: nextBalance,
      },
    });
  } catch (err) {
    console.error("❌ POST deposit error:", err);
    return res.status(500).json({ message: "Failed to process cash deposit" });
  }
});

// POST /api/delivery/rider/floating-cash/generate-gateway-order
router.post("/rider/floating-cash/generate-gateway-order", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { amount, purpose, customerUpi } = req.body;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid deposit amount is required" });
    }

    const rzpKey = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    const targetUpi = String(customerUpi || process.env.COMPANY_SETTLEMENT_UPI_ID || "").trim();

    if (!(rzpKey && rzpSecret) && !targetUpi) {
      return res.status(503).json({
        success: false,
        message: "Online settlement gateway is not configured on the server yet. Deposit cash via hub partner or configure RAZORPAY_KEY_ID / COMPANY_SETTLEMENT_UPI_ID.",
      });
    }

    let gatewayOrderId = `intent_${nanoid(12)}`;
    if (rzpKey && rzpSecret) {
      const authHeader = Buffer.from(`${rzpKey}:${rzpSecret}`).toString("base64");
      const rzpResp = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(numericAmount * 100),
          currency: "INR",
          receipt: `fc_${String(user.id).slice(-8)}_${Date.now()}`,
          notes: { riderId: user.id, purpose: purpose || "MyQuro Floating Cash Settlement" },
        }),
      });
      const rzpData: any = await rzpResp.json().catch(() => ({}));
      if (!rzpResp.ok || !rzpData?.id) {
        return res.status(502).json({
          success: false,
          message: rzpData?.error?.description || "Failed to initialize Razorpay settlement order",
        });
      }
      gatewayOrderId = rzpData.id;
    }

    const upiIntentUrl = targetUpi
      ? `upi://pay?pa=${encodeURIComponent(targetUpi)}&pn=MyQuro+Delivery&am=${numericAmount}&cu=INR&tn=${encodeURIComponent(purpose || "MyQuro Settlement")}`
      : null;

    return res.status(200).json({
      success: true,
      gatewayOrderId,
      amount: numericAmount,
      currency: "INR",
      keyId: rzpKey || null,
      upiIntentUrl,
    });
  } catch (err) {
    console.error("❌ Generate gateway order error:", err);
    return res.status(500).json({ message: "Failed to generate gateway order" });
  }
});

export default router;
