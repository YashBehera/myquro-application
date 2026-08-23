import { db } from "./src/db/db.js";
import { deliveryAddresses } from "./src/db/schema/delivery-addresses.js";

async function main() {
  try {
    const list = await db.select().from(deliveryAddresses);
    console.log("=== DELIVERY ADDRESSES IN DB ===");
    console.log(list);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
