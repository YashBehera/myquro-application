import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { restaurants } from "./restaurants.js";

export const companyInvitations = pgTable("company_invitations", {
    id: text("id").primaryKey(),
    companyName: text("company_name").notNull(),
    ownerEmail: text("owner_email").notNull(), // The email of the person who will become Company Admin
    status: text("status").notNull().default("pending").$type<"pending" | "completed" | "expired">(),
    generatedPassword: text("generated_password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const restaurantCompanyInvites = pgTable("restaurant_company_invites", {
    id: text("id").primaryKey(),
    invitationId: text("invitation_id")
        .notNull()
        .references(() => companyInvitations.id, { onDelete: "cascade" }),
    restaurantId: text("restaurant_id")
        .notNull()
        .references(() => restaurants.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending").$type<"pending" | "accepted" | "rejected">(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    index("restaurant_invite_invitation_idx").on(table.invitationId),
    index("restaurant_invite_restaurant_idx").on(table.restaurantId),
]);
