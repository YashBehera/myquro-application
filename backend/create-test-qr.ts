import { db } from './src/db/db.js';
import { tableQR, tables, restaurants } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function createTestQRToken() {
  try {
    console.log('🔧 Creating test QR token...');

    // First, check if there are any restaurants
    const existingRestaurants = await db.select().from(restaurants).limit(1);
    if (existingRestaurants.length === 0) {
      console.log('❌ No restaurants found. Please create a restaurant first.');
      return;
    }

    const restaurant = existingRestaurants[0];
    console.log('📍 Using restaurant:', restaurant.restaurantName);

    // Check if there are any tables for this restaurant
    const existingTables = await db.select().from(tables).where(eq(tables.restaurantId, restaurant.id)).limit(1);
    if (existingTables.length === 0) {
      console.log('❌ No tables found for this restaurant. Please create a table first.');
      return;
    }

    const table = existingTables[0];
    console.log('🪑 Using table:', table.tableNumber);

    // Generate QR token
    const qrToken = nanoid(32);
    console.log('🎫 Generated QR token:', qrToken);

    // Delete any existing QR for this table
    await db.delete(tableQR).where(eq(tableQR.tableId, table.id));
    console.log('🗑️ Deleted existing QR codes for this table');

    // Insert new QR token
    await db.insert(tableQR).values({
      id: nanoid(),
      restaurantId: restaurant.id,
      tableId: table.id,
      qrToken,
      isLocked: false,
      createdAt: new Date(),
    });

    console.log('✅ Test QR token created successfully!');
    console.log('🔗 Scan URL:', `http://localhost:3000/qr/${qrToken}`);
    console.log('🏪 Restaurant:', restaurant.restaurantName);
    console.log('🪑 Table:', table.tableNumber);

  } catch (error) {
    console.error('❌ Error creating test QR token:', error);
  } finally {
    process.exit(0);
  }
}

createTestQRToken();