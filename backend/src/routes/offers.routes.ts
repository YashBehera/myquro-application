import { Router } from "express";
import { db } from "../db/db.js";

import { offers } from "../db/schema/offers.js";
import { restaurants } from "../db/schema/restaurants.js";

import { requireAuth } from "../auth/requireAuth.js";
import { isRestaurantOwnerOrManager } from "../lib/checkRoles.js";
import { offerCache } from "../lib/offer-cache.js";

import { eq, and, or, sql } from "drizzle-orm";


const router = Router();

// NEW ROUTE: Get active public offers for customer menu
router.get("/public/:restaurantId", async (req: any, res) => {
  try {
    const { restaurantId } = req.params;

    // Using a separate cache key for public requests
    const publicCacheKey = `public_${restaurantId}`;
    const cached = offerCache.get(publicCacheKey);
    if (cached.hit) {
      return res.status(200).json(cached.data);
    }

    // 1. Fetch the restaurant to get its type (category) for targeting
    const restaurantDetail = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (restaurantDetail.length === 0) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    const restaurantType = restaurantDetail[0].restaurantType;

    // 2. Fetch all relevant offers:
    // - Local offers for this restaurant
    // - Global/Company offers targetting 'all', this category, or this specific ID
    const relevantOffers = await db
      .select()
      .from(offers)
      .where(
        or(
          eq(offers.restaurantId, restaurantId),
          and(
            eq(offers.scope, "company"),
            or(
              eq(offers.targetType, "all"),
              and(eq(offers.targetType, "category"), eq(offers.targetCategory, restaurantType)),
              and(eq(offers.targetType, "specific"), sql`${restaurantId} = ANY(${offers.targetRestaurantIds})`)
            )
          )
        )
      );

    // 3. Filter down to only currently active offers
    const now = new Date();
    const activeOffers = relevantOffers.filter(offer =>
      now >= new Date(offer.startDate) && now <= new Date(offer.endDate)
    ).map(offer => ({
      id: offer.id,
      name: offer.name,
      description: offer.description,
      offerType: offer.offerType,
      discountValue: offer.discountValue,
      applicableCategoryId: offer.applicableCategoryId,
      code: offer.code,
      endDate: offer.endDate,
      scope: offer.scope,
      minOrderValue: offer.minOrderValue
    }));

    const responseData = { success: true, offers: activeOffers };
    offerCache.set(publicCacheKey, responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error("FETCH PUBLIC OFFERS ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get all offers for a restaurant
router.get("/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check Cache
    const cached = offerCache.get(restaurantId);
    if (cached.hit) {
      return res.status(200).json(cached.data);
    }

    // ✅ 1. AUTH CHECK - Allow 'admin', 'company_admin', and 'restaurant' roles
    if (!user || !["restaurant", "admin", "company_admin"].includes(user.role)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // ✅ 2. PERMISSION CHECK
    // Super Admins have access to everything, restaurant owners/managers to their own.
    // company_admin should have access if they own the company of this restaurant.
    const isSuperAdmin = user.role === "admin";
    const hasAccess = isSuperAdmin || await isRestaurantOwnerOrManager(user.id, restaurantId);

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. GET OFFERS
    // Fetch local offers AND company-level offers that target this restaurant

    // First, let's get the restaurant details to know its type (for category targeting)
    const restaurantDetail = await db
      .select({ id: restaurants.id, restaurantType: restaurants.restaurantType })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (restaurantDetail.length === 0) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const restaurantType = restaurantDetail[0].restaurantType;

    // Fetch all relevant offers:
    // - Local offers for this restaurant
    // - Global/Company offers targetting 'all', this category, or this specific ID
    const relevantOffers = await db
      .select()
      .from(offers)
      .where(
        or(
          eq(offers.restaurantId, restaurantId),
          and(
            eq(offers.scope, "company"),
            or(
              eq(offers.targetType, "all"),
              and(eq(offers.targetType, "category"), eq(offers.targetCategory, restaurantType)),
              and(eq(offers.targetType, "specific"), sql`${restaurantId} = ANY(${offers.targetRestaurantIds})`)
            )
          )
        )
      )
      .orderBy(offers.createdAt);

    // Compute active status dynamically
    const now = new Date();
    const computedOffers = relevantOffers.map(offer => {
      let status = 'active';
      if (now < new Date(offer.startDate)) status = 'upcoming';
      else if (now > new Date(offer.endDate)) status = 'expired';

      return {
        ...offer,
        isActive: status === 'active',
        status
      };
    });

    // ✅ 4. SUCCESS RESPONSE
    const responseData = { offers: computedOffers };
    offerCache.set(restaurantId, responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error("FETCH OFFERS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create a new offer
router.post("/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const {
      name, description, discountValue, offerType,
      applicableCategoryId, startDate, endDate, code,
      scope, targetType, targetCategory, targetRestaurantIds
    } = req.body;
    const user = req.user;

    // ✅ 1. AUTH CHECK - Allow 'admin', 'company_admin', and 'restaurant' roles
    if (!user || !["restaurant", "admin", "company_admin"].includes(user.role)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isSuperAdmin = user.role === "admin";

    // ✅ 2. PERMISSION CHECK
    const hasAccess = isSuperAdmin || await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. VALIDATION
    if (!name || discountValue === undefined || !startDate || !endDate || !code) {
      return res.status(400).json({ message: "Name, discount value, start date, end date, and code are required" });
    }

    // Scope validation
    if (scope === "company" && !isSuperAdmin) {
      return res.status(403).json({ message: "Only Super Admins can create company-level offers" });
    }

    const type = offerType || "percentage";
    const value = parseInt(discountValue);

    if (isNaN(value) || value < 0) {
      return res.status(400).json({ message: "Discount value must be a valid positive number" });
    }

    if (type === "percentage" && value > 100) {
      return res.status(400).json({ message: "Percentage discount cannot exceed 100" });
    }

    // ✅ 4. CREATE OFFER
    const newOffer = await db
      .insert(offers)
      .values({
        id: crypto.randomUUID(),
        name,
        description,
        offerType: type,
        discountPercentage: 0,
        discountValue: value,
        applicableCategoryId: applicableCategoryId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        code,
        isActive: new Date() >= new Date(startDate) && new Date() <= new Date(endDate),
        // If company scope, restaurantId is null
        restaurantId: scope === "company" ? null : restaurantId,
        scope: scope || "restaurant",
        targetType: targetType || (scope === "company" ? "all" : "specific"),
        targetCategory: targetCategory || null,
        targetRestaurantIds: targetRestaurantIds || [],
        createdBy: user.id,
      })
      .returning();

    // ✅ 5. SUCCESS RESPONSE
    if (scope === "company") {
      offerCache.invalidateAll(); // Clear all for global change
    } else {
      offerCache.invalidate(restaurantId);
      offerCache.invalidate(`public_${restaurantId}`);
    }
    res.status(201).json({ offer: newOffer[0] });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update an offer
router.patch("/:restaurantId/:offerId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId, offerId } = req.params;
    const {
      name, description, discountValue, offerType,
      applicableCategoryId, startDate, endDate, code,
      scope, targetType, targetCategory, targetRestaurantIds
    } = req.body;
    const user = req.user;

    // ✅ 1. AUTH CHECK - Allow 'admin', 'company_admin', and 'restaurant' roles
    if (!user || !["restaurant", "admin", "company_admin"].includes(user.role)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isSuperAdmin = user.role === "admin";

    // ✅ 2. PERMISSION CHECK
    const hasAccess = isSuperAdmin || await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. VALIDATION
    if (discountValue !== undefined) {
      const val = parseInt(discountValue);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ message: "Discount value must be a valid positive number" });
      }
      if (offerType === "percentage" && val > 100) {
        return res.status(400).json({ message: "Percentage discount cannot exceed 100" });
      }
    }

    // ✅ 4. UPDATE OFFER
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (offerType !== undefined) updateData.offerType = offerType;
    if (discountValue !== undefined) updateData.discountValue = parseInt(discountValue);
    if (applicableCategoryId !== undefined) updateData.applicableCategoryId = applicableCategoryId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (code !== undefined) updateData.code = code;

    // Admin only fields
    if (isSuperAdmin) {
      if (scope !== undefined) updateData.scope = scope;
      if (targetType !== undefined) updateData.targetType = targetType;
      if (targetCategory !== undefined) updateData.targetCategory = targetCategory;
      if (targetRestaurantIds !== undefined) updateData.targetRestaurantIds = targetRestaurantIds;

      // If scope changed to company, unset restaurantId
      if (scope === "company") updateData.restaurantId = null;
      // If scope changed back to restaurant from company, set to the current restaurant context
      else if (scope === "restaurant") updateData.restaurantId = restaurantId;
    }

    const whereClause = isSuperAdmin
      ? eq(offers.id, offerId)
      : and(eq(offers.id, offerId), eq(offers.restaurantId, restaurantId));

    const updatedOffer = await db
      .update(offers)
      .set(updateData)
      .where(whereClause)
      .returning();

    if (updatedOffer.length === 0) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // ✅ 5. SUCCESS RESPONSE
    if (updatedOffer[0].scope === "company") {
      offerCache.invalidateAll();
    } else {
      offerCache.invalidate(restaurantId);
      offerCache.invalidate(`public_${restaurantId}`);
    }
    res.status(200).json({ offer: updatedOffer[0] });
  } catch (error) {
    console.error("UPDATE OFFER ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Toggle offer active status (Deprecated)
router.patch("/:restaurantId/:offerId/toggle", requireAuth, async (req: any, res) => {
  return res.status(400).json({ message: "Offer active status is handled automatically based on dates." });
});

// Delete an offer
router.delete("/:restaurantId/:offerId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId, offerId } = req.params;
    const user = req.user;

    // ✅ 1. AUTH CHECK - Allow 'admin', 'company_admin', and 'restaurant' roles
    if (!user || !["restaurant", "admin", "company_admin"].includes(user.role)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const isSuperAdmin = user.role === "admin";

    // ✅ 2. PERMISSION CHECK
    const hasAccess = isSuperAdmin || await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ 3. DELETE OFFER
    const whereClause = isSuperAdmin
      ? eq(offers.id, offerId)
      : and(eq(offers.id, offerId), eq(offers.restaurantId, restaurantId));

    const deletedOffer = await db
      .delete(offers)
      .where(whereClause)
      .returning();

    if (deletedOffer.length === 0) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // ✅ 4. SUCCESS RESPONSE
    if (deletedOffer[0].scope === "company") {
      offerCache.invalidateAll();
    } else {
      offerCache.invalidate(restaurantId);
      offerCache.invalidate(`public_${restaurantId}`);
    }
    res.status(200).json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("DELETE OFFER ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;