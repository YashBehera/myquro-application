import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";
import { restaurants } from "./restaurants.js";
import { nanoid } from "nanoid";

export const favourites = pgTable("favourites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
