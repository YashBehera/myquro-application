import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";

export const notifications = pgTable("notifications", {
    id: text("id").notNull().primaryKey(),
    message: text("message").notNull(),
    type: text("type").notNull(),
    restaurantId: text("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
    return {
        idx_notifications_restaurant_created: index("idx_notifications_restaurant_created").on(table.restaurantId, table.createdAt),
    };
});