import { notifications } from "../db/schema.js";
import { db } from "../db/db.js";
import { nanoid } from "nanoid";

export async function sendNotification(
  restaurantId: string,
  message: string,
  type: "info" | "warning" | "error" | "order-update"
) {
  const notification = {
    id: nanoid(),
    restaurantId,
    message,
    type,
    createdAt: new Date(),
  };
  await db.insert(notifications).values(notification);
}