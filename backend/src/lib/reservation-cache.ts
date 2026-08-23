
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface CacheResult<T> {
    hit: boolean;
    data?: T;
}

class ReservationCache {
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
export const reservationCache = new ReservationCache(60); // 1 minute default cache for reservations
