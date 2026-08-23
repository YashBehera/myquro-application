import { db } from "./src/db/db.js";
import { operatingCities, operatingZones } from "./src/db/schema/rider-onboarding.js";
import crypto from "crypto";

async function seedMoreCities() {
  console.log("Seeding Bangalore and Delhi...");

  const bangaloreId = crypto.randomUUID();
  const delhiId = crypto.randomUUID();

  // Insert Cities
  await db.insert(operatingCities).values([
    {
      id: bangaloreId,
      name: "Bangalore",
      state: "Karnataka",
      isActive: true,
    },
    {
      id: delhiId,
      name: "Delhi",
      state: "Delhi NCR",
      isActive: true,
    }
  ]).onConflictDoNothing();

  // Insert Zones for Bangalore
  await db.insert(operatingZones).values([
    {
      id: crypto.randomUUID(),
      cityId: bangaloreId,
      name: "Koramangala",
      distance: "12 kms",
      minGuarantee: "₹5000 Minimum guarantee",
      weeklyEarnings: "Upto ₹8,000 weekly earnings",
      isBestZone: true,
      isOpen: true,
    },
    {
      id: crypto.randomUUID(),
      cityId: bangaloreId,
      name: "Indiranagar",
      distance: "8 kms",
      minGuarantee: "",
      weeklyEarnings: "Upto ₹12,000 weekly earnings",
      isBestZone: false,
      isOpen: true,
    },
    {
      id: crypto.randomUUID(),
      cityId: bangaloreId,
      name: "Whitefield",
      distance: "25 kms",
      minGuarantee: "",
      weeklyEarnings: "Upto ₹9,000 weekly earnings",
      isBestZone: false,
      isOpen: false,
      noOpeningReason: "Currently full",
    }
  ]).onConflictDoNothing();

  // Insert Zones for Delhi
  await db.insert(operatingZones).values([
    {
      id: crypto.randomUUID(),
      cityId: delhiId,
      name: "Connaught Place",
      distance: "10 kms",
      minGuarantee: "₹4500 Minimum guarantee",
      weeklyEarnings: "Upto ₹7,500 weekly earnings",
      isBestZone: true,
      isOpen: true,
    },
    {
      id: crypto.randomUUID(),
      cityId: delhiId,
      name: "South Ext",
      distance: "15 kms",
      minGuarantee: "",
      weeklyEarnings: "Upto ₹11,000 weekly earnings",
      isBestZone: false,
      isOpen: true,
    }
  ]).onConflictDoNothing();

  console.log("More cities seeded successfully!");
  process.exit(0);
}

seedMoreCities().catch((err) => {
  console.error("Failed to seed more cities", err);
  process.exit(1);
});
