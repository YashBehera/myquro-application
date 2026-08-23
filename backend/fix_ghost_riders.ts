import { db } from './src/db/db';
import { deliveryRiders } from './src/db/schema';
import { eq, ne } from 'drizzle-orm';

async function main() {
  await db.update(deliveryRiders)
    .set({ status: 'offline' })
    .where(ne(deliveryRiders.id, 'rider_bTYObW0GOk')); // Keep only the latest one available

  console.log('Fixed ghost riders');
  process.exit(0);
}
main();
