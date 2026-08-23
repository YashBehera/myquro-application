import { db } from './src/db/db.js';
import { payments } from './src/db/schema/payments.js';
import { nanoid } from 'nanoid';

async function createTestPayments() {
  try {
    // Get a restaurant ID - assuming there's at least one
    const restaurantResult = await db.execute('SELECT id FROM restaurants LIMIT 1');
    const restaurantId = restaurantResult.rows[0]?.id;

    if (!restaurantId) {
      console.log('No restaurant found');
      return;
    }

    // Get a table session ID - assuming there's at least one
    const sessionResult = await db.execute('SELECT id FROM table_session LIMIT 1');
    const sessionId = sessionResult.rows[0]?.id;

    if (!sessionId) {
      console.log('No table session found');
      return;
    }

    // Get a user ID
    const userResult = await db.execute('SELECT id FROM auth_users LIMIT 1');
    const userId = userResult.rows[0]?.id;

    // Create some test payments
    const testPayments = [
      {
        id: nanoid(),
        tableSessionId: sessionId,
        restaurantId,
        amount: 5000, // 50 rupees
        method: 'cash' as const,
        status: 'success' as const,
        paidByUserId: userId,
        isRefund: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: nanoid(),
        tableSessionId: sessionId,
        restaurantId,
        amount: 7500, // 75 rupees
        method: 'upi' as const,
        status: 'success' as const,
        paidByUserId: userId,
        isRefund: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: nanoid(),
        tableSessionId: sessionId,
        restaurantId,
        amount: 3000, // 30 rupees
        method: 'card' as const,
        status: 'success' as const,
        paidByUserId: userId,
        isRefund: false,
        createdAt: new Date(),
      }
    ];

    for (const payment of testPayments) {
      await db.insert(payments).values(payment);
    }

    console.log('Test payments created successfully');
  } catch (error) {
    console.error('Error creating test payments:', error);
  }
}

createTestPayments();