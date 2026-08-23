import { db } from './src/db/db';
import { deliveryRiders } from './src/db/schema';

async function main() {
  await db.update(deliveryRiders)
    .set({ status: 'available' });

  console.log('All riders marked as available');
  process.exit(0);
}
main();
