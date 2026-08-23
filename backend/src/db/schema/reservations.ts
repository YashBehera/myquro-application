import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { restaurants } from "./restaurants.js";
import { authUsers } from "./auth-users.js";
import { tables } from "./tables.js";

export const reservations = pgTable("reservations", {
    id: text("id").notNull().primaryKey(),

    restaurantId: text("restaurant_id")
        .notNull()
        .references(() => restaurants.id, { onDelete: "cascade" }),

    reservationTime: timestamp("reservation_time").notNull(),
    reservationEndTime: timestamp("reservation_end_time"),
    numberOfGuests: integer("number_of_guests").notNull(),
    occasion: text("occasion"),
    reservedBy: text("reserved_by")
        .notNull()
        .references(() => authUsers.id, { onDelete: "cascade" }),
    tableId: text("table_id").references(() => tables.id, { onDelete: "set null" }),
    reservedAt: timestamp("reserved_at").defaultNow().notNull(),
    specialRequests: text("special_requests"),
    status: text("status")
        .notNull()
        .default("pending")
        .$type<"pending" | "confirmed" | "cancelled" | "rejected" | "completed">(),
    guestName: text("guest_name"),
    guestPhone: text("guest_phone"),
    guestEmail: text("guest_email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        idx_reservations_restaurant_time: index("idx_reservations_restaurant_time").on(table.restaurantId, table.reservationTime),
        idx_reservations_restaurant_status: index("idx_reservations_restaurant_status").on(table.restaurantId, table.status),
        idx_reservations_user: index("idx_reservations_user").on(table.reservedBy),
    };
});