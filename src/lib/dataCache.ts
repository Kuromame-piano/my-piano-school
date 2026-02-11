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
const DEFAULT_TTL = 30 * 1000; // 30 seconds

// データタイプ別の最適なTTL設定
export const CACHE_TTL = {
    STUDENTS: 60 * 1000,        // 60秒 - 生徒情報（適度な更新頻度）
    TEXTBOOKS: 60 * 1000,       // 60秒 - 教本（あまり変更されない）
    TRANSACTIONS: 60 * 1000,    // 60秒 - 取引（適度な更新頻度）
    LESSONS: 30 * 1000,         // 30秒 - レッスン（頻繁に確認）
    RECITALS: 120 * 1000,       // 2分 - 発表会（たまに更新）
    SHEET_MUSIC: 300 * 1000,    // 5分 - 楽譜ライブラリ（ほとんど変更なし）
    TEMPLATES: 300 * 1000,      // 5分 - テンプレート（ほとんど変更なし）
} as const;

export function getCachedData<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
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
    RECITALS: "recitals",
    SHEET_MUSIC: "sheet_music",
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
