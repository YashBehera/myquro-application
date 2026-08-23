
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl?: number;
}

interface CacheResult<T> {
    hit: boolean;
    data?: T;
}

class AnalyticsCache {
    private cache: Map<string, CacheEntry<any>>;
    private ttl: number;

    constructor(ttlSeconds: number = 300) { // 5 minutes default
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }

    get(key: string): CacheResult<any> {
        const entry = this.cache.get(key);
        if (!entry) return { hit: false };

        const effectiveTtl = entry.ttl || this.ttl;
        if (Date.now() - entry.timestamp > effectiveTtl) {
            this.cache.delete(key);
            return { hit: false };
        }

        return { hit: true, data: entry.data };
    }

    set(key: string, data: any, ttlSeconds?: number): void {
        const ttl = ttlSeconds ? ttlSeconds * 1000 : undefined;
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
    }

    invalidate(restaurantId: string): void {
        // Invalidate all keys starting with "analytics:restaurantId"
        for (const key of this.cache.keys()) {
            if (key.startsWith(`analytics:${restaurantId}`)) {
                this.cache.delete(key);
            }
        }
    }

    invalidateAll(): void {
        this.cache.clear();
    }
}

export const analyticsCache = new AnalyticsCache(600); // 10 minutes cache for analytics
