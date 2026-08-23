import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
  index,
} from "drizzle-orm/pg-core";
import { menuItems } from "./menu-items.js";
import { number } from "better-auth";

export const menuItemVariants = pgTable("menu_item_variants", {
  id: text("id").notNull().primaryKey(),
  menuItemId: text("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),

  variantName: text("variant_name").notNull(),
  foodType: text("food_type").notNull(),
  portionSize: text("portion_size").notNull(),
  price: integer("price").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    menuItemIdx: index("menu_item_variants_menu_item_idx").on(table.menuItemId),
  };
});
