import { db } from "./src/db/db.js";
import { operatingCities, operatingZones } from "./src/db/schema/rider-onboarding.js";
import crypto from "crypto";

async function seed() {
  console.log("Seeding onboarding data...");

  const cityId = crypto.randomUUID();

  // Insert City
  await db.insert(operatingCities).values([
    {
      id: cityId,
      name: "Bokaro",
      state: "Jharkhand",
      isActive: true,
    }
  ]).onConflictDoNothing();

  // Insert Zones
  await db.insert(operatingZones).values([
    {
      id: crypto.randomUUID(),
      cityId: cityId,
      name: "Sardar Patel Nagar",
      distance: "34 kms",
      minGuarantee: "₹4000 Minimum guarantee",
      weeklyEarnings: "Upto ₹6,000 weekly earnings",
      isBestZone: true,
      isOpen: true,
    },
    {
      id: crypto.randomUUID(),
      cityId: cityId,
      name: "Jharia",
      distance: "26 kms",
      minGuarantee: "",
      weeklyEarnings: "Upto ₹10,000 weekly earnings",
      isBestZone: false,
      isOpen: false,
      noOpeningReason: "No opening currently",
    },
    {
      id: crypto.randomUUID(),
      cityId: cityId,
      name: "Katras",
      distance: "23 kms",
      minGuarantee: "",
      weeklyEarnings: "Upto ₹10,000 weekly earnings",
      isBestZone: false,
      isOpen: false,
    }
  ]).onConflictDoNothing();

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Failed to seed", err);
  process.exit(1);
});
