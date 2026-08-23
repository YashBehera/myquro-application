import { db } from './src/db/db';
import { menuCategories, menuItems, menuItemVariants } from './src/db/schema';

async function seedMenu() {
  try {
    // Sample category
    const category = await db.insert(menuCategories).values({
      id: 'sample-cat-1',
      restaurantId: 'your-restaurant-id', // Replace with actual restaurant ID
      category: 'Appetizers',
      description: 'Start your meal with these delicious appetizers',
      displayOrder: 1,
      isActive: true,
    }).returning();

    // Sample item
    const item = await db.insert(menuItems).values({
      id: 'sample-item-1',
      restaurantId: 'your-restaurant-id', // Replace with actual restaurant ID
      categoryId: category[0].id,
      name: 'Chicken Wings',
      description: 'Crispy fried chicken wings with buffalo sauce',
      isActive: true,
    }).returning();

    // Sample variant
    await db.insert(menuItemVariants).values({
      id: 'sample-variant-1',
      menuItemId: item[0].id,
      variantName: '6 Pieces',
      price: 1200, // 12 rupees in paise
      isAvailable: true,
      additionalInfo: {
        foodType: 'non-veg',
        portionSize: '6 pieces'
      }
    });

    console.log('Sample menu data inserted');
  } catch (error) {
    console.error('Error seeding menu:', error);
  }
}

seedMenu();