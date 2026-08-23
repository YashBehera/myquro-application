import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { orders } from "./orders.js";

export const chatMessages = pgTable("chat_messages", {
  id: text("id").notNull().primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  sender: text("sender").notNull().$type<"customer" | "rider">(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    idx_chat_messages_order_created: index("idx_chat_messages_order_created").on(table.orderId, table.createdAt),
  };
});
