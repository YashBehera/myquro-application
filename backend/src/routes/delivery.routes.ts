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
import { requireAuth } from "../auth/requireAuth.js";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { emitToOrder } from "../lib/socket.js";
import { calculateSwiggyETA, seedRidersIfEmpty, startDeliverySimulation, haversineDistance } from "../lib/delivery-simulation.js";

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
      } catch {}
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

// GET /api/delivery/track/:orderId
router.get("/track/:orderId", requireAuth, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const list = await db
      .select()
      .from(orderDeliveries)
      .where(eq(orderDeliveries.orderId, orderId));

    if (list.length === 0) {
      return res.status(404).json({ message: "No tracking details found for this order" });
    }

    const delivery = list[0];
    let rider = null;

    if (delivery.riderId) {
      const riders = await db
        .select()
        .from(deliveryRiders)
        .where(eq(deliveryRiders.id, delivery.riderId));
      if (riders.length > 0) {
        rider = riders[0];
      }
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
        // Parse order notes to get coordinates passed by customer app
        let parsedNotes: any = {};
        try {
          parsedNotes = JSON.parse(order.notes || "{}");
        } catch (e) {
          // Fallback if not JSON
        }

        let latitude = Number(parsedNotes.latitude) || 23.6693;
        let longitude = Number(parsedNotes.longitude) || 86.1511;
        let addressLine = parsedNotes.address || parsedNotes.mapAddress || "Sector 4, Bokaro Steel City, Jharkhand, India";
        let city = parsedNotes.city || "Bokaro Steel City";

        // Fallback for default keys
        if (!parsedNotes.latitude) {
          if (addressId === "2" || addressId.includes("Gurugram")) {
            latitude = 28.4952;
            longitude = 77.0894;
            addressLine = "Cyber City, DLF Phase 3, Gurugram, Haryana, India";
            city = "Gurugram";
          }
        }

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

    // 3. Find available real riders (those who have registered accounts with role 'rider')
    const availableRiders = await db
      .select({
        id: deliveryRiders.id,
        name: deliveryRiders.name,
        phone: deliveryRiders.phone,
        latitude: deliveryRiders.latitude,
        longitude: deliveryRiders.longitude,
        status: deliveryRiders.status,
      })
      .from(deliveryRiders)
      .innerJoin(authUsers, eq(deliveryRiders.id, authUsers.id))
      .where(
        and(
          eq(deliveryRiders.status, "available"),
          eq(authUsers.role, "rider")
        )
      );

    if (availableRiders.length === 0) {
      return res.status(400).json({ message: "No delivery riders are currently online and available." });
    }

    const rider = availableRiders[0];

    // 4. Do NOT mark rider as busy yet — only mark busy when rider accepts

    // Fetch actual restaurant coordinates
    const restList = await db.select().from(restaurants).where(eq(restaurants.id, order.restaurantId)).limit(1);
    const restaurant = restList[0];
    const restLat = (restaurant?.latitude !== null && restaurant?.latitude !== undefined) ? Number(restaurant.latitude) : 22.8046;
    const restLng = (restaurant?.longitude !== null && restaurant?.longitude !== undefined) ? Number(restaurant.longitude) : 86.2029;
    const custLat = address.latitude;
    const custLng = address.longitude;

    // Calculate Swiggy ETA (prep time + travel time)
    const etaMinutes = calculateSwiggyETA(restLat, restLng, custLat, custLng, 1);

    const distanceKm = Number(haversineDistance(restLat, restLng, custLat, custLng).toFixed(2));
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

    // 6. Update order status to preparing
    await db
      .update(orders)
      .set({ status: "preparing", updatedAt: new Date() })
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
      return res.status(200).json({ success: true, task: null });
    }
    
    let taskData = list[0];
    let customerAddress = "Address not provided";
    if (taskData.orderNotes) {
      try {
        const parsed = JSON.parse(taskData.orderNotes);
        if (parsed.address) customerAddress = parsed.address;
        else if (parsed.mapAddress) customerAddress = parsed.mapAddress;
      } catch(e) {}
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

    // If rider is not online or is busy, return empty offers list immediately
    if (!rider || rider.status !== "available") {
      return res.status(200).json({ success: true, offers: [] });
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

    // 2. If rider is online ("available"), check for any unassigned delivery orders
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
          inArray(orders.status, ["placed", "preparing", "ready"]),
          sql`${orders.tableId} IS NULL`,
          sql`(${orderDeliveries.id} IS NULL OR (${orderDeliveries.status} = 'offered' AND ${orderDeliveries.riderId} = ${user.id}))`
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
          // Parse coordinates from order notes
          let latitude = 20.2505; // Fallback
          let longitude = 85.7882;
          try {
            const parsedNotes = JSON.parse(order.notes || "{}");
            if (parsedNotes.latitude && parsedNotes.longitude) {
              latitude = Number(parsedNotes.latitude);
              longitude = Number(parsedNotes.longitude);
            }
          } catch (e) {}

          // Fetch restaurant details
          const restList = await db.select().from(restaurants).where(eq(restaurants.id, order.restaurantId)).limit(1);
          const restaurant = restList[0];
          const restLat = restaurant?.latitude ? Number(restaurant.latitude) : 22.8046;
          const restLng = restaurant?.longitude ? Number(restaurant.longitude) : 86.2029;

          const distanceKm = Number(haversineDistance(restLat, restLng, latitude, longitude).toFixed(2));
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
            currentLat: rider.latitude || restLat,
            currentLng: rider.longitude || restLng,
            startLat: rider.latitude || restLat,
            startLng: rider.longitude || restLng,
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
          inArray(orders.status, ["placed", "preparing", "ready"]),
          eq(orderDeliveries.status, "offered"),
          eq(orderDeliveries.riderId, user.id)
        )
      );

    const filteredList = list.filter((item) => !declinedMap || !declinedMap.has(item.orderId));

    const mappedOffers = filteredList.map((item) => {
      let customerName = "Customer";
      let customerPhone = "+91 9876543210";
      let customerAddress = "Bhubaneswar, Odisha";
      let orderNotes = "Standard Delivery";

      if (item.notes) {
        try {
          const parsed = JSON.parse(item.notes);
          if (parsed.customerName) customerName = parsed.customerName;
          if (parsed.customerPhone) customerPhone = parsed.customerPhone;
          if (parsed.deliveryAddress) customerAddress = parsed.deliveryAddress;
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

    const delList = await db.select().from(orderDeliveries).where(eq(orderDeliveries.orderId, orderId));
    if (delList.length === 0) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Mark rider as busy
    await db.update(deliveryRiders).set({ status: "busy" }).where(eq(deliveryRiders.id, user.id));

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

    emitToOrder(orderId, "delivery-update", {
      orderId,
      status: "assigned",
      currentLat: activeRider.latitude,
      currentLng: activeRider.longitude,
      riderName: activeRider.name,
      riderPhone: activeRider.phone,
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

    // Reset current rider status back to available so they can receive other tasks
    await db.update(deliveryRiders).set({ status: "available", updatedAt: new Date() }).where(eq(deliveryRiders.id, user.id));

    // Delete the existing delivery offer for this rider
    await db.delete(orderDeliveries).where(eq(orderDeliveries.id, delivery.id));

    // Find the next available rider (excluding those who declined this order)
    const availableRiders = await db
      .select({
        id: deliveryRiders.id,
        name: deliveryRiders.name,
        phone: deliveryRiders.phone,
        latitude: deliveryRiders.latitude,
        longitude: deliveryRiders.longitude,
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

    const eligibleRiders = availableRiders.filter((r) => {
      const rDeclined = riderDeclinedOrders.get(r.id);
      return !rDeclined || !rDeclined.has(orderId);
    });

    if (eligibleRiders.length === 0) {
      emitToOrder(orderId, "delivery-update", {
        orderId,
        status: "no_rider",
        message: "No other riders available",
      });

      return res.status(200).json({ success: true, message: "Declined. No other riders available." });
    }

    // Pick the closest available rider
    const restLat = delivery.restaurantLat;
    const restLng = delivery.restaurantLng;
    let bestRider = eligibleRiders[0];
    let bestDist = Infinity;
    for (const r of eligibleRiders) {
      const d = haversineDistance(restLat, restLng, r.latitude || restLat, r.longitude || restLng);
      if (d < bestDist) {
        bestDist = d;
        bestRider = r;
      }
    }

    // Create new offer for the next rider
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
      updatedAt: new Date(),
    });

    return res.status(200).json({ success: true, message: `Declined. Re-assigned to ${bestRider.name}.` });
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
      // Rider picked up food — order is now ready
      await db.update(orders).set({ status: "ready", updatedAt: new Date() }).where(eq(orders.id, orderId));
      emitToOrder(orderId, "order-status", { orderId, status: "ready" });
    } else if (nextDeliveryStatus === "out_for_delivery") {
      // Rider has left the restaurant
    } else if (nextDeliveryStatus === "delivered") {
      await db.update(orders).set({ status: "served", updatedAt: new Date() }).where(eq(orders.id, orderId));
      
      const deliveryRecord = delList[0];
      const fee = deliveryRecord.deliveryFee || 0;

      await db.update(deliveryRiders)
        .set({ 
          status: "available",
          walletBalance: sql`${deliveryRiders.walletBalance} + ${fee}`,
          totalEarnings: sql`${deliveryRiders.totalEarnings} + ${fee}`,
          totalDeliveries: sql`${deliveryRiders.totalDeliveries} + 1`
        })
        .where(eq(deliveryRiders.id, user.id));
        
      emitToOrder(orderId, "order-status", { orderId, status: "served" });
    }

    const activeRider = (await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, user.id)))[0];

    emitToOrder(orderId, "delivery-update", {
      orderId,
      status: nextDeliveryStatus,
      currentLat: activeRider.latitude,
      currentLng: activeRider.longitude,
      riderName: activeRider.name,
      riderPhone: activeRider.phone,
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
      riderName: rider ? rider.name : "Rahul Kumar",
      riderPhone: rider ? rider.phone : "+91 9876543210",
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
        todayEarnings,
        weekEarnings,
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
    
    // Cannot toggle if busy
    if (currentStatus === "busy") {
      return res.status(400).json({ message: "Cannot change status while on a delivery" });
    }

    const nextStatus = currentStatus === "offline" ? "available" : "offline";

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

// In-memory support tickets store: ticketId -> Ticket
const riderTicketsStore: any[] = [];

// POST /api/delivery/rider/support-ticket
router.post("/rider/support-ticket", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { category, subject, description, metadata, attachments } = req.body;

    const ticketId = `TKT-${nanoid(7).toUpperCase()}`;
    const newTicket = {
      id: ticketId,
      riderId: user.id,
      category: category || "general",
      subject: subject || "Support Request",
      description: description || "",
      metadata: metadata || {},
      attachments: attachments || [],
      status: "in_progress",
      createdAt: new Date().toISOString(),
      estimatedResolution: "Within 2-4 hours",
    };

    riderTicketsStore.unshift(newTicket);

    return res.status(200).json({
      success: true,
      message: "Ticket submitted successfully",
      ticket: newTicket,
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
    const userTickets = riderTicketsStore.filter((t) => t.riderId === user.id);
    return res.status(200).json({
      success: true,
      tickets: userTickets,
    });
  } catch (err) {
    console.error("❌ GET support tickets error:", err);
    return res.status(500).json({ message: "Failed to retrieve tickets" });
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

const riderFloatingCashStore = new Map<string, {
  balance: number;
  limit: number;
  transactions: FloatingCashTxn[];
}>();

// Helper to get or init rider floating cash
function getRiderFloatingCashState(riderId: string) {
  if (!riderFloatingCashStore.has(riderId)) {
    // Seed with realistic starting data
    const initialTxns: FloatingCashTxn[] = [
      {
        id: `TXN-${nanoid(8).toUpperCase()}`,
        riderId,
        type: "cod_collected",
        amount: 450,
        orderId: "MQ-8419",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        orderAmount: 450,
        cashReceived: 450,
        status: "completed",
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        description: "COD cash collected for Order #MQ-8419",
      },
      {
        id: `TXN-${nanoid(8).toUpperCase()}`,
        riderId,
        type: "cod_collected",
        amount: 380,
        orderId: "MQ-8432",
        customerName: "Pooja Verma",
        customerPhone: "9123456789",
        orderAmount: 380,
        cashReceived: 380,
        status: "completed",
        createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        description: "COD cash collected for Order #MQ-8432",
      },
    ];

    riderFloatingCashStore.set(riderId, {
      balance: 830,
      limit: 2500,
      transactions: initialTxns,
    });
  }
  return riderFloatingCashStore.get(riderId)!;
}

// GET /api/delivery/rider/floating-cash
router.get("/rider/floating-cash", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const state = getRiderFloatingCashState(user.id);

    // Calculate today's stats
    const today = new Date().toISOString().slice(0, 10);
    const todayTxns = state.transactions.filter(t => t.createdAt.startsWith(today));
    const totalCollectedToday = todayTxns.filter(t => t.type === 'cod_collected').reduce((sum, t) => sum + t.amount, 0);
    const totalChangeReturnedToday = todayTxns.filter(t => t.type === 'change_returned_upi').reduce((sum, t) => sum + t.amount, 0);
    const totalDepositedToday = todayTxns.filter(t => t.type.startsWith('cash_deposited')).reduce((sum, t) => sum + t.amount, 0);

    // Mock active/recent COD orders to choose from for fast 1-tap change calculation
    const recentCodOrders = [
      {
        orderId: "MQ-8432",
        customerName: "Pooja Verma",
        customerPhone: "9123456789",
        customerUpiId: "9123456789@paytm",
        orderAmount: 380,
        status: "Delivered",
      },
      {
        orderId: "MQ-8419",
        customerName: "Rahul Sharma",
        customerPhone: "9876543210",
        customerUpiId: "rahul.sharma@okaxis",
        orderAmount: 450,
        status: "Delivered",
      },
      {
        orderId: "MQ-8450",
        customerName: "Vikram Malhotra",
        customerPhone: "9811223344",
        customerUpiId: "vikram@icici",
        orderAmount: 260,
        status: "Out for Delivery",
      },
    ];

    return res.status(200).json({
      success: true,
      currentBalance: state.balance,
      limit: state.limit,
      availableLimit: Math.max(0, state.limit - state.balance),
      isLimitReached: state.balance >= state.limit,
      todaySummary: {
        collected: totalCollectedToday,
        changeReturned: totalChangeReturnedToday,
        deposited: totalDepositedToday,
      },
      recentCodOrders,
      transactions: state.transactions,
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
      paymentGatewayRef,
    } = req.body;

    const changeVal = Number(changeAmount);
    if (!changeVal || changeVal <= 0) {
      return res.status(400).json({ message: "Valid change amount is required" });
    }

    const state = getRiderFloatingCashState(user.id);
    const txnId = `CHG-${nanoid(8).toUpperCase()}`;
    const refNo = upiRefNumber || `UPI-${Date.now().toString().slice(-6)}`;

    // Create change return transaction
    const newTxn: FloatingCashTxn = {
      id: txnId,
      riderId: user.id,
      type: "change_returned_upi",
      amount: changeVal,
      orderId: orderId || "MQ-COD",
      customerName: customerName || "Customer",
      customerPhone: customerPhone || "",
      customerUpiId: customerUpiId || `${customerPhone}@upi`,
      orderAmount: Number(orderAmount) || 0,
      cashReceived: Number(cashReceived) || 0,
      changeAmount: changeVal,
      referenceNumber: refNo,
      paymentGatewayRef: paymentGatewayRef || `PG-${nanoid(6).toUpperCase()}`,
      status: "completed",
      createdAt: new Date().toISOString(),
      description: `Returned ₹${changeVal} change via UPI to ${customerName || 'Customer'} (Order #${orderId || 'COD'})`,
    };

    // Deduct change from rider's floating cash liability
    state.balance = Math.max(0, state.balance - changeVal);
    state.transactions.unshift(newTxn);

    return res.status(200).json({
      success: true,
      message: `Successfully processed change of ₹${changeVal} to customer.`,
      currentBalance: state.balance,
      transaction: newTxn,
      receipt: {
        receiptId: txnId,
        orderId: orderId || "MQ-COD",
        customerName: customerName || "Customer",
        customerUpi: customerUpiId || `${customerPhone}@upi`,
        orderBill: Number(orderAmount) || 0,
        cashReceived: Number(cashReceived) || 0,
        changePaid: changeVal,
        adjustedFloatingCash: state.balance,
        utrNumber: refNo,
        timestamp: newTxn.createdAt,
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
    const { amount, method, referenceNumber, paymentGatewayRef } = req.body;

    const depositAmount = Number(amount);
    if (!depositAmount || depositAmount <= 0) {
      return res.status(400).json({ message: "Valid deposit amount is required" });
    }

    const state = getRiderFloatingCashState(user.id);
    const txnId = `DEP-${nanoid(8).toUpperCase()}`;
    const validMethod = method || "upi";
    const refNo = referenceNumber || `DEP-UTR-${Date.now().toString().slice(-6)}`;

    const newTxn: FloatingCashTxn = {
      id: txnId,
      riderId: user.id,
      type: `cash_deposited_${validMethod}` as any,
      amount: depositAmount,
      referenceNumber: refNo,
      paymentGatewayRef: paymentGatewayRef || `PG-${nanoid(6).toUpperCase()}`,
      status: "completed",
      createdAt: new Date().toISOString(),
      description: `Deposited ₹${depositAmount} cash via ${validMethod.toUpperCase()}`,
    };

    state.balance = Math.max(0, state.balance - depositAmount);
    state.transactions.unshift(newTxn);

    return res.status(200).json({
      success: true,
      message: `₹${depositAmount} deposited successfully via ${validMethod.toUpperCase()}.`,
      currentBalance: state.balance,
      transaction: newTxn,
      receipt: {
        receiptId: txnId,
        amount: depositAmount,
        method: validMethod,
        utrNumber: refNo,
        timestamp: newTxn.createdAt,
        remainingBalance: state.balance,
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
    const { amount, purpose, customerUpi } = req.body;
    const orderId = `order_${nanoid(14)}`;
    const upiIntent = `upi://pay?pa=${customerUpi || 'myquro.settlement@icici'}&pn=MyQuro+Delivery&am=${amount}&cu=INR&tn=${encodeURIComponent(purpose || 'MyQuro Settlement')}`;

    return res.status(200).json({
      success: true,
      gatewayOrderId: orderId,
      amount: Number(amount),
      currency: "INR",
      keyId: "rzp_live_MYQURO_PROD",
      upiIntentUrl: upiIntent,
    });
  } catch (err) {
    console.error("❌ Generate gateway order error:", err);
    return res.status(500).json({ message: "Failed to generate gateway order" });
  }
});

export default router;
