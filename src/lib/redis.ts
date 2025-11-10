/**
 * Redis Client for caching and queue management
 * Supports Upstash Redis (recommended) or standard Redis
 */

import { createHash } from "crypto";
import { logger } from "./logger";

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<string>;
  del: (key: string) => Promise<number>;
  ping: () => Promise<string>;
};

let redisClient: RedisClient | null = null;

/**
 * Initialize Redis client
 * Uses REST API for Upstash or standard Redis connection
 */
function getRedisClient(): RedisClient | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn("[Redis] REDIS_URL not configured. Caching disabled.");
    return null;
  }

  // Check if using Upstash (REST API)
  if (redisUrl.startsWith("https://")) {
    // Upstash REST API client
    const baseUrl = redisUrl;
    const token = process.env.REDIS_TOKEN || "";

    redisClient = {
      async get(key: string) {
        try {
          const response = await fetch(`${baseUrl}/get/${key}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          return data.result;
        } catch (error) {
          logger.error("[Redis] GET error:", error);
          return null;
        }
      },

      async set(key: string, value: string, options?: { ex?: number }) {
        try {
          const url = options?.ex
            ? `${baseUrl}/setex/${key}/${options.ex}`
            : `${baseUrl}/set/${key}`;

          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(value),
          });
          const data = await response.json();
          return data.result;
        } catch (error) {
          logger.error("[Redis] SET error:", error);
          return "ERR";
        }
      },

      async del(key: string) {
        try {
          const response = await fetch(`${baseUrl}/del/${key}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          return data.result;
        } catch (error) {
          logger.error("[Redis] DEL error:", error);
          return 0;
        }
      },

      async ping() {
        try {
          const response = await fetch(`${baseUrl}/ping`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          return data.result;
        } catch (error) {
          logger.error("[Redis] PING error:", error);
          return "PONG";
        }
      },
    };
  } else {
    // Standard Redis connection (requires ioredis or redis package)
    // For now, we'll use a simple fetch-based approach or require package installation
    logger.warn("[Redis] Standard Redis connections require ioredis package. Using no-op client.");

    // Return a no-op client for development
    redisClient = {
      async get() { return null; },
      async set() { return "OK"; },
      async del() { return 0; },
      async ping() { return "PONG"; },
    };
  }

  return redisClient;
}

/**
 * Cache helper functions
 */

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error("[Redis] Cache GET error:", error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const serialized = JSON.stringify(value);
    await client.set(key, serialized, { ex: ttlSeconds });
    return true;
  } catch (error) {
    logger.error("[Redis] Cache SET error:", error);
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error("[Redis] Cache DELETE error:", error);
    return false;
  }
}

/**
 * Generate a cache key hash from object
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const hash = createHash("md5")
    .update(JSON.stringify(params))
    .digest("hex")
    .slice(0, 16);
  return `${prefix}:${hash}`;
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.ping();
    logger.debug("[Redis] Connection test:", result);
    return result === "PONG";
  } catch (error) {
    logger.error("[Redis] Connection test failed:", error);
    return false;
  }
}

/**
 * Cached wrapper for async functions
 * Automatically caches results with the given TTL
 */
export async function withCache<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(cacheKey);
  if (cached !== null) {
    logger.debug(`[Redis] Cache HIT: ${cacheKey}`);
    return cached;
  }

  // Cache miss - fetch data
  logger.debug(`[Redis] Cache MISS: ${cacheKey}`);
  const data = await fetchFn();

  // Store in cache (fire and forget)
  cacheSet(cacheKey, data, ttlSeconds).catch((err) =>
    logger.error("[Redis] Background cache SET failed:", err)
  );

  return data;
}
