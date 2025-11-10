/**
 * API Response Caching Utility
 *
 * Provides in-memory caching for API responses to reduce database queries
 * and improve performance. Includes TTL (Time To Live) support.
 *
 * Usage:
 * ```typescript
 * const data = await getCached(
 *   'user:123:posts',
 *   () => fetchUserPosts(123),
 *   300 // 5 minutes TTL
 * );
 * ```
 */

import { logger } from "./logger";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.cache = new Map();
    this.cleanupInterval = null;

    // Start cleanup interval in production (every 5 minutes)
    if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
      this.startCleanup();
    }
  }

  /**
   * Get cached value or fetch and cache if not exists
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    // Return cached value if still valid
    if (cached && now - cached.timestamp < cached.ttl * 1000) {
      logger.debug(`Cache HIT: ${key}`);
      return cached.data;
    }

    // Cache miss or expired - fetch new data
    logger.debug(`Cache MISS: ${key}`);
    const data = await fetchFn();

    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
    });

    return data;
  }

  /**
   * Set a value in cache directly
   */
  set<T>(key: string, data: T, ttl: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
  }

  /**
   * Invalidate (delete) a cache entry
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache INVALIDATE: ${key}`);
    }
  }

  /**
   * Invalidate multiple keys matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      logger.debug(`Cache INVALIDATE PATTERN: ${pattern} (${count} keys)`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug(`Cache CLEAR: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`Cache CLEANUP: ${removed} expired entries removed`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.debug("Cache cleanup interval started (5 minutes)");
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug("Cache cleanup interval stopped");
    }
  }
}

// Export singleton instance
export const cache = new MemoryCache();

/**
 * Helper function for easy caching
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  return cache.get(key, fetchFn, ttl);
}

/**
 * Cache key builders for common patterns
 */
export const cacheKeys = {
  userProfile: (userId: string) => `user:${userId}:profile`,
  userPosts: (userId: string) => `user:${userId}:posts`,
  userStats: (userId: string) => `user:${userId}:stats`,
  viralPosts: (topic?: string) => topic ? `viral:${topic}` : "viral:all",
  ragRetrieve: (userId: string, topic: string) => `rag:${userId}:${topic}`,
  userStyle: (userId: string) => `style:${userId}`,
};

/**
 * Cache invalidation helpers
 */
export const invalidateCache = {
  user: (userId: string) => {
    cache.invalidatePattern(`user:${userId}:`);
  },
  userPosts: (userId: string) => {
    cache.invalidate(cacheKeys.userPosts(userId));
    cache.invalidate(cacheKeys.userStats(userId));
  },
  userStyle: (userId: string) => {
    cache.invalidate(cacheKeys.userStyle(userId));
    cache.invalidatePattern(`rag:${userId}:`);
  },
  viral: () => {
    cache.invalidatePattern("viral:");
  },
};
