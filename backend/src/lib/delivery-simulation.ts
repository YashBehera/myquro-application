import { db } from "../db/db.js";
import { orderDeliveries } from "../db/schema/order-deliveries.js";
import { deliveryRiders } from "../db/schema/delivery-riders.js";
import { orders } from "../db/schema/orders.js";
import { eq } from "drizzle-orm";
import { emitToOrder } from "./socket.js";
import { nanoid } from "nanoid";

// Helper: Haversine distance in kilometers
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Swiggy dynamic ETA formula
export function calculateSwiggyETA(
  restaurantLat: number,
  restaurantLng: number,
  customerLat: number,
  customerLng: number,
  itemCount: number = 1
): number {
  const prepTime = 15 + itemCount * 2; // base 15m + 2m per item
  const distance = haversineDistance(restaurantLat, restaurantLng, customerLat, customerLng);
  const speedKmh = 25; // average bike speed in India city traffic
  let travelTimeMin = (distance / speedKmh) * 60;

  // Peak traffic multiplier (1.3x during lunch 12-14 and dinner 17-21)
  const currentHour = new Date().getHours();
  const isPeakHour = (currentHour >= 12 && currentHour <= 14) || (currentHour >= 17 && currentHour <= 21);
  const trafficMultiplier = isPeakHour ? 1.3 : 1.0;
  travelTimeMin *= trafficMultiplier;

  return Math.max(10, Math.round(prepTime + travelTimeMin));
}

// Seed riders only if explicitly enabled in non-production dev/sandbox environments
export async function seedRidersIfEmpty() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEV_SEED !== "true") {
    return;
  }
  try {
    const existing = await db.select().from(deliveryRiders);
    if (existing.length === 0) {
      console.log("🏍️ [DEV] Seeding initial delivery riders (ALLOW_DEV_SEED=true)...");
      const sampleRiders = [
        {
          id: `rider_${nanoid(10)}`,
          name: "Dev Rider 1",
          phone: "",
          latitude: 22.8120,
          longitude: 86.2100,
          status: "available" as const,
        },
        {
          id: `rider_${nanoid(10)}`,
          name: "Dev Rider 2",
          phone: "",
          latitude: 22.7950,
          longitude: 86.1900,
          status: "available" as const,
        },
        {
          id: `rider_${nanoid(10)}`,
          name: "Dev Rider 3",
          phone: "",
          latitude: 22.8080,
          longitude: 86.1850,
          status: "available" as const,
        },
      ];
      for (const r of sampleRiders) {
        await db.insert(deliveryRiders).values(r);
      }
      console.log("🏍️ Seeding completed successfully!");
    }
  } catch (err) {
    console.error("❌ Failed to seed delivery riders:", err);
  }
}

// Store active simulation intervals
const activeSimulations = new Map<string, NodeJS.Timeout>();

export function stopDeliverySimulation(orderId: string) {
  const interval = activeSimulations.get(orderId);
  if (interval) {
    clearInterval(interval);
    activeSimulations.delete(orderId);
    console.log(`⏹️ Stopped auto-simulation for Order: ${orderId}`);
    return true;
  }
  return false;
}

// Simulation engine for order courier movement
export async function startDeliverySimulation(orderId: string, deliveryId: string) {
  console.log(`🚀 [Simulation Disabled] Tracking driven in real-time by Rider App for Order: ${orderId}`);
  return;
}
