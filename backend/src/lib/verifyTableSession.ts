import { db } from "../db/db.js";
import { tableSession } from "../db/schema/table-session.js";
import { eq } from "drizzle-orm";

export async function verifyTableSession(tableSessionId: string): Promise<{
  valid: boolean;
  tableSession?: {
    id: string;
    restaurantId: string;
    tableId: string;
    status: "active" | "payment_pending" | "closed" | "cancelled";
    paymentStatus: "unpaid" | "paid" | "partial" | "payment_pending";
    createdByUserId: string | null;
    startedAt: Date;
    endedAt: Date | null;
  };
}> {
  try {
    const sessions = await db
      .select()
      .from(tableSession)
      .where(eq(tableSession.id, tableSessionId))
      .limit(1);

    if (sessions.length === 0) {
      return { valid: false };
    }
    if (sessions[0].status === "closed" || sessions[0].status === "cancelled") {
      return { valid: false };
    }

    return {
      valid: true,
      tableSession: sessions[0],
    };
  } catch (error) {
    console.error("Error verifying table session:", error);
    return { valid: false };
  }
}
