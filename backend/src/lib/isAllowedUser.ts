import { db } from "../db/db.js";
import { tableSession } from "../db/schema/table-session.js";
import { restaurantManagers } from "../db/schema/restaurant-managers.js";
import { and, eq } from "drizzle-orm";


/**
 * Can user view/manage a table session?
 * - creator of the session
 * - active restaurant manager/owner/staff of the session's restaurant
 */
export async function isAllowedForTableSession(
  userId: string,
  tableSessionId: string
): Promise<boolean> {
  const session = (
    await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, tableSessionId))
      .limit(1)
  )[0];

  if (!session) return false;
  if (session.createdByUserId === userId) return true;

  const manager = await db
    .select()
    .from(restaurantManagers)
    .where(
      and(
        eq(restaurantManagers.restaurantId, session.restaurantId),
        eq(restaurantManagers.userId, userId),
        eq(restaurantManagers.status, "active")
      )
    )
    .limit(1);

  return manager.length > 0;
}

/**
 * Can user act on an order?
 * - user who placed the order
 * - active restaurant manager/owner/staff of the order's restaurant
 */
export async function isAllowedForOrder(
  userId: string,
  orderRestaurantId: string,
  placedByUserId: string
): Promise<boolean> {
  if (placedByUserId === userId) return true;

  const manager = await db
    .select()
    .from(restaurantManagers)
    .where(
      and(
        eq(restaurantManagers.restaurantId, orderRestaurantId),
        eq(restaurantManagers.userId, userId),
        eq(restaurantManagers.status, "active")
      )
    )
    .limit(1);

  return manager.length > 0;
}
