
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface CacheResult<T> {
    hit: boolean;
    data?: T;
}

class ExtrasCache {
    private cache: Map<string, CacheEntry<any>>;
    private ttl: number;

    constructor(ttlSeconds: number = 300) { // 5 minutes default
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }

    get(key: string): CacheResult<any> {
        const entry = this.cache.get(key);
        if (!entry) return { hit: false };

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return { hit: false };
        }

        return { hit: true, data: entry.data };
    }

    set(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    invalidate(key: string): void {
        // Invalidate both extras and assignments for the restaurant
        this.cache.delete(`extras:${key}`);
        this.cache.delete(`assignments:${key}`);
    }

    invalidateAll(): void {
        this.cache.clear();
    }
}

export const extrasCache = new ExtrasCache();
