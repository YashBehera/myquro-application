// used for managing restaurant details

import {
  pgTable,
  text,
  timestamp,
  integer,
  check,
  boolean,
  numeric,
  real,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users.js";
import { sql } from "drizzle-orm";

export const restaurants = pgTable(
  "restaurants",
  {
    id: text("id").notNull().primaryKey(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    restaurantName: text("restaurant_name").notNull(),
    restaurantType: text("restaurant_type").notNull(),
    restaurantAddress: text("restaurant_address").notNull(),
    restaurantLogo: text("restaurant_logo"),
    restaurantBanner: text("restaurant_banner"),
    establishmentYear: integer("establishment_year"),
    seatingCapacity: integer("seating_capacity").notNull().default(0),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: integer("postal_code").notNull(),
    description: text("description"),
    phoneNumber: text("phone_number").notNull(),
    email: text("email").notNull(),
    website: text("website"),
    cuisine: text("cuisine").array(),
    rating: numeric("rating", { precision: 2, scale: 1 })
      .notNull()
      .default(sql`0.00`),
    ratingCount: integer("rating_count").notNull().default(0),

    corporateIdentificationNumber: text("corporate_identification_number"),
    gstNumber: text("gst_number"),
    fssaiLicenseNumber: text("fssai_license_number"),
    defaultGstPercentage: numeric("default_gst_percentage", { precision: 5, scale: 2 })
      .notNull()
      .default(sql`0.00`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    suspendedAt: timestamp("suspended_at"),
    suspendedReason: text("suspended_reason"),

    restaurantStatus: text("restaurant_status")
      .notNull()
      .default("inactive")
      .$type<"active" | "inactive" | "suspended">(),
    isOpen: boolean("is_open").default(false).notNull(),
    companyId: text("company_id"),
    latitude: real("latitude"),
    longitude: real("longitude"),
  },
  (table) => [
    check(
      "restaurants_status_check",
      sql`${table.restaurantStatus} IN ('active', 'inactive', 'suspended')`
    ),
  ]
);