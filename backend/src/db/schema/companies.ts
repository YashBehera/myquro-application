import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";

export const companies = pgTable("companies", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
        .notNull()
        .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
