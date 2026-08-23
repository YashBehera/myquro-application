import { db } from './src/db';
import { orderDeliveries, deliveryRiders } from './src/schema';

async function main() {
  const deliveries = await db.select().from(orderDeliveries);
  console.log('Deliveries:', deliveries);

  const riders = await db.select().from(deliveryRiders);
  console.log('Riders:', riders);
  process.exit(0);
}
main();
