import "dotenv/config";
import { db } from "./db.js";
import { operatingCities, operatingZones } from "./schema/rider-onboarding.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding cities and zones...");
  try {
    // Clear existing data to avoid duplicates
    await db.execute(sql`TRUNCATE TABLE operating_zones CASCADE;`);
    await db.execute(sql`TRUNCATE TABLE operating_cities CASCADE;`);

    // Insert cities
    const citiesToInsert = [
      { id: "city_bokaro", name: "Bokaro", state: "Jharkhand", isActive: true },
      { id: "city_dhanbad", name: "Dhanbad", state: "Jharkhand", isActive: true },
      { id: "city_purulia", name: "Purulia", state: "West Bengal", isActive: true },
    ];

    for (const city of citiesToInsert) {
      await db.insert(operatingCities).values(city);
    }
    console.log("✅ Cities inserted!");

    // Insert zones
    const zonesToInsert = [
      {
        id: "zone_city_centre",
        cityId: "city_bokaro",
        name: "City Centre",
        distance: "3 km",
        minGuarantee: "₹4,000",
        weeklyEarnings: "Upto 6,000 weekly earnings",
        isBestZone: true,
        isOpen: true,
      },
      {
        id: "zone_jainamore",
        cityId: "city_bokaro",
        name: "Jainamore",
        distance: "16 km",
        minGuarantee: "₹4,000",
        weeklyEarnings: "Upto 8,000 weekly earnings",
        isBestZone: false,
        isOpen: false,
        noOpeningReason: "No opening currently",
      },
    ];

    for (const zone of zonesToInsert) {
      await db.insert(operatingZones).values(zone);
    }
    console.log("✅ Zones inserted!");

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

main();
