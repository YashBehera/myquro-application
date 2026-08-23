
interface CacheResult<T> {
    hit: boolean;
    data?: T;
}

class MenuCache {
    private cache: Map<string, { data: any; timestamp: number }>;
    private ttl: number; // Time to live in milliseconds

    constructor(ttlSeconds: number = 300) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }

    get<T>(key: string): CacheResult<T> {
        const entry = this.cache.get(key);

        if (!entry) {
            return { hit: false };
        }

        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return { hit: false };
        }

        return { hit: true, data: entry.data as T };
    }

    set(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }
}

// Singleton instance
export const menuCache = new MenuCache(60 * 60); // 1 hour cache by default
