import { Router } from "express";
import { db } from "../db/db.js";

import { orders } from "../db/schema/orders.js";
import { orderItems } from "../db/schema/order-items.js";
import { orderItemExtras } from "../db/schema/order-item-extras.js";
import { menuExtras } from "../db/schema/menu-extras.js";
import { menuItemVariants } from "../db/schema/menu-item-variants.js";
import { menuItems } from "../db/schema/menu-items.js";
import { menuCategories } from "../db/schema/menu-categories.js";
import { tableSession } from "../db/schema/table-session.js";
import { tables } from "../db/schema/tables.js";
import { restaurants } from "../db/schema/restaurants.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { authUsers } from "../db/schema/auth-users.js";
import { authSessions } from "../db/schema/auth-sessions.js";
import { orderDeliveries } from "../db/schema/order-deliveries.js";
import { deliveryRiders } from "../db/schema/delivery-riders.js";
import { merchantPenalties } from "../db/schema/merchant-penalties.js";
import { profiles } from "../db/schema/profiles.js";
import { emitToRestaurant, emitToOrder } from "../lib/socket.js";

import { nanoid } from "nanoid";
import { eq, and, or, inArray, sql, desc, like } from "drizzle-orm";

import { auth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { requireAuth } from "../auth/requireAuth.js";

import { sendNotification } from "../lib/sendNotification.js";
import { verifyTableSession } from "../lib/verifyTableSession.js";

import {
  calculateSubtotal,
  calculateDiscount,
  calculateTaxableBase,
  calculateGST,
  calculateGrandTotal,
} from "../lib/billing.js";

import {
  isRestaurantOwnerOrManager,
  isRestaurantOwnerManagerOrStaff,
} from "../lib/checkRoles.js";
import { orderCache } from "../lib/order-cache.js";

const router = Router();

// Optional auth middleware
const optionalAuth = async (req: any, res: any, next: any) => {
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

// POST /make-order
router.get("/kitchen/active/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check Cache
    const cached = orderCache.get(restaurantId);
    if (cached.hit) {
      return res.status(200).json(cached.data);
    }

    // Authorization
    const isAllowed = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    if (!isAllowed) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Fetch active orders (placed, preparing, ready)
    const activeOrdersRaw = await db
      .select({
        id: orders.id,
        tableSessionId: orders.tableSessionId,
        restaurantId: orders.restaurantId,
        tableId: orders.tableId,
        tableNumber: tables.tableNumber,
        placedByUserId: orders.placedByUserId,
        notes: orders.notes,
        status: orders.status,
        handoverOtp: orders.handoverOtp,
        prepTimeMinutes: orders.prepTimeMinutes,
        extendedPrepMinutes: orders.extendedPrepMinutes,
        subtotal: orders.subtotal,
        discount: orders.discount,
        gst: orders.gst,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.tableId, tables.id))
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          inArray(orders.status, ["placed", "preparing", "ready"])
        )
      )
      .orderBy(desc(orders.createdAt));

    // Get items for these orders
    const orderIds = activeOrdersRaw.map(o => o.id);
    let allItems: any[] = [];

    if (orderIds.length > 0) {
      allItems = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          menuItemId: orderItems.menuItemId,
          menuItemVariantId: orderItems.menuItemVariantId,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          notes: orderItems.notes,
          status: orderItems.status,
          menuItemName: menuItems.name,
          variantName: menuItemVariants.variantName,
        })
        .from(orderItems)
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
        .where(inArray(orderItems.orderId, orderIds));
    }

    const activeOrders = activeOrdersRaw.map(order => ({
      ...order,
      items: allItems.filter(item => item.orderId === order.id)
    }));

    // Update Cache
    orderCache.set(restaurantId, { orders: activeOrders });

    return res.status(200).json({ orders: activeOrders });
  } catch (error) {
    console.error("Error fetching active kitchen orders:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/make-order", optionalAuth, async (req: any, res) => {
  try {
    console.log("MAKE ORDER REQUEST - Body:", JSON.stringify(req.body, null, 2));
    console.log("MAKE ORDER REQUEST - User:", req.user?.id || "No user");

    const user = req.user;
    const {
      tableSessionId,
      restaurantId: providedRestaurantId,
      notes,
      items,
      status,
      discount: frontendDiscount,
      discountType,
      discountValue,
      deliveryAddress,
      latitude,
      longitude,
      userId: explicitUserId,
      customerPhone,
      phone,
    } = req.body;

    // Declare session variables early
    let sessionRestaurantId = providedRestaurantId; // May be undefined initially
    let sessionTableId = null;

    console.log("MAKE ORDER - Parsed data:", {
      tableSessionId,
      providedRestaurantId,
      sessionRestaurantId,
      notes,
      itemsCount: items?.length || 0
    });

    // Validate request body
    if (!Array.isArray(items) || items.length === 0) {
      console.log("MAKE ORDER - Validation failed: Invalid items array");
      return res.status(400).json({ message: "Invalid order payload" });
    }

    // Separate regular items from independent extras
    const regularItems = items.filter(item => item.variantId || item.menuItemVariantId);
    const independentExtras = items.filter(item => !item.variantId && !item.menuItemVariantId && item.extras && item.extras.length > 0);

    // Validate that we have at least one valid item
    if (regularItems.length === 0 && independentExtras.length === 0) {
      console.log("MAKE ORDER - Validation failed: No valid items or extras");
      return res.status(400).json({ message: "Invalid order payload - no valid items or extras" });
    }

    // Validate that either tableSessionId or restaurantId is provided
    if (!tableSessionId && !providedRestaurantId) {
      console.log("MAKE ORDER - Validation failed: No tableSessionId or restaurantId");
      return res.status(400).json({ message: "Either tableSessionId or restaurantId is required" });
    }

    console.log("MAKE ORDER - Items validation passed");

    // Generate order ID
    const orderId = nanoid();
    console.log("MAKE ORDER - Generated order ID:", orderId);

    // Fetch menu item variant prices (only for regular items)
    console.log("MAKE ORDER - Fetching variant prices for regular items:", regularItems.map(item => item.variantId || item.menuItemVariantId));
    const variantIds = regularItems.map(item => item.variantId || item.menuItemVariantId).filter(Boolean);
    const variants = variantIds.length > 0 ? await db.select({
      id: menuItemVariants.id,
      price: menuItemVariants.price,
      menuItemId: menuItemVariants.menuItemId
    })
      .from(menuItemVariants)
      .where(inArray(menuItemVariants.id, variantIds)) : [];

    // Helper map for fast resolved variant lookup
    const resolvedVariantMap = new Map<string, { id: string; price: number; menuItemId: string }>();

    for (const item of regularItems) {
      const vKey = item.variantId || item.menuItemVariantId || item.menuItemId || item.id;
      let variant = variants.find(v => v.id === (item.variantId || item.menuItemVariantId));

      if (!variant && (item.menuItemId || item.id)) {
        const itemVariants = await db
          .select({
            id: menuItemVariants.id,
            price: menuItemVariants.price,
            menuItemId: menuItemVariants.menuItemId
          })
          .from(menuItemVariants)
          .where(eq(menuItemVariants.menuItemId, item.menuItemId || item.id))
          .limit(1);
        if (itemVariants.length > 0) {
          variant = itemVariants[0];
        }
      }

      if (!variant) {
        // Fallback: look for valid menu item variants in this restaurant to ensure DB foreign key integrity
        const restaurantVariants = await db
          .select({
            id: menuItemVariants.id,
            price: menuItemVariants.price,
            menuItemId: menuItemVariants.menuItemId
          })
          .from(menuItemVariants)
          .innerJoin(menuItems, eq(menuItemVariants.menuItemId, menuItems.id))
          .where(eq(menuItems.restaurantId, sessionRestaurantId))
          .limit(1);

        if (restaurantVariants.length > 0) {
          const unitPrice = typeof item.price === 'number' ? (item.price > 1000 ? item.price : Math.round(item.price * 100)) : restaurantVariants[0].price;
          variant = {
            id: restaurantVariants[0].id,
            price: unitPrice,
            menuItemId: restaurantVariants[0].menuItemId,
          };
        } else {
          const anyVariant = await db.select().from(menuItemVariants).limit(1);
          const unitPrice = typeof item.price === 'number' ? (item.price > 1000 ? item.price : Math.round(item.price * 100)) : (anyVariant[0]?.price || 12000);
          variant = {
            id: anyVariant[0]?.id || 'default_var',
            price: unitPrice,
            menuItemId: anyVariant[0]?.menuItemId || 'default_item',
          };
        }
      }

      resolvedVariantMap.set(vKey, variant);
    }

    // Create items with prices for billing calculation (including extras)
    const itemsWithPrices = [];
    for (const item of regularItems) {
      const vKey = item.variantId || item.menuItemVariantId || item.menuItemId || item.id;
      const variant = resolvedVariantMap.get(vKey)!;

      let itemTotalPrice = variant.price * item.quantity;

      // Add extras prices if any
      if (item.extras && Array.isArray(item.extras)) {
        for (const extra of item.extras) {
          try {
            const extraDetails = await db
              .select({ price: menuExtras.price })
              .from(menuExtras)
              .where(eq(menuExtras.id, extra.extraId))
              .limit(1);

            let extraPrice = 0;
            if (extraDetails.length > 0) {
              extraPrice = extraDetails[0].price;
            } else if (extra.price) {
              extraPrice = typeof extra.price === 'number' ? (extra.price > 1000 ? extra.price : extra.price * 100) : 0;
            }

            const extraQuantity = extra.quantity || 1;
            itemTotalPrice += extraPrice * extraQuantity * item.quantity;
          } catch (e) {
            console.warn('Extras billing calculation notice:', e);
          }
        }
      }

      itemsWithPrices.push({
        unitPrice: itemTotalPrice / item.quantity, // Effective unit price including extras
        quantity: item.quantity
      });
    }

    // Process independent extras
    for (const extraItem of independentExtras) {
      if (!extraItem.extras || !Array.isArray(extraItem.extras)) continue;

      let totalPrice = 0;
      for (const extra of extraItem.extras) {
        try {
          const extraDetails = await db
            .select({ price: menuExtras.price })
            .from(menuExtras)
            .where(eq(menuExtras.id, extra.extraId))
            .limit(1);

          let extraPrice = 0;
          if (extraDetails.length > 0) {
            extraPrice = extraDetails[0].price;
          } else if (extra.price) {
            extraPrice = typeof extra.price === 'number' ? (extra.price > 1000 ? extra.price : extra.price * 100) : 0;
          }

          const extraQuantity = extra.quantity || 1;
          totalPrice += extraPrice * extraQuantity;
        } catch (e) { }
      }

      itemsWithPrices.push({
        unitPrice: totalPrice, // For independent extras, unit price = total price
        quantity: 1 // Independent extras are treated as single items
      });
    }

    console.log("MAKE ORDER - Items with prices for calculation (including independent extras):", itemsWithPrices);

    // Fetch restaurant GST percentage
    console.log("MAKE ORDER - Fetching restaurant GST percentage for restaurant:", sessionRestaurantId);
    const restaurantData = await db
      .select({
        defaultGstPercentage: restaurants.defaultGstPercentage,
        autoAcceptOrders: restaurants.autoAcceptOrders,
        autoPausedUntil: restaurants.autoPausedUntil,
        isBusyMode: restaurants.isBusyMode,
        defaultPrepTimeMinutes: restaurants.defaultPrepTimeMinutes,
        isOpen: restaurants.isOpen,
      })
      .from(restaurants)
      .where(eq(restaurants.id, sessionRestaurantId))
      .limit(1);

    if (restaurantData.length === 0) {
      console.log("MAKE ORDER - Restaurant not found:", sessionRestaurantId);
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Check if restaurant is temporarily auto-paused due to heavy dining rush
    if (restaurantData[0].autoPausedUntil && new Date(restaurantData[0].autoPausedUntil) > new Date()) {
      const remainingMins = Math.ceil((new Date(restaurantData[0].autoPausedUntil).getTime() - Date.now()) / 60000);
      return res.status(400).json({
        message: `Restaurant is currently paused due to heavy dining rush. Resuming in ${remainingMins} minutes.`,
        isPaused: true,
        remainingMinutes: remainingMins
      });
    }

    const isAutoAccept = Boolean(restaurantData[0].autoAcceptOrders);
    const basePrep = restaurantData[0].defaultPrepTimeMinutes || 20;
    const busyBuffer = restaurantData[0].isBusyMode ? 15 : 0;
    const computedPrepMinutes = basePrep + busyBuffer;
    const initialStatus = isAutoAccept ? "preparing" : (status || "placed");

    const rawGst = Number(restaurantData[0].defaultGstPercentage);
    const gstPercentage = rawGst > 0 ? rawGst : 5;
    console.log("MAKE ORDER - Using GST percentage:", gstPercentage, "| Auto-Accept:", isAutoAccept, "| Initial Status:", initialStatus);

    // Calculate totals - NEW LOGIC: (Subtotal + GST) - Discount
    const subtotal = calculateSubtotal(itemsWithPrices);
    const gstRate = gstPercentage;
    const gst = calculateGST(subtotal, gstRate); // GST on full subtotal
    const grandTotalBeforeDiscount = subtotal + gst;

    let discount = 0;
    if (discountType === 'percentage' && discountValue > 0) {
      discount = Math.floor((grandTotalBeforeDiscount * discountValue) / 100);
    } else if (frontendDiscount !== undefined) {
      discount = Number(frontendDiscount);
    } else {
      discount = 0;
    }

    const taxableBase = calculateTaxableBase(subtotal);
    const grandTotal = calculateGrandTotal(subtotal, gst, discount);

    // For individual KOT/orders, we don't apply the session discount to the ticket total
    const orderDiscount = 0;
    const orderGst = calculateGST(subtotal, gstRate);
    const orderGrandTotal = calculateGrandTotal(subtotal, orderGst, 0);

    console.log("MAKE ORDER - Calculated totals:", {
      subtotal,
      discount,
      taxableBase,
      gst,
      grandTotal
    });

    // Handle table session - validate existing session or reject
    let finalTableSessionId = tableSessionId;

    if (tableSessionId) {
      // Validate that the session exists and is active
      console.log("MAKE ORDER - Validating session:", tableSessionId);
      const existingSession = await db
        .select()
        .from(tableSession)
        .where(eq(tableSession.id, tableSessionId))
        .limit(1);

      if (existingSession.length === 0) {
        console.log("MAKE ORDER - Session not found:", tableSessionId);
        return res.status(404).json({ message: "Table session not found" });
      }

      const session = existingSession[0];

      // Check if session is still active (not billed)
      if (session.billedAt !== null) {
        console.log("MAKE ORDER - Session already billed:", tableSessionId);
        return res.status(400).json({
          message: "Cannot place order - session has been billed. Please request payment confirmation from staff.",
          code: "SESSION_BILLED"
        });
      }

      // Check if session status is active
      if (session.status !== "active") {
        console.log("MAKE ORDER - Session not active:", tableSessionId, "Status:", session.status);
        return res.status(400).json({
          message: "Cannot place order - session is not active",
          code: "SESSION_INACTIVE"
        });
      }

      sessionRestaurantId = session.restaurantId;
      sessionTableId = session.tableId;
      console.log("MAKE ORDER - Session validated successfully");
    }

    // Use provided restaurantId as fallback if session doesn't have one
    if (!sessionRestaurantId && providedRestaurantId) {
      console.log("MAKE ORDER - Using provided restaurantId as fallback:", providedRestaurantId);
      sessionRestaurantId = providedRestaurantId;
    }

    // For direct orders without session (e.g., takeout/delivery), require restaurantId
    if (!tableSessionId) {
      if (!providedRestaurantId) {
        console.log("MAKE ORDER - No session and no restaurantId provided");
        return res.status(400).json({ message: "Restaurant ID is required for direct orders" });
      }
      sessionRestaurantId = providedRestaurantId;

      // Create a session for this direct order
      console.log("MAKE ORDER - Creating session for direct order");
      const newSessionId = nanoid();
      const isCompleted = status === "completed";
      const newSession = {
        id: newSessionId,
        restaurantId: sessionRestaurantId,
        tableId: null,
        qrToken: null,
        status: isCompleted ? ("closed" as const) : ("active" as const),
        paymentStatus: isCompleted ? ("paid" as const) : ("unpaid" as const),
        createdByUserId: user?.id || null,
        startedAt: new Date(),
        subtotal,
        discountAmount: discount,
        taxableBase,
        gstRate: gstPercentage,
        gstAmount: gst,
        grandTotal,
        ...(isCompleted && {
          billedAt: new Date(),
          invoiceNumber: orderId.slice(-6).toUpperCase(),
          finalBillAmount: grandTotal,
          finalAmount: grandTotal,
          frozenSubtotal: subtotal,
          frozenDiscountAmount: discount,
          frozenTaxableAmount: taxableBase,
          frozenGstRate: gstPercentage,
          frozenGstAmount: gst,
        })
      };
      await db.insert(tableSession).values(newSession);
      console.log("MAKE ORDER - Created session for direct order:", newSessionId);
      finalTableSessionId = newSessionId;
    }

    // Ensure we have a restaurant ID
    if (!sessionRestaurantId) {
      console.log("MAKE ORDER - No restaurant ID available");
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    // Create order data
    let dbNotes = notes || null;
    if (deliveryAddress && !sessionTableId) {
      dbNotes = JSON.stringify({
        address: deliveryAddress,
        latitude: latitude || 20.2505,
        longitude: longitude || 85.7882,
        cookingInstructions: notes || ""
      });
    }

    let finalPlacedByUserId = user?.id || explicitUserId || null;
    if (!finalPlacedByUserId) {
      const ph = (customerPhone || phone || "").replace(/[^0-9]/g, "").slice(-10);
      if (ph.length >= 7) {
        const found = await db
          .select({ id: authUsers.id })
          .from(authUsers)
          .where(like(authUsers.email, `%${ph}%`))
          .limit(1);
        if (found.length > 0) {
          finalPlacedByUserId = found[0].id;
        }
      }
    }

    const orderData = {
      id: orderId,
      placedByUserId: finalPlacedByUserId,
      restaurantId: sessionRestaurantId,
      tableSessionId: finalTableSessionId,
      tableId: sessionTableId,
      status: initialStatus,
      subtotal,
      discount: orderDiscount,
      gst: orderGst,
      grandTotal: orderGrandTotal,
      notes: dbNotes,
      acknowledgedByMerchant: false,
      prepTimeMinutes: computedPrepMinutes,
      extendedPrepMinutes: 0,
      handoverOtp: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("MAKE ORDER - Order data to insert:", {
      ...orderData,
      tableNumber: sessionTableId ? 'Fetched from session' : 'N/A'
    });

    // Insert order
    console.log("MAKE ORDER - Inserting order into database");
    const newOrder = await db.insert(orders).values(orderData).returning();
    console.log("MAKE ORDER - Order inserted successfully:", newOrder);

    // Create order items
    console.log("MAKE ORDER - Creating order items data");
    const orderItemsData: any[] = [];
    const orderItemExtrasData: any[] = [];

    // Process regular items
    for (const item of regularItems) {
      const vKey = item.variantId || item.menuItemVariantId || item.menuItemId || item.id;
      const variant = resolvedVariantMap.get(vKey)!;

      const orderItemId = nanoid();
      const itemTotalPrice = variant.price * item.quantity;

      orderItemsData.push({
        id: orderItemId,
        orderId,
        menuItemId: variant.menuItemId,
        menuItemVariantId: variant.id,
        tableSessionId: finalTableSessionId,
        restaurantId: sessionRestaurantId,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice: itemTotalPrice,
        notes: item.itemNotes || null,
        status: (status as any) || "placed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Handle extras for this item
      const extrasNotesList: string[] = [];
      if (item.extras && Array.isArray(item.extras)) {
        for (const extra of item.extras) {
          try {
            const extraDetails = await db
              .select({ id: menuExtras.id, price: menuExtras.price, name: menuExtras.name })
              .from(menuExtras)
              .where(eq(menuExtras.id, extra.extraId))
              .limit(1);

            let extraPrice = 0;
            let extraName = extra.name || extra.extraId || 'Extra';

            if (extraDetails.length > 0) {
              extraPrice = extraDetails[0].price;
              extraName = extraDetails[0].name;

              const extraQuantity = (extra.quantity || 1) * item.quantity;
              const extraTotalPrice = extraPrice * extraQuantity;

              orderItemExtrasData.push({
                id: nanoid(),
                orderItemId,
                extraId: extraDetails[0].id,
                quantity: extraQuantity,
                unitPrice: extraPrice,
                totalPrice: extraTotalPrice,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            } else if (extra.price) {
              extraPrice = typeof extra.price === 'number' ? (extra.price > 1000 ? extra.price : extra.price * 100) : 0;
            }

            extrasNotesList.push(extraName);
          } catch (e) {
            console.warn('Extras insertion notice:', e);
          }
        }
      }

      if (extrasNotesList.length > 0) {
        const extraNoteStr = `Add-ons: ${extrasNotesList.join(', ')}`;
        const lastIdx = orderItemsData.length - 1;
        if (lastIdx >= 0) {
          orderItemsData[lastIdx].notes = orderItemsData[lastIdx].notes
            ? `${orderItemsData[lastIdx].notes} | ${extraNoteStr}`
            : extraNoteStr;
        }
      }
    }

    // Process independent extras - create a single virtual order item for all extras
    if (independentExtras.length > 0) {
      const orderItemId = nanoid();
      let totalExtrasPrice = 0;
      let extrasDescription = 'Independent extras: ';
      const extrasList: string[] = [];

      for (const extraItem of independentExtras) {
        if (!extraItem.extras || !Array.isArray(extraItem.extras)) continue;

        for (const extra of extraItem.extras) {
          try {
            const extraDetails = await db
              .select({ price: menuExtras.price, name: menuExtras.name })
              .from(menuExtras)
              .where(eq(menuExtras.id, extra.extraId))
              .limit(1);

            let extraPrice = 0;
            let extraName = extra.name || 'Extra';
            if (extraDetails.length > 0) {
              extraPrice = extraDetails[0].price;
              extraName = extraDetails[0].name;
            } else if (extra.price) {
              extraPrice = typeof extra.price === 'number' ? (extra.price > 1000 ? extra.price : extra.price * 100) : 0;
            }

            const extraQuantity = extra.quantity || 1;
            const extraTotalPrice = extraPrice * extraQuantity;
            totalExtrasPrice += extraTotalPrice;

            extrasList.push(`${extraQuantity}x ${extraName}`);
          } catch (e) { }
        }
      }

      if (totalExtrasPrice > 0) {
        // Create a virtual order item for independent extras
        // We'll use a placeholder menu item - this is a workaround
        // In a real implementation, you'd have a dedicated "Extras" menu item
        orderItemsData.push({
          id: orderItemId,
          orderId,
          menuItemId: "independent-extras", // Virtual ID
          menuItemVariantId: "independent-extras-variant", // Virtual ID
          tableSessionId: finalTableSessionId,
          restaurantId: sessionRestaurantId,
          quantity: 1,
          unitPrice: totalExtrasPrice,
          totalPrice: totalExtrasPrice,
          notes: `${extrasDescription}${extrasList.join(', ')}`,
          status: (status as any) || "placed",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Add the extras to the virtual order item
        for (const extraItem of independentExtras) {
          if (!extraItem.extras || !Array.isArray(extraItem.extras)) continue;

          for (const extra of extraItem.extras) {
            const extraDetails = await db
              .select({ price: menuExtras.price })
              .from(menuExtras)
              .where(eq(menuExtras.id, extra.extraId))
              .limit(1);

            const extraPrice = extraDetails[0].price;
            const extraQuantity = extra.quantity || 1;
            const extraTotalPrice = extraPrice * extraQuantity;

            orderItemExtrasData.push({
              id: nanoid(),
              orderItemId,
              extraId: extra.extraId,
              quantity: extraQuantity,
              unitPrice: extraPrice,
              totalPrice: extraTotalPrice,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
    }

    console.log("MAKE ORDER - Order items data:", orderItemsData);
    console.log("MAKE ORDER - Order item extras data:", orderItemExtrasData);

    // Insert order items
    console.log("MAKE ORDER - Inserting order items into database");
    await db.insert(orderItems).values(orderItemsData);
    console.log("MAKE ORDER - Order items inserted successfully");

    // Insert order item extras if any
    if (orderItemExtrasData.length > 0) {
      console.log("MAKE ORDER - Inserting order item extras into database");
      await db.insert(orderItemExtras).values(orderItemExtrasData);
      console.log("MAKE ORDER - Order item extras inserted successfully");
    }

    // Update order item total prices to include extras
    for (const orderItem of orderItemsData) {
      const itemExtras = orderItemExtrasData.filter((extra: any) => extra.orderItemId === orderItem.id);
      const extrasTotal = itemExtras.reduce((sum: number, extra: any) => sum + extra.totalPrice, 0);
      const newTotalPrice = orderItem.totalPrice + extrasTotal;

      if (extrasTotal > 0) {
        await db
          .update(orderItems)
          .set({ totalPrice: newTotalPrice, updatedAt: new Date() })
          .where(eq(orderItems.id, orderItem.id));
        orderItem.totalPrice = newTotalPrice;
      }
    }

    // Update session totals to include this order
    if (finalTableSessionId) {
      console.log("MAKE ORDER - Updating session totals for session:", finalTableSessionId);

      // Calculate current session totals by summing all orders in the session
      const allOrdersInSession = await db
        .select({
          subtotal: orders.subtotal,
          discount: orders.discount,
          gst: orders.gst,
          grandTotal: orders.grandTotal
        })
        .from(orders)
        .where(eq(orders.tableSessionId, finalTableSessionId));

      const sessionSubtotal = allOrdersInSession.reduce((sum, order) => sum + order.subtotal, 0);
      const sessionDiscount = allOrdersInSession.reduce((sum, order) => sum + order.discount, 0);
      const sessionGst = allOrdersInSession.reduce((sum, order) => sum + order.gst, 0);
      const sessionGrandTotal = allOrdersInSession.reduce((sum, order) => sum + order.grandTotal, 0);

      // Calculate extras total for the session
      const sessionExtrasTotal = await db
        .select({ total: sql<number>`sum(${orderItemExtras.totalPrice})` })
        .from(orderItemExtras)
        .leftJoin(orderItems, eq(orderItemExtras.orderItemId, orderItems.id))
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orders.tableSessionId, finalTableSessionId))
        .then(result => result[0]?.total || 0);

      // Calculate taxable base (subtotal - discount)
      const sessionTaxableBase = sessionSubtotal - sessionDiscount;

      await db
        .update(tableSession)
        .set({
          subtotal: sessionSubtotal,
          extrasTotal: sessionExtrasTotal,
          discountAmount: sessionDiscount,
          taxableBase: sessionTaxableBase,
          gstRate: gstPercentage, // Store as standard percentage (e.g., 5 for 5%) for consistency
          gstAmount: sessionGst,
          grandTotal: sessionGrandTotal
        })
        .where(eq(tableSession.id, finalTableSessionId));

      console.log("MAKE ORDER - Session totals updated:", {
        sessionId: finalTableSessionId,
        subtotal: sessionSubtotal,
        extrasTotal: sessionExtrasTotal,
        discountAmount: sessionDiscount,
        taxableBase: sessionTaxableBase,
        gstRate: gstPercentage,
        gstAmount: sessionGst,
        grandTotal: sessionGrandTotal
      });
    }

    // Emit WebSocket event for real-time updates
    emitToRestaurant(sessionRestaurantId, 'order-created', {
      orderId,
      restaurantId: sessionRestaurantId,
      tableSessionId: finalTableSessionId,
      status: initialStatus,
      autoAccepted: isAutoAccept,
      prepTimeMinutes: computedPrepMinutes,
      totalAmount: grandTotal,
      itemCount: items.length,
      createdAt: new Date().toISOString()
    });

    // Also emit to order room for customer live tracker
    emitToOrder(orderId, 'order-status', {
      orderId,
      status: initialStatus,
      prepTimeMinutes: computedPrepMinutes,
      updatedAt: new Date().toISOString()
    });
    emitToOrder(orderId, 'order-status-update', {
      orderId,
      status: initialStatus,
      prepTimeMinutes: computedPrepMinutes,
      updatedAt: new Date().toISOString()
    });
    emitToOrder(orderId, 'order-update', {
      orderId,
      status: initialStatus,
      prepTimeMinutes: computedPrepMinutes,
      order: {
        ...newOrder[0],
        status: initialStatus,
        prepTimeMinutes: computedPrepMinutes,
      },
      updatedAt: new Date().toISOString()
    });

    // Return success response
    console.log("MAKE ORDER - Returning success response");
    res.status(201).json({
      order: newOrder[0],
      items: orderItemsData,
      message: "Order created successfully"
    });

    // Invalidate Kitchen Cache
    if (sessionRestaurantId) {
      orderCache.invalidate(sessionRestaurantId);
    }

  } catch (error) {
    console.error("MAKE ORDER ERROR:", error);
    if (error instanceof Error) {
      console.error("MAKE ORDER ERROR - Stack:", error.stack);
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /make-order/restaurant


// GET /orders/:tableSessionId
router.get("/:tableSessionId", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const tableSessionId = req.params.tableSessionId;

    const isValidSession = await verifyTableSession(tableSessionId);
    if (!isValidSession) {
      return res
        .status(400)
        .json({ message: "Invalid or inactive table session" });
    }

    // Fetch the session once
    const session = (
      await db
        .select()
        .from(tableSession)
        .where(eq(tableSession.id, tableSessionId))
        .limit(1)
    )[0];

    if (!session) {
      return res.status(404).json({ message: "Table session not found" });
    }

    const isCustomer = session.createdByUserId === user.id;

    const isManager =
      (
        await db
          .select()
          .from(restaurantManagers)
          .where(
            and(
              eq(restaurantManagers.restaurantId, session.restaurantId),
              eq(restaurantManagers.userId, user.id)
            )
          )
          .limit(1)
      ).length > 0;

    const isAllowedUser = isCustomer || isManager;

    if (!isAllowedUser) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view these orders" });
    }

    const ordersList = await db
      .select()
      .from(orders)
      .where(eq(orders.tableSessionId, tableSessionId));

    // ✅ Updated query to join with menuItems and menuItemVariants
    const orderItemsRaw = await db
      .select()
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(
        menuItemVariants,
        eq(orderItems.menuItemVariantId, menuItemVariants.id)
      )
      .where(eq(orderItems.tableSessionId, tableSessionId));

    // ✅ Fetch order item extras with menu extras details
    const orderItemExtrasRaw = await db
      .select({
        orderItemId: orderItemExtras.orderItemId,
        extraId: orderItemExtras.extraId,
        quantity: orderItemExtras.quantity,
        unitPrice: orderItemExtras.unitPrice,
        totalPrice: orderItemExtras.totalPrice,
        extraName: menuExtras.name,
        extraPrice: menuExtras.price,
      })
      .from(orderItemExtras)
      .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
      .where(inArray(orderItemExtras.orderItemId, orderItemsRaw.map(row => row.order_items.id)));

    // ✅ Flatten the result to include names and extras
    const orderItemsList = orderItemsRaw.map((row) => {
      const itemExtras = orderItemExtrasRaw
        .filter(extra => extra.orderItemId === row.order_items.id)
        .map(extra => ({
          extraId: extra.extraId,
          name: extra.extraName,
          quantity: extra.quantity,
          unitPrice: extra.unitPrice,
          totalPrice: extra.totalPrice,
        }));

      return {
        ...row.order_items,
        menuItemName: row.menu_items?.name,
        variantName: row.menu_item_variants?.variantName,
        extras: itemExtras,
      };
    });

    // Attach items to their respective orders
    const ordersWithItems = ordersList.map((order) => {
      return {
        ...order,
        items: orderItemsList.filter(
          (item) => item.orderId === order.id && item.status !== "cancelled"
        ),
      };
    });

    return res.status(200).json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /orders/:orderId/cancel
router.patch("/:orderId/cancel", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const orderId = req.params.orderId;

    const orderRow = (
      await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    )[0];

    if (!orderRow) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      orderRow.status === "served" ||
      orderRow.status === "preparing" ||
      orderRow.status === "cancelled"
    ) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    // Fetch session to enforce payment locks
    const session = (
      await db
        .select()
        .from(tableSession)
        .where(eq(tableSession.id, orderRow.tableSessionId!))
        .limit(1)
    )[0];

    if (!session) {
      return res.status(404).json({ message: "Table session not found" });
    }

    if (session.paymentStatus === "paid") {
      return res
        .status(403)
        .json({ message: "Payment already completed. Cannot cancel order." });
    }

    const isManager =
      (
        await db
          .select()
          .from(restaurantManagers)
          .where(
            and(
              eq(restaurantManagers.restaurantId, orderRow.restaurantId),
              eq(restaurantManagers.userId, user.id)
            )
          )
          .limit(1)
      ).length > 0;

    const isAllowedUser = orderRow.placedByUserId === user.id || isManager;

    if (!isAllowedUser) {
      return res
        .status(403)
        .json({ message: "You are not authorized to cancel this order" });
    }

    await db
      .update(orders)
      .set({ status: "cancelled" })
      .where(eq(orders.id, orderId));

    emitToRestaurant(orderRow.restaurantId, 'order-updated', {
      orderId,
      status: "cancelled",
      restaurantId: orderRow.restaurantId,
      tableSessionId: orderRow.tableSessionId,
      updatedAt: new Date().toISOString()
    });

    emitToOrder(orderId, 'order-status', {
      orderId,
      status: "cancelled",
      updatedAt: new Date().toISOString()
    });

    await sendNotification(
      orderRow.restaurantId,
      `Order ${orderId} has been cancelled.`,
      "order-update"
    );

    return res.status(200).json({ message: "Order cancelled successfully" });

    // Invalidate Cache
    orderCache.invalidate(orderRow.restaurantId);
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /orders/:orderId/items/update
router.patch("/:orderId/items/update", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const orderId = req.params.orderId;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid items payload" });
    }

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // ✅ Fetch order
    const order = (
      await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    )[0];

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ Fetch session
    const session = (
      await db
        .select()
        .from(tableSession)
        .where(eq(tableSession.id, order.tableSessionId!))
        .limit(1)
    )[0];

    if (!session) {
      return res.status(404).json({ message: "Table session not found" });
    }

    // ✅ HARD LOCKS
    if (session.paymentStatus === "paid") {
      return res
        .status(403)
        .json({ message: "Payment already completed. Cannot modify order." });
    }

    if (order.status !== "placed") {
      return res
        .status(403)
        .json({ message: "Order can no longer be modified" });
    }

    // ✅ Authorization: customer OR restaurant staff
    const isManager =
      (
        await db
          .select()
          .from(restaurantManagers)
          .where(
            and(
              eq(restaurantManagers.restaurantId, order.restaurantId),
              eq(restaurantManagers.userId, user.id)
            )
          )
          .limit(1)
      ).length > 0;

    const isAllowedUser = order.placedByUserId === user.id || isManager;

    if (!isAllowedUser) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this order" });
    }

    // ✅ Process each item
    for (const item of items) {
      const {
        action,
        orderItemId,
        menuItemId,
        menuItemVariantId,
        quantity,
        itemNotes,
      } = item;

      // ---------- ADD ITEM ----------
      if (action === "add") {
        if (!menuItemVariantId || !quantity || quantity <= 0) {
          return res.status(400).json({ message: "Invalid add item payload" });
        }

        const variant = (
          await db
            .select()
            .from(menuItemVariants)
            .where(eq(menuItemVariants.id, menuItemVariantId))
            .limit(1)
        )[0];
        if (variant.menuItemId !== menuItemId) {
          return res
            .status(400)
            .json({ message: "Variant does not belong to this menu item" });
        }

        if (!variant || !variant.isActive || !variant.isAvailable) {
          return res
            .status(400)
            .json({ message: "Invalid or unavailable variant" });
        }

        const unitPriceSnapshot = variant.price; // already in paise
        const totalPrice = unitPriceSnapshot * quantity; // paise

        await db.insert(orderItems).values({
          id: nanoid(),
          orderId,
          tableSessionId: order.tableSessionId,
          restaurantId: order.restaurantId,

          menuItemId,
          menuItemVariantId,

          quantity,
          unitPrice: unitPriceSnapshot, // paise
          totalPrice, // paise

          notes: itemNotes,
          status: "placed",
        });
      }

      // ---------- UPDATE ITEM ----------
      if (action === "update") {
        if (!orderItemId || !quantity || quantity <= 0) {
          return res.status(400).json({ message: "Invalid update payload" });
        }

        const existingItem = (
          await db
            .select()
            .from(orderItems)
            .where(
              and(
                eq(orderItems.id, orderItemId),
                eq(orderItems.orderId, orderId)
              )
            )
            .limit(1)
        )[0];

        if (!existingItem) {
          return res.status(404).json({ message: "Order item not found" });
        }

        const newTotal = existingItem.unitPrice * quantity; // paise

        await db
          .update(orderItems)
          .set({
            quantity,
            totalPrice: newTotal,
            notes: itemNotes ?? existingItem.notes,
          })
          .where(eq(orderItems.id, orderItemId));
      }

      // ---------- REMOVE ITEM ----------
      if (action === "remove") {
        if (!orderItemId) {
          return res.status(400).json({ message: "Invalid remove payload" });
        }

        await db
          .update(orderItems)
          .set({
            status: "cancelled",
            quantity: 0,
            totalPrice: 0,
          })
          .where(eq(orderItems.id, orderItemId));
      }
    }

    // ✅ Recalculate order total (in paise)
    const updatedItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const newTotalAmountInPaise = updatedItems.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || 0),
      0
    );

    return res.status(200).json({
      message: "Order items updated successfully",
      orderId,
      updatedTotal: newTotalAmountInPaise, // return in paise
    });

    // Invalidate Cache
    orderCache.invalidate(order.restaurantId);
  } catch (error) {
    console.error("Error updating order items:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /orders/:orderId/status
router.patch("/:orderId/status", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const orderId = req.params.orderId;
    const { status, prepTimeMinutes } = req.body;

    if (
      !status ||
      !["placed", "preparing", "served", "ready", "cancelled"].includes(status)
    ) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const orderRow = (
      await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    )[0];

    const validTransitions: Record<string, string[]> = {
      placed: ["preparing", "cancelled"],
      preparing: ["ready", "served", "cancelled"],
      ready: ["served", "cancelled"],
      served: [],
      cancelled: [],
    };

    if (!orderRow) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status !== orderRow.status && !validTransitions[orderRow.status].includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition from ${orderRow.status} to ${status}`,
      });
    }

    // Check if user is owner, manager, or staff
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, orderRow.restaurantId);

    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update order status. Only restaurant owner, manager, or staff can perform this action." });
    }

    // Update the order status and optional custom prep time
    const now = new Date();
    const updateData: any = { status, updatedAt: now };
    if (status === 'preparing') {
      updateData.acknowledgedAt = now;
      updateData.acknowledgedByMerchant = true;
    }
    const customPrepMinutes = Number(prepTimeMinutes);
    if (!isNaN(customPrepMinutes) && customPrepMinutes > 0) {
      updateData.prepTimeMinutes = customPrepMinutes;
    }

    const orderStatus = await db.update(orders).set(updateData).where(eq(orders.id, orderId));
    const effectivePrepMinutes = updateData.prepTimeMinutes || orderRow.prepTimeMinutes || 20;

    // Invalidate Cache immediately so subsequent reads have fresh status and prep time
    orderCache.invalidate(orderRow.restaurantId);

    const nowIso = now.toISOString();

    // Emit WebSocket event for real-time updates to restaurant app
    emitToRestaurant(orderRow.restaurantId, 'order-updated', {
      orderId,
      status,
      prepTimeMinutes: effectivePrepMinutes,
      extendedPrepMinutes: orderRow.extendedPrepMinutes || 0,
      totalPrepMinutes: effectivePrepMinutes + (orderRow.extendedPrepMinutes || 0),
      acceptedTime: nowIso,
      acknowledgedAt: nowIso,
      restaurantId: orderRow.restaurantId,
      tableSessionId: orderRow.tableSessionId,
      updatedAt: nowIso
    });

    // Also emit to order-specific room for the customer to receive
    emitToOrder(orderId, 'order-status', {
      orderId,
      status,
      prepTimeMinutes: effectivePrepMinutes,
      extendedPrepMinutes: orderRow.extendedPrepMinutes || 0,
      totalPrepMinutes: effectivePrepMinutes + (orderRow.extendedPrepMinutes || 0),
      acceptedTime: nowIso,
      acknowledgedAt: nowIso,
      updatedAt: nowIso
    });
    emitToOrder(orderId, 'order-status-update', {
      orderId,
      status,
      prepTimeMinutes: effectivePrepMinutes,
      extendedPrepMinutes: orderRow.extendedPrepMinutes || 0,
      totalPrepMinutes: effectivePrepMinutes + (orderRow.extendedPrepMinutes || 0),
      acceptedTime: nowIso,
      acknowledgedAt: nowIso,
      updatedAt: nowIso
    });
    emitToOrder(orderId, 'order-update', {
      orderId,
      status,
      prepTimeMinutes: effectivePrepMinutes,
      extendedPrepMinutes: orderRow.extendedPrepMinutes || 0,
      totalPrepMinutes: effectivePrepMinutes + (orderRow.extendedPrepMinutes || 0),
      acceptedTime: nowIso,
      acknowledgedAt: nowIso,
      order: {
        id: orderId,
        status,
        prepTimeMinutes: effectivePrepMinutes,
        extendedPrepMinutes: orderRow.extendedPrepMinutes || 0,
      },
      updatedAt: nowIso
    });

    // If the status is changed to "served", calculate billing details
    if (status === "served") {
      // 1. Update all items in this order to 'served' so they are included in calculation
      await db
        .update(orderItems)
        .set({ status: "served" })
        .where(eq(orderItems.orderId, orderId));

      // Ensure tableSessionId is not null before proceeding
      if (!orderRow.tableSessionId) {
        return res.status(400).json({ message: "Order not associated with a table session" });
      }

      const session = (
        await db
          .select()
          .from(tableSession)
          .where(eq(tableSession.id, orderRow.tableSessionId))
          .limit(1)
      )[0];

      if (!session) {
        return res.status(404).json({ message: "Table session not found" });
      }

      // 2. Fetch ALL served items for this SESSION (not just this order)
      const sessionItems = await db
        .select({
          unitPrice: orderItems.unitPrice,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(
          and(
            eq(orderItems.tableSessionId, session.id),
            eq(orderItems.status, "served")
          )
        );

      // 3. Calculate billing details
      const subtotal = calculateSubtotal(sessionItems);
      const currentGstRate = session.gstRate || 0;
      const gstAmount = calculateGST(subtotal, currentGstRate);
      const grandTotalBeforeDiscount = subtotal + gstAmount;

      const discountAmount = calculateDiscount(
        grandTotalBeforeDiscount,
        session.discountPercentage || 0
      );

      const taxableBase = calculateTaxableBase(subtotal);
      const grandTotal = calculateGrandTotal(subtotal, gstAmount, discountAmount);

      // 4. Update the table session with billing details
      await db
        .update(tableSession)
        .set({
          subtotal,
          discountAmount,
          taxableBase,
          gstAmount,
          grandTotal,
        })
        .where(eq(tableSession.id, session.id));
    }

    // Send notification about order status update
    await sendNotification(
      orderRow.restaurantId,
      `Order ${orderId} has been ${typeof status === 'string' ? status.charAt(0).toUpperCase() + status.slice(1) : 'updated'}.`,
      "order-update"
    );

    return res
      .json({ message: "Order status updated successfully" });

    // Invalidate Cache
    orderCache.invalidate(orderRow.restaurantId);
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /:userId/user-orders
router.get("/:userId/user-orders", requireAuth, async (req: any, res) => {
  try {
    const userId = req.params.userId;

    if (req.user.id !== userId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view these orders" });
    }

    // Find all linked customer accounts (by phone or ID) so user sees all their real database orders
    const userProfile = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    let allUserIds = [userId];
    let cleanPhone = '';
    if (userProfile.length > 0 && userProfile[0].phoneNumber) {
      cleanPhone = userProfile[0].phoneNumber.replace(/[^0-9]/g, '').slice(-10);
    }
    if (!cleanPhone && req.user?.email) {
      const emailPhone = req.user.email.replace(/[^0-9]/g, '').slice(-10);
      if (emailPhone.length >= 7) cleanPhone = emailPhone;
    }
    if (cleanPhone.length >= 7) {
      const matchingProfiles = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(like(profiles.phoneNumber, `%${cleanPhone}%`));
      const matchingUsers = await db
        .select({ id: authUsers.id })
        .from(authUsers)
        .where(like(authUsers.email, `%${cleanPhone}%`));
      allUserIds = Array.from(new Set([userId, ...matchingProfiles.map(p => p.userId), ...matchingUsers.map(u => u.id)]));
    }

    const userOrders = await db
      .select({
        id: orders.id,
        tableSessionId: orders.tableSessionId,
        restaurantId: orders.restaurantId,
        tableId: orders.tableId,
        placedByUserId: orders.placedByUserId,
        notes: orders.notes,
        status: orders.status,
        handoverOtp: orders.handoverOtp,
        prepTimeMinutes: orders.prepTimeMinutes,
        extendedPrepMinutes: orders.extendedPrepMinutes,
        subtotal: orders.subtotal,
        discount: orders.discount,
        gst: orders.gst,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        restaurantName: restaurants.restaurantName,
        restaurantBanner: restaurants.restaurantBanner,
        city: restaurants.city,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(
        cleanPhone.length >= 7
          ? or(inArray(orders.placedByUserId, allUserIds), like(orders.notes, `%${cleanPhone}%`))
          : inArray(orders.placedByUserId, allUserIds)
      )
      .orderBy(desc(orders.createdAt));

    const orderIds = userOrders.map(o => o.id);
    let allOrderItems: any[] = [];
    let allDeliveries: any[] = [];
    if (orderIds.length > 0) {
      allOrderItems = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          menuItemId: orderItems.menuItemId,
          menuItemVariantId: orderItems.menuItemVariantId,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          notes: orderItems.notes,
          status: orderItems.status,
          menuItemName: menuItems.name,
          isVeg: menuItems.isVeg,
          imageURL: menuItems.imageURL,
        })
        .from(orderItems)
        .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(inArray(orderItems.orderId, orderIds));

      try {
        allDeliveries = await db
          .select({
            id: orderDeliveries.id,
            orderId: orderDeliveries.orderId,
            status: orderDeliveries.status,
            etaMinutes: orderDeliveries.etaMinutes,
            riderId: orderDeliveries.riderId,
            riderName: deliveryRiders.name,
            riderPhone: deliveryRiders.phone,
            currentLat: orderDeliveries.currentLat,
            currentLng: orderDeliveries.currentLng,
            updatedAt: orderDeliveries.updatedAt,
          })
          .from(orderDeliveries)
          .leftJoin(deliveryRiders, eq(orderDeliveries.riderId, deliveryRiders.id))
          .where(inArray(orderDeliveries.orderId, orderIds))
          .orderBy(desc(orderDeliveries.updatedAt));
      } catch (delErr) {
        console.warn("Could not fetch deliveries for user orders:", delErr);
      }
    }

    const ordersWithItems = userOrders.map(order => {
      let parsedDeliveryAddress = undefined;
      let parsedCustomerLat = undefined;
      let parsedCustomerLng = undefined;
      if (order.notes && typeof order.notes === 'string') {
        try {
          if (order.notes.startsWith('{') && order.notes.endsWith('}')) {
            const parsed = JSON.parse(order.notes);
            if (parsed.address) parsedDeliveryAddress = parsed.address;
            if (parsed.latitude) parsedCustomerLat = Number(parsed.latitude);
            if (parsed.longitude) parsedCustomerLng = Number(parsed.longitude);
          }
        } catch (e) {}
      }

      const activeDelivery = allDeliveries.find(d => d.orderId === order.id);

      return {
        ...order,
        deliveryStatus: activeDelivery?.status || null,
        riderName: activeDelivery?.riderName || null,
        riderPhone: activeDelivery?.riderPhone || null,
        riderId: activeDelivery?.riderId || null,
        delivery: activeDelivery || null,
        deliveryAddress: parsedDeliveryAddress || (order as any).deliveryAddress || undefined,
        customerLatitude: parsedCustomerLat,
        customerLongitude: parsedCustomerLng,
        items: allOrderItems.filter(item => item.orderId === order.id).map(item => ({
          id: item.id,
          name: item.menuItemName || 'Unknown Item',
          quantity: item.quantity,
          price: item.unitPrice,
          totalPrice: item.totalPrice,
          isVeg: item.isVeg,
          imageURL: item.imageURL,
          notes: item.notes,
        })),
      };
    });

    return res.status(200).json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /verify-existing (batch check if order IDs exist in the database)
router.post("/verify-existing", async (req: any, res) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(200).json({ existingIds: [] });
    }
    const cleanIds = orderIds.map(String).filter(Boolean).slice(0, 500);
    const existing = await db
      .select({ id: orders.id })
      .from(orders)
      .where(inArray(orders.id, cleanIds));
    const existingIds = existing.map(r => r.id);
    return res.status(200).json({ existingIds });
  } catch (err) {
    console.error("Error verifying order IDs:", err);
    return res.status(500).json({ existingIds: [] });
  }
});

// GET restaurant orders for managers
router.get(
  "/restaurant/:restaurantId/manager-orders",
  requireAuth,
  async (req: any, res) => {
    try {
      const restaurantId = req.params.restaurantId;
      const user = req.user;

      // Pagination and Filtering params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const statusParam = req.query.status as string;
      const statuses = statusParam ? statusParam.split(',') : null;

      const offset = (page - 1) * limit;

      const isAllowedUser = await isRestaurantOwnerManagerOrStaff(
        user.id,
        restaurantId
      );
      if (!isAllowedUser) {
        return res
          .status(403)
          .json({ message: "You are not authorized to view these orders" });
      }

      // Base filters
      const conditions = [eq(orders.restaurantId, restaurantId)];

      if (statuses && statuses.length > 0) {
        conditions.push(inArray(orders.status, statuses as any[]));
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(...conditions));

      const total = Number(totalCountResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      const restaurantOrders = await db
        .select({
          id: orders.id,
          tableSessionId: orders.tableSessionId,
          restaurantId: orders.restaurantId,
          tableId: orders.tableId,
          placedByUserId: orders.placedByUserId,
          customerName: authUsers.name,
          customerEmail: authUsers.email,
          notes: orders.notes,
          status: orders.status,
          handoverOtp: orders.handoverOtp,
          prepTimeMinutes: orders.prepTimeMinutes,
          extendedPrepMinutes: orders.extendedPrepMinutes,
          subtotal: orders.subtotal,
          discount: orders.discount,
          gst: orders.gst,
          grandTotal: orders.grandTotal,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
          // Join with tables to get table number
          tableNumber: tables.tableNumber,
        })
        .from(orders)
        .leftJoin(tables, eq(orders.tableId, tables.id))
        .leftJoin(authUsers, eq(orders.placedByUserId, authUsers.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      console.log(`[DEBUG] manager-orders fetched ${restaurantOrders.length} orders. Total: ${total}`);
      if (restaurantOrders.length > 0) {
        console.log(`[DEBUG] First order: ID=${restaurantOrders[0].id}, TableID=${restaurantOrders[0].tableId}, TableNum=${restaurantOrders[0].tableNumber}, Status=${restaurantOrders[0].status}`);
      }

      // Get order items for each order with menu item and variant details
      const orderIds = restaurantOrders.map(order => order.id);


      // Check if summary mode is requested
      const isSummary = req.query.summary === 'true';

      let allOrderItems: any[] = [];
      let allOrderItemExtras: any[] = [];

      // Only fetch items if NOT in summary mode
      if (!isSummary && orderIds.length > 0) {
        allOrderItems = await db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            menuItemId: orderItems.menuItemId,
            menuItemVariantId: orderItems.menuItemVariantId,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            totalPrice: orderItems.totalPrice,
            notes: orderItems.notes,
            status: orderItems.status,
            // Join with menu items to get item name
            menuItemName: menuItems.name,
            isVeg: menuItems.isVeg,
            // Join with menu_item_variants to get variant name and details
            variantName: menuItemVariants.variantName,
            portionSize: menuItemVariants.portionSize,
            foodType: menuItemVariants.foodType,
            // Join with menu_categories to get category name
            categoryName: menuCategories.category,
          })
          .from(orderItems)
          .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
          .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
          .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
          .where(inArray(orderItems.orderId, orderIds));

        // Get order item extras
        const orderItemIds = allOrderItems.map(item => item.id);

        if (orderItemIds.length > 0) {
          allOrderItemExtras = await db
            .select({
              id: orderItemExtras.id,
              orderItemId: orderItemExtras.orderItemId,
              extraId: orderItemExtras.extraId,
              quantity: orderItemExtras.quantity,
              unitPrice: orderItemExtras.unitPrice,
              totalPrice: orderItemExtras.totalPrice,
              name: menuExtras.name,
            })
            .from(orderItemExtras)
            .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
            .where(inArray(orderItemExtras.orderItemId, orderItemIds));
        }
      }

      // If summary mode, we still need itemCount for dashboard
      let orderItemCounts: { orderId: string, count: number }[] = [];
      if (isSummary && orderIds.length > 0) {
        const counts = await db
          .select({
            orderId: orderItems.orderId,
            count: sql<number>`count(*)` // or sum(quantity) if we want total items count
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
          .groupBy(orderItems.orderId);

        orderItemCounts = counts.map(c => ({ orderId: c.orderId || '', count: Number(c.count) }));
      }

      // Fetch delivery partner assignments for all orders
      let allDeliveries: any[] = [];
      if (orderIds.length > 0) {
        try {
          allDeliveries = await db
            .select({
              orderId: orderDeliveries.orderId,
              deliveryId: orderDeliveries.id,
              deliveryStatus: orderDeliveries.status,
              etaMinutes: orderDeliveries.etaMinutes,
              riderId: orderDeliveries.riderId,
              riderName: deliveryRiders.name,
              riderPhone: deliveryRiders.phone,
            })
            .from(orderDeliveries)
            .leftJoin(deliveryRiders, eq(orderDeliveries.riderId, deliveryRiders.id))
            .where(inArray(orderDeliveries.orderId, orderIds));
        } catch (delErr) {
          console.warn("[DEBUG] Error fetching delivery assignments:", delErr);
        }
      }



      // Group items by order
      const ordersWithItems = restaurantOrders.map(order => {
        if (isSummary) {
          const countObj = orderItemCounts.find(c => c.orderId === order.id);
          return {
            ...order,
            itemCount: countObj ? countObj.count : 0,
            items: [], // Empty items array for summary
            totalAmount: order.grandTotal || 0
          };
        }

        const del = allDeliveries.find(d => d.orderId === order.id);
        const isDeliveryOrder = !order.tableId && !order.tableNumber;
        const isRiderAssigned = del && del.deliveryStatus && del.deliveryStatus !== 'offered';

        return {
          ...order,
          totalAmount: order.grandTotal || 0,
          isDelivery: isDeliveryOrder,
          deliveryStatus: isRiderAssigned ? del.deliveryStatus : (isDeliveryOrder ? 'unassigned' : null),
          riderName: isRiderAssigned ? del.riderName : null,
          riderPhone: isRiderAssigned ? del.riderPhone : null,
          etaMinutes: isRiderAssigned ? del.etaMinutes : null,
          items: allOrderItems.filter(item => item.orderId === order.id).map(item => ({
            id: item.id,
            menuItemName: item.menuItemName || 'Unknown Item',
            variantName: item.variantName || 'Standard',
            portionSize: item.portionSize,
            foodType: item.foodType,
            isVeg: item.isVeg,
            quantity: item.quantity,
            price: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            status: item.status,
            category: item.categoryName || 'Uncategorized',
            extras: allOrderItemExtras
              .filter(extra => extra.orderItemId === item.id)
              .map(extra => ({
                extraId: extra.extraId,
                name: extra.name,
                quantity: extra.quantity,
                unitPrice: extra.unitPrice,
                totalPrice: extra.totalPrice,
              })),
          })),
        };
      });

      return res.status(200).json({
        orders: ordersWithItems,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    } catch (error) {
      console.error("Error fetching restaurant orders:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// POST /manual-order - Create order manually for restaurant staff
router.post("/manual-order", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const {
      tableId,
      sessionId,
      items,
      notes
    } = req.body;

    console.log("MANUAL ORDER REQUEST:", { tableId, sessionId, itemsCount: items?.length, notes });

    // ✅ 1. AUTH CHECK
    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ✅ 2. VALIDATION
    if (!tableId || !sessionId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Table ID, Session ID, and items are required" });
    }

    // ✅ 3. VERIFY SESSION EXISTS AND GET RESTAURANT ID
    const session = await db
      .select({
        id: tableSession.id,
        restaurantId: tableSession.restaurantId,
        status: tableSession.status
      })
      .from(tableSession)
      .where(eq(tableSession.id, sessionId))
      .limit(1);

    if (session.length === 0) {
      return res.status(404).json({ message: "Table session not found" });
    }

    const restaurantId = session[0].restaurantId;

    // ✅ 4. PERMISSION CHECK - Staff can place manual orders
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied - Manager or Owner access required" });
    }

    // ✅ 5. VERIFY SESSION IS ACTIVE
    if (session[0].status !== "active") {
      return res.status(400).json({ message: "Table session is not active" });
    }

    // ✅ 6. VALIDATE ITEMS AND CALCULATE TOTALS
    let subtotal = 0;
    const orderItemsData = [];
    const orderItemExtrasData = [];

    for (const item of items) {
      if (!item.variantId || !item.quantity) {
        return res.status(400).json({ message: "Each item must have variantId and quantity" });
      }

      // Get variant details
      const variant = await db
        .select({
          id: menuItemVariants.id,
          price: menuItemVariants.price,
          menuItemId: menuItemVariants.menuItemId
        })
        .from(menuItemVariants)
        .where(eq(menuItemVariants.id, item.variantId))
        .limit(1);

      if (variant.length === 0) {
        return res.status(404).json({ message: `Menu item variant ${item.variantId} not found` });
      }

      const itemPrice = variant[0].price;
      const itemTotal = itemPrice * item.quantity;
      let itemExtrasTotal = 0;

      const orderItemId = nanoid();

      // Process extras if provided
      if (item.extras && Array.isArray(item.extras)) {
        for (const extra of item.extras) {
          if (!extra.extraId || !extra.quantity) {
            return res.status(400).json({ message: "Each extra must have extraId and quantity" });
          }

          // Get extra details
          const extraDetail = await db
            .select({
              id: menuExtras.id,
              price: menuExtras.price
            })
            .from(menuExtras)
            .where(eq(menuExtras.id, extra.extraId))
            .limit(1);

          if (extraDetail.length === 0) {
            return res.status(404).json({ message: `Extra ${extra.extraId} not found` });
          }

          const extraPrice = extraDetail[0].price;
          const extraTotal = extraPrice * extra.quantity;
          itemExtrasTotal += extraTotal;

          orderItemExtrasData.push({
            id: nanoid(),
            orderItemId,
            extraId: extra.extraId,
            quantity: extra.quantity,
            unitPrice: extraPrice,
            totalPrice: extraTotal,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      const totalItemPrice = itemTotal + itemExtrasTotal;
      subtotal += totalItemPrice;

      orderItemsData.push({
        id: orderItemId,
        orderId: "", // Will be set after order creation
        menuItemId: variant[0].menuItemId,
        menuItemVariantId: item.variantId,
        tableSessionId: sessionId,
        restaurantId,
        quantity: item.quantity,
        unitPrice: itemPrice,
        totalPrice: totalItemPrice,
        notes: null,
        status: "placed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // ✅ 7. CREATE ORDER
    const orderId = nanoid();
    const newOrder = await db
      .insert(orders)
      .values({
        id: orderId,
        tableSessionId: sessionId,
        restaurantId,
        tableId,
        placedByUserId: user.id,
        notes,
        status: "placed",
        handoverOtp: Math.floor(1000 + Math.random() * 9000).toString(),
        subtotal,
        discount: 0,
        gst: 0,
        grandTotal: subtotal,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // ✅ 8. CREATE ORDER ITEMS
    for (const item of orderItemsData) {
      item.orderId = orderId;
      await db.insert(orderItems).values(item);
    }

    // ✅ 9. CREATE ORDER ITEM EXTRAS
    if (orderItemExtrasData.length > 0) {
      for (const extra of orderItemExtrasData) {
        await db.insert(orderItemExtras).values(extra);
      }
    }

    // ✅ 9. SEND NOTIFICATION
    await sendNotification(
      restaurantId,
      `New order placed for Table ${tableId}`,
      "order-update"
    );

    // ✅ 10. SUCCESS RESPONSE
    res.status(201).json({
      order: newOrder[0],
      items: orderItemsData,
      message: "Order created successfully"
    });

    // Invalidate Cache
    orderCache.invalidate(restaurantId);
  } catch (error) {
    console.error("MANUAL ORDER CREATION ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:orderId/detail", optionalAuth, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (orderList.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    const order = orderList[0];

    // Fetch restaurant details
    let restaurantInfo: any = null;
    if (order.restaurantId) {
      const restList = await db.select().from(restaurants).where(eq(restaurants.id, order.restaurantId)).limit(1);
      if (restList.length > 0) {
        restaurantInfo = restList[0];
      }
    }

    // Fetch items in the order
    const orderItemsRaw = await db
      .select()
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .leftJoin(menuItemVariants, eq(orderItems.menuItemVariantId, menuItemVariants.id))
      .where(eq(orderItems.orderId, orderId));

    // Fetch order item extras
    const orderItemExtrasRaw = orderItemsRaw.length > 0 ? await db
      .select({
        orderItemId: orderItemExtras.orderItemId,
        extraId: orderItemExtras.extraId,
        quantity: orderItemExtras.quantity,
        unitPrice: orderItemExtras.unitPrice,
        totalPrice: orderItemExtras.totalPrice,
        extraName: menuExtras.name,
        extraPrice: menuExtras.price,
      })
      .from(orderItemExtras)
      .leftJoin(menuExtras, eq(orderItemExtras.extraId, menuExtras.id))
      .where(inArray(orderItemExtras.orderItemId, orderItemsRaw.map(row => row.order_items.id))) : [];

    const orderItemsList = orderItemsRaw.map((row) => {
      const itemExtras = orderItemExtrasRaw
        .filter(extra => extra.orderItemId === row.order_items.id)
        .map(extra => ({
          extraId: extra.extraId,
          name: extra.extraName,
          quantity: extra.quantity,
          unitPrice: extra.unitPrice,
          totalPrice: extra.totalPrice,
        }));

      const rawName = row.menu_items?.name || (row.order_items as any).notes || 'Food Item';
      return {
        ...row.order_items,
        name: rawName,
        menuItemName: rawName,
        variantName: row.menu_item_variants?.variantName,
        price: row.order_items.unitPrice,
        unitPrice: row.order_items.unitPrice,
        totalPrice: row.order_items.totalPrice,
        isVeg: row.menu_items?.isVeg ?? true,
        extras: itemExtras,
      };
    });

    let parsedDeliveryAddress = undefined;
    let parsedCustomerLat = undefined;
    let parsedCustomerLng = undefined;
    if (order.notes && typeof order.notes === 'string') {
      try {
        if (order.notes.startsWith('{') && order.notes.endsWith('}')) {
          const parsed = JSON.parse(order.notes);
          if (parsed.address) parsedDeliveryAddress = parsed.address;
          if (parsed.latitude) parsedCustomerLat = Number(parsed.latitude);
          if (parsed.longitude) parsedCustomerLng = Number(parsed.longitude);
        }
      } catch (e) { }
    }

    // Fetch active delivery and rider details for this order
    let deliveryStatus: string | null = null;
    let riderName: string | null = null;
    let riderPhone: string | null = null;
    let riderId: string | null = null;
    let deliveryRecord: any = null;
    let riderRecord: any = null;

    try {
      const delList = await db
        .select({
          id: orderDeliveries.id,
          orderId: orderDeliveries.orderId,
          status: orderDeliveries.status,
          etaMinutes: orderDeliveries.etaMinutes,
          riderId: orderDeliveries.riderId,
          riderName: deliveryRiders.name,
          riderPhone: deliveryRiders.phone,
          currentLat: orderDeliveries.currentLat,
          currentLng: orderDeliveries.currentLng,
          customerLat: orderDeliveries.customerLat,
          customerLng: orderDeliveries.customerLng,
          restaurantLat: orderDeliveries.restaurantLat,
          restaurantLng: orderDeliveries.restaurantLng,
          updatedAt: orderDeliveries.updatedAt,
        })
        .from(orderDeliveries)
        .leftJoin(deliveryRiders, eq(orderDeliveries.riderId, deliveryRiders.id))
        .where(eq(orderDeliveries.orderId, orderId))
        .orderBy(desc(orderDeliveries.updatedAt));

      if (delList.length > 0) {
        // Pick active assigned delivery if any, or most recent
        const del = delList.find(d => d.status && d.status !== 'offered') || delList[0];
        deliveryRecord = del;
        const isAssigned = del.status && del.status !== 'offered';
        if (isAssigned) {
          deliveryStatus = del.status;
          riderName = del.riderName || null;
          riderPhone = del.riderPhone || null;
          riderId = del.riderId || null;
          if (riderId) {
            riderRecord = {
              id: riderId,
              name: riderName,
              phone: riderPhone,
            };
          }
        }
      }
    } catch (e) {
      console.warn("Error fetching delivery in order detail:", e);
    }

    return res.status(200).json({
      order: {
        ...order,
        prepTimeMinutes: Number(order.prepTimeMinutes) || 20,
        extendedPrepMinutes: Number(order.extendedPrepMinutes) || 0,
        totalPrepMinutes: (Number(order.prepTimeMinutes) || 20) + (Number(order.extendedPrepMinutes) || 0),
        deliveryStatus,
        riderName,
        riderPhone,
        riderId,
        delivery: deliveryRecord,
        rider: riderRecord,
        deliveryAddress: parsedDeliveryAddress || (order as any).deliveryAddress || undefined,
        customerLatitude: parsedCustomerLat,
        customerLongitude: parsedCustomerLng,
        restaurantName: restaurantInfo?.restaurantName || restaurantInfo?.name || order.restaurantId,
        restaurantAddress: restaurantInfo?.restaurantAddress || restaurantInfo?.address || restaurantInfo?.location || order.restaurantId,
        restaurantLatitude: restaurantInfo?.latitude ? Number(restaurantInfo.latitude) : undefined,
        restaurantLongitude: restaurantInfo?.longitude ? Number(restaurantInfo.longitude) : undefined,
        restaurantBanner: restaurantInfo?.bannerImage || restaurantInfo?.logoImage,
        restaurantDeliveryTime: restaurantInfo?.deliveryTime,
        items: orderItemsList
      }
    });
  } catch (err) {
    console.error("Error fetching order details:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /orders/:orderId/acknowledge (Staff acknowledges order & stops alarm)
router.patch("/:orderId/acknowledge", async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const existing = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updated = await db
      .update(orders)
      .set({
        acknowledgedByMerchant: true,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    // Notify restaurant and order rooms that alarm can stop
    emitToRestaurant(existing[0].restaurantId, "order-acknowledged", {
      orderId,
      acknowledgedAt: updated[0].acknowledgedAt,
    });
    emitToOrder(orderId, "order-acknowledged", {
      orderId,
      acknowledgedAt: updated[0].acknowledgedAt,
    });

    res.status(200).json({ success: true, order: updated[0] });
  } catch (error) {
    console.error("ORDER ACKNOWLEDGE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /orders/:orderId/prep-time (Explicitly update kitchen prep time)
router.patch("/:orderId/prep-time", optionalAuth, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const rawMinutes = req.body.prepTimeMinutes || req.body.prep_time_minutes || req.body.minutes;
    const prepMinutes = Number(rawMinutes);

    if (isNaN(prepMinutes) || prepMinutes <= 0) {
      return res.status(400).json({ message: "Invalid prepTimeMinutes value" });
    }

    const orderRow = (
      await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    )[0];

    if (!orderRow) {
      return res.status(404).json({ message: "Order not found" });
    }

    const now = new Date();
    await db
      .update(orders)
      .set({
        prepTimeMinutes: prepMinutes,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    orderCache.invalidate(orderRow.restaurantId);

    const nowIso = now.toISOString();
    const payload = {
      orderId,
      prepTimeMinutes: prepMinutes,
      extendedPrepMinutes: orderRow.extendedPrepMinutes || 0,
      totalPrepMinutes: prepMinutes + (orderRow.extendedPrepMinutes || 0),
      status: orderRow.status,
      updatedAt: nowIso,
    };

    emitToOrder(orderId, "order-prep-updated", payload);
    emitToOrder(orderId, "order-status-update", payload);
    emitToOrder(orderId, "order-status", payload);
    emitToOrder(orderId, "order-update", { ...payload, order: { ...orderRow, prepTimeMinutes: prepMinutes } });
    emitToRestaurant(orderRow.restaurantId, "order-updated", payload);

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    console.error("Error updating order prep time:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /orders/:orderId/extend-prep (Staff extends prep time during rush)
router.patch("/:orderId/extend-prep", async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const { extraMinutes } = req.body;
    const rawMinutes = extraMinutes !== undefined ? extraMinutes : req.body.extra_minutes;
    const minutesToAdd = Number(rawMinutes) > 0 ? Number(rawMinutes) : 5;

    const existing = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const currentExtended = existing[0].extendedPrepMinutes || 0;
    const newExtended = currentExtended + minutesToAdd;
    const basePrep = existing[0].prepTimeMinutes || 20;
    const totalPrepMinutes = basePrep + newExtended;

    const updated = await db
      .update(orders)
      .set({
        extendedPrepMinutes: newExtended,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    const payload = {
      orderId,
      extraMinutes: minutesToAdd,
      totalExtendedMinutes: newExtended,
      totalPrepMinutes,
      message: `Kitchen requested ${minutesToAdd} extra minutes to prepare fresh food.`,
      updatedAt: new Date().toISOString(),
    };

    emitToOrder(orderId, "order-prep-extended", payload);
    emitToOrder(orderId, "order-status-update", { orderId, prepTimeMinutes: basePrep, extendedPrepMinutes: newExtended, ...payload });
    emitToOrder(orderId, "order-update", { orderId, prepTimeMinutes: basePrep, extendedPrepMinutes: newExtended, order: updated[0], ...payload });
    emitToRestaurant(existing[0].restaurantId, "order-prep-extended", payload);
    emitToRestaurant(existing[0].restaurantId, "order-updated", { orderId, prepTimeMinutes: basePrep, extendedPrepMinutes: newExtended });
    orderCache.invalidate(existing[0].restaurantId);

    res.status(200).json({ success: true, ...payload, order: updated[0] });
  } catch (error) {
    console.error("EXTEND PREP ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /orders/:orderId/merchant-cancel (Emergency cancel by restaurant + penalty handling)
router.patch("/:orderId/merchant-cancel", async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const { reason, details } = req.body;
    const cancelReason = reason || "kitchen_overloaded";

    const existing = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const restaurantId = existing[0].restaurantId;

    // 1. Update order status
    const updated = await db
      .update(orders)
      .set({
        status: "cancelled",
        cancelledBy: "merchant",
        cancellationReason: cancelReason,
        notes: details ? `${existing[0].notes || ""} | Cancel Reason: ${details}` : existing[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    // 2. If cancelled due to dining rush / kitchen overload, apply auto-pause & penalty
    let isAutoPaused = false;
    if (cancelReason === "kitchen_overloaded" || cancelReason === "dining_rush") {
      const pauseDurationMs = 30 * 60 * 1000; // 30 minutes
      const pauseUntil = new Date(Date.now() + pauseDurationMs);

      // Increment strikes and pause restaurant
      const [restro] = await db
        .select({ strikeCount: restaurants.strikeCount })
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1);

      const newStrikes = (restro?.strikeCount || 0) + 1;

      await db
        .update(restaurants)
        .set({
          autoPausedUntil: pauseUntil,
          strikeCount: newStrikes,
          updatedAt: new Date(),
        })
        .where(eq(restaurants.id, restaurantId));

      isAutoPaused = true;

      // 3. Log penalty record in ledger
      await db.insert(merchantPenalties).values({
        id: nanoid(),
        restaurantId,
        orderId,
        penaltyType: "rush_cancellation",
        amount: 5000, // ₹50.00 in paise
        customerVoucherAmount: 5000,
        riderCompensationAmount: 0,
        status: "pending",
        reason: `Late cancellation due to ${cancelReason}. Auto-paused for 30 minutes.`,
        createdAt: new Date(),
      });
    }

    // 4. Emit WebSocket events to Customer and Restaurant
    const cancelPayload = {
      orderId,
      status: "cancelled",
      cancelledBy: "merchant",
      reason: cancelReason,
      isAutoPaused,
      refundInitiated: true,
      refundMessage: "100% refund initiated to original payment method.",
      updatedAt: new Date().toISOString(),
    };

    emitToOrder(orderId, "order-status", cancelPayload);
    emitToOrder(orderId, "order-cancelled", cancelPayload);
    emitToRestaurant(restaurantId, "order-cancelled", cancelPayload);

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      ...cancelPayload,
      order: updated[0],
    });
  } catch (error) {
    console.error("MERCHANT CANCEL ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /:id/verify-handover (Swiggy Handover OTP Verification)
router.post("/:id/verify-handover", optionalAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.handoverOtp && otp && order.handoverOtp.trim() !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: "Invalid 4-digit Handover OTP" });
    }

    const [updated] = await db
      .update(orders)
      .set({
        status: "served",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // If there is an active delivery for this order, advance delivery status to picked_up
    const delList = await db.select().from(orderDeliveries).where(eq(orderDeliveries.orderId, id));
    if (delList.length > 0) {
      await db.update(orderDeliveries).set({
        status: "picked_up",
        updatedAt: new Date(),
      }).where(eq(orderDeliveries.orderId, id));

      let activeRider = null;
      if (delList[0].riderId) {
        const riders = await db.select().from(deliveryRiders).where(eq(deliveryRiders.id, delList[0].riderId)).limit(1);
        if (riders.length > 0) activeRider = riders[0];
      }

      emitToOrder(id, "delivery-update", {
        delivery: {
          orderId: id,
          status: "picked_up",
          currentLat: activeRider?.latitude ?? delList[0].currentLat ?? delList[0].restaurantLat,
          currentLng: activeRider?.longitude ?? delList[0].currentLng ?? delList[0].restaurantLng,
          updatedAt: new Date().toISOString(),
        },
        status: "picked_up",
        riderName: activeRider?.name,
        riderPhone: activeRider?.phone,
      });
    }

    orderCache.invalidate(order.restaurantId);
    emitToRestaurant(order.restaurantId, "order_status_updated", { orderId: id, status: "served", deliveryStatus: "picked_up" });
    emitToRestaurant(order.restaurantId, "order-updated", { orderId: id, status: "served", deliveryStatus: "picked_up" });

    // Only emit "order-status" as "served" to the order room if this is a dine-in order with a table
    if (order.tableId) {
      emitToOrder(id, "order-status", { orderId: id, status: "served", updatedAt: new Date().toISOString() });
    } else {
      // For delivery orders, notify customer room of pickup, NOT served/delivered!
      emitToOrder(id, "order-status-update", { orderId: id, status: "picked_up", deliveryStatus: "picked_up", updatedAt: new Date().toISOString() });
    }

    return res.status(200).json({
      success: true,
      message: "Handover verified successfully! Order marked as handed over/picked up.",
      order: updated,
    });
  } catch (error) {
    console.error("VERIFY HANDOVER ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /:id/reject-with-items (Swiggy Out-of-Stock Item Rejection & Auto Turn-Off)
router.post("/:id/reject-with-items", optionalAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { itemIds, reason, turnOffHours } = req.body; // itemIds: array of menu item IDs to turn off

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Auto turn off out-of-stock items in the menu if provided
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      const pausedUntil = turnOffHours && turnOffHours > 0
        ? new Date(Date.now() + turnOffHours * 60 * 60 * 1000)
        : null;

      await db
        .update(menuItems)
        .set({
          isAvailable: false,
          pausedUntil,
          pauseReason: reason || "Out of stock during kitchen review",
          updatedAt: new Date(),
        })
        .where(inArray(menuItems.id, itemIds));
    }

    // Cancel order
    const [updated] = await db
      .update(orders)
      .set({
        status: "cancelled",
        cancellationReason: reason || "Items out of stock",
        cancelledBy: "merchant",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    orderCache.invalidate(order.restaurantId);
    emitToRestaurant(order.restaurantId, "order-cancelled", {
      orderId: id,
      status: "cancelled",
      reason: reason || "Items out of stock",
    });
    emitToOrder(id, "order-cancelled", {
      orderId: id,
      status: "cancelled",
      reason: reason || "Items out of stock",
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled and items updated in inventory.",
      order: updated,
    });
  } catch (error) {
    console.error("REJECT WITH ITEMS ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
