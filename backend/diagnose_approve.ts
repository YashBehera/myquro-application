import { db } from "./src/db/db.js";
import { restaurantRequests } from "./src/db/schema/restaurant-requests.js";
import { restaurants } from "./src/db/schema/restaurants.js";
import { restaurantManagers } from "./src/db/schema/restaurant-managers.js";
import { authUsers } from "./src/db/schema/auth-users.js";
import { eq, and } from "drizzle-orm";

async function diagnose() {
    try {
        const allRestros = await db.select().from(restaurants);
        console.log(`Found ${allRestros.length} total restaurants.`);

        for (const r of allRestros) {
            if (r.restaurantStatus === 'active') {
                const managers = await db.select().from(restaurantManagers).where(and(
                    eq(restaurantManagers.restaurantId, r.id),
                    eq(restaurantManagers.role, 'owner')
                ));
                if (managers.length === 0) {
                    console.log(`⚠️ INCONSISTENCY: Restaurant ${r.restaurantName} (ID: ${r.id}) is active but HAS NO OWNER in restaurant_managers!`);

                    // Let's check for any requests for this restaurant
                    const reqs = await db.select().from(restaurantRequests).where(eq(restaurantRequests.restaurantId, r.id));
                    console.log(`   - Requests found: ${reqs.length}`);
                    for (const req of reqs) {
                        console.log(`     - Request ID: ${req.id}, Status: ${req.requestStatus}, UserID: ${req.userId}`);
                    }
                } else {
                    console.log(`✅ Restaurant ${r.restaurantName} (ID: ${r.id}) is active and has owner ${managers[0].userId}`);
                }
            } else {
                console.log(`ℹ️ Restaurant ${r.restaurantName} (ID: ${r.id}) is ${r.restaurantStatus}`);
            }
        }

        const pending = await db.select().from(restaurantRequests).where(eq(restaurantRequests.requestStatus, "PENDING"));
        console.log(`Found ${pending.length} total pending requests.`);

    } catch (err) {
        console.error("DIAGNOSE ERROR:", err);
    }
}

diagnose();
