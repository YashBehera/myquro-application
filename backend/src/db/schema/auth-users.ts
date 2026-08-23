import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const authUsers = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    role: text("role")
      .default("customer")
      .notNull()
      .$type<"admin" | "customer" | "restaurant" | "company_admin" | "rider">(),

    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false),

    name: text("name"),
    image: text("image"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }, // create searchable index on email column
  (table) => [index("auth_users_email_index").on(table.email)]
);
