/**
 * Rate Limiting Middleware for API Routes
 * Uses Redis for distributed rate limiting
 * Falls back to in-memory if Redis unavailable
 */

import { NextApiRequest, NextApiResponse } from "next";
import Redis from "ioredis";
import { logger } from "./logger";

// Redis client (shared instance)
let redis: Redis | null = null;

// In-memory fallback for development
const inMemoryStore: Map<string, { count: number; resetAt: number }> = new Map();

/**
 * Initialize Redis client
 */
function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn("[RateLimit] REDIS_URL not configured. Using in-memory fallback.");
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error("[RateLimit] Redis connection failed. Using in-memory fallback.");
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    redis.on("error", (err) => {
      logger.error("[RateLimit] Redis error:", err);
    });

    logger.debug("[RateLimit] Redis client initialized");
    return redis;
  } catch (err) {
    logger.error("[RateLimit] Failed to initialize Redis:", err);
    return null;
  }
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Custom key generator (defaults to IP address)
   */
  keyGenerator?: (req: NextApiRequest) => string;

  /**
   * Message to return when rate limit exceeded
   */
  message?: string;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  /**
   * For expensive AI generation endpoints
   * 10 requests per minute per user
   */
  AI_GENERATION: {
    maxRequests: 10,
    windowSeconds: 60,
    message: "Too many generation requests. Please wait a moment.",
  } as RateLimitConfig,

  /**
   * For search/query endpoints
   * 30 requests per minute per user
   */
  SEARCH: {
    maxRequests: 30,
    windowSeconds: 60,
    message: "Too many search requests. Please slow down.",
  } as RateLimitConfig,

  /**
   * For mutation endpoints (create/update/delete)
   * 60 requests per minute per user
   */
  MUTATIONS: {
    maxRequests: 60,
    windowSeconds: 60,
    message: "Too many requests. Please slow down.",
  } as RateLimitConfig,

  /**
   * For read-only endpoints
   * 120 requests per minute per user
   */
  READ_ONLY: {
    maxRequests: 120,
    windowSeconds: 60,
    message: "Too many requests. Please slow down.",
  } as RateLimitConfig,

  /**
   * For authentication endpoints
   * 5 requests per 5 minutes per IP
   */
  AUTH: {
    maxRequests: 5,
    windowSeconds: 300,
    message: "Too many authentication attempts. Please try again later.",
  } as RateLimitConfig,

  /**
   * For export/download endpoints
   * 30 requests per minute per user
   */
  EXPORT: {
    maxRequests: 30,
    windowSeconds: 60,
    message: "Too many export requests. Please wait a moment.",
  } as RateLimitConfig,
};

/**
 * Get rate limit key from request
 */
function getRateLimitKey(req: NextApiRequest, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return `ratelimit:${config.keyGenerator(req)}`;
  }

  // Default: use IP address
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])
    : req.socket.remoteAddress || "unknown";

  return `ratelimit:${ip}`;
}

/**
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getRedisClient();

  if (!client) {
    // Fallback to in-memory
    return checkRateLimitInMemory(key, config);
  }

  try {
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    // Use sorted set with timestamps as scores
    const multi = client.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}`);

    // Set expiration
    multi.expire(key, config.windowSeconds);

    const results = await multi.exec();

    if (!results) {
      throw new Error("Redis multi command failed");
    }

    const count = (results[1][1] as number) || 0;
    const remaining = Math.max(0, config.maxRequests - count - 1);
    const resetAt = now + config.windowSeconds * 1000;

    return {
      allowed: count < config.maxRequests,
      remaining,
      resetAt,
    };
  } catch (err) {
    logger.error("[RateLimit] Redis error, falling back to in-memory:", err);
    return checkRateLimitInMemory(key, config);
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkRateLimitInMemory(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const stored = inMemoryStore.get(key);

  if (!stored || stored.resetAt < now) {
    // New window
    const resetAt = now + config.windowSeconds * 1000;
    inMemoryStore.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  // Existing window
  if (stored.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: stored.resetAt,
    };
  }

  stored.count++;
  inMemoryStore.set(key, stored);

  return {
    allowed: true,
    remaining: config.maxRequests - stored.count,
    resetAt: stored.resetAt,
  };
}

/**
 * Rate limit middleware
 * Usage:
 * ```typescript
 * export default async function handler(req, res) {
 *   const rateLimitResult = await rateLimit(req, res, RATE_LIMIT_CONFIGS.AI_GENERATION);
 *   if (!rateLimitResult.allowed) return; // Response already sent
 *
 *   // Your API logic here
 * }
 * ```
 */
export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = getRateLimitKey(req, config);
  const result = await checkRateLimitRedis(key, config);

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", config.maxRequests.toString());
  res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
  res.setHeader("X-RateLimit-Reset", result.resetAt.toString());

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader("Retry-After", retryAfterSeconds.toString());

    res.status(429).json({
      error: config.message || "Too many requests. Please try again later.",
      retryAfter: retryAfterSeconds,
    });
  }

  return result;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const result = await rateLimit(req, res, config);
    if (!result.allowed) return; // Response already sent with 429

    return handler(req, res);
  };
}

/**
 * Clean up in-memory store (call periodically)
 */
export function cleanupInMemoryStore() {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (value.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof window === "undefined") {
  setInterval(cleanupInMemoryStore, 5 * 60 * 1000);
}
