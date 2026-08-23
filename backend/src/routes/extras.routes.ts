import { Router } from "express";
import { db } from "../db/db.js";

import { menuExtras } from "../db/schema/menu-extras.js";
import { menuExtraAssignments } from "../db/schema/menu-extra-assignments.js";
import { orderItemExtras } from "../db/schema/order-item-extras.js";
import { menuCategories } from "../db/schema/menu-categories.js";
import { menuItems } from "../db/schema/menu-items.js";
import { menuItemVariants } from "../db/schema/menu-item-variants.js";
import { restaurants } from "../db/schema/restaurants.js";

import { nanoid } from "nanoid";
import { eq, and, desc, inArray } from "drizzle-orm";

import { requireAuth } from "../auth/requireAuth.js";
import {
  isRestaurantOwnerManagerOrStaff,
  isRestaurantOwnerOrManager,
} from "../lib/checkRoles.js";

import { extrasCache } from "../lib/extras-cache.js";
import { menuCache } from "../lib/menu-cache.js";

const router = Router();

// GET /extras/:restaurantId - Get all extras for a restaurant
router.get("/extras/:restaurantId", async (req: any, res) => {
  console.time("EXTRAS_FETCH");
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check Cache
    const cacheKey = `extras:${restaurantId}`;
    const cached = extrasCache.get(cacheKey);
    if (cached.hit) {
      console.timeEnd("EXTRAS_FETCH");
      return res.json(cached.data);
    }

    // Check if restaurant exists
    const restaurant = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (restaurant.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }

    // If user is authenticated, check access for staff operations
    if (user) {
      const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    // Get extras for the restaurant
    // For authenticated users (staff): show all extras
    // For unauthenticated users (customers): show only active and available extras
    const whereConditions = [eq(menuExtras.restaurantId, restaurantId)];

    if (!user) {
      // Customer view: only active and available extras
      whereConditions.push(eq(menuExtras.isActive, true));
      whereConditions.push(eq(menuExtras.isAvailable, true));
    }

    const extras = await db
      .select({
        id: menuExtras.id,
        name: menuExtras.name,
        description: menuExtras.description,
        price: menuExtras.price,
        isAvailable: menuExtras.isAvailable,
        isActive: menuExtras.isActive,
      })
      .from(menuExtras)
      .where(and(...whereConditions))
      .orderBy(desc(menuExtras.createdAt));

    const responseData = {
      success: true,
      extras
    };

    // Set Cache
    extrasCache.set(cacheKey, responseData);

    console.timeEnd("EXTRAS_FETCH");
    return res.json(responseData);

  } catch (error) {
    console.error("Error fetching extras:", error);
    console.timeEnd("EXTRAS_FETCH");
    return res.status(500).json({
      success: false,
      message: "Failed to fetch extras"
    });
  }
});

// POST /extras/:restaurantId - Create a new extra
router.post("/extras/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;
    const { name, description, price } = req.body;

    // Check if user has permission to manage this restaurant
    const hasPermission = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const extraId = nanoid();

    await db.insert(menuExtras).values({
      id: extraId,
      restaurantId,
      name,
      description,
      price: price || 0,
    });

    extrasCache.invalidate(restaurantId);
    menuCache.invalidate(restaurantId);

    return res.json({
      success: true,
      extra: {
        id: extraId,
        name,
        description,
        price: price || 0,
        isAvailable: true,
        isActive: true,
      }
    });

  } catch (error) {
    console.error("Error creating extra:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create extra"
    });
  }
});

// PUT /extras/:extraId - Update an extra
router.put("/extras/:extraId", requireAuth, async (req: any, res) => {
  try {
    const { extraId } = req.params;
    const user = req.user;
    const { name, description, price, isAvailable, isActive } = req.body;

    // Get the extra to check restaurant ownership
    const extra = await db
      .select({ restaurantId: menuExtras.restaurantId })
      .from(menuExtras)
      .where(eq(menuExtras.id, extraId))
      .limit(1);

    if (extra.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Extra not found"
      });
    }

    // Check if user has permission
    const hasPermission = await isRestaurantOwnerOrManager(user.id, extra[0].restaurantId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await db
      .update(menuExtras)
      .set({
        name,
        description,
        price,
        isAvailable,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(menuExtras.id, extraId));

    extrasCache.invalidate(extra[0].restaurantId);
    menuCache.invalidate(extra[0].restaurantId);

    return res.json({
      success: true,
      message: "Extra updated successfully"
    });

  } catch (error) {
    console.error("Error updating extra:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update extra"
    });
  }
});

// DELETE /extras/:extraId - Delete an extra
router.delete("/extras/:extraId", requireAuth, async (req: any, res) => {
  try {
    const { extraId } = req.params;
    const user = req.user;

    // Get the extra to check restaurant ownership
    const extra = await db
      .select({ restaurantId: menuExtras.restaurantId })
      .from(menuExtras)
      .where(eq(menuExtras.id, extraId))
      .limit(1);

    if (extra.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Extra not found"
      });
    }

    // Check if user has permission
    const hasPermission = await isRestaurantOwnerOrManager(user.id, extra[0].restaurantId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await db.delete(menuExtras).where(eq(menuExtras.id, extraId));

    extrasCache.invalidate(extra[0].restaurantId);
    menuCache.invalidate(extra[0].restaurantId);

    return res.json({
      success: true,
      message: "Extra deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting extra:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete extra"
    });
  }
});

// GET /extras-assignments/:restaurantId - Get all extra assignments for a restaurant
router.get("/extras-assignments/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check Cache
    const cacheKey = `assignments:${restaurantId}`;
    const cached = extrasCache.get(cacheKey);
    if (cached.hit) {
      return res.json(cached.data);
    }

    // Check if user has access to this restaurant
    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Get all assignments with related data
    const assignments = await db
      .select({
        id: menuExtraAssignments.id,
        extraId: menuExtraAssignments.extraId,
        extraName: menuExtras.name,
        extraPrice: menuExtras.price,
        categoryId: menuExtraAssignments.categoryId,
        categoryName: menuCategories.category,
        menuItemId: menuExtraAssignments.menuItemId,
        menuItemName: menuItems.name,
        variantId: menuExtraAssignments.variantId,
        variantName: menuItemVariants.variantName,
        isGlobal: menuExtraAssignments.isGlobal,
        isActive: menuExtraAssignments.isActive,
      })
      .from(menuExtraAssignments)
      .leftJoin(menuExtras, eq(menuExtraAssignments.extraId, menuExtras.id))
      .leftJoin(menuCategories, eq(menuExtraAssignments.categoryId, menuCategories.id))
      .leftJoin(menuItems, eq(menuExtraAssignments.menuItemId, menuItems.id))
      .leftJoin(menuItemVariants, eq(menuExtraAssignments.variantId, menuItemVariants.id))
      .where(eq(menuExtraAssignments.restaurantId, restaurantId))
      .orderBy(desc(menuExtraAssignments.createdAt));

    const responseData = {
      success: true,
      assignments
    };
    extrasCache.set(cacheKey, responseData);

    return res.json(responseData);

  } catch (error) {
    console.error("Error fetching extra assignments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch extra assignments"
    });
  }
});

// POST /extras-assignments/:restaurantId - Create an extra assignment
router.post("/extras-assignments/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;
    const { extraId, categoryId, menuItemId, variantId, isGlobal } = req.body;

    // Check if user has permission
    const hasPermission = await isRestaurantOwnerOrManager(user.id, restaurantId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Validate that only one assignment level is specified
    const assignmentLevels = [categoryId, menuItemId, variantId, isGlobal].filter(Boolean);
    if (assignmentLevels.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "Exactly one assignment level must be specified"
      });
    }

    const assignmentId = nanoid();

    await db.insert(menuExtraAssignments).values({
      id: assignmentId,
      restaurantId,
      extraId,
      categoryId: categoryId || null,
      menuItemId: menuItemId || null,
      variantId: variantId || null,
      isGlobal: isGlobal || false,
    });

    extrasCache.invalidate(restaurantId);
    menuCache.invalidate(restaurantId);

    return res.json({
      success: true,
      assignment: {
        id: assignmentId,
        extraId,
        categoryId,
        menuItemId,
        variantId,
        isGlobal,
        isActive: true,
      }
    });

  } catch (error) {
    console.error("Error creating extra assignment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create extra assignment"
    });
  }
});

// PATCH /extras-assignments/:assignmentId/toggle - Toggle isActive on a specific assignment
router.patch("/extras-assignments/:assignmentId/toggle", requireAuth, async (req: any, res) => {
  try {
    const { assignmentId } = req.params;
    const { isActive } = req.body;
    const user = req.user;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: "isActive must be a boolean" });
    }

    // Get the assignment to check restaurant ownership
    const assignment = await db
      .select({ restaurantId: menuExtraAssignments.restaurantId })
      .from(menuExtraAssignments)
      .where(eq(menuExtraAssignments.id, assignmentId))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ success: false, message: "Assignment not found" });
    }

    // Check if user has permission
    const hasPermission = await isRestaurantOwnerOrManager(user.id, assignment[0].restaurantId);
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await db
      .update(menuExtraAssignments)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(menuExtraAssignments.id, assignmentId));

    extrasCache.invalidate(assignment[0].restaurantId);
    menuCache.invalidate(assignment[0].restaurantId);

    return res.json({ success: true, message: "Assignment status updated" });
  } catch (error) {
    console.error("Error toggling extra assignment:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle assignment" });
  }
});

// DELETE /extras-assignments/:assignmentId - Delete an extra assignment
router.delete("/extras-assignments/:assignmentId", requireAuth, async (req: any, res) => {
  try {
    const { assignmentId } = req.params;
    const user = req.user;

    // Get the assignment to check restaurant ownership
    const assignment = await db
      .select({ restaurantId: menuExtraAssignments.restaurantId })
      .from(menuExtraAssignments)
      .where(eq(menuExtraAssignments.id, assignmentId))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Check if user has permission
    const hasPermission = await isRestaurantOwnerOrManager(user.id, assignment[0].restaurantId);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await db.delete(menuExtraAssignments).where(eq(menuExtraAssignments.id, assignmentId));

    extrasCache.invalidate(assignment[0].restaurantId);
    menuCache.invalidate(assignment[0].restaurantId);

    return res.json({
      success: true,
      message: "Assignment deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting extra assignment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete extra assignment"
    });
  }
});

// GET /available-extras/:restaurantId - Get available extras for a specific item/variant
router.get("/available-extras/:restaurantId", async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;
    const { categoryId, menuItemId, variantId } = req.query;

    // Check if restaurant exists
    const restaurant = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (restaurant.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found"
      });
    }

    // If user is authenticated, check access for staff operations
    if (user) {
      const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }
    }

    // Build the where conditions for assignments
    const whereConditions = [eq(menuExtraAssignments.restaurantId, restaurantId)];

    if (variantId) {
      whereConditions.push(
        and(
          eq(menuExtraAssignments.variantId, variantId as string),
          eq(menuExtraAssignments.isActive, true)
        )
      );
    } else if (menuItemId) {
      whereConditions.push(
        and(
          eq(menuExtraAssignments.menuItemId, menuItemId as string),
          eq(menuExtraAssignments.isActive, true)
        )
      );
    } else if (categoryId) {
      whereConditions.push(
        and(
          eq(menuExtraAssignments.categoryId, categoryId as string),
          eq(menuExtraAssignments.isActive, true)
        )
      );
    } else {
      // Global extras
      whereConditions.push(
        and(
          eq(menuExtraAssignments.isGlobal, true),
          eq(menuExtraAssignments.isActive, true)
        )
      );
    }

    // Get available extras
    // For authenticated users (staff): show all assigned extras
    // For unauthenticated users (customers): show only active and available extras
    const extraWhereConditions = [eq(menuExtraAssignments.extraId, menuExtras.id)];

    if (!user) {
      // Customer view: only active and available extras
      extraWhereConditions.push(eq(menuExtras.isActive, true));
      extraWhereConditions.push(eq(menuExtras.isAvailable, true));
    }

    const availableExtras = await db
      .select({
        id: menuExtras.id,
        name: menuExtras.name,
        description: menuExtras.description,
        price: menuExtras.price,
        assignmentId: menuExtraAssignments.id,
      })
      .from(menuExtraAssignments)
      .innerJoin(menuExtras, and(...extraWhereConditions))
      .where(and(...whereConditions))
      .orderBy(menuExtras.name);

    return res.json({
      success: true,
      extras: availableExtras
    });

  } catch (error) {
    console.error("Error fetching available extras:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch available extras"
    });
  }
});

export default router;