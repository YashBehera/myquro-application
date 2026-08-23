import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";
import { menuCategories } from "./menu-categories.js";

export const menuItems = pgTable("menu_items", {
  id: text("id").notNull().primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  categoryId: text("category_id")
    .notNull()
    .references(() => menuCategories.id, { onDelete: "set null" }),

  name: text("name").notNull(),
  description: text("description"),
  imageURL: text("image_url"),
  isVeg: boolean("is_veg").default(true),
  isAvailable: boolean("is_available").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    categoryIdx: index("menu_items_category_idx").on(table.categoryId),
  };
});
