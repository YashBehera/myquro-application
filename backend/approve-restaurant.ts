import { db } from "./src/db/db.js";
import { authUsers } from "./src/db/schema/auth-users.js";
import { restaurants } from "./src/db/schema/restaurants.js";
import { restaurantRequests } from "./src/db/schema/restaurant-requests.js";
import { restaurantManagers } from "./src/db/schema/restaurant-managers.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

async function approveRestaurant() {
  try {
    const ownerEmail = "test5@gmail.com";
    console.log(`🔍 Locating user with email: ${ownerEmail}`);

    const userRows = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, ownerEmail))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      console.log(`❌ User ${ownerEmail} not found`);
      process.exit(1);
    }

    console.log(`👤 User found: ID=${user.id}, Name=${user.name}, Role=${user.role}`);

    // Find restaurant requests for this user
    const requests = await db
      .select()
      .from(restaurantRequests)
      .where(eq(restaurantRequests.userId, user.id))
      .limit(1);

    const request = requests[0];
    if (!request) {
      console.log(`❌ No restaurant request found for user ID: ${user.id}`);
      process.exit(1);
    }

    console.log(`📋 Request found: ID=${request.id}, Status=${request.requestStatus}, RestaurantID=${request.restaurantId}`);

    const restaurantId = request.restaurantId;

    // Approve request
    console.log(`⚡ Approving request ID: ${request.id}`);
    await db
      .update(restaurantRequests)
      .set({
        requestStatus: "APPROVED",
        reviewedAt: new Date(),
      })
      .where(eq(restaurantRequests.id, request.id));

    // Activate restaurant
    console.log(`⚡ Activating restaurant ID: ${restaurantId}`);
    await db
      .update(restaurants)
      .set({
        restaurantStatus: "active",
      })
      .where(eq(restaurants.id, restaurantId));

    // Promote user role to 'restaurant'
    console.log(`⚡ Promoting user role to 'restaurant'`);
    await db
      .update(authUsers)
      .set({
        role: "restaurant",
      })
      .where(eq(authUsers.id, user.id));

    // Insert manager entry
    console.log(`⚡ Adding user as restaurant owner manager`);
    await db.insert(restaurantManagers).values({
      id: nanoid(),
      userId: user.id,
      restaurantId: restaurantId,
      role: "owner",
      status: "active",
    }).onConflictDoUpdate({
      target: [restaurantManagers.userId, restaurantManagers.restaurantId],
      set: { role: "owner", status: "active" }
    });

    console.log("✅ Success! Restaurant approved and user promoted successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during approval script:", error);
    process.exit(1);
  }
}

approveRestaurant();
