import { db } from "./src/db/db.js";
import { menuCategories } from "./src/db/schema/menu-categories.js";
import { menuItems } from "./src/db/schema/menu-items.js";
import { menuItemVariants } from "./src/db/schema/menu-item-variants.js";
import { nanoid } from "nanoid";

async function main() {
  try {
    const restaurantId = "yn0V3SFlmu2UMCY1IkY0M";

    // 1. Create a category
    const catId = `cat_${nanoid(10)}`;
    await db.insert(menuCategories).values({
      id: catId,
      restaurantId,
      category: "Signature Dishes",
      description: "Exclusive creations by MyQuro chefs",
      displayOrder: 1,
      isActive: true,
    });
    console.log("Created category ID:", catId);

    // 2. Dish 1: Loaded Fries (Veg)
    const item1Id = `item_${nanoid(10)}`;
    await db.insert(menuItems).values({
      id: item1Id,
      restaurantId,
      categoryId: catId,
      name: "MyQuro Special Loaded Fries",
      description: "A crispy bed of golden fries loaded with liquid cheese, signature Quro herbs, and spicy jalapenos.",
      isVeg: true,
      isAvailable: true,
      isActive: true,
    });
    console.log("Created item 1 ID:", item1Id);

    await db.insert(menuItemVariants).values({
      id: `var_${nanoid(10)}`,
      menuItemId: item1Id,
      variantName: "Regular",
      foodType: "veg",
      portionSize: "Regular",
      price: 12000, // ₹120.00
      isAvailable: true,
      isActive: true,
    });

    await db.insert(menuItemVariants).values({
      id: `var_${nanoid(10)}`,
      menuItemId: item1Id,
      variantName: "Cheese Double",
      foodType: "veg",
      portionSize: "Large",
      price: 18000, // ₹180.00
      isAvailable: true,
      isActive: true,
    });

    // 3. Dish 2: Paneer Burger (Veg)
    const item2Id = `item_${nanoid(10)}`;
    await db.insert(menuItems).values({
      id: item2Id,
      restaurantId,
      categoryId: catId,
      name: "Quro Crispy Paneer Burger",
      description: "Crispy fried cottage cheese patty layered with fresh lettuce, sliced tomatoes, and house secret burger sauce.",
      isVeg: true,
      isAvailable: true,
      isActive: true,
    });
    console.log("Created item 2 ID:", item2Id);

    await db.insert(menuItemVariants).values({
      id: `var_${nanoid(10)}`,
      menuItemId: item2Id,
      variantName: "Regular",
      foodType: "veg",
      portionSize: "Medium",
      price: 16000, // ₹160.00
      isAvailable: true,
      isActive: true,
    });

    await db.insert(menuItemVariants).values({
      id: `var_${nanoid(10)}`,
      menuItemId: item2Id,
      variantName: "Double Patty",
      foodType: "veg",
      portionSize: "Large",
      price: 22000, // ₹220.00
      isAvailable: true,
      isActive: true,
    });

    // 4. Dish 3: Chicken Club Toast (Non-Veg)
    const item3Id = `item_${nanoid(10)}`;
    await db.insert(menuItems).values({
      id: item3Id,
      restaurantId,
      categoryId: catId,
      name: "Quro Gourmet Chicken Club Toast",
      description: "Three-layered white toast stuffed with juicy grilled chicken breast, fried egg, melted cheddar, and crisp veggies.",
      isVeg: false,
      isAvailable: true,
      isActive: true,
    });
    console.log("Created item 3 ID:", item3Id);

    await db.insert(menuItemVariants).values({
      id: `var_${nanoid(10)}`,
      menuItemId: item3Id,
      variantName: "Regular",
      foodType: "non-veg",
      portionSize: "Regular",
      price: 19000, // ₹190.00
      isAvailable: true,
      isActive: true,
    });

    await db.insert(menuItemVariants).values({
      id: `var_${nanoid(10)}`,
      menuItemId: item3Id,
      variantName: "Extra Cheese",
      foodType: "non-veg",
      portionSize: "Large",
      price: 24000, // ₹240.00
      isAvailable: true,
      isActive: true,
    });

    console.log("SUCCESS: Seeded MyQuro menu items!");
    process.exit(0);
  } catch (err) {
    console.error("ERROR seeding MyQuro menu items:", err);
    process.exit(1);
  }
}
main();
