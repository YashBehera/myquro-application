import { Router } from "express";
import { db } from "../db/db.js";

import { menuCategories } from "../db/schema/menu-categories.js";
import { menuItems } from "../db/schema/menu-items.js";
import { menuItemVariants } from "../db/schema/menu-item-variants.js";
import { menuExtraAssignments } from "../db/schema/menu-extra-assignments.js";
import { menuExtras } from "../db/schema/menu-extras.js";

import { and, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../auth/requireAuth.js";

import {
  isRestaurantOwnerManagerOrStaff,
  isRestaurantOwnerOrManager,
} from "../lib/checkRoles.js";
import { menuCache } from "../lib/menu-cache.js";

import { nanoid } from "nanoid";


const router = Router();

// Dev-only shortcut: allow activating a variant without auth for quick testing
if (process.env.NODE_ENV !== "production") {
  router.patch(
    "/:restaurantId/menu/items/:itemId/variants/:variantId/activate",
    async (req: any, res: any) => {
      try {
        const { restaurantId, itemId, variantId } = req.params;
        console.debug("Dev activate shortcut hit", { restaurantId, itemId, variantId });
        await db
          .update(menuItemVariants)
          .set({ isActive: true })
          .where(
            and(
              eq(menuItemVariants.id, variantId),
              eq(menuItemVariants.menuItemId, itemId)
            )
          );
        menuCache.invalidate(restaurantId);
        return res.status(200).json({ message: "Variant activated (dev override)" });
      } catch (error) {
        console.error("Dev activate shortcut error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}

router.post(
  "/:restaurantId/menu/categories",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      const { name, description, display_order } = req.body;
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to add menu categories",
        });
      }
      const newCategory = {
        id: nanoid(),
        restaurantId,
        category: name,
        description,
        displayOrder: display_order,
      };
      await db.insert(menuCategories).values(newCategory);

      // Invalidate cache
      menuCache.invalidate(restaurantId);

      return res
        .status(201)
        .json({ message: "Menu category created", category: newCategory });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post("/:restaurantId/menu/items", requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    const { restaurantId } = req.params;
    const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
    const { name, description, categoryId, imageURL, isVeg, additionalInfo } = req.body;

    console.log("CREATE MENU ITEM - User:", user?.id, "Restaurant:", restaurantId);
    console.log("CREATE MENU ITEM - Data:", { name, description, categoryId, isVeg, imageURL });

    if (!user || user.role !== "restaurant") {
      console.log("CREATE MENU ITEM - Auth failed");
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasAccess) {
      console.log("CREATE MENU ITEM - Access denied");
      return res.status(403).json({
        message: "You do not have permission to add menu items",
      });
    }

    const newItem = {
      id: nanoid(),
      restaurantId,
      categoryId,
      name,
      description,
      imageURL,
      isVeg: isVeg !== undefined ? isVeg : true,
    };

    console.log("CREATE MENU ITEM - Inserting item:", newItem);
    await db.insert(menuItems).values(newItem);
    console.log("CREATE MENU ITEM - Item created successfully");
    menuCache.invalidate(restaurantId);
    return res
      .status(201)
      .json({ message: "Menu item created", item: newItem });
  } catch (error) {
    console.error("CREATE MENU ITEM ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/:restaurantId/menu/items/:itemId/variants",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId } = req.params;
      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      const { name, price, additionalInfo } = req.body;

      console.log("CREATE VARIANT - User:", user?.id, "Restaurant:", restaurantId, "Item:", itemId);
      console.log("CREATE VARIANT - Data:", { name, price, additionalInfo });

      if (!user || user.role !== "restaurant") {
        console.log("CREATE VARIANT - Auth failed");
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        console.log("CREATE VARIANT - Access denied");
        return res.status(403).json({
          message: "You do not have permission to add menu item variants",
        });
      }

      // Validate price - should be in paise (integer)
      if (
        price === undefined ||
        typeof price !== "number" ||
        price <= 0 ||
        !Number.isInteger(price)
      ) {
        console.log("CREATE VARIANT - Invalid price:", price);
        return res
          .status(400)
          .json({
            message: "Invalid price - must be a positive integer in paise",
          });
      }

      if (
        !additionalInfo ||
        typeof additionalInfo !== "object" ||
        Array.isArray(additionalInfo)
      ) {
        console.log("CREATE VARIANT - Invalid additionalInfo");
        return res.status(400).json({ message: "Invalid additionalInfo" });
      }

      const item = await db
        .select()
        .from(menuItems)
        .where(
          and(
            eq(menuItems.id, itemId),
            eq(menuItems.restaurantId, restaurantId)
          )
        )
        .limit(1);

      if (!item.length) {
        console.log("CREATE VARIANT - Item not found");
        return res
          .status(404)
          .json({ message: "Menu item not found for this restaurant" });
      }

      const newVariant = {
        id: nanoid(),
        menuItemId: itemId,
        variantName: name,
        foodType: additionalInfo.foodType,
        portionSize: additionalInfo.portionSize,
        price, // price is already in paise (integer)
      };

      console.log("CREATE VARIANT - Inserting variant:", newVariant);
      await db.insert(menuItemVariants).values(newVariant);
      console.log("CREATE VARIANT - Variant created successfully");
      menuCache.invalidate(restaurantId);
      return res
        .status(201)
        .json({ message: "Menu item variant created", variant: newVariant });
    } catch (error) {
      console.error("CREATE VARIANT ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/:restaurantId/menu", async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // 1. Fetch all active categories
    const categories = await db
      .select()
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.restaurantId, restaurantId),
          eq(menuCategories.isActive, true)
        )
      )
      .orderBy(menuCategories.displayOrder);

    if (categories.length === 0) {
      return res.status(200).json({ categories: [] });
    }

    const categoryIds = categories.map((c) => c.id);

    // 2. Fetch all active items for these categories
    const items = await db
      .select({
        id: menuItems.id,
        restaurantId: menuItems.restaurantId,
        categoryId: menuItems.categoryId,
        name: menuItems.name,
        description: menuItems.description,
        imageURL: menuItems.imageURL,
        isVeg: menuItems.isVeg,
        isAvailable: menuItems.isAvailable,
        isActive: menuItems.isActive,
      })
      .from(menuItems)
      .where(
        and(
          inArray(menuItems.categoryId, categoryIds),
          eq(menuItems.isActive, true)
        )
      );

    const itemIds = items.map((i) => i.id);

    // 3. Fetch all active variants for these items
    let variants: any[] = [];
    if (itemIds.length > 0) {
      variants = await db
        .select()
        .from(menuItemVariants)
        .where(
          and(
            inArray(menuItemVariants.menuItemId, itemIds),
            eq(menuItemVariants.isActive, true)
          )
        );
    }

    // 4. Fetch all extra assignments for this restaurant (including inactive ones for overrides)
    const assignments = await db
      .select({
        id: menuExtraAssignments.id,
        extraId: menuExtraAssignments.extraId,
        categoryId: menuExtraAssignments.categoryId,
        menuItemId: menuExtraAssignments.menuItemId,
        variantId: menuExtraAssignments.variantId,
        isGlobal: menuExtraAssignments.isGlobal,
        isActive: menuExtraAssignments.isActive,
      })
      .from(menuExtraAssignments)
      .where(eq(menuExtraAssignments.restaurantId, restaurantId));

    // 5. Assemble the menu tree in memory
    // Map variants to items
    const variantsByItemId = new Map<string, any[]>();
    for (const v of variants) {
      if (!variantsByItemId.has(v.menuItemId)) {
        variantsByItemId.set(v.menuItemId, []);
      }
      variantsByItemId.get(v.menuItemId)?.push({ ...v, is_available: v.isActive });
    }

    // Map items to categories
    const itemsByCategoryId = new Map<string, any[]>();
    for (const item of items) {
      if (!itemsByCategoryId.has(item.categoryId)) {
        itemsByCategoryId.set(item.categoryId, []);
      }
      const itemVariants = variantsByItemId.get(item.id) || [];
      itemsByCategoryId.get(item.categoryId)?.push({
        ...item,
        is_available: item.isActive,
        isVeg: item.isVeg,
        variants: itemVariants
      });
    }

    // Build final structure
    const menu = categories.map((category) => ({
      id: category.id,
      name: category.category,
      items: itemsByCategoryId.get(category.id) || [],
    }));

    return res.status(200).json({ 
      categories: menu,
      extraAssignments: assignments
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get(
  "/:restaurantId/menu/categories",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to view menu categories",
        });
      }

      const categories = await db
        .select({
          id: menuCategories.id,
          category: menuCategories.category,
          description: menuCategories.description,
          displayOrder: menuCategories.displayOrder,
          isActive: menuCategories.isActive,
          createdAt: menuCategories.createdAt,
          updatedAt: menuCategories.updatedAt,
        })
        .from(menuCategories)
        .where(eq(menuCategories.restaurantId, restaurantId))
        .orderBy(menuCategories.displayOrder);

      return res.status(200).json({ categories });
    } catch (error) {
      console.error("Error fetching menu categories:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/categories/:categoryId/deactivate",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, categoryId } = req.params;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to deactivate menu categories",
        });
      }

      await db
        .update(menuCategories)
        .set({ isActive: false })
        .where(eq(menuCategories.id, categoryId));



      menuCache.invalidate(restaurantId);

      return res
        .status(200)
        .json({ message: "Menu category updated successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/categories/:categoryId/activate",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, categoryId } = req.params;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to activate menu categories",
        });
      }

      await db
        .update(menuCategories)
        .set({ isActive: true })
        .where(eq(menuCategories.id, categoryId));



      menuCache.invalidate(restaurantId);

      return res
        .status(200)
        .json({ message: "Menu category activated successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/categories/:categoryId/update",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, categoryId } = req.params;
      const { name, description } = req.body;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to update menu categories",
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.category = name;
      if (description !== undefined) updateData.description = description;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      await db
        .update(menuCategories)
        .set(updateData)
        .where(
          and(
            eq(menuCategories.id, categoryId),
            eq(menuCategories.restaurantId, restaurantId)
          )
        );



      menuCache.invalidate(restaurantId);

      return res
        .status(200)
        .json({ message: "Menu category updated successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:restaurantId/menu/categories/:categoryId",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, categoryId } = req.params;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to delete menu categories",
        });
      }

      // First delete all items in the category (cascade will handle variants)
      await db
        .delete(menuItems)
        .where(eq(menuItems.categoryId, categoryId));

      // Then delete the category
      await db
        .delete(menuCategories)
        .where(
          and(
            eq(menuCategories.id, categoryId),
            eq(menuCategories.restaurantId, restaurantId)
          )
        );



      menuCache.invalidate(restaurantId);

      return res
        .status(200)
        .json({ message: "Menu category deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/items/:itemId/update",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId } = req.params;
      const { name, description, additionalInfo, imageURL, isVeg } = req.body;

      console.log("UPDATE MENU ITEM - User:", user?.id, "Restaurant:", restaurantId, "Item:", itemId);
      console.log("UPDATE MENU ITEM - Update data:", { name, description, imageURL, isVeg });

      if (
        additionalInfo &&
        (typeof additionalInfo !== "object" || Array.isArray(additionalInfo))
      ) {
        console.log("UPDATE MENU ITEM - Invalid additionalInfo");
        return res.status(400).json({ message: "Invalid additionalInfo" });
      }

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        console.log("UPDATE MENU ITEM - Auth failed");
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        console.log("UPDATE MENU ITEM - Access denied");
        return res.status(403).json({
          message: "You do not have permission to update menu items",
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (additionalInfo !== undefined)
        updateData.additionalInfo = additionalInfo;
      if (imageURL !== undefined) updateData.imageURL = imageURL;
      if (isVeg !== undefined) updateData.isVeg = isVeg;

      console.log("UPDATE MENU ITEM - Final update data:", updateData);

      if (Object.keys(updateData).length === 0) {
        console.log("UPDATE MENU ITEM - No fields to update");
        return res.status(400).json({ message: "No valid fields to update" });
      }

      await db
        .update(menuItems)
        .set(updateData)
        .where(
          and(
            eq(menuItems.id, itemId),
            eq(menuItems.restaurantId, restaurantId)
          )
        );

      console.log("UPDATE MENU ITEM - Item updated successfully");
      menuCache.invalidate(restaurantId);
      return res
        .status(200)
        .json({ message: "Menu item updated successfully" });
    } catch (error) {
      console.error("UPDATE MENU ITEM ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/items/:itemId/variants/:variantId/update",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId, variantId } = req.params;
      const { variantName, price, additionalInfo } = req.body;

      console.log("UPDATE VARIANT - User:", user?.id, "Restaurant:", restaurantId, "Item:", itemId, "Variant:", variantId);
      console.log("UPDATE VARIANT - Data:", { variantName, price, additionalInfo });

      // Validate price - should be in paise (integer)
      if (
        price !== undefined &&
        (typeof price !== "number" || price <= 0 || !Number.isInteger(price))
      ) {
        console.log("UPDATE VARIANT - Invalid price:", price);
        return res
          .status(400)
          .json({
            message: "Invalid price - must be a positive integer in paise",
          });
      }

      if (
        additionalInfo &&
        (typeof additionalInfo !== "object" || Array.isArray(additionalInfo))
      ) {
        console.log("UPDATE VARIANT - Invalid additionalInfo");
        return res.status(400).json({ message: "Invalid additionalInfo" });
      }

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        console.log("UPDATE VARIANT - Auth failed");
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        console.log("UPDATE VARIANT - Access denied");
        return res.status(403).json({
          message: "You do not have permission to update menu item variants",
        });
      }

      const items = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, itemId));

      console.log("UPDATE VARIANT - Items found:", items.length);

      if (!items || items.length === 0) {
        console.log("UPDATE VARIANT - Item not found");
        return res.status(404).json({ message: "Menu item not found" });
      }

      if (items[0].restaurantId !== restaurantId) {
        console.log("UPDATE VARIANT - Restaurant mismatch");
        return res.status(403).json({
          message: "You do not have permission to update this variant",
        });
      }

      const updateData: any = {};
      if (variantName !== undefined) updateData.variantName = variantName;
      if (price !== undefined) updateData.price = price; // price is in paise (integer)

      if (additionalInfo) {
        if (additionalInfo.foodType !== undefined) {
          updateData.foodType = additionalInfo.foodType;
        }
        if (additionalInfo.portionSize !== undefined) {
          updateData.portionSize = additionalInfo.portionSize;
        }
      }

      console.log("UPDATE VARIANT - Update data:", updateData);
      await db
        .update(menuItemVariants)
        .set(updateData)
        .where(
          and(
            eq(menuItemVariants.id, variantId),
            eq(menuItemVariants.menuItemId, itemId)
          )
        );
      console.log("UPDATE VARIANT - Variant updated successfully");
      menuCache.invalidate(restaurantId);
      return res
        .status(200)
        .json({ message: "Menu item variant updated successfully" });
    } catch (error) {
      console.error("UPDATE VARIANT ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:restaurantId/menu/items/:itemId/variants/:variantId",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId, variantId } = req.params;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to delete menu item variants",
        });
      }

      // Verify the item belongs to the restaurant
      const items = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, itemId));

      if (!items || items.length === 0 || items[0].restaurantId !== restaurantId) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      // Delete the variant
      await db
        .delete(menuItemVariants)
        .where(
          and(
            eq(menuItemVariants.id, variantId),
            eq(menuItemVariants.menuItemId, itemId)
          )
        );



      menuCache.invalidate(restaurantId);

      return res
        .status(200)
        .json({ message: "Menu item variant deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/items/:itemId/deactivate",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId } = req.params;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to deactivate menu items",
        });
      }

      await db
        .update(menuItems)
        .set({ isActive: false })
        .where(
          and(
            eq(menuItems.id, itemId),
            eq(menuItems.restaurantId, restaurantId)
          )
        );



      menuCache.invalidate(restaurantId);

      return res
        .status(200)
        .json({ message: "Menu item deactivated successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/items/:itemId/activate",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId } = req.params;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to activate menu items",
        });
      }

      await db
        .update(menuItems)
        .set({ isActive: true })
        .where(
          and(
            eq(menuItems.id, itemId),
            eq(menuItems.restaurantId, restaurantId)
          )
        );



      menuCache.invalidate(restaurantId);

      return res
        .status(200)
        .json({ message: "Menu item activated successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/items/:itemId/variants/:variantId/deactivate",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId, variantId } = req.params;

      console.log("DEACTIVATE VARIANT - User:", user?.id, "Restaurant:", restaurantId, "Item:", itemId, "Variant:", variantId);

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        console.log("DEACTIVATE VARIANT - Auth failed");
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        console.log("DEACTIVATE VARIANT - Access denied");
        return res.status(403).json({
          message:
            "You do not have permission to deactivate menu item variants",
        });
      }

      const items = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, itemId));

      console.log("DEACTIVATE VARIANT - Items found:", items.length);

      if (!items || items.length === 0) {
        console.log("DEACTIVATE VARIANT - Item not found");
        return res.status(404).json({ message: "Menu item not found" });
      }

      if (items[0].restaurantId !== restaurantId) {
        console.log("DEACTIVATE VARIANT - Restaurant mismatch");
        return res.status(403).json({
          message: "You do not have permission to deactivate this variant",
        });
      }

      await db
        .update(menuItemVariants)
        .set({ isActive: false })
        .where(
          and(
            eq(menuItemVariants.id, variantId),
            eq(menuItemVariants.menuItemId, itemId)
          )
        );

      console.log("DEACTIVATE VARIANT - Variant deactivated successfully");
      menuCache.invalidate(restaurantId);
      return res
        .status(200)
        .json({ message: "Menu item variant deactivated successfully" });
    } catch (error) {
      console.error("DEACTIVATE VARIANT ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/items/:itemId/variants/:variantId/activate",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId, variantId } = req.params;

      console.log("ACTIVATE VARIANT - User:", user?.id, "Restaurant:", restaurantId, "Item:", itemId, "Variant:", variantId);

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        console.log("ACTIVATE VARIANT - Auth failed");
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        console.log("ACTIVATE VARIANT - Access denied");
        return res.status(403).json({
          message: "You do not have permission to activate menu item variants",
        });
      }

      const items = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, itemId));

      console.log("ACTIVATE VARIANT - Items found:", items.length);

      if (!items || items.length === 0) {
        console.log("ACTIVATE VARIANT - Item not found");
        return res.status(404).json({ message: "Menu item not found" });
      }

      if (items[0].restaurantId !== restaurantId) {
        console.log("ACTIVATE VARIANT - Restaurant mismatch");
        return res.status(403).json({
          message: "You do not have permission to activate this variant",
        });
      }

      await db
        .update(menuItemVariants)
        .set({ isActive: true })
        .where(
          and(
            eq(menuItemVariants.id, variantId),
            eq(menuItemVariants.menuItemId, itemId)
          )
        );

      console.log("ACTIVATE VARIANT - Variant activated successfully");
      menuCache.invalidate(restaurantId);
      return res
        .status(200)
        .json({ message: "Menu item variant activated successfully" });
    } catch (error) {
      console.error("ACTIVATE VARIANT ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:restaurantId/menu/items/:itemId",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId, itemId } = req.params;

      console.log("DELETE MENU ITEM - User:", user?.id, "Restaurant:", restaurantId, "Item:", itemId);

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);

      if (!user || user.role !== "restaurant") {
        console.log("DELETE MENU ITEM - Auth failed");
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!hasAccess) {
        console.log("DELETE MENU ITEM - Access denied");
        return res.status(403).json({
          message: "You do not have permission to delete menu items",
        });
      }

      // First delete variants
      console.log("DELETE MENU ITEM - Deleting variants");
      await db
        .delete(menuItemVariants)
        .where(eq(menuItemVariants.menuItemId, itemId));

      // Then delete the item
      console.log("DELETE MENU ITEM - Deleting item");
      await db
        .delete(menuItems)
        .where(
          and(
            eq(menuItems.id, itemId),
            eq(menuItems.restaurantId, restaurantId)
          )
        );

      console.log("DELETE MENU ITEM - Item deleted successfully");
      menuCache.invalidate(restaurantId);
      return res
        .status(200)
        .json({ message: "Menu item deleted successfully" });
    } catch (error) {
      console.error("DELETE MENU ITEM ERROR:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:restaurantId/menu/categories/reorder",
  requireAuth,
  async (req: any, res) => {
    try {
      const user = req.user;
      const { restaurantId } = req.params;
      const { orderedCategoryIds } = req.body;

      const hasAccess = await isRestaurantOwnerOrManager(user.id, restaurantId);
      if (!user || user.role !== "restaurant") {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (!hasAccess) {
        return res.status(403).json({
          message: "You do not have permission to reorder menu categories",
        });
      }

      for (let index = 0; index < orderedCategoryIds.length; index++) {
        const categoryId = orderedCategoryIds[index];
        await db
          .update(menuCategories)
          .set({ displayOrder: index })
          .where(
            and(
              eq(menuCategories.id, categoryId),
              eq(menuCategories.restaurantId, restaurantId)
            )
          );
      }

      return res
        .status(200)
        .json({ message: "Menu categories reordered successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/:restaurantId/menu/manage", requireAuth, async (req: any, res) => {
  try {
    const { restaurantId } = req.params;
    const user = req.user;

    // Check Cache First
    const cached = menuCache.get(restaurantId);
    if (cached.hit) {
      console.log("⚡ MENU CACHE HIT:", restaurantId);
      return res.status(200).json(cached.data);
    }
    console.log("🐢 MENU CACHE MISS:", restaurantId);

    const hasAccess = await isRestaurantOwnerManagerOrStaff(user.id, restaurantId);

    if (!user || user.role !== "restaurant") {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasAccess) {
      return res.status(403).json({
        message: "You do not have permission to view this menu",
      });
    }

    // 1. Fetch all categories
    const categories = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(menuCategories.displayOrder);

    if (categories.length === 0) {
      const emptyMenu = { categories: [] };
      menuCache.set(restaurantId, emptyMenu);
      return res.status(200).json(emptyMenu);
    }

    const categoryIds = categories.map(c => c.id);

    // 2. Fetch all items (including inactive)
    console.time("MENU_DB_QUERY");
    // Fetch items with variants, extras, and assignments
    const [rawItems, extras, assignments] = await Promise.all([
      db.select({
          item: menuItems,
          variant: menuItemVariants
        })
        .from(menuItems)
        .leftJoin(menuItemVariants, eq(menuItems.id, menuItemVariants.menuItemId))
        .where(eq(menuItems.restaurantId, restaurantId)),
      db.select()
        .from(menuExtras)
        .where(and(eq(menuExtras.restaurantId, restaurantId), eq(menuExtras.isActive, true))),
      db.select()
        .from(menuExtraAssignments)
        .where(and(eq(menuExtraAssignments.restaurantId, restaurantId), eq(menuExtraAssignments.isActive, true)))
    ]);

    console.timeEnd("MENU_DB_QUERY");

    console.time("MENU_TRANSFORM");

    // Map extras by ID for quick lookup
    const extrasById = new Map(extras.map(e => [e.id, e]));

    // Group assignments
    const globalExtras: any[] = [];
    const extrasByCategoryId = new Map();
    const extrasByItemId = new Map();
    const extrasByVariantId = new Map();

    for (const a of assignments) {
      const extra = extrasById.get(a.extraId);
      if (!extra) continue;

      if (a.isGlobal) {
        globalExtras.push(extra);
      } else if (a.categoryId) {
        if (!extrasByCategoryId.has(a.categoryId)) extrasByCategoryId.set(a.categoryId, []);
        extrasByCategoryId.get(a.categoryId).push(extra);
      } else if (a.menuItemId) {
        if (!extrasByItemId.has(a.menuItemId)) extrasByItemId.set(a.menuItemId, []);
        extrasByItemId.get(a.menuItemId).push(extra);
      } else if (a.variantId) {
        if (!extrasByVariantId.has(a.variantId)) extrasByVariantId.set(a.variantId, []);
        extrasByVariantId.get(a.variantId).push(extra);
      }
    }

    // Group variants and attach extras to items
    const itemsMap = new Map();

    for (const row of rawItems) {
      if (!row.item) continue;

      const itemId = row.item.id;
      if (!itemsMap.has(itemId)) {
        // Resolve all heritage extras for this item
        const itemExtras = [
          ...globalExtras,
          ...(extrasByCategoryId.get(row.item.categoryId) || []),
          ...(extrasByItemId.get(itemId) || [])
        ];
        
        // Remove duplicates if any (by ID)
        const uniqueExtras = Array.from(new Map(itemExtras.map(e => [e.id, e])).values());

        itemsMap.set(itemId, {
          ...row.item,
          variants: [],
          extras: uniqueExtras
        });
      }

      if (row.variant) {
        const variantWithExtras = {
          ...row.variant,
          extras: extrasByVariantId.get(row.variant.id) || []
        };
        itemsMap.get(itemId).variants.push(variantWithExtras);
      }
    }

    const items = Array.from(itemsMap.values());

    // Group items by category
    const itemsByCategoryId = new Map();
    for (const item of items) {
      if (!itemsByCategoryId.has(item.categoryId)) {
        itemsByCategoryId.set(item.categoryId, []);
      }
      // Sort variants
      if (item.variants && item.variants.length > 0) {
        item.variants.sort((a: any, b: any) => (a.price - b.price));
      }

      itemsByCategoryId.get(item.categoryId).push(item);
    }

    // Build final menu array using the sorted categories
    const menu = categories.map(category => ({
      ...category,
      items: itemsByCategoryId.get(category.id) || []
    }));
    console.timeEnd("MENU_TRANSFORM");

    const responseData = { categories: menu };
    menuCache.set(restaurantId, responseData);

    console.timeEnd("MENU_TOTAL");
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("MENU MANAGE ERROR:", error);
    console.timeEnd("MENU_TOTAL");
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
