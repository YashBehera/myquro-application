import { db } from './src/db/db';
import { deliveryRiders } from './src/db/schema';
import { ne } from 'drizzle-orm';

async function main() {
  const activeRiderId = 'rider_bTYObW0GOk';

  // Delete ghost riders from delivery_riders ONLY
  await db.delete(deliveryRiders)
    .where(ne(deliveryRiders.id, activeRiderId));
    
  console.log('Deleted ghost riders from deliveryRiders');
  process.exit(0);
}
main();
