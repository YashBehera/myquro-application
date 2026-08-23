import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";

export const menuExtras = pgTable("menu_extras", {
  id: text("id").notNull().primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull().default(0), // Price in cents, 0 for free extras
  isAvailable: boolean("is_available").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});