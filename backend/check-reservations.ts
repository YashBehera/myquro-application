import { db } from "./src/db/db";
import { reservations } from "./src/db/schema";

async function checkReservations() {
  try {
    console.log("🔍 Checking all reservations in database...");
    
    const allReservations = await db.select().from(reservations);
    
    console.log(`\n📊 Total reservations found: ${allReservations.length}\n`);
    
    if (allReservations.length === 0) {
      console.log("❌ No reservations found in database!");
    } else {
      console.log("📋 Reservations:");
      allReservations.forEach((r, i) => {
        console.log(`\n${i + 1}. Reservation ID: ${r.id}`);
        console.log(`   Restaurant ID: ${r.restaurantId}`);
        console.log(`   Reserved By: ${r.reservedBy}`);
        console.log(`   Status: ${r.status}`);
        console.log(`   Time: ${r.reservationTime}`);
        console.log(`   Guests: ${r.numberOfGuests}`);
        console.log(`   Table ID: ${r.tableId}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkReservations();
