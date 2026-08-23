import { Router } from "express";
import { db } from "../db/db.js";
import { favourites } from "../db/schema/favourites.js";
import { restaurants } from "../db/schema/restaurants.js";
import { requireAuth } from "../auth/requireAuth.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

// Get all favourite restaurants for the current user
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log("🍔 [favourites] Fetching favourites for user:", userId);

    const userFavourites = await db
      .select({
        id: restaurants.id,
        name: restaurants.restaurantName,
        rating: restaurants.rating,
        reviews: restaurants.ratingCount,
        cuisine: restaurants.cuisine,
        location: restaurants.city,
        isOpen: restaurants.isOpen,
        image: restaurants.restaurantLogo,
        category: restaurants.restaurantType,
      })
      .from(favourites)
      .innerJoin(restaurants, eq(favourites.restaurantId, restaurants.id))
      .where(eq(favourites.userId, userId));

    // Map to frontend format
    const formattedFavourites = userFavourites.map((f) => ({
      id: f.id,
      name: f.name,
      rating: Number(f.rating) || 0,
      reviews: `${f.reviews || 0}+`,
      cuisines: f.cuisine || [],
      location: f.location,
      status: f.isOpen ? "Delivering now" : "Closed",
      isAvailable: f.isOpen,
      image: f.image || "/favourites/tray.png",
      category: f.category || "Top Rated",
    }));

    res.status(200).json({ favourites: formattedFavourites });
  } catch (error) {
    console.error("FETCH FAVOURITES ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a restaurant to favourites
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: "restaurantId is required" });
    }

    // Check if already favourited
    const existing = await db
      .select()
      .from(favourites)
      .where(
        and(
          eq(favourites.userId, userId),
          eq(favourites.restaurantId, restaurantId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ message: "Already in favourites" });
    }

    await db.insert(favourites).values({
      id: nanoid(),
      userId,
      restaurantId,
    });

    res.status(201).json({ message: "Added to favourites" });
  } catch (error) {
    console.error("ADD FAVOURITE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Remove a restaurant from favourites
router.delete("/:restaurantId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.params;

    const result = await db
      .delete(favourites)
      .where(
        and(
          eq(favourites.userId, userId),
          eq(favourites.restaurantId, restaurantId)
        )
      );

    res.status(200).json({ message: "Removed from favourites" });
  } catch (error) {
    console.error("REMOVE FAVOURITE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
