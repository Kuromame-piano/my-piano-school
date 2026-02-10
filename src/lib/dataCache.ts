// Internal cache utility

/**
 * Simple in-memory cache for Google Sheets data
 * Reduces API calls during page transitions
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache: Map<string, CacheEntry<unknown>> = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

export function getCachedData<T>(key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as T;
    }
    return null;
}

export function setCachedData<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key?: string): void {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}

// Cache keys
export const CACHE_KEYS = {
    STUDENTS: "students",
    STUDENTS_ALL: "students_all",
    TEXTBOOKS: "textbooks",
    TEMPLATES: "templates",
    TRANSACTIONS: "transactions",
    LESSONS: "lessons", // Base key for calendar events
} as const;

// Helper to generate date-specific cache keys for lessons
export function getLessonsCacheKey(timeMin: string, timeMax: string): string {
    const minDate = new Date(timeMin).toISOString().split('T')[0];
    const maxDate = new Date(timeMax).toISOString().split('T')[0];
    return `${CACHE_KEYS.LESSONS}_${minDate}_${maxDate}`;
}

// Helper to invalidate all lesson caches
export function invalidateLessonsCache(): void {
    Array.from(cache.keys()).forEach(key => {
        if (key.startsWith(CACHE_KEYS.LESSONS)) {
            cache.delete(key);
        }
    });
}
