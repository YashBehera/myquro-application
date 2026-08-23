import { db } from './src/db/db.js';
import { orders } from './src/db/schema/orders.js';
import { orderItems } from './src/db/schema/order-items.js';
import { tableSession } from './src/db/schema/table-session.js';
import { nanoid } from 'nanoid';

async function createTestOrders() {
  try {
    // Get existing data
    const restaurantResult = await db.execute('SELECT id FROM restaurants LIMIT 1');
    const restaurantId = restaurantResult.rows[0]?.id;

    const tableResult = await db.execute('SELECT id FROM tables LIMIT 1');
    const tableId = tableResult.rows[0]?.id;

    const userResult = await db.execute('SELECT id FROM auth_users LIMIT 1');
    const userId = userResult.rows[0]?.id;

    const menuItemResult = await db.execute('SELECT id FROM menu_items LIMIT 1');
    const menuItemId = menuItemResult.rows[0]?.id;

    const menuVariantResult = await db.execute('SELECT id FROM menu_item_variants LIMIT 1');
    const menuVariantId = menuVariantResult.rows[0]?.id;

    if (!restaurantId || !tableId || !userId || !menuItemId || !menuVariantId) {
      console.log('Missing required data for test orders');
      return;
    }

    // Create a table session
    const sessionId = nanoid();
    await db.insert(tableSession).values({
      id: sessionId,
      tableId,
      restaurantId,
      status: 'closed',
      paymentStatus: 'paid',
      createdByUserId: userId,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
      subtotal: 100000, // 1000 rupees in paise
      discountAmount: 0,
      taxableBase: 100000,
      gstRate: 5,
      gstAmount: 5000,
      grandTotal: 105000,
      finalBillAmount: 105000,
      billedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
      invoiceNumber: 'TEST-001',
    });

    // Create an order
    const orderId = nanoid();
    await db.insert(orders).values({
      id: orderId,
      tableSessionId: sessionId,
      restaurantId,
      tableId,
      placedByUserId: userId,
      status: 'served',
      subtotal: 100000,
      discount: 0,
      gst: 5000,
      grandTotal: 105000,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    // Create order items
    await db.insert(orderItems).values({
      id: nanoid(),
      orderId,
      menuItemId,
      menuItemVariantId: menuVariantId,
      restaurantId,
      quantity: 2,
      unitPrice: 50000, // 500 rupees in paise
      totalPrice: 100000,
      status: 'served',
    });

    // Create another order for yesterday
    const sessionId2 = nanoid();
    await db.insert(tableSession).values({
      id: sessionId2,
      tableId,
      restaurantId,
      status: 'closed',
      paymentStatus: 'paid',
      createdByUserId: userId,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      endedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 hour later
      subtotal: 75000, // 750 rupees in paise
      discountAmount: 0,
      taxableBase: 75000,
      gstRate: 5,
      gstAmount: 3750,
      grandTotal: 78750,
      finalBillAmount: 78750,
      billedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      invoiceNumber: 'TEST-002',
    });

    const orderId2 = nanoid();
    await db.insert(orders).values({
      id: orderId2,
      tableSessionId: sessionId2,
      restaurantId,
      tableId,
      placedByUserId: userId,
      status: 'served',
      subtotal: 75000,
      discount: 0,
      gst: 3750,
      grandTotal: 78750,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    await db.insert(orderItems).values({
      id: nanoid(),
      orderId: orderId2,
      menuItemId,
      menuItemVariantId: menuVariantId,
      restaurantId,
      quantity: 1,
      unitPrice: 75000, // 750 rupees in paise
      totalPrice: 75000,
      status: 'served',
    });

    console.log('Test orders created successfully');
  } catch (error) {
    console.error('Error creating test orders:', error);
  }
}

createTestOrders();