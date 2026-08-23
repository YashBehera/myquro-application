import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { tableSession } from "./table-session.js";
import { authUsers } from "./auth-users.js";
import { restaurants } from "./restaurants.js";

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").notNull().primaryKey(),

    sessionId: text("session_id")
      .notNull()
      .references(() => tableSession.id, { onDelete: "cascade" }),

    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),

    rating: integer("rating")
      .notNull()
      .$type<1 | 2 | 3 | 4 | 5>(),

    reviewText: text("review_text"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("reviews_session_id_index").on(table.sessionId),
    index("reviews_user_id_index").on(table.userId),
    index("reviews_restaurant_id_index").on(table.restaurantId),
  ]
);