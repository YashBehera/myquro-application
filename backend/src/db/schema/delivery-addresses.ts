import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";

export const deliveryAddresses = pgTable("delivery_addresses", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  addressLine: text("address_line").notNull(),
  city: text("city").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
