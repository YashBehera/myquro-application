import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: "cascade" }),

  username: text("username").unique(),
  bio: text("bio"),

  gender: text("gender").$type<"male" | "female" | "other">(),

  age: integer("age"),
  location: text("location"),

  // ✅ MULTI-SELECT FIELDS AS JSONB ARRAYS
  dietaryPreferences: jsonb("dietary_preferences").$type<
    Array<
      "vegetarian" | "vegan" | "halal" | "kosher" | "gluten_free" | "dairy_free"
    >
  >(),

  favouriteCuisines:
    jsonb("favourite_cuisines").$type<
      Array<
        | "italian"
        | "chinese"
        | "indian"
        | "mexican"
        | "japanese"
        | "thai"
        | "french"
        | "american"
      >
    >(),

  spicePreference: text("spice_preference").$type<
    "none" | "mild" | "medium" | "hot"
  >(),

  allergies:
    jsonb("allergies").$type<
      Array<
        | "peanuts"
        | "tree_nuts"
        | "milk"
        | "eggs"
        | "fish"
        | "shellfish"
        | "wheat"
        | "sesame"
      >
    >(),
  phoneNumber: text("phone_number"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
