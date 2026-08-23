import { db } from "./src/db/db.js";
import { restaurants } from "./src/db/schema/restaurants.js";

async function main() {
  try {
    const list = await db.select().from(restaurants);
    console.log("=== RESTAURANTS IN DB ===");
    list.forEach(r => {
      console.log(`ID: ${r.id}`);
      console.log(`Name: ${r.restaurantName}`);
      console.log(`Status: ${r.restaurantStatus}`);
      console.log(`Address: ${r.restaurantAddress}`);
      console.log(`City: ${r.city}`);
      console.log(`Lat: ${r.latitude} | Lng: ${r.longitude}`);
      console.log(`isOpen: ${r.isOpen}`);
      console.log("------------------------");
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
