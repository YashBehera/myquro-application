import { Router } from "express";
import { db } from "../db/db.js";

import { profiles } from "../db/schema/profiles.js";
import { and, eq, ne } from "drizzle-orm";

import { requireAuth } from "../auth/requireAuth.js";
import { nanoid } from "nanoid";


const router = Router();

const VALID_DIETARY = [
  "vegetarian",
  "vegan",
  "halal",
  "kosher",
  "gluten_free",
  "dairy_free",
];

const VALID_CUISINES = [
  "italian",
  "chinese",
  "indian",
  "mexican",
  "japanese",
  "thai",
  "french",
  "american",
];

const VALID_ALLERGIES = [
  "peanuts",
  "tree_nuts",
  "milk",
  "eggs",
  "fish",
  "shellfish",
  "wheat",
  "sesame",
];

const VALID_SPICE = ["none", "mild", "medium", "hot"];
const VALID_GENDER = ["male", "female", "other"];

// Update user profile
router.put("/me", requireAuth, async (req: any, res) => {
  try {
    const {
      userId,
      username,
      bio,
      gender,
      age,
      location,
      dietaryPreferences,
      favouriteCuisines,
      spicePreference,
      allergies,
      phoneNumber,
      name,
    } = req.body;

    const targetUserId = userId || req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // ✅ 1. Username uniqueness check (against OTHER users)
    if (username) {
      const existingProfile = await db
        .select()
        .from(profiles)
        .where(
          and(eq(profiles.username, username), ne(profiles.userId, targetUserId))
        )
        .limit(1);

      if (existingProfile.length > 0) {
        return res.status(400).json({
          message: "Username is already taken",
        });
      }
    }

    // ✅ 2. Validate enums & arrays
    if (
      dietaryPreferences &&
      !dietaryPreferences.every((d: string) => VALID_DIETARY.includes(d))
    ) {
      return res.status(400).json({ message: "Invalid dietary preference" });
    }

    if (
      favouriteCuisines &&
      !favouriteCuisines.every((c: string) => VALID_CUISINES.includes(c))
    ) {
      return res.status(400).json({ message: "Invalid cuisine" });
    }

    if (
      allergies &&
      !allergies.every((a: string) => VALID_ALLERGIES.includes(a))
    ) {
      return res.status(400).json({ message: "Invalid allergy" });
    }

    if (spicePreference && !VALID_SPICE.includes(spicePreference)) {
      return res.status(400).json({ message: "Invalid spice level" });
    }

    if (gender && !VALID_GENDER.includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    // ✅ 3. Fetch profile
    const existingProfile = (
      await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, targetUserId))
        .limit(1)
    )[0];

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (username !== undefined) updatePayload.username = username;
    if (bio !== undefined) updatePayload.bio = bio;
    if (gender !== undefined) updatePayload.gender = gender;
    if (age !== undefined) updatePayload.age = age;
    if (location !== undefined) updatePayload.location = location;
    if (dietaryPreferences !== undefined)
      updatePayload.dietaryPreferences = dietaryPreferences;
    if (favouriteCuisines !== undefined)
      updatePayload.favouriteCuisines = favouriteCuisines;
    if (spicePreference !== undefined)
      updatePayload.spicePreference = spicePreference;
    if (allergies !== undefined) updatePayload.allergies = allergies;
    if (phoneNumber !== undefined) updatePayload.phoneNumber = phoneNumber;

    if (name !== undefined) {
      const { authUsers } = await import("../db/schema/auth-users.js");
      await db
        .update(authUsers)
        .set({ name, updatedAt: new Date() })
        .where(eq(authUsers.id, targetUserId));
    }

    // ✅ 4. UPSERT
    if (!existingProfile) {
      await db.insert(profiles).values({
        id: nanoid(),
        userId: targetUserId,
        ...updatePayload,
        createdAt: new Date(),
      });
    } else {
      await db
        .update(profiles)
        .set(updatePayload)
        .where(eq(profiles.userId, targetUserId));
    }

    return res.status(200).json({
      message: "Profile saved successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Get user profile
router.get("/me", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const profile = (
      await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1)
    )[0];

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
