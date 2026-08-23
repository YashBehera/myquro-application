import {
  pgTable,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { menuExtras } from "./menu-extras.js";
import { menuCategories } from "./menu-categories.js";
import { menuItems } from "./menu-items.js";
import { menuItemVariants } from "./menu-item-variants.js";
import { restaurants } from "./restaurants.js";

export const menuExtraAssignments = pgTable("menu_extra_assignments", {
  id: text("id").notNull().primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  extraId: text("extra_id")
    .notNull()
    .references(() => menuExtras.id, { onDelete: "cascade" }),

  // Assignment level - only one of these should be set
  categoryId: text("category_id")
    .references(() => menuCategories.id, { onDelete: "cascade" }),
  menuItemId: text("menu_item_id")
    .references(() => menuItems.id, { onDelete: "cascade" }),
  variantId: text("variant_id")
    .references(() => menuItemVariants.id, { onDelete: "cascade" }),

  // If none of the above are set, it's a global extra for the restaurant
  isGlobal: boolean("is_global").notNull().default(false),

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});