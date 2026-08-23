import { db } from "./src/db/db.js";
import { orderDeliveries } from "./src/db/schema/order-deliveries.js";

async function main() {
  try {
    const list = await db.select().from(orderDeliveries);
    console.log("=== ORDER DELIVERIES IN DB ===");
    console.log(list);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
