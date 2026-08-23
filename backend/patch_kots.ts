import { db } from "./src/db/db.js";
import { tableSession } from "./src/db/schema/table-session.js";
import { orders } from "./src/db/schema/orders.js";
import { eq, and, isNull } from "drizzle-orm";

async function patchPreviousKOTs() {
    console.log("Starting patch for previous completed KOTs...");
    try {
        // Find all orders that are completed but might have unbilled sessions
        const completedOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.status, 'served'));

        console.log(`Found ${completedOrders.length} completed orders. Checking sessions...`);

        let patchedCount = 0;

        for (const order of completedOrders) {
            if (order.tableSessionId) {
                // Try to update the session if it hasn't been billed yet
                const updated = await db.update(tableSession)
                    .set({
                        status: "closed",
                        paymentStatus: "paid",
                        billedAt: order.createdAt || new Date(), // backdate to order creation time
                        invoiceNumber: order.id ? order.id.slice(-6).toUpperCase() : null,
                        finalBillAmount: order.grandTotal,
                        finalAmount: order.grandTotal,
                        frozenSubtotal: order.subtotal,
                        frozenDiscountAmount: order.discount,
                        frozenTaxableAmount: (order.subtotal || 0) - (order.discount || 0),
                        frozenGstAmount: order.gst,
                    })
                    .where(
                        eq(tableSession.id, order.tableSessionId)
                    )
                    .returning();

                if (updated && updated.length > 0) {
                    patchedCount++;
                    console.log(`Patched session: ${order.tableSessionId} for order: ${order.id}`);
                }
            }
        }

        console.log(`\n✅ Patch complete! Synchronized ${patchedCount} hanging Manual Billing sessions to Dashboard Analytics.`);
        process.exit(0);
    } catch (err) {
        console.error("Patch failed:", err);
        process.exit(1);
    }
}

patchPreviousKOTs();
