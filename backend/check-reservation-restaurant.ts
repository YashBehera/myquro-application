import { db } from "./src/db/db";
import { restaurants, reservations } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function checkReservationRestaurant() {
  try {
    const reservationId = "res_1767077817504";
    
    console.log(`🔍 Checking reservation: ${reservationId}\n`);
    
    const reservation = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);
    
    if (reservation.length === 0) {
      console.log("❌ Reservation not found");
      process.exit(1);
    }
    
    const res = reservation[0];
    console.log("📋 Reservation Details:");
    console.log(`   Restaurant ID: ${res.restaurantId}`);
    console.log(`   Reserved By: ${res.reservedBy}`);
    console.log(`   Status: ${res.status}`);
    console.log(`   Time: ${res.reservationTime}`);
    console.log(`   Guests: ${res.numberOfGuests}`);
    
    // Get restaurant details
    const restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, res.restaurantId))
      .limit(1);
    
    if (restaurant.length > 0) {
      console.log(`\n🏪 Restaurant:`);
      console.log(`   Name: ${restaurant[0].name}`);
      console.log(`   ID: ${restaurant[0].id}`);
      console.log(`   Owner: ${restaurant[0].ownerId}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkReservationRestaurant();
