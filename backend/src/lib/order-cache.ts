import { db } from "../db/db.js";
import { orders } from "../db/schema/orders.js";
import { orderItems } from "../db/schema/order-items.js";
import { menuItems } from "../db/schema/menu-items.js";
import { menuItemVariants } from "../db/schema/menu-item-variants.js";
import { menuExtras } from "../db/schema/menu-extras.js";
import { orderItemExtras } from "../db/schema/order-item-extras.js";
import { eq, and, sql, inArray, desc } from "drizzle-orm";

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface CacheResult<T> {
    hit: boolean;
    data?: T;
}

class OrderCache {
    private cache: Map<string, CacheEntry<any>>;
    private ttl: number; // Time to live in milliseconds

    constructor(ttlSeconds: number = 60) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }

    get(restaurantId: string): CacheResult<any> {
        const entry = this.cache.get(restaurantId);

        if (!entry) {
            return { hit: false };
        }

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(restaurantId);
            return { hit: false };
        }

        return { hit: true, data: entry.data };
    }

    set(restaurantId: string, data: any): void {
        this.cache.set(restaurantId, {
            data,
            timestamp: Date.now(),
        });
    }

    invalidate(restaurantId: string): void {
        this.cache.delete(restaurantId);
    }

    clear(): void {
        this.cache.clear();
    }
}

// Singleton instance
export const orderCache = new OrderCache(30); // 30 seconds default cache for kitchen
