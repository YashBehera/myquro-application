import { db } from "./src/db/db.js";
import { menuCategories } from "./src/db/schema/menu-categories.js";
import { menuItems } from "./src/db/schema/menu-items.js";
import { menuItemVariants } from "./src/db/schema/menu-item-variants.js";
import { restaurants } from "./src/db/schema/restaurants.js";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const list = await db.select().from(restaurants);
    for (const r of list) {
      console.log(`=== RESTAURANT: ${r.restaurantName} (${r.id}) ===`);
      const cats = await db.select().from(menuCategories).where(eq(menuCategories.restaurantId, r.id));
      console.log(`  Categories: ${cats.map(c => c.category).join(", ")}`);
      
      const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, r.id));
      console.log(`  Items (${items.length}):`);
      for (const item of items) {
        const vars = await db.select().from(menuItemVariants).where(eq(menuItemVariants.menuItemId, item.id));
        const priceStr = vars.map(v => `${v.variantName}: ₹${(v.price ?? 0) / 100}`).join(", ");
        console.log(`    - ${item.name}: ${priceStr}`);
      }
      console.log("------------------------");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
