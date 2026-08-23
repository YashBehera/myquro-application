import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const authVerificationTokens = pgTable("auth_verification_tokens", {
  id: text("id").primaryKey(),

  identifier: text("identifier").notNull(),
  token: text("token"),

  value: text("value").notNull(),

  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
